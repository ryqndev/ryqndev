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
}
