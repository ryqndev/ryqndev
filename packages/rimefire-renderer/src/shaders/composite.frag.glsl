in vec2 vUV;
uniform sampler2D uT,uBloom;
uniform vec4 uP;
uniform vec4 uFx;
uniform vec4 uSW[4];
uniform float uAspect;
out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
void main(){
  vec2 uv=vUV;
  for(int i=0;i<4;i++){
    vec2 dv=(uv-uSW[i].xy)*vec2(uAspect,1.);
    float dl=length(dv);
    float k=(dl-uSW[i].z)*14.;
    uv+=dv/max(dl,1e-4)*uSW[i].w*exp(-k*k)*.022;
  }
  vec2 cd=uv-.5;
  float r2=dot(cd,cd);
  float ca=uFx.y+r2*.004;
  vec3 c=vec3(texture(uT,uv+cd*ca).r,texture(uT,uv).g,texture(uT,uv-cd*ca).b);
  c+=texture(uBloom,uv).rgb*uP.y;
  c*=uP.x;
  c=aces(c);
  float l=dot(c,vec3(.2126,.7152,.0722));
  c=mix(c,c*vec3(.9,1.02,1.12),(1.-l)*.45);
  c=mix(c,c*vec3(1.07,1.,.9),l*.55);
  c=mix(vec3(l),c,1.1-uFx.z);
  c=pow(c,vec3(1./2.2));
  c*=1.-r2*uP.z;
  c=mix(c,vec3(.55,.02,0.),uFx.x*smoothstep(.06,.5,r2));
  c+=vec3(1.,.9,.8)*uFx.w;
  c+=(h12(gl_FragCoord.xy+uP.w)-.5)*.022;
  o=vec4(c,dot(c,vec3(.299,.587,.114)));
}
