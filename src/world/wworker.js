/* =====================================================================================================
   THE WORLD'S WORKERS (src/world/wworker.js): grids of the world are generated off the main thread, by the very code the main thread runs
   (wnoise.js + wgen.js are loaded into the worker with this file), so a tile made by a worker is the tile the main thread would have made.
   The main thread sends the settlements' stamps of the rectangle with the request (plain data, see wgStampApply).
   And a tile's cliff sheet (wcliff.js, world look 1): the whole of wclGen in one go, its arrays sent back (transferred) for wcliffmat.js to make the mesh of.
   They also work out the hydrology ahead of the game (v54): blocks of the 96 m lattice in full (wgHydPack), which the main thread takes in (wgHydPut, wterrain.js WHP).
   ===================================================================================================== */
if(typeof window==='undefined'&&typeof self!=='undefined'&&typeof importScripts==='function'){
  self.onmessage=function(e){const m=e.data;
    if(m.init){wgInit(m.seed);return;}
    if(m.grid){const t0=performance.now(),g=wgGrid(m.x0,m.z0,m.step,m.n,m.lite,m.st);g.ms=performance.now()-t0;
      postMessage({id:m.id,g},[g.h.buffer,g.wl.buffer,g.fw.buffer,g.nrm.buffer,g.A.buffer,g.B.buffer,g.pu.buffer,g.rv.buffer]);}
    if(m.rd){const t0=performance.now(),F=wrdWork(m.x0,m.z0,m.bl,m.st);F.ms=performance.now()-t0;postMessage({id:m.id,g:F},[F.buffer]);}/* (the river ground in detail, wrdetail.js) */
    if(m.rs){const F=wrsHeights(m.P,m.st);postMessage({id:m.id,g:F},[F.buffer]);}/* (the stream's banks: the ground under the stones, wrstone.js) */
    if(m.cliff){const t0=performance.now(),out={nb:0},it=wclGen({x0:m.x0,z0:m.z0,ti:m.ti,tk:m.tk},m.lod,out,m.st);while(!it.next().done);out.ms=performance.now()-t0;
      const tr=[];for(const k of['pos','nrm','blk','crev','rk','pal','idx','stones'])if(out[k])tr.push(out[k].buffer);postMessage({id:m.id,g:out},tr);}
    if(m.hyd){if(m.seed!==WG.seed){postMessage({hyd:1,id:m.id,ep:m.ep,seed:m.seed,bi:m.bi,bj:m.bj,F:null,ms:0});return;}/* (a worker keeps its seed: its ground jobs carry none) */const t0=performance.now(),F=wgHydPack(m.bi,m.bj);
      postMessage({hyd:1,id:m.id,ep:m.ep,seed:m.seed,bi:m.bi,bj:m.bj,F,ms:performance.now()-t0,n:WG.hyd.size},[F.buffer]);}};}
