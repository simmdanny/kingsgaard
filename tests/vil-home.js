(function(){
/* The villagers at home (vilhome.js). Needs perf-world.js and vil-nav.js (window.__vn). window.__vh:
     beds(vi)              every villager's place: house, floor, bed or bedroll; and whether the way from the door to it exists
     night(vi, o, cb)      runs village vi from o.t0 (dayT, default 1080) for o.secs of game time (default 1150: dusk to mid-morning), the day clock advancing with it,
                           in chunks (setTimeout, so a tool call never waits long); cb(result) at the end, also window.__vhR.
                           Counts: in bed at o.tCheck (default 1330), the wanderers awake then, everyone out and about by o.tOut (default 300 next day),
                           a villager walking inside a house through a collider of its floor (.12), on a floor its height does not match, NaN, failed routes, ms.
     hero(vi, o)           o.at = 'bed' / 'stairs': puts the hero in the house of a villager to watch (the cutaway, the floors drawn) */
const H=window.__vh=window.__vh||{};
H.beds=function(vi){const v=OW.villages[vi];return v.villagers.map((p,i)=>{const s=p.vh&&p.vh.slot;if(!s)return{i,none:true};const b=s.b;let side=null,r=null;if(b.vd)for(const q of vilHSides(s)){r=vilHRoute(b,0,b.vd.I,s.lv,q);if(r){side=q;break;}}
  return{i,house:b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0),lv:s.lv,kind:s.it?s.it.kind+(s.side?(s.side<0?'L':'R'):''):'roll',side:!!side,route:r?r.length:null,stairs:r?r.filter(q=>q.st).length/2:null};});};
H.night=function(vi,o,cb){o=o||{};const v=OW.villages[vi],dt=1/30,t0=o.t0==null?1080:o.t0,secs=o.secs||1150,tCheck=o.tCheck||1330,tOut=o.tOut||300,n=Math.round(secs/dt);
  __vn.patch();meta.dayT=t0;meta.dayN=meta.dayN|0;const r={village:v.name,n:v.villagers.length,frames:0,ms:0,maxMs:0,pen:0,lvBad:0,nan:0,ex:[],check:null,out:null,lie:0,routes0:VILH.stats.routes,noRoute0:VILH.stats.noRoute};
  if(heroU&&!o.keepHero){heroU.x=v.x+(o.hx||v.rad+8);heroU.z=v.z+(o.hz||0);}if(heroU)camera.position.set(heroU.x,owH(heroU.x,heroU.z)+6,heroU.z+4);
  let i=0;const step=()=>{const tEnd=performance.now()+30;
    while(i<n&&performance.now()<tEnd){v.near=true;v.under=false;v.lastAttack=-1e9;time+=dt;const tPrev=meta.dayT;meta.dayT=(meta.dayT+dt)%DAYC.T;if(meta.dayT<tPrev)meta.dayN=(meta.dayN|0)+1;
      const a=performance.now();owVillagerStep(v,dt,time);const e=performance.now()-a;r.ms+=e;r.maxMs=Math.max(r.maxMs,e);r.frames++;if(i%3===0)OWI.tScan=-9;owiTick(dt);
      for(const p of v.villagers){if(p.hold)continue;if(!isFinite(p.x)||!isFinite(p.z)||!isFinite(p.g.position.y)){r.nan++;continue;}
        if(p.ds&&p.ds.home&&p.inB&&!(p.lieK>0)&&!p.ds.ghost){/* (a door far from the hero is not swung - vilHFar: walked through shut, unseen) */const b=p.inB,l=owiW2L(b,p.x,p.z),lv=p.lv||0,st=p.ds.q[p.ds.k];
          if(owiHit(b.ic.col,l[0],l[1],1<<lv,.12)&&!(st&&st.st)){r.pen++;if(r.ex.length<8)r.ex.push({k:'pen',i:v.villagers.indexOf(p),b:b.type,lv,l:[+l[0].toFixed(2),+l[1].toFixed(2)],step:st&&(st.act||'to'),kk:p.ds.k});}
          const y=owiFloorY(b,l[0],l[1],lv,p.x,p.z),fy=b.hi+b.ic.P.floors[lv].y;if(Math.abs(p.g.position.y-y)>.6&&!b.ic.P.stairs.some(f=>l[0]>f.x0-.3&&l[0]<f.x1+.3&&l[1]>f.z0-.6&&l[1]<f.z1+.6)){r.lvBad++;if(r.ex.length<8)r.ex.push({k:'lv',i:v.villagers.indexOf(p),lv,y:+p.g.position.y.toFixed(2),want:+y.toFixed(2),fy:+fy.toFixed(2)});}}}
      const t=meta.dayT;
      if(!r.check&&t>=tCheck&&t<1700){const home=v.villagers.filter(p=>vilHHome(v,p)),wand=v.villagers.filter(p=>vilHWanderer(v,p));
        r.check={t:+t.toFixed(0),home:home.length,inBed:home.filter(p=>p.lieK>=2).length,notYet:home.filter(p=>!(p.lieK>=2)).map(p=>({i:v.villagers.indexOf(p),mode:p.mode,job:p.job,k:p.ds&&p.ds.k,act:p.ds&&p.ds.q[p.ds.k]&&(p.ds.q[p.ds.k].act||'to'),inB:!!p.inB})),wanderers:wand.length,wandUp:wand.filter(p=>!p.ds&&p.g.visible).length,noSlot:v.villagers.filter(p=>!(p.vh&&p.vh.slot)).length};}
      if(r.check&&!r.out&&t>=tOut&&t<900){r.out={t:+t.toFixed(0),stillHome:v.villagers.filter(p=>p.ds&&p.ds.home).map(p=>({i:v.villagers.indexOf(p),k:p.ds.k,act:p.ds.q[p.ds.k]&&(p.ds.q[p.ds.k].act||'to'),lie:p.lieK})).slice(0,6)};}
      i++;}
    if(i<n)setTimeout(step,0);else{r.msAvg=+(r.ms/r.frames).toFixed(3);r.maxMs=+r.maxMs.toFixed(1);r.ms=Math.round(r.ms);r.routes=VILH.stats.routes-r.routes0;r.noRoute=VILH.stats.noRoute-r.noRoute0;delete r.routes0;delete r.noRoute0;window.__vhR=r;if(cb)cb(r);}};
  window.__vhR=null;setTimeout(step,0);return 'started';};
})();
