layout(location=0) in vec2 aQ;
uniform vec4 uR;
out vec2 vUV;
void main(){vUV=aQ;gl_Position=vec4(uR.xy+aQ*uR.z,0.,1.);}
