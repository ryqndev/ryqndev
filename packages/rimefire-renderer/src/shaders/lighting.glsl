uniform vec3 uCam, uSunDir, uSunCol;
uniform vec4 uLP[16];
uniform vec3 uLC[16];
uniform int uLN;
uniform float uTime;
uniform sampler2D uNoise;
uniform sampler2DShadow uShadow;
uniform mat4 uShadowM;
uniform sampler2D uScorch;
uniform vec4 uFog;
#ifdef HI
// the live sky, captured into a small cube with a blur mip chain
uniform samplerCube uEnv;
#endif

vec3 skyAmb(vec3 d){
  float t=d.y*.5+.5;
  vec3 c=mix(vec3(.05,.075,.11),vec3(.035,.13,.13),smoothstep(.55,1.,t));
  return mix(vec3(.05,.06,.075),c,smoothstep(.3,.6,t));
}
#ifdef HI
// below the horizon the capture only holds fog, so fade to the moonlit snow the ground really is
vec3 envAt(vec3 d,float lod){
  return mix(vec3(.085,.11,.155),textureLod(uEnv,d,lod).rgb,smoothstep(-.3,.04,d.y));
}
// diffuse sky light for a surface facing d, pulled part-way to grey so that the aurora tints
// surfaces without repainting them
vec3 envD(vec3 d){
  vec3 e=envAt(d,5.5);
  return mix(vec3(dot(e,vec3(.3,.5,.2))),e,.55)*1.45+vec3(.012,.016,.024);
}
// mirror-direction sky light; rougher surfaces read blurrier mips
vec3 envS(vec3 d,float rough){return envAt(d,rough*6.)*(1.-rough*.45)*1.5;}
#endif
float shadowAt(vec3 P,vec3 N){
  vec4 s=uShadowM*vec4(P+N*.07,1.);
  vec3 c=s.xyz;
  vec2 e=abs(c.xy-.5);
  float fade=smoothstep(.44,.5,max(e.x,e.y));
  if(fade>=1.||c.z>1.)return 1.;
  float t=1.2/2048.;
  float r=texture(uShadow,c)*2.;
  r+=texture(uShadow,c+vec3(t,t,0.));
  r+=texture(uShadow,c+vec3(-t,t,0.));
  r+=texture(uShadow,c+vec3(t,-t,0.));
  r+=texture(uShadow,c+vec3(-t,-t,0.));
  return mix(r/6.,1.,fade);
}
vec3 lit(vec3 P,vec3 N,vec3 V,vec3 alb,float rough,float metal,float ao,float wrap,float sh){
  vec3 F0=mix(vec3(.04),alb,metal);
  vec3 dif=alb*(1.-metal);
  float NdV=max(dot(N,V),1e-3);
  float a=max(rough*rough,.02),a2=a*a;
  vec3 col=vec3(0.);
  {
    vec3 L=uSunDir;
    float NdL=dot(N,L);
    float d=max((NdL+wrap)/(1.+wrap),0.);
    vec3 H=normalize(L+V);
    float NdH=max(dot(N,H),0.);
    float q=NdH*NdH*(a2-1.)+1.;
    float D=a2/(3.14159*q*q+1e-5);
    vec3 F=F0+(1.-F0)*pow(1.-max(dot(H,V),0.),5.);
    col+=uSunCol*sh*(dif*d+F*min(D,60.)*.25*max(NdL,0.));
  }
  for(int i=0;i<uLN;i++){
    vec3 Lv=uLP[i].xyz-P;
    float d2=dot(Lv,Lv),r=uLP[i].w,q=d2/(r*r);
    if(q<1.){
      float att=(1.-q)*(1.-q)/(1.+d2*.3);
#ifdef HI
      if(uLS[i]>=0.)att*=lightShadow(uLS[i],uLP[i].xyz,P+N*.07);
#endif
      vec3 L=Lv*inversesqrt(d2+1e-4);
      float NdL=max((dot(N,L)+wrap)/(1.+wrap),0.);
      vec3 H=normalize(L+V);
      float NdH=max(dot(N,H),0.);
      float qq=NdH*NdH*(a2-1.)+1.;
      float D=a2/(3.14159*qq*qq+1e-5);
      col+=uLC[i]*att*NdL*(dif+F0*min(D,30.)*.25);
    }
  }
  vec3 R=reflect(-V,N);
  vec3 F=F0+(max(vec3(1.-rough),F0)-F0)*pow(1.-NdV,5.);
#ifdef HI
  col+=(dif*envD(N)+F*envS(R,rough))*ao;
#else
  col+=(dif*skyAmb(N)+F*skyAmb(R)*(1.-rough*.6)*1.6)*ao;
#endif
  return col;
}
vec3 fog(vec3 c,vec3 P){
  vec3 d=P-uCam;
  float l=length(d);
  float f=1.-exp(-l*uFog.a*mix(.3,1.,exp(-max(P.y,0.)*.045)));
  vec3 fc=uFog.rgb+uSunCol*.3*pow(max(dot(d/l,uSunDir),0.),12.);
  return mix(c,fc,f);
}
