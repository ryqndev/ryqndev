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
}
