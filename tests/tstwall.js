(function(){
const out=[];const seeds=window.__seeds||[555,1,2,3];
function reach(a,lim){const seen=new Set([a.r*W+a.c]),q=[[a.c,a.r]];let h=0;while(h<q.length){const[c,r]=q[h++];for(const[dc,dr]of[[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dc,nr=r+dr;if(nc<0||nr<0||nc>=W||nr>=H)continue;if(Math.abs(nc-a.c)>lim||Math.abs(nr-a.r)>lim)continue;const k=nr*W+nc;if(seen.has(k))continue;if(grid[nr][nc]===2)continue;seen.add(k);q.push([nc,nr]);}}return seen;}
for(const seed of seeds){owEnter();buildOpenWorld(seed);
  for(const v of OW.villages){if(v.tier<4&&!window.__all)continue;
    const r={seed,name:v.name,tier:v.tier,n:v.buildings.length,shape:v.shape?[v.shape.ka.toFixed(2),v.shape.kb.toFixed(2)].join('x'):0};
    if(v.walls){const w=v.walls;r.gates=w.gates.length;r.towers=w.towers;
      /* buildings must be clear of the wall line */
      let close=0;for(const b of v.buildings){if(b.type==='windmill'||b.type==='guard')continue;const inw=v.wallInside(b.x,b.z,0);if(!inw&&b.type!=='barn'&&b.type!=='stable'&&b.type!=='storage'&&b.type!=='shed'&&b.type!=='cot'&&b.type!=='hut'&&b.type!=='windmill')close++;if(v.wallInside(b.x,b.z,3)&&!v.wallInside(b.x,b.z,0))close+=100;}
      r.buildingsOutsideOrTouching=close;
      /* every gate: cells in its opening must be walkable and the cells just outside/inside reachable */
      const lim=Math.ceil(v.rad*2.2/TS);const a=owCell(v.sqr.x,v.sqr.z),seen=reach(a,lim);
      let gOk=0;for(const g of w.gates){const o=owCell(g.x,g.z);if(seen.has(o.r*W+o.c))gOk++;}r.gatesReachableFromSquare=gOk;
      /* a point 30 m outside each gate must be reachable too (the way out) */
      const cx=v.x,cz=v.z;let outOk=0;for(const g of w.gates){const d=Math.hypot(g.x-cx,g.z-cz),px=g.x+(g.x-cx)/d*25,pz=g.z+(g.z-cz)/d*25,o=owCell(px,pz);if(seen.has(o.r*W+o.c)||grid[o.r][o.c]===0)outOk++;}r.outsideWalkable=outOk;
      /* main gate vs incoming road */
      const mg=w.gates.find(g=>g.main);let md=1e9;if(mg)for(const rd of OW.roads){for(const q of rd.pts){md=Math.min(md,Math.hypot(q[0]-mg.x,q[1]-mg.z));}}r.mainGateRoadDist=mg?+md.toFixed(1):null;
      /* road cells that fall in blocked wall cells (should be only at gates) */
      let rb=0,rn=0;for(const rd of OW.roads){for(let i=0;i<rd.pts.length-1;i++){const p=rd.pts[i];if(Math.hypot(p[0]-cx,p[1]-cz)>v.rad*1.6)continue;rn++;const o=owCell(p[0],p[1]);if(grid[o.r]&&grid[o.r][o.c]===2)rb++;}}r.roadPtsBlocked=rb+'/'+rn;
      /* the whole inside is one walkable component: share of free cells inside the wall that the square reaches */
      let tot=0,got=0;for(let rr=a.r-lim;rr<=a.r+lim;rr++)for(let cc=a.c-lim;cc<=a.c+lim;cc++){if(rr<0||cc<0||rr>=H||cc>=W)continue;const p=tw(cc,rr);if(grid[rr][cc]===2)continue;if(v.wallInside(p.x,p.z,0)){tot++;if(seen.has(rr*W+cc))got++;}}r.insideConnected=(got/Math.max(1,tot)).toFixed(3);
    }
    out.push(JSON.stringify(r));}}
return out.join('\n');})()
