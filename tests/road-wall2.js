(function(){
/* Like road-wall.js, but for the roads as they are DRAWN (the ground segments of kind 0 that owgFinish lays down, after owgGateFit): how many cross the wall of a walled settlement outside a gate opening.
   Dev build. window.__rw2 = {seeds, walled, crossings, details:[...]} Options: window.__rws = [seeds] */
const I=window.__iw,seeds=window.__rws||[1,2,3,4,5,6,7,8],R=window.__rw2={seeds:seeds.length,walled:0,crossings:0,gates:0,details:[]};
if(!window.__rw2w){window.__rw2w=true;const o=owgSeg;owgSeg=function(kind,ax,az,bx,bz,wa,wb,pa,pb,ps,curb,s0,rid){if(kind===0&&window.__rw2log)window.__rw2log.push([ax,az,bx,bz]);return o(kind,ax,az,bx,bz,wa,wb,pa,pb,ps,curb,s0,rid);};}
const segInt=(a,b,c,d)=>{const r=[b[0]-a[0],b[1]-a[1]],s=[d[0]-c[0],d[1]-c[1]],den=r[0]*s[1]-r[1]*s[0];if(Math.abs(den)<1e-9)return null;const t=((c[0]-a[0])*s[1]-(c[1]-a[1])*s[0])/den,u=((c[0]-a[0])*r[1]-(c[1]-a[1])*r[0])/den;if(t<0||t>1||u<0||u>1)return null;return[a[0]+r[0]*t,a[1]+r[1]*t];};
for(const seed of seeds){window.__rw2log=[];I.setup(seed);const log=window.__rw2log;window.__rw2log=null;
  for(const v of OW.villages){if(!v.walls||!v.wallPts)continue;R.walled++;const P=v.wallPts,N=P.length,G=v.walls.gates;R.gates+=G.length;
    const inGate=(x,z)=>G.some(g=>Math.hypot(x-g.x,z-g.z)<g.w/2+.6);
    for(const s of log){if(Math.hypot(s[0]-v.x,s[1]-v.z)>v.rad*1.6)continue;for(let k=0;k<N;k++){const h=segInt([s[0],s[1]],[s[2],s[3]],P[k],P[(k+1)%N]);if(h&&!inGate(h[0],h[1])){R.crossings++;if(R.details.length<10)R.details.push('seed '+seed+' '+v.name+' crosses the wall at '+h.map(q=>Math.round(q)));break;}}}}}
return JSON.stringify(R);})()
