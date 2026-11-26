in vec2 vUV;
uniform sampler2D uT;
uniform vec2 uPx;
out vec4 o;
vec3 s(vec2 d){return texture(uT,vUV+d*uPx).rgb;}
void main(){
  vec3 c=s(vec2(-2.,0.))+s(vec2(2.,0.))+s(vec2(0.,-2.))+s(vec2(0.,2.))+2.*(s(vec2(-1.,-1.))+s(vec2(1.,-1.))+s(vec2(-1.,1.))+s(vec2(1.,1.)));
  o=vec4(c/12.,1.);
}
