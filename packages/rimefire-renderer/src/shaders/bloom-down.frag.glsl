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
}
