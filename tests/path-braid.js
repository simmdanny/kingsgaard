/* Paths drawn side by side (environment upgrade 04). Load with __kk.ev in the dev build, after a world is up (e.g. __pw.setup(3)):
   __braid() -> {raw:{m,spots}, drawn:{m,spots}}: metres of road that lie 0.6..6 m from an earlier road's line and run along it (|cos| > .8) -
   raw: the roads of the world as the generator made them (OW.roads through owgGateFit), drawn: the roads of the ground network (OW.G.paths, kind 0), after owgMerge.
   Only stretches longer than 10 m count. spots: a few of them [id, x, z, distance where it starts, length]. */
window.__braid=function(){
  function braid(lines){const C=8,h=new Map();
    const add=(li,ax,az,bx,bz)=>{const i0=Math.floor((Math.min(ax,bx)-6)/C),i1=Math.floor((Math.max(ax,bx)+6)/C),j0=Math.floor((Math.min(az,bz)-6)/C),j1=Math.floor((Math.max(az,bz)+6)/C);
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=i+','+j;(h.get(k)||h.set(k,[]).get(k)).push([li,ax,az,bx,bz]);}};
    lines.forEach((L,li)=>{for(let i=0;i<L.pts.length-1;i++)add(li,L.pts[i][0],L.pts[i][1],L.pts[i+1][0],L.pts[i+1][1]);});
    let tot=0;const spots=[];
    let run=0,at=null;const end=()=>{if(run>10){tot+=run;if(spots.length<12)spots.push(at.concat(Math.round(run)));}run=0;at=null;};
    lines.forEach((L,li)=>{const P=L.pts;for(let i=1;i<P.length-1;i++){const q=P[i];let ux=P[i+1][0]-P[i-1][0],uz=P[i+1][1]-P[i-1][1];const ul=Math.hypot(ux,uz)||1;ux/=ul;uz/=ul;
      const S=h.get(Math.floor(q[0]/C)+','+Math.floor(q[1]/C));if(!S){end();continue;}let bd=1e9;
      for(const s of S){if(s[0]>=li)continue;const dx=s[3]-s[1],dz=s[4]-s[2],l2=dx*dx+dz*dz;if(l2<1e-6)continue;if(Math.abs((dx*ux+dz*uz)/Math.sqrt(l2))<.8)continue;
        const t=Math.max(0,Math.min(1,((q[0]-s[1])*dx+(q[1]-s[2])*dz)/l2)),d=Math.hypot(s[1]+dx*t-q[0],s[2]+dz*t-q[1]);if(d<bd)bd=d;}
      /* (only stretches over 10 m: a fork, where one road leaves the other, passes through these distances too) */
      if(bd>.6&&bd<6){run+=Math.hypot(P[i+1][0]-q[0],P[i+1][1]-q[1]);if(!at)at=[L.id,Math.round(q[0]),Math.round(q[1]),+bd.toFixed(1)];}else end();}end();});
    return {m:Math.round(tot),spots};}
  const raw=OW.roads.map((rd,i)=>({id:i,pts:owgGateFit(rd.pts)})),drawn=[];
  for(const [rid,S] of OW.G.paths)if(S[0].kind===0){const e=S[S.length-1];drawn.push({id:rid,pts:S.map(g=>[g.ax,g.az]).concat([[e.ax+e.dx,e.az+e.dz]])});}
  return {raw:braid(raw),drawn:braid(drawn)};};
