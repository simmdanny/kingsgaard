(async function(){
/* What the paving stones cost to draw (roadstones.js): views of Hartwick (seed 3) rendered with the stone meshes shown and hidden (and, for comparison, with the ground of before: the stones hidden and the
   bed painted as before), in short batches taken in turns; each frame timed with gl.finish(). Needs perf-world.js and road-lab.js. window.__rp = {views:[...], batches, per} -> window.__rpOut */
const P=window.__pw,o=window.__rp||{},R=window.__rl,out={},gl=renderer.getContext(),yieldNow=()=>new Promise(r=>{const c=new MessageChannel();c.port1.onmessage=()=>r();c.port2.postMessage(0);});window.__rpOut=null;
if(!window.__pwDone||window.__pwSeed!==3){P.setup(3);window.__pwDone=true;window.__pwSeed=3;}
paused=true;const at=(s,l)=>R.at(1,s,l);
const frame=()=>{const a=performance.now();renderer.render(scene,camera);gl.finish();return performance.now()-a;};
const stones=()=>[...OW.G.tiles.values()].filter(t=>t.stone).map(t=>t.stone);
/* 'old': the stones hidden and every ground tile marked as not built (the bed paints the stones, as the old ground painted its paving) */
const marks=on=>{for(const t of OW.G.tiles.values())if(t.stone&&t.mesh){const a=t.mesh.geometry.attributes.aSt;if(!a)continue;for(let i=0;i<a.array.length;i++)a.array[i]=Math.abs(a.array[i])*(on?1:-1);a.needsUpdate=true;}};
const mode=m=>{for(const s of stones())s.visible=m==='stones';marks(m==='stones');};
const views=o.views||(()=>{const a=at(44,0),b=at(56,0),c=at(30,0),d=at(80,0);return[{name:'street gameplay',x:a[0],z:a[1],h:4.2,tx:b[0],tz:b[1],th:.4},{name:'street long',x:c[0],z:c[1],h:2.2,tx:d[0],tz:d[1],th:.8},{name:'junction high',x:168,z:-80,h:14,tx:159.7,tz:-89.1,th:0}];})();
for(const v of views){P.pose(v.x,v.z,v.h,v.tx,v.tz,v.th,v.t==null?600:v.t);OW.focus={x:v.x,z:v.z};owgView(v.x,v.z,true);paused=true;
  for(const t of OW.G.tiles.values())if(t.stone)t.stone.visible=!!(t.mesh&&t.mesh.visible);
  const cnt={};for(const m of['stones','old']){mode(m);renderer.render(scene,camera);cnt[m]={calls:renderer.info.render.calls,tris:renderer.info.render.triangles};}
  const T={stones:[],old:[]};for(let i=0;i<4;i++)frame();
  for(let b=0;b<(o.batches||30);b++){for(const m of['stones','old']){mode(m);frame();for(let k=0;k<(o.per||5);k++)T[m].push(frame());}await yieldNow();}
  const q=(a,f)=>{const s=a.slice().sort((x,y)=>x-y);return+s[Math.floor(s.length*f)].toFixed(2);};
  out[v.name]={c:cnt,stones:{p10:q(T.stones,.1),p25:q(T.stones,.25),p50:q(T.stones,.5)},old:{p10:q(T.old,.1),p25:q(T.old,.25),p50:q(T.old,.5)}};}
mode('stones');paused=false;window.__rpOut=JSON.stringify(out);return window.__rpOut;})()
