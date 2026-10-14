(function(){
/* The entrance steps of enterable houses (geo.js owiEntranceMesh) stay drawn whichever way the building is drawn: in the merged block of the village (batch.js) or with its own meshes
   (when the hero is in the zone of the house, when its door is held open, when it is damaged). Needs int-lib.js. Returns PASS/FAIL lines. */
const I=window.__iw,out=[],res={pass:0,fail:0};const ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);return c;};
const step=(n)=>{for(let i=0;i<n;i++){heroUpdate(1/30);owiTick(1/30);owFrame();}};
/* the steps are drawn when their own mesh is visible, or when the merged block that contains them is on for this building */
const drawn=b=>{const s=b.meshes.s;if(!s)return null;let v=!!s.visible;const k=b.blk;if(k&&k.state===true&&k.m&&k.m.visible)v=true;return v;};
const all=I.list().filter(b=>b.enter&&b.meshes.s&&!b.tunnel);
const pick=[];for(const t of[1,2,3,4,5]){const l=all.filter(b=>b.v.tier===t);for(let i=0;i<l.length&&i<(t>=4?3:2);i++)pick.push(l[Math.floor(i*l.length/Math.max(1,Math.min(l.length,t>=4?3:2)))]);}
camSet('tp');let n=0;const bad=[];
for(const b of pick){const e=b.enter,nd=e.ends[0],S=nd.spec,tag=b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' T'+b.v.tier;
  const seq=[['far',()=>I.ground(b,70)],['mid',()=>I.ground(b,32)],['near',()=>I.ground(b,12)],['close',()=>I.ground(b,4)],['foot',()=>I.ground(b,.4)],
    ['steps',()=>owiL2W(b,e.u,nd.zF+nd.sgn*S.run*.5)],['door',()=>owiL2W(b,e.u,nd.zF)],['inside',()=>{const Q=b.ic&&b.ic.P?b.ic.P.floors[0].Q:null;return Q?owiL2W(b,(Q.xa+Q.xb)/2,(Q.za+Q.zb)/2):I.ground(b,-1);}],['away',()=>I.ground(b,14)]];
  for(const[nm,fn]of seq){const q=fn();I.tele(q[0],q[1]);owView(true);if(nm==='inside')I.settle(b);step(14);n++;if(!drawn(b)){bad.push(tag+' '+nm);}}
  /* the door opens and closes with the hero at the foot of the steps */
  if(typeof owdLeaf==='function'&&owdLeaf(b)){const q=I.ground(b,1.5);I.tele(q[0],q[1]);step(8);for(const open of[true,false,true,false]){owdSet(b,open,{instant:true,dir:1});step(6);n++;if(!drawn(b))bad.push(tag+' door '+(open?'open':'closed'));}}}
ok(bad.length===0,'entrance steps drawn at every distance, on the steps, at the door, inside, after leaving, and when the door opens and closes ('+n+' checks, '+pick.length+' houses, tiers '+[...new Set(pick.map(b=>b.v.tier))].join('/')+')'+(bad.length?' MISSING: '+bad.slice(0,8).join(' | '):''));
/* a damaged / ruined house still shows its steps */
{const b=pick[0];if(b){const hp=b.hp;b.hp=b.maxHp*.4;owBldRefresh(b);step(4);ok(drawn(b),'damaged house: steps still drawn');b.hp=hp;owBldRefresh(b);step(4);ok(drawn(b),'repaired house: steps still drawn');}}
/* the steps are not part of the interior: the floor system never hides them (they are not in ic.flights) */
{const b=pick[0],q=owiL2W(b,0,0);I.tele(q[0],q[1]);I.settle(b);step(10);ok(drawn(b)&&!(b.ic.flights||[]).some(f=>f.mesh===b.meshes.s),'inside: the entrance steps are not an interior flight and stay drawn');}
res.out=out;return JSON.stringify(res);
})()
