/* =====================================================================================================
   LANDMARKS (src/world/wfeat.js): the shapes a height field cannot hold - the great stone RINGS of the lake region (picture 12)
   and the natural ARCHES of the tablelands (pictures 14 and 16).
   A ring is a thick rough torus standing upright, sunk into the ground or the water by a part of its height; an arch is a part of such a ring with
   its feet on the ground and a flatter, broader crown. Both are rock meshes drawn with the ground's own material (so they take the same rock,
   with moss and grass where they face up - their crowns are green), at two levels of detail, out to several kilometres.
   Their places are a pure function of the seed (a cell of WF.cell each, a chance in the right region), like everything else in the world.
   THE GREAT ELDER CIRCLE of each elderglade (wgGreat: its mountain is part of the land) is a landmark too: its ring stands across the summit, drawn
   by wring.js (whole, heavily overgrown), built and shown from much farther off than the others - its stone shows through the haze (wtMaterialSee).
   No ordinary ring stands on its mountain.
   ===================================================================================================== */
const WF={cell:620,on:false,list:new Map(),great:new Map(),group:null,near:3200,far:6500,built:0,seeK:2.6,ms:2};
/* the landmark of a cell, or null */
function wfSite(a,b){const k=wgKey(a,b);if(WF.list.has(k))return WF.list.get(k);const s=WG.seed,C=WF.cell;let f=null;
  const x=(a+.2+.6*wnHash(a,b,s+301))*C,z=(b+.2+.6*wnHash(a,b,s+302))*C,RW=wgRegions(x,z,new Float64Array(4)),h=wnHash(a,b,s+303);
  if(RW[3]>.7&&h<.5){/* a ring: 100-300 m across, a tenth of that thick; it stands across the line it faces, sunk a fifth to a third of its height */
    const R=50+100*Math.pow(wnHash(a,b,s+304),1.4),th=R*(.085+.05*wnHash(a,b,s+305));f={kind:'ring',a,b,x,z,R,th,yaw:wnHash(a,b,s+306)*Math.PI,tilt:(wnHash(a,b,s+307)-.5)*.16,sink:R*(.18+.18*wnHash(a,b,s+308)),arc:1};}
  else if(RW[2]>.75&&h<.42){/* an arch in the tablelands: a half ring or more, on the valley floor, its crown flattened and broad */
    const R=30+55*wnHash(a,b,s+314),th=R*(.16+.08*wnHash(a,b,s+315));f={kind:'arch',a,b,x,z,R,th,yaw:wnHash(a,b,s+316)*Math.PI,tilt:0,sink:R*(.05+.25*wnHash(a,b,s+318)),arc:.5+.12*wnHash(a,b,s+319)};}
  if(f&&f.kind==='ring'){const G=wgGreatNear(x,z);if(G&&wgGreatQ(G,x,z)<1.1+(f.R+40)/G.Rb)f=null;}/* (the great mountain stands clear) */
  if(f){/* it stands on the lowest ground of its feet (or the water) */const ca=Math.cos(f.yaw),sa=Math.sin(f.yaw),span=f.R*Math.sin(Math.PI*Math.min(1,f.arc+.0)*.5+0)*1;
    const hA=wgHeightRaw(x+ca*f.R*.92,z+sa*f.R*.92),hB=wgHeightRaw(x-ca*f.R*.92,z-sa*f.R*.92),hC=wgHeightRaw(x,z);f.y=Math.max(WG_CFG.WL-.5,Math.min(hA,hB,hC));f.id=wnHash(a,b,s+320)*100;}
  WF.list.set(k,f);return f;}
/* the mesh: a tube along the circle (or the part of it that is an arch), its cross section rough - pushed in and out by ridged noise in 3D -
   thicker in places, the crown of an arch broad and flat on top */
function wfGeo(f,lod){const nA=lod?40:72,nS=lod?6:9,/* (big planes: the ground material draws each facet as chiselled stone) */R=f.R,arc=f.arc,a0=Math.PI*(1-arc)*0+(arc<1?Math.PI*(.5-arc):-Math.PI*.5),a1=arc<1?Math.PI*(.5+arc):Math.PI*1.5;
  const N=WG.N,pos=[],nrm=[],aA=[],aB=[],aW=[],idx=[],ca=Math.cos(f.yaw),sa=Math.sin(f.yaw),ct=Math.cos(f.tilt),st=Math.sin(f.tilt);
  const ring=arc>=1,cols=ring?nA:nA+1;
  for(let i=0;i<cols;i++){const t=ring?i/nA:i/nA,ang=a0+(a1-a0)*(t+(ring||(i>0&&i<nA)?(wnHash(i,Math.round(f.x),7771)-.5)*.5/nA:0)),cx=Math.cos(ang)*R,cy=Math.sin(ang)*R;/* (its sections a little uneven, so its facets are cut stone, not a grid) *//* centre of the tube in the ring's plane (x across, y up) */
    const tx=-Math.sin(ang),ty=Math.cos(ang);/* tangent */
    const thick=f.th*(1+.28*wnN(N[9],Math.cos(ang)*1.7+f.id,Math.sin(ang)*1.7)+.12*wnN(N[9],Math.cos(ang)*5.1-f.id,Math.sin(ang)*5.1));
    const crown=f.kind==='arch'?wnS(cy/R,.55,1):0;
    for(let j=0;j<nS;j++){const ph=(j+(wnHash(i*31+j,Math.round(f.z),7772)-.5)*.45)/nS*Math.PI*2;/* the section: radial (in the plane, out from the centre) and across the plane (z) */
      let rx=Math.cos(ph),rz=Math.sin(ph);let r=thick*(1+crown*.5*Math.max(0,rz*rz-.3));
      /* the crown of an arch: flattened on top, broad */
      let ox=(tx*0+Math.cos(ang))*rx*r,oy=Math.sin(ang)*rx*r,oz=rz*r*(1+crown*.6);
      let px=cx+ox,py=cy+oy;if(crown>0&&py>R*.9)py=R*.9+(py-R*.9)*(1-crown*.6);
      /* world position before the rock noise: rotate the ring's plane by yaw (x across -> world xz), lean it by tilt */
      let wx0=px*ca-oz*sa*ct,wy=py*ct+oz*st,wz0=px*sa+oz*ca*ct;
      const X=f.x+wx0,Z=f.z+wz0,Y=f.y-f.sink+R+wy;
      /* rock: ridged noise pushing the surface in and out along the section's normal */
      const nx=Math.cos(ang)*rx*ca-rz*sa,ny=Math.sin(ang)*rx,nz=Math.cos(ang)*rx*sa+rz*ca,nl=Math.hypot(nx,ny,nz)||1;
      const dsp=r*(.32*(wnRidged(N[18],(X+Y*.7)/(R*.22),(Z-Y*.5)/(R*.22),lod?1:3,2.1,.5,1,2)-.45)+.12*wnN(N[19],(X-Y)/(R*.07),(Z+Y)/(R*.07))*(lod?0:1));
      pos.push(X+nx/nl*dsp,Y+ny/nl*dsp,Z+nz/nl*dsp);aA.push(0,f.kind==='arch'?1:0,f.kind==='ring'?1:0,0);aB.push(0,.5,0,f.kind==='arch'?.75:.45);aW.push(-1e4);}}
  for(let i=0;i<(ring?nA:nA);i++)for(let j=0;j<nS;j++){const i2=ring?(i+1)%nA:i+1,j2=(j+1)%nS,a=i*nS+j,b=i2*nS+j,c=i*nS+j2,d=i2*nS+j2;idx.push(a,b,c,b,d,c);}
  if(!ring){/* caps at the feet (buried, but closed) */for(const i of[0,nA]){const c0=pos.length/3;let mx=0,my=0,mz=0;for(let j=0;j<nS;j++){mx+=pos[(i*nS+j)*3];my+=pos[(i*nS+j)*3+1];mz+=pos[(i*nS+j)*3+2];}
      pos.push(mx/nS,my/nS,mz/nS);aA.push(0,1,0,0);aB.push(0,.5,0,0);aW.push(-1e4);for(let j=0;j<nS;j++){const a=i*nS+j,b=i*nS+(j+1)%nS;if(i===0)idx.push(c0,b,a);else idx.push(c0,a,b);}}}
  /* local to its centre (precision), normals, attributes */
  const P=new Float32Array(pos.length);for(let q=0;q<pos.length;q+=3){P[q]=pos[q]-f.x;P[q+1]=pos[q+1];P[q+2]=pos[q+2]-f.z;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setIndex(idx);g.computeVertexNormals();
  const A=new Uint8Array(aA.map(v=>v*255)),B=new Uint8Array(aB.map(v=>Math.round(v*255)));g.setAttribute('aA',new THREE.BufferAttribute(A,4,true));g.setAttribute('aB',new THREE.BufferAttribute(B,4,true));g.setAttribute('aW',new THREE.Float32BufferAttribute(aW,1));
  /* hollows of the rock darker: a cavity from how much the normals of a vertex's neighbours turn towards it (cheap: from the noise displacement sign) */
  g.computeBoundingSphere();return g;}
/* the Great Elder Circle of an elderglade as a landmark: its ring stands on the summit of its mountain, at the height of the ground at its middle */
function wfGreat(G){const k=wgKey(G.a,G.b);let f=WF.great.get(k);if(f)return f;
  f={kind:'great',a:G.a*7+401,b:G.b*7-401,x:G.x,z:G.z,R:G.R,th:G.th,yaw:G.yaw,tilt:0,sink:G.sink,arc:1,id:G.id,G,y:wgHeightRaw(G.x,G.z)};WF.great.set(k,f);return f;}
function wfMesh(f){if(f.mesh)return f.mesh;if(f.kind==='great'&&!f.mat)f.mat=wtMaterialSee(f.y,f.R,f.x,f.z);
  if((f.kind==='ring'||f.kind==='great')&&typeof wrMesh==='function'){f.mesh=wrMesh(f);WF.built++;return f.mesh;}/* (the rings of the elderglade, each its own: wring.js) */
  const g0=wfGeo(f,0),g1=wfGeo(f,1),mat=wtMaterial();const lod=new THREE.LOD();
  const m0=new THREE.Mesh(g0,mat),m1=new THREE.Mesh(g1,mat);for(const m of[m0,m1]){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;}
  lod.addLevel(m0,0);lod.addLevel(m1,f.R*7);lod.position.set(f.x,0,f.z);lod.autoUpdate=true;f.mesh=lod;WF.built++;return lod;}
/* per frame (cheap): the landmarks within reach are shown, the others hidden (and dropped when far) */
function wfUpdate(cam,force){if(!WF.on)return;if(typeof wrkView==='function')wrkView(cam,force);if(typeof wrView==='function')wrView(cam,force);/* (a ring's near level, wring.js) */const C=WF.cell,cx=cam.x,cz=cam.z,r=Math.ceil(WF.far/C),a0=Math.floor(cx/C),b0=Math.floor(cz/C);let built=0;
  /* (cells within 1.5 km are always looked at; a cell farther out not looked at before waits for a frame with time left - WF.ms: with a long Detail distance
     a thousand cells come into reach at once, and a ring's cell samples the ground) */
  const T0=performance.now(),nr=Math.ceil(1500/C);
  for(let b=b0-r;b<=b0+r;b++)for(let a=a0-r;a<=a0+r;a++){if(!force&&(Math.abs(a-a0)>nr||Math.abs(b-b0)>nr)&&!WF.list.has(wgKey(a,b))&&performance.now()-T0>WF.ms)continue;const f=wfSite(a,b);if(!f)continue;const d=Math.hypot(f.x-cx,f.z-cz);const want=d<WF.far+f.R;
    if(want){if(!f.mesh){if(force?d>2600:built>0)continue;wfMesh(f);built++;}if(!f.mesh.parent)WF.group.add(f.mesh);}else if(f.mesh&&f.mesh.parent)WF.group.remove(f.mesh);}
  for(const f of WF.list.values()){if(f&&f.mesh&&Math.hypot(f.x-cx,f.z-cz)>WF.far*1.6){WF.group.remove(f.mesh);f.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});f.mesh=null;}}
  /* the Great Elder Circles: built and shown out to where their stone fades in the haze (WF.seeK times the end of the air) */
  const see=Math.max(WF.far,Math.min(6200,Math.max(800,WF.far-250)*WF.seeK)),RC=WG_CFG.regionCell,ra=Math.ceil((see+4000)/RC),ga=Math.round(cx/RC),gb=Math.round(cz/RC);
  for(let b=gb-ra;b<=gb+ra;b++)for(let a=ga-ra;a<=ga+ra;a++){const r=wgRegCell(a,b);if(r.type!==WG_T.GLADE)continue;const G=wgGreat(r);if(!G)continue;const d=Math.hypot(G.x-cx,G.z-cz),want=d<see+G.R;
    const f=want?wfGreat(G):WF.great.get(wgKey(a,b));if(!f)continue;
    if(want){if(!f.mesh){if(force?d>see+G.R:built>0)continue;wfMesh(f);built++;}if(!f.mesh.parent)WF.group.add(f.mesh);}else if(f.mesh&&f.mesh.parent)WF.group.remove(f.mesh);}
  for(const f of WF.great.values())if(f.mesh&&Math.hypot(f.x-cx,f.z-cz)>see*1.5+f.R){WF.group.remove(f.mesh);f.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});f.mesh=null;}
  /* the haze's top over the nearest four shown (wterrain.js WT.gU, wdepth.js WD_PED) */
  if(typeof WT!=='undefined'&&WT.gU){const L=[...WF.great.values()].filter(f=>f.mesh&&f.mesh.parent).sort((p,q)=>Math.hypot(p.x-cx,p.z-cz)-Math.hypot(q.x-cx,q.z-cz));
    for(let i=0;i<4;i++){const f=L[i];if(f)WT.gU[i].set(f.x,f.z,f.y,f.R);else WT.gU[i].set(0,0,0,0);}}}
function wfInit(group){WF.group=group;WF.on=true;if(typeof wrkInit==='function')wrkInit(group);/* (the stone on the cliffs near the player, wrock.js) */}
function wfReset(){if(typeof wrkReset==='function')wrkReset();for(const f of[...WF.list.values(),...WF.great.values()])if(f&&f.mesh){if(f.mesh.parent)f.mesh.parent.remove(f.mesh);f.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  for(const f of WF.great.values()){if(f.mat)f.mat.dispose();if(f.vmat)f.vmat.dispose();}WF.list.clear();WF.great.clear();WF.on=false;}

