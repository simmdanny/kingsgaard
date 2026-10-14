(function(){
/* Walls that are solid but not drawn: for every collider box of the ground floor of a loaded building, rays are shot at it from each free side (at 0.9 m above the floor, like the eye of a
   walker) and must hit a drawn face of one of the building's meshes (the raycaster respects the material's side, so a face that is culled from that side does not count).
   window.__vw = {n, boxes, miss:[...]} */
const I=window.__iw,V=window.__vw={n:0,boxes:0,miss:[],bad:{}};
const NMAX=window.__vwN||40,list=I.list().filter(b=>b.enter);const step=Math.max(1,Math.floor(list.length/NMAX));let seen=0;
const rc=new THREE.Raycaster(),bid=b=>b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0);
for(const b of list){if((seen++)%step)continue;{const q=I.ground(b,4);I.tele(q[0],q[1]);}I.settle(b);const ic=b.ic;if(!ic||!ic.col||!ic.mesh)continue;
  if(b.dr){owdSet(b,false,{instant:true});}
  const objs=[ic.mesh,ic.pmesh,ic.fmesh,...(ic.flights||[]).map(q=>q.mesh),b.meshes.f,b.meshes.w,b.meshes.u,b.meshes.x,b.meshes.d,b.meshes.s,b.meshes.g].filter(Boolean);
  /* the neighbours: a party wall is drawn by the building that owns it, and a village's merged blocks hold a copy of every intact building */
  for(const v of OW.villages){if(Math.hypot(v.x-b.x,v.z-b.z)>v.rad+30)continue;for(const n of v.buildings){if(n===b||Math.hypot(n.x-b.x,n.z-b.z)>24)continue;for(const k of['f','w','u','x','d','s'])if(n.meshes[k])objs.push(n.meshes[k]);if(n.blk&&n.blk.m&&!objs.includes(n.blk.m))objs.push(n.blk.m);}}
  b.g.updateMatrixWorld(true);for(const o of objs)o.updateMatrixWorld(true);
  const c=ic.col,P=ic.P,y0=b.hi+P.st[0].y,zFront=P.st[0].Q.zb;V.n++;
  for(let i=0;i<c.n;i++){if(!(c.mk[i]&1))continue;if(i===c.dA||i===c.dB)continue;V.boxes++;
    const x0=c.x0[i],x1=c.x1[i],z0=c.z0[i],z1=c.z1[i];if(z0>=zFront-.001)continue;/* the entrance's cheek walls and porch posts are outside the front wall */
    const cx=(x0+x1)/2,cz=(z0+z1)/2,sx=x1-x0,sz=z1-z0;
    const pts=[];if(sx>=sz){for(let x=x0+.3;x<x1-.15;x+=.8)pts.push([x,cz]);if(!pts.length)pts.push([cx,cz]);}else{for(let z=z0+.3;z<z1-.15;z+=.8)pts.push([cx,z]);if(!pts.length)pts.push([cx,cz]);}
    const sides=sx>=sz?[[0,1],[0,-1]]:[[1,0],[-1,0]];
    for(const p of pts)for(const s of sides){const ox=p[0]+s[0]*(Math.abs(s[0])?sx/2+.7:0)+0,oz=p[1]+s[1]*(Math.abs(s[1])?sz/2+.7:0);
      /* skip origins that are inside another box or outside the zone the walker can stand in */
      let inside=false;for(let j=0;j<c.n;j++){if(j===i||j===c.dA||j===c.dB||!(c.mk[j]&1))continue;if(ox>c.x0[j]-.05&&ox<c.x1[j]+.05&&oz>c.z0[j]-.05&&oz<c.z1[j]+.05){inside=true;break;}}if(inside)continue;
      const w0=owiL2W(b,ox,oz),wt=owiL2W(b,p[0],p[1]);let hit=false;for(const dy of[.05,.2,.35,.5,.65,.8,.95,1.2,1.6]){const o=new THREE.Vector3(w0[0],y0+dy,w0[1]),t=new THREE.Vector3(wt[0],y0+dy,wt[1]),dir=t.clone().sub(o),len=dir.length();dir.normalize();rc.set(o,dir);rc.near=0;rc.far=len+.35;if(rc.intersectObjects(objs,false).length){hit=true;break;}}
      if(!hit){const k=b.type;V.bad[k]=(V.bad[k]||0)+1;if(V.miss.length<24)V.miss.push(bid(b)+' box'+i+' ['+x0.toFixed(2)+','+x1.toFixed(2)+','+z0.toFixed(2)+','+z1.toFixed(2)+'] from '+ox.toFixed(2)+','+oz.toFixed(2));}}}
}
return V.n+' buildings, '+V.boxes+' boxes, '+V.miss.length+' misses (first 24) by type '+JSON.stringify(V.bad)+'\n'+V.miss.join('\n');})()
