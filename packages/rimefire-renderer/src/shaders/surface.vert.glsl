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
#ifdef HI
// instance rotation, to carry a bump direction from object space to the world
flat out vec3 vR0;
flat out vec3 vR1;
flat out vec3 vR2;
#endif
#elif defined(HI)
// cos/sin of the object's heading: static props are baked in world space, their textures are not
flat out vec2 vYaw;
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
  vO=aP;vQ=aN.xyz;
#ifdef HI
  vR0=iM0.xyz;vR1=iM1.xyz;vR2=iM2.xyz;
#endif
#else
  vec3 P=aP;
  vec3 N=aN.xyz;
#ifdef HI
  // rotate back into the object's own frame so material patterns line up with it
  float ya=aN.w*3.14159265,cs=cos(ya),sn=sin(ya);
  vO=vec3(P.x*cs-P.z*sn,P.y,P.x*sn+P.z*cs);
  vQ=vec3(N.x*cs-N.z*sn,N.y,N.x*sn+N.z*cs);
  vYaw=vec2(cs,sn);
#else
  vO=aP;vQ=aN.xyz;
#endif
#endif
  vP=P;vN=N;vC=aC;vM=aM;
  gl_Position=uVP*vec4(P,1.);
}
