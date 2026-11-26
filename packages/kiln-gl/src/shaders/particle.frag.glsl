in vec2 vUV;
in vec4 vCol;
in vec4 vPr;
in float vZ;
uniform sampler2D uDepth,uNoise;
uniform vec2 uNF;
out vec4 o;
float lin(float d){return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-(d*2.-1.)*(uNF.y-uNF.x));}
void main(){
  float sd=lin(texelFetch(uDepth,ivec2(gl_FragCoord.xy),0).r);
  float soft=clamp((sd-vZ)*1.6,0.,1.);
  if(soft<=0.)discard;
  float r=length(vUV),kind=vPr.y,a;
  if(kind<.5)a=exp(-r*r*4.5)*(1.-smoothstep(.75,1.,r));
  else if(kind<1.5){
    float n=texture(uNoise,vUV*.21+vec2(vPr.x*.31,vPr.w*.4+vPr.x)).r;
    a=smoothstep(1.,.15,r+(n-.5)*1.1);a*=a;
  }else if(kind<2.5)a=exp(-vUV.x*vUV.x*6.)*(1.-abs(vUV.y))*(1.-abs(vUV.y));
  else if(kind<3.5){
    float n=texture(uNoise,vUV*.17+vPr.x).r;
    a=smoothstep(1.,.1,r+(n-.5)*.9);
  }else if(kind<4.5){
    float n=texture(uNoise,vUV*.3).r;
    a=smoothstep(.16,0.,abs(r-.82))*(.5+n);
  }else a=smoothstep(1.,.55,abs(vUV.x)*1.6+abs(vUV.y));
  a*=vCol.a*soft*min(vZ*2.5,1.);
  o=vec4(vCol.rgb*a,a*(1.-vPr.z));
}
