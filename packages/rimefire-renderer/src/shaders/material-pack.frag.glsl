// Second material pass: turns the generated height into a slope (what the bump mapping needs) and
// packs each layer into its final two textures.
// Target 0: slope along u, slope along v (0.5 = flat), roughness offset, cavity
// Target 1: albedo tint (half scale), mask
in vec2 vUV;
uniform sampler2D uA,uB;
uniform vec2 uPx;
layout(location=0) out vec4 oA;
layout(location=1) out vec4 oB;
float H(vec2 d){return texture(uA,vUV+d*uPx).r;}
void main(){
  vec4 a=texture(uA,vUV);
  vec2 slope=vec2(H(vec2(1.,0.))-H(vec2(-1.,0.)),H(vec2(0.,1.))-H(vec2(0.,-1.)));
  oA=vec4(.5+slope*1.4,a.g,a.b);
  oB=vec4(texture(uB,vUV).rgb,a.a);
}
