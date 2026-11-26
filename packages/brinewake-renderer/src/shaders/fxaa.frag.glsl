in vec2 vUV;
uniform sampler2D uT;
uniform vec2 uPx;
out vec4 o;
void main(){
  vec4 m=texture(uT,vUV);
  float lNW=texture(uT,vUV+vec2(-1.,-1.)*uPx).a,lNE=texture(uT,vUV+vec2(1.,-1.)*uPx).a;
  float lSW=texture(uT,vUV+vec2(-1.,1.)*uPx).a,lSE=texture(uT,vUV+vec2(1.,1.)*uPx).a;
  float lM=m.a;
  float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE))),lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));
  vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)),(lNW+lSW)-(lNE+lSE));
  float red=max((lNW+lNE+lSW+lSE)*.03125,.0078125);
  dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+red),-8.,8.)*uPx;
  vec4 a=.5*(texture(uT,vUV+dir*(1./3.-.5))+texture(uT,vUV+dir*(2./3.-.5)));
  vec4 b=a*.5+.25*(texture(uT,vUV-dir*.5)+texture(uT,vUV+dir*.5));
  o=vec4((b.a<lMin||b.a>lMax)?a.rgb:b.rgb,1.);
}
