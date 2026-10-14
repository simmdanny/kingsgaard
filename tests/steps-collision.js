(function(){
/* The steps up to a door, for every kind of building that has them (enterable houses and the solid buildings: shed, stable, hall): the real controller walks from six metres out to the top step: it arrives (nothing invisible in the way), its height
   follows the steps (never a jump above 25 cm in one frame, at the top it stands at the floor level of the building), and a solid building cannot be walked into through its shut door. Counts the buildings of each kind and tier that were
   checked. Needs int-lib.js. Returns PASS/FAIL lines. */
const I=window.__iw,out=[],res={pass:0,fail:0};const ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);return c;};
const H=heroU;const seen={};const bad=[];let n=0,solidN=0;
for(const v of OW.villages)for(const b of v.buildings){if(!b.enter||b.tunnel)continue;const key=v.tier+b.type;seen[key]=(seen[key]||0)+1;if(seen[key]>2)continue;
  const e=b.enter,nd=e.ends[0],S=nd.spec;for(const d of[6,4.5,3.5,2.5]){const q=I.ground(b,d);I.tele(q[0],q[1]);owView(true);for(let i=0;i<40;i++){OWI.tScan=-9;heroUpdate(1/30);owiTick(1/30);}if(!OWI.in)break;}/* a street may be narrower than six metres: start where the hero is not in a neighbour */
  const top=owiL2W(b,e.u,nd.zF-.05),ph=I.walkTo(top[0],top[1],{maxT:14,tol:.3});n++;
  for(let i=0;i<30;i++){heroUpdate(1/30);owiTick(1/30);}/* the height settles: a jump of the surface is carried and dies away */const yTop=H.g.position.y,floorY=b.hi+(b.ic&&b.ic.P?b.ic.P.floors[0].y:OW_FH*b.BSc);
  if(!ph.ok&&bad.length<8)bad.push(b.type+' T'+v.tier+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+': did not reach the top of the steps ('+JSON.stringify(ph.at)+')');
  else if((yTop>floorY+.15||yTop<floorY-S.r-.12)&&bad.length<8)bad.push(b.type+' T'+v.tier+'@'+b.x.toFixed(0)+': at the top y '+yTop.toFixed(2)+' vs floor '+floorY.toFixed(2)+' (riser '+S.r.toFixed(2)+')');
  else if(ph.maxDy>.25&&bad.length<8)bad.push(b.type+' T'+v.tier+'@'+b.x.toFixed(0)+': jumped '+ph.maxDy.toFixed(2)+' m in a frame');
  if(b.pl&&b.pl.solid){solidN++;const inside=owiL2W(b,e.u,nd.zL-1.2),pi=I.walkTo(inside[0],inside[1],{maxT:3,tol:.2});const l=owiW2L(b,H.x,H.z);if(l[1]<nd.zL-.1&&bad.length<8)bad.push(b.type+' T'+v.tier+'@'+b.x.toFixed(0)+': walked into the solid building (local z '+l[1].toFixed(2)+' behind the front wall '+nd.zL.toFixed(2)+')');}}
ok(bad.length===0,'the hero walks up the steps of every kind of building, arrives at floor height, no jumps, solid buildings stay shut ('+n+' buildings of '+Object.keys(seen).length+' kinds/tiers, '+solidN+' solid)'+(bad.length?' '+bad.join(' | '):''));
{const dec=[];for(const v of OW.villages)for(const b of v.buildings){if(b.enter||!b.arch||!b.arch.doors.some(d=>d.kind==='main'))continue;if(['hall','shed','stable'].includes(b.type))dec.push(b.type+'@'+b.x.toFixed(0));}ok(dec.length===0,'no building with a main door is left with steps that cannot be walked on'+(dec.length?' '+dec.slice(0,5).join(' | '):''));}
res.out=out;return JSON.stringify(res);
})()
