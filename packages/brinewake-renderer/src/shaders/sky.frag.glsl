in vec3 vD;
out vec4 o;
float h31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
void main(){
  vec3 d=normalize(vD);
  vec3 col=skyBase(d);
  float s=max(dot(d,uSunDir),0.);
  // the disc itself: the sun by day, the moon at night
  col+=uSunCol*smoothstep(.99935,.9997,s)*12.;
  if(d.y>0.){
    if(uEnv.w>.01){
      vec3 sp=d*170.,ip=floor(sp);
      float h=h31(ip);
      if(h>.985){
        vec3 f=fract(sp)-.5;
        float tw=.7+.3*sin(uTime*(1.+h*20.)+h*90.);
        col+=vec3(.8,.9,1.)*smoothstep(.3,0.,length(f))*tw*(h-.985)*60.*uEnv.w*smoothstep(.02,.25,d.y);
      }
    }
    // clouds: two octaves of noise on a sheet overhead, drifting downwind
    vec2 p=d.xz/(d.y+.14);
    float n=texture(uNoise,p*.043+uTime*vec2(.0017,.0008)).r*.65+texture(uNoise,p*.127+uTime*vec2(.0031,.0012)).r*.35;
    float cl=smoothstep(.55,.8,n)*smoothstep(0.,.16,d.y);
    vec3 cc=mix(uHorizon*.75+uSunCol*.28,uZenith*.4+uHorizon*.3,smoothstep(.6,.9,n))+uSunCol*pow(s,5.)*.3;
    col=mix(col,cc,cl*.9);
  }
  o=vec4(col,1.);
}
