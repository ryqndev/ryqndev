#ifdef HI
// Shadows for local lights. Each light i carries a code in uLS[i]:
//   -1         no shadow
//   -2         a moving light that asked for a shadow when none was free: unshadowed
//   0..49      fixed light, baked once into tile <code> of the static atlas (one wide map looking down)
//   100, 101   moving light, redrawn every frame into a row of the dynamic atlas (four side faces);
//              several lights close together share a row, which is drawn from uDL[row]
uniform float uLS[16];
uniform vec3 uDL[2];
uniform sampler2DShadow uSA,uDA;
// projection per atlas: tan(half fov), near, far, and tiles per row / rows
uniform vec4 uSP,uDP;
uniform vec2 uSG;

// window-space depth of a point `d` metres along a projection's view axis
float shadowDepth(float d,float n,float f){return .5*(f+n)/(f-n)-f*n/((f-n)*d)+.5;}

float lightShadow(float code,vec3 L,vec3 P){
  vec3 d=P-L;
  if(code<50.){
    float depth=-d.y;
    if(depth<uSP.y)return 1.;
    vec2 ndc=vec2(d.x,-d.z)/(depth*uSP.x);
    if(max(abs(ndc.x),abs(ndc.y))>.985)return 1.;
    vec2 cell=vec2(mod(code,uSG.x),floor(code/uSG.x));
    vec2 uv=(cell+ndc*.5+.5)/uSG;
    return texture(uSA,vec3(uv,shadowDepth(depth-.06-.02*depth,uSP.y,uSP.z)));
  }
  // pick the side face the point falls in; u runs along that face's horizontal axis
  d=P-uDL[int(code)-100];
  vec2 a=abs(d.xz);
  float m,u,face;
  if(a.x>=a.y){m=a.x;face=d.x>0.?0.:1.;u=d.x>0.?d.z:-d.z;}
  else{m=a.y;face=d.z>0.?2.:3.;u=d.z>0.?-d.x:d.x;}
  if(m<uDP.y)return 1.;
  vec2 ndc=vec2(u,d.y)/(m*uDP.x);
  // steeper than the faces cover (straight up or down from the light): nothing recorded there
  if(abs(ndc.y)>.985)return 1.;
  vec2 uv=(vec2(face,code-100.)+ndc*.5+.5)*vec2(.25,.5);
  return texture(uDA,vec3(uv,shadowDepth(m-.04-.02*m,uDP.y,uDP.z)));
}
#endif
