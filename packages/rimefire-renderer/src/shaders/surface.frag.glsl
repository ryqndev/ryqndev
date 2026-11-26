in vec3 vP;
in vec3 vN;
in vec4 vC;
in vec4 vM;
in vec3 vO;
in vec3 vQ;
#ifdef INST
in vec4 vT;
in vec4 vF;
#ifdef HI
flat in vec3 vR0;
flat in vec3 vR1;
flat in vec3 vR2;
#endif
#elif defined(HI)
flat in vec2 vYaw;
#endif
#ifdef HI
// generated materials, one per array layer. A: slope u, slope v, roughness offset, cavity. B: tint/2, mask
uniform sampler2DArray uMatA,uMatB;
#endif
out vec4 o;
void main(){
  vec3 N=normalize(vN),V=normalize(uCam-vP);
  // material: 0 painted steel, 1 terrain, 2 machine plating, 3 ice, 4 emissive, 5 weapon casing, 6 concrete, 7 timber
  float mat=floor(vC.a*255.+.5);
  // shading family: weapons shade like machines, concrete and timber like painted props
  float kind=mat>5.5?0.:mat>4.5?2.:mat;
  vec3 alb=vC.rgb*vC.rgb;
  float rough=vM.x,metal=vM.y,emis=vM.z,ao=vM.w;
#if defined(INST)||defined(HI)
  vec3 tp=vO,tn=vQ;
#else
  vec3 tp=vP,tn=N;
#endif
#ifdef HI
  // sharper blend than the noise below: panel patterns should not smear across an edge
  vec3 mw=pow(abs(tn),vec3(6.));mw/=mw.x+mw.y+mw.z;
  float layer=0.,ms=.42,bump=1.7;
  if(mat>6.5){layer=6.;ms=.9;bump=2.2;}
  else if(mat>5.5){layer=2.;ms=.35;bump=1.8;}
  else if(mat>4.5){layer=5.;ms=7.;bump=2.4;}
  else if(mat>2.5){layer=3.;ms=.6;bump=1.9;}
  else if(mat>1.5){layer=1.;ms=1.3;bump=3.4;}
  else if(mat>.5){layer=4.;ms=.8;bump=1.1;}
  vec4 ax=texture(uMatA,vec3(tp.zy*ms,layer)),ay=texture(uMatA,vec3(tp.xz*ms,layer)),az=texture(uMatA,vec3(tp.xy*ms,layer));
  vec4 mA=ax*mw.x+ay*mw.y+az*mw.z;
  vec4 mB=texture(uMatB,vec3(tp.zy*ms,layer))*mw.x+texture(uMatB,vec3(tp.xz*ms,layer))*mw.y+texture(uMatB,vec3(tp.xy*ms,layer))*mw.z;
  // surface slope in the texture frame, then turned to face the way the object does
  vec3 mg=(vec3(0.,ax.g-.5,ax.r-.5)*mw.x+vec3(ay.r-.5,0.,ay.g-.5)*mw.y+vec3(az.r-.5,az.g-.5,0.)*mw.z)*bump;
#ifdef INST
  mg=vec3(dot(vR0,mg),dot(vR1,mg),dot(vR2,mg));
#else
  mg=vec3(mg.x*vYaw.x+mg.z*vYaw.y,mg.y,-mg.x*vYaw.y+mg.z*vYaw.x);
#endif
  vec3 tint=mB.rgb*2.;
  float mRough=(mA.b-.5)*1.2,cavity=mA.a,mask=mB.a;
#endif
  vec3 w=tn*tn;w/=(w.x+w.y+w.z+1e-4);
  vec4 tx=texture(uNoise,tp.zy*.31),ty=texture(uNoise,tp.xz*.31),tz=texture(uNoise,tp.xy*.31);
  float n1=tx.r*w.x+ty.r*w.y+tz.r*w.z;
  vec3 g=vec3(0.,tx.b-.5,tx.g-.5)*w.x+vec3(ty.g-.5,0.,ty.b-.5)*w.y+vec3(tz.g-.5,tz.b-.5,0.)*w.z;
  vec3 emi=vec3(0.);
  float wrap=0.,glint=0.;
  if(kind>3.5){
    float e=emis*26.;
    if(metal>.5)e*=step(.55,fract(uTime*.7));
#ifdef INST
    e*=vF.x;alb*=vT.rgb;
#endif
    o=vec4(fog(alb*e,vP),1.);
    return;
  }
#ifdef INST
  if(vF.y>0.){
    float dn=n1+(texture(uNoise,tp.xy*.9).r-.5)*.4;
    if(dn<vF.y)discard;
    emi+=vec3(.25,.75,1.)*10.*smoothstep(vF.y+.07,vF.y,dn);
  }
#endif
  if(kind<.5){
#ifdef HI
    alb*=tint*(.85+.3*n1);
    // rust shows its own colour through the paint and is never metallic
    if(mat<.5){alb=mix(alb,vec3(.12,.052,.022)*(.5+.9*n1),mask*.8);metal*=1.-mask;}
    rough=clamp(rough+mRough,.06,1.);
    ao*=cavity;
    N=normalize(N-(mg-N*dot(mg,N)));
    float sn=smoothstep(.5,.85,normalize(vN).y+(n1-.5)*.8);
#else
    alb*=.7+.6*n1;
    rough=clamp(rough+(n1-.5)*.35,.06,1.);
    N=normalize(N-(g-N*dot(g,N))*1.3);
    float sn=smoothstep(.5,.85,N.y+(n1-.5)*.8);
#endif
    alb=mix(alb,vec3(.7,.78,.9),sn);
    rough=mix(rough,.8,sn);
    metal*=1.-sn;
    emi+=vC.rgb*vC.rgb*emis*14.;
  }else if(kind<1.5){
    vec4 sc=texture(uScorch,vP.xz/128.+.5);
    vec4 d2=texture(uNoise,vP.xz*.045);
    float slope=1.-N.y;
    float rock=smoothstep(.2,.42,slope+(d2.r-.5)*.3);
    vec4 gr=texture(uNoise,vP.xz*1.37);
    vec3 g2=g*mix(.6,1.6,rock)+vec3(gr.g-.5,0.,gr.b-.5)*.55*(1.-rock);
#ifdef HI
    // wind ripples and grain on the snow, fading out on bare rock
    g2+=mg*(1.-rock);
#endif
    N=normalize(N-(g2-N*dot(g2,N)));
    vec3 snow=vec3(.66,.75,.9)*(.8+.24*n1+.16*gr.r);
    vec3 rk=vec3(.07,.08,.1)*(.5+d2.r);
    alb=mix(snow,rk,rock);
    rough=mix(.72,.9,rock);
    float burn=smoothstep(.02,.6,sc.r+(n1-.5)*.25*step(.01,sc.r));
    alb=mix(alb,vec3(.018,.016,.015)*(.5+n1),burn);
    rough=mix(rough,.3,burn*.85);
    emi+=vec3(4.,.8,.08)*sc.g*sc.g*(.25+1.5*ty.a*n1);
    float sp=texture(uNoise,vP.xz*.43+V.xz*.21,-1.).a*texture(uNoise,vP.zx*.71-V.zy*.17+.37,-1.).a;
    glint=smoothstep(.55,.85,sp)*(1.-rock)*(1.-burn)*smoothstep(26.,4.,distance(vP,uCam));
    wrap=.35*(1.-rock);
    ao=mix(1.,ao,.6);
  }else if(kind<2.5){
#ifdef HI
    // plating: panel-to-panel tone, darker seams, bright worn edges
    alb*=tint;
    alb=mix(alb,alb*1.7+.03,mask*.6);
    rough=clamp(rough+mRough-mask*.15,.05,1.);
    ao*=cavity;
    N=normalize(N-(mg-N*dot(mg,N)));
#else
    alb*=.8+.4*n1;
    rough=clamp(rough+(n1-.5)*.25,.06,1.);
#endif
    emi+=vC.rgb*vC.rgb*emis*14.;
  }else{
    float fr=pow(1.-max(dot(N,V),0.),2.2);
    float inner=texture(uNoise,tp.xy*.11+V.xy*.07).r*texture(uNoise,tp.zy*.17-V.zx*.05).r;
    inner=smoothstep(.12,.5,inner);
    vec3 tint=vC.rgb*vC.rgb;
    alb=mix(vec3(.02,.07,.16),tint,.22+.78*fr)+tint*inner*.35;
    rough=.07+.2*n1;
    wrap=.4;
    emi+=vC.rgb*(emis*7.*(.25+1.6*inner)+fr*.22);
#ifdef HI
    // fracture lines catch the light and let the inner glow through; frost patches turn matte
    N=normalize(N-(mg-N*dot(mg,N)));
    rough=clamp(rough+mRough,.05,1.);
    alb*=tint;
    emi+=vC.rgb*mask*(.12+emis*5.);
#endif
  }
#ifdef INST
  alb*=vT.rgb;
  emi=emi*vF.x+vec3(1.,.42,.1)*vT.a*9.;
#endif
  float sh=shadowAt(vP,normalize(vN));
  vec3 col=lit(vP,N,V,alb,rough,metal,ao,wrap,sh);
  col*=1.+glint*7.;
  col+=emi;
  o=vec4(fog(col,vP),1.);
}
