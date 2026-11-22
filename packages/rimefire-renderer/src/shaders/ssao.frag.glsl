in vec2 vUV;
uniform sampler2D uDepth;
uniform vec4 uProj;
out vec4 o;
vec3 vp(vec2 uv){
  float d=texture(uDepth,uv).r;
  float z=uProj.x/(d*2.-1.+uProj.y);
  return vec3((uv*2.-1.)*uProj.zw*z,-z);
}
void main(){
  float d=texture(uDepth,vUV).r;
  if(d>=.99999){o=vec4(1.);return;}
  vec3 P=vp(vUV);
  float z=-P.z;
  if(z>55.||z<.6){o=vec4(1.);return;}
  vec3 N=normalize(cross(dFdx(P),dFdy(P)));
  vec2 rad=min(vec2(.45)/(z*uProj.zw),vec2(.07));
  vec2 fc=floor(gl_FragCoord.xy);
  float ang=(mod(fc.x,4.)*4.+mod(fc.y,4.))*.3927;
  float ao=0.;
  for(int i=0;i<8;i++){
    float fi=(float(i)+.5)/8.;
    float a=ang+float(i)*2.4;
    vec3 Q=vp(vUV+vec2(cos(a),sin(a))*rad*sqrt(fi));
    vec3 v=Q-P;
    float vv=dot(v,v);
    ao+=max(dot(v,N)-.03-.004*z,0.)/(vv+.02)*smoothstep(1.6,.6,vv);
  }
  ao=clamp(1.-ao*.16,0.,1.);
  o=vec4(mix(ao,1.,smoothstep(30.,55.,z)));
}
