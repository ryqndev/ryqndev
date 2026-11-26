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
void main(){
  vec3 N=normalize(vN),V=normalize(uCam-vP);
  // material: 0 paint, 1 terrain, 2 wood, 3 cloth, 4 emissive, 5 metal, 6 leaf
  float kind=floor(vC.a*255.+.5);
  vec3 alb=vC.rgb*vC.rgb;
  float rough=vM.x,metal=vM.y,emis=vM.z,ao=vM.w;
#ifdef INST
  vec3 tint=vT.rgb;
#else
  vec3 tint=vec3(1.);
#endif
  if(kind>3.5&&kind<4.5){
    // glass by day, a lit lamp once the environment calls for it
    o=vec4(fog(alb*emis*(.5+26.*uEnv.z),vP),1.);
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
    alb*=(.6+.55*grain)*(.8+.4*board)*(.42+.58*seam);
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
  }else{
    alb*=.65+.7*n1;
    wrap=.6;
    thru=max(dot(-N,uSunDir),0.)*.25;
  }
  float sh=shadowAt(vP,normalize(vN));
  vec3 col=lit(vP,N,V,alb,rough,metal,ao,wrap,sh);
  col+=alb*uSunCol*thru*sh;
#ifdef INST
  col+=vec3(1.,.55,.25)*vT.a*3.;
#endif
  o=vec4(fog(col,vP),1.);
}
