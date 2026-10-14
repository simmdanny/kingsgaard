(function(){
/* Test helpers for the interiors: a real hero walks through real colliders (heroUpdate), frame by frame. */
const I=window.__iw={};
I.setup=function(seed){meta.world='open';resetRun();buildMap(seed);MAP.fresh=false;startWave=1;wave=0;gold=500;lives=99;nextQ=buildWave(1);state='playing';showOverlay(null);owSpawnHero();if(typeof gmHide==='function')gmHide();FLY.on=false;TPC.on=true;TPC.keys.clear();return OWI.list.length;};
I.frame=function(dt){update(dt);dayStep(dt);owSkyUpdate(dt);owLampUpdate(dt);updFx(dt);TPC.on=true;owFrame();owView(true);if(window.applyCam)applyCam();};
I.render=function(n){for(let i=0;i<(n||3);i++)I.frame(1/30);renderer.render(scene,camera);};
I.list=function(type){return OWI.list.filter(b=>!type||b.type===type);};
/* world position of a point given in the building frame */
I.w=function(b,lx,lz){return owiL2W(b,lx,lz);};
I.ground=function(b,s){/* a point s metres out from the foot of the steps, on the door axis */const e=b.enter;return owiL2W(b,e.u,e.zF+e.spec.run+s);};
I.tele=function(x,z){const H=heroU;H.x=x;H.z=z;H.hx=x;H.hz=z;H.oyT=null;H.dest=null;H.rcTo=null;H.badT=0;H.okX=null;H.g.position.set(x,gy(x,z),z);};
/* run the housekeeping until the interior of b is planned and built */
I.settle=function(b,n){for(let i=0;i<(n||60);i++){OWI.tScan=-9;owiTick(.1);if(b.ic&&b.ic.grp&&OWI.near.indexOf(b)>=0)break;}
  /* doors are shut at the start of the game; the walking tests go in and out, so settle opens the door of the building (door tests set I.keepDoors) */
  if(!I.keepDoors&&typeof owdLeaf==='function'&&owdLeaf(b))owdSet(b,true,{instant:true,dir:1});return !!(b.ic&&b.ic.grp);};
I.state=function(){const H=heroU;return{x:+H.x.toFixed(2),z:+H.z.toFixed(2),y:+H.g.position.y.toFixed(3),lv:OWI.lv,inside:OWI.in,cb:OWI.cb?OWI.cb.type:null};};
/* walk towards a world point with the real controller. Returns {ok, t, maxDy, stuck} */
I.walkTo=function(tx,tz,opt){opt=opt||{};const H=heroU,dt=opt.dt||1/60,maxT=opt.maxT||12,tol=opt.tol||.2;let t=0,maxDy=0,py=H.g.position.y,stuck=0,lx=H.x,lz=H.z,minClear=1e9;TPC.keys.clear();if(opt.run)TPC.keys.add('ShiftLeft');
  while(t<maxT){const dx=tx-H.x,dz=tz-H.z,d=Math.hypot(dx,dz);if(d<tol)break;TPC.yaw=Math.atan2(-dx,-dz);TPC.keys.add('KeyW');
    heroUpdate(dt);owiTick(dt);t+=dt;if(I.hook)I.hook(dt);{const zn=owiZoneAt(H.x,H.z);if(zn&&owiHit(zn.b.ic.col,zn.lx,zn.lz,owiLvOf(zn.b),OWI.RAD-.02))I.pen=(I.pen||0)+1;}const y=H.g.position.y;maxDy=Math.max(maxDy,Math.abs(y-py));if(Math.abs(y-py)>.25){I.jumps=I.jumps||[];if(I.jumps.length<6){const zn=owiZoneAt(H.x,H.z);I.jumps.push({dy:+(y-py).toFixed(3),at:I.state(),zone:zn&&(zn.b.type+'@'+zn.b.x.toFixed(0)+','+zn.b.z.toFixed(0)+' k'+zn.k+' local '+zn.lx.toFixed(2)+','+zn.lz.toFixed(2)),target:[tx,tz],sm:window.__sm&&window.__sm.slice(-4)});}}py=y;
    if(Math.hypot(H.x-lx,H.z-lz)<dt*1.0){stuck+=dt;if(stuck>.6){TPC.keys.clear();return{ok:false,t,maxDy,stuck:true,at:I.state()};}}else{stuck=0;lx=H.x;lz=H.z;}}
  TPC.keys.clear();return{ok:Math.hypot(tx-H.x,tz-H.z)<tol+.05,t,maxDy,stuck:false,at:I.state()};};
/* the same, to a point in the building frame */
I.walkLocal=function(b,lx,lz,opt){const w=owiL2W(b,lx,lz);return I.walkTo(w[0],w[1],opt);};
/* ASCII map of what the colliders leave free for the hero at a level (rows run from the back wall (top) to the front wall (bottom)) */
I.map=function(b,lv,cs){cs=cs||.12;const P=b.ic.P,Q=P.st[lv].Q,col=b.ic.col,mask=1<<lv,x0=Q.xa-.4,z0=Q.za-.4,nx=Math.ceil((Q.xb-Q.xa+.8)/cs)+1,nz=Math.ceil((Q.zb-Q.za+.8)/cs)+1;let o='';
  for(let k=0;k<nz;k++){let row='';for(let j=0;j<nx;j++){const x=x0+j*cs,z=z0+k*cs;row+=owiHit(col,x,z,mask,OWI.RAD)?'#':'.';}o+=row+String.fromCharCode(10);}
  /* doorways and stairs as a list */
  const F=P.floors[lv];o+='x from '+x0.toFixed(2)+' step '+cs+', z from '+z0.toFixed(2)+String.fromCharCode(10);
  o+='walls: '+F.walls.map(w=>w.ax+w.p.toFixed(2)+'['+w.a.toFixed(2)+','+w.b.toFixed(2)+'] doors '+w.doors.map(d=>d.c.toFixed(2)).join('/')).join('; ')+String.fromCharCode(10);
  o+='door u='+P.door.u.toFixed(2)+' w='+P.door.w.toFixed(2)+String.fromCharCode(10);return o;};
/* which colliders are within reach of a local point */
I.near=function(b,lx,lz,r){r=r||(OWI.RAD+.15);const c=b.ic.col,o=[];for(let i=0;i<c.n;i++){const dx=lx<c.x0[i]?c.x0[i]-lx:lx>c.x1[i]?lx-c.x1[i]:0,dz=lz<c.z0[i]?c.z0[i]-lz:lz>c.z1[i]?lz-c.z1[i]:0;if(Math.hypot(dx,dz)<r)o.push(i+':['+c.x0[i].toFixed(2)+','+c.x1[i].toFixed(2)+']x['+c.z0[i].toFixed(2)+','+c.z1[i].toFixed(2)+'] m'+c.mk[i]+' d='+Math.hypot(dx,dz).toFixed(2));}return o;};
/* free camera looking at a building interior with the cutaway forced at floor lv. cl / tl: [local x, height above the building origin, local z] */
I.look=function(b,cl,tl,lv,name){const P=b.ic.P;OWI.on=true;b.cutTarget=b.cutCur=b.hi+P.floors[lv].y+OWI.CUT;b.cutPlane.constant=b.cutCur;OWI.anim.delete(b);
  const w=owiL2W(b,cl[0],cl[2]),t=owiL2W(b,tl[0],tl[2]),x=w[0],y=b.hi+cl[1],z=w[1],tx=t[0],ty=b.hi+tl[1],tz=t[1],dx=tx-x,dy=ty-y,dz=tz-z;
  FLY.on=true;FLY.pos.set(x,y,z);FLY.yaw=Math.atan2(dx,dz);FLY.pitch=Math.atan2(dy,Math.hypot(dx,dz));
  for(let i=0;i<6;i++){flyApply();update(.033);dayStep(.033);owSkyUpdate(.033);owLampUpdate(.033);updFx(.033);owFrame();owView(true);if(window.applyCam)applyCam();renderer.render(scene,camera);}
  b.cutPlane.constant=b.cutCur;renderer.render(scene,camera);};
})();
