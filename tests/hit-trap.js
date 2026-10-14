(function(){
/* Finds positions where the walking hero cannot get out. A random walk uses the game's own move resolution (owHeroStep) around a village; every few steps the position is tested:
   frozen = no direction moves it by even half a step; pinned = no direction takes it a metre away within 3 m of straight walking. Run after __pw.setup(seed) (perf-world.js).
   Options: window.__trap = {v: village index, n: steps, seed: rng seed, r: radius, nr: restarts} */
const o=Object.assign({v:0,n:60000,seed:1,r:40,nr:6},window.__trap||{});
const v=o.at?{x:o.at[0],z:o.at[1],name:o.name||'spot',tier:0}:OW.villages[o.v],H=heroU,R=mulberry(o.seed),DIRS=24,STEP=.1,out={village:v.name+' t'+v.tier,steps:0,tests:0,frozen:0,pinned:0,examples:[]};
const cellOf=(x,z)=>{const a=owCell(x,z);return a;};
const gridAround=(x,z)=>{const a=cellOf(x,z);let s='';for(let r=a.r-2;r<=a.r+2;r++){for(let c=a.c-2;c<=a.c+2;c++){const q=grid[r]&&grid[r][c];s+=q===2?'#':q===1?'.':q===0?'_':(typeof q==='object'&&q?'T':'?');}s+='/';}return s;};
function walk(x,z,dx,dz,n){H.x=x;H.z=z;for(let i=0;i<n;i++){const r=owHeroStep(H,H.x+dx*STEP,H.z+dz*STEP);H.x=r[0];H.z=r[1];}return[H.x,H.z];}
function probe(x,z){let frozen=true,pinned=true;for(let k=0;k<DIRS;k++){const a=k/DIRS*Math.PI*2,dx=Math.sin(a),dz=Math.cos(a);
    H.x=x;H.z=z;const r=owHeroStep(H,x+dx*STEP,z+dz*STEP);if(Math.hypot(r[0]-x,r[1]-z)>=STEP*.5)frozen=false;
    if(pinned){const e=walk(x,z,dx,dz,30);if(Math.hypot(e[0]-x,e[1]-z)>=1)pinned=false;}if(!frozen&&!pinned)break;}
  return{frozen,pinned};}
const load=()=>{for(let i=0;i<6;i++){OWI.tScan=-9;owiTick(.1);}};
for(let q=0;q<o.nr;q++){
  /* start somewhere on open ground inside the village */
  let sx=v.x,sz=v.z;for(let t=0;t<200;t++){const a=R()*6.283,d=R()*o.r,x=v.x+Math.cos(a)*d,z=v.z+Math.sin(a)*d;if(owCanStand(x,z)){sx=x;sz=z;break;}}
  H.x=sx;H.z=sz;load();let x=sx,z=sz,dir=R()*6.283,left=0;
  for(let i=0;i<o.n/o.nr;i++){
    if(left--<=0){dir=R()*6.283;left=8+Math.floor(R()*30);}
    H.x=x;H.z=z;const r=owHeroStep(H,x+Math.sin(dir)*STEP,z+Math.cos(dir)*STEP);if(Math.hypot(r[0]-x,r[1]-z)<STEP*.5)left=0;x=r[0];z=r[1];out.steps++;
    if(Math.hypot(x-v.x,z-v.z)>o.r*1.4){x=sx;z=sz;}
    if(i%40===0){H.x=x;H.z=z;owiTick(.001);OWI.tScan=-9;owiTick(.1);}
    if(i%25===0){out.tests++;const p=probe(x,z);if(p.frozen||p.pinned){if(p.frozen)out.frozen++;else out.pinned++;if(out.examples.length<10)out.examples.push({x:+x.toFixed(2),z:+z.toFixed(2),kind:p.frozen?'frozen':'pinned',cell:cellOf(x,z),grid:gridAround(x,z),zones:owiZonesAt(x,z).map(q=>q.b.type+':'+q.k+'@'+q.lx.toFixed(2)+','+q.lz.toFixed(2)).join(' ')});}}
  }}
return JSON.stringify(out,null,1);})()
