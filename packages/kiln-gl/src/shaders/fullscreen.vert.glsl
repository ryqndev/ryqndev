layout(location=0) in vec2 aQ;
out vec2 vUV;
void main(){vUV=aQ*.5+.5;gl_Position=vec4(aQ,0.,1.);}
