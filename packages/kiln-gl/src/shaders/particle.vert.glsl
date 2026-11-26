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
}
