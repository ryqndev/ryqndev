in vec2 vUV;
uniform sampler2D uT;
out vec4 o;
void main(){float a=texture(uT,vUV).r;o=vec4(a,a,a,1.);}
