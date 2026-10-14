(function(){
/* diagnostic: FP/TP casts at the walls of many buildings; which kinds do not stop the bolt? Needs int-lib.js */
const I=window.__iw;I.setup(3);meta.scrAuto=false;const H=heroU,v=OW.villages[0],out={n:0,bad:[],byMode:{}};
const place=(x,z)=>{H.x=x;H.z=z;H.hx=x;H.hz=z;H.oyT=null;H.g.position.set(x,owH(x,z),z);H._ga=H.g.position.y;H.ko=0;for(let i=0;i<4;i++){OWI.tScan=-9;owiTick(.1);}};
const clear=()=>{for(const e of enemies.slice())removeEnemy(e);enemies.length=0;for(const e of fx.slice()){try{scene.remove(e.o);}catch(_){}}fx.length=0;PSA.list.length=0;PSN.list.length=0;try{resetCine();}catch(_){}};
const cast=(k)=>{meta.spells[k]=meta.spells[k]||{lvl:1};H.scd={};H.gcd=0;H.anim=null;H.ko=0;const s=tStats(H),A=aimFor(H,k,s);fireScroll(H,k,s,A.list,A);return A;};
const tap=c=>{window.dispatchEvent(new KeyboardEvent('keydown',{code:c,bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{code:c,bubbles:true}));};
const frames=n=>{for(let i=0;i<n;i++){owFrame();if(!FLY.on)tpcApply();}camera.updateMatrixWorld();};
const to=m=>{let n=0;while(camMode()!==m&&n++<4){tap('KeyV');frames(2);}return camMode()===m;};
for(const mode of['tp','fp']){to(mode);out.byMode[mode]={n:0,bad:0};
  for(const b of v.buildings){if(b.ruined||!b.enter)continue;clear();const q=I.ground(b,7);place(q[0],q[1]);const dx=b.x-H.x,dz=b.z-H.z;TPC.yaw=Math.atan2(-dx,-dz);TPC.pitch=0;frames(2);const A=cast('lightbolt');
    out.byMode[mode].n++;if(!(A.kind==='bld'||A.kind==='enemy')){out.byMode[mode].bad++;if(out.bad.length<12)out.bad.push(mode+' '+b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' kind '+A.kind+' hh '+(b.arch&&b.arch.open?'open':'')+(b.pl&&b.pl.solid?'solid':''));}}}
to('tp');
return JSON.stringify(out,null,1);})()
