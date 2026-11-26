uniform vec3 uCam,uSunDir,uSunCol,uZenith,uHorizon,uDeep,uShallow;
uniform vec4 uLP[8];
uniform vec3 uLC[8];
uniform int uLN;
uniform float uTime;
uniform sampler2D uNoise;
uniform sampler2DShadow uShadow;
uniform mat4 uShadowM;
// fog density, shadow map texel size, lamp level, star visibility
uniform vec4 uEnv;

// The sky without clouds or the sun's disc: what lights surfaces, what the sea mirrors and what
// distance fades to.
vec3 skyBase(vec3 d){
  vec3 c=mix(uHorizon,uZenith,1.-exp(-max(d.y,0.)*3.4));
  float s=max(dot(d,uSunDir),0.);
  return c+uSunCol*(pow(s,6.)*.07+pow(s,48.)*.22);
}
// diffuse light from the sky above and the sea below
vec3 skyAmb(vec3 n){
  return mix(uDeep*1.5+uHorizon*.12,mix(uHorizon,uZenith,.55),n.y*.5+.5)*.8;
}
float shadowAt(vec3 P,vec3 N){
  vec4 s=uShadowM*vec4(P+N*.25,1.);
  vec3 c=s.xyz;
  vec2 e=abs(c.xy-.5);
  float fade=smoothstep(.42,.5,max(e.x,e.y));
  if(fade>=1.||c.z>1.)return 1.;
  float t=uEnv.y*1.3;
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
    col+=uSunCol*sh*(dif*d+F*min(D,40.)*.25*max(NdL,0.));
  }
  for(int i=0;i<uLN;i++){
    vec3 Lv=uLP[i].xyz-P;
    float d2=dot(Lv,Lv),r=uLP[i].w,q=d2/(r*r);
    if(q<1.){
      float att=(1.-q)*(1.-q)/(1.+d2*.02);
      vec3 L=Lv*inversesqrt(d2+1e-4);
      float NdL=max((dot(N,L)+wrap)/(1.+wrap),0.);
      col+=uLC[i]*att*NdL*dif;
    }
  }
  vec3 R=reflect(-V,N);
  R.y=abs(R.y);
  vec3 F=F0+(max(vec3(1.-rough),F0)-F0)*pow(1.-NdV,5.);
  col+=(dif*skyAmb(N)+F*skyBase(R)*(1.-rough)*(1.-rough))*ao;
  return col;
}
vec3 fog(vec3 c,vec3 P){
  vec3 d=P-uCam;
  float l=length(d);
  d/=l;
  // fade to the sky just above the horizon in that direction, so the sea meets it without a seam
  return mix(skyBase(normalize(vec3(d.x,abs(d.y)*.3+.02,d.z))),c,exp(-l*uEnv.x));
}
