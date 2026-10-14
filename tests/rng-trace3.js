(function(){
/* Where the settlement stream is drawn from: the draws of one village counted by the calling function (two frames). Run in two builds and compare. window.__rt = {seed, village} */
const seed=(window.__rt&&window.__rt.seed)||11,vi=(window.__rt&&window.__rt.village)||4;
if(!window.__rt3Patched){window.__rt3Patched=true;const _m=mulberry;mulberry=function(a){const f=_m(a),g=function(){g.n++;if(window.__rtCur===window.__rtV&&g.main){const st=new Error().stack.split('\n'),k=[st[2],st[3]].map(s=>(s||'').trim().replace(/^at\s+/,'').replace(/\s*\(.*$/,'').replace(/https?:.*$/,'')).join(' < ');window.__rtC[k]=(window.__rtC[k]||0)+1;}return f();};g.n=0;return g;};
  const _b=owBuildVillage;owBuildVillage=function(v,i,R){window.__rtCur=i;R.main=true;return _b(v,i,R);};}
window.__rtV=vi;window.__rtC={};window.__rtCur=-1;
meta.world='open';resetRun();buildMap(seed);MAP.fresh=false;
const o=Object.entries(window.__rtC).sort((a,b)=>a[0]<b[0]?-1:1);return JSON.stringify(Object.fromEntries(o));})()
