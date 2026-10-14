/* =====================================================================================================================
   BATCHING OF SETTLEMENTS
   A building is five or six meshes and a window layer; a city has hundreds of buildings, so drawing them one by one costs more in draw calls than in triangles. Here the INTACT
   buildings of a village are merged, by area (44 m cells), into one mesh per cell, and the window glass of the same cell into a second one. Each building keeps its own meshes,
   but they are switched off while the building is intact and not being explored. Switching a building between the two is a matter of one flag per vertex (aS = 1 hides it in
   the merged mesh: the vertex shader moves it outside the screen), so a damaged building, a ruin, or the house the hero is exploring (with its own clipping plane) simply
   changes over to its own meshes. Window glass carries a second flag, aN: 1 where the interior behind it is loaded (transparent glass), 0 elsewhere (a dark pane).
   ===================================================================================================================== */
const OWB_CELL=30;
const OWBLK_MAT=(function(){const m=VCMAT.clone();m.customProgramCacheKey=()=>'owblk';
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('void main() {','attribute float aS;\nvoid main() {').replace('#include <project_vertex>','#include <project_vertex>\n if(aS>0.5)gl_Position=vec4(2.0,2.0,2.0,1.0);');};return m;})();
/* the merged glass: transparent where the interior exists (aN = 1), a dark opaque pane elsewhere (aN = 0); fresnel reflection of the sky on the transparent kind */
const OW_NIGHT={value:0};/* how dark it is, for the glow of the windows of the houses somebody lives in (set every frame by owGlassUpdate) */
const OWGLASS_BLK=(function(){const m=new THREE.MeshPhongMaterial({color:0xcfe0ea,transparent:true,opacity:.3,shininess:140,specular:0x999999,flatShading:true,depthWrite:false});
  m.customProgramCacheKey=()=>'owglassblk';
  m.onBeforeCompile=sh=>{sh.uniforms.uSky=OW_GLASS_SKY;sh.uniforms.uNight=OW_NIGHT;
    sh.vertexShader=sh.vertexShader.replace('void main() {','attribute float aS;attribute float aN;attribute float aL;varying float vN;varying float vL;\nvoid main() {').replace('#include <project_vertex>','#include <project_vertex>\n vN=aN;vL=aL;if(aS>0.5)gl_Position=vec4(2.0,2.0,2.0,1.0);');
    sh.fragmentShader=sh.fragmentShader.replace('void main() {','uniform vec3 uSky;uniform float uNight;varying float vN;varying float vL;\nvoid main() {').replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb=mix(vec3(0.17,0.24,0.29),diffuseColor.rgb,vN);diffuseColor.a=mix(1.0,diffuseColor.a,vN);')
      .replace('#include <dithering_fragment>','{float fr=pow(1.0-abs(dot(normal,normalize(vViewPosition))),3.0);float a2=clamp(gl_FragColor.a*(0.6+1.5*fr)+fr*0.3,0.0,0.88);gl_FragColor.a=mix(1.0,a2,vN);gl_FragColor.rgb+=uSky.rgb*fr*(0.22+0.18*vN);gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(1.0,.62,.28)*.85,uNight*vL*(1.0-vN)*.9);}\n#include <dithering_fragment>');};
  return m;})();
/* append the geometries of one building, moved into the world, to the output: identical vertices (a box face repeats two of its four corners) are stored once and shared
   through an index. Geometry is in the building's own units (scaled by BSc), except the entrance steps, which are in metres. Returns the number of vertices it added. */
let _owHT=new Int32Array(1<<16);
function owMergeLocal(b,geos,out){const c=Math.cos(b.rot),s=Math.sin(b.rot);let cnt=0;for(const it of geos)cnt+=it.isBufferGeometry?it.attributes.position.count:it[2]-it[1];/* (an item is a geometry, or [geometry, first vertex, end]: environment upgrade 12) */
  if(cnt*2>_owHT.length){let n=_owHT.length;while(n<cnt*2)n*=2;_owHT=new Int32Array(n);}/* _owHTgrow: the table is at least twice the vertices (a full table would be searched for ever) */
  const base=out.nv,HT=_owHT,mask=HT.length-1;HT.fill(-1);let nv=0;
  for(const it of geos){const g=it.isBufferGeometry?it:it[0],i0=it.isBufferGeometry?0:it[1],S=g.userData&&g.userData.metres?1:b.BSc,P=g.attributes.position.array,N=g.attributes.normal.array,C=g.attributes.color.array,n=it.isBufferGeometry?g.attributes.position.count:it[2];
    for(let i=i0;i<n;i++){const x=P[i*3]*S,y=P[i*3+1]*S,z=P[i*3+2]*S,wx=Math.fround(b.x+x*c+z*s),wy=Math.fround(b.hi+y),wz=Math.fround(b.z-x*s+z*c),nx0=N[i*3],nz0=N[i*3+2],nx=Math.fround(nx0*c+nz0*s),ny=N[i*3+1],nz=Math.fround(-nx0*s+nz0*c),r=C[i*3],gg=C[i*3+1],bb=C[i*3+2];/* float32 values, so the comparison with what is stored is exact */
      let h=(Math.round(wx*512)*73856093^Math.round(wy*512)*19349663^Math.round(wz*512)*83492791^Math.round(nx*64)*2654435761^Math.round(ny*64)*40503^Math.round(nz*64)*3266489917^Math.round(r*255)*7919)>>>0&mask,found=-1;
      while(HT[h]>=0){const j=base+HT[h],q=j*3;if(out.pos[q]===wx&&out.pos[q+1]===wy&&out.pos[q+2]===wz&&out.nor[q]===nx&&out.nor[q+1]===ny&&out.nor[q+2]===nz&&out.col[q]===r&&out.col[q+1]===gg&&out.col[q+2]===bb){found=j;break;}h=(h+1)&mask;}
      if(found<0){found=base+nv;const q=found*3;out.pos[q]=wx;out.pos[q+1]=wy;out.pos[q+2]=wz;out.nor[q]=nx;out.nor[q+1]=ny;out.nor[q+2]=nz;out.col[q]=r;out.col[q+1]=gg;out.col[q+2]=bb;HT[h]=nv;nv++;}
      out.idx[out.ni++]=found;}}
  out.nv+=nv;return nv;}
function owNewOut(nMax){return{pos:new Float32Array(nMax*3),nor:new Float32Array(nMax*3),col:new Float32Array(nMax*3),idx:new Uint32Array(nMax),nv:0,ni:0};}
function owBlockGeo(out,mkAttrs){const nv=out.nv,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(out.pos.slice(0,nv*3),3));g.setAttribute('normal',new THREE.BufferAttribute(out.nor.slice(0,nv*3),3));g.setAttribute('color',new THREE.BufferAttribute(out.col.slice(0,nv*3),3));
  const attrs=mkAttrs(nv);for(const k in attrs){const a=new THREE.BufferAttribute(attrs[k],1);a.setUsage(THREE.DynamicDrawUsage);g.setAttribute(k,a);}g.setIndex(new THREE.BufferAttribute(out.idx.slice(0,out.ni),1));g.computeBoundingSphere();return g;}
function owBuildBlocks(v){const cells=new Map();
  for(const b of v.buildings){if(!b.proxy||b.blk)continue;const key=Math.floor(b.x/OWB_CELL)+','+Math.floor(b.z/OWB_CELL);let l=cells.get(key);if(!l){l=[];cells.set(key,l);}l.push(b);}
  for(const[key,list]of cells){if(list.length<3)continue;
    /* the solid parts */
    const parts=[];let n=0,ng=0;
    for(const b of list){const ps=[];for(const k of['f','w','u','x','r','d','s']){const m=b.meshes[k];if(m&&m.geometry.attributes.position){ps.push(m);n+=m.geometry.attributes.position.count;}}
      const gm=b.meshes.g;if(gm&&gm.geometry.attributes.position)ng+=gm.geometry.attributes.position.count;parts.push([b,ps]);}
    const out=owNewOut(n);
    /* every building's far-only parts, then every building's parts drawn always, then every building's dressing (environment upgrade 12): far away the block draws
       [0, iC) of its index, near [iF, end) */
    const owRg=g=>{const u=g.userData||{},n=g.attributes.position.count;return u.nb!=null?[u.nf||0,u.nb,n]:[0,n,n];};
    for(const[b,ps]of parts){const fl=ps.filter(m=>owRg(m.geometry)[0]>0),fs=out.nv,fn=fl.length?owMergeLocal(b,fl.map(m=>[m.geometry,0,owRg(m.geometry)[0]]),out):0;b.blk={fstart:fs,fcount:fn};}
    const iF=out.ni;
    for(const[b,ps]of parts){const start=out.nv,nv=owMergeLocal(b,ps.map(m=>{const r=owRg(m.geometry);return[m.geometry,r[0],r[1]];}),out);Object.assign(b.blk,{start,count:nv,layers:ps.slice(),state:-1,dstart:out.nv,dcount:0});}
    const iC=out.ni;
    for(const[b,ps]of parts){const dl=ps.filter(m=>{const r=owRg(m.geometry);return r[1]<r[2];});if(!dl.length)continue;const ds=out.nv,dn=owMergeLocal(b,dl.map(m=>{const r=owRg(m.geometry);return[m.geometry,r[1],r[2]];}),out);b.blk.dstart=ds;b.blk.dcount=dn;}
    const mesh=new THREE.Mesh(owBlockGeo(out,nv=>({aS:new Float32Array(nv)})),OWBLK_MAT);mesh.castShadow=false;mesh.receiveShadow=true;mesh.name='block';v.g.add(mesh);{const kk=key.split(','),x0=+kk[0]*OWB_CELL,z0=+kk[1]*OWB_CELL;mesh.userData.lod={iF,iC,iAll:out.ni,x0,x1:x0+OWB_CELL,z0,z1:z0+OWB_CELL,near:true};{const V=OW.villages.find(q=>q.g===v.g)||v;(V.blkLod||(V.blkLod=[])).push(mesh);}/* (the village itself: the streamed world merges a cell at a time and passes {buildings, g}) */mesh.geometry.setDrawRange(iF,Infinity);}
    for(const[b]of parts){b.blk.m=mesh;b.blk.attr=mesh.geometry.attributes.aS;}
    /* the glass */
    if(ng){const go=owNewOut(ng);
      for(const[b]of parts){const gm=b.meshes.g;if(!gm||!gm.geometry.attributes.position)continue;const start=go.nv,nv=owMergeLocal(b,[gm.geometry],go);b.gblk={start,count:nv};b.blk.layers.push(gm);}
      const gmesh=new THREE.Mesh(owBlockGeo(go,nv=>({aS:new Float32Array(nv),aN:new Float32Array(nv),aL:new Float32Array(nv)})),OWGLASS_BLK);gmesh.castShadow=false;gmesh.receiveShadow=false;gmesh.renderOrder=1;gmesh.name='blockGlass';v.g.add(gmesh);
      for(const[b]of parts)if(b.gblk){b.gblk.attrS=gmesh.geometry.attributes.aS;b.gblk.attrN=gmesh.geometry.attributes.aN;b.gblk.near=0;if(owiLitOf(b))gmesh.geometry.attributes.aL.array.fill(1,b.gblk.start,b.gblk.start+b.gblk.count);}}
    for(const[b]of parts)owShadowMode(b);}}
/* a building uses the merged meshes (use = true) or its own */
function owBlockUse(b,use){const k=b.blk;if(!k)return;
  if(k.state!==use){const a=k.attr,v0=use?0:1;a.array.fill(v0,k.start,k.start+k.count);if(k.fcount)a.array.fill(v0,k.fstart,k.fstart+k.fcount);if(k.dcount)a.array.fill(v0,k.dstart,k.dstart+k.dcount);/* (its far-only parts and its dressing too: environment upgrade 12) */const lo=Math.min(k.start,k.fcount?k.fstart:k.start),hi=Math.max(k.start+k.count,k.dcount?k.dstart+k.dcount:0);a.updateRange.offset=lo;a.updateRange.count=hi-lo;a.needsUpdate=true;
    const g=b.gblk;if(g){g.attrS.array.fill(use?0:1,g.start,g.start+g.count);g.attrS.updateRange.offset=g.start;g.attrS.updateRange.count=g.count;g.attrS.needsUpdate=true;}k.state=use;}
  if(use)for(const m of k.layers)m.visible=false;
  else if(b.meshes.s)b.meshes.s.visible=true;/* the entrance steps are a layer of the block like the walls, but owBldVis does not reset them: without this they stayed hidden once the house had been in the block (see tests/ext-stairs.js) */}
/* the window glass of a building becomes transparent when its interior is loaded, a dark pane when it is not */
const OWG_ANIM=new Set();
function owGlassNear(b,near){const g=b.gblk;if(!g)return;g.tgt=near?1:0;if(g.near!==g.tgt)OWG_ANIM.add(b);}
function owGlassAnim(dt){for(const b of OWG_ANIM){const g=b.gblk;if(!g){OWG_ANIM.delete(b);continue;}const d=g.tgt-g.near,v=Math.abs(d)<.03?g.tgt:g.near+Math.sign(d)*Math.min(Math.abs(d),dt*2.2);g.near=v;g.attrN.array.fill(v,g.start,g.start+g.count);g.attrN.updateRange.offset=g.start;g.attrN.updateRange.count=g.count;g.attrN.needsUpdate=true;if(v===g.tgt)OWG_ANIM.delete(b);}}


/* the dressing near, the plain buildings far (environment upgrade 12): a block is near when the camera is within OWDET_D of its cell, a house drawn by its own meshes when it is
   within OWDET_D (+10) of the house; near draws [far-only end, end), far [0, always end). Every 6th frame, or when the view is forced. */
let _owDetK=0;
function owDetLod(cp,force){if(!force&&(_owDetK++%6))return;const D=OWDET_D*Math.min(1.6,Math.max(.75,OW_CFG.viewDist/OW_CFG.rd0));/* (the distance grows and shrinks with the render distance) */
  for(const v of OW.villages){if(!v.g||!v.g.parent)continue;
    if(v.bridges)for(const br of v.bridges){const near=Math.hypot(br.x-cp.x,br.z-cp.z)<D+10;if(near===br.near)continue;br.near=near;const g=br.m.geometry,u=g.userData;if(u&&u.nb!=null){if(near)g.setDrawRange(u.nf||0,Infinity);else g.setDrawRange(0,u.nb);}}
    if(v.blkLod)for(const m of v.blkLod){const L=m.userData.lod,dx=Math.max(L.x0-cp.x,0,cp.x-L.x1),dz=Math.max(L.z0-cp.z,0,cp.z-L.z1),near=Math.hypot(dx,dz)<D;
      if(near!==L.near){L.near=near;if(near)m.geometry.setDrawRange(L.iF,Infinity);else m.geometry.setDrawRange(0,L.iC);}}
    for(const b of v.buildings){if(b.blk&&b.blk.state===true)continue;const near=Math.hypot(b.x-cp.x,b.z-cp.z)<D+10;if(near===b._detN)continue;b._detN=near;
      for(const k in b.meshes){const g=b.meshes[k].geometry,u=g&&g.userData;if(!u||u.nb==null)continue;if(near)g.setDrawRange(u.nf||0,Infinity);else g.setDrawRange(0,u.nb);}}}}
