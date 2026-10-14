(async function(){
/* A third person screenshot of the open world at a place: window.__gs = {at:[x,z], yaw | look:[dx,dz] (the direction the camera looks), pitch, dist, t, name}. Needs int-lib.js and ls-shot.js (I.setup first). */
const o=window.__gs||{},I=window.__iw;
I.tele(o.at[0],o.at[1]);if(OWI.cb)owiLeave();
if(o.t!=null){meta.dayT=o.t;}
camSet('tp');if(o.look)o.yaw=Math.atan2(-o.look[0],-o.look[1]);TPC.yaw=o.yaw||0;TPC.pitch=o.pitch==null?.5:o.pitch;TPC.dist=o.dist||6;
for(let i=0;i<30;i++){heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+i/30);owFrame();}
if(typeof owgView==='function')owgView(o.at[0],o.at[1],true);
for(let i=0;i<6;i++){heroUpdate(1/30);anim(1/30,performance.now()/1000+i/30);owFrame();}
tpcApply();const s=await window.__sh(o.name||'gs');return 'shot '+s;
})()
