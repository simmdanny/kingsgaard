(function(){
/* The villagers' ways (vilnav.js). Needs perf-world.js (window.__pw). window.__vn:
     setup(seed)          a world
     sim(vi, secs, o)     runs village vi's villagers for secs of game time (30 fps steps, doors animated) and counts what must never happen:
                          bad   - a villager outside a door visit standing where vilFree says something solid is (radius .17),
                          wall  - ... or inside a collider box of a loaded building (its walls, steps, cheek walls),
                          close - two villagers closer than .35 m, nan - a position that is not a number;
                          and what should: door visits, doors opened / shut by villagers, searches, failures, stuck villagers, ms per frame.
     shot(vi, o)          a picture of the village from above a door that is being used (or the square), uploaded as o.name.jpg */
const N=window.__vn=window.__vn||{};
N.setup=function(seed){return window.__pw.setup(seed==null?3:seed);};
N.patch=function(){if(N.patched)return;N.patched=true;N.ev={open:0,shut:0,refused:0};const f=owdSet;owdSet=function(b,open,opt){const r=f(b,open,opt);if(N.inVil){if(r)N.ev.refused++;else if(open)N.ev.open++;else N.ev.shut++;}return r;};};
N.sim=function(vi,secs,o){o=o||{};N.patch();const v=OW.villages[vi],dt=1/30,n=Math.round(secs/dt);let bad=0,wall=0,close=0,nan=0,ms=0,maxMs=0,inside=0,frames=0;const ex=[];
  if(heroU&&!o.keepHero){heroU.x=v.x+(o.hx||v.rad+8);heroU.z=v.z+(o.hz||0);}
  if(heroU)camera.position.set(heroU.x,owH(heroU.x,heroU.z)+6,heroU.z+4);/* (the game plans the houses round the camera when it is not the hero's) */
  const s0=Object.assign({},VILN.stats),e0=Object.assign({},N.ev);
  for(let i=0;i<n;i++){v.near=true;v.under=false;v.lastAttack=-1e9;time+=dt;N.inVil=true;const a=performance.now();owVillagerStep(v,dt,time);const e=performance.now()-a;N.inVil=false;ms+=e;maxMs=Math.max(maxMs,e);frames++;
    if(i%3===0)OWI.tScan=-9;owiTick(dt);
    for(const p of v.villagers){if(!p.g.visible)continue;if(!isFinite(p.x)||!isFinite(p.z)||!isFinite(p.g.position.y)){nan++;continue;}
      if(p.mode==='door'&&p.inB)inside++;
      if(p.ds)continue;
      if(!vilFree(v,p.x,p.z,.17)){bad++;if(ex.length<8)ex.push({k:'bad',x:+p.x.toFixed(2),z:+p.z.toFixed(2),mode:p.mode,job:p.job});}
      for(const b of v.buildings){const c=b.ic&&b.ic.col;if(!c||!c.bb)continue;const l=owiW2L(b,p.x,p.z),q=c.bb;if(l[0]<q.x0-.3||l[0]>q.x1+.3||l[1]<q.z0-.3||l[1]>q.z1+.3)continue;
        if(owiHit(c,l[0],l[1],1,.15)){wall++;if(ex.length<8)ex.push({k:'wall',x:+p.x.toFixed(2),z:+p.z.toFixed(2),mode:p.mode,b:b.type});break;}}
      for(const q of v.villagers)if(q!==p&&q.g.visible&&!q.ds&&Math.hypot(q.x-p.x,q.z-p.z)<.35)close++;}}
  const st={};for(const k in VILN.stats)st[k]=+(VILN.stats[k]-s0[k]).toFixed(1);const ev={};for(const k in N.ev)ev[k]=N.ev[k]-e0[k];
  return{village:v.name,tier:v.tier,n:v.villagers.length,frames,bad,wall,close:close/2,nan,insideFrames:inside,ev,st,msAvg:+(ms/frames).toFixed(3),msMax:+maxMs.toFixed(2),
    modes:v.villagers.reduce((m,p)=>(m[p.mode]=(m[p.mode]||0)+1,m),{}),ex};};
/* a door in use: the house of a villager on a door visit */
N.doorUser=function(vi){const v=OW.villages[vi];return v.villagers.find(p=>p.ds)||null;};
N.shot=async function(vi,o){o=o||{};const v=OW.villages[vi];let cx=v.x,cz=v.z,ex,ez,h=o.h||9;const p=o.p||N.doorUser(vi);
  if(p&&p.ds){const b=p.ds.b,f=owiL2W(b,b.vd.u,b.vd.A[1]+(o.back||4.5));cx=b.x;cz=b.z;ex=f[0];ez=f[1];h=o.h||3.2;}else{ex=cx+12;ez=cz+12;}
  const hv=heroU&&heroU.g.visible;if(heroU)heroU.g.visible=false;window.__pw.pose(ex,ez,h,cx,cz,o.th||1.2,o.t==null?600:o.t);
  for(const q of v.villagers){q.g.visible=true;}v.near=true;renderer.render(scene,camera);if(heroU)heroU.g.visible=hv;
  const cv=renderer.domElement,url=cv.toDataURL('image/jpeg',.85);return (await fetch('http://localhost:8766/'+(o.name||'vn')+'.jpg',{method:'POST',body:url})).status;};
})();
