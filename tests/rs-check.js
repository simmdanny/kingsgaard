(function(){
/* The stream's banks (river look 4, src/world/wrstone.js), in a page with a world loaded (WRL, WBLD, the world's workers) and the stones of the pieces near done:
   __rsc.tufts(k)  the grass and reeds a world worker places (wrsTuftWork) against the same job run on the main thread, for k stream pieces near the camera
                   whose stones are done: the same spots, heights and random state, number for number. -> {pieces, spots, same, diff}
   Results on window.__rscR (poll). */
const T=window.__rsc={};
const ev=s=>__kk.ev(s);
T.tufts=k=>{window.__rscR=null;const jobs=JSON.parse(ev(`(function(k){const c=camera.position,L=[...WRS.segs.values()].filter(e=>e.tops&&e.spots).sort((a,b)=>wrsDist(a,c)-wrsDist(b,c)).slice(0,k);
    return JSON.stringify(L.map(e=>{const b=e.bb;return{i:e.p.i,j:e.p.j,tops:[].concat(...e.tops.map(([st,nx,nz])=>[st.x,st.z,st.rw,st.top,st.kind,st.wl,nx,nz])),spots:[].concat(...e.spots.map(st=>[st.x,st.z,st.rw])),tseed:e.tseed,lseed:e.lseed,NREED:e.NREED,st:WG.stampsIn?WG.stampsIn(b[0]-4,b[1]-4,b[2]+4,b[3]+4):null};}));})(${k|0})`));
  const out={pieces:jobs.length,spots:0,same:0,diff:[]};let left=jobs.length;if(!left){window.__rscR=out;return;}
  jobs.forEach((m,n)=>{const main=JSON.parse(ev(`(function(m){const g=wrsTuftWork(m);return JSON.stringify({spots:g.spots,hs:Array.from(g.hs).map(v=>isNaN(v)?'nan':v),rs:g.rs});})(${JSON.stringify(m)})`));
    const w=new Worker(ev('WT.url||null')||URL.createObjectURL(new Blob([ev("document.getElementById('wg-src').textContent")],{type:'text/javascript'})));
    w.onmessage=e=>{const d=e.data;if(d.id!==777)return;const g=d.g,ws={spots:g.spots,hs:Array.from(g.hs).map(v=>isNaN(v)?'nan':v),rs:g.rs},A=JSON.stringify(ws),B=JSON.stringify(main);
      out.spots+=main.spots.length;if(A===B)out.same++;else out.diff.push({n,mainN:main.spots.length,workerN:ws.spots.length});w.terminate();if(--left===0)window.__rscR=out;};
    w.postMessage({init:1,seed:ev('WG.seed')});w.postMessage(Object.assign({rt:1,id:777},m));});};
})();
