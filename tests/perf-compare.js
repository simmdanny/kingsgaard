(function(){
/* The same scenes in two builds: run this in each and compare. Seed 3 has a Tier 5 city (Hartwick), a Tier 4 town and Tier 1-3 villages. Each number is the median of 60 renders with gl.finish(). */
const P=window.__pw,out={},now=()=>performance.now();
if(!window.__pwDone||window.__pwSeed!==3){P.setup(3);window.__pwDone=true;window.__pwSeed=3;}
const v0=OW.villages[0],sx=v0.sqr.x,sz=v0.sqr.z,v1=OW.villages.find(v=>v.tier===2)||OW.villages[3];
const settle=n=>{for(let i=0;i<n;i++){if(typeof owiTick==='function'){OWI.tScan=-9;owiTick(.1);}}};
let sc=0;const want=window.__sc||null;
const scene=(name,x,z,h,tx,tz,th,t)=>{if(want&&want.indexOf(sc++)<0)return;P.pose(x,z,h,tx,tz,th,t);settle(40);P.pose(x,z,h,tx,tz,th,t);const m=P.measure(60);out[name]={gpu:m.gpu,cpu:m.cpu,total:m.med,calls:m.calls,tris:Math.round(m.tris/1000)+'k'};};
scene('city street, night',sx+14,sz+10,2.0,sx-10,sz-14,3,1500);
scene('city street, day',sx+14,sz+10,2.0,sx-10,sz-14,3,600);
scene('city overview from 150 m, day',v0.x+150,v0.z+110,18,v0.x,v0.z,6,600);
scene('city overview from 150 m, night',v0.x+150,v0.z+110,18,v0.x,v0.z,6,1500);
/* approaching the city along a line: far, mid, near the wall */
const ax=v0.x-.8*v0.rad,az=v0.z+.6*v0.rad;
scene('approach 190 m',v0.x+190,v0.z,2.0,v0.x,v0.z,4,600);scene('approach 110 m',v0.x+110,v0.z,2.0,v0.x,v0.z,4,600);scene('approach 60 m',v0.x+60,v0.z,2.0,v0.x,v0.z,4,600);
scene('village (tier 2), night',v1.x+16,v1.z+8,2.0,v1.x,v1.z,3,1500);
scene('village (tier 2), day',v1.x+16,v1.z+8,2.0,v1.x,v1.z,3,600);
out.lights=P.lights();out.build={ots:typeof OWI!=='undefined'};
return JSON.stringify(out,null,1);})()
