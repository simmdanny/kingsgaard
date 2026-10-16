/* =====================================================================================================
   THE STREAMED OPEN WORLD, GAME SIDE (src/world/wstream.js): the infinite world generated round the player.
   - The occupancy grid (the game's 1 m cells, grid[r][c]) is a window of WSTR.win cells round the player. When the player has walked
     WSTR.shift m from its middle it moves (by whole tiles): what stays is kept, what comes in is filled from the level-0 tiles
     (steep ground and water closed), the roads, the landmarks and the crossings. A tile is filled when it is made.
   - Villages are built when the player comes within WSTR.load m (their tiles and roads are made first) and unloaded beyond WSTR.unload m;
     what changed in a village (found, damaged, doors) is kept by its key while it is away and saved with the run.
   - Roads join the game's road list (OW.roads: props, the minimap and "near a road" use it) as they are found; a road is drawn on the ground
     in two halves, each with the village at its end (widened and paved as it enters the village).
   - A plain crossing (a level deck at the road's height) carries a road over a stream.
   ===================================================================================================== */
const WSTR={win:2048,shift:192,load:560,unload:780,prefetch:760,cx:0,cz:0,filled:new Set(),vs:{},decks:[],drawn:new Set(),busy:false,stats:{vb:0,vms:0,shifts:0}};
/* ---------- the grid window ---------- */
function wstGridInit(cx,cz){const n=WSTR.win;owResetGrid(n,n,1);for(let r=0;r<n;r++)grid[r].fill(2);/* (closed until its tile is made) */
  WSTR.cx=Math.round(cx/WG_CFG.tile)*WG_CFG.tile;WSTR.cz=Math.round(cz/WG_CFG.tile)*WG_CFG.tile;OX=(W-1)/2-WSTR.cx/TS;OZ=(H-1)/2-WSTR.cz/TS;WSTR.filled.clear();
  for(const t of WT.tiles.values())wstGridTile(t);}
/* the cells of one level-0 tile: closed where it is too steep to walk or the water is deeper than a hand (from the triangles the ground is drawn with),
   then the roads (open), the feet of the landmarks (closed) and the crossings (open) */
function wstGridTile(t){const S=WG_CFG.tile,c0=Math.round(t.x0/TS+OX+.5),r0=Math.round(t.z0/TS+OZ+.5);if(c0<0||r0<0||c0+S>W||r0+S>H)return false;const key=t.ti+','+t.tk;
  const g=t.g,n=g.n,s=n+1,h=g.h,wl=g.wl,sm=OW_CFG.slopeMax2||.72;
  for(let k=0;k<S;k++){const row=grid[r0+k],fz=(k+.5)/2,kk=Math.min(n-1,fz|0),v=fz-kk;
    for(let i=0;i<S;i++){const fx=(i+.5)/2,ii=Math.min(n-1,fx|0),u=fx-ii,q=kk*s+ii,a=h[q],b=h[q+1],d=h[q+s],e=h[q+s+1];let gx,gz;
      if(((ii+kk)&1)===0){if(u+v<=1){gx=b-a;gz=d-a;}else{gx=e-d;gz=e-b;}}else{if(u>=v){gx=b-a;gz=e-b;}else{gx=e-d;gz=d-a;}}
      const sl=Math.sqrt(gx*gx+gz*gz)/2;let cl=sl>sm;
      if(!cl){const w0=wl[q],w1=wl[q+1],w2=wl[q+s],w3=wl[q+s+1];if(w0>-1e8||w1>-1e8||w2>-1e8||w3>-1e8){const W0=Math.max(w0,w1,w2,w3),hh=(a+b+d+e)*.25;if(W0-hh>.3)cl=true;}}
      row[c0+i]=cl?2:0;}}
  const x0=t.x0,z0=t.z0,x1=x0+S,z1=z0+S,hw=WS_CFG.roadHalf;
  for(let tz=Math.floor((z0-4)/8);tz<=Math.floor((z1+4)/8);tz++)for(let tx=Math.floor((x0-4)/8);tx<=Math.floor((x1+4)/8);tx++){const L=WS.rh.get(tx+','+tz);if(!L)continue;
    for(let i=0;i<L.length;i+=2){const q=L[i].pts[L[i+1]];if(q[0]<x0-hw||q[0]>x1+hw||q[1]<z0-hw||q[1]>z1+hw)continue;wstMark(q[0],q[1],hw,1,x0,z0,x1,z1);}}
  /* the landmarks' feet are closed: a ring's (and the Great Elder Circle's) where its stone really meets the ground (wring.js wrFeet: a slanting tube
     leaves a long oval); an arch's at its two ends */
  /* (the landmarks that can reach the tile are asked for first, so their feet are known however the player got here - a teleport fills tiles before
     the landmarks' own update has run) */
  {const FC=WF.cell;for(let fb=Math.floor((z0-200)/FC);fb<=Math.floor((z1+200)/FC);fb++)for(let fa=Math.floor((x0-200)/FC);fa<=Math.floor((x1+200)/FC);fa++)wfSite(fa,fb);
    const G=wgGreatNear(x0+S/2,z0+S/2);if(G&&Math.hypot(G.x-x0-S/2,G.z-z0-S/2)<G.R+300)wfGreat(G);}
  for(const f of(typeof wrAll==='function'?wrAll():WF.list.values())){if(!f||f.x+f.R+40<x0||f.x-f.R-40>x1||f.z+f.R+40<z0||f.z-f.R-40>z1)continue;const ca=Math.cos(f.yaw),sa=Math.sin(f.yaw);
    if((f.kind==='ring'||f.kind==='great')&&typeof wrFeet==='function'){for(const p of wrFeet(f)){const n=Math.max(1,Math.ceil(p.half/(p.th*.5))),L=Math.max(0,p.half-p.th);for(let k=-n;k<=n;k++)wstMark(p.x+p.ux*L*k/n,p.z+p.uz*L*k/n,p.th*1.05,2,x0,z0,x1,z1);}continue;}
    for(const sd of[-1,1])for(let k=-6;k<=6;k++){const t2=k/6*.5;wstMark(f.x+ca*f.R*sd*(1-Math.abs(t2)*.2)-sa*f.th*t2*2,f.z+sa*f.R*sd*(1-Math.abs(t2)*.2)+ca*f.th*t2*2,f.th*1.1,2,x0,z0,x1,z1);}}
  for(const dk of WSTR.decks)if(dk.x1>=x0&&dk.x0<=x1&&dk.z1>=z0&&dk.z0<=z1){const L=Math.hypot(dk.bx-dk.ax,dk.bz-dk.az),n2=Math.ceil(L/.6);for(let k=0;k<=n2;k++)wstMark(dk.ax+(dk.bx-dk.ax)*k/n2,dk.az+(dk.bz-dk.az)*k/n2,dk.w/2,1,x0,z0,x1,z1);}
  WSTR.filled.add(key);return true;}
/* mark a disc (only inside a rectangle: the tile being filled) */
function wstMark(x,z,rad,val,x0,z0,x1,z1){const a=owCell(x,z),rc=Math.ceil(rad/TS);for(let r=a.r-rc;r<=a.r+rc;r++)for(let c=a.c-rc;c<=a.c+rc;c++){if(r<0||c<0||r>=H||c>=W)continue;const p=tw(c,r);if(p.x<x0||p.x>=x1||p.z<z0||p.z>=z1)continue;if(Math.hypot(p.x-x,p.z-z)>rad)continue;grid[r][c]=val;}}
/* the window follows the player: moved by whole tiles; the cells that stay are kept, the ones that come in are filled from tiles already made (the others when made) */
function wstGridFollow(fx,fz){const T=WG_CFG.tile;if(Math.abs(fx-WSTR.cx)<WSTR.shift&&Math.abs(fz-WSTR.cz)<WSTR.shift)return;
  const ncx=Math.round(fx/T)*T,ncz=Math.round(fz/T)*T,dc=Math.round((ncx-WSTR.cx)/TS),dr=Math.round((ncz-WSTR.cz)/TS);if(!dc&&!dr)return;
  const T0=performance.now();
  /* the things that know their own cell move with it */
  const units=[];if(heroU)units.push(heroU);for(const t of towers)units.push(t);for(const e of enemies)units.push(e);
  for(const u of units){if(u.c!=null&&grid[u.r]&&grid[u.r][u.c]===u)grid[u.r][u.c]=0;}
  if(dr>0){for(let k=0;k<dr;k++){const row=grid.shift();row.fill(2);grid.push(row);}}else if(dr<0){for(let k=0;k<-dr;k++){const row=grid.pop();row.fill(2);grid.unshift(row);}}
  if(dc){for(const row of grid){if(dc>0){row.copyWithin(0,dc);row.fill(2,W-dc);}else{row.copyWithin(-dc,0,W+dc);row.fill(2,0,-dc);}}}
  WSTR.cx=ncx;WSTR.cz=ncz;OX-=dc;OZ-=dr;
  for(const u of units){if(u.c!=null){u.c-=dc;u.r-=dr;const a=owCell(u.x,u.z);u.c=a.c;u.r=a.r;if(grid[u.r]&&grid[u.r][u.c]===0&&u===heroU)grid[u.r][u.c]=u;}}
  /* which tiles are now whole inside the window and filled: the ones that left are forgotten, the ones that came in are filled if made */
  const keep=new Set();for(const k of WSTR.filled){const[ti,tk]=k.split(',').map(Number),x0=ti*T,z0=tk*T,c0=Math.round(x0/TS+OX+.5),r0=Math.round(z0/TS+OZ+.5);if(c0>=0&&r0>=0&&c0+T<=W&&r0+T<=H)keep.add(k);}
  WSTR.filled=keep;for(const t of WT.tiles.values())if(!keep.has(t.ti+','+t.tk))wstGridTile(t);
  WSTR.stats.shifts++;WSTR.stats.shiftMs=performance.now()-T0;}
/* ---------- roads ---------- */
/* a road found: into the game's road list and its hash, its cells on the grid (in the filled tiles), its crossings built */
WS.onRoad=function(r){if(!OW.on)return;const rd={pts:r.pts,kind:r.B===WS.keep?'village':'link',tag:r.key,ws:r};OW.roads.push(rd);r.ow=rd;if(typeof wtpAddRoad==='function')wtpAddRoad(r);
  if(!OW.rhash)OW.rhash=new Map();r.pts.forEach(q=>{const k=Math.floor(q[0]/8)+','+Math.floor(q[1]/8);(OW.rhash.get(k)||OW.rhash.set(k,[]).get(k)).push(q);});
  for(const c of r.cross)wstDeck(r,c);
  const T=WG_CFG.tile,bb=r.bb;for(let tk=Math.floor(bb[1]/T);tk<=Math.floor(bb[3]/T);tk++)for(let ti=Math.floor(bb[0]/T);ti<=Math.floor(bb[2]/T);ti++){const t=WT.tiles.get(ti+','+tk);if(t&&WSTR.filled.has(ti+','+tk))wstGridTile(t);}
  /* a road to the keep is drawn at once (the keep is always there); its other half waits for its village */
  if(r.B===WS.keep)wstDrawRoad(r,1);for(const v of OW.villages){if(v.site===r.A)wstDrawRoad(r,0);if(v.site===r.B)wstDrawRoad(r,1);}};
/* half of a road on the ground (part 0: from A to the middle, 1: from the middle to B), widened and paved as it enters its village */
function wstDrawRoad(r,part){const key=r.key+':'+part;if(WSTR.drawn.has(key)||!OW.G)return;WSTR.drawn.add(key);if(r.trail)return;/* (a trail is the ground's own mask, wtrail.js: no strip) */const n=r.pts.length,m=Math.floor(n/2);
  let pts=part===0?r.pts.slice(0,m+1):r.pts.slice(m);pts=pts.map(q=>q.slice());const end=part===0?r.A:r.B;const v=OW.villages.find(o=>o.site===end);
  if(v&&v.keepRoadPts&&v.keepRoadKey===r.key){/* the village's own main street: its straightened copy */const kr=v.keepRoadPts;if(part===0)pts=kr.slice(0,m+1).map(q=>q.slice());else pts=kr.slice(0,n-m).map(q=>q.slice()).reverse();}
  const hw=OW_CFG.roadHalf,vs=v&&v.sqr?[v]:[],p=owgMerge(owgGateFit(pts)),pave=[],city=[];let ps=1;
  const w=p.map(q=>{let wv=hw,pl=0,ct=false;for(const vv of vs){const dv=Math.hypot(q[0]-vv.x,q[1]-vv.z);if(dv>vv.rad*1.25+24)continue;const sq=vv.sqr,R0=sq.circle?sq.r:Math.max(sq.a,sq.b)/2,ds=Math.hypot(q[0]-sq.x,q[1]-sq.z),
      f2=1-SMS(dv,vv.rad*.45,vv.rad*1.05),sh=vv.streetHalf||2.2,f1=1-SMS(ds,R0*.85,R0+16);wv=Math.max(wv,hw+(sh-hw)*f2,hw*(1+.9*f1));if(vv.paveAt){const k=vv.paveAt(q[0],q[1]);if(k>pl){pl=k;ps=vv.paveStyle||1;ct=true;}}}
    {const dg=Math.hypot(q[0]-OW.keepGate.x,q[1]-OW.keepGate.z);if(dg<56)wv=Math.max(wv,hw+(4.3-hw)*(1-SMS(dg,8,56)));}pave.push(pl);city.push(ct);return wv;});
  owgPoly(0,p,w,pave,ps,false,city);let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(const q of p){x0=Math.min(x0,q[0]);z0=Math.min(z0,q[1]);x1=Math.max(x1,q[0]);z1=Math.max(z1,q[1]);}wstInvalidate(x0-8,z0-8,x1+8,z1+8);}
/* a plain crossing: a level deck at the road's height over the stream, a little wider than the road, on two sleepers */
function wstDeck(r,c){const p=r.pts,i0=Math.max(0,c.i0-2),i1=Math.min(p.length-1,c.i1+2),a=p[i0],b=p[i1],L=Math.hypot(b[0]-a[0],b[1]-a[1])+1.2,w=3.4,top=c.top;
  const dk={ax:a[0],az:a[1],bx:b[0],bz:b[1],w,top,x0:Math.min(a[0],b[0])-w,x1:Math.max(a[0],b[0])+w,z0:Math.min(a[1],b[1])-w,z1:Math.max(a[1],b[1])+w,ux:(b[0]-a[0])/(L-1.2||1),uz:(b[1]-a[1])/(L-1.2||1),L};
  const g=new THREE.Group(),ang=Math.atan2(b[0]-a[0],b[1]-a[1]),mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;g.position.set(mx,top,mz);g.rotation.y=ang;
  const deck=new THREE.Mesh(new THREE.BoxGeometry(w,.32,L),new THREE.MeshLambertMaterial({color:0xb79f78}));deck.position.y=-.16;deck.castShadow=true;deck.receiveShadow=true;g.add(deck);
  for(const s of[-1,1]){const sl=new THREE.Mesh(new THREE.BoxGeometry(w+.4,.5,.7),new THREE.MeshLambertMaterial({color:0x8a7c66}));sl.position.set(0,-.45,s*(L/2-.2));sl.castShadow=true;sl.receiveShadow=true;g.add(sl);}
  OW.group.add(g);dk.g=g;WSTR.decks.push(dk);}
/* the height of a deck under a point (-1e9: not on one) */
function wstDeckY(x,z){for(const dk of WSTR.decks){if(x<dk.x0||x>dk.x1||z<dk.z0||z>dk.z1)continue;const dx=x-(dk.ax+dk.bx)/2,dz=z-(dk.az+dk.bz)/2,u=dx*dk.ux+dz*dk.uz,v=-dx*dk.uz+dz*dk.ux;if(Math.abs(u)<=dk.L/2&&Math.abs(v)<=dk.w/2)return dk.top;}return -1e9;}
/* what was drawn or grown over a rectangle is made again (ground tiles, their stones, the grass, the plants) */
function wstInvalidate(x0,z0,x1,z1){const G=OW.G;if(G){const T=G.T;for(let tz=Math.floor(z0/T);tz<=Math.floor(z1/T);tz++)for(let tx=Math.floor(x0/T);tx<=Math.floor(x1/T);tx++){const t=G.tiles.get(tx+','+tz);if(!t)continue;
      if(t.mesh){OW.group.remove(t.mesh);t.mesh.geometry.dispose();t.mesh=null;t.gh=null;}if(t.stone){OW.group.remove(t.stone);t.stone.geometry.dispose();t.stone=null;t.sh=null;}t.stoneDone=false;t.city=undefined;t._ix=null;if(typeof OWR!=='undefined'&&OWR.job&&OWR.job.t===t)OWR.job=null;if(t.state>0)t.state=0;}}
  if(typeof GRS!=='undefined'&&GRS.cells){const cs=GRS.cs;for(const[k,c]of GRS.cells){if(c.cx+cs/2<x0||c.cx-cs/2>x1||c.cz+cs/2<z0||c.cz-cs/2>z1)continue;for(const m of c.meshes){if(m.parent)m.parent.remove(m);m.dispose&&m.dispose();}GRS.cells.delete(k);}if(GRS.job)GRS.job=null;if(GRS.F)grsFarInvalidate(x0,z0,x1,z1);}
  if(FOL.chunks){const cs=FOL.cs;for(const[k,ch]of FOL.chunks){if(ch.cx+cs/2<x0||ch.cx-cs/2>x1||ch.cz+cs/2<z0||ch.cz-cs/2>z1)continue;if(ch.on&&FOL.group)FOL.group.remove(ch.g);ch.g.traverse(o=>{if(o.isInstancedMesh)o.dispose();});FOL.chunks.delete(k);}}}
/* ---------- villages ---------- */
/* While a village is built its kit geometry is merged lazily (mergeParts swapped for wstLazyParts): a merged geometry is made the first time anything
   reads it (the renderer when the village comes into view, a block merge, the foundations, a test) or by the queue, a few ms a frame - the village is
   built 560 m away and is not drawn before it is within the view distance, so most merges happen between frames instead of in the build. */
const WLZ={q:[],real:null,n:0,early:0};
function wstLazyParts(parts){const g=new THREE.BufferGeometry();let done=false;WLZ.n++;
  /* the counts of the near and far parts (environment upgrade 12: mergeParts puts them in userData, and the building sets its draw range from them at once) - counted here
     from the parts, the same way, without merging */
  if(parts.some(p=>p.d)){let nf=0,nb=0;for(const p of parts){const c3=p.geo.__ni?p.geo.__ni.length/3:p.geo.index?p.geo.index.count:p.geo.attributes.position.count;if(p.d===2){nf+=c3;nb+=c3;}else if(!p.d)nb+=c3;}g.userData.nf=nf;g.userData.nb=nb;}
  const force=()=>{if(done)return;done=true;const r=WLZ.real(parts);delete g.attributes;delete g.boundingSphere;g.attributes=r.attributes;g.boundingSphere=r.boundingSphere;for(const k in r.userData)if(!(k in g.userData))g.userData[k]=r.userData[k];};
  Object.defineProperty(g,'attributes',{configurable:true,enumerable:true,get(){if(!done)WLZ.early+=WLZ.building?1:0;force();return g.attributes;},set(v){}});
  Object.defineProperty(g,'boundingSphere',{configurable:true,enumerable:true,get(){force();return g.boundingSphere;},set(v){}});
  WLZ.q.push(force);return g;}
function wstLazyStep(ms){const T0=performance.now();while(WLZ.q.length&&performance.now()-T0<ms)WLZ.q.shift()();}
function wstVillage(s){const T0=performance.now(),T=WG_CFG.tile;
  /* its tiles first (the grid under it must be filled), and its roads */
  for(let tk=Math.floor((s.z-s.fr-40)/T);tk<=Math.floor((s.z+s.fr+40)/T);tk++)for(let ti=Math.floor((s.x-s.fr-40)/T);ti<=Math.floor((s.x+s.fr+40)/T);ti++){const t=wtTile(ti,tk);if(!WSTR.filled.has(ti+','+tk))wstGridTile(t);}
  const v={x:s.x,z:s.z,h:s.h,size:s.size,fr:s.fr,id:s.id,key:s.key,site:s,fixedName:s.name};
  /* the road it is laid out along: the one to the keep if it has one, else the longest */
  let best=null;for(const k of wsEdgesOf(s).keys()){const r=WS.roads.get(k);if(!r)continue;const sc=(r.B===WS.keep?1e6:0)+r.pts.length;if(!best||sc>best.sc)best={r,sc};}
  if(best){const r=best.r,pts=(r.A===s?r.pts:r.pts.slice().reverse()).map(q=>q.slice());v.keepRoad=pts;owAlignRoad(v);v.keepRoadPts=r.A===s?pts:pts.slice().reverse();v.keepRoadKey=r.key;}
  OW.deferCarve=[];OW.ghostCells=[];const lamps0=(OW.lamps||[]).length,pools0=OWLT.pools.length,halos0=OWLT.halos.length,reg0=OWI.reg.length;
  OW.villages.push(v);const rid0=OWG_RID;WLZ.real=mergeParts;mergeParts=wstLazyParts;WLZ.building=true;try{owBuildVillage(v,s.id,mulberry(((OW.seed|0)^0x9e3779b1)+s.id*7919));}finally{mergeParts=WLZ.real;WLZ.building=false;}
  for(const[b,snap]of OW.deferCarve)owiCarve(b,snap);OW.deferCarve=null;for(const k of OW.ghostCells){const r=Math.floor(k/W),c=k%W;if(grid[r]&&grid[r][c]===2)grid[r][c]=0;}OW.ghostCells=null;
  owiAudit();if(typeof owPartyCaps==='function'){const all=OW.villages;OW.villages=[v];try{owPartyCaps();}finally{OW.villages=all;}}if(typeof owBridgesQueue==='function')owBridgesQueue(v);/* (upgrade 12: the bridge houses of a city, fitted over the next frames, hut3d.js) *//* (upgrade 11: the tops of party walls, this village only - before its blocks are merged) */
  wstBlocksQueue(v);owgSquare(v.sqr);
  v.lamps=OW.lamps.slice(lamps0);v.pools=OWLT.pools.slice(pools0);v.halos=OWLT.halos.slice(halos0);v.owi=OWI.reg.slice(reg0);
  for(const k of wsEdgesOf(s).keys()){const r=WS.roads.get(k);if(r){if(r.A===s)wstDrawRoad(r,0);if(r.B===s)wstDrawRoad(r,1);}}
  v.rid0=rid0;v.rid1=OWG_RID;
  wstInvalidate(s.x-s.fr-40,s.z-s.fr-40,s.x+s.fr+40,s.z+s.fr+40);
  const sv=WSTR.vs[v.key];if(sv)wstApply(v,sv);
  WSTR.stats.vb++;WSTR.stats.vms+=performance.now()-T0;return v;}
/* the merged meshes of a village's buildings (batch.js), one 30 m cell at a time over the next frames (a city's took most of a second at once);
   until its cell is merged a building is drawn with its own meshes, which look the same */
WSTR.blk=[];
function wstBlocksQueue(v){const cells=new Map();for(const b of v.buildings){if(!b.proxy||b.blk)continue;const key=Math.floor(b.x/OWB_CELL)+','+Math.floor(b.z/OWB_CELL);let l=cells.get(key);if(!l)cells.set(key,l=[]);l.push(b);}
  for(const list of cells.values())if(list.length>=3)WSTR.blk.push({v,list});}
function wstBlocksStep(ms){const T0=performance.now();while(WSTR.blk.length&&performance.now()-T0<ms){const j=WSTR.blk.shift();if(j.v.unloaded||!j.v.g)continue;owBuildBlocks({buildings:j.list,g:j.v.g});}}
/* what changed in a village, and putting it back */
function wstState(v){return{s:v.state,r:v.recognized?1:0,e:v.everDamaged?1:0,b:v.buildings.map(b=>[Math.round(b.hp*10)/10,b.ruined?1:0,Math.round(b.fireT),owdSaveOf(b)])};}
function wstApply(v,sv){v.state=sv.s||'undiscovered';v.recognized=!!sv.r;v.everDamaged=!!sv.e;(sv.b||[]).forEach((q,j)=>{const b=v.buildings[j];if(!b)return;b.hp=q[0];b.ruined=!!q[1];b.fireT=q[2]||0;b.vis=-1;owBldVis(b);owdLoad(b,q[3]|0);});owVillageCondition(v);owVStates(v);}
/* a village far away: its state kept, its meshes, lamps, interiors and grid cells given back */
function wstUnload(v){WSTR.vs[v.key]=wstState(v);const i=OW.villages.indexOf(v);if(i>=0)OW.villages.splice(i,1);
  if(v.g){if(v.g.parent)v.g.parent.remove(v.g);v.g.traverse(o=>{if(o.geometry&&!o.isSkinnedMesh&&!o.isInstancedMesh&&!o.geometry.userData.shared)o.geometry.dispose();});}if(v.proxy){if(v.proxy.parent)v.proxy.parent.remove(v.proxy);v.proxy.geometry.dispose();}
  if(v.lamps){const L=new Set(v.lamps);OW.lamps=OW.lamps.filter(l=>!L.has(l));}if(v.pools){const P=new Set(v.pools);OWLT.pools=OWLT.pools.filter(p=>!P.has(p));}if(v.halos){const Hs=new Set(v.halos);OWLT.halos=OWLT.halos.filter(p=>!Hs.has(p));}OWLT.last=null;
  if(v.owi){const B=new Set(v.owi);for(const b of v.owi){try{owiFreeMesh(b);}catch(e){}}OWI.reg=OWI.reg.filter(b=>!B.has(b));OWI.list=OWI.list.filter(b=>!B.has(b));OWI.near=OWI.near.filter(b=>!B.has(b));if(OWI.cb&&B.has(OWI.cb)){OWI.cb=null;OWI.in=false;}}
  if(OW.ui&&OW.ui.labels){const L=OW.ui.labels.get(v);if(L){L.remove();OW.ui.labels.delete(v);}}
  /* its streets, squares and the halves of its roads off the ground (drawn again when it comes back) */
  if(OW.G&&v.rid1>v.rid0){const own=g=>g.rid>v.rid0&&g.rid<=v.rid1,T=OW.G.T,R=v.fr+600;let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;
    for(const t of OW.G.tiles.values()){if(!t.segs)continue;const n0=t.segs.length+t.sqs.length;t.segs=t.segs.filter(g=>!own(g));t.sqs=t.sqs.filter(q=>q!==v.sqr);if(t.segs.length+t.sqs.length!==n0){x0=Math.min(x0,t.tx*T);z0=Math.min(z0,t.tz*T);x1=Math.max(x1,(t.tx+1)*T);z1=Math.max(z1,(t.tz+1)*T);}}
    for(let r=v.rid0+1;r<=v.rid1;r++)OW.G.paths.delete(r);
    for(const k of wsEdgesOf(v.site).keys()){const r=WS.roads.get(k);if(r){if(r.A===v.site)WSTR.drawn.delete(r.key+':0');if(r.B===v.site)WSTR.drawn.delete(r.key+':1');}}
    if(x1>x0)wstInvalidate(x0,z0,x1,z1);}
  /* its cells: the tiles under it filled again (roads, landmarks and crossings with them) */
  const T=WG_CFG.tile;for(let tk=Math.floor((v.z-v.fr-40)/T);tk<=Math.floor((v.z+v.fr+40)/T);tk++)for(let ti=Math.floor((v.x-v.fr-40)/T);ti<=Math.floor((v.x+v.fr+40)/T);ti++){const t=WT.tiles.get(ti+','+tk);if(t)wstGridTile(t);}
  v.unloaded=true;}
/* ---------- per frame ---------- */
function wstFrame(){if(!OW.on||!WG.on)return;const f=OW.focus||{x:0,z:0},T0=performance.now();
  /* sites and roads well ahead, a few ms a frame */
  if(!WSTR.wantT||T0-WSTR.wantT>500){WSTR.wantT=T0;wsWant(f.x,f.z,1500);}
  wsStep(3);
  /* the level-0 tiles round the player (the grid is filled from them) */
  wstGridFollow(f.x,f.z);
  {const T=WG_CFG.tile,R=WSTR.prefetch,a0=Math.floor((f.x-R)/T),a1=Math.floor((f.x+R)/T),b0=Math.floor((f.z-R)/T),b1=Math.floor((f.z+R)/T),miss=[];
    for(let b=b0;b<=b1;b++)for(let a=a0;a<=a1;a++){if(WT.tiles.has(a+','+b))continue;const d=Math.hypot((a+.5)*T-f.x,(b+.5)*T-f.z);if(d<=R)miss.push({a,b,d});}
    miss.sort((p,q)=>p.d-q.d);
    if(WT.pool.length){for(const m of miss.slice(0,8))wtTileAsk(m.a,m.b);/* (the grid is filled as each one comes, WT.onTile) */
      /* the tile under the player itself never waits */const m0=miss[0];if(m0&&m0.d<T)wstGridTile(wtTile(m0.a,m0.b));}
    else if(miss[0]&&performance.now()-T0<6&&wsReady(miss[0].a*T,miss[0].b*T,(miss[0].a+1)*T,(miss[0].b+1)*T))wstGridTile(wtTile(miss[0].a,miss[0].b));}
  /* villages: one built a frame at most (when its roads are known), the far ones unloaded */
  if(!WSTR.vT||T0-WSTR.vT>250){WSTR.vT=T0;const C=WS_CFG.cell;let cand=null;
    for(let b=Math.floor((f.z-WSTR.load)/C);b<=Math.floor((f.z+WSTR.load)/C);b++)for(let a=Math.floor((f.x-WSTR.load)/C);a<=Math.floor((f.x+WSTR.load)/C);a++){const s=WS.sites.get(wgKey(a,b));if(!s)continue;
      const d=Math.hypot(s.x-f.x,s.z-f.z);if(d>WSTR.load||OW.villages.some(v=>v.site===s))continue;if(!wsReady(s.x-s.fr,s.z-s.fr,s.x+s.fr,s.z+s.fr))continue;if(!cand||d<cand.d)cand={s,d};}
    if(cand)wstVillage(cand.s);
    for(const v of OW.villages.slice())if(Math.hypot(v.x-f.x,v.z-f.z)>WSTR.unload&&!(OWI.cb&&OWI.cb.v===v))wstUnload(v);}
  wfUpdate(f,false);wstRocksView(f);wstLazyStep(3);if(typeof owBridgesStep==='function')owBridgesStep();wstBlocksStep(4);
  /* the hydrology worked out ahead by the workers (wterrain.js WHP), as far as the game asks for it: the sites two cells past the roads' 1.5 km (wsWant), the landmarks
     to WF.far, and with a long Detail distance the sites out to its rings of cells (owDetailRoads) - and a block more (what a site or a landmark reads round it) */
  {const C=WS_CFG.cell;let R=Math.max(1500+3*C,WF.far+WF.cell);if(typeof owDd==='function'&&typeof OW_DD!=='undefined'){const D=Math.min(owDd(),Math.max(OW_DD.min,Math.floor(owFogEnd()/50)*50),OW_DD.tiles);if(D>600)R=Math.max(R,(Math.ceil((D+64)/C)+6)*C);}
    WHP.R=R+800;whpStep(f.x,f.z);}}
/* ---------- the start: the keep's surroundings made at once ---------- */
function wstStart(seed){const T0=performance.now();wgInit(seed);wsReset();wfReset();wtReset();WSTR.vs={};WSTR.decks=[];WSTR.blk=[];WSTR.drawn.clear();WSTR.filled.clear();WSTR.stats={vb:0,vms:0,shifts:0};
  const K=wsKeep();OW.keep={x:K.x,z:K.z};OW.keepGate=K.gate;OW.keepApproach=K.app;OW.corridor=[];for(let d=0;d<=46+.01;d+=1.6)OW.corridor.push([K.gate.x,K.gate.z-d]);OW.corridor.reverse();
  OW.villages=[];OW.caves=[];OW.roads=[];if(typeof wtpReset==='function')wtpReset();OW.streams=[];OW.routes={};OW.rhash=new Map();OW.half=1e9;OW.n=0;OW.hs=null;OW.waterCells=new Set();
  if(typeof owFogEnd==='function'){const e=owFogEnd();WT.maxD=e*1.06+60;WF.far=Math.min(16000,e+250);}/* (nothing is built past the end of the air) */
  wtInit(OW.group);wfInit(OW.group);WT.onTile=t=>{if(OW.on)wstGridTile(t);};{const el=typeof document!=='undefined'&&document.getElementById('wg-src');wtPoolInit(el?el.textContent:null,seed);}wstGridInit(K.x,K.z);
  wsWant(K.x,K.z,900);wsStep(Infinity);
  const T=WG_CFG.tile,R=260;for(let b=Math.floor((K.z-R)/T);b<=Math.floor((K.z+R)/T);b++)for(let a=Math.floor((K.x-R)/T);a<=Math.floor((K.x+R)/T);a++){if(Math.hypot((a+.5)*T-K.x,(b+.5)*T-K.z)>R)continue;wstGridTile(wtTile(a,b));}
  WSTR.t0=performance.now()-T0;return K;}
function wstVillagesNear(x,z){const C=WS_CFG.cell;for(let b=Math.floor((z-WSTR.load)/C);b<=Math.floor((z+WSTR.load)/C);b++)for(let a=Math.floor((x-WSTR.load)/C);a<=Math.floor((x+WSTR.load)/C);a++){const s=WS.sites.get(wgKey(a,b));if(s&&Math.hypot(s.x-x,s.z-z)<=WSTR.load&&!OW.villages.some(v=>v.site===s))wstVillage(s);}}
/* ---------- save ---------- */
function wstSave(){const vs=Object.assign({},WSTR.vs);for(const v of OW.villages)vs[v.key]=wstState(v);return vs;}
function wstLoad(vs){WSTR.vs=vs||{};for(const v of OW.villages){const sv=WSTR.vs[v.key];if(sv)wstApply(v,sv);}}

/* ---------- boulders (world look 2: src/world/wboulder.js - seeded chunky stones, instanced, the cliffs' stone) ----------
   Here only which tiles have theirs: the filled tiles within WROCK.R (the Detail distance sets it, 420 m to 1.2 km), one made a frame; their props (the
   bigger ones block the hero) in OW.props; dropped 200 m further out. */
const WROCK={R:420};
function wstRocks(t){if(t.rocks!==undefined||!OW.group)return;t.rocks=null;const r=wbldPlace(t);
  for(const p of r.props){OW.props.push(p);const key=Math.floor(p.x/4)+','+Math.floor(p.z/4);(OW.propGrid.get(key)||OW.propGrid.set(key,[]).get(key)).push(p);}
  t.rocks=r;WBLD.dirty=true;}
function wstRocksDrop(t){const r=t.rocks;t.rocks=undefined;if(!r)return;WBLD.dirty=true;const P=new Set(r.props);OW.props=OW.props.filter(p=>!P.has(p));
  for(const p of r.props){const key=Math.floor(p.x/4)+','+Math.floor(p.z/4),L=OW.propGrid.get(key);if(L){const L2=L.filter(q=>q!==p);if(L2.length)OW.propGrid.set(key,L2);else OW.propGrid.delete(key);}}}
/* per frame: boulders on the filled tiles near the player, dropped far away */
function wstRocksView(f){const S=WG_CFG.tile;let made=0;for(const t of WT.tiles.values()){const d=Math.hypot(t.x0+S/2-f.x,t.z0+S/2-f.z);
    if(d<WROCK.R){if(t.rocks===undefined&&made<1&&WSTR.filled.has(t.ti+','+t.tk)){wstRocks(t);made++;}}else if(d>WROCK.R+200&&t.rocks!==undefined)wstRocksDrop(t);}
  wbldView(f);if(typeof wrsView==='function')wrsView(f);/* (the stream's banks, wrstone.js) */if(typeof wtpUpdate==='function')wtpUpdate(f.x,f.z);}
