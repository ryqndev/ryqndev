// Light scattered toward the camera by the snowy air: a glow around every shadow-casting light,
// cut by the shadows of whatever stands in it, plus moonlight shafts. Drawn at half resolution.
// Needs STEPS (samples per local light) and MOON_STEPS. Output: rgb = scattered light,
// a = the view depth the ray stopped at, which the upsample uses to keep edges sharp.
in vec2 vUV;
uniform sampler2D uDepth;
// projection terms: proj[14], proj[10], 1 / proj[0], 1 / proj[5]
uniform vec4 uProj;
uniform vec3 uCR,uCU,uCF;
out vec4 o;

// how far the moonlight march reaches; the moon shadow map does not cover much more
const float MOON_RANGE=64.;
// share of light scattered per metre of air, for the moon and for local lights
const float MOON_SCATTER=.0035,LIGHT_SCATTER=.006;
// local lights fall off as 1 / (1 + FALL * d^2), the same curve the surfaces are lit with
const float FALL=.3;

float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
// the air thins out with height, and light is lost on the way back to the camera
float air(vec3 P,float t){return exp(-max(P.y,0.)*.05-t*uFog.a);}

void main(){
  float d=texelFetch(uDepth,ivec2(gl_FragCoord.xy)*2,0).r;
  float z=uProj.x/(d*2.-1.+uProj.y);
  vec2 ndc=vUV*2.-1.;
  vec3 v=uCR*(ndc.x*uProj.z)+uCU*(ndc.y*uProj.w)+uCF;
  float vl=length(v),tmax=z*vl;
  vec3 rd=v/vl;
  float jit=ign(gl_FragCoord.xy);
  vec3 sc=vec3(0.);

  // moon: even steps along the ray, each one checked against the moon shadow map
  {
    float far=min(tmax,MOON_RANGE),dt=far/float(MOON_STEPS),s=0.;
    for(int i=0;i<MOON_STEPS;i++){
      float t=(float(i)+jit)*dt;
      vec3 P=uCam+rd*t;
      vec3 c=(uShadowM*vec4(P,1.)).xyz;
      vec2 e=abs(c.xy-.5);
      float vis=max(e.x,e.y)>.5||c.z>1.?1.:texture(uShadow,c);
      s+=vis*air(P,t);
    }
    // forward-scattering phase function (Henyey-Greenstein, g = 0.5)
    float ph=.0597/pow(1.25-dot(rd,uSunDir),1.5);
    sc+=uSunCol*(s*dt*ph*MOON_SCATTER);
  }

  // Local lights. Only the ones that cast shadows (or asked to) light the air, which leaves out
  // muzzle flashes and the small glows on enemies. Samples are placed equi-angularly as seen
  // from the light, which exactly cancels the falloff: the glow itself comes out free of noise
  // and only the shadow edges need the jitter.
  for(int i=0;i<uLN;i++){
    float code=uLS[i];
    if(code==-1.)continue;
    vec3 L=uLP[i].xyz;
    float r=uLP[i].w;
    vec3 oc=uCam-L;
    float tc=-dot(oc,rd),b2=dot(oc,oc)-tc*tc,h2=r*r-b2;
    if(h2<=0.)continue;
    float h=sqrt(h2),t0=max(tc-h,0.),t1=min(tc+h,tmax);
    if(t1<=t0)continue;
    float D=sqrt(b2+1./FALL),a0=atan((t0-tc)/D),a1=atan((t1-tc)/D),s=0.;
    float ji=fract(jit+float(i)*.618);
    for(int j=0;j<STEPS;j++){
      float u=D*tan(mix(a0,a1,(float(j)+ji)/float(STEPS)));
      vec3 P=uCam+rd*(tc+u);
      float d2=b2+u*u,q=min(d2/(r*r),1.),w=(1.-q)*(1.-q);
      if(code>=0.){
        w*=lightShadow(code,L,P);
        // fixed lights are hooded lamps: the air they light is a cone opening downward
        if(code<50.)w*=smoothstep(.3,.8,(L.y-P.y)*inversesqrt(d2+1e-4));
      }
      s+=w*air(P,tc+u);
    }
    sc+=uLC[i]*(s*(a1-a0)/(FALL*D*float(STEPS))*LIGHT_SCATTER);
  }
  o=vec4(sc,z);
}
