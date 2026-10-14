(function(){
/* Roads and the city walls: how many road segments cross the wall of a walled settlement somewhere that is not a gate, how many roads end at the wall outside a gate, and how far the roads that lead to a gate are from its opening. Dev build.
   window.__rw = {seeds, walled, crossings, deadEnds, details:[...]} Options: window.__rws = [seeds] */
const I=window.__iw,seeds=window.__rws||[1,2,3,4,5,6,7,8],R=window.__rw={seeds:seeds.length,walled:0,crossings:0,deadEnds:0,gates:0,gatesWithRoad:0,details:[]};
const segInt=(a,b,c,d)=>{const r=[b[0]-a[0],b[1]-a[1]],s=[d[0]-c[0],d[1]-c[1]],den=r[0]*s[1]-r[1]*s[0];if(Math.abs(den)<1e-9)return null;const t=((c[0]-a[0])*s[1]-(c[1]-a[1])*s[0])/den,u=((c[0]-a[0])*r[1]-(c[1]-a[1])*r[0])/den;if(t<0||t>1||u<0||u>1)return null;return[a[0]+r[0]*t,a[1]+r[1]*t];};
for(const seed of seeds){I.setup(seed);
  for(const v of OW.villages){if(!v.walls||!v.wallPts)continue;R.walled++;const P=v.wallPts,N=P.length,G=v.walls.gates;R.gates+=G.length;
    const nearGate=(x,z,m)=>G.some(g=>Math.hypot(x-g.x,z-g.z)<g.w/2+m);
    for(const rd of OW.roads){const p=rd.pts;for(let i=0;i<p.length-1;i++){for(let k=0;k<N;k++){const hit=segInt(p[i],p[i+1],P[k],P[(k+1)%N]);if(hit&&!nearGate(hit[0],hit[1],.6)){R.crossings++;if(R.details.length<10)R.details.push('seed '+seed+' '+v.name+' t'+v.tier+' road '+rd.kind+' crosses the wall at '+hit.map(q=>Math.round(q))+' (nearest gate '+Math.round(Math.min(...G.map(g=>Math.hypot(hit[0]-g.x,hit[1]-g.z))))+' m)');}}}
      /* an end of a road that stops at the wall */
      for(const e of[p[0],p[p.length-1]]){let dw=1e9;for(let k=0;k<N;k++){const a=P[k],b=P[(k+1)%N],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((e[0]-a[0])*dx+(e[1]-a[1])*dz)/(dx*dx+dz*dz||1)));dw=Math.min(dw,Math.hypot(e[0]-a[0]-dx*t,e[1]-a[1]-dz*t));}
        if(dw<3&&!nearGate(e[0],e[1],3)){R.deadEnds++;if(R.details.length<10)R.details.push('seed '+seed+' '+v.name+' t'+v.tier+' a road ends '+dw.toFixed(1)+' m from the wall, not at a gate ('+e.map(q=>Math.round(q))+')');}}}
    for(const g of G){if(OW.roads.some(rd=>rd.pts.some(q=>Math.hypot(q[0]-g.x,q[1]-g.z)<g.w/2+3)))R.gatesWithRoad++;}}}
return JSON.stringify(R);})()
