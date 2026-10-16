/* =====================================================================================================
   THE RIVER LOOK, shaders and meshes (src/world/wrlook.js, river look - tools/mockups/river/HANDOFF.md): the mockup's code word for word, inside WRL
   so its names (GLSL_NOISE, patch, makeStone, ...) stay the mockup's. What comes in from the game (the streams, the tiles, LOD) is the callers'.
   - GLSL_NOISE: the procedural noise every river shader uses (h31, vn, fbm, vn2, fbm2, cell2, vedge, the ramps, the grass strokes) - src/01, verbatim.
   - patch: the mockup's onBeforeCompile helper (world position and normal varyings) - src/01, verbatim.
   - PAL, palU, setPal, ROCK_DECL (src/05), weld, makeStone (src/07: box, 3-6 plane cuts, exact bevel by projection), boulderMat (src/06: the stone
     material of every rock) - verbatim but for makeStone's icosphere level (o.det, the LOD).
   - makePlaceBoulder (placeBoulder), bankUniforms, bankShapes, bankKit (putStone), riverStones (src/08: bank stones, rocks in the water, pebbles), occAt
     (the ground's contact shade) - verbatim, the river's data passed in (wrstone.js feeds them the game's streams).
   - ivyMaterial, ivySpots, ivyKit (src/09), grassMaterial, tuftGeometry, tuftKit (src/10; its bankTufts and lipReeds are WRB's, wrbank.js: the world
     workers run them) - verbatim, their data passed in.
   - makeNTEX, waterUniforms, waterMaterial, waterRibbon, makeFloat, fleckMaterial, updFloat (src/11: the water) - verbatim, their data passed in
     (wwater.js, wriver.js feed them the game's streams and its depth pass).
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
/* ---- (the mockup's S, for occAt: WRB, wrbank.js) ---- */
const S=WRB.S;
/* ---- VERBATIM: surface-study.html lines 460-467, placeBoulder (the pebbles at the rocks in the water and by the waterline are field boulders); what
   it reads (the shapes, their lists, the ground, the path and the river for its companions) passed in ---- */
function makePlaceBoulder(E){const SHAPES=E.SHAPES,BINST=E.BINST,H=E.H,pathDist=E.pathDist,pathHalfAt=E.pathHalfAt,rivMask=E.rivMask;
function placeBoulder(x,z,seed,fixedScale,shapeIdx){const r=mkRng(seed);const s0=Math.floor(r()*SHAPES.length),si=shapeIdx!=null?shapeIdx:s0,G=SHAPES[si],ud=G.userData;
  const u=r();const sc=fixedScale||(.22+1.9*Math.pow(u,2.4));const h=(ud.ymax-ud.ymin)*sc;
  const f=.45-.20*Math.min(1,Math.max(0,(sc-.3)/1.6));/* sink fraction: 25% for the big ones, 45% for pebbles */
  const e=.4,nx=-(H(x+e,z)-H(x-e,z))/(2*e),nz=-(H(x,z+e)-H(x,z-e))/(2*e);const nrm=new THREE.Vector3(nx,1,nz).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),nrm).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r()*6.283));
  const y=H(x,z)-f*h-ud.ymin*sc;/* the lowest point sits f*h under the ground */const M=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(sc,sc,sc));
  BINST[si].push({M,tint:new THREE.Color(r(),(H(x,z)+20)/60,r()),x,z,sc,rw:ud.rx*sc});
  if(!fixedScale&&sc>.6&&r()<.4){const k=1+Math.floor(r()*3);for(let j=0;j<k;j++){const a=r()*6.283,d=sc*ud.rx*(1.3+1.0*r());const cx=x+Math.cos(a)*d,cz=z+Math.sin(a)*d;if(pathDist(cx,cz)<pathHalfAt(cx,cz)*1.6+.4||rivMask(cx,cz,2.5))continue;placeBoulder(cx,cz,seed*7+j*13+1,sc*(.22+.3*r()));}}}
return placeBoulder;}
/* ---- VERBATIM: src/08-river-banks.js (surface-study.html lines 542-586), the stream's banks: the bank palette, its uniforms, the bank stones' shapes
   (with the icosphere's level for the LOD), putStone, and the placing - clusters along both banks, the rocks in the water, the pebbles - with the
   river's data passed in (DEVIATIONS D12-D13) ---- */
PAL.bank={r:[[.34,.21,.14],[.56,.39,.27],[.75,.59,.43],[.90,.79,.62]],warm:[1.05,1.0,.92],cool:[.94,.95,1.03]};
function bankUniforms(SUN){const bankU=palU('bank',1.0,0);bankU.uSunDir={value:SUN.clone()};bankU.uDbg={value:0};bankU.uMossP={value:.45};bankU.uIvy={value:0};bankU.uMossTop={value:.3};bankU.uUpK={value:.16};bankU.uUW={value:1};bankU.uWL={value:0};return bankU;}
const makeStone0=makeStone;
function bankShapes(det){const makeStone=(s,o)=>makeStone0(s,det!=null?Object.assign(o,{det}):o);/* (the LOD: DEVIATIONS D9) */
const BSH=[],BKIND=[];/* 0-3 flat slabs, 4-8 blocks, 9-11 small stones */
for(let i=0;i<4;i++){BSH.push(makeStone(3000+i*41,{x0:1.0,xr:.6,y0:.28,yr:.18,z0:.75,zr:.4}));BKIND.push(0);}
for(let i=0;i<5;i++){BSH.push(makeStone(3200+i*43,{x0:.7,xr:.5,y0:.5,yr:.4,z0:.6,zr:.4}));BKIND.push(1);}
for(let i=0;i<3;i++){BSH.push(makeStone(3400+i*47,{x0:.55,xr:.4,y0:.4,yr:.35,z0:.5,zr:.35}));BKIND.push(2);}
return{BSH,BKIND};}
function bankKit(E){const BSH=E.BSH,BKIND=E.BKIND,BKI=E.BKI,H=E.H;
function seedWith(r,want){for(let k=0;k<40;k++){const s=r();if(want(s))return s;}return r();}
function putStone(x,z,y,sc,yaw,tilt,r,mossy,ivy,groundY,kind){const pool=BSH.map((g,i)=>i).filter(i=>kind==null||BKIND[i]===kind),si=pool[Math.floor(r()*pool.length)],ud=BSH[si].userData;
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt[0],yaw,tilt[1]));
  const h0=(ud.ymax-ud.ymin)*sc,bedY=H(x,z),ys=Math.min(3.5,Math.max(1,(y-(bedY-.28*h0))/h0));/* (reach down into the bed: never end at the water) */
  const yy=y-ud.ymax*sc*ys;/* (y is where its top sits) */groundY=bedY;
  const M=new THREE.Matrix4().compose(new THREE.Vector3(x,yy,z),q,new THREE.Vector3(sc,sc*ys,sc));
  const sd=seedWith(r,s=>(fract7(s)<.75)===mossy&&(fract11(s)<.3)===ivy);
  BKI[si].push({M,tint:new THREE.Color(kind===0?.15*r():r(),(groundY+20)/60,sd)});return{x,z,top:y,rw:ud.rx*sc,h:h0*ys,si,M,yaw,bed:bedY};}
const fract7=s=>(s*7.13)%1,fract11=s=>(s*11.3)%1;
return{seedWith,putStone,fract7,fract11};}
function riverStones(E){const r=E.r,RIV=E.RIV,rivHalf=E.rivHalf,rivBank=E.rivBank,WLat=E.WLat,ROCKS=E.ROCKS,NPEB=E.NPEB,sd=E.sd,solids=E.solids,
  placeBoulder=E.placeBoulder,putStone=E.putStone,bankSpots=E.bankSpots,bankTops=E.bankTops,waterRocks=E.waterRocks;
 /* along each bank: a cluster of 2-6 stones (now and then one big flat slab, blocks, small stones), then a gap where the grass meets the water */
 const at=(u)=>{const i=Math.max(0,Math.min(RIV.length-2,Math.floor(u))),f=u-i,a=RIV[i],b=RIV[i+1];return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,b[0]-a[0],b[1]-a[1]];};
 for(const side of[-1,1]){let u=r()*2;while(u<RIV.length-3){const nCl=2+Math.floor(r()*5);let v=u;
   for(let c=0;c<nCl&&v<RIV.length-3;c++){const [px,pz,tx,tz]=at(v),tl=Math.hypot(tx,tz),nx=-tz/tl*side,nz=tx/tl*side,w=rivHalf(pz,v),WL=WLat(v);
     const roll=r(),kind=roll<.22?0:roll<.68?1:2;
     const size=kind===0?2.2+1.0*r():kind===1?1.0+.7*r():.45+.4*r();const sc=size/2/1.15;
     const rel=(kind===0?-.25:-.05)+.25*(r()-.4)+(kind===2?(r()-.5)*.6:0);let off=w+rel;for(let it=0;it<4;it++){const bk=rivBank(px+nx*off,pz+nz*off);off+=(bk.w+rel)-bk.dd;}/* (on the real, wobbly shore) */const x=px+nx*off,z=pz+nz*off;
     const topAbove=kind===0?.18+.22*r():kind===1?.4+.5*r():.12+.3*r();
     const flat=kind===0||r()<.45,tilt=flat?[(r()-.5)*.08,(r()-.5)*.08]:[(r()-.5)*.6,(r()-.5)*.6];
     const yaw=Math.atan2(nx,nz)+(r()-.5)*.6;/* (roughly along the bank) */
     const st=putStone(x,z,WL+topAbove,sc,yaw,tilt,r,r()<.7,false,WL-.05,kind);st.kind=kind;bankSpots.push(st);bankTops.push([st,nx,nz]);
     v+=(size*.55+.15*r())/1.0;}
   u=v+1.5+3.5*r();}}
 /* rocks in the water: mossy tops */
 for(const [t,o,sz] of ROCKS){const a=RIV[t],b=RIV[t+1],tx=b[0]-a[0],tz=b[1]-a[1],tl=Math.hypot(tx,tz);
   const w=rivHalf(a[1],t),WL=WLat(t),x=a[0]-tz/tl*o*w,z=a[1]+tx/tl*o*w;const sc=sz/2/1.1;
   const st=putStone(x,z,WL+sz*(.3+.2*r()),sc,r()*6.283,[(r()-.5)*.2,(r()-.5)*.2],r,true,false,WL-.05);bankSpots.push(st);waterRocks.push(st);
   solids.push([x,z,st.rw*.85,1]);for(let j=0;j<5;j++){const a=r()*6.283,d=st.rw*(1.0+.7*r());placeBoulder(x+Math.cos(a)*d,z+Math.sin(a)*d,sd+7000+t*13+j,.08+.1*r());}}/* (a darker contact patch and pebbles on the bed) */
 /* pebbles: small clusters at the waterline in the gaps */
 for(let c=0;c<NPEB;c++){const i=Math.floor(r()*(RIV.length-2)),side=r()<.5?-1:1,a=RIV[i],b=RIV[i+1],tx=b[0]-a[0],tz=b[1]-a[1],tl=Math.hypot(tx,tz),nx=-tz/tl*side,nz=tx/tl*side;
   let d=rivHalf(a[1],i),x=a[0]+nx*d,z=a[1]+nz*d;for(let it=0;it<3;it++){const bk=rivBank(x,z);d+=(bk.w+.05)-bk.dd;x=a[0]+nx*d;z=a[1]+nz*d;}
   if(bankSpots.some(q=>Math.hypot(q.x-x,q.z-z)<q.rw+.4)||rivBank(x,z).steep>.35)continue;const m=3+Math.floor(r()*6);
   for(let j=0;j<m;j++){const u=(r()-.5)*1.4,v=(r()-.5)*.6;placeBoulder(x-nz*u+nx*v,z+nx*u+nz*v,sd+9000+c*31+j,.07+.12*r());}}
}
/* ---- VERBATIM: surface-study.html line 627, the ground's contact shade (aOcc) from the solids (x, z, radius, kind) round it ---- */
function occAt(x,z,solids){let o=0;for(const q of solids){const dd=Math.hypot(x-q[0],z-q[1])-q[2];const R=q[3]?.9+q[2]*.5:2.6;if(dd<R){const v=(1-S(-.3,R,dd))*(q[3]?.9:.85);if(v>o)o=v;}}return o;}
/* ---- VERBATIM: src/09-ivy.js (surface-study.html lines 587-616): the ivy's material, its leaves ray-cast onto the bank stones (the cast passed in: three.js's
   own in the lab and the game alike, wrstone.js), each leaf's matrix - the stones' water level per stone (DEVIATIONS D18) ---- */
function ivyMaterial(SUN){return new THREE.ShaderMaterial({side:THREE.DoubleSide,fog:true,uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uSun:{value:SUN.clone()}}]),
  vertexShader:`varying vec2 vUv;varying vec3 vC;varying float vL;uniform vec3 uSun;
    #include <fog_pars_vertex>
    void main(){vUv=uv;vC=instanceColor;vec3 n=normalize(mat3(modelMatrix*instanceMatrix)*vec3(0.0,0.0,1.0));vL=0.55+0.45*abs(dot(n,normalize(uSun)));
      vec4 mvPosition=viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader:`varying vec2 vUv;varying vec3 vC;varying float vL;
    #include <fog_pars_fragment>
    void main(){vec2 q=vUv-vec2(0.5,0.55);float w=0.42*(1.0-pow(abs(q.y*1.9),1.6))*(1.0-0.35*(q.y));if(abs(q.x)>w||abs(q.y)>0.5)discard;/* a pointed leaf */
      float vein=1.0-smoothstep(0.0,0.035,abs(q.x));vec3 col=mix(vec3(0.16,0.33,0.07),vec3(0.42,0.62,0.16),vC.y)*(0.9+0.25*vUv.y);col=mix(col,col*1.25,vein*0.35);
      gl_FragColor=vec4(col*vL,1.0);
      #include <fog_fragment>
    }`});}
function ivySpots(E){const BSH=E.BSH,bankTops=E.bankTops,WLof=E.WLof,leafSpots=E.leafSpots,cast=E.cast;const rc=new THREE.Raycaster(),tmp=new THREE.Mesh(BSH[0],new THREE.MeshBasicMaterial()),r=E.r;
 for(const [st,nx,nz] of bankTops){const WL=WLof(st);if(st.kind!==1||st.top<WL+.55||r()>.35)continue;
   tmp.geometry=BSH[st.si];tmp.matrixAutoUpdate=false;tmp.matrix.copy(st.M);tmp.matrixWorld.copy(st.M);tmp.geometry.computeBoundingSphere();
   const nS=2+Math.floor(r()*3);
   for(let k=0;k<nS;k++){const j=(r()-.5)*st.rw*1.3,len=.35+.6*r();
     for(let y=st.top-.02;y>st.top-len&&y>WL+.05;y-=.055+.02*r()){const sw=.05*Math.sin(y*9+k);
       const o=new THREE.Vector3(st.x-nx*st.rw*2.5-nz*(j+sw),y,st.z-nz*st.rw*2.5+nx*(j+sw));rc.set(o,new THREE.Vector3(nx,0,nz));
       const h=cast(rc,tmp);if(!h)continue;const fn=h.face.normal.clone().transformDirection(st.M);
       leafSpots.push([h.point.clone().addScaledVector(fn,.025),fn,r()]);}}}}
function ivyKit(){const M=new THREE.Matrix4(),C=new THREE.Color(),up=new THREE.Vector3(0,1,0);
 return(spot)=>{const [pt,fn,rr]=spot;const tgt=pt.clone().add(fn);const L=new THREE.Object3D();L.position.copy(pt);L.lookAt(tgt);L.rotateZ((rr-.5)*1.4);L.rotateX(.35);
   const sz=.10+.06*rr;L.scale.set(sz,sz*1.25,sz);L.updateMatrix();C.setRGB(0,rr,0);return[L.matrix,C];};}
/* ---- VERBATIM: src/10-grass-tufts.js (surface-study.html lines 632-686): the grass material and the crossed cards (the tufts behind the bank stones, the
   lip grass and the reeds are in WRB, wrbank.js), each tuft's matrix and colour - the river's data passed in (DEVIATIONS D18) ---- */
function grassMaterial(SUN){return new THREE.ShaderMaterial({side:THREE.DoubleSide,fog:true,
  uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uSun:{value:SUN.clone()}}]),
  vertexShader:`varying vec2 vUv;varying vec3 vC;varying float vSh;uniform vec3 uSun;
    #include <fog_pars_vertex>
    void main(){vUv=uv;vC=instanceColor;vec4 wp=modelMatrix*instanceMatrix*vec4(position,1.0);
      vec3 nrm=normalize(mat3(modelMatrix*instanceMatrix)*vec3(0.0,0.0,1.0));vSh=0.78+0.22*abs(dot(nrm,uSun));
      vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader:`varying vec2 vUv;varying vec3 vC;varying float vSh;
    #include <fog_pars_fragment>
    float hs(float x){return fract(sin(x)*4375.7);}
    void main(){float ty=-1.0;
      for(int i=0;i<11;i++){float fi=float(i);float r1=hs(vC.z*91.7+fi*13.1),r2=hs(vC.z*17.3+fi*7.7),r3=hs(vC.z*51.9+fi*3.3);
        float cx=(fi+0.5)/11.0+(r1-0.5)*0.10;float hg=0.55+0.45*r2;if(vUv.y>hg)continue;
        float y=vUv.y/hg;float x=cx+(r3-0.5)*0.4*y*y;float w=0.052*(1.0-y*0.8)*(0.8+0.5*r1);
        if(abs(vUv.x-x)<w)ty=max(ty,y);}
      if(ty<0.0)discard;
      vec3 col=mix(vec3(0.24,0.44,0.09),vec3(0.62,0.80,0.22),ty)*vC.y*vSh;
      col=mix(col,col*vec3(1.08,1.0,0.78),vC.x*0.4);
      gl_FragColor=vec4(col,1.0);
      #include <fog_fragment>
    }`});}
function tuftGeometry(){return (()=>{const a=new THREE.PlaneGeometry(1,1);a.translate(0,.5,0);const b=a.clone();b.rotateY(Math.PI/2);
  const g=new THREE.BufferGeometry(),pa=a.attributes.position.array,pb=b.attributes.position.array,ua=a.attributes.uv.array;
  g.setAttribute('position',new THREE.Float32BufferAttribute([...pa,...pb],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([...ua,...ua],2));
  const ia=a.index.array;g.setIndex([...ia,...ia.map(i=>i+4)]);return g;})();}
function tuftKit(){const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Pv=new THREE.Vector3(),Sv=new THREE.Vector3(),C=new THREE.Color();
 return(spot,rnd,H)=>{const [x,z,sc,yl,tilt,tx,tz,hs]=spot;const h=yl!==undefined?yl:H(x,z)-.03;Pv.set(x,h,z);Q.setFromAxisAngle(new THREE.Vector3(0,1,0),rnd()*6.283);
   if(tilt){const ax=new THREE.Vector3(tz,0,-tx).normalize();Q.premultiply(new THREE.Quaternion().setFromAxisAngle(ax,tilt));}/* (leaning out over the water) */
   const w=.40+.22*rnd();Sv.set(w*sc*(hs?.6:1),(.16+.14*rnd())*sc*(hs||1),w*sc*(hs?.6:1));M.compose(Pv,Q,Sv);C.setRGB(hs?.45+.4*rnd():yl!==undefined?.1:rnd()*.6,hs?.62+.2*rnd():(yl!==undefined?.7:.85)+.3*rnd(),rnd());return[M,C];};}
/* ---- (the mockup's JS noise for NTEX: WRB, wrbank.js) ---- */
const h2=WRB.h2;
/* ---- VERBATIM: src/11-water.js (surface-study.html lines 689-792): the ripple and foam texture, the water's uniforms and shader, the ribbon along the
   stream (its points, columns, half width and water level where along passed in), the drifting leaves and foam flecks (how many and the water level
   passed in) - DEVIATIONS D22; the depth pre-pass is the game's own (wwater.js) ---- */
function makeNTEX(){return (()=>{const N=256,d=new Uint8Array(N*N*4),hgt=new Float32Array(N*N),hz=(i,j)=>hgt[((j+N)%N)*N+((i+N)%N)];
  const W=[[3,1,.0,1],[1,4,1.3,.8],[5,-2,2.1,.5],[-4,3,.7,.45],[7,5,4.1,.25],[-9,6,1.1,.2],[11,-8,2.9,.12],[2,13,.4,.1]];
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){let h=0;const u=i/N*6.2832,v=j/N*6.2832;for(const[a,b,ph,am]of W)h+=am*Math.sin(a*u+b*v+ph+.6*Math.sin(b*u-a*v+ph*2));hgt[j*N+i]=h;}
  const fz=new Float32Array(N*N);{const G=16,g=[];for(let k=0;k<G*G;k++)g.push(Math.random());const r=mkRng(91);for(let k=0;k<G*G;k++)g[k]=r();
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){let s=0,a=.5,f=1;for(let o=0;o<4;o++){const x=i/N*G*f,y=j/N*G*f,xi=Math.floor(x),yi=Math.floor(y),u=x-xi,v=y-yi,Gf=G*f,
      at=(p,q)=>{const P=((p%Gf)+Gf)%Gf,Q=((q%Gf)+Gf)%Gf;return h2(P*31+o*7,Q*17+o*3);},uu=u*u*(3-2*u),vv=v*v*(3-2*v);
      s+=a*((at(xi,yi)*(1-uu)+at(xi+1,yi)*uu)*(1-vv)+(at(xi,yi+1)*(1-uu)+at(xi+1,yi+1)*uu)*vv);a*=.5;f*=2;}fz[j*N+i]=s/.9375;}}
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const dx=(hz(i+1,j)-hz(i-1,j))*.5,dy=(hz(i,j+1)-hz(i,j-1))*.5,k=(j*N+i)*4;
    d[k]=Math.max(0,Math.min(255,128+dx*95));d[k+1]=Math.max(0,Math.min(255,128+dy*95));d[k+2]=Math.round(fz[j*N+i]*255);d[k+3]=Math.max(0,Math.min(255,128+hgt[j*N+i]*50));}
  const t=new THREE.DataTexture(d,N,N,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;})();}
function waterUniforms(SUN,NTEX,depthTexture){return {uRk:{value:Array.from({length:8},()=>new THREE.Vector4(0,0,0,0))},tDepth:{value:depthTexture},tN:{value:NTEX},uRes:{value:new THREE.Vector2(1,1)},uNear:{value:.1},uFar:{value:500},uTime:{value:0},
  uSun:{value:SUN.clone()},uSky:{value:new THREE.Color(0xbfe3f2)},uFogC:{value:new THREE.Color(0xbcdaef)},uFog:{value:new THREE.Vector2(80,200)}};}
function waterMaterial(WU){return new THREE.ShaderMaterial({uniforms:WU,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:`varying vec3 vWP;varying vec2 vFlow;varying float vSpd;attribute vec2 aFlow;attribute float aSpd;void main(){vFlow=aFlow;vSpd=aSpd;vec4 w=modelMatrix*vec4(position,1.0);vWP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`#include <packing>
  uniform sampler2D tDepth;uniform sampler2D tN;uniform vec4 uRk[8];varying float vSpd;uniform vec2 uRes;uniform float uNear;uniform float uFar;uniform float uTime;uniform vec3 uSun;uniform vec3 uSky;uniform vec3 uFogC;uniform vec2 uFog;
  varying vec3 vWP;varying vec2 vFlow;
  void main(){
    vec2 suv=gl_FragCoord.xy/uRes;float sz=-perspectiveDepthToViewZ(texture2D(tDepth,suv).x,uNear,uFar),mz=-perspectiveDepthToViewZ(gl_FragCoord.z,uNear,uFar);
    vec3 V=normalize(cameraPosition-vWP);float thick=max(sz-mz,0.0),dv=thick*max(abs(V.y),0.22);/* about the vertical depth of water here */
    float t=uTime;vec2 X=vWP.xz;vec2 fl=normalize(vFlow+1e-4);
    /* the flow: textures pushed downstream along the river (two phases, cross-faded, so they never stretch); speed from the river's width */
    float sp=vSpd;vec2 pr=vec2(-fl.y,fl.x);float ph0=fract(t*0.12),ph1=fract(t*0.12+0.5),kf=abs(2.0*ph0-1.0);
    vec4 a=mix(texture2D(tN,X*0.085-fl*sp*ph0*0.55),texture2D(tN,X*0.085-fl*sp*ph1*0.55+vec2(0.37,0.11)),kf);
    vec4 b=mix(texture2D(tN,X*0.21-fl*sp*ph0*1.1+pr*0.05*ph0),texture2D(tN,X*0.21-fl*sp*ph1*1.1+vec2(0.53,0.29)),kf);
    vec2 sl=(a.xy-0.5)*0.9+(b.xy-0.5)*0.6;vec3 N=normalize(vec3(-sl.x,1.0,-sl.y));
    /* colour by depth, see-through where shallow */
    float dvc=mix(dv,thick,0.55);/* (colour from the path through the water: a stone's side seen through water reads deep, not milky) */float dd=smoothstep(0.0,1.3,dvc);vec3 shallow=vec3(0.58,0.94,0.84),mid=vec3(0.22,0.80,0.78),deep=vec3(0.07,0.56,0.62);
    vec3 col=dd<0.5?mix(shallow,mid,dd*2.0):mix(mid,deep,dd*2.0-1.0);
    float alpha=mix(0.22,0.88,smoothstep(0.0,1.2,dvc));
    /* light: soft sun and sky; fresnel to the sky at grazing angles */
    float ndl=clamp(dot(N,normalize(uSun)),0.0,1.0);col*=0.82+0.30*ndl;
    float fr=pow(1.0-clamp(dot(N,V),0.0,1.0),4.0);col=mix(col,mix(uSky,vec3(0.75,0.95,0.92),0.4),fr*0.5);alpha=max(alpha,fr*0.8);
    /* painted streaks: thin light lines riding the ripples */
    float st=abs(b.w-0.5);float sa=fwidth(b.w)+0.004;float streak=(1.0-smoothstep(0.012,0.012+sa,st))*smoothstep(0.35,0.7,a.z);col=mix(col,vec3(0.86,0.98,0.96),streak*0.45);
    /* sun glints: little hard sparkles */
    vec3 Rf=reflect(-normalize(uSun),N);float gl=pow(clamp(dot(Rf,V),0.0,1.0),180.0);col+=vec3(1.0,0.98,0.9)*smoothstep(0.35,0.55,gl)*0.9;
    /* foam: clumpy where the water is thin (shore, stones, rocks), and a broken second line that breathes */
    float fn=mix(texture2D(tN,X*0.55-fl*sp*ph0*0.9).z,texture2D(tN,X*0.55-fl*sp*ph1*0.9+vec2(0.21,0.4)).z,kf),fn2=mix(texture2D(tN,X*1.3-fl*sp*ph0*1.6).z,texture2D(tN,X*1.3-fl*sp*ph1*1.6+vec2(0.6,0.15)).z,kf);
    float fe=1.0-dv/0.09;float fa=fwidth(fe)+0.03;float th=0.25+0.5*smoothstep(0.35,0.75,fn)+0.2*(fn2-0.5);float foam=smoothstep(th-fa,th+fa,fe)*step(0.36,fn2)*smoothstep(0.38,0.46,texture2D(tN,X*0.22+fl*t*0.01).z);/* clumps along the shore, with gaps *//* thin, with gaps */
    float bub=step(0.66,fn2)*(1.0-smoothstep(0.0,0.22,dv))*step(0.58,texture2D(tN,X*2.6+t*0.04).z);foam=max(foam,bub*0.8);/* loose bubbles drifting off the clumps */
    float lineD=0.42+0.07*sin(t*1.4+fn*5.0);float ln=abs(dv-lineD);float la=fwidth(dv)+0.006;float line=(1.0-smoothstep(0.015,0.015+la,ln))*step(0.55,fn2)*step(0.4,fn);
    float edge=1.0-smoothstep(0.0,0.14,dv);col=mix(col,shallow*1.05,edge*0.3);alpha=max(alpha,edge*0.45);/* thin water at the edges reads milky, not see-through to the stones' dark feet */
    /* rocks in the stream: foam piles up on the upstream side, thins on the sides, trails downstream in short streaks */
    float upK=1.0,trail=0.0;
    for(int i=0;i<8;i++){vec4 rk=uRk[i];if(rk.z<=0.0)continue;vec2 d=X-rk.xy;float dl=length(d);if(dl>rk.z*5.0)continue;
      vec2 fr=vec2(dot(d,fl),dot(d,pr))/rk.z;float near=1.0-smoothstep(1.0,1.9,dl/rk.z);
      upK=min(upK,mix(1.0,mix(0.12,1.0,smoothstep(0.35,-0.55,fr.x)),near));
      float lane=step(0.0,fr.x)*(1.0-smoothstep(0.6,1.0,abs(fr.y)))*(1.0-smoothstep(1.0,4.2,fr.x));
      float sv=mix(texture2D(tN,vec2(fr.y*0.42,fr.x*0.06+ph0*0.9*sp)+rk.xy*0.07).z,texture2D(tN,vec2(fr.y*0.42,fr.x*0.06+ph1*0.9*sp)+rk.xy*0.07+0.5).z,kf);
      trail=max(trail,lane*smoothstep(0.50,0.58,sv)*(1.0-fr.x/4.2));}
    foam*=upK;
    float f=max(max(foam,line*0.85),trail*0.9);col=mix(col,vec3(0.97,1.0,0.99),f);alpha=mix(alpha,0.97,f);
    /* posterise a touch: painted, not photographic */
    col=mix(col,floor(col*7.0+0.5)/7.0,0.25);
    float fogF=smoothstep(uFog.x,uFog.y,length(vWP-cameraPosition));col=mix(col,uFogC,fogF);
    gl_FragColor=vec4(col,alpha);}`});}
function waterRibbon(E){const RIV=E.RIV,rivHalf=E.rivHalf,WLat=E.WLat;return(()=>{const pos=[],flow=[],spd=[],idx=[],C=E.C;const pts=RIV.slice();const a0=pts[pts.length-1],a1=pts[pts.length-2];if(E.ext)pts.push([a0[0]+(a0[0]-a1[0])*3,a0[1]+(a0[1]-a1[1])*3]);
  for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],tx=b[0]-a[0],tz=b[1]-a[1],tl=Math.hypot(tx,tz),nx=-tz/tl,nz=tx/tl;const w=rivHalf(pts[i][1],i)+2.6;
    const sp=Math.max(.55,Math.min(1.7,2.8/rivHalf(pts[i][1],i)));for(let c=0;c<C;c++){const u=(c/(C-1)*2-1)*w;pos.push(pts[i][0]+nx*u,WLat(i),pts[i][1]+nz*u);flow.push(tx/tl,tz/tl);spd.push(sp);}}/* (faster where narrow, slow in the pool) */
  for(let i=0;i<pts.length-1;i++)for(let c=0;c<C-1;c++){const a=i*C+c,b=a+C;idx.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aFlow',new THREE.Float32BufferAttribute(flow,2));g.setAttribute('aSpd',new THREE.Float32BufferAttribute(spd,1));g.setIndex(idx);return g;})();}
function rivAtOf(RIV){return function rivAt(u){const i=Math.max(0,Math.min(RIV.length-2,Math.floor(u))),f=u-i,a=RIV[i],b=RIV[i+1],tx=b[0]-a[0],tz=b[1]-a[1],tl=Math.hypot(tx,tz);
  return[a[0]+tx*f,a[1]+tz*f,-tz/tl,tx/tl,tx/tl,tz/tl];}}
function makeFloat(E){const RIV=E.RIV,NF=E.NF,NL=E.NL;const FLOAT=[];{const r=E.r;for(let i=0;i<NF;i++)FLOAT.push({u0:r()*(RIV.length-4),o:(r()-.5)*1.3,v:.35+.3*r(),leaf:i<NL,rot:r()*6.28,spin:(r()-.5)*.6,sz:i<NL?.09+.05*r():.05+.06*r(),c:r()});}return FLOAT;}
function fleckMaterial(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:true,uniforms:THREE.UniformsLib.fog,
  vertexShader:`varying vec2 vUv;
    #include <fog_pars_vertex>
    void main(){vUv=uv;vec4 mvPosition=viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
    }`,
  fragmentShader:`varying vec2 vUv;
    #include <fog_pars_fragment>
    void main(){vec2 q=vUv-0.5;float d=length(q*vec2(1.0,1.6))+0.08*sin(atan(q.y,q.x)*5.0);if(d>0.42)discard;gl_FragColor=vec4(0.97,1.0,0.99,0.85);
    #include <fog_fragment>
    }`});}
function updFloat(t,E){const FLOAT=E.FLOAT,RIV=E.RIV,rivHalf=E.rivHalf,waterRocks=E.waterRocks,WLat=E.WLat,leaves=E.leaves,flecks=E.flecks,rivAt=rivAtOf(RIV);const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0),P=new THREE.Vector3(),Sv=new THREE.Vector3();let li=0,fi=0;const L=RIV.length-4;
  for(const f of FLOAT){const w0=rivHalf(RIV[Math.floor(f.u0)][1],Math.floor(f.u0)),sp=Math.max(.55,Math.min(1.7,2.8/w0));let u=(f.u0+f.v*sp*t)%L;const A=rivAt(u),w=rivHalf(A[1],u);
    let x=A[0]+A[2]*f.o*w,z=A[1]+A[3]*f.o*w;/* (keep off rocks: slip round them) */for(const k of waterRocks){const dx=x-k.x,dz=z-k.z,dl=Math.hypot(dx,dz);if(dl<k.rw*1.25){x=k.x+dx/dl*k.rw*1.25;z=k.z+dz/dl*k.rw*1.25;}}
    P.set(x,WLat(u)+.012,z);Q.setFromAxisAngle(Y,f.rot+f.spin*t);Sv.set(f.sz,1,f.sz*(f.leaf?1.3:1));M.compose(P,Q,Sv);
    if(f.leaf)leaves.setMatrixAt(li++,M);else flecks.setMatrixAt(fi++,M);}
  leaves.instanceMatrix.needsUpdate=true;flecks.instanceMatrix.needsUpdate=true;}
return{GLSL_NOISE,patch,GLSL_GROUND_RIVER,mkRng,PAL,palU,setPal,ROCK_DECL,weld,makeStone,boulderMat,makePlaceBoulder,bankUniforms,bankShapes,bankKit,riverStones,occAt,ivyMaterial,ivySpots,ivyKit,grassMaterial,tuftGeometry,tuftKit,makeNTEX,waterUniforms,waterMaterial,waterRibbon,makeFloat,fleckMaterial,updFloat};})();
