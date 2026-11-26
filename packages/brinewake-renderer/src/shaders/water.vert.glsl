// offset from the grid's centre, metres: a disc of rings that widen with distance
layout(location=0) in vec2 aQ;
uniform mat4 uVP;
uniform vec3 uCam;
uniform float uTime;
// per wave: wavenumber vector xz, angular frequency, amplitude / sideways reach xz, 1 / wavelength
uniform vec4 uWave[4];
uniform vec4 uWaveB[4];
uniform sampler2D uTerrain;
// 1 / the width of the square the terrain and foam maps cover
uniform float uWorld;
out vec3 vP;
// where this vertex sat before the swell moved it
out vec2 vQ;
out float vCalm;
void main(){
  vec2 q=uCam.xz+aQ;
  float r=length(aQ);
  // spacing between rings out here: a wave the mesh cannot resolve is left to the fragment shader
  float sp=1.28+.04*r;
  float calm=.15+.85*smoothstep(.5,9.,-textureLod(uTerrain,q*uWorld+.5,0.).r);
  vec3 P=vec3(q.x,0.,q.y);
  for(int i=0;i<4;i++){
    float f=(1.-smoothstep(.12,.25,sp*uWaveB[i].z))*calm;
    float ph=dot(uWave[i].xy,q)-uWave[i].z*uTime;
    P.xz+=uWaveB[i].xy*cos(ph)*f;
    P.y+=uWave[i].w*sin(ph)*f;
  }
  vP=P;vQ=q;vCalm=calm;
  gl_Position=uVP*vec4(P,1.);
}
