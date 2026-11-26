// Procedural surface materials, rendered once at start-up into the layers of a texture array.
// Every pattern tiles, so surfaces can repeat it with no visible seam.
// Target 0: height, roughness offset (0.5 = none), cavity (1 = open), mask (meaning is per layer)
// Target 1: albedo tint
in vec2 vUV;
uniform int uLayer;
layout(location=0) out vec4 oA;
layout(location=1) out vec4 oB;

float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 h22(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}
// value noise repeating every `per` cells
float vn(vec2 p,vec2 per){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float a=h21(mod(i,per)),b=h21(mod(i+vec2(1.,0.),per)),c=h21(mod(i+vec2(0.,1.),per)),d=h21(mod(i+1.,per));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float fbm(vec2 p,vec2 per){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p,per);p*=2.;per*=2.;a*=.5;}return s;}
// repeating voronoi: x = gap between the two nearest cells (0 on a cell border), y = cell id
vec2 voro(vec2 p,vec2 per){
  vec2 i=floor(p),f=fract(p);float f1=9.,f2=9.,id=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 g=vec2(float(x),float(y)),c=mod(i+g,per);
    float d=length(g+h22(c)-f);
    if(d<f1){f2=f1;f1=d;id=h21(c+7.3);}else if(d<f2)f2=d;
  }
  return vec2(f2-f1,id);
}
// thin straight scratches; integer line normals keep them tiling
float scratches(vec2 uv,float width){
  float s=0.;
  for(int k=0;k<5;k++){
    float fk=float(k);
    vec2 n=k==0?vec2(3.,1.):k==1?vec2(1.,4.):k==2?vec2(5.,2.):k==3?vec2(2.,-5.):vec2(1.,-2.);
    float d=abs(fract(dot(uv,n)+fk*.37)-.5)/length(n);
    s=max(s,smoothstep(width,0.,d)*smoothstep(.62,.74,vn(uv*8.+fk*3.7,vec2(8.))));
  }
  return s;
}
// rectangular panels: each of the n x n cells is randomly split up to twice.
// x = distance to the nearest panel edge (cell units), y = panel id, zw = position inside the panel
vec4 panels(vec2 uv,float n){
  vec2 p=uv*n,c=mod(floor(p),n),f=fract(p),lo=vec2(0.),hi=vec2(1.);
  float r=h21(c),id=r;
  if(r<.72){
    float s=.3+.4*h21(c+11.);
    bool vert=r<.36;
    if(vert){if(f.x<s){hi.x=s;id+=.13;}else{lo.x=s;id+=.31;}}
    else{if(f.y<s){hi.y=s;id+=.17;}else{lo.y=s;id+=.37;}}
    if(h21(c+floor(id*91.))<.5){
      float t=.35+.3*h21(c+23.+id);
      if(vert){if(f.y<t){hi.y=t;id+=.07;}else{lo.y=t;id+=.23;}}
      else{if(f.x<t){hi.x=t;id+=.09;}else{lo.x=t;id+=.29;}}
    }
  }
  vec2 e=min(f-lo,hi-f);
  return vec4(min(e.x,e.y),fract(id*7.31),e);
}

void main(){
  vec2 uv=vUV;
  float fine=fbm(uv*48.,vec2(48.));
  float h=.5,rough=.5,cav=1.,mask=0.;
  vec3 tint=vec3(1.);
  if(uLayer==0){
    // weathered painted steel: rust blooms, grime runs, chipped paint, scratches. mask = rust
    float big=fbm(uv*6.,vec2(6.));
    float rust=smoothstep(.61,.73,big+(fine-.5)*.3);
    float grime=smoothstep(.45,.8,fbm(vec2(uv.x*40.,uv.y*2.5),vec2(40.,2.5)))*.5;
    float chip=smoothstep(.8,.88,vn(uv*90.,vec2(90.))*.55+fine*.55)*(1.-rust);
    float scr=scratches(uv,.0022)*(1.-rust);
    h=.5+(fine-.5)*.1-rust*.25*(.4+fine)-chip*.18-scr*.1;
    rough=.5+rust*.4+chip*.15-scr*.12+(fine-.5)*.2;
    cav=1.-rust*.3-chip*.25-grime*.25;
    tint=vec3(1.-grime*.35)*(1.-chip*.5);
    mask=rust;
  }else if(uLayer==1){
    // machine plating: inset panels with seams, corner bolts and the odd vent. mask = worn edges
    vec4 pn=panels(uv,4.);
    float seam=smoothstep(.035,.012,pn.x);
    float wear=smoothstep(.03,.055,pn.x)*smoothstep(.1,.06,pn.x);
    float bolt=smoothstep(.024,.012,length(pn.zw-.07));
    float vent=pn.y>.78?step(.5,fract(uv.y*32.))*smoothstep(.1,.16,pn.x):0.;
    h=.5-seam*.5+bolt*.25-vent*.22+(fine-.5)*.04;
    rough=.5+(pn.y-.5)*.25-wear*.2+(fine-.5)*.12;
    cav=1.-seam*.8-vent*.4;
    tint=vec3(.7+.6*pn.y);
    mask=wear;
  }else if(uLayer==2){
    // concrete: aggregate speckle, pits, hairline cracks, damp stains. mask = cracks
    float big=fbm(uv*5.,vec2(5.));
    float pits=smoothstep(.74,.82,vn(uv*120.,vec2(120.)));
    float crack=smoothstep(.03,0.,voro(uv*5.,vec2(5.)).x)*smoothstep(.45,.6,big);
    float stain=smoothstep(.5,.75,fbm(uv*3.+4.,vec2(3.)));
    h=.5+(fine-.5)*.22-pits*.2-crack*.45;
    rough=.5+(fine-.5)*.2+stain*.1;
    cav=1.-crack*.5-pits*.2;
    tint=vec3(.9+.2*big)*(1.-stain*.25);
    mask=crack;
  }else if(uLayer==3){
    // ice: plate-like facets split by fracture lines, with frosted patches. mask = fractures
    vec2 v1=voro(uv*4.,vec2(4.)),v2=voro(uv*11.+3.,vec2(11.));
    float c1=smoothstep(.05,0.,v1.x),c2=smoothstep(.035,0.,v2.x)*.6;
    float frost=smoothstep(.5,.75,fbm(uv*8.,vec2(8.)));
    h=.5-c1*.4-c2*.2+(v1.y-.5)*.22+(fine-.5)*.05;
    rough=.42+frost*.4;
    cav=1.-max(c1,c2)*.3;
    tint=vec3(1.+frost*.3);
    mask=max(c1,c2);
  }else if(uLayer==4){
    // wind-packed snow: fine grain over long ripples
    float ripple=fbm(vec2(uv.x*6.,uv.y*28.),vec2(6.,28.));
    float grain=vn(uv*200.,vec2(200.));
    h=.5+(ripple-.5)*.55+(grain-.5)*.14+(fine-.5)*.1;
    rough=.5+(grain-.5)*.2;
  }else if(uLayer==5){
    // moulded weapon casing: fine grain, sparse part lines, handling scratches. mask = worn edges
    vec4 pn=panels(uv,2.);
    float seam=smoothstep(.02,.006,pn.x);
    float wear=smoothstep(.018,.03,pn.x)*smoothstep(.06,.035,pn.x);
    float micro=vn(uv*160.,vec2(160.));
    float scr=scratches(uv,.0022);
    h=.5-seam*.35+(micro-.5)*.07-scr*.1;
    rough=.5+(micro-.5)*.25-scr*.12-wear*.15;
    cav=1.-seam*.5;
    tint=vec3(.92+.16*pn.y);
    mask=max(wear,scr*.6);
  }else{
    // timber planks with open joints and stretched grain
    float k=floor(uv.x*4.),x=fract(uv.x*4.);
    float gap=smoothstep(.045,.012,min(x,1.-x));
    float grain=fbm(vec2(uv.x*64.+h21(vec2(k,3.))*9.,uv.y*5.),vec2(64.,5.));
    h=.5-gap*.5+(grain-.5)*.3;
    rough=.6+(grain-.5)*.2;
    cav=1.-gap*.6;
    tint=vec3(.75+.5*h21(vec2(k,5.)))*(.85+.3*grain);
  }
  oA=vec4(h,clamp(rough,0.,1.),clamp(cav,0.,1.),mask);
  oB=vec4(tint*.5,1.);
}
