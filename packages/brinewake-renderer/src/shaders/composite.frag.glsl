in vec2 vUV;
uniform sampler2D uT,uBloom;
// exposure, bloom strength, vignette, grain seed
uniform vec4 uP;
// damage vignette, white flash, desaturation
uniform vec4 uFx;
out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
void main(){
  vec2 cd=vUV-.5;
  float r2=dot(cd,cd);
  vec3 c=texture(uT,vUV).rgb+texture(uBloom,vUV).rgb*uP.y;
  c=aces(c*uP.x);
  float l=dot(c,vec3(.2126,.7152,.0722));
  // a little teal in the shadows and warmth in the highlights
  c=mix(c,c*vec3(.92,1.02,1.08),(1.-l)*.4);
  c=mix(c,c*vec3(1.06,1.,.92),l*.5);
  c=mix(vec3(l),c,1.08-uFx.z);
  c=pow(c,vec3(1./2.2));
  c*=1.-r2*uP.z;
  c=mix(c,vec3(.5,.03,0.),uFx.x*smoothstep(.05,.5,r2));
  c+=vec3(1.,.92,.8)*uFx.y;
  c+=(h12(gl_FragCoord.xy+uP.w)-.5)*.018;
  o=vec4(c,dot(c,vec3(.299,.587,.114)));
}
