(function(){
/* Player-like steering through the real controller: random WASD / camera-yaw input inside the enterable buildings of a world. Whenever the hero stays almost still while a key is held,
   the position is probed (16 directions, half a second each, from the exact same state): if none of them moves it, that is a trap. Needs int-lib.js (window.__iw).
   Options window.__st = {seed, per (buildings), secs (per building), skip, types, only:[x,z]} */
const I=window.__iw,o=Object.assign({seed:11,per:60,secs:30,skip:0,types:null,only:null},window.__st||{});
I.setup(o.seed);const H=heroU,R=mulberry(o.seed*7+3),out={buildings:0,frames:0,stills:0,traps:0,penetrations:0,levels:{},examples:[],pen:[],invalid:0,invStarts:0,inv:[]};
const state=()=>({x:H.x,z:H.z,cb:OWI.cb,lv:OWI.lv,in:OWI.in,oyT:H.oyT});
const restore=s=>{H.x=s.x;H.z=s.z;H.hx=s.x;H.hz=s.z;OWI.cb=s.cb;OWI.lv=s.lv;OWI.in=s.in;};
const tr=[];const frame=(dt)=>{heroUpdate(dt);owiTick(dt);};
const gridAround=(x,z)=>{const a=owCell(x,z);let s='';for(let r=a.r-2;r<=a.r+2;r++){for(let c=a.c-3;c<=a.c+3;c++){const q=grid[r]&&grid[r][c];s+=(r===a.r&&c===a.c?'[':' ')+(q===2?'#':q===1?'.':q===0?'_':'T')+(r===a.r&&c===a.c?']':' ');}s+='/';}return s;};
function probe(){const s0=state();let best=0,bestK=-1;
  for(let k=0;k<16;k++){restore(s0);TPC.keys.clear();TPC.yaw=k/16*Math.PI*2;TPC.keys.add('KeyW');for(let f=0;f<30;f++)frame(1/60);const d=Math.hypot(H.x-s0.x,H.z-s0.z);if(d>best){best=d;bestK=k;}if(best>.5)break;}
  TPC.keys.clear();restore(s0);return best;}
let list=OWI.list.filter(b=>!o.types||o.types.indexOf(b.type)>=0);if(o.only)list=list.filter(b=>Math.abs(b.x-o.only[0])<2&&Math.abs(b.z-o.only[1])<2);list=list.slice(o.skip,o.skip+o.per);
for(const b of list){const e=b.enter,g=I.ground(b,3);I.tele(g[0],g[1]);if(!I.settle(b))continue;out.buildings++;
  /* in through the door: straight up the approach axis */
  const door=owiL2W(b,e.u,e.zF-.3);let yaw=Math.atan2(-(door[0]-H.x),-(door[1]-H.z));TPC.yaw=yaw;TPC.keys.clear();TPC.keys.add('KeyW');for(let f=0;f<240&&!OWI.in;f++){frame(1/60);}
  let inv=false,still=0,lx=H.x,lz=H.z,left=0,keys=['KeyW'];
  for(let f=0;f<o.secs*60;f++){
    if(left--<=0){left=20+Math.floor(R()*100);TPC.yaw=R()*Math.PI*2;TPC.keys.clear();const c=R();if(c<.7)TPC.keys.add('KeyW');else if(c<.8){TPC.keys.add('KeyW');TPC.keys.add('KeyA');}else if(c<.9){TPC.keys.add('KeyW');TPC.keys.add('KeyD');}else TPC.keys.add('KeyS');if(R()<.3)TPC.keys.add('ShiftLeft');}
    if(o.stop&&Math.abs(b.x-o.stop[0])<1&&Math.abs(b.z-o.stop[1])<1&&f===o.stop[2]){window.__stopB=b;return JSON.stringify({stopped:true,pos:[H.x,H.z]});}
    if(o.dbg&&Math.abs(b.x-o.dbg[0])<1&&Math.abs(b.z-o.dbg[1])<1&&f>=o.dbg[2]&&f<=o.dbg[2]+6){const sp=TPC.speed*(TPC.keys.has('ShiftLeft')?1.8:1)/60,v=tpcVec(),dst=v?[H.x+v.x*sp,H.z+v.z*sp]:null,ci=owCell(H.x,H.z);out.dbg=out.dbg||[];out.dbg.push({f,pos:[+H.x.toFixed(4),+H.z.toFixed(4)],cell:ci.c+','+ci.r,keys:[...TPC.keys].join('+'),yaw:+TPC.yaw.toFixed(3),dst:dst&&dst.map(q=>+q.toFixed(4)),zH:owiZonesAt(H.x,H.z).map(q=>q.b.type+q.k).join(),zD:dst?owiZonesAt(dst[0],dst[1]).map(q=>q.b.type+q.k).join():'',stepR:dst?JSON.stringify(owiStep(H,dst[0],dst[1])):'',hsR:dst?JSON.stringify(owHeroStep(H,dst[0],dst[1])):'',canD:dst?owCanStand(dst[0],dst[1]):null});}
    frame(1/60);out.frames++;{const a=owCell(H.x,H.z);tr.push([+H.x.toFixed(3),+H.z.toFixed(3),typeof grid[a.r][a.c]==='object'?'T':grid[a.r][a.c],owiZonesAt(H.x,H.z).map(q=>q.b.type[0]+q.k).join(''),OWI.near.length,OWI.in?1:0,[...TPC.keys].join('')]);if(tr.length>60)tr.shift();}
    {const zn=owiZoneAt(H.x,H.z);if(zn&&owiHit(zn.b.ic.col,zn.lx,zn.lz,owiLvOf(zn.b),OWI.RAD-.03)){out.penetrations++;if(out.pen.length<8)out.pen.push({type:b.type,at:[+b.x.toFixed(1),+b.z.toFixed(1)],zone:zn.b.type+(zn.b===b?'':'(other)'),k:zn.k,lv:OWI.lv,cb:OWI.cb&&OWI.cb.type,local:[+zn.lx.toFixed(3),+zn.lz.toFixed(3)],near:I.near(zn.b,zn.lx,zn.lz,.3),f});}}
    {const ac=owCell(H.x,H.z);if(grid[ac.r][ac.c]===2&&!owiZoneAt(H.x,H.z)){out.invalid++;if(!inv){inv=true;out.invStarts++;if(out.inv.length<6)out.inv.push({type:b.type,at:[+b.x.toFixed(1),+b.z.toFixed(1)],pos:[+H.x.toFixed(3),+H.z.toFixed(3)],f,grid:gridAround(H.x,H.z),trace:tr.slice(-6)});}}else inv=false;}
    const mv=Math.hypot(H.x-lx,H.z-lz);lx=H.x;lz=H.z;
    if(mv<.004){still++;if(still===40){out.stills++;const b0=probe();if(b0<.3){out.traps++;if(out.examples.length<8){const zn=owiZoneAt(H.x,H.z);out.examples.push({type:b.type,at:[+b.x.toFixed(1),+b.z.toFixed(1)],pos:[+H.x.toFixed(3),+H.z.toFixed(3)],cell:owCell(H.x,H.z),grid:gridAround(H.x,H.z),frame:f,trace:tr.slice(-45).filter((q,i)=>i%2===0),keys:[...TPC.keys].join('+'),yaw:+TPC.yaw.toFixed(2),lv:OWI.lv,cb:OWI.cb&&OWI.cb.type,local:zn?[+zn.lx.toFixed(2),+zn.lz.toFixed(2)]:null,k:zn&&zn.k,best:+b0.toFixed(3),near:zn?I.near(zn.b,zn.lx,zn.lz,.5):null});}
        /* free it again so the walk goes on */I.tele(g[0],g[1]);for(let i=0;i<5;i++)frame(1/60);still=0;}}}else still=0;}
  out.levels['lv'+OWI.lv]=(out.levels['lv'+OWI.lv]||0)+1;
  TPC.keys.clear();}
return JSON.stringify(out,null,1);})()
