in vec2 vUV;
uniform sampler2D uT;
uniform vec2 uPx;
out vec4 o;
void main(){
  float s=0.;
  for(int y=0;y<4;y++)for(int x=0;x<4;x++)s+=texture(uT,vUV+(vec2(float(x),float(y))-1.5)*uPx).r;
  o=vec4(s/16.);
}
