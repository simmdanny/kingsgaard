/* ---------- grass (environment upgrades 02 and 03) ----------
   Lush stylized grass after the style reference: a carpet of broad curved blades, patches of clover (stems of three round leaflets), and here and there a broad-leaved plant with big arching
   leaves and a few tall blades standing out of the carpet, growing right up to the soft edges of the paths (owgWVis: the same wandering width the ground tiles draw) and leaning over them,
   swaying in the wind. Shading (grsMat): each plant is darker towards the ground and inside (an occlusion by height), bright at the top, and the sunlight shines through the leaves when the
   camera looks towards the sun; it takes the shadows of trees and houses; the deep green of the terrain shows between the plants. It replaces the old sparse grass tufts of the foliage
   (FOL 'grass', off); the flowers, ferns, shrubs and the rest of the ground cover stay.
   Cosmetic only, like all ground cover: no collision, never on a path, a square, a building, a field or the keep's approach, nothing taken from the world's random stream (each cell has its
   own seeded stream).
   Cost: cells of GRS.cs metres round the camera, one instanced mesh per kind of plant in each, baked a few milliseconds a frame (grsBake is a generator; the nearest cell first), culled cell by
   cell against the view; the number of plants drawn in a cell eases off with its distance (each cell's plants are in a random order, so fewer is just sparser); beyond GRS.NEAR metres a cell
   draws the plain version of its plants (single-triangle blades and leaflets) and beyond GRS.BROAD no broad-leaved plants. The Foliage Details setting scales the density and the distance.
   One program (Lambert: lit at the vertices; one material a kind for its own height), wind and the light through the leaves in the vertex shader, shadows received, not cast. */
const GRS={cs:16,NEAR:8,BROAD:20,cells:new Map(),group:null,owner:null,kits:null,mats:null,time:{value:0},job:null,stats:{built:0,inst:0},
  /* plants a square metre at full density (blades, clover, broad leaves), the height of each kind (for its shading) and the detail levels: density (1.3 = all) and distance */
  D:[3.6,.9,.24],KH:[.3,.18,.46],LV:{low:{d:.35,r:20},medium:{d:.65,r:27},high:{d:1,r:36},ultra:{d:1.3,r:46}}};
const grsLv=()=>GRS.LV[(meta&&meta.fol)||'high']||GRS.LV.high;
/* the kinds of plant, each near and plain: geometry with vertex colours and normals bent up (grass lit as one soft mass, not blade by blade) */
function grsKits(){if(GRS.kits)return GRS.kits;
  const mk=()=>({P:[],N:[],C:[],I:[]}),vert=(k,p,ox,oz,c)=>{const n=Math.hypot(ox*.3,1,oz*.3);k.P.push(p[0],p[1],p[2]);k.N.push(ox*.3/n,1/n,oz*.3/n);k.C.push(c[0],c[1],c[2]);return k.P.length/3-1;};
  const geo=k=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(k.P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(k.N,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(k.C,3));g.setIndex(k.I);g.computeBoundingSphere();return g;};
  const L3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  /* blades: n broad ribbons arching out from a spread root (a clump half a metre across); near: three triangles each (root, middle, tip), plain: one */
  const blade=(K,a,r0,h,L,wd,seg,cv,o)=>{o=o||[0,0,0];const ca=Math.cos(a),sa=Math.sin(a),at=(t,s)=>{const lean=L*Math.pow(t,1.5),wv=(wd*Math.pow(1-t,.8)+.004)*s;return add(o,[ca*(r0+lean)-sa*wv,h*t*(1-.18*t),sa*(r0+lean)+ca*wv]);};
    const c0=cv[0],c1=cv[1],c2=cv[2],i0=vert(K,at(0,-1),ca,sa,c0),i1=vert(K,at(0,1),ca,sa,c0);
    if(seg){const i2=vert(K,at(.55,-1),ca,sa,c1),i3=vert(K,at(.55,1),ca,sa,c1),i4=vert(K,at(1,0),ca,sa,c2);K.I.push(i0,i1,i3,i0,i3,i2,i2,i3,i4);}else{const i4=vert(K,at(1,0),ca,sa,L3(c1,c2,.5));K.I.push(i0,i1,i4);}};
  const blades=(n,seg,wk)=>{const B=mk();for(let j=0;j<n;j++){const v=(j%3-1)*.06,cv=[[.27+v*.3,.5+v*.4,.11],[.4+v*.4,.66+v*.4,.14],[.62+v*.5,.83+v*.3,.24]];/* (world look 5: a touch brighter and yellower at the tips, the meadow's) */
      blade(B,j/n*6.283+.43*(j%3),.01+.15*((j*7)%5)/4,.15+.15*((j*3)%5)/4,.05+.08*((j*2)%3)/2,(.034+.016*(j%2))*(seg?1:1.25)*(wk||1),seg,cv);}return geo(B);};
  /* clover: groups of three round leaflets, each a fan from the top of its (hidden) stem; near: two triangles a leaflet, plain: one */
  const clover=(n,near)=>{const K=mk();for(let j=0;j<n;j++){const a=j/n*6.283+.7*(j%2),r=.03+.15*((j*3)%4)/3,h=.06+.1*((j*5)%4)/3,lx=Math.cos(a)*r*.25,lz=Math.sin(a)*r*.25,top=[Math.cos(a)*r+lx,h,Math.sin(a)*r+lz];
      for(let q=0;q<3;q++){const b=a+q*2.094+.3*j,cb=Math.cos(b),sb=Math.sin(b),ls=.062+.022*((j+q)%3)/2,cin=[.3,.56,.12],cmid=[.4,.68,.15],cout=[.5,.78,.2];
        const P=(f,s,dy)=>[top[0]+cb*ls*f-sb*s,top[1]+.012*f+dy,top[2]+sb*ls*f+cb*s],c=vert(K,P(0,0,0),cb,sb,cin);
        if(near){const r1=vert(K,P(.7,-ls*.58,.004),cb,sb,cmid),r2=vert(K,P(1.18,0,.009),cb,sb,cout),r4=vert(K,P(.7,ls*.58,.004),cb,sb,cmid);K.I.push(c,r1,r2,c,r2,r4);}
        else{const r1=vert(K,P(1.1,-ls*.5,.006),cb,sb,cmid),r4=vert(K,P(1.1,ls*.5,.006),cb,sb,cout);K.I.push(c,r1,r4);}}}return geo(K);};
  /* broad leaves: big arching leaves folded about a raised middle rib, darker and cooler, with two tall blades standing out; near: eight triangles a leaf, plain: two */
  const broad=(n,near)=>{const K=mk();for(let j=0;j<n;j++){const a=j/n*6.283+.35*(j%2),ca=Math.cos(a),sa=Math.sin(a),len=.34+.16*((j*3)%4)/3,wd=.09+.04*((j*5)%3)/2,up=.62-.12*(j%3)/2,cb=[.17,.38,.1],ct=[.32,.58,.17],cr=[.4,.66,.2];
      const P=(f,s,dy)=>{const r=.015+len*f,y=Math.sin(up)*len*f*(1-.62*f)+.01+dy,w=s*Math.sin(Math.PI*Math.min(1,f*1.15))*wd;return[ca*r-sa*w,y,sa*r+ca*w];};
      const i0=vert(K,P(0,0,0),ca,sa,cb);
      if(near){const a1=vert(K,P(.33,-1,0),ca,sa,L3(cb,ct,.4)),m1=vert(K,P(.33,0,.018),ca,sa,L3(cb,cr,.5)),b1=vert(K,P(.33,1,0),ca,sa,L3(cb,ct,.4)),a2=vert(K,P(.66,-1,0),ca,sa,L3(cb,ct,.75)),m2=vert(K,P(.66,0,.014),ca,sa,cr),b2=vert(K,P(.66,1,0),ca,sa,L3(cb,ct,.75)),tp=vert(K,P(1,0,0),ca,sa,ct);
        K.I.push(i0,a1,m1,i0,m1,b1,a1,a2,m2,a1,m2,m1,m1,m2,b2,m1,b2,b1,a2,tp,m2,m2,tp,b2);}
      else{const a1=vert(K,P(.5,-1,0),ca,sa,L3(cb,ct,.5)),b1=vert(K,P(.5,1,0),ca,sa,L3(cb,ct,.5)),tp=vert(K,P(1,0,0),ca,sa,ct);K.I.push(i0,a1,tp,i0,tp,b1);}}
    for(let j=0;j<2;j++)blade(K,1.3+j*2.6,.02,.42+.12*j,.05,.02,near,[[.2,.4,.09],[.34,.6,.13],[.54,.78,.2]]);return geo(K);};
  return GRS.kits=[[blades(10,true),blades(7,false)],[clover(8,true),clover(8,false)],[broad(5,true),broad(5,false)],[blades(4,false,1.7)]/* (the far grass: four broad blades, a triangle each) */];}
/* the shading, one program for every kind (each its own material for its height):
   - wind: the higher a vertex, the more it sways, in waves that cross the land;
   - occlusion: darker towards the ground and inside a plant (by the height of the vertex in its kind), the shade of the plants round it;
   - light through the leaves: when the camera looks towards the sun the upper parts glow with its light (computed with the vertex lighting, kept in the sun's shadow);
   - both sides of a leaf lit as its front (the normals point up, so a leaf seen from behind was lit from below and went black). */
function grsMat(kind,far){if(!GRS.mats)GRS.mats=[];const mk=kind+(far?'f':'');if(GRS.mats[mk])return GRS.mats[mk];const m=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,emissive:0x081203}),uKH={value:GRS.KH[kind]};
  if(far)m.defines={GRS_FAR:1,GRS_FAR_GROW:GRS.F.grow.toFixed(2)};
  m.onBeforeCompile=sh=>{sh.uniforms.uTime=GRS.time;sh.uniforms.uKH=uKH;sh.uniforms.uGF=GRS.F.u;sh.uniforms.uGC=GRS.F.c;
    sh.vertexShader='uniform float uTime;\nuniform float uKH;\nuniform vec4 uGF;\nuniform vec3 uGC;\nvarying float vAO;\nvarying vec3 vTrans;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    #ifdef GRS_FAR
    /* (the far grass, grsFarBake: a plant shows where the density wanted at its distance (grsRho) is above its own (instanceColor.z); the others shrink to a point) */
    {vec3 fp=(modelMatrix*instanceMatrix[3]).xyz;float fd=max(length(fp.xz-uGC.xz),1.0)/* (uGC: the camera - three.js gives a Lambert material no cameraPosition) */,fy=uGF.y;
     float fr=uGF.x*min(1.0,fy/fd)*smoothstep(fy*.5,fy,fd)*(1.0-smoothstep(uGF.z*.8,uGF.z,fd))*uGF.w;
     transformed*=(instanceColor.z<fr?1.0:0.0)*(1.0+GRS_FAR_GROW*smoothstep(fy,fy*5.0,fd));}
    #endif
    float grsH=clamp(position.y/uKH,0.0,1.0);vAO=.38+.62*grsH*grsH*(3.0-2.0*grsH);
    {vec3 ip=(modelMatrix*instanceMatrix[3]).xyz;float k=transformed.y*transformed.y*7.0;float w=sin(uTime*1.7+ip.x*.31+ip.z*.23)+.45*sin(uTime*2.9+ip.x*.83-ip.z*.61);
     transformed.x+=w*.028*k;transformed.z+=(.6*w+.3*sin(uTime*1.3+ip.z*.4))*.022*k;}`).replace('#include <color_vertex>',`#include <color_vertex>
    #ifdef GRS_FAR
    vColor.xyz=color.xyz*vec3(instanceColor.x*(.95+.1*instanceColor.y),instanceColor.x,instanceColor.x*(1.03-.1*instanceColor.y));/* (its tint: brightness and hue; z is its density) */
    #endif`).replace('#include <lights_lambert_vertex>',`#include <lights_lambert_vertex>
    vTrans=vec3(0.0);
    #if NUM_DIR_LIGHTS > 0
    {vec3 vd=normalize(-mvPosition.xyz);float bt=max(0.0,dot(vd,-directionalLights[0].direction));vTrans=directionalLights[0].color*(bt*bt*.55+.06)*grsH;}
    #endif`);
    sh.fragmentShader='varying float vAO;\nvarying vec3 vTrans;\n'+sh.fragmentShader.replace('( gl_FrontFacing ) ? vLightFront : vLightBack','vLightFront').replace('( gl_FrontFacing ) ? vIndirectFront : vIndirectBack','vIndirectFront')
      .replace('reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb ) * getShadowMask();',
        'float grsSh=getShadowMask();reflectedLight.directDiffuse=(reflectedLight.directDiffuse+vTrans*vec3(1.0,1.04,.62))*BRDF_Diffuse_Lambert( diffuseColor.rgb )*grsSh*vAO;reflectedLight.indirectDiffuse*=mix(vAO,1.0,.2);');};
  m.customProgramCacheKey=()=>far?'kkGrass2far':'kkGrass2';return GRS.mats[mk]=m;}
const _grsM=new THREE.Matrix4(),_grsQ=new THREE.Quaternion(),_grsV=new THREE.Vector3(),_grsS=new THREE.Vector3(),_grsAx=new THREE.Vector3(0,1,0),_grsC=new THREE.Color();
/* where grass grows in a square of the land (corner x0,z0, side cs): grsSite gathers what can reach it - the paths and squares of the ground network's tiles, the
   streams - and returns accept(kind,x,z,pk,o): whether a plant of that kind grows at x,z (pk: its own random number, against what the patches wish there); if so
   o gets its ground height (h), whether it stands by a path edge (edge) and the patch noise there (nz, nc) */
function grsSite(x0,z0,cs){const keep=OW.keep,G=OW.G,T=G.T;
  /* the paths and squares that can reach the cell (from the ground network's tiles) */
  const segs=[],sqs=[];{const seen=new Set();for(let tz=Math.floor((z0-4)/T);tz<=Math.floor((z0+cs+4)/T);tz++)for(let tx=Math.floor((x0-4)/T);tx<=Math.floor((x0+cs+4)/T);tx++){const t=G.tiles.get(tx+','+tz);if(!t||!t.segs)continue;
      for(const g of t.segs){if(seen.has(g)||g.x1<x0-1||g.x0>x0+cs+1||g.z1<z0-1||g.z0>z0+cs+1)continue;seen.add(g);segs.push(g);}for(const q of t.sqs)if(!seen.has(q)){seen.add(q);sqs.push(q);}}}
  const rvS=typeof wrsMeadowSegs==='function'&&typeof WG!=='undefined'&&WG.on?wrsMeadowSegs(x0,z0,cs):[];/* (the river look: the streams near, for the mockup's rule at the river) */
  const strm=[];if(OW.streams)for(const p of OW.streams)for(const q of p)if(q[0]>x0-4&&q[0]<x0+cs+4&&q[1]>z0-4&&q[1]<z0+cs+4)strm.push(q);
  /* how far outside the paths a point is (negative: on a path), with the wandering width the ground tiles draw */
  const pathOut=(x,z)=>{let o=99;for(const g of segs){if(x<g.x0||x>g.x1||z<g.z0||z>g.z1)continue;const tt=Math.max(0,Math.min(1,((x-g.ax)*g.dx+(z-g.az)*g.dz)*g.il2)),ex=x-(g.ax+g.dx*tt),ez=z-(g.az+g.dz*tt);
      const pl=g.pa+(g.pb-g.pa)*tt,w=owgWVis(g.wa+(g.wb-g.wa)*tt,pl,x,z)+(g.sx||0)/* (upgrade 12: not on the sand of a street with a pavement) */,d=Math.sqrt(ex*ex+ez*ez)-w*(pl>.45?1:.9);if(d<o)o=d;}return o;};
  const onSq=(x,z)=>{for(const q of sqs)if(owrSqD(q,x,z)<.4)return true;return false;};
  /* (world look 5: round a boulder the tufts grow right up to it and over its foot - kept out only of its middle - and thicker in a ring round it, which
     prop() reports in near.rock) */
  const near={rock:0},prop=(x,z)=>{near.rock=0;const L=OW.propGrid&&OW.propGrid.get(Math.floor(x/4)+','+Math.floor(z/4));if(!L)return false;for(const p of L){if(!p.alive)continue;const d=Math.hypot(p.x-x,p.z-z),r=p.r||.5;
      if(p.type==='rock'){if(d<r*.6)return true;if(d<r+.9)near.rock=1;}else if(d<r+.2)return true;}return false;};
  /* (and along a cliff's foot: thick where the land rises steeply within 2.6 m, none within 1.2 m of the rise - the cliff's stones stand out there) */
  const foot=(x,z,h)=>{let f=0;for(let a=0;a<4;a++){const ca=a===0?1:a===2?-1:0,sa=a===1?1:a===3?-1:0;if(owH(x+ca*2.6,z+sa*2.6)-h>2.2){if(owH(x+ca*1.2,z+sa*1.2)-h>1)return -1;f=1;}}return f;};
  return (kind,x,z,pk,o)=>{
    /* patches: blades everywhere, thicker in meadows; clover in its own patches and along the paths; the broad-leaved plants where the two meet and at the path edges */
    const nz=Math.sin(x*.13+z*.07+1.1)*Math.sin(x*.05-z*.11+2.3)+.4*Math.sin(x*.41+z*.37),nc=Math.sin(x*.19-z*.15+.7)*Math.sin(x*.07+z*.13+3.1)+.35*Math.sin(x*.53-z*.47);
    const cl=owCell(x,z);if(cl.r<1||cl.c<1||cl.r>=H-1||cl.c>=W-1)return false;const gv=grid[cl.r][cl.c];if(gv===2)return false;
    const po=pathOut(x,z),tp=typeof wtPathAt==='function'?wtPathAt(x,z):99;
    /* (a trail, world look 3: the grass thins through its band - all of it 0.45 m out, a few clumps near the edge inside, fewer in the middle) */
    if(tp<.45){const keep=tp<0?(tp>-.25?.07:.02):.07+.93*tp/.45;if((pk*7.31)%1>keep)return false;}
    if(po<0){/* a few clumps creep a little onto the edge of a path or a street (thinning out within a third of a metre) */if(kind===2||po<-.32||pk>.5*(1+po/.32))return false;}
    const edge=po<1.6?1:0,w0=kind===0?(.6+.35*nz+.25*edge):kind===1?(.25+.75*Math.max(0,nc)+.4*edge):(.4+.3*(1-Math.abs(nz-nc))+.6*edge);if(pk>w0+.55)return false;/* (cheap first: the most it could want) */
    if(gv!==0&&po>1.2&&tp>1.6)return false;/* (a marked cell that is no path: the yard of a building, a step - a trail's own cells keep their grass) */
    if(Math.hypot(x-keep.x,z-keep.z)<30||onSq(x,z)||prop(x,z))return false;
    const h=owH(x,z),ft=foot(x,z,h);if(ft<0)return false;const boost=Math.max(near.rock,ft)*(kind===1?.2:.55);
    if(pk>w0+boost)return false;
if(owSlope(x,z)>.5||wtWater(x,z)>h-.02)return false;
    if(rvS.length&&wrsMeadowSkip(rvS,x,z,h))return false;/* (river look, HANDOFF 3.7: at a stream left out only in the water or on a steep earth face - wrstone.js) */
    for(const q of strm)if((q[0]-x)*(q[0]-x)+(q[1]-z)*(q[1]-z)<3.2)return false;
    o.h=h;o.edge=edge;o.nz=nz;o.nc=nc;return true;};}
/* one cell: candidates from its own seeded stream, kept where grass grows, in a random order, as instanced meshes (a generator: it stops every few hundred candidates) */
function* grsBake(a,b){const cs=GRS.cs,half=0,x0=-half+a*cs,z0=-half+b*cs,K=grsKits(),c={key:a+','+b,a,b,cx:x0+cs/2,cz:z0+cs/2,meshes:[],sphere:new THREE.Sphere(),lod:-1};
  const R=mulberry(((OW.seed|0)*2654435+a*92821+b*68917+17)>>>0),acc=grsSite(x0,z0,cs),O={};
  const KN=GRS.D.length,L=GRS.D.map(()=>[]),N=GRS.D.map(d=>Math.round(d*cs*cs));let it=0;
  for(let kind=0;kind<KN;kind++)for(let i=0;i<N[kind]*1.6&&L[kind].length<N[kind];i++){if((++it&255)===0)yield;const x=x0+R()*cs,z=z0+R()*cs,rot=R()*6.283,sc=.75+R()*.55,sy=.85+R()*.5,tn=R(),pk=R(),hu=R();
    if(!acc(kind,x,z,pk,O))continue;
    /* (along a path edge the grass is a little taller and leans over it; in the meadow patches it is a shade darker and lusher) */
    L[kind].push({x,z,h:O.h,rot,sc:sc*(O.edge?1.08:1),sy:sy*(O.edge?1.12:1),tn:tn*.8+.1*(1-O.nz),hu});}
  yield;
  for(let kind=0;kind<KN;kind++){const P=L[kind];if(!P.length)continue;const im=new THREE.InstancedMesh(K[kind][1],grsMat(kind),P.length);im.frustumCulled=false;im.castShadow=false;im.receiveShadow=true;
    P.forEach((p,i)=>{_grsQ.setFromAxisAngle(_grsAx,p.rot);_grsV.set(p.x,p.h-.01,p.z);_grsS.set(p.sc,p.sc*p.sy,p.sc);_grsM.compose(_grsV,_grsQ,_grsS);im.setMatrixAt(i,_grsM);
      const t=.84+.24*p.tn;_grsC.setRGB(t*(.95+.1*p.hu),t,t*(1.03-.1*p.hu));im.setColorAt(i,_grsC);});
    im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.userData.n=P.length;im.userData.kind=kind;im.count=0;im.visible=false;c.meshes.push(im);GRS.group.add(im);GRS.stats.inst+=P.length;}
  let ymin=1e9,ymax=-1e9;for(const P of L)for(const p of P){ymin=Math.min(ymin,p.h);ymax=Math.max(ymax,p.h);}c.sphere.set(new THREE.Vector3(c.cx,ymin<1e9?(ymin+ymax)/2:owH(c.cx,c.cz),c.cz),cs*.72+(ymax>ymin?(ymax-ymin)/2:0)+.6);
  GRS.stats.built++;return c;}
function grsBuild(a,b){const g=grsBake(a,b);let r;do{r=g.next();}while(!r.done);return r.value;}
/* ---------- the far grass (the Detail distance setting): the carpet goes on past the near grass, out to GRS.F.R (owDetailApply sets it from the setting; 0, as the
   game always was, at Standard). Cells of GRS.F.cs metres, one instanced mesh each of a plain tuft (four broad blades, a triangle each; the clover patches are its lighter, yellower plants), from the
   cell's own seeded stream: the i-th candidate drawn stands for a density of (i+1) per cell area, so the plants wanted at a density are always the same first ones.
   The density wanted falls off as the distance (grsRho: rho0 at the near grass's edge, where that one has thinned out, half of it at twice that distance...): seen
   at a slant, a metre of far-off ground is narrow on the screen while a plant on it stands as tall, so a carpet that thins as the distance covers the ground as
   much far off as near (the plants a little bigger, too); it fades out before R. The
   shader keeps each plant by its own density against the one wanted where it stands (smooth as the camera moves, no steps between cells), and makes the farther
   ones a little bigger (GRS.F.grow); each cell draws only the plants its nearest corner could want (InstancedMesh.count). A cell is grown to the density of a
   distance 30 % nearer than where it is, and grown on (from where its stream stopped) when the camera has come near enough to want more. A village built
   nearby takes its cells away (wstInvalidate), so they grow again round its streets and houses. Cosmetic only, like the near grass. ---------- */
GRS.F={cs:64,cells:new Map(),job:null,R:0,rho:1.4,grow:.5,max:320,ms:1.5,step:.6,u:{value:new THREE.Vector4(0,36,0,1)},c:{value:new THREE.Vector3()},stats:{built:0,inst:0}};
/* the density wanted at a distance (the shader's own formula; u = GRS.F.u: rho0, the near grass's reach, the far reach, the height fade) */
const grsSm=(a,b,t)=>{t=Math.min(1,Math.max(0,(t-a)/(b-a)));return t*t*(3-2*t);};
const grsRho=(d,u)=>{const y=u.y;d=Math.max(d,1);return u.x*Math.min(1,y/d)*grsSm(y*.5,y,d)*(1-grsSm(u.z*.8,u.z,d))*u.w;};
/* the most any point of a cell at distance d (its nearest point) can want: no fades */
const grsRhoMax=(d,u)=>{const y=u.y,e=Math.max(d,y*.5);return u.x*Math.min(1,y/e)*u.w;};
/* the far reach for a detail distance D (the Foliage setting scales it with the near grass) */
function grsFarR(D){if(!(D>200))return 0;const lv=grsLv();return Math.min(GRS.F.max*lv.r/36,lv.r+(D-200)*.3);}
/* a far cell, empty until it is first grown */
function grsFarCell(a,b){const cs=GRS.F.cs,x0=a*cs,z0=b*cs;return{key:a+','+b,a,b,x0,z0,cx:x0+cs/2,cz:z0+cs/2,rb:0,i:0,R:null,acc:null,mesh:null,v:null,ymin:1e9,ymax:-1e9,sphere:new THREE.Sphere(new THREE.Vector3(x0+cs/2,0,z0+cs/2),cs*.72)};}
/* grow a cell to density rb (a generator, a fraction of a millisecond a step - GRS.F.step - since ground in a village is slow to read): it goes on drawing
   candidates from where it stopped (its own stream, kept), so the plants it has stay the same and only the new ones are worked out; returns the new mesh - the
   old one's plants copied, the new ones after them - or null when none came (the old mesh stays on screen meanwhile) */
function* grsFarGrow(c,rb){const F=GRS.F,cs=F.cs,A=cs*cs,K=grsKits(),O={},Q=[],n=Math.ceil(rb*A);
  if(!c.R){c.R=mulberry(((OW.seed|0)*2654435+c.a*92821+c.b*68917+977)>>>0);c.acc=grsSite(c.x0,c.z0,cs);c.i=0;}
  const R=c.R,acc=c.acc;let tY=performance.now(),k=0;
  while(c.i<n){if((++k&15)===0&&performance.now()-tY>F.step){yield;tY=performance.now();}
    const i=c.i++,x=c.x0+R()*cs,z=c.z0+R()*cs,rot=R()*6.283,sc=.75+R()*.55,sy=.85+R()*.5,tn=R(),pk=R(),hu=R();
    if(!acc(0,x,z,pk,O))continue;const cl=Math.max(0,O.nc);
    Q.push(x,z,O.h,rot,sc*(O.edge?1.08:1),sy*(O.edge?1.12:1),(.84+.24*(tn*.8+.1*(1-O.nz)))*(1+.22*cl),Math.min(1,hu+.5*cl),(i+1)/A);}
  const old=c.mesh,n0=old?c.v.length:0,N=n0+Q.length/9;if(N===n0)return null;
  yield;
  const im=new THREE.InstancedMesh(K[3][0],grsMat(0,true),N),v=new Float32Array(N),M=im.instanceMatrix.array;im.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(N*3),3);const C=im.instanceColor.array;
  im.frustumCulled=false;im.castShadow=false;im.receiveShadow=true;
  if(old){M.set(old.instanceMatrix.array.subarray(0,n0*16));C.set(old.instanceColor.array.subarray(0,n0*3));v.set(c.v);}
  for(let j=0;j<Q.length;j+=9){if((j%2304)===2295&&performance.now()-tY>F.step){yield;tY=performance.now();}const q=n0+j/9;
    _grsQ.setFromAxisAngle(_grsAx,Q[j+3]);_grsV.set(Q[j],Q[j+2]-.01,Q[j+1]);_grsS.set(Q[j+4],Q[j+4]*Q[j+5],Q[j+4]);_grsM.compose(_grsV,_grsQ,_grsS);_grsM.toArray(M,q*16);
    C[q*3]=Q[j+6];C[q*3+1]=Q[j+7];C[q*3+2]=Q[j+8];v[q]=Q[j+8];c.ymin=Math.min(c.ymin,Q[j+2]);c.ymax=Math.max(c.ymax,Q[j+2]);}
  im.count=0;im.visible=false;im.userData.v=v;F.stats.inst+=N-n0;F.stats.built++;return im;}
function grsFarDrop(c){if(c&&c.mesh){GRS.group.remove(c.mesh);c.mesh.dispose();c.mesh=null;}}
/* the far cells over a box of land given back (a village built or unloaded there: wstream.js wstInvalidate) */
function grsFarInvalidate(x0,z0,x1,z1){const F=GRS.F,cs=F.cs;for(const[k,c]of F.cells){if(c.x0+cs<x0||c.x0>x1||c.z0+cs<z0||c.z0>z1)continue;grsFarDrop(c);F.cells.delete(k);if(F.job&&F.job.c===c)F.job=null;}}
/* per frame, after the near grass: the far cells within reach grown (the nearest first, within GRS.F.ms of their own, less
   while the near grass is still baking), grown on where the camera now wants more of them, dropped beyond reach; each one's count from its nearest point */
function grsFarView(force,cp,aF,lv){const F=GRS.F,cs=F.cs,u=F.u.value;u.set(F.rho*lv.d,lv.r,F.R,aF);F.c.value.copy(cp);
  if(!(F.R>lv.r)||aF<=0){for(const c of F.cells.values())grsFarDrop(c);F.cells.clear();F.job=null;return;}
  const dOf=c=>Math.hypot(Math.max(0,Math.abs(c.cx-cp.x)-cs/2),Math.max(0,Math.abs(c.cz-cp.z)-cs/2)),want=d=>Math.min(u.x,grsRhoMax(d*.7,u));
  const tl=force?1e9:(GRS.job?.4:F.ms),tS=performance.now();
  while(force||performance.now()-tS<tl){
    if(!F.job){let best=null;const a0=Math.floor((cp.x-F.R)/cs),a1=Math.floor((cp.x+F.R)/cs),b0=Math.floor((cp.z-F.R)/cs),b1=Math.floor((cp.z+F.R)/cs);
      for(let b=b0;b<=b1;b++)for(let a=a0;a<=a1;a++){const cx=(a+.5)*cs,cz=(b+.5)*cs,d=Math.hypot(Math.max(0,Math.abs(cx-cp.x)-cs/2),Math.max(0,Math.abs(cz-cp.z)-cs/2));if(d>=F.R)continue;
        const c=F.cells.get(a+','+b),need=grsRhoMax(d,u);if(need<=0)continue;if(c&&c.rb>=Math.min(u.x,need)*.999)continue;if(!best||d<best.d)best={a,b,d,c};}
      if(!best)break;let c=best.c;if(!c){c=grsFarCell(best.a,best.b);F.cells.set(c.key,c);}const rb=want(best.d);F.job={c,rb,it:grsFarGrow(c,rb)};}
    const j=F.job,r=j.it.next();if(r.done){const c=j.c,m=r.value;if(m){grsFarDrop(c);c.mesh=m;c.v=m.userData.v;GRS.group.add(m);
        c.sphere.set(new THREE.Vector3(c.cx,c.ymin<1e9?(c.ymin+c.ymax)/2:owH(c.cx,c.cz),c.cz),cs*.72+(c.ymax>c.ymin?(c.ymax-c.ymin)/2:0)+1);}c.rb=j.rb;F.job=null;}}
  for(const[k,c]of F.cells){const d=dOf(c);if(d>F.R+cs){grsFarDrop(c);F.cells.delete(k);if(F.job&&F.job.c===c)F.job=null;continue;}const m=c.mesh;if(!m)continue;
    const vis=d<F.R&&_grsF.intersectsSphere(c.sphere);m.visible=vis;if(!vis)continue;
    /* (the plants this cell can want: their densities rise with their index) */const top=grsRhoMax(d,u);let lo=0,hi=c.v.length;while(lo<hi){const mid=(lo+hi)>>1;if(c.v[mid]<top)lo=mid+1;else hi=mid;}m.count=lo;m.visible=lo>0;}}
/* per frame (with the ground cover): the cells round the camera baked a few milliseconds a frame, the nearest first; in each the plants drawn ease off with distance, the far ones plain and
   without broad leaves; cells out of view hidden */
const _grsF=new THREE.Frustum(),_grsPM=new THREE.Matrix4();
function grsView(force){if(!OW.on||!OW.group||!OW.G)return;if(GRS.owner!==OW.group){GRS.owner=OW.group;GRS.cells=new Map();GRS.job=null;GRS.group=new THREE.Group();GRS.group.userData.keep=1;OW.group.add(GRS.group);GRS.stats={built:0,inst:0};GRS.F.cells=new Map();GRS.F.job=null;GRS.F.stats={built:0,inst:0};}
  GRS.time.value=performance.now()/1000;const lv=grsLv(),cs=GRS.cs,half=0,cp=camera.position,Rr=lv.r,K=grsKits();
  camera.updateMatrixWorld();_grsPM.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);_grsF.setFromProjectionMatrix(_grsPM);
  /* (high above the ground the grass is too small to see) */const alt=cp.y-owH(cp.x,cp.z),aF=1-SMS(alt,18,45);
  const a0=Math.floor((cp.x-Rr)/cs),a1=Math.floor((cp.x+Rr)/cs),b0=Math.floor((cp.z-Rr)/cs),b1=Math.floor((cp.z+Rr)/cs);
  if(aF>0){const want=[];for(let b=b0;b<=b1;b++)for(let a=a0;a<=a1;a++){if(GRS.cells.has(a+','+b))continue;const x0=-half+a*cs,z0=-half+b*cs,d=Math.hypot(Math.max(0,x0-cp.x,cp.x-x0-cs),Math.max(0,z0-cp.z,cp.z-z0-cs));if(d<Rr)want.push([d,a,b]);}
    want.sort((p,q)=>p[0]-q[0]);
    if(force){for(const[,a,b]of want)GRS.cells.set(a+','+b,grsBuild(a,b));GRS.job=null;}
    else{const t0=performance.now();while(performance.now()-t0<2.5){if(!GRS.job){const w=want.find(q=>!GRS.cells.has(q[1]+','+q[2]));if(!w)break;GRS.job={k:w[1]+','+w[2],it:grsBake(w[1],w[2])};}
        const r=GRS.job.it.next();if(r.done){GRS.cells.set(GRS.job.k,r.value);want.splice(want.findIndex(q=>q[1]+','+q[2]===GRS.job.k),1);GRS.job=null;}}}}
  for(const[k,c]of GRS.cells){const d=Math.hypot(Math.max(0,Math.abs(c.cx-cp.x)-cs/2),Math.max(0,Math.abs(c.cz-cp.z)-cs/2));
    if(d>Rr+cs*2){for(const m of c.meshes){GRS.group.remove(m);m.dispose&&m.dispose();}GRS.cells.delete(k);continue;}
    const f=d>=Rr?0:Math.min(1,lv.d/1.3*aF*(1-.88*SMS(d,6,Rr*.75))),vis=f>0&&_grsF.intersectsSphere(c.sphere),lod=d<GRS.NEAR?0:1;
    for(const m of c.meshes){const kd=m.userData.kind,v=vis&&(kd<2||d<GRS.BROAD);m.visible=v;if(!v)continue;m.count=Math.round(m.userData.n*f);if(c.lod!==lod)m.geometry=K[kd][lod];}c.lod=vis?lod:c.lod;}
  grsFarView(force,cp,aF,lv);}
