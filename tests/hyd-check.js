(function(){
/* The hydrology the workers work out (v54, wgHydPack in a worker -> wgHydPut on the main thread) against the main thread's own, in a page with no world
   running (the title screen; reload after it: it re-seeds the generator and clears the sites and landmarks).
   __hc.run({seeds, areas})  for each seed and each area (a square of blocks of 8 x 8 lattice points, 768 m: [bi0,bj0,size]) a worker of its own works the blocks out;
     1. bits: every block from the worker == the same block worked out on the main thread (wgHydPack there), number for number, bit for bit
     2. world: what the game reads of that land - heights (wgHeightRaw) on a 24 m grid, the streams and lakes (wgHydroIn: every number of every curve, every lake),
        the village sites and landmarks of its cells, two level-0 grids (wgGrid, every array) - with all the blocks taken in from the worker, with every other block
        taken in (a checkerboard: the main thread works out the rest, so the seams between the two are crossed), and worked out on the main thread alone: all equal.
   Results on window.__hcR (poll): {seed: {blocks, bitDiff, worldAll, worldMix, ms}, ok} */
const T=window.__hc={};
const bitsEq=(a,b)=>{if(!a||!b||a.length!==b.length)return false;const x=new Uint32Array(a.buffer,a.byteOffset,a.length*2),y=new Uint32Array(b.buffer,b.byteOffset,b.length*2);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;};
const f64=a=>{const o=new Float64Array(a.length);for(let i=0;i<a.length;i++)o[i]=a[i];return o;};
/* what the game reads of a rectangle, as one long list of numbers (and strings for sites) */
function sig(x0,z0,x1,z1){const N=[],S=[];
  for(let z=z0;z<=z1;z+=24)for(let x=x0;x<=x1;x+=24)N.push(wgHeightRaw(x,z));
  const H=wgHydroIn(x0,z0,x1,z1);
  for(const s of H.segs){N.push(s.n,s.hw,s.hwQ,s.dep,s.fb,s.acc,s.cut,s.vw,s.x0,s.x1,s.z0,s.z1,s.band,s.end,s.ax,s.az,s.bx,s.bz,s.cl2,s.cap,s.p.i,s.p.j,s.q.i,s.q.j);for(const v of s.pts)N.push(v);for(const v of s.wl)N.push(v);}
  for(const l of H.lakes)N.push(l.x,l.z,l.lev,l.R,l.dep,l.id);
  const C=WS_CFG.cell;for(let b=Math.ceil(z0/C);b<Math.floor(z1/C);b++)for(let a=Math.ceil(x0/C);a<Math.floor(x1/C);a++){const s=wsSite(a,b);S.push(s?s.name+':'+s.size+'@'+s.x+','+s.z+','+s.h:'-');}
  const FC=WF.cell;for(let b=Math.ceil(z0/FC);b<Math.floor(z1/FC);b++)for(let a=Math.ceil(x0/FC);a<Math.floor(x1/FC);a++){const f=wfSite(a,b);S.push(f?f.kind+'@'+f.x+','+f.z+','+f.y+','+f.R:'-');}
  const mx=Math.floor((x0+x1)/2/128)*128,mz=Math.floor((z0+z1)/2/128)*128;
  for(const g of[wgGrid(mx,mz,2,64,0),wgGrid(mx-512,mz+256,8,64,0)])for(const k of['h','wl','fw','nrm','A','B','pu'])for(const v of g[k])N.push(v);
  return{N:f64(N),S:S.join('|'),segs:H.segs.length,lakes:H.lakes.length};}
const sigEq=(a,b)=>bitsEq(a.N,b.N)&&a.S===b.S;
function fresh(seed){wgInit(seed);wsReset();wfReset();}
T.run=function(o){o=o||{};window.__hcR=null;const seeds=o.seeds||[1,2,3,4,5,6],areas=o.areas||[[-3,-3,6],[6,-9,4]],out={},src=document.getElementById('wg-src').textContent,url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));
  (async()=>{let ok=true;for(const seed of seeds){const t0=performance.now(),w=new Worker(url),got=new Map();w.postMessage({init:1,seed});
      const list=[];for(const A of areas)for(let bj=A[1];bj<A[1]+A[2];bj++)for(let bi=A[0];bi<A[0]+A[2];bi++)list.push([bi,bj]);
      await new Promise(res=>{let n=0;w.onmessage=e=>{const m=e.data;got.set(m.bi+','+m.bj,m.F);if(++n===list.length)res();};list.forEach((b,i)=>w.postMessage({hyd:1,id:i,ep:0,seed,bi:b[0],bj:b[1]}));});
      w.terminate();const wms=performance.now()-t0;
      /* 1. bit for bit */
      fresh(seed);let bitDiff=0;for(const b of list)if(!bitsEq(got.get(b[0]+','+b[1]),wgHydPack(b[0],b[1])))bitDiff++;
      /* 2. the world read three ways */
      const r={blocks:list.length,bitDiff,worldAll:true,worldMix:true,segs:0,lakes:0,wms:Math.round(wms)};
      for(const A of areas){const B=768,x0=A[0]*B+200,z0=A[1]*B+200,x1=(A[0]+A[2])*B-200,z1=(A[1]+A[2])*B-200;/* (inside the blocks the worker made, past wgHydroIn's reach) */
        fresh(seed);const s0=sig(x0,z0,x1,z1);
        fresh(seed);for(const b of list)wgHydPut(b[0],b[1],got.get(b[0]+','+b[1]));const s1=sig(x0,z0,x1,z1);
        fresh(seed);for(const b of list)if(((b[0]+b[1])&1)===0)wgHydPut(b[0],b[1],got.get(b[0]+','+b[1]));const s2=sig(x0,z0,x1,z1);
        r.worldAll=r.worldAll&&sigEq(s0,s1);r.worldMix=r.worldMix&&sigEq(s0,s2);r.segs+=s0.segs;r.lakes+=s0.lakes;r.n=(r.n||0)+s0.N.length;}
      r.ms=Math.round(performance.now()-t0);out[seed]=r;if(bitDiff||!r.worldAll||!r.worldMix)ok=false;}
    window.__hcR={ok,out};})();
  return 'started';};
/* __hc.grids(list) in a page with the world running (after a fill, so the main thread holds blocks taken in from the workers): each [x0,z0,step,n,lite] asked of the
   game's own workers (wtAsk, with the settlements' stamps) and made on the main thread (wgGrid): every array equal, bit for bit. -> window.__hcG {n, diffs, hydPre} */
T.grids=function(list){window.__hcG=null;const res=[];let i=0;
  const next=()=>{if(i>=list.length){window.__hcG={n:res.length,diffs:res.filter(r=>!r.eq).length,res,hydPre:WG.stats.hydPre,hydMain:WG.stats.hydMain};return;}
    const L=list[i];if(!wtAsk('hc'+i,L[0],L[1],L[2],L[3],L[4],g=>{const m=wgGrid(L[0],L[1],L[2],L[3],L[4]);let eq=true;for(const k of['h','wl','fw','nrm','A','B'])if(!bitsEq(f64(g[k]),f64(m[k])))eq=false;
      res.push({L,eq,ms:Math.round(g.ms)});i++;setTimeout(next,0);}))setTimeout(next,50);};
  next();return 'started';};
})();
