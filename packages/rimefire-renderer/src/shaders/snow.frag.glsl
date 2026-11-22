in vec2 vUV;
in float vA;
in float vZ;
uniform sampler2D uDepth;
uniform vec2 uNF;
uniform vec3 uCol;
out vec4 o;
float lin(float d){return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-(d*2.-1.)*(uNF.y-uNF.x));}
void main(){
  float sd=lin(texelFetch(uDepth,ivec2(gl_FragCoord.xy),0).r);
  if(sd<vZ)discard;
  float a=(1.-smoothstep(.2,1.,length(vUV)))*vA*.75;
  o=vec4(uCol*a,a);
}
