/* =====================================================================================================
   THE WORLD'S WORKERS (src/world/wworker.js): grids of the world are generated off the main thread, by the very code the main thread runs
   (wnoise.js + wgen.js are loaded into the worker with this file), so a tile made by a worker is the tile the main thread would have made.
   The main thread sends the settlements' stamps of the rectangle with the request (plain data, see wgStampApply).
   ===================================================================================================== */
if(typeof window==='undefined'&&typeof self!=='undefined'&&typeof importScripts==='function'){
  self.onmessage=function(e){const m=e.data;
    if(m.init){wgInit(m.seed);return;}
    if(m.grid){const t0=performance.now(),g=wgGrid(m.x0,m.z0,m.step,m.n,m.lite,m.st);g.ms=performance.now()-t0;
      postMessage({id:m.id,g},[g.h.buffer,g.wl.buffer,g.fw.buffer,g.nrm.buffer,g.A.buffer,g.B.buffer]);}};}
