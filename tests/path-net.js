(function(){
/* The drawn path network (the ground segments of OW.G: roads, streets, lanes, paths) of the settlements of Tier 4 and 5: free ends (a path that stops in the open), near misses (an end that is 0.3 to 4 m from another path but not on it: a gap),
   and segments whose ends are not on the previous one. Dev build. window.__pn = {villages, ends, gaps, details:[...]} Options: window.__pns = [seeds] */
const I=window.__iw,seeds=window.__pns||[1,2,3,4,5,6],R=window.__pn={villages:0,ends:0,gaps:0,total:0,details:[]};
if(!window.__pnWrapped){window.__pnWrapped=true;const o=owgSeg;owgSeg=function(kind,ax,az,bx,bz,wa,wb,pa,pb,ps,curb,s0,rid){(window.__segLog||(window.__segLog=[])).push({kind,ax,az,dx:bx-ax,dz:bz-az,wa,wb,rid,il2:1/Math.max(1e-6,(bx-ax)*(bx-ax)+(bz-az)*(bz-az))});return o(kind,ax,az,bx,bz,wa,wb,pa,pb,ps,curb,s0,rid);};}
for(const seed of seeds){window.__segLog=[];I.setup(seed);
  const all=window.__segLog.slice();
  for(const v of OW.villages){if(v.tier<4)continue;R.villages++;const inside=s=>Math.hypot(s.ax-v.x,s.az-v.z)<v.rad*1.15||Math.hypot(s.ax+s.dx-v.x,s.az+s.dz-v.z)<v.rad*1.15;
    const mine=all.filter(inside);const ends=new Map();const key=(x,z)=>Math.round(x*2)+','+Math.round(z*2);
    for(const s of mine){for(const[x,z]of[[s.ax,s.az],[s.ax+s.dx,s.az+s.dz]]){const k=key(x,z);const o=ends.get(k)||{x,z,n:0};o.n++;ends.set(k,o);}}
    /* the distance of a point from the EDGE of a segment (the half width of the path there is taken off): 0 or less means the point is on the path */
    const distSeg=(x,z,s)=>{const t=Math.max(0,Math.min(1,((x-s.ax)*s.dx+(z-s.az)*s.dz)*s.il2)),px=s.ax+s.dx*t,pz=s.az+s.dz*t,hw=s.wa+(s.wb-s.wa)*t;return Math.max(0,Math.hypot(x-px,z-pz)-hw);};
    for(const o of ends.values()){if(o.n!==1)continue;R.total++;
      /* near the wall or a gate, or a door, is not an end in the open: only the ends inside the settlement count */
      if(Math.hypot(o.x-v.x,o.z-v.z)>v.rad*.95)continue;
      if(v.buildings.some(b=>Math.hypot(o.x-b.x,o.z-b.z)<b.r*1.1+3.5))continue;/* the end of a path at the door of a house is where it is meant to end */
      let near=1e9;for(const s of mine){const d=distSeg(o.x,o.z,s);if(d>.05&&d<near&&!(Math.hypot(s.ax-o.x,s.az-o.z)<.05||Math.hypot(s.ax+s.dx-o.x,s.az+s.dz-o.z)<.05)){near=d;}}
      const own=mine.some(s=>distSeg(o.x,o.z,s)<.05&&!(Math.hypot(s.ax-o.x,s.az-o.z)<.05||Math.hypot(s.ax+s.dx-o.x,s.az+s.dz-o.z)<.05));
      if(own)continue;
      if(near>.3&&near<4){R.gaps++;if(R.details.length<10)R.details.push('seed '+seed+' '+v.name+' t'+v.tier+': a path ends '+near.toFixed(1)+' m from another at '+Math.round(o.x)+','+Math.round(o.z));}
      else{R.ends++;if(R.details.length<10)R.details.push('seed '+seed+' '+v.name+' t'+v.tier+': a path ends in the open at '+Math.round(o.x)+','+Math.round(o.z));}}}}
return JSON.stringify(R);})()
