(function(){
/* Ceilings (geo.js owiBuildCeiling): (1) from the middle of every room of every floor of many houses a ray goes straight up: the first thing it hits is the ceiling of that room (the interior mesh), within 20 cm of the top of the storey, with its
   face turned down, and never the roof; (2) straight up from just outside the outer walls the interior mesh is never hit (no ceiling reaches outside the house); (3) from the top of a flight the way up through the stairwell is open
   (the ray is not stopped by the slab). Needs int-lib.js. Returns PASS/FAIL lines. */
const I=window.__iw,out=[],res={pass:0,fail:0};const ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);return c;};
const rc=new THREE.Raycaster(),up=new THREE.Vector3(0,1,0);
const list=I.list().filter(b=>b.enter&&!b.tunnel);const step=Math.max(1,Math.floor(list.length/60));let nb=0,rooms=0,bad=[],outside=0,badOut=[],holes=0,badHole=[];
for(let bi=0;bi<list.length;bi+=step){const b=list[bi];const q=I.ground(b,4);I.tele(q[0],q[1]);I.settle(b);const ic=b.ic;if(!ic||!ic.mesh)continue;nb++;b.g.updateMatrixWorld(true);
  const P=ic.P,objs=[ic.mesh,ic.pmesh,b.meshes.r,b.meshes.u,b.meshes.w,b.meshes.x].filter(Boolean);for(const o of objs)o.updateMatrixWorld(true);
  const first=(lx,y,lz)=>{const w=owiL2W(b,lx,lz);rc.set(new THREE.Vector3(w[0],y,w[1]),up);rc.far=40;const h=rc.intersectObjects(objs,false).filter(h=>h.face&&true);return h[0]||null;};
  for(const F of P.floors){const top=F.i===P.floors.length-1;
    for(const room of F.rooms){const r=room.rects[0],cx=(r.xa+r.xb)/2,cz=(r.za+r.zb)/2;/* a point of the room that is not in a stairwell */
      let px=cx,pz=cz,okp=false;const pts=[[cx,cz],[r.xa+.3,r.za+.3],[r.xb-.3,r.za+.3],[r.xa+.3,r.zb-.3],[r.xb-.3,r.zb-.3]];
      for(const p of pts){let inHole=false;for(const f of P.stairs){if((F.i===f.to||F.i===f.from)&&p[0]>f.x0-.1&&p[0]<f.x1+.1&&p[1]>f.z0-.1&&p[1]<f.z1+.1)inHole=true;}if(!inHole){px=p[0];pz=p[1];okp=true;break;}}
      if(!okp)continue;rooms++;const y0=b.hi+F.y+1.2,h=first(px,y0,pz),under=b.hi+F.y+owiCeilAt(ic,P,F,px,pz),ceil=b.hi+F.y+F.h-(top?0:OWI_SLAB);
      const good=h&&h.object===ic.mesh&&h.point.y>under-.03&&h.point.y<ceil+.02&&h.face.normal.clone().transformDirection(h.object.matrixWorld).y<-.5;
      if(!good&&bad.length<8)bad.push(b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' f'+F.i+' '+room.kind+' hit '+(h?(h.object===ic.mesh?'interior':h.object===b.meshes.r?'ROOF':h.object===ic.pmesh?'partition':h.object===b.meshes.u?'u':h.object===b.meshes.w?'w':'x')+' at '+(h.point.y-(b.hi+F.y)).toFixed(2)+' want '+(under-(b.hi+F.y)).toFixed(2)+'..'+(ceil-(b.hi+F.y)).toFixed(2):'nothing'));
      else if(!good)bad.length;if(!good)res.failN=(res.failN||0)+1;}}
  /* outside the outer walls of the ground floor */
  const Ftop=P.floors[P.floors.length-1],Q=Ftop.Q;for(const[lx,lz]of[[Q.xa-.25,(Q.za+Q.zb)/2],[Q.xb+.25,(Q.za+Q.zb)/2],[(Q.xa+Q.xb)/2,Q.za-.25]]){outside++;const w=owiL2W(b,lx,lz);rc.set(new THREE.Vector3(w[0],b.hi+P.st[0].y+1.2,w[1]),up);rc.far=40;const hh=rc.intersectObjects([ic.mesh],false).filter(h=>h.point.y>b.hi+Ftop.y+Ftop.h-(ic.dip||0)-.3&&h.point.y<b.hi+Ftop.y+Ftop.h+.02);if(hh.length&&badOut.length<4)badOut.push(b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0));}
  /* the stairwells stay open */
  for(const f of P.stairs){holes++;const s=Math.sign(f.zt-f.zb)||1,lx=(f.x0+f.x1)/2,lz=f.zt-s*.3,y0=b.hi+f.y1-.05+.4,h=first(lx,y0,lz);if(h&&h.object===ic.mesh&&h.point.y<b.hi+f.y1+.8&&badHole.length<4)badHole.push(b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' flight '+f.id+' blocked at '+(h.point.y-(b.hi+f.y1)).toFixed(2)+' m above the landing');}}
ok(res.failN==null,'every room of every floor has a ceiling under the roof: first hit straight up is its own ceiling, face down ('+rooms+' rooms, '+nb+' houses)'+(bad.length?' e.g. '+bad.slice(0,5).join(' | '):''));
ok(badOut.length===0,'no ceiling reaches outside the walls ('+outside+' points)'+(badOut.length?' '+badOut.join(' | '):''));
ok(badHole.length===0,'stairwells are open above every flight ('+holes+' flights)'+(badHole.length?' '+badHole.join(' | '):''));
res.out=out;return JSON.stringify(res);
})()
