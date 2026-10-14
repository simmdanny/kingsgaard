(async function(){
/* What the villagers cost. Needs perf-world.js. window.__vp = {pose:'street'|'square'|'crowd', t:[600,1500], batches, per, unit}; the result goes to window.__vpOut (the test yields between batches, so poll for it).
   1) In the town of seed 3 (the street pose of perf-lamps.js, or 'crowd': close to where most villagers stand): frames rendered with the villagers as they are now, with the villagers of v15 (the old flat
      figures, rebuilt here from the old code on the same spots) and with none, in short batches taken in turns, so drift and interference fall on all three alike; each frame timed with gl.finish().
   2) The cost of one villager: 64 figures in a field before the camera, new or old, against the empty field (frames in turns as above). */
const P=window.__pw,o=window.__vp||{},out={},sleep=()=>new Promise(r=>{const c=new MessageChannel();c.port1.onmessage=()=>r();c.port2.postMessage(0);});window.__vpOut=null;
if(!window.__pwDone||window.__pwSeed!==3){P.setup(3);window.__pwDone=true;window.__pwSeed=3;}
paused=true;
const v0=OW.villages[0],sx=v0.sqr.x,sz=v0.sqr.z,gl=renderer.getContext();
const settle=n=>{for(let i=0;i<n;i++){OWI.tScan=-9;owiTick(.1);}};
/* the old figure (owMakeVillager of v15): five meshes of merged boxes, one material */
const oldFig=(cloth,hat)=>{const kb=kitBuilder();kb.P('t',box(.1,.17,.07),cloth,0,.26,0);kb.P('t',ico(.055,0),0xe8b894,0,.41,0);if(hat)kb.P('t',cone(.075,.07,6),hat,0,.47,0);
  kb.P('l',box(.042,.16,.05),0x4a3a2a,0,-.075,0);kb.P('l',box(.05,.03,.07),0x2a2018,0,-.15,.012);kb.P('a',box(.036,.14,.042),cloth,0,-.065,0);kb.P('a',ico(.026,0),0xe8b894,0,-.14,0);
  const G={t:mergeParts(kb.B.t),l:mergeParts(kb.B.l),a:mergeParts(kb.B.a)},g=new THREE.Group(),body=new THREE.Group();g.add(body);const torso=new THREE.Mesh(G.t,VCMAT);torso.castShadow=true;body.add(torso);
  const pv=(geo,x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);const m=new THREE.Mesh(geo,VCMAT);m.castShadow=true;q.add(m);body.add(q);return q;};pv(G.l,-.03,.17);pv(G.l,.03,.17);pv(G.a,-.075,.33);pv(G.a,.075,.33);return g;};
const cols=[0x8a5a3a,0x5a7a9a,0x9a8a4a,0x7a4a5a,0x6a8a5a,0xa06a3a];
const frame=()=>{const a=performance.now();renderer.render(scene,camera);gl.finish();return performance.now()-a;};
/* frames of each mode in turns: batches x per frames each; returns the 10th, 25th and 50th percentile per mode */
const turns=async(modes,set,B,per)=>{const T={};for(const m of modes)T[m]=[];for(let i=0;i<4;i++)frame();
  for(let b=0;b<B;b++){for(const m of modes){set(m);frame();for(let k=0;k<per;k++)T[m].push(frame());}await sleep(0);}
  const R={};for(const m of modes){const a=T[m].sort((x,y)=>x-y),q=f=>+a[Math.floor(a.length*f)].toFixed(2);R[m]={p10:q(.1),p25:q(.25),p50:q(.5),n:a.length};}return R;};
const counts=(modes,set)=>{const R={};for(const m of modes){set(m);renderer.render(scene,camera);R[m]={calls:renderer.info.render.calls,tris:renderer.info.render.triangles,progs:renderer.info.programs.length};}return R;};
/* 1) the town */
const all=[];for(const v of OW.villages)v.villagers.forEach((p,i)=>{const g=oldFig(cols[i%6],i%2?0x7a5a30:null);g.position.copy(p.g.position);g.rotation.copy(p.g.rotation);g.scale.copy(p.g.scale);g.visible=false;p.g.parent.add(g);all.push({v,p,g});});
const mode=m=>{for(const a of all){const near=a.v.near;a.p.g.visible=m==='new'&&near;a.g.visible=m==='old'&&near;if(a.g.visible){a.g.position.copy(a.p.g.position);a.g.rotation.copy(a.p.g.rotation);}}};
const L0=v0.villagers;let best=L0[0],bn=-1;for(const p of L0){let n=0;for(const q of L0)if(Math.hypot(q.x-p.x,q.z-p.z)<9)n++;if(n>bn){bn=n;best=p;}}
/* 'square': the camera on the square, the town's villagers held still in front of it, 5 to 40 m away (a busy square: near and far figures) */
if(o.pose==='square'){const d=[5,6.5,8,9,10,12,14,16,18,21,24,27,30,34,38,42];L0.forEach((p,i)=>{const a=-2.4+(i%5-2)*.16,r=d[i%d.length];p.x=p.tx=sx+Math.cos(a)*r;p.z=p.tz=sz+Math.sin(a)*r;p.mode='idle';p.wait=1e9;p.job=null;p.carry=false;});}
const posePt=o.pose==='crowd'?[best.x+5,best.z+5,1.6,best.x,best.z,.8]:o.pose==='square'?[sx,sz,1.7,sx+Math.cos(-2.4)*20,sz+Math.sin(-2.4)*20,.8]:[sx+14,sz+10,2.0,sx-10,sz-14,3];
const inView=()=>{camera.updateMatrixWorld();const f=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));let k=0;for(const a of all)if(a.v.near&&f.containsPoint(a.p.g.position))k++;return k;};
for(const t of(o.t||[600,1500])){P.pose(...posePt,t);settle(20);P.pose(...posePt,t);paused=true;const key=t===600?'day':'night';
  out['town_'+key]=Object.assign({inView:inView()},{c:counts(['new','old','none'],mode)},await turns(['new','old','none'],mode,o.batches||40,o.per||6));}
mode('new');for(const a of all)a.g.parent.remove(a.g);
/* 2) one villager's cost: 64 figures on a field in front of the camera (an 8 x 8 grid, every template and many colours) */
if(o.unit!==false){const L=window.__vl;const s=L&&L.at?L.at:{x:sx+40,z:sz};const G={new:new THREE.Group(),old:new THREE.Group()};
  for(let k=0;k<64;k++){const x=s.x+(k%8-3.5)*.9,z=s.z-(Math.floor(k/8))*.9,y=owH(x,z),ti=k%VIL_T.length,F=VIL_T[ti][0]==='f';
    const V=vilFigure(ti,[PCX_SKIN[k%6].c,PCX_HAIRC[k%8].c,cols[k%6],VIL_C2[k%7],(F?VIL_CBF:VIL_CB)[k%7],VIL_CS[k%5],0x7a5a30]);V.g.scale.setScalar(2.78);V.g.position.set(x,y,z);G.new.add(V.g);
    const og=oldFig(cols[k%6],k%2?0x7a5a30:null);og.scale.setScalar(2.78);og.position.set(x,y,z);G.old.add(og);}
  scene.add(G.new);scene.add(G.old);for(const v of OW.villages)for(const p of v.villagers)p.g.visible=false;
  const um=m=>{G.new.visible=m==='new';G.old.visible=m==='old';};
  for(const t of(o.t||[600,1500])){P.pose(s.x,s.z+6.5,1.8,s.x,s.z-3,.5,t);paused=true;for(const v of OW.villages)for(const p of v.villagers)p.g.visible=false;const key=t===600?'day':'night';
    out['unit64_'+key]=Object.assign({c:counts(['new','old','none'],um)},await turns(['new','old','none'],um,o.batches||40,o.per||6));}
  scene.remove(G.new);scene.remove(G.old);}
out.near=OW.villages.filter(v=>v.near).map(v=>v.name+':'+v.villagers.length).join(' ');
window.__vpOut=JSON.stringify(out);paused=false;return window.__vpOut;})()
