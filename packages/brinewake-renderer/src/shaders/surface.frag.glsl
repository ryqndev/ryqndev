in vec3 vP;
in vec3 vN;
in vec4 vC;
in vec4 vM;
in vec3 vO;
in vec3 vQ;
#ifdef INST
in vec4 vT;
#endif
out vec4 o;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec3 N=normalize(vN),V=normalize(uCam-vP);
  // material: 0 paint, 1 terrain, 2 wood, 3 cloth, 4 emissive, 5 metal, 6 leaf, 7 stone, 8 tile, 9 plaster, 10 painted planking
  float kind=floor(vC.a*255.+.5);
  vec3 alb=vC.rgb*vC.rgb;
  float rough=vM.x,metal=vM.y,emis=vM.z,ao=vM.w;
#ifdef INST
  vec3 tint=vT.rgb;
#else
  vec3 tint=vec3(1.);
#endif
  if(kind>3.5&&kind<4.5){
    // glass by day, catching the sky; a lit lamp once the environment calls for it
    vec3 Rg=reflect(-V,N);Rg.y=abs(Rg.y);
    o=vec4(fog(alb*emis*(.16+26.*uEnv.z)+skyBase(Rg)*(.06+.5*pow(1.-max(dot(N,V),0.),4.)),vP),1.);
    return;
  }
  // noise projected along the three axes of the object's own frame, so patterns ride with a hull
  vec3 w=vQ*vQ;w/=(w.x+w.y+w.z+1e-4);
  vec4 tx=texture(uNoise,vO.zy*.23),ty=texture(uNoise,vO.xz*.23),tz=texture(uNoise,vO.xy*.23);
  float n1=tx.r*w.x+ty.r*w.y+tz.r*w.z;
  vec3 g=vec3(0.,tx.b-.5,tx.g-.5)*w.x+vec3(ty.g-.5,0.,ty.b-.5)*w.y+vec3(tz.g-.5,tz.b-.5,0.)*w.z;
  float wrap=0.,thru=0.;
  if(kind<.5){
    alb*=tint*(.75+.5*n1);
    rough=clamp(rough+(n1-.5)*.3,.08,1.);
  }else if(kind<1.5){
    vec4 d2=texture(uNoise,vP.xz*.021);
    vec4 gr=texture(uNoise,vP.xz*.37);
    float slope=1.-N.y;
    float h=vP.y+(d2.r-.5)*3.;
    vec3 sand=vec3(.5,.42,.26)*(.8+.35*gr.r);
    vec3 grass=mix(vec3(.05,.16,.03),vec3(.16,.24,.05),d2.g)*(.6+.7*gr.r);
    vec3 rock=vec3(.17,.16,.15)*(.5+.9*d2.r);
    alb=mix(sand,grass,smoothstep(2.4,5.5,h));
    // the town's streets and yards: earth trodden bare, greener toward its edges
    alb=mix(alb,vec3(.34,.27,.18)*(.7+.5*gr.r)*(.85+.3*d2.b),(1.-vC.r)*(.72+.28*d2.g));
    alb=mix(alb,rock,smoothstep(.3,.5,slope+(d2.r-.5)*.25));
    // darker wet sand at the waterline, then the sea's own colour as the bed drops away
    float wet=smoothstep(1.2,.1,vP.y);
    alb*=1.-.4*wet;
    rough=mix(.92,.5,wet);
    alb=mix(alb,uShallow*.55,smoothstep(.2,-5.,vP.y)*.9);
    vec3 g2=g*.5+vec3(gr.g-.5,0.,gr.b-.5)*.45;
    N=normalize(N-(g2-N*dot(g2,N)));
    wrap=.25;
  }else if(kind<2.5){
    // planks: seams run along the hull on its sides and fore-and-aft on decks
    float deck=step(.6,abs(vQ.y));
    float across=mix(vO.y*2.6,vO.x*3.1,deck);
    float pl=fract(across+tz.r*.1);
    float seam=smoothstep(0.,.08,pl)*smoothstep(1.,.92,pl);
    float grain=texture(uNoise,vec2(vO.z*.07,across*.83)).r;
    float board=fract(sin(floor(across+tz.r*.1)*12.9898)*43758.5453);
    // each strake is laid in lengths, butted end to end and staggered from the next, a pair of treenails at every butt
    float bf=fract(vO.z*.29+board*7.3);
    float butt=smoothstep(0.,.011,bf)*smoothstep(1.,.989,bf);
    vec2 tn=vec2(min(bf,1.-bf)*3.45-.1,(abs(pl-.5)-.24)*.38);
    float nail=smoothstep(.011,.019,length(tn));
    seam*=.3+.7*butt;
    alb*=(.6+.55*grain)*(.8+.4*board)*(.42+.58*seam)*(.62+.38*nail);
    rough=clamp(rough+(grain-.5)*.3,.3,1.);
    ao*=.65+.35*seam;
    N=normalize(N-(g-N*dot(g,N))*.6);
  }else if(kind<3.5){
    // canvas: sewn in vertical panels, lit from both sides, and glowing when the sun is behind it
    float panel=fract(vO.x*5.+.5);
    float seam=smoothstep(0.,.05,panel)*smoothstep(1.,.95,panel);
    alb*=tint*(.82+.3*texture(uNoise,vO.xy*1.7).r)*(.78+.22*seam);
    rough=.95;
    wrap=.5;
    thru=max(dot(-N,uSunDir),0.)*.3;
  }else if(kind<5.5){
    alb*=.8+.4*n1;
    rough=clamp(rough+(n1-.5)*.25,.1,1.);
  }else if(kind<6.5){
    alb*=.65+.7*n1;
    wrap=.6;
    thru=max(dot(-N,uSunDir),0.)*.25;
  }else if(kind>9.5){
    // painted planking: a hull's strakes under her paint, each board taking it a little differently
    float across=vO.y*2.6;
    float pl=fract(across+tz.r*.1);
    float seam=smoothstep(0.,.07,pl)*smoothstep(1.,.93,pl);
    float board=fract(sin(floor(across+tz.r*.1)*12.9898)*43758.5453);
    float grain=texture(uNoise,vec2(vO.z*.07,across*.83)).r;
    float bf=fract(vO.z*.29+board*7.3);
    seam*=.55+.45*smoothstep(0.,.011,bf)*smoothstep(1.,.989,bf);
    alb*=tint*(.72+.34*grain)*(.9+.2*board)*(.62+.38*seam);
    rough=clamp(rough+(grain-.5)*.3,.2,1.);
    ao*=.7+.3*seam;
    N=normalize(N-(g-N*dot(g,N))*.45);
  }else{
    // masonry: laid out along the wall and up it, whichever way the wall faces. `metal` marks a
    // round tower, whose courses wrap it by angle at the radius carried in `emis`.
    vec2 tn=normalize(vec2(-vQ.z,vQ.x)+1e-5);
    float u=metal>.5?atan(vQ.z,vQ.x+1e-5)*emis*12.75:dot(vO.xz,tn);
    float foot=smoothstep(.86,.56,ao);
    metal=0.;
    if(kind<7.5){
      // stone: coursed blocks on a wall, flagstones on the flat, each its own shade
      float top=step(.7,abs(vQ.y));
      vec2 q=mix(vec2(u/.92,vO.y/.46),(vO.xz+(ty.gb-.5)*.3)/1.15,top);
      q.x+=.5*mod(floor(q.y),2.);
      vec2 f=fract(q);
      float h1=hash(floor(q));
      float joint=smoothstep(0.,.06,f.x)*smoothstep(1.,.94,f.x)*smoothstep(0.,.1,f.y)*smoothstep(1.,.9,f.y);
      alb*=(.66+.55*h1)*(.42+.58*joint)*(.78+.44*n1);
      // weed and damp creeping up from the ground or the tide
      alb=mix(alb,alb*vec3(.5,.62,.42),foot*(.35+.65*n1)*(1.-top)*.8);
      rough=clamp(rough+(h1-.5)*.2,.4,1.);
      ao*=.6+.4*joint;
      N=normalize(N-(g-N*dot(g,N))*.8);
    }else if(kind<8.5){
      // barrel tiles: crowns and gutters running down the slope, courses across it
      float v=vO.y/max(sqrt(1.-vQ.y*vQ.y),.25);
      vec2 q=vec2(u*2.7,v*2.3);
      vec2 f=fract(q);
      float h1=hash(floor(q)),crown=1.-abs(f.x-.5)*2.;
      alb*=(.5+.62*crown)*(.72+.5*h1)*(.6+.4*smoothstep(0.,.22,f.y))*(.8+.4*n1);
      // old tiles: lichen and soot in drifts
      float age=texture(uNoise,vec2(u,v)*.06).r;
      alb=mix(alb,alb*vec3(.55,.6,.5)+vec3(.012,.016,.008),smoothstep(.5,.72,age)*.75);
      rough=clamp(rough+(h1-.5)*.2,.5,1.);
      ao*=.65+.35*crown;
      N=normalize(N+vec3(tn.x,0.,tn.y)*(.5-f.x)*1.1);
    }else{
      // plaster: blotched by sun and rain, streaked under the eaves, grimy at the foot of the wall
      float blot=texture(uNoise,vec2(u,vO.y)*.05).r;
      float streak=texture(uNoise,vec2(u*.13,vO.y*.011)).r;
      alb*=(.78+.3*blot)*(1.-.22*smoothstep(.45,.8,streak));
      alb=mix(alb,alb*vec3(.5,.46,.38),foot*(.4+.6*blot)*.75);
      // and fallen away here and there, baring the brick
      float bare=smoothstep(.73,.77,blot*.55+n1*.45+foot*.12);
      vec2 q=vec2(u/.46,vO.y/.15);
      q.x+=.5*mod(floor(q.y),2.);
      vec2 f=fract(q);
      float joint=smoothstep(0.,.08,f.x)*smoothstep(1.,.92,f.x)*smoothstep(0.,.16,f.y)*smoothstep(1.,.84,f.y);
      alb=mix(alb,vec3(.3,.11,.07)*(.6+.7*hash(floor(q)))*(.5+.5*joint),bare);
      rough=.93;
      ao*=1.-.25*bare;
      N=normalize(N-(g-N*dot(g,N))*(.3+.5*bare));
    }
  }
  float sh=shadowAt(vP,normalize(vN));
  vec3 col=lit(vP,N,V,alb,rough,metal,ao,wrap,sh);
  col+=alb*uSunCol*thru*sh;
#ifdef INST
  col+=vec3(1.,.55,.25)*vT.a*3.;
#endif
  o=vec4(fog(col,vP),1.);
}
