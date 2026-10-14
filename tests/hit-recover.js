(function(){
/* The recovery fallback: put the hero where no rule would have let it go and see what happens. Needs int-lib.js (window.__iw).
   Cases: a blocked grid cell beside a wall, inside a collider box, deep inside a building's blocked cells, between two buildings' boxes. For each: does the hero reach valid ground, how far, how long,
   does it move at walking pace (never a teleport), does its camera yaw / level / state stay, and does recovery stay quiet afterwards. */
const I=window.__iw;I.setup(window.__rseed||11);const H=heroU,out={cases:[],quiet:null};
const frame=dt=>{heroUpdate(dt);owiTick(dt);};
function run(name,x,z,secs){I.tele(x,z);for(let i=0;i<12;i++){OWI.tScan=-9;owiTick(.1);}H.okX=null;H.okZ=null;H.rcTo=null;H.badT=0;const yaw0=TPC.yaw,hp0=H.hpf,s0=OWI.stats.recov||0;TPC.keys.clear();
  const start=[H.x,H.z];let maxStep=0,px=H.x,pz=H.z,tOk=null,t=0;const valid0=owiValid(H.x,H.z);
  for(let f=0;f<secs*60;f++){frame(1/60);t+=1/60;const st=Math.hypot(H.x-px,H.z-pz);maxStep=Math.max(maxStep,st);px=H.x;pz=H.z;if(tOk==null&&owiValid(H.x,H.z)&&!H.rcTo)tOk=t;}
  const dist=Math.hypot(H.x-start[0],H.z-start[1]);
  out.cases.push({name,startValid:valid0,endValid:owiValid(H.x,H.z),dist:+dist.toFixed(2),secs:tOk==null?null:+tOk.toFixed(2),maxStepPerFrame:+maxStep.toFixed(3),yawKept:TPC.yaw===yaw0,triggers:(OWI.stats.recov||0)-s0});}
/* find the places */
const v=OW.villages[0];let bld=null;
/* (a) a blocked cell next to a wall: the cell beside a row house's side wall */
for(const b of OWI.list){if(!b.pl||!b.pl.row)continue;const l=[1.0,0],w=owiL2W(b,b.arch.rect0.x1*b.BSc+.35,0);if(!owiValid(w[0],w[1])&&owiColZones(w[0],w[1]).length){bld=b;break;}}
if(bld){const w=owiL2W(bld,bld.arch.rect0.x1*bld.BSc+.35,0);run('beside a row house wall (blocked cell)',w[0],w[1],4);}
/* (b) inside a wall box of an enterable house */
const hb=OWI.list.find(b=>!b.pl.row&&!b.tunnel);if(hb){owiEnsurePlan(hb);const Q=hb.ic.P.st[0].Q,w=owiL2W(hb,Q.xa-.05,(Q.za+Q.zb)/2);run('inside the side wall of a house',w[0],w[1],4);}
/* (c) in the middle of a furniture box */
for(const b of OWI.list){owiEnsurePlan(b);const F=b.ic.P.floors[0],it=F.items.find(i=>!i.deco&&!i.spec.flat&&i.ax>.6&&i.az>.4);if(it){const w=owiL2W(b,it.x,it.z);run('on top of a piece of furniture',w[0],w[1],4);break;}}
/* (d) deep in the blocked cells of a non-enterable building */
let barn=null;for(const vv of OW.villages)for(const b of vv.buildings)if(!b.enter&&!b.tunnel&&b.r>3&&!barn&&!(b.pl&&b.pl.row))barn=b;
if(barn){run('in the middle of a non-enterable building ('+barn.type+', r '+barn.r.toFixed(1)+')',barn.x,barn.z,8);}
/* (e) a normal valid place: nothing may happen */
{const g=I.ground(OWI.list[3],3);run('valid ground (control)',g[0],g[1],3);}
return JSON.stringify(out,null,1);})()
