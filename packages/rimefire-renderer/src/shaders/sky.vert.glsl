layout(location=0) in vec2 aQ;
uniform mat4 uIVP;
out vec3 vD;
void main(){
  vec4 d=uIVP*vec4(aQ,1.,1.);
  vD=d.xyz/d.w;
  gl_Position=vec4(aQ,1.,1.);
}
