(function(){
/* Windows seen from outside: a ray goes through the middle of every window of the houses near the hero, from 0.8 m outside along the normal of the wall; the first thing it meets must be the glass (or the frame and shutters round it), and behind the glass it must
   find the inside of the house (the floor, a wall or a piece of furniture of the interior), not the wall of the house itself. Needs int-lib.js and ls-shot.js (I.setup first). window.__wt = {windows, glassFirst, wallFirst, blind, byType} */
const I=window.__iw,R=window.__wt={windows:0,glassFirst:0,wallFirst:0,noGlass:0,noInterior:0,byType:{},ex:[]};
const rc=new THREE.Raycaster();
const list=OWI.list.filter(b=>b.arch&&b.arch.leaf&&!b.tunnel&&b.arch.windows.length).slice(0,window.__wtn||120);
for(const b of list){owiEnsurePlan(b);const P=b.ic.P;const q=I.ground(b,4);I.tele(q[0],q[1]);I.settle(b);if(!b.ic.grp)continue;
  /* the building shows its own meshes (the merged block is for the distance) and its interior */
  if(OWI.cb!==b){if(OWI.cb)owiLeave();}owBlockUse(b,false);b.g.updateMatrixWorld(true);
  const meshes=[];for(const k of['f','w','u','x','r','g'])if(b.meshes[k])meshes.push(b.meshes[k]);const glass=b.meshes.g;
  const o=R.byType[b.type]||(R.byType[b.type]={windows:0,wallFirst:0,noGlass:0,noInterior:0});
  for(const w of P.wins){const st=b.arch.storeys[w.st];if(!st)continue;const r=st.rect,BS=b.arch.scale||b.BSc,m=(w.a+w.b)/2,ym=(w.y0+w.y1)/2;let ox,oz,dx,dz;
    if(w.wall==='zb'){ox=m;oz=r.z1*BS+.8;dx=0;dz=-1;}else if(w.wall==='za'){ox=m;oz=r.z0*BS-.8;dx=0;dz=1;}else if(w.wall==='xa'){ox=r.x0*BS-.8;oz=m;dx=1;dz=0;}else{ox=r.x1*BS+.8;oz=m;dx=-1;dz=0;}
    /* four rays through the pane (a quarter of its width and height either side of the middle: the mullions are in the middle) */
    const wd=(w.b-w.a-.24)/4,hh=(w.y1-w.y0)/4;let clear=0,anyGlass=0,interior=0;
    for(const[sa,sy]of[[-1,-1],[1,-1],[-1,1],[1,1]]){const mm=m+sa*wd,yy=ym+sy*hh;let ex,ez;if(w.wall==='zb'||w.wall==='za'){ex=mm;ez=oz;}else{ex=ox;ez=mm;}
      const w0=owiL2W(b,ex,ez),w1=owiL2W(b,ex+dx,ez+dz),d=new THREE.Vector3(w1[0]-w0[0],0,w1[1]-w0[1]).normalize();
      rc.set(new THREE.Vector3(w0[0],b.hi+yy,w0[1]),d);rc.far=3;const hits=rc.intersectObjects(meshes,false),gi=hits.findIndex(h=>h.object===glass);
      if(gi>=0)anyGlass++;if(gi>=0&&!hits.slice(0,gi).some(h=>h.object===b.meshes.w||h.object===b.meshes.u)){clear++;rc.far=14;const rest=rc.intersectObjects(b.ic.grp.children.concat([b.meshes.w,b.meshes.u].filter(Boolean)),true);rc.far=3;if(rest.some(h=>h.distance>hits[gi].distance-.05))interior++;}}
    R.windows++;o.windows++;
    if(!anyGlass){R.noGlass++;o.noGlass++;if(R.ex.length<8)R.ex.push(b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' st'+w.st+' '+w.wall+': the rays do not meet the glass');continue;}
    if(!clear){R.wallFirst++;o.wallFirst++;if(R.ex.length<8)R.ex.push(b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' st'+w.st+' '+w.wall+': a wall in front of the glass');continue;}
    R.glassFirst++;if(!interior){R.noInterior++;o.noInterior++;}}}
return JSON.stringify(R);})()
