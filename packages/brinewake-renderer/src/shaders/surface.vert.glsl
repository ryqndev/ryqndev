layout(location=0) in vec3 aP;
// xyz normal, w how far the wind moves this vertex
layout(location=1) in vec4 aN;
layout(location=2) in vec4 aC;
layout(location=3) in vec4 aM;
#ifdef INST
layout(location=4) in vec4 iM0;
layout(location=5) in vec4 iM1;
layout(location=6) in vec4 iM2;
layout(location=7) in vec4 iT;
out vec4 vT;
#endif
uniform mat4 uVP;
uniform float uTime;
out vec3 vP;
out vec3 vN;
out vec4 vC;
out vec4 vM;
// position and normal in the frame material patterns are laid out in
out vec3 vO;
out vec3 vQ;
void main(){
#ifdef INST
  vec4 p=vec4(aP,1.);
  vec3 P=vec3(dot(iM0,p),dot(iM1,p),dot(iM2,p));
  vec3 N=normalize(vec3(dot(iM0.xyz,aN.xyz),dot(iM1.xyz,aN.xyz),dot(iM2.xyz,aN.xyz)));
  vT=iT;
#else
  vec3 P=aP;
  vec3 N=aN.xyz;
#endif
  if(aN.w>0.){
    // wind: a slow lean with a faster flutter riding on it
    float ph=uTime*2.1+P.x*.31+P.z*.23;
    vec3 s=vec3(sin(ph)+.5*sin(ph*2.7+1.3),.35*sin(ph*1.9+.7),cos(ph*.83)+.5*sin(ph*3.1));
    P+=s*aN.w*.3;
  }
  vO=aP;vQ=aN.xyz;
  vP=P;vN=N;vC=aC;vM=aM;
  gl_Position=uVP*vec4(P,1.);
}
