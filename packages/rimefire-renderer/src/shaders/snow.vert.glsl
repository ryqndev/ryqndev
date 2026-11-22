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
}
