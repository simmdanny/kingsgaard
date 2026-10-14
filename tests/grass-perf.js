(async function(){
/* What the grass costs (grass.js): views rendered with the grass shown and hidden, frames in short batches taken in turns (gl.finish), and how long a cell takes to build.
   Needs perf-world.js; window.__gp = {views:[{name,x,z,h,tx,tz,th}], batches, per} -> window.__gpOut */
const P=window.__pw,o=window.__gp||{},out={},gl=renderer.getContext(),yieldNow=()=>new Promise(r=>{const c=new MessageChannel();c.port1.onmessage=()=>r();c.port2.postMessage(0);});window.__gpOut=null;
paused=true;const frame=()=>{const a=performance.now();renderer.render(scene,camera);gl.finish();return performance.now()-a;};
const q=(a,f)=>{const s=a.slice().sort((x,y)=>x-y);return+s[Math.floor(s.length*f)].toFixed(2);};
for(const v of(o.views||[])){P.pose(v.x,v.z,v.h,v.tx,v.tz,v.th,v.t==null?600:v.t);paused=true;grsView(true);
  const set=on=>{GRS.group.visible=on;};const cnt={};for(const m of[1,0]){set(!!m);renderer.render(scene,camera);cnt[m?'grass':'none']={calls:renderer.info.render.calls,tris:renderer.info.render.triangles};}
  let inst=0;for(const c of GRS.cells.values())for(const m of c.meshes)if(m.visible)inst+=m.count;
  const T={grass:[],none:[]};for(let i=0;i<4;i++)frame();
  for(let b=0;b<(o.batches||30);b++){for(const m of['grass','none']){set(m==='grass');frame();for(let k=0;k<(o.per||5);k++)T[m].push(frame());}await yieldNow();}
  set(true);out[v.name]={c:cnt,clumpsDrawn:inst,grass:{p10:q(T.grass,.1),p25:q(T.grass,.25),p50:q(T.grass,.5)},none:{p10:q(T.none,.1),p25:q(T.none,.25),p50:q(T.none,.5)}};}
/* building: a fresh cell at a time */
{const ks=[...GRS.cells.keys()].slice(0,12),ms=[];for(const k of ks){const c=GRS.cells.get(k);for(const m of c.meshes)GRS.group.remove(m);const [a,b]=k.split(',').map(Number);const t0=performance.now();const c2=grsBuild(a,b);ms.push(performance.now()-t0);GRS.cells.set(k,c2);}
  out.buildMs={p50:q(ms,.5),max:+Math.max(...ms).toFixed(1)};}
paused=false;window.__gpOut=JSON.stringify(out);return window.__gpOut;})()
