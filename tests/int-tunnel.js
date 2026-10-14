(function(){
/* Walks a real hero through every passage of a Tier 5 city: street, steps, tunnel, steps, street, and back again. */
const I=window.__iw,seeds=window.__seeds||[2,3,23],out=[],rep={tunnels:0,ok:0,fail:0,maxDy:0};
const frames=(n)=>{for(let i=0;i<n;i++){heroUpdate(1/60);owiTick(1/60);}};
function trip(b,fromBack,res){const e=b.enter,A=e.ends[0],B=e.ends[1],P=b.ic.P,Q=P.st[0].Q,y0=b.hi+P.floors[0].y+.015;
  const a=fromBack?B:A,z=fromBack?A:B,sa=a.sgn,u=e.u;
  const stepsIn=[[u,a.zF+sa*(a.spec.run+.3)],[u,a.zF-sa*.1]];
  const through=[[u,(fromBack?Q.za:Q.zb)-sa*.7],[u,0],[u,(fromBack?Q.zb:Q.za)+sa*.7]];
  const stepsOut=[[u,z.zF+z.sgn*.1*0-z.sgn*.1*0],[u,z.zF+z.sgn*(z.spec.run+.3)]];
  const go=(pts)=>{for(const p of pts){const r=I.walkLocal(b,p[0],p[1],{tol:.2,maxT:12});rep.maxDy=Math.max(rep.maxDy,r.maxDy);if(!r.ok){res.push((fromBack?'from back ':'from front ')+'stuck near ('+p[0].toFixed(2)+','+p[1].toFixed(2)+') '+JSON.stringify(r.at));return false;}}return true;};
  const g0=fromBack?owiL2W(b,u,B.zF-B.spec.run-3):I.ground(b,3);if(!owCanStand(g0[0],g0[1])||!owiValid(g0[0],g0[1])){res.push('approach blocked (skipped)');return 'skip';}
  I.tele(g0[0],g0[1]);frames(30);
  if(!go(stepsIn))return false;if(!go(through.slice(0,1)))return false;frames(30);
  if(!OWI.in)res.push('not inside the tunnel');if(Math.abs(heroU.g.position.y-y0)>.06)res.push('tunnel floor y '+heroU.g.position.y.toFixed(3)+' vs '+y0.toFixed(3));
  if(!go(through.slice(1)))return false;
  if(!go([[u,z.zF-z.sgn*.05]]))return false;if(!go([stepsOut[1]]))return false;
  /* beyond the far steps the walker is outdoors again, on the terrain */
  const far=owiL2W(b,u,z.zF+z.sgn*(z.spec.run+2.5));if(owCanStand(far[0],far[1])&&owiValid(far[0],far[1]))go([[u,z.zF+z.sgn*(z.spec.run+2.5)]]);
  frames(60);if(OWI.in)res.push('still inside after the far end');const ty=gy(heroU.x,heroU.z);{const zl=owiZonesAt(heroU.x,heroU.z);/* on the doorstep of a neighbouring house the hero is rightly above the terrain */if(Math.abs(heroU.g.position.y-ty)>.06&&!zl.some(q=>q.b!==b)){const zs=zl.map(q=>q.b.type+(q.b.tunnel?'(tunnel)':'')+':'+q.k).join(',');res.push('outside: y '+heroU.g.position.y.toFixed(3)+' vs terrain '+ty.toFixed(3)+' at ('+heroU.x.toFixed(2)+','+heroU.z.toFixed(2)+') zones ['+zs+']');}}
  return true;}
for(const seed of seeds){I.setup(seed);
  for(const b of OWI.list.slice()){if(!b.tunnel)continue;if(window.__tun&&(Math.abs(b.x-window.__tun[0])>2||Math.abs(b.z-window.__tun[1])>2))continue;{const g=I.ground(b,3);I.tele(g[0],g[1]);}if(!I.settle(b)){out.push('tunnel did not load');continue;}rep.tunnels++;
    for(const fb of[false,true]){const res=[];let ok;try{ok=trip(b,fb,res);}catch(err){res.push('EXC '+err.message+' '+(err.stack||'').split('\n')[1]);ok=false;}
      if(ok==='skip')continue;if(ok===true&&!res.length)rep.ok++;else{rep.fail++;if(out.length<14)out.push('seed '+seed+' tunnel @'+b.x.toFixed(0)+','+b.z.toFixed(0)+' '+(fb?'back':'front')+': '+res.join(' | '));}}}}
return JSON.stringify(rep)+'\n'+out.join('\n');})()
