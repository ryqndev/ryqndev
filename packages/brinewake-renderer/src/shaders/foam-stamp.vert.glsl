layout(location=0) in vec2 aQ;
// x, z, radius, strength
layout(location=1) in vec4 iS;
// 2 / the width of the square the foam map covers: world metres to clip space
uniform float uScale;
out vec2 vQ;
out float vS;
void main(){
  vQ=aQ;vS=iS.w;
  gl_Position=vec4((iS.xy+aQ*iS.z)*uScale,0.,1.);
}
