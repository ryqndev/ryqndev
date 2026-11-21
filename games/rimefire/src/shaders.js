// All GLSL lives here. The build step strips comments/whitespace from these template strings.

const COMMON = /* glsl */ `
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

vec3 skyAmb(vec3 d){
  float t=d.y*.5+.5;
  vec3 c=mix(vec3(.05,.075,.11),vec3(.035,.13,.13),smoothstep(.55,1.,t));
  return mix(vec3(.05,.06,.075),c,smoothstep(.3,.6,t));
}
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
  col+=(dif*skyAmb(N)+F*skyAmb(R)*(1.-rough*.6)*1.6)*ao;
  return col;
}
vec3 fog(vec3 c,vec3 P){
  vec3 d=P-uCam;
  float l=length(d);
  float f=1.-exp(-l*uFog.a*mix(.3,1.,exp(-max(P.y,0.)*.045)));
  vec3 fc=uFog.rgb+uSunCol*.3*pow(max(dot(d/l,uSunDir),0.),12.);
  return mix(c,fc,f);
}
`;

export const UBER_VS = /* glsl */ `
layout(location=0) in vec3 aP;
layout(location=1) in vec4 aN;
layout(location=2) in vec4 aC;
layout(location=3) in vec4 aM;
#ifdef INST
layout(location=4) in vec4 iM0;
layout(location=5) in vec4 iM1;
layout(location=6) in vec4 iM2;
layout(location=7) in vec4 iT;
layout(location=8) in vec4 iF;
out vec4 vT;
out vec4 vF;
#endif
uniform mat4 uVP;
out vec3 vP;
out vec3 vN;
out vec4 vC;
out vec4 vM;
out vec3 vO;
out vec3 vQ;
void main(){
#ifdef INST
  vec4 p=vec4(aP,1.);
  vec3 P=vec3(dot(iM0,p),dot(iM1,p),dot(iM2,p));
  vec3 N=normalize(vec3(dot(iM0.xyz,aN.xyz),dot(iM1.xyz,aN.xyz),dot(iM2.xyz,aN.xyz)));
  vT=iT;vF=iF;
#else
  vec3 P=aP;
  vec3 N=aN.xyz;
#endif
  vO=aP;vQ=aN.xyz;vP=P;vN=N;vC=aC;vM=aM;
  gl_Position=uVP*vec4(P,1.);
}`;

export const UBER_FS =
    COMMON +
    /* glsl */ `
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
}`;

export const SHADOW_VS = /* glsl */ `
layout(location=0) in vec3 aP;
#ifdef INST
layout(location=4) in vec4 iM0;
layout(location=5) in vec4 iM1;
layout(location=6) in vec4 iM2;
#endif
uniform mat4 uVP;
void main(){
#ifdef INST
  vec4 p=vec4(aP,1.);
  gl_Position=uVP*vec4(dot(iM0,p),dot(iM1,p),dot(iM2,p),1.);
#else
  gl_Position=uVP*vec4(aP,1.);
#endif
}`;
export const SHADOW_FS = `void main(){}`;

// ---- goo: instanced, squashed, wobbling blobs ----
export const GOO_VS = /* glsl */ `
layout(location=0) in vec3 aP;
layout(location=4) in vec4 iA;
layout(location=5) in vec4 iB;
layout(location=6) in vec4 iC;
uniform mat4 uVP;
uniform float uTime;
out vec3 vP;
out vec3 vN;
out vec3 vL;
out vec4 vK;
void main(){
  vec3 n=iB.xyz;
  vec3 t=normalize(abs(n.y)<.99?cross(vec3(0.,1.,0.),n):vec3(1.,0.,0.));
  vec3 b=cross(n,t);
  vec3 v=aP;
  float s=iC.z*37.;
  float disp=1.+.2*sin(v.x*3.1+s)*sin(v.z*3.7+s*1.3)+.1*sin(v.x*6.3+v.z*5.1+s*.7);
  float fl=iB.w*(1.+iC.x*.55);
  float lat=1.-iC.x*.28;
  float heat=iC.y;
  float sw=1.+heat*heat*.3+.04*sin(uTime*30.+s)*heat;
  vec3 l=vec3(v.x*lat*disp,v.y*fl,v.z*lat*disp)*sw;
  vec3 P=iA.xyz+(t*l.x+n*(l.y+fl*.4)+b*l.z)*iA.w;
  vec3 nl=normalize(vec3(v.x/lat,v.y/fl,v.z/lat));
  vN=normalize(t*nl.x+n*nl.y+b*nl.z);
  vP=P;vL=v;vK=iC;
  gl_Position=uVP*vec4(P,1.);
}`;
export const GOO_FS =
    COMMON +
    /* glsl */ `
in vec3 vP;
in vec3 vN;
in vec3 vL;
in vec4 vK;
out vec4 o;
void main(){
  vec3 N=normalize(vN),V=normalize(uCam-vP);
  float NdV=max(dot(N,V),0.);
  float fr=pow(1.-NdV,3.);
  float heat=vK.y;
  float sh=shadowAt(vP,N);
  vec3 col=vec3(.008,.3,.028)*(.16+.9*NdV*NdV);
  col+=lit(vP,N,V,vec3(.004,.13,.014),.42,0.,1.,.5,sh)*.8;
  vec3 Hs=normalize(uSunDir+V);
  col+=uSunCol*sh*pow(max(dot(N,Hs),0.),140.)*1.6;
  col+=fr*vec3(.01,.16,.05);
  float bub=smoothstep(.8,.93,texture(uNoise,vL.xz*.45+vK.z*3.).a);
  col+=bub*vec3(.06,.5,.12)*.5*NdV;
  if(heat>0.){
    vec3 hot=mix(vec3(7.,1.4,.1),vec3(18.,11.,5.),heat*heat);
    float n=texture(uNoise,vL.xy*.6+uTime*.9).r;
    col=mix(col,hot*(.5+n),smoothstep(0.,.8,heat));
  }
  o=vec4(fog(col,vP),1.);
}`;

// ---- particles ----
export const PART_VS = /* glsl */ `
layout(location=0) in vec2 aQ;
layout(location=1) in vec4 iA;
layout(location=2) in vec4 iB;
layout(location=3) in vec4 iC;
layout(location=4) in vec4 iD;
uniform mat4 uVP;
uniform vec3 uCR,uCU,uCam;
out vec2 vUV;
out vec4 vCol;
out vec4 vPr;
out float vZ;
void main(){
  float kind=iC.y;
  vec3 P;
  if(kind>1.5&&kind<2.5){
    vec3 ax=iD.xyz;
    float l=length(ax);
    ax/=max(l,1e-4);
    vec3 side=normalize(cross(ax,uCam-iA.xyz));
    P=iA.xyz+side*aQ.x*iA.w+ax*aQ.y*(iA.w+l*iD.w);
  }else if(kind>3.5&&kind<4.5){
    P=iA.xyz+vec3(aQ.x,0.,aQ.y)*iA.w;
  }else{
    float c=cos(iC.x),s=sin(iC.x);
    vec2 q=vec2(aQ.x*c-aQ.y*s,aQ.x*s+aQ.y*c);
    P=iA.xyz+(uCR*q.x+uCU*q.y)*iA.w;
  }
  vUV=aQ;vCol=iB;vPr=iC;
  gl_Position=uVP*vec4(P,1.);
  vZ=gl_Position.w;
}`;
export const PART_FS = /* glsl */ `
in vec2 vUV;
in vec4 vCol;
in vec4 vPr;
in float vZ;
uniform sampler2D uDepth,uNoise;
uniform vec2 uNF;
out vec4 o;
float lin(float d){return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-(d*2.-1.)*(uNF.y-uNF.x));}
void main(){
  float sd=lin(texelFetch(uDepth,ivec2(gl_FragCoord.xy),0).r);
  float soft=clamp((sd-vZ)*1.6,0.,1.);
  if(soft<=0.)discard;
  float r=length(vUV),kind=vPr.y,a;
  if(kind<.5)a=exp(-r*r*4.5)*(1.-smoothstep(.75,1.,r));
  else if(kind<1.5){
    float n=texture(uNoise,vUV*.21+vec2(vPr.x*.31,vPr.w*.4+vPr.x)).r;
    a=smoothstep(1.,.15,r+(n-.5)*1.1);a*=a;
  }else if(kind<2.5)a=exp(-vUV.x*vUV.x*6.)*(1.-abs(vUV.y))*(1.-abs(vUV.y));
  else if(kind<3.5){
    float n=texture(uNoise,vUV*.17+vPr.x).r;
    a=smoothstep(1.,.1,r+(n-.5)*.9);
  }else if(kind<4.5){
    float n=texture(uNoise,vUV*.3).r;
    a=smoothstep(.16,0.,abs(r-.82))*(.5+n);
  }else a=smoothstep(1.,.55,abs(vUV.x)*1.6+abs(vUV.y));
  a*=vCol.a*soft*min(vZ*2.5,1.);
  o=vec4(vCol.rgb*a,a*(1.-vPr.z));
}`;

// ---- ambient snowfall, fully on the GPU ----
export const SNOW_VS = /* glsl */ `
layout(location=0) in vec2 aQ;
layout(location=1) in vec4 aS;
uniform mat4 uVP;
uniform vec3 uCR,uCU,uCam;
uniform float uTime;
out vec2 vUV;
out float vA;
out float vZ;
void main(){
  vec3 box=vec3(44.,26.,44.);
  vec3 p=aS.xyz*box;
  float fs=1.5+aS.w*1.3;
  vec3 vel=vec3(1.5+sin(uTime*.6+aS.w*20.)*.7,-fs,.6+cos(uTime*.5+aS.x*17.)*.6);
  p+=vec3(1.5*uTime+sin(uTime*.6+aS.w*20.)*.9,-fs*uTime,.6*uTime+sin(uTime*.5+aS.x*17.)*.9);
  p=mod(p-uCam,box)-box*.5+uCam;
  float sz=.018+aS.w*.022;
  vec3 ax=normalize(vel);
  vec3 side=normalize(cross(ax,uCam-p));
  vec3 P=p+side*aQ.x*sz+ax*aQ.y*sz*2.6;
  vUV=aQ;
  float d=distance(p,uCam);
  vA=smoothstep(22.,8.,d)*smoothstep(.3,1.2,d);
  gl_Position=uVP*vec4(P,1.);
  vZ=gl_Position.w;
}`;
export const SNOW_FS = /* glsl */ `
in vec2 vUV;
in float vA;
in float vZ;
uniform sampler2D uDepth;
uniform vec2 uNF;
uniform vec3 uCol;
out vec4 o;
float lin(float d){return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-(d*2.-1.)*(uNF.y-uNF.x));}
void main(){
  float sd=lin(texelFetch(uDepth,ivec2(gl_FragCoord.xy),0).r);
  if(sd<vZ)discard;
  float a=(1.-smoothstep(.2,1.,length(vUV)))*vA*.75;
  o=vec4(uCol*a,a);
}`;

// ---- sky: stars, moon, aurora ----
export const SKY_VS = /* glsl */ `
layout(location=0) in vec2 aQ;
uniform mat4 uIVP;
out vec3 vD;
void main(){
  vec4 d=uIVP*vec4(aQ,1.,1.);
  vD=d.xyz/d.w;
  gl_Position=vec4(aQ,1.,1.);
}`;
export const SKY_FS = /* glsl */ `
in vec3 vD;
uniform vec3 uSunDir;
uniform float uTime;
uniform sampler2D uNoise;
uniform vec4 uFog;
out vec4 o;
float h31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
void main(){
  vec3 d=normalize(vD);
  float y=d.y;
  vec3 col=mix(uFog.rgb,vec3(.006,.012,.032),smoothstep(-.03,.45,y));
  vec3 sp=d*190.,ip=floor(sp);
  float h=h31(ip);
  if(h>.982){
    vec3 f=fract(sp)-.5;
    float tw=.65+.35*sin(uTime*(1.+h*30.)+h*90.);
    col+=mix(vec3(.6,.75,1.),vec3(1.,.85,.7),fract(h*77.))*smoothstep(.3,0.,length(f))*tw*(h-.982)*150.*smoothstep(.02,.3,y);
  }
  float md=max(dot(d,uSunDir),0.);
  float mt=texture(uNoise,d.xy*5.+.3).r;
  col+=vec3(.75,.88,1.)*(smoothstep(.99955,.9997,md)*7.*(.55+.6*mt)+pow(md,700.)*.9+pow(md,40.)*.07);
  if(y>.015){
    vec3 au=vec3(0.);
    float jt=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
    for(int i=0;i<16;i++){
      float fi=float(i)+jt;
      vec2 p=d.xz*((1.+fi*.045)/(y+.14));
      vec2 q=p*.055+vec2(uTime*.004,fi*.002);
      float n=texture(uNoise,q).r;
      float m=texture(uNoise,q*3.3+vec2(0.,uTime*.012)).r;
      float band=max(1.-abs(n-.5)*7.,0.);
      band=band*band*(.25+1.4*m*m);
      vec3 c=mix(vec3(.08,1.,.42),vec3(.42,.18,.95),smoothstep(3.,15.,fi));
      au+=c*band*exp(-fi*.09);
    }
    col+=au*.16*smoothstep(.015,.28,y)*smoothstep(1.05,.5,y);
  }
  o=vec4(col,1.);
}`;

// ---- fullscreen passes ----
export const FS_VS = /* glsl */ `
layout(location=0) in vec2 aQ;
out vec2 vUV;
void main(){vUV=aQ*.5+.5;gl_Position=vec4(aQ,0.,1.);}`;

export const DOWN_FS = /* glsl */ `
in vec2 vUV;
uniform sampler2D uT;
uniform vec2 uPx;
out vec4 o;
vec3 s(vec2 d){
  vec3 c=min(texture(uT,vUV+d*uPx).rgb,vec3(48.));
#ifdef KARIS
  return c/(1.+max(c.r,max(c.g,c.b))*.6);
#else
  return c;
#endif
}
void main(){
  vec3 c=s(vec2(0.))*4.+s(vec2(-1.,-1.))+s(vec2(1.,-1.))+s(vec2(-1.,1.))+s(vec2(1.,1.));
  c/=8.;
#ifdef KARIS
  c=c/(1.-min(max(c.r,max(c.g,c.b)),.98)*.6);
#endif
  o=vec4(c,1.);
}`;
export const UP_FS = /* glsl */ `
in vec2 vUV;
uniform sampler2D uT;
uniform vec2 uPx;
out vec4 o;
vec3 s(vec2 d){return texture(uT,vUV+d*uPx).rgb;}
void main(){
  vec3 c=s(vec2(-2.,0.))+s(vec2(2.,0.))+s(vec2(0.,-2.))+s(vec2(0.,2.))+2.*(s(vec2(-1.,-1.))+s(vec2(1.,-1.))+s(vec2(-1.,1.))+s(vec2(1.,1.)));
  o=vec4(c/12.,1.);
}`;

export const COMP_FS = /* glsl */ `
in vec2 vUV;
uniform sampler2D uT,uBloom;
uniform vec4 uP;
uniform vec4 uFx;
uniform vec4 uSW[4];
uniform float uAspect;
out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
void main(){
  vec2 uv=vUV;
  for(int i=0;i<4;i++){
    vec2 dv=(uv-uSW[i].xy)*vec2(uAspect,1.);
    float dl=length(dv);
    float k=(dl-uSW[i].z)*14.;
    uv+=dv/max(dl,1e-4)*uSW[i].w*exp(-k*k)*.022;
  }
  vec2 cd=uv-.5;
  float r2=dot(cd,cd);
  float ca=uFx.y+r2*.004;
  vec3 c=vec3(texture(uT,uv+cd*ca).r,texture(uT,uv).g,texture(uT,uv-cd*ca).b);
  c+=texture(uBloom,uv).rgb*uP.y;
  c*=uP.x;
  c=aces(c);
  float l=dot(c,vec3(.2126,.7152,.0722));
  c=mix(c,c*vec3(.9,1.02,1.12),(1.-l)*.45);
  c=mix(c,c*vec3(1.07,1.,.9),l*.55);
  c=mix(vec3(l),c,1.1-uFx.z);
  c=pow(c,vec3(1./2.2));
  c*=1.-r2*uP.z;
  c=mix(c,vec3(.55,.02,0.),uFx.x*smoothstep(.06,.5,r2));
  c+=vec3(1.,.9,.8)*uFx.w;
  c+=(h12(gl_FragCoord.xy+uP.w)-.5)*.022;
  o=vec4(c,dot(c,vec3(.299,.587,.114)));
}`;

export const FXAA_FS = /* glsl */ `
in vec2 vUV;
uniform sampler2D uT;
uniform vec2 uPx;
out vec4 o;
void main(){
  vec4 m=texture(uT,vUV);
  float lNW=texture(uT,vUV+vec2(-1.,-1.)*uPx).a,lNE=texture(uT,vUV+vec2(1.,-1.)*uPx).a;
  float lSW=texture(uT,vUV+vec2(-1.,1.)*uPx).a,lSE=texture(uT,vUV+vec2(1.,1.)*uPx).a;
  float lM=m.a;
  float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE))),lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));
  vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)),(lNW+lSW)-(lNE+lSE));
  float red=max((lNW+lNE+lSW+lSE)*.03125,.0078125);
  dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+red),-8.,8.)*uPx;
  vec4 a=.5*(texture(uT,vUV+dir*(1./3.-.5))+texture(uT,vUV+dir*(2./3.-.5)));
  vec4 b=a*.5+.25*(texture(uT,vUV-dir*.5)+texture(uT,vUV+dir*.5));
  o=vec4((b.a<lMin||b.a>lMax)?a.rgb:b.rgb,1.);
}`;

// ---- SSAO (half res) ----
export const AO_FS = /* glsl */ `
in vec2 vUV;
uniform sampler2D uDepth;
uniform vec4 uProj;
out vec4 o;
vec3 vp(vec2 uv){
  float d=texture(uDepth,uv).r;
  float z=uProj.x/(d*2.-1.+uProj.y);
  return vec3((uv*2.-1.)*uProj.zw*z,-z);
}
void main(){
  float d=texture(uDepth,vUV).r;
  if(d>=.99999){o=vec4(1.);return;}
  vec3 P=vp(vUV);
  float z=-P.z;
  if(z>55.||z<.6){o=vec4(1.);return;}
  vec3 N=normalize(cross(dFdx(P),dFdy(P)));
  vec2 rad=min(vec2(.45)/(z*uProj.zw),vec2(.07));
  vec2 fc=floor(gl_FragCoord.xy);
  float ang=(mod(fc.x,4.)*4.+mod(fc.y,4.))*.3927;
  float ao=0.;
  for(int i=0;i<8;i++){
    float fi=(float(i)+.5)/8.;
    float a=ang+float(i)*2.4;
    vec3 Q=vp(vUV+vec2(cos(a),sin(a))*rad*sqrt(fi));
    vec3 v=Q-P;
    float vv=dot(v,v);
    ao+=max(dot(v,N)-.03-.004*z,0.)/(vv+.02)*smoothstep(1.6,.6,vv);
  }
  ao=clamp(1.-ao*.16,0.,1.);
  o=vec4(mix(ao,1.,smoothstep(30.,55.,z)));
}`;
export const AOBLUR_FS = /* glsl */ `
in vec2 vUV;
uniform sampler2D uT;
uniform vec2 uPx;
out vec4 o;
void main(){
  float s=0.;
  for(int y=0;y<4;y++)for(int x=0;x<4;x++)s+=texture(uT,vUV+(vec2(float(x),float(y))-1.5)*uPx).r;
  o=vec4(s/16.);
}`;
export const AOAPPLY_FS = /* glsl */ `
in vec2 vUV;
uniform sampler2D uT;
out vec4 o;
void main(){float a=texture(uT,vUV).r;o=vec4(a,a,a,1.);}`;

// ---- scorch map stamps ----
export const STAMP_VS = /* glsl */ `
layout(location=0) in vec2 aQ;
uniform vec4 uR;
out vec2 vUV;
void main(){vUV=aQ;gl_Position=vec4(uR.xy+aQ*uR.z,0.,1.);}`;
export const STAMP_FS = /* glsl */ `
in vec2 vUV;
uniform sampler2D uNoise;
uniform vec4 uR;
uniform vec4 uCol;
out vec4 o;
void main(){
  float r=length(vUV);
  float n=texture(uNoise,vUV*.4+uR.xy*7.).r;
  float a=smoothstep(1.,.25,r+(n-.5)*.7);
  o=uCol*a;
}`;
export const FLAT_FS = /* glsl */ `
uniform vec4 uCol;
out vec4 o;
void main(){o=uCol;}`;
