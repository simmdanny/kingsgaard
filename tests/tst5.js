(function(){
const out=[];
function bfsReach(v){/* walkable = anything but a blocked cell (2); start at the square centre */
  const R0=v.rad+30,a=owCell(v.sqr.x,v.sqr.z),seen=new Map();const q=[[a.c,a.r]];seen.set(a.r*W+a.c,1);const rc=Math.ceil(R0/TS);let head=0;
  while(head<q.length){const[c,r]=q[head++];for(const[dc,dr]of[[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dc,nr=r+dr;if(nc<0||nr<0||nc>=W||nr>=H)continue;if(Math.abs(nc-a.c)>rc||Math.abs(nr-a.r)>rc)continue;const k=nr*W+nc;if(seen.has(k))continue;const g=grid[nr][nc];if(g===2)continue;seen.set(k,1);q.push([nc,nr]);}}
  return seen;}
function check(seed){
  const t0=performance.now();owEnter();buildOpenWorld(seed);const bt=Math.round(performance.now()-t0);const res={seed,ms:bt,villages:[]};
  OW.villages.forEach(v=>{const r={name:v.name,size:v.size,tier:v.tier,n:v.buildings.length};
    /* overlap between non-party buildings */
    let ov=0;const B=v.buildings.filter(b=>b.ob);for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){const a=B[i],b=B[j];if(owObbHit(a.ob,b.ob,-.2))ov++;}r.overlaps=ov;
    /* stairs, doors, headroom and party consistency */
    let badStairs=0,stairs=0,lowHead=0,badDoor=0,partyBad=0,parties=0,noOwner=0,floors=0,multi=0;
    for(const b of v.buildings){const A=b.arch;if(!A)continue;const BSc=A.scale;A.storeys.forEach(s=>{floors++;if(s.h*BSc<2.2)lowHead++;});if(A.storeys.length>1)multi++;
      for(const d of A.doors)if(d.h*BSc<1.7||d.w*BSc<.85)badDoor++;
      for(const s of A.stairs){stairs++;const okW=s.width*BSc>=.9,okRise=s.riserWorld>=.15&&s.riserWorld<=.2,okTread=s.treadWorld>=.25,okSum=Math.abs(s.risers*s.riserWorld-s.rise*BSc)<.02,D=A.D,okFit=s.feasible&&Math.abs(s.zBottom)<=D/2&&Math.abs(s.zTop)<=D/2-A.wallT;if(!(okW&&okRise&&okTread&&okSum&&okFit))badStairs++;}
      const pl=b.pl;if(pl&&pl.party){for(const side of['l','r']){if(pl.party[side]){parties++;const nb=pl.nbr&&pl.nbr[side];if(!nb||!nb.party)partyBad++;else{const os=nb.party[side==='l'?'r':'l'];if(!os&&!(nb.party.l||nb.party.r))partyBad++;const mine=!!(pl.partyOwn&&pl.partyOwn[side]),theirs=!!(nb.partyOwn&&nb.partyOwn[side==='l'?'r':'l']);if(mine===theirs)noOwner++;}}}}}
    r.floors=floors;r.multi=multi;r.stairs=stairs;r.badStairs=badStairs;r.lowHead=lowHead;r.badDoor=badDoor;r.partySides=parties;r.partyBad=partyBad;r.ownerBad=noOwner;
    /* navigability */
    const seen=bfsReach(v);let unreach=0,tot=0;for(const b of v.buildings){if(!b.pl||!b.pl.d||b.type==='well'||b.type==='stall')continue;const BSc=b.arch?b.arch.scale:OW_BS,off=b.pl.d/2*BSc+1.6,x=b.x+Math.sin(b.rot)*off,z=b.z+Math.cos(b.rot)*off,c=owCell(x,z);tot++;if(!seen.has(c.r*W+c.c)){/* try the 3x3 around */let ok=false;for(let dr=-2;dr<=2&&!ok;dr++)for(let dc=-2;dc<=2&&!ok;dc++)if(seen.has((c.r+dr)*W+c.c+dc))ok=true;if(!ok)unreach++;}}
    r.doorsChecked=tot;r.doorsUnreachable=unreach;
    /* tiers: dominant type of residential buildings */
    const cnt={};v.buildings.forEach(b=>cnt[b.type]=(cnt[b.type]||0)+1);r.types=cnt;
    /* height over the ground: no building floats or sinks */
    let off=0;for(const b of v.buildings){if(!b.pl||!b.pl.w)continue;const BSc=OW_BS;let lo=9,hi=-9;const fw=b.pl.w/2*BSc,fd=b.pl.d/2*BSc,cs=Math.cos(b.rot),sn=Math.sin(b.rot);for(let i=-1;i<=1;i+=2)for(let j=-1;j<=1;j+=2){const h=owH(b.x+i*fw*cs+j*fd*sn,b.z-i*fw*sn+j*fd*cs);lo=Math.min(lo,h);hi=Math.max(hi,h);}off=Math.max(off,hi-lo);}r.maxFootprintRelief=+off.toFixed(2);
    res.villages.push(r);});
  return res;}
const seeds=window.__seeds||[555];
for(const s of seeds){const r=check(s);out.push('seed '+r.seed+' built in '+r.ms+'ms');r.villages.forEach(v=>out.push(JSON.stringify(v)));}
return out.join('\n');})()
