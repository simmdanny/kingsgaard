(async function(){
/* The cost of drawing a house from inside (third person in the common room of the tavern, in a three-storey row house, a hearth room at night): the median of 60 renders with gl.finish() (perf-world.js P.measure). Run in two builds and compare.
   Needs int-lib.js, perf-world.js and ls-shot.js (I.setup(3) first); in a build without the light grid the helper only needs L.enter. */
const P=window.__pw,I=window.__iw,out={};
const enter=(b,lv)=>{const w=owiL2W(b,0,0);if(OWI.cb!==b){if(OWI.cb)owiLeave();OWI.cb=b;OWI.lv=0;OWI.in=false;owBldRefresh(b);owiCastOn(b,true);}OWI.lv=lv;OWI.in=true;heroU.oyT=null;};
const scenes=[['tavern, noon',{type:'tavern',x:165,z:-149},560],['tavern, night',{type:'tavern',x:165,z:-149},1500],['row house, noon',{type:'rowc',x:198,z:-124},560],['row house, night',{type:'rowc',x:198,z:-124},1500]];
for(const[name,s,t]of scenes){const b=OWI.list.find(q=>q.type===s.type&&Math.abs(q.x-s.x)<2&&Math.abs(q.z-s.z)<2);owiEnsurePlan(b);const q=I.ground(b,4);I.tele(q[0],q[1]);I.settle(b);meta.dayT=t;
  const F=b.ic.P.floors[0],r=F.rooms[0].rects[0],w=owiL2W(b,(r.xa+r.xb)/2,(r.za+r.zb)/2);I.tele(w[0],w[1]);enter(b,0);
  for(let i=0;i<60;i++){OWI.tScan=-9;heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+i/30);owFrame();}
  camSet('tp');TPC.yaw=.6;TPC.pitch=.55;TPC.dist=6;for(let k=0;k<30;k++){heroUpdate(1/30);owiTick(1/30);owFrame();}owView(true);tpcApply();
  const m=P.measure(60);out[name]={cpu:m.cpu,gpu:m.gpu,total:m.med,calls:m.calls,tris:Math.round(m.tris/1000)+'k'};}
return JSON.stringify(out);})()
