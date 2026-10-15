(function(){
/* The cliff sheets (world look 1, src/world/wcliff.js) are the same on both sides of every tile border and every time they are made (a --dev build; it re-seeds
   the generator: reload the page after it). window.__cc = {seeds:[...], lods:[...]} (defaults: seeds 1, 2, 3; levels 0 and 2).
   For each seed the first tiles with cliffs on a border with their east and their south neighbour are found, and for each level:
   - stones: every stone of one tile that can reach the band of cubes the two tiles share is in the other tile's list too, all 24 numbers equal;
   - sheet: every vertex of one tile in the band of cubes the two tiles share (one grid step on the near side of the border) is a vertex of the other, at the
     same place (to 1e-4 m) - so the surface is closed across the border;
   - again: the tile made a second time (after the generator is set up again for the seed) is the same, number for number (positions, triangles, stones);
   - worker: for the world's own seed, the tile made by a world worker (with the stamps the main thread sends) is the main thread's, number for number.
   Results in window.__ccR = {pass, fail, lines, stats}; window.__ccDone = true when the worker part has answered (it is asynchronous). */
const o=window.__cc||{},seeds=o.seeds||[1,2,3],lods=o.lods||[0,2],R={pass:0,fail:0,lines:[],stats:[]},ok=(c,m)=>{R[c?'pass':'fail']++;if(!c&&R.lines.length<40)R.lines.push('FAIL '+m);return c;};
window.__ccR=R;window.__ccDone=false;
const S=WG_CFG.tile,SN=WCL_SN,seed0=WG.seed;
const gen=(ti,tk,lod,st)=>{const out={nb:0},it=wclGen({x0:ti*S,z0:tk*S,ti,tk},lod,out,st);while(!it.next().done);return out;};
const reseed=s=>{wgInit(s);if(typeof wsReset==='function')wsReset();if(typeof wfReset==='function')wfReset();};
/* every road that can reach a tile and its neighbours, made now (the stamps the sheet is made with include only the roads made so far) */
const ens=(ti,tk)=>{if(typeof wsWant==='function'){wsWant(ti*S+S,tk*S+S,1200);wsStep(Infinity);}};
/* a tile with a cliff: a coarse grid (8 m) with a rise of 12 m or more between neighbours */
const cliffy=(ti,tk)=>{const g=wgGrid(ti*S,tk*S,8,16,2),n=17;for(let k=0;k<n;k++)for(let i=0;i<n;i++){const q=k*n+i,h=g.h[q];if(i<n-1&&Math.abs(g.h[q+1]-h)>12)return true;if(k<n-1&&Math.abs(g.h[q+n]-h)>12)return true;}return false;};
const find=()=>{for(let r=0;r<24;r++)for(let b=-r;b<=r;b++)for(let a=-r;a<=r;a++){if(Math.max(Math.abs(a),Math.abs(b))!==r)continue;if(cliffy(a,b)&&cliffy(a+1,b)&&cliffy(a,b+1))return [a,b];}return null;};
const same=(x,y)=>{if(!x||!y)return x===y;if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(x[i]!==y[i]&&!(x[i]!==x[i]&&y[i]!==y[i]))return false;return true;};
/* the border between tile A and tile B (B east of A: axis 0; south of A: axis 2) */
function border(A,B,axis,bx,c,tag){
  /* stones */
  const key=(Q,k)=>{let s='';for(let j=0;j<SN;j++)s+=Q[k*SN+j]+',';return s;},inB=new Set();for(let k=0;k<B.stones.length/SN;k++)inB.add(key(B.stones,k));
  let ns=0,miss=0;for(let k=0;k<A.stones.length/SN;k++){const v=A.stones[k*SN+axis],rr=.6*Math.hypot(A.stones[k*SN+3],A.stones[k*SN+4]);if(Math.abs(v-bx)>rr+c+.5)continue;/* (a stone that can reach the shared band) */ns++;if(!inB.has(key(A.stones,k)))miss++;}
  ok(miss===0,tag+': '+miss+' of '+ns+' stones by the border not in the neighbour\'s list');
  /* vertices in the shared band (bx - c, bx) */
  if(!A.pos||!B.pos){ok(false,tag+': no sheet on one side');return {stones:ns,shared:0};}
  /* (a cube's vertex is in a tile's mesh only if one of that tile's own quads uses it: compared by cube - the global grid of WCL.cs - where both tiles have one) */
  const cube=(x,y,z)=>Math.floor(x/c+1e-6)+','+Math.floor(y/c+1e-6)+','+Math.floor(z/c+1e-6),inBand=w=>w>bx-c+1e-4&&w<bx-1e-4,mB=new Map();
  for(let v=0;v<B.nv;v++){const x=B.pos[v*3]+B.x0,y=B.pos[v*3+1],z=B.pos[v*3+2]+B.z0;if(inBand(axis===0?x:z))mB.set(cube(x,y,z),[x,y,z]);}
  let nsh=0,bad=0,worst=0;for(let v=0;v<A.nv;v++){const x=A.pos[v*3]+A.x0,y=A.pos[v*3+1],z=A.pos[v*3+2]+A.z0;if(!inBand(axis===0?x:z))continue;const p=mB.get(cube(x,y,z));if(!p)continue;nsh++;
    const d=Math.hypot(p[0]-x,p[1]-y,p[2]-z);if(d>1e-4){bad++;worst=Math.max(worst,d);}}
  if(!nsh)R.lines.push('note '+tag+': no cliff across this border');else ok(bad===0,tag+': '+bad+' of '+nsh+' shared vertices differ (worst '+worst.toFixed(4)+' m)');
  return {stones:ns,shared:nsh};}
for(const sd of seeds){reseed(sd);const f=find();if(!ok(!!f,'seed '+sd+': no tile with cliffs on its east and south borders within 24 tiles'))continue;const[ti,tk]=f;ens(ti,tk);
  for(const lod of lods){const c=WCL.cs[lod],A=gen(ti,tk,lod),E=gen(ti+1,tk,lod),Sx=gen(ti,tk+1,lod);A.x0=ti*S;A.z0=tk*S;E.x0=(ti+1)*S;E.z0=tk*S;Sx.x0=ti*S;Sx.z0=(tk+1)*S;
    const be=border(A,E,0,(ti+1)*S,c,'seed '+sd+' lod '+lod+' tile '+ti+','+tk+' | east'),bs=border(A,Sx,2,(tk+1)*S,c,'seed '+sd+' lod '+lod+' tile '+ti+','+tk+' | south');
    /* again, from scratch */
    reseed(sd);ens(ti,tk);const A2=gen(ti,tk,lod);
    ok(same(A.pos,A2.pos)&&same(A.idx,A2.idx)&&same(A.stones,A2.stones)&&same(A.blk,A2.blk)&&same(A.pal,A2.pal),'seed '+sd+' lod '+lod+' tile '+ti+','+tk+': not the same the second time');
    R.stats.push({seed:sd,lod,tile:[ti,tk],tris:A.ntri,stones:A.stones.length/SN,east:be,south:bs});}}
/* worker: the world's own seed (the workers keep theirs) */
reseed(seed0);
if(typeof WT!=='undefined'&&WT.pool&&WT.pool.length&&typeof wclAsk==='function'){const f=find();
  if(!f){ok(false,'worker: no cliff tile');window.__ccDone=true;}
  else{const[ti,tk]=f;ens(ti,tk);const t={x0:ti*S,z0:tk*S,ti,tk},M=WCL.margin,X0=t.x0-M,Z0=t.z0-M,E=(Math.round((S+2*M)/WCL.r)+1)*WCL.r,st=WG.stampsIn?WG.stampsIn(X0-2,Z0-2,X0+E+2,Z0+E+2):null,main=gen(ti,tk,0,st);
    const tryAsk=()=>{if(!wclAsk(t,0,out=>{ok(same(main.pos,out.pos)&&same(main.idx,out.idx)&&same(main.stones,out.stones)&&same(main.blk,out.blk),'worker: tile '+ti+','+tk+' made by a worker differs from the main thread\'s');
      R.stats.push({worker:[ti,tk],tris:out.ntri});window.__ccDone=true;}))setTimeout(tryAsk,200);};tryAsk();}}
else{R.lines.push('(no world workers: worker part skipped)');window.__ccDone=true;}
return R;})();
