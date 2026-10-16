/* =====================================================================================================
   THE RIVER LOOK, shaders and meshes (src/world/wrlook.js, river look - tools/mockups/river/HANDOFF.md): the mockup's code word for word, inside WRL
   so its names (GLSL_NOISE, patch, makeStone, ...) stay the mockup's. What comes in from the game (the streams, the tiles, LOD) is the callers'.
   - GLSL_NOISE: the procedural noise every river shader uses (h31, vn, fbm, vn2, fbm2, cell2, vedge, the ramps, the grass strokes) - src/01, verbatim.
   - patch: the mockup's onBeforeCompile helper (world position and normal varyings) - src/01, verbatim.
   - PAL, palU, setPal, ROCK_DECL (src/05), weld, makeStone (src/07: box, 3-6 plane cuts, exact bevel by projection), boulderMat (src/06: the stone
     material of every rock) - verbatim but for makeStone's icosphere level (o.det, the LOD).
   - GLSL_GROUND_RIVER: the river part of the ground's colour (the bed, the wet waterline, the earth bank face, mud) - src/03, verbatim; it reads col, P,
     X, fd, slope, vWd, vBf, vOcc as the mockup's ground shader has them.
   Deviations from the mockup are listed in tools/mockups/river/DEVIATIONS.md.
   ===================================================================================================== */
const WRL=(function(){
/* ---- VERBATIM: src/01-glsl-noise-and-patch.js (surface-study.html lines 128-177) ---- */
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

/* ---- VERBATIM: src/03-ground-shader-river.glsl.js (surface-study.html lines 225-248) ---- */
const GLSL_GROUND_RIVER=`
    /* the stream bed: wet earth at the waterline, then sand and pebbles, darker and greener with depth */
    if(vWd>-0.4){vec3 bc=cell2(X*2.6);float pb=step(0.55,bc.x)*(1.0-smoothstep(0.18,0.26,bc.y));
      vec3 bed=mix(vec3(0.62,0.54,0.38),vec3(0.47,0.40,0.28),fbm2(X*0.7));bed=mix(bed,mix(vec3(0.58,0.55,0.50),vec3(0.36,0.33,0.29),bc.z),pb*0.85);
      bed=mix(bed,bed*vec3(0.62,0.80,0.74),smoothstep(0.2,1.2,vWd));bed*=1.0-0.38*vOcc;
      vec3 wet=mix(vec3(0.27,0.22,0.15),vec3(0.24,0.28,0.14),fbm2(X*1.3));
      col=mix(col,wet,smoothstep(-0.4,-0.12,vWd)*0.8);col=mix(col,bed,smoothstep(-0.08,0.04,vWd));}
    /* the earth bank: the path's dusty brown family, sampled in 3D (no stretching on the steep face); wet dark mud near the water,
       drier and lighter up the bank; the grass edge broken by noise; mud patches at the waterline */
    if(vBf>0.01||vWd>-0.6){float hw=-vWd;/* height above the water */
      float n3=fbm(P*vec3(1.1,2.2,1.1)+3.0),n4=vn(P*vec3(3.5,7.0,3.5));
      float te=0.50+0.30*(n3-0.5)+0.10*(n4-0.5)*fd+0.25*smoothstep(0.05,0.7,hw);
      vec3 earthC=ramp4(te,vec3(0.21,0.16,0.11),vec3(0.33,0.25,0.18),vec3(0.46,0.37,0.27),vec3(0.58,0.49,0.37));
      earthC*=1.0-0.18*smoothstep(0.55,0.75,vn(P*vec3(2.0,5.0,2.0)+7.0));/* darker streaks down the face */
      float sF=P.z+0.35*P.x;/* (along the face) */
      float ly=abs(fract(P.y*4.2+0.35*fbm(P*0.8))-0.5);earthC*=1.0-0.20*(1.0-smoothstep(0.05,0.13,ly))*(0.5+0.5*fd);/* soft horizontal layers */
      float bm=vn(P*vec3(4.0,6.0,4.0)+2.0),bmU=vn(P*vec3(4.0,6.0,4.0)+2.0+vec3(0.0,0.06,0.0));earthC*=1.0+0.9*(bmU-bm)*fd;/* little bumps, lit from above */
      vec3 pc3=cell2(vec2(sF*3.2,P.y*3.2));float peb3=step(0.80,pc3.x)*(1.0-smoothstep(0.11,0.16,pc3.y))*fd;
      vec3 pebC=mix(vec3(0.47,0.40,0.31),vec3(0.36,0.30,0.23),pc3.z);earthC=mix(earthC,pebC*(0.92+0.18*(1.0-pc3.y*6.0)),peb3*0.85);/* embedded pebbles */
      float rid=floor(sF*1.4);float rx=fract(sF*1.4)-0.5+0.10*sin(P.y*7.0+rid*3.0);float rw=fwidth(sF*1.4)+0.012;
      float root=(1.0-smoothstep(0.024,0.024+rw,abs(rx)))*step(0.62,h31(vec3(rid,4.0,1.0)))*smoothstep(0.2,0.5,hw)*(0.4+0.6*fd);earthC=mix(earthC,vec3(0.26,0.17,0.10),root*0.85);/* exposed roots near the top */
      earthC=mix(earthC,earthC*vec3(0.78,0.80,0.86),1.0-smoothstep(0.0,0.25,hw));/* wet at the waterline */
      float onFace=smoothstep(0.08+0.30*(n3-0.5),0.3+0.30*(n3-0.5),vBf*(0.4+1.6*slope));/* steep part of the bank shows earth; noise breaks the grass edge */
      float mud=(1.0-smoothstep(0.02,0.22,hw))*smoothstep(-0.15,0.0,hw)*smoothstep(0.42,0.6,fbm2(X*0.9+5.0));/* mud patches at the waterline */
      float e=clamp(max(onFace,mud),0.0,1.0)*smoothstep(-0.25,-0.05,hw+0.0);col=mix(col,earthC,e);}
`;
/* ---- (the mockup's seeded stream: WRB, wrbank.js) ---- */
const mkRng=WRB.mkRng;
/* ---- VERBATIM: src/05-rock-palette.js (surface-study.html lines 254-260) ---- */
const PAL={
  brown:{r:[[.30,.22,.16],[.48,.39,.29],[.66,.56,.43],[.82,.73,.58]],warm:[1.04,1.0,.94],cool:[.95,.96,1.02]},
  grey:{r:[[.14,.15,.18],[.27,.28,.30],[.42,.42,.42],[.60,.60,.57]],warm:[1.04,1.0,.94],cool:[.90,.96,1.07]}};
function palU(name,moss,strata){const p=PAL[name];return{uR0:{value:new THREE.Vector3(...p.r[0])},uR1:{value:new THREE.Vector3(...p.r[1])},uR2:{value:new THREE.Vector3(...p.r[2])},
  uR3:{value:new THREE.Vector3(...p.r[3])},uWarm:{value:new THREE.Vector3(...p.warm)},uCool:{value:new THREE.Vector3(...p.cool)},uMoss:{value:moss},uStrata:{value:strata}};}
function setPal(u,name){const p=PAL[name];u.uR0.value.set(...p.r[0]);u.uR1.value.set(...p.r[1]);u.uR2.value.set(...p.r[2]);u.uR3.value.set(...p.r[3]);u.uWarm.value.set(...p.warm);u.uCool.value.set(...p.cool);}
const ROCK_DECL='uniform vec3 uR0;uniform vec3 uR1;uniform vec3 uR2;uniform vec3 uR3;uniform vec3 uWarm;uniform vec3 uCool;uniform float uMoss;uniform float uStrata;';
/* ---- VERBATIM: surface-study.html lines 390-393 (weld: the icosphere's repeated corners welded) ---- */
function weld(g){const pos=g.attributes.position,src=g.index?g.index.array:null,cnt=src?src.length:pos.count,map=new Map(),np=[],idx=[];
  for(let k=0;k<cnt;k++){const i=src?src[k]:k,x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),key=Math.round(x*1e4)+'_'+Math.round(y*1e4)+'_'+Math.round(z*1e4);
    let j=map.get(key);if(j===undefined){j=np.length/3;map.set(key,j);np.push(x,y,z);}idx.push(j);}
  const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(np,3));o.setIndex(idx);return o;}
/* ---- VERBATIM: src/07-stone-generator.js, makeStone (surface-study.html lines 432-456) - but for the icosphere's level (LOD, DEVIATIONS D9) ---- */
/* every rock in the game from one generator: a box, scaled unevenly; 3-6 plane cuts chop off corners and edges (big flat faces); then a small
   bevel, exact: each vertex of a dense sphere is pulled onto the cut box shrunk by the bevel radius (closest point, Dykstra's projection onto
   the half-spaces), then pushed back out by that radius. Faces stay perfectly flat, only edges and corners round; normals are exact. */
function makeStone(seed,o){o=o||{};const r=mkRng(seed);
  const sx=(o.x0||.75)+(o.xr||.75)*r(),sy=(o.y0||.45)+(o.yr||.6)*r(),sz=(o.z0||.6)+(o.zr||.6)*r();
  const PL=[[1,0,0,sx],[-1,0,0,sx],[0,1,0,sy],[0,-1,0,sy],[0,0,1,sz],[0,0,-1,sz]];
  const k=3+Math.floor(r()*4);
  for(let c=0;c<k;c++){let nx=(r()<.5?-1:1)*(.4+.6*r()),ny=(r()<.75?1:-.35)*(.25+.7*r()),nz=(r()<.5?-1:1)*(.4+.6*r());if(r()<.35){if(r()<.5)nx*=.15;else nz*=.15;}/* (corners, sometimes an edge) */
    const L=Math.hypot(nx,ny,nz);nx/=L;ny/=L;nz/=L;const sup=Math.abs(nx)*sx+Math.abs(ny)*sy+Math.abs(nz)*sz;PL.push([nx,ny,nz,sup*(.52+.3*r())]);}
  const bev=(o.bev||.075)*Math.min(sx,sy,sz)*2;/* 5-10% of the stone's size */
  const SH=PL.map(q=>[q[0],q[1],q[2],q[3]-bev]);
  const g=weld(new THREE.IcosahedronGeometry(1,o.det!=null?o.det:5))/* (parity lab: 5; the game's far levels: 4, 3 - DEVIATIONS D9) */,p=g.attributes.position,n=p.count,nrm=new Float32Array(n*3),edge=new Float32Array(n);const R0=3*Math.max(sx,sy,sz);
  for(let i=0;i<n;i++){const P0=[p.getX(i)*R0,p.getY(i)*R0,p.getZ(i)*R0];let x=P0.slice();const Y=SH.map(()=>[0,0,0]);
    for(let it=0;it<40;it++){for(let j=0;j<SH.length;j++){const q=SH[j],zx=x[0]+Y[j][0],zy=x[1]+Y[j][1],zz=x[2]+Y[j][2],d=zx*q[0]+zy*q[1]+zz*q[2]-q[3];
      const nxv=d>0?[zx-d*q[0],zy-d*q[1],zz-d*q[2]]:[zx,zy,zz];Y[j]=[zx-nxv[0],zy-nxv[1],zz-nxv[2]];x=nxv;}}
    let dx=P0[0]-x[0],dy=P0[1]-x[1],dz=P0[2]-x[2];const dl=Math.hypot(dx,dy,dz)||1;dx/=dl;dy/=dl;dz/=dl;
    p.setXYZ(i,x[0]+dx*bev,x[1]+dy*bev,x[2]+dz*bev);nrm[i*3]=dx;nrm[i*3+1]=dy;nrm[i*3+2]=dz;
    let best=-1;for(const q of PL)best=Math.max(best,dx*q[0]+dy*q[1]+dz*q[2]);edge[i]=Math.min(1,(1-best)*6);}/* (on a bevel: the normal is between faces) */
  let ymin=1e9,ymax=-1e9;for(let i=0;i<n;i++){ymin=Math.min(ymin,p.getY(i));ymax=Math.max(ymax,p.getY(i));}
  const occ=new Float32Array(n),seam=new Float32Array(n),rel=new Float32Array(n);
  const sm=r()<.35?(()=>{const a=r()*6.283,b=(r()-.5)*.8;return[Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a),(r()-.5)*.4*Math.min(sx,sz)];})():null;
  for(let i=0;i<n;i++){const y=p.getY(i);rel[i]=(ymax-y)/(ymax-ymin);occ[i]=.6*Math.pow(rel[i],1.5);seam[i]=sm?(p.getX(i)*sm[0]+y*sm[1]+p.getZ(i)*sm[2]-sm[3]):10;}
  g.setAttribute('normal',new THREE.BufferAttribute(nrm,3));g.setAttribute('aEdge',new THREE.BufferAttribute(edge,1));g.setAttribute('aOcc',new THREE.BufferAttribute(occ,1));
  g.setAttribute('aSeam',new THREE.BufferAttribute(seam,1));g.setAttribute('aRel',new THREE.BufferAttribute(rel,1));
  g.userData={ymin,ymax,rx:Math.max(sx,sz),sx,sy,sz};return g;}
/* ---- VERBATIM: src/06-stone-material.js (surface-study.html lines 349-384): the stone material of every rock ---- */
function boulderMat(u){return patch('bldNew',new THREE.MeshPhongMaterial({color:0xffffff,shininess:6,specular:0x111111}),
 'attribute float aEdge;attribute float aOcc;attribute float aSeam;attribute float aRel;varying float vEdge;varying float vOcc;varying float vSeam;varying float vOy;varying vec3 vTint;varying float vRel;varying float vSc;',
 'vEdge=aEdge;vOcc=aOcc;vSeam=aSeam;vOy=position.y;vRel=aRel;vSc=1.0;\n#ifdef USE_INSTANCING\nvSc=length(instanceMatrix[0].xyz);\n#endif\n\n#ifdef USE_INSTANCING_COLOR\nvTint=instanceColor;\n#else\nvTint=vec3(0.5,0.25,0.5);\n#endif',
 'varying float vEdge;varying float vOcc;varying float vSeam;varying float vOy;varying vec3 vTint;varying float vRel;varying float vSc;uniform vec3 uSunDir;uniform float uDbg;uniform float uMossP;uniform float uIvy;uniform float uMossTop;uniform float uUpK;uniform float uUW;uniform float uWL;'+ROCK_DECL,
 `{
  vec3 P=vWP;vec3 N=normalize(vWN);vec2 X=P.xz;float fd=1.0-smoothstep(25.0,70.0,length(P-cameraPosition));float seed=vTint.z;
  diffuseColor.rgb=vec3(1.0);/* (three.js multiplied in the instance colour: it is data, not a tint) */
  float up=clamp(N.y*0.5+0.5,0.0,1.0);
  float t=0.54+uUpK*(up-0.5)+0.10*(fbm(P*0.45+seed*9.0)-0.5)+0.04*(vn(P*3.0)-0.5)*fd+0.12*vEdge*smoothstep(-0.1,0.6,N.y)-0.30*vOcc;
  float sd=abs(vSeam),on=step(sd,5.0);float sw=0.045,sa=fwidth(sd)*0.8+0.002;float seam=(1.0-smoothstep(sw-sa,sw+sa,sd))*on;float seamSoft=(1.0-smoothstep(0.045,0.2,sd))*on;
  float crev=max(seam,0.45*seamSoft);t-=0.15*crev;
  float ck=vedge(vec3(P.x*0.8,P.y*0.5,P.z*0.8)+seed*9.0);float cka=fwidth(ck)*0.8+0.003;float crackFade=1.0-smoothstep(10.0,28.0,length(P-cameraPosition));
  float crack=(1.0-smoothstep(0.008-cka,0.008+cka,ck))*smoothstep(0.5,0.62,fbm(P*0.6+seed*4.0))*step(0.67,fract(seed*3.71))*crackFade;t-=0.12*crack;
  vec3 ch=cell2(P.xz*2.2+P.y*1.7);float chip=step(0.93,ch.x)*(1.0-smoothstep(0.08,0.16,ch.y))*fd;t+=0.04*chip*(ch.z<0.5?-1.0:1.0)*crackFade;
  float q=t*4.0;t=mix(t,(floor(q)+smoothstep(0.3,0.7,fract(q)))/4.0,0.8);
  vec3 col=ramp4(t,uR0,uR1,uR2,uR3);
  col*=mix(uCool,uWarm,fract(seed*5.31));col*=0.93+0.14*vTint.x;/* per-boulder hue and brightness, a few percent */
  col=mix(col,col*uCool*0.9,clamp((1.0-up)*0.35,0.0,1.0));
  col*=1.0-0.07*smoothstep(0.58,0.74,fbm(P*1.1+7.0));
  float sp=vn(P*12.0);col*=1.0+(0.02*step(0.86,sp)-0.03*step(sp,0.10))*fd;
  col*=mix(1.0,0.70,smoothstep(0.15,0.9,crev));col=mix(col,col*vec3(1.0,0.88,0.78),smoothstep(0.4,1.0,crev)*0.5);
  float clump;vec3 gcol=meadowStrokes(grassRamp(meadowT(X,fd,clump)),X,1.0-smoothstep(14.0,42.0,length(P-cameraPosition)));
  float mo=smoothstep(0.6,0.9,N.y)*smoothstep(0.5-0.25*uMossTop,0.62-0.25*uMossTop,fbm(P*0.7+2.0))*step(fract(seed*7.13),uMossP)*uMoss;/* moss on some tops, not every boulder */
  col=mix(col,gcol*0.85,mo);
  /* hanging ivy (bank stones only): strands of leaf blobs dripping from the top over the sides */
  if(uIvy>0.5&&fract(seed*11.3)<0.3){float cx=(P.x+P.z)*2.2;float sc=floor(cx),sx=fract(cx)-0.5;float has=step(0.45,h31(vec3(sc,seed*13.0,1.0)));float drip=(0.25+0.6*h31(vec3(sc,seed*13.0,2.0)))*has;
    vec2 lp=vec2(sx*3.0+0.35*sin(P.y*9.0+sc),P.y*9.0);vec3 lc=cell2(lp);float lw=fwidth(lc.y)+0.02;float strand=1.0-smoothstep(0.22,0.30,abs(sx+0.08*sin(P.y*5.0+sc)));
    float leaf=(1.0-smoothstep(0.45-lw,0.45+lw,lc.y))*strand*step(vRel,drip)+step(vRel,0.12)*(1.0-smoothstep(0.45-lw,0.45+lw,lc.y))*has;
    vec3 iv=mix(vec3(0.13,0.28,0.07),vec3(0.36,0.55,0.14),lc.z)*(0.85+0.3*up);col=mix(col,iv,leaf*smoothstep(0.85,0.3,N.y+0.0*vRel));}
  /* the base: fades to a darker, greener earth tone where it goes into the ground */
  float hgt=P.y-(vTint.y*60.0-20.0);vec3 earth=mix(mix(vec3(0.16,0.13,0.08),vec3(0.14,0.20,0.07),fbm2(X*0.9)),gcol*0.55,0.35);
  float bnd=clamp(vSc*0.45,0.04,1.0);/* (a pebble's base band is a few cm, a boulder's 30) */float gm0=1.0-smoothstep(-0.05*bnd,0.30*bnd,hgt);col=mix(col,earth,gm0*0.9);col*=1.0-0.25*(1.0-smoothstep(0.0,0.6*bnd,hgt));
  float sunF=clamp(dot(N,normalize(uSunDir)),0.0,1.0);col*=1.0+0.32*(1.0-sunF)*(1.0-gm0);
  if(uUW>0.5){float uw=uWL-P.y;col=mix(col,mix(vec3(0.16,0.55,0.55),vec3(0.05,0.36,0.42),smoothstep(0.2,0.9,uw)),smoothstep(0.0,0.45,uw)*0.92);}/* under water: fades into the water's colour with depth */
  diffuseColor.rgb=col;
 }`,u,null,'color_fragment');}
return{GLSL_NOISE,patch,GLSL_GROUND_RIVER,mkRng,PAL,palU,setPal,ROCK_DECL,weld,makeStone,boulderMat};})();
