in vec3 vP;
in vec3 vN;
in vec4 vC;
in vec4 vM;
in vec3 vO;
in vec3 vQ;
#ifdef INST
in vec4 vT;
in vec4 vF;
#endif
out vec4 o;
void main(){
  vec3 N=normalize(vN),V=normalize(uCam-vP);
  float kind=floor(vC.a*255.+.5);
  vec3 alb=vC.rgb*vC.rgb;
  float rough=vM.x,metal=vM.y,emis=vM.z,ao=vM.w;
#ifdef INST
  vec3 tp=vO,tn=vQ;
#else
  vec3 tp=vP,tn=N;
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
    alb*=.7+.6*n1;
    rough=clamp(rough+(n1-.5)*.35,.06,1.);
    N=normalize(N-(g-N*dot(g,N))*1.3);
    float sn=smoothstep(.5,.85,N.y+(n1-.5)*.8);
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
    alb*=.8+.4*n1;
    rough=clamp(rough+(n1-.5)*.25,.06,1.);
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
