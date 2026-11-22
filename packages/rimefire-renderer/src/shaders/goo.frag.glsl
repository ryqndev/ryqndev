in vec3 vP;
in vec3 vN;
in vec3 vL;
in vec4 vK;
out vec4 o;
void main(){
  vec3 N=normalize(vN),V=normalize(uCam-vP);
  float NdV=max(dot(N,V),0.);
  float fr=pow(1.-NdV,3.);
  float heat=vK.y;
  float sh=shadowAt(vP,N);
  vec3 col=vec3(.008,.3,.028)*(.16+.9*NdV*NdV);
  col+=lit(vP,N,V,vec3(.004,.13,.014),.42,0.,1.,.5,sh)*.8;
  vec3 Hs=normalize(uSunDir+V);
  col+=uSunCol*sh*pow(max(dot(N,Hs),0.),140.)*1.6;
  col+=fr*vec3(.01,.16,.05);
  float bub=smoothstep(.8,.93,texture(uNoise,vL.xz*.45+vK.z*3.).a);
  col+=bub*vec3(.06,.5,.12)*.5*NdV;
  if(heat>0.){
    vec3 hot=mix(vec3(7.,1.4,.1),vec3(18.,11.,5.),heat*heat);
    float n=texture(uNoise,vL.xy*.6+uTime*.9).r;
    col=mix(col,hot*(.5+n),smoothstep(0.,.8,heat));
  }
  o=vec4(fog(col,vP),1.);
}
