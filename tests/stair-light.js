(async function(){
/* Light between the floors. Houses nobody lives in (no lamps in the rooms) with a fire on the ground floor and an upper floor joined by a stairwell, at night: the brightness of the upper floor, as drawn (L.probe), near the opening of the stairs, farther away in the
   same room or the next, and straight above the fire, with the light through the stairwell (OWLM.thru) and without it (the grid baked again with thru = 0). The floor still stops light: straight above the fire, away from the stairs, nothing changes. Needs int-lib.js and ls-shot.js (I.setup(3) first).
   window.__sl2 = {pass, fail, out:[...], data:[...]} */
const I=window.__iw,L=window.__ls,R=window.__sl2={pass:0,fail:0,out:[],data:[]};
const ok=(c,m)=>{R[c?'pass':'fail']++;R.out.push((c?'PASS ':'FAIL ')+m);return c;};
meta.dayT=1500;
const freeAt=(b,lv,lx,lz,minD,maxD,avoid)=>{const P=b.ic.P,F=P.floors[lv];let best=null,bd=1e9;
  for(const room of F.rooms)for(const q of room.rects)for(let x=q.xa+.3;x<=q.xb-.3;x+=.2)for(let z=q.za+.3;z<=q.zb-.3;z+=.2){if(b.ic.col&&owiHit(b.ic.col,x,z,1<<lv,OWI.RAD+.1))continue;if(P.stairs.some(f=>x>f.x0-.5&&x<f.x1+.5&&z>Math.min(f.z0,f.z1)-.5&&z<Math.max(f.z0,f.z1)+.5))continue;
    const d=Math.hypot(x-lx,z-lz);if(d<minD||d>maxD)continue;if(avoid&&Math.hypot(x-avoid[0],z-avoid[1])<2)continue;const k=Math.abs(d-(minD+maxD)/2);if(k<bd){bd=k;best=[x,z];}}
  return best;};
const rebake=(b,thru)=>{OWLM.thru=thru;owlmFree(b);b.ic.lmWant=undefined;};
const cands=OWI.list.filter(b=>b.arch&&b.arch.leaf&&!b.tunnel).filter(b=>{owiEnsurePlan(b);const P=b.ic.P;return P.floors&&P.floors.length>1&&!b.ic.lit&&P.floors[0].items.some(it=>OWIL_SRC[it.kind]&&OWIL_SRC[it.kind].fire)&&P.stairs.some(f=>f.from===0&&f.to===1);});
let n=0;const rows=[];
for(const b of cands){if(n>=6)break;const P=b.ic.P,F0=P.floors[0],fire=F0.items.find(it=>OWIL_SRC[it.kind]&&OWIL_SRC[it.kind].fire),f=P.stairs.find(q=>q.from===0&&q.to===1),hx=(f.x0+f.x1)/2,hz=(f.z0+f.z1)/2;
  const near=freeAt(b,1,hx,hz,1.2,2.6),far=freeAt(b,1,hx,hz,4.5,9,near),above=freeAt(b,1,fire.x,fire.z,0,1.6);
  if(!near||!far||!above||Math.hypot(fire.x-hx,fire.z-hz)>7)continue;
  const pr=(p,o)=>L.probe(b,1,p[0],p[1],Object.assign({t:1500,frames:50},o||{}));
  rebake(b,.55);const a1=pr(near),f1=pr(far),v1=pr(above);
  rebake(b,0);const a0=pr(near),f0=pr(far),v0=pr(above);
  rebake(b,.55);
  const dFire=Math.hypot(fire.x-hx,fire.z-hz);
  rows.push({b:b.type+'@'+Math.round(b.x)+','+Math.round(b.z),fireToStairs:+dFire.toFixed(1),near:[a0.lum,a1.lum],far:[f0.lum,f1.lum],aboveFire:[v0.lum,v1.lum]});n++;}
R.data=rows;
ok(rows.length>=3,'houses with a fire downstairs and a stairwell: '+rows.length);
ok(rows.filter(r=>r.near[1]>r.near[0]+1).length>=Math.ceil(rows.length*.6),'the upper floor near the opening of the stairs is brighter with the light through the stairwell ('+rows.map(r=>r.near.join('>')).join(', ')+')');
ok(rows.filter(r=>r.near[1]>r.far[1]*1.3).length>=Math.ceil(rows.length*.7),'it falls off with the distance from the opening: near is not darker than far ('+rows.map(r=>r.near[1]+'/'+r.far[1]).join(', ')+')');
ok(rows.every(r=>(r.aboveFire[1]-r.aboveFire[0])<=.5*Math.max(1,r.near[1]-r.near[0])),'the floor still blocks the fire: straight above it the gain is at most half of the gain at the opening ('+rows.map(r=>r.aboveFire.join('>')).join(', ')+')');
return JSON.stringify(R);})()
