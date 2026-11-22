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
}
