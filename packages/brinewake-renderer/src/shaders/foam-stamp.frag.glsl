in vec2 vQ;
in float vS;
out vec4 o;
void main(){
  o=vec4(vS*smoothstep(1.,.25,length(vQ)));
}
