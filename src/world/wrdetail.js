/* =====================================================================================================
   THE RIVER GROUND IN DETAIL (src/world/wrdetail.js, river look): the ground's 2 m lattice cannot hold the mockup's banks (a cut bank of a metre, a lip,
   a levee, the shore's wobble), so near the camera the ground along a stream is drawn again at 0.5 m - the mockup's own ground spacing (0.57 m) - from
   the same function (wgGrid: the land, rivBank, the settlements' stamps) and with the same material (the ground's: meadow, the river's bed and earth bank).
   Plumbing only (HANDOFF R1: how meshes are chunked, LOD): nothing about the look changes.
   - Which ground: per level-0 tile, the 8 m blocks (4 x 4 lattice cells) holding a lattice vertex of a stream's bank (aWd > -9: the bank and its .3 m
     margin), and their neighbours (the levee's 4 m blend) - the tile's mask, made with its chunk (wtBuild: wrdMask).
   - The heights: a world worker works out each block at 0.5 m with a 2 m ring (wgGrid, the same code as the tiles), sent back packed; the hollows and
     crests (cav) and the rock floor are measured over 2 m, as the lattice's, so the meadow's shading meets the lattice's without a seam.
   - The mesh: one per tile, the blocks' 17 x 17 vertices each with a short skirt; the lattice under it is lowered 0.6 m inside the mask (its chunk takes the
     ground material's WT_RD variant while the detail is shown: wtRdSet), so the two never fight; the game's heights there are the detail's (wtHt).
   - Within WRD.R of the camera, built by idle workers only (the ground's own tiles never wait), dropped beyond WRD.R + 40 m.
   ===================================================================================================== */
const WRD={R:150,tiles:new Map(),pend:new Map(),on:true,stats:{built:0,ms:0,wms:0,blocks:0}};
/* a tile's mask of 16 x 16 blocks (1: drawn in detail) from its lattice's river values, and which lattice vertices lie inside it (all their cells in the
   mask: those are lowered) - null when the tile has no stream's bank */
function wrdMask(g){if(!g.rv)return null;const n=g.n,s=n+1,B=n>>2,m=new Uint8Array(B*B);let any=false;
  for(let k=0;k<=n;k++)for(let i=0;i<=n;i++){if(g.rv[(k*s+i)*2]<=-8.5)continue;any=true;
    for(const bk of[k>>2,(k-1)>>2])for(const bi of[i>>2,(i-1)>>2])if(bi>=0&&bk>=0&&bi<B&&bk<B)m[bk*B+bi]=1;}
  if(!any)return null;const d=new Uint8Array(B*B);/* (one block round: the levee's blend) */
  for(let bk=0;bk<B;bk++)for(let bi=0;bi<B;bi++){if(!m[bk*B+bi])continue;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const x=bi+a,z=bk+b;if(x>=0&&z>=0&&x<B&&z<B)d[z*B+x]=1;}}
  const low=new Uint8Array(s*s);let nl=0;const inM=(ci,ck)=>ci>=0&&ck>=0&&ci<n&&ck<n?d[(ck>>2)*B+(ci>>2)]:1;/* (cells outside the tile count as in: a crack at the border is under the detail's skirt) */
  for(let k=0;k<=n;k++)for(let i=0;i<=n;i++)if(inM(i-1,k-1)&&inM(i,k-1)&&inM(i-1,k)&&inM(i,k)){low[k*s+i]=1;nl++;}
  return{m:d,low,nl};}
/* the blocks of a tile from an idle worker (cb gets the packed arrays); false if no worker is free */
function wrdAsk(t,cb){let w=null;for(const p of WT.pool)if(!p.dead&&!p.busy&&!p.hjob){w=p;break;}if(!w)return false;
  const B=16,bl=[];for(let i=0;i<B*B;i++)if(t.rdm.m[i])bl.push(i);if(!bl.length)return false;const S=WG_CFG.tile,st=WG.stampsIn?WG.stampsIn(t.x0-4,t.z0-4,t.x0+S+4,t.z0+S+4):null;
  const id=++WT.reqId;WT.reqs.set(id,{key:'rd'+t.ti+','+t.tk,cb});w.busy++;w.postMessage({rd:1,id,x0:t.x0,z0:t.z0,bl:Int16Array.from(bl),st});return true;}
/* a tile's detail mesh from the worker's arrays; the tile's heights there are the detail's from now on */
function wrdBuild(t,bl,F){const T0=performance.now(),nb=bl.length,M=17,V=nb*(M*M+4*M),pos=new Float32Array(V*3),nr=new Int8Array(V*3),aA=new Uint8Array(V*4),aB=new Uint8Array(V*4),aW=new Float32Array(V),aR=new Float32Array(V*3),aP=new Int8Array(V*2),idx=[];
  const OC=wrdOccOf(t);/* (the contact shade of the stones near: wrstone.js) */
  const map=new Int16Array(256).fill(-1),H=new Float32Array(nb*M*M),N=WRD_N+1;let v=0,ymin=1e9,ymax=-1e9;
  for(let b=0;b<nb;b++){const bi=bl[b]&15,bk=bl[b]>>4,o=b*WRD_F,v0=v;map[bl[b]]=b;const at=(i,k)=>o+((k+4)*N+(i+4))*13,hq=(i,k)=>F[at(i,k)];
    for(let k=0;k<M;k++)for(let i=0;i<M;i++){const p=at(i,k),h=F[p];H[b*M*M+k*M+i]=h;pos[v*3]=bi*8+i*.5;pos[v*3+1]=h;pos[v*3+2]=bk*8+k*.5;if(h<ymin)ymin=h;if(h>ymax)ymax=h;
      nr[v*3]=Math.round(F[p+1]*127);nr[v*3+1]=Math.round(F[p+2]*127);nr[v*3+2]=Math.round(F[p+3]*127);
      for(let c=0;c<4;c++)aA[v*4+c]=Math.round(Math.max(0,Math.min(1,F[p+7+c]))*255);
      /* (hollows and crests over 2 m, and the rock floor's steepest neighbour over 2 m: as the lattice measures them) */
      const cav=(hq(i-4,k)+hq(i+4,k)+hq(i,k-4)+hq(i,k+4))*.25-h;let smax=0;for(let dk=-1;dk<=1;dk++)for(let di=-1;di<=1;di++){if(!di&&!dk)continue;const dh=Math.abs(hq(i+di*4,k+dk*4)-h)/(2*Math.hypot(di,dk));if(dh>smax)smax=dh;}
      aB[v*4]=Math.round(Math.max(0,Math.min(1,F[p+11]))*255);aB[v*4+1]=Math.round((Math.max(-1,Math.min(1,cav/1.2))*.5+.5)*255);aB[v*4+2]=Math.round(Math.max(0,Math.min(1,F[p+12]))*255);aB[v*4+3]=Math.round(WRB.S(.95,1.6,smax)*.9*255);
      aW[v]=F[p+6]>-1e8?F[p+6]:-1e4;aR[v*3]=F[p+4];aR[v*3+1]=F[p+5];aR[v*3+2]=OC(t.x0+bi*8+i*.5,t.z0+bk*8+k*.5);v++;}
    for(let k=0;k<16;k++)for(let i=0;i<16;i++){const a=v0+k*M+i,c=a+1,d=a+M,e=d+1;if(((i+k)&1)===0)idx.push(a,d,c,c,d,e);else idx.push(a,d,e,a,e,c);}
    /* the skirt: the block's rim again, 0.6 m down (no slit where it meets the lattice) */
    const rim=[];for(let i=0;i<M;i++)rim.push(i);for(let k=1;k<M;k++)rim.push(k*M+M-1);for(let i=M-2;i>=0;i--)rim.push((M-1)*M+i);for(let k=M-2;k>0;k--)rim.push(k*M);
    const r0=v;for(const q of rim){const s=v0+q;pos[v*3]=pos[s*3];pos[v*3+1]=pos[s*3+1]-.6;pos[v*3+2]=pos[s*3+2];for(let c=0;c<3;c++)nr[v*3+c]=nr[s*3+c];for(let c=0;c<4;c++){aA[v*4+c]=aA[s*4+c];aB[v*4+c]=aB[s*4+c];}aW[v]=aW[s];aR[v*3]=aR[s*3];aR[v*3+1]=aR[s*3+1];aR[v*3+2]=aR[s*3+2];v++;}
    for(let j=0;j<rim.length;j++){const a=v0+rim[j],c=v0+rim[(j+1)%rim.length],d=r0+j,e=r0+(j+1)%rim.length;idx.push(a,c,d,c,e,d);}}
  const g=new THREE.BufferGeometry(),sub=x=>x.subarray?x.subarray(0,v*(x.length/V)):x;
  g.setAttribute('position',new THREE.BufferAttribute(sub(pos),3));g.setAttribute('normal',new THREE.BufferAttribute(sub(nr),3,true));g.setAttribute('aA',new THREE.BufferAttribute(sub(aA),4,true));
  g.setAttribute('aB',new THREE.BufferAttribute(sub(aB),4,true));g.setAttribute('aW',new THREE.BufferAttribute(sub(aW),1));g.setAttribute('aPu',new THREE.BufferAttribute(sub(aP),2,true));g.setAttribute('aRv',new THREE.BufferAttribute(sub(aR),3));
  g.setIndex(idx);g.boundingSphere=new THREE.Sphere(new THREE.Vector3(64,(ymin+ymax)/2,64),Math.hypot(91,(ymax-ymin)/2+1));
  const m=new THREE.Mesh(g,wtRdMat());m.position.set(t.x0,0,t.z0);m.receiveShadow=true;m.matrixAutoUpdate=false;m.updateMatrix();m.userData.keep=1;
  t.rd={map,H};WRD.stats.built++;WRD.stats.blocks+=nb;WRD.stats.ms+=performance.now()-T0;return m;}
/* the contact shade at x, z from the stones' solids near a tile (the mockup's aOcc: WRL.occAt over the solids within 4 m, by 4 m cell) */
function wrdOccOf(t){const L=typeof wrsSolidsIn==='function'?wrsSolidsIn(t.x0-4,t.z0-4,t.x0+132,t.z0+132):[];if(!L.length)return()=>0;const G=new Map();
  for(const q of L){const k=Math.floor(q[0]/4)+','+Math.floor(q[1]/4);(G.get(k)||G.set(k,[]).get(k)).push(q);}
  return(x,z)=>{const a=Math.floor(x/4),b=Math.floor(z/4),N=[];for(let j=b-1;j<=b+1;j++)for(let i=a-1;i<=a+1;i++){const c=G.get(i+','+j);if(c)for(const q of c)N.push(q);}return N.length?WRL.occAt(x,z,N):0;};}
/* new solids in a box (a stream piece's stones done): the contact shade of the detail meshes there again */
function wrsOccRefresh(bb){const S=WG_CFG.tile;for(const e of WRD.tiles.values()){const t=e.t;if(!e.mesh||t.x0>bb[2]+4||t.x0+S<bb[0]-4||t.z0>bb[3]+4||t.z0+S<bb[1]-4)continue;
    const OC=wrdOccOf(t),g=e.mesh.geometry,P=g.getAttribute('position').array,A=g.getAttribute('aRv');for(let v=0;v<A.count;v++)A.array[v*3+2]=OC(t.x0+P[v*3],t.z0+P[v*3+2]);A.needsUpdate=true;}}
/* the detail's height at x, z (null outside it): its triangles, as drawn */
function wrdHt(t,x,z){const fx=(x-t.x0)/8,fz=(z-t.z0)/8,bi=Math.floor(fx),bk=Math.floor(fz);if(bi<0||bk<0||bi>15||bk>15)return null;const b=t.rd.map[bk*16+bi];if(b<0)return null;
  let u=(fx-bi)*16,w=(fz-bk)*16;const i=Math.min(15,u|0),k=Math.min(15,w|0);u-=i;w-=k;const H=t.rd.H,o=b*289+k*17+i,a=H[o],c=H[o+1],d=H[o+17],e=H[o+18];
  if(((i+k)&1)===0)return u+w<=1?a+(c-a)*u+(d-a)*w:e+(c-e)*(1-w)+(d-e)*(1-u);
  return u>=w?a+(c-a)*u+(e-c)*w:a+(d-a)*w+(e-d)*u;}
/* the detail's material: the ground's own (not pushed into the rock: its aPu is 0), drawn a hair nearer so it wins where it meets the lattice */
function wtRdMat(){if(WRD.mat)return WRD.mat;const m=wtGroundMat().clone();m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-2;m.onBeforeCompile=wtGroundMat().onBeforeCompile;m.customProgramCacheKey=wtGroundMat().customProgramCacheKey;return WRD.mat=m;}
/* a level-0 chunk's lattice lowered under the detail (its WT_RD material) or not */
function wtRdSet(ti,tk,on){const ch=WT.chunks.get(wtKey(0,ti,tk));if(!ch)return;ch.mesh.material=on&&ch.rdl?wtGroundMatRd():wtGroundMat();}
/* per frame: the tiles within WRD.R asked for (nearest first), the far ones dropped */
function wrdUpdate(cam){if(!WRD.on||!WT.group)return;const S=WG_CFG.tile,R=WRD.R,now=performance.now();
  for(const[k,tm]of WRD.pend)if(now-tm>15000)WRD.pend.delete(k);
  let best=null;
  for(const t of WT.tiles.values()){if(!t.rdm)continue;const key=t.ti+','+t.tk,d=Math.hypot(Math.max(0,Math.abs(t.x0+S/2-cam.x)-S/2),Math.max(0,Math.abs(t.z0+S/2-cam.z)-S/2));
    const e=WRD.tiles.get(key);if(e){if(e.t!==t||d>R+40){wrdDrop(key,e);}continue;}if(d>R||WRD.pend.has(key))continue;if(!best||d<best.d)best={t,d,key};}
  if(best&&WRD.pend.size<2){const t=best.t,key=best.key;if(wrdAsk(t,F=>wrdTake(t,key,F)))WRD.pend.set(key,now);}
  for(const[key,e]of WRD.tiles){if(WT.tiles.get(key)!==e.t)wrdDrop(key,e);else if(e.mesh&&!e.mesh.parent&&WT.group)WT.group.add(e.mesh);wtRdSet(e.t.ti,e.t.tk,true);}}
function wrdTake(t,key,F){WRD.pend.delete(key);if(!WRD.on||WT.tiles.get(key)!==t||!t.rdm)return;const bl=[];for(let i=0;i<256;i++)if(t.rdm.m[i])bl.push(i);if(F.length!==bl.length*WRD_F)return;
  const old=WRD.tiles.get(key);if(old)wrdDrop(key,old);const mesh=wrdBuild(t,bl,F);WRD.tiles.set(key,{t,mesh});WT.group.add(mesh);wtRdSet(t.ti,t.tk,true);}
function wrdDrop(key,e){if(e.mesh){if(e.mesh.parent)e.mesh.parent.remove(e.mesh);e.mesh.geometry.dispose();}if(e.t){e.t.rd=null;wtRdSet(e.t.ti,e.t.tk,false);}WRD.tiles.delete(key);}
function wrdReset(){for(const[k,e]of WRD.tiles)wrdDrop(k,e);WRD.tiles.clear();WRD.pend.clear();}
