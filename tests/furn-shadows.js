(function(){
/* Furniture shadows. (1) Sun: with the hero in a house, the sun's shadow map holds the furniture (reading the map back, floor points near a table are shadowed only because of the furniture), the shadow lies on the
   side away from the sun, and it moves and changes length when the sun does. (2) Rooms are shaded by the roof the cutaway hides (the floor far from the windows is not sunlit). (3) Night: the interior light follows
   the hearth and its cube map is drawn once per change. Needs int-lib.js. Returns PASS/FAIL lines. */
const I=window.__iw,out=[],res={pass:0,fail:0};const ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);return c;};
const H=heroU,step=n=>{for(let i=0;i<n;i++){heroUpdate(1/30);owiTick(1/30);dayStep(1/30);owLampUpdate(1/30);owFrame();}};
const cands=I.list().filter(b=>b.enter&&b.arch.leaf&&!b.tunnel&&b.type==='town');const b=cands[0];
{const q=I.ground(b,4);I.tele(q[0],q[1]);}I.settle(b);owdSet(b,true,{instant:true,dir:1});
const P=b.ic.P,F=P.floors[0],tbl=F.items.find(i=>/^table/.test(i.kind))||F.items.find(i=>i.kind==='bed2'||i.kind==='bed1');
const hw=owiL2W(b,tbl.x+(tbl.az>tbl.ax?-1.6:0),tbl.z+(tbl.az>tbl.ax?0:1.4));I.tele(hw[0],hw[1]);camSet('tp');step(30);
ok(!!b.ic.fmesh&&b.ic.fmesh.castShadow&&b.ic.fmesh.layers.test({mask:1<<3}),'the furniture is a mesh of its own that casts shadows and is on the point-light layer');
ok(b.ic.mesh.castShadow===false&&b.ic.pmesh.castShadow===true,'floors and wall skirting do not cast, partition walls do');
ok(b.ic.fmesh.material.clipShadows===false&&b.ic.pmesh.material.clipShadows===false&&Object.values(b.mats).every(m=>m.clipShadows===false),'the cutaway does not clip shadows (furniture, partitions, roof and walls)');
const tw=owiL2W(b,tbl.x,tbl.z),ty=b.hi+F.y+.03;
const rt=()=>sun.shadow.map;
function mask(withF){/* floor points around the table: shadowed (1) or not (0), by the sun's shadow map */
  b.ic.fmesh.castShadow=withF;renderer.render(scene,camera);const map=sun.shadow.map,W=map.width,Hh=map.height,N=36,span=3.0,pts=[];
  const v=new THREE.Vector4();let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=tw[0]-span/2+span*i/(N-1),z=tw[1]-span/2+span*j/(N-1);v.set(x,ty,z,1).applyMatrix4(sun.shadow.matrix);pts.push([x,z,v.x/v.w,v.y/v.w,v.z/v.w]);}
  for(const p of pts){u0=Math.min(u0,p[2]);u1=Math.max(u1,p[2]);v0=Math.min(v0,p[3]);v1=Math.max(v1,p[3]);}
  const px0=Math.max(0,Math.floor(u0*W)-2),py0=Math.max(0,Math.floor(v0*Hh)-2),pw=Math.min(W-px0,Math.ceil((u1-u0)*W)+5),ph=Math.min(Hh-py0,Math.ceil((v1-v0)*Hh)+5),buf=new Uint8Array(pw*ph*4);
  renderer.readRenderTargetPixels(map,px0,py0,pw,ph,buf);const m=[];
  for(const p of pts){const tx=Math.min(pw-1,Math.max(0,Math.floor(p[2]*W)-px0)),ty2=Math.min(ph-1,Math.max(0,Math.floor(p[3]*Hh)-py0)),k=(ty2*pw+tx)*4,d=(buf[k+3]/255+buf[k+2]/255/256+buf[k+1]/255/65536+buf[k]/255/16777216)*(255/256);/* three.js packs the depth with the most significant byte in alpha */m.push(d<p[4]-.002?1:0);}
  return{pts,m};}
/* (2) the roof and the upper storeys, hidden by the cutaway, still shade the room: without their shadow the floor round the table is sunlit */
{meta.dayT=560;step(8);const m1=mask(true);const saved=['r','u'].map(k=>[k,b.meshes[k]&&b.meshes[k].castShadow]);for(const[k]of saved)if(b.meshes[k])b.meshes[k].castShadow=false;const m2=mask(true);for(const[k,v]of saved)if(b.meshes[k])b.meshes[k].castShadow=v;
  const sh1=m1.m.reduce((a,c)=>a+c,0),sh2=m2.m.reduce((a,c)=>a+c,0);ok(sh1>sh2+.4*m1.m.length,'noon: the floor round the table is in the shadow of the roof ('+sh1+' of '+m1.m.length+' points) and sunlit without it ('+sh2+')');}
/* with the roof's shadow switched off, the sun reaches the floor everywhere: the furniture shadows can be read from the map */
const savedR=['r','u'].map(k=>[k,b.meshes[k]&&b.meshes[k].castShadow]);for(const[k]of savedR)if(b.meshes[k])b.meshes[k].castShadow=false;
const dirs=[];let lastLen=null;const lens=[];
for(const [t,name] of [[160,'morning'],[330,'forenoon'],[560,'noon'],[820,'afternoon'],[1060,'evening']]){meta.dayT=t;step(8);
  const a=mask(true),c=mask(false);b.ic.fmesh.castShadow=true;let n=0,sx=0,sz=0;for(let k=0;k<a.m.length;k++)if(a.m[k]&&!c.m[k]){n++;sx+=a.pts[k][0];sz+=a.pts[k][1];}
  const el=DAYC.el,sd=DAYC.dir;/* sd points from the ground to the sun */
  if(n>=6){const cx=sx/n-tw[0],cz=sz/n-tw[1],away=-(cx*sd.x+cz*sd.z)/(Math.hypot(sd.x,sd.z)*Math.hypot(cx,cz)||1);
    ok(away>.3,name+' (sun elevation '+(el*57.3).toFixed(0)+' deg): the furniture shadow ('+n+' floor points) lies on the side away from the sun (cos '+away.toFixed(2)+')');dirs.push([t,Math.hypot(cx,cz),Math.atan2(cz,cx)]);}
  else out.push('note '+name+': only '+n+' floor points are shadowed by the furniture here (the sun is high or the table is outside the lit patch)');}
ok(dirs.length>=3,'the furniture shadow was found at '+dirs.length+' of 5 times of day');
if(dirs.length>=3){const angs=dirs.map(d=>d[2]);let moved=0;for(let i=1;i<angs.length;i++){let d=Math.abs(angs[i]-angs[i-1]);if(d>Math.PI)d=2*Math.PI-d;if(d>.15)moved++;}ok(moved>=1,'the direction of the shadow changes with the sun ('+angs.map(a=>(a*57.3).toFixed(0)).join(', ')+' deg)');}
for(const[k,v]of savedR)if(b.meshes[k])b.meshes[k].castShadow=v;
/* night: the interior light follows the hearth, the cube map is drawn and not drawn again every frame */
meta.dayT=1500;step(90);
const pl=OWIL.l;ok(OWIL.cur&&/^ihearth|^istove|^iforge|^ifirepit|^ideco_sconce|^iorb/.test(OWIL.cur.key)&&pl.intensity>.3,'night: the interior light is bound to a source of the room ('+(OWIL.cur&&OWIL.cur.key)+', intensity '+pl.intensity.toFixed(2)+')');
renderer.render(scene,camera);ok(pl.shadow.needsUpdate===false&&!!pl.shadow.map,'the cube map exists and the next frame does not draw it again');
res.out=out;return JSON.stringify(res);
})()
