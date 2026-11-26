// Upsamples the half-resolution scattering buffer and adds it to the scene. Each pixel blends the
// 3x3 half-res samples around it, favouring the ones marched to a similar depth, so the glow
// behind an object does not bleed over its silhouette. The blur also hides the march's jitter.
uniform sampler2D uT,uDepth;
uniform vec4 uProj;
out vec4 o;
void main(){
  float d=texelFetch(uDepth,ivec2(gl_FragCoord.xy),0).r;
  float z=uProj.x/(d*2.-1.+uProj.y);
  ivec2 hi=textureSize(uT,0)-1;
  // half-res sample k sits at the centre of full-res pixels 2k and 2k+1
  vec2 p=gl_FragCoord.xy*.5-.5;
  ivec2 b=ivec2(floor(p+.5));
  vec2 f=p-vec2(b);
  vec3 s=vec3(0.);
  float ws=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec4 t=texelFetch(uT,clamp(b+ivec2(x,y),ivec2(0),hi),0);
    vec2 e=vec2(x,y)-f;
    float w=exp(-dot(e,e)*.8)/(.03+abs(t.a-z)/min(t.a,z));
    s+=t.rgb*w;
    ws+=w;
  }
  o=vec4(s/ws,0.);
}
