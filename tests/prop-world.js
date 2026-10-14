(function(){
/* Every prop that owTownDress put in a world (dev hook window.__propLog): its lowest point against the ground under its footprint. A prop floats when its lowest part is above the lowest ground it stands on
   (it stands on that, Yf), is buried when ground rises far above it. Needs int-lib.js; runs I.setup itself with the seeds of window.__seeds. Returns a JSON summary. */
const I=window.__iw,seeds=window.__seeds||[3],sum={props:0,float:0,buried:0,byKind:{},worst:[]};
for(const seed of seeds){window.__propLog=[];I.setup(seed);const log=window.__propLog;window.__propLog=null;
  for(const e of log){if(!e.parts.length)continue;const g=mergeParts(e.parts);g.computeBoundingBox();const bb=g.boundingBox;g.dispose();let mn=1e9,mx=-1e9;
    for(let i=0;i<=6;i++)for(let j=0;j<=6;j++){const x=bb.min.x+(bb.max.x-bb.min.x)*i/6,z=bb.min.z+(bb.max.z-bb.min.z)*j/6,h=owH(x,z);mn=Math.min(mn,h);mx=Math.max(mx,h);}
    const lo=bb.min.y,fl=lo-mn,bur=mx-lo;sum.props++;const k=e.kind;const o=sum.byKind[k]||(sum.byKind[k]={n:0,float:0,buried:0});o.n++;
    if(e.kind==='laundry')continue;/* a washing line's poles go into the ground by design, the line is up in the air */
    if(fl>.1){sum.float++;o.float++;if(sum.worst.length<6)sum.worst.push(k+' floats '+fl.toFixed(2)+' at '+e.x.toFixed(0)+','+e.z.toFixed(0));}
    if(bur>.6){sum.buried++;o.buried++;if(sum.worst.length<6)sum.worst.push(k+' buried '+bur.toFixed(2)+' at '+e.x.toFixed(0)+','+e.z.toFixed(0));}}}
return JSON.stringify(sum);
})()
