(function(){
const out=[];
function walk(seed){
  meta.world='open';resetRun();buildMap(seed);MAP.fresh=false;startWave=1;wave=0;gold=500;lives=99;nextQ=buildWave(1);state='playing';showOverlay(null);owSpawnHero();
  const K=OW.keep,G=OW.keepGate,A=OW.keepApproach,C=OW.corridor,hs=OW_KEEP.hs*OW_KS,r={seed};
  /* 1. every keep-bound road ends with the very same corridor */
  let bad=0,n=0;for(const rd of OW.roads){if(rd.kind!=='village'&&rd.kind!=='cave')continue;n++;const p=rd.pts,m=C.length;let ok=p.length>=m;for(let i=0;i<m&&ok;i++){const q=p[p.length-m+i];if(Math.hypot(q[0]-C[i][0],q[1]-C[i][1])>1e-6)ok=false;}if(!ok)bad++;}
  r.keepRoads=n;r.badCorridor=bad;
  /* 2. no road comes near the keep except through the corridor */
  let stray=0;for(const rd of OW.roads){for(const q of rd.pts){const dK=Math.hypot(q[0]-K.x,q[1]-K.z);if(dK<hs+34){const lat=Math.abs(q[0]-G.x);if(!(lat<2.5&&q[1]<G.z+3))stray++;}}}r.strayRoadPoints=stray;
  /* 3. the walls are closed except for one gate: flood fill over the occupancy grid */
  const box=Math.ceil(80/TS),a=owCell(K.x,K.z),flood=(sr,sc,blockGate)=>{const seen=new Uint8Array((2*box+1)*(2*box+1));const idx=(rr,cc)=>(rr-(a.r-box))*(2*box+1)+(cc-(a.c-box));const q=[[sr,sc]];seen[idx(sr,sc)]=1;let h=0;
    while(h<q.length){const[rr,cc]=q[h++];for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]]){const nr=rr+dr,nc=cc+dc;if(Math.abs(nr-a.r)>box||Math.abs(nc-a.c)>box||nr<0||nc<0||nr>=H||nc>=W)continue;const k=idx(nr,nc);if(seen[k])continue;
      const p={x:(nc-OX)*TS,z:(nr-OZ)*TS};if(blockGate&&Math.abs(p.x-K.x)<4.6&&Math.abs(p.z-(K.z-hs))<2.6)continue;if(grid[nr][nc]===2)continue;seen[k]=1;q.push([nr,nc]);}}return{seen,idx};};
  const start=owCell(A.x,A.z-12),F=flood(start.r,start.c,false),inside=owCell(K.x,K.z-hs+3);r.insideReachable=!!F.seen[F.idx(inside.r,inside.c)];
  const F2=flood(start.r,start.c,true);r.insideReachableWhenGateBlocked=!!F2.seen[F2.idx(inside.r,inside.c)];
  /* 4. real enemies: wave after wave from every cave, positions sampled every frame */
  const caves=OW.caves.length;let crossings=0,throughWall=0,seenEnemies=0,maxInside=0;const gateZ=K.z-hs;
  const Rk=hs-.8;
  for(let w=0;w<4;w++){wave=w+1;for(const c of OW.caves)c.active=true;nextQ=buildWave(wave);callWave();
    for(let i=0;i<9000;i++){update(.05);updFx(.05);if(i%1===0)for(const e of enemies){if(e.dead)continue;seenEnemies++;const inRect=Math.abs(e.x-K.x)<Rk&&Math.abs(e.z-K.z)<Rk;if(inRect){if(!e._in){e._in=true;crossings++;if(Math.abs(e.x-K.x)>3.8||e.z>gateZ+1.5)throughWall++;}}}
      if(!enemies.length&&!spawners.length)break;}
    enemies.length=0;}
  r.enemySamples=seenEnemies;r.enemyEntries=crossings;r.enteredThroughWall=throughWall;r.caves=caves;
  return r;}
for(const sd of(window.__seeds||[555]))out.push(JSON.stringify(walk(sd)));
return out.join('\n');})()
