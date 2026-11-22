in vec3 vD;
uniform vec3 uSunDir;
uniform float uTime;
uniform sampler2D uNoise;
uniform vec4 uFog;
out vec4 o;
float h31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
void main(){
  vec3 d=normalize(vD);
  float y=d.y;
  vec3 col=mix(uFog.rgb,vec3(.006,.012,.032),smoothstep(-.03,.45,y));
  vec3 sp=d*190.,ip=floor(sp);
  float h=h31(ip);
  if(h>.982){
    vec3 f=fract(sp)-.5;
    float tw=.65+.35*sin(uTime*(1.+h*30.)+h*90.);
    col+=mix(vec3(.6,.75,1.),vec3(1.,.85,.7),fract(h*77.))*smoothstep(.3,0.,length(f))*tw*(h-.982)*150.*smoothstep(.02,.3,y);
  }
  float md=max(dot(d,uSunDir),0.);
  float mt=texture(uNoise,d.xy*5.+.3).r;
  col+=vec3(.75,.88,1.)*(smoothstep(.99955,.9997,md)*7.*(.55+.6*mt)+pow(md,700.)*.9+pow(md,40.)*.07);
  if(y>.015){
    vec3 au=vec3(0.);
    float jt=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
    for(int i=0;i<16;i++){
      float fi=float(i)+jt;
      vec2 p=d.xz*((1.+fi*.045)/(y+.14));
      vec2 q=p*.055+vec2(uTime*.004,fi*.002);
      float n=texture(uNoise,q).r;
      float m=texture(uNoise,q*3.3+vec2(0.,uTime*.012)).r;
      float band=max(1.-abs(n-.5)*7.,0.);
      band=band*band*(.25+1.4*m*m);
      vec3 c=mix(vec3(.08,1.,.42),vec3(.42,.18,.95),smoothstep(3.,15.,fi));
      au+=c*band*exp(-fi*.09);
    }
    col+=au*.16*smoothstep(.015,.28,y)*smoothstep(1.05,.5,y);
  }
  o=vec4(col,1.);
}
