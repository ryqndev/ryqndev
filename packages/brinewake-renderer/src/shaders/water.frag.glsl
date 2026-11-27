in vec3 vP;
in vec2 vQ;
in float vCalm;
uniform vec4 uWave[4];
uniform sampler2D uTerrain,uFoam;
uniform float uWorld;
// The hull the sea is not drawn inside: world to her own frame, then (z0, z1, half her beam, her
// length), and her draught (0: there is none). Her side is the one models.ts lofts: see wAt and kAt there.
uniform mat4 uDryM;
uniform vec4 uDry;
uniform float uDryD;
out vec4 o;
void main(){
  if(uDryD>0.){
    vec3 h=(uDryM*vec4(vP,1.)).xyz;
    if(h.z>uDry.x&&h.z<uDry.y){
      float t=.5-h.z/uDry.w;
      float w=uDry.z*min(1.,.72+1.3*t)*(1.-pow(max(0.,(t-.4)/.6),2.4));
      float k=-uDryD*(1.-.6*t*t*t-.2*pow(1.-t,4.));
      // how far out her planking stands at this height, as a part of that: bilge, waterline, wale
      float f=h.y<k*.3?mix(.55,.9,clamp((h.y-k*.82)/(k*-.52),0.,1.)):mix(.9,1.,clamp((h.y-k*.3)/(.3-k*.3),0.,1.));
      if(abs(h.x)<w*f-.1)discard;
    }
  }
  // slope of the swell: all four waves, however few of them the mesh itself displaces out here
  vec2 g=vec2(0.);
  float crest=0.;
  for(int i=0;i<4;i++){
    float ph=dot(uWave[i].xy,vQ)-uWave[i].z*uTime;
    g+=uWave[i].xy*(uWave[i].w*cos(ph));
    crest+=uWave[i].w*sin(ph);
  }
  g*=vCalm;
  crest*=vCalm;
  // ripples: two layers of the noise texture's stored gradient, sliding across each other
  float dist=length(vP-uCam);
  vec4 n1=texture(uNoise,vP.xz*.047+uTime*vec2(.012,.019));
  vec4 n2=texture(uNoise,vP.xz*.151-uTime*vec2(.027,.011));
  g+=((n1.gb-.5)*.6+(n2.gb-.5)*.38)/(1.+dist*.0035);
  vec3 N=normalize(vec3(-g.x,1.,-g.y));
  vec3 V=(uCam-vP)/dist;
  float NdV=max(dot(N,V),0.);
  float F=.02+.98*pow(1.-NdV,5.);
  vec3 R=reflect(-V,N);
  R.y=abs(R.y);

  vec2 wuv=vP.xz*uWorld+.5;
  float depth=vP.y-texture(uTerrain,wuv).r;
  float sh=shadowAt(vP,vec3(0.,1.,0.));

  // the body of the water: dark over the deep, bright over sand, glowing where the sun passes through a crest
  vec3 body=mix(uShallow,uDeep,1.-exp(-max(depth,0.)*.2));
  body+=uShallow*uSunCol*pow(max(dot(V,-uSunDir)*.5+.5,0.),4.)*max(crest+.35,0.)*.3*sh;
  body*=.55+.45*sh;
  vec3 col=mix(body,skyBase(R),F);
  // the sun's glitter path
  float NdH=max(dot(N,normalize(uSunDir+V)),0.);
  col+=uSunCol*sh*(pow(NdH,420.)*4.+pow(NdH,48.)*.05);
  // lanterns, fires and gun flashes on the surface
  for(int i=0;i<uLN;i++){
    vec3 Lv=uLP[i].xyz-vP;
    float d2=dot(Lv,Lv),q=d2/(uLP[i].w*uLP[i].w);
    if(q<1.){
      vec3 L=Lv*inversesqrt(d2+1e-4);
      col+=uLC[i]*(1.-q)*(1.-q)/(1.+d2*.02)*(.05*max(dot(N,L),0.)+.6*pow(max(dot(N,normalize(L+V)),0.),90.));
    }
  }

  // foam: wakes and splashes from the foam map, whitecaps on the tallest crests, surf where it shoals.
  // Each is only how much foam there is; fine noise then breaks that into lace, solid only where it is thick.
  float drift=texture(uNoise,vP.xz*.09+uTime*vec2(.017,-.012)).r;
  float lace=texture(uNoise,vP.xz*.71+uTime*vec2(-.031,.023)).r*.7+n2.r*.3;
  float wake=texture(uFoam,wuv).r;
  float surf=smoothstep(1.7,0.,depth)*(.55+.45*sin(depth*3.2-uTime*1.7+drift*6.));
  float cap=smoothstep(.72,1.2,crest+(drift-.5)*.7)*.6;
  // a wake never closes over completely: it stays streaked however often it is crossed
  float amount=min(min(wake*1.2,.56)+surf+cap,1.05);
  float foam=smoothstep(1.08-amount,1.3-amount,lace+.18)*smoothstep(0.,.08,amount);
  col=mix(col,(skyAmb(vec3(0.,1.,0.))*1.4+uSunCol*(.2+.5*max(uSunDir.y,0.))*sh)*.9,foam*.92);

  // clear over the sand at the very edge, so the beach shows through
  float a=clamp(smoothstep(-.05,.9,depth)+foam*.6,0.,1.);
  o=vec4(fog(col,vP),a);
}
