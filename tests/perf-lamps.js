(function(){
/* What the lanterns cost at night in the city street of seed 3 (the same pose as perf-compare.js): the median of 60 renders with everything on, with the shadow lights taken out of the scene (castShadow off for the draw), with all the lamp lights off, and by day.
   Needs perf-world.js (load first). window.__pl = {...} */
const P=window.__pw,out=window.__pl={};
if(!window.__pwDone||window.__pwSeed!==3){P.setup(3);window.__pwDone=true;window.__pwSeed=3;}
const v0=OW.villages[0],sx=v0.sqr.x,sz=v0.sqr.z;
const settle=n=>{for(let i=0;i<n;i++){OWI.tScan=-9;owiTick(.1);}};
const pose=t=>{P.pose(sx+14,sz+10,2.0,sx-10,sz-14,3,t);settle(40);P.pose(sx+14,sz+10,2.0,sx-10,sz-14,3,t);};
const m=()=>{const r=P.measure(40);return{ms:r.med,calls:r.calls,tris:Math.round(r.tris/1000)+'k'};};
pose(1500);out.nightAll=m();
const S=OWLT.slots,vis=S.map(s=>s.l.visible),ints=S.map(s=>s.l.intensity);
/* the lights stay in the scene, but they all sit out of range: what is left is the cost of the loops and the maps */
S.forEach(s=>{s.l.intensity=0;});out.nightNoIntensity=m();S.forEach((s,i)=>s.l.intensity=ints[i]);
S.forEach(s=>{if(s.sh)s.l.castShadow=false;});out.nightShadowOff=m();S.forEach(s=>{if(s.sh)s.l.castShadow=true;});
pose(600);out.day=m();
out.lights=(()=>{let p=0,sh=0;scene.traverse(o=>{if(o.isPointLight&&o.visible){p++;if(o.castShadow)sh++;}});return{point:p,shadowPoint:sh};})();
return JSON.stringify(out);})()
