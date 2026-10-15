/* VERBATIM from tools/mockups/river/surface-study.html, lines 128-177. The GLSL noise every river shader uses (h31, vn, fbm, vn2, fbm2, cell2, vedge, ramps, grass strokes) and the onBeforeCompile helper.
   Port this code as it is (same functions, same constants, same noise). Only the plumbing around it may change. */
const GLSL_NOISE=`
float h31(vec3 p){p=fract(p*0.3183099+vec3(0.71,0.113,0.419));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float s=0.0,a=0.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s/0.9375;}
float vn2(vec2 p){return vn(vec3(p,0.37));}
float fbm2(vec2 p){return fbm(vec3(p,0.37));}
/* a jittered dot per cell: x = chance, y = distance to its dot, z = a second random */
vec3 cell2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 c=vec2(h31(vec3(i,2.1)),h31(vec3(i,5.7)))*0.7+0.15;return vec3(h31(vec3(i,1.3)),length(f-c),h31(vec3(i,9.9)));}
/* distance to the nearest edge between random cells: angular cracks and joints */
float vedge(vec3 p){vec3 i=floor(p),f=fract(p);float d1=8.0,d2=8.0;
  for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 g=vec3(float(x),float(y),float(z));vec3 r=g+vec3(h31(i+g),h31(i+g+17.3),h31(i+g+31.7))-f;float d=dot(r,r);
    if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
  return sqrt(d2)-sqrt(d1);}
/* painted grass strokes: one short pointed stroke per cell, leaning with a slowly turning 'combed' direction; returns (light, dark) cover */
vec2 gStrokes(vec2 X,float sc,float ang,float seed){vec2 p=X*sc,i=floor(p);vec2 L=vec2(0.0);float aa=0.7*length(fwidth(p))+0.012;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 c=i+vec2(float(x),float(y));
    float r1=h31(vec3(c,seed)),r2=h31(vec3(c,seed+1.7)),r3=h31(vec3(c,seed+3.1)),r4=h31(vec3(c,seed+5.3)),r5=h31(vec3(c,seed+8.9));
    float a=ang+(r3-0.5)*0.9;vec2 dd=p-c-vec2(r1,r2);vec2 l=vec2(dot(dd,vec2(cos(a),sin(a))),dot(dd,vec2(-sin(a),cos(a))));
    float u=l.x/(0.7+0.5*r4);float w=0.19*max(1.0-u*u,0.0)*(1.0-0.4*u);
    float m=(1.0-smoothstep(w-aa,w+aa,abs(l.y)))*step(abs(u),1.0);
    if(r5<0.58)L.x=max(L.x,m);else L.y=max(L.y,m);}
  return L;}
vec3 ramp4(float t,vec3 a,vec3 b,vec3 c,vec3 d){t=clamp(t,0.0,1.0);return t<0.3333?mix(a,b,t*3.0):t<0.6667?mix(b,c,(t-0.3333)*3.0):mix(c,d,(t-0.6667)*3.0);}
vec3 ramp5(float t,vec3 a,vec3 b,vec3 c,vec3 d,vec3 e){t=clamp(t,0.0,1.0)*4.0;return t<1.0?mix(a,b,t):t<2.0?mix(b,c,t-1.0):t<3.0?mix(c,d,t-2.0):mix(d,e,t-3.0);}
vec3 grassRamp(float t){return ramp5(t,vec3(0.11,0.24,0.07),vec3(0.21,0.39,0.09),vec3(0.34,0.54,0.12),vec3(0.49,0.66,0.16),vec3(0.65,0.75,0.25));}
/* the meadow's own pattern (shared by the ground and the grass painted over the cliff, so the two meet without a seam):
   broad patches, darker clover clumps, and two sizes of painted blade strokes, lighter yellow-green and darker blue-green */
float meadowT(vec2 X,float fd,out float clump){
  float big=fbm2(X*0.035),mid=fbm2(X*0.14+7.0);
  float t=0.55+0.34*(big-0.5)+0.30*(mid-0.5)+0.06*(vn2(X*1.6)-0.5)*fd;
  clump=smoothstep(0.58,0.74,vn2(X*0.75+20.0)+0.10*(vn2(X*3.0)-0.5))*(0.15+0.85*fd);t-=0.10*clump;
  return t;}
vec3 meadowStrokes(vec3 col,vec2 X,float fd){/* fd here: the near fade */
  float ang=0.5+1.6*(fbm2(X*0.04)-0.5);
  vec2 s1=gStrokes(X,2.6,ang,1.0)*fd,s2=gStrokes(X,6.5,ang+0.3,7.0)*fd*fd;
  col=mix(col,col*vec3(1.16,1.10,0.78)+vec3(0.035,0.035,0.0),max(s1.x*0.75,s2.x*0.6));
  col=mix(col,col*vec3(0.70,0.80,0.86),max(s1.y*0.6,s2.y*0.5));
  return col;}
`;
function patch(key,mat,vtxDecl,vtxBody,fragDecl,fragColor,uniforms,fragNormal,hook){
  mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,uniforms||{});
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vWN;'+vtxDecl)
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 _wp=vec4(transformed,1.0);vec3 _wn=objectNormal;\n#ifdef USE_INSTANCING\n_wp=instanceMatrix*_wp;_wn=mat3(instanceMatrix)*_wn;\n#endif\nvWP=(modelMatrix*_wp).xyz;vWN=normalize(mat3(modelMatrix)*_wn);'+vtxBody);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vWN;'+GLSL_NOISE+fragDecl)
      .replace('#include <'+(hook||'map_fragment')+'>','#include <'+(hook||'map_fragment')+'>\n'+fragColor).replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+(fragNormal||''));};
  mat.customProgramCacheKey=()=>key;/* (each look its own program: three.js would otherwise reuse the first one built from this same function) */
  mat.extensions={derivatives:true};return mat;}

