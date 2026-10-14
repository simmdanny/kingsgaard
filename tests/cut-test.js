(function(){
/* The cutaway of the building the hero is in (walk.js): three clips (interior plane, outside top plane, camera-side vertical plane), outside / inside / upstairs / first person / free camera / leaving.
   Needs int-lib.js. Returns PASS/FAIL lines. */
const I=window.__iw,out=[],res={pass:0,fail:0};const ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);return c;};
const H=heroU,near=(a,b,e)=>Math.abs(a-b)<(e||.05);
const step=(n)=>{for(let i=0;i<n;i++){heroUpdate(1/30);owiTick(1/30);owFrame();}};
const active=(b)=>({cut:b.cutPlane.constant<1e4,top:b.topPlane.constant<1e4,cam:b.camPlane.constant<1e4});
const noneActive=(except)=>OWI.list.every(b=>b===except||(b.cutPlane.constant>=1e4&&b.topPlane.constant>=1e4&&b.camPlane.constant>=1e4));
const cands=I.list().filter(b=>b.enter&&b.arch.leaf&&!b.tunnel);
const b=cands.find(b=>b.type==='rowh')||cands[0];
{const q=I.ground(b,5);I.tele(q[0],q[1]);}I.settle(b);step(10);camSet('tp');
ok(noneActive(null),'hero outside: no clip plane is active on any building');
const P=b.ic.P,F0=P.floors[0],Q=F0.Q,mid=owiL2W(b,(Q.xa+Q.xb)/2,(Q.za+Q.zb)/2);
I.tele(mid[0],mid[1]);TPC.yaw=1.1;TPC.pitch=.5;TPC.dist=6;step(90);
ok(OWI.cb===b&&OWI.in,'hero inside: the building is the current one');
const exp=b.hi+F0.y+F0.h-(P.floors.length>1?OWI_SLAB:0)-.01;
ok(near(b.topPlane.constant,exp),'outside clipped at the ceiling of the hero\'s storey ('+b.topPlane.constant.toFixed(2)+' vs '+exp.toFixed(2)+')');
ok(near(b.cutPlane.constant,b.hi+F0.y+OWI.CUT),'interior clipped OWI.CUT over the floor ('+b.cutPlane.constant.toFixed(2)+')');
ok(active(b).cam&&noneActive(b),'the camera-side plane is on and no other building has an active plane');
{const n=b.camPlane.normal;ok(near(n.x,-Math.sin(1.1),.01)&&near(n.z,-Math.cos(1.1),.01)&&n.y===0,'the camera-side plane faces away from the camera heading');
 const cx=H.x+Math.sin(1.1)*3,cz=H.z+Math.cos(1.1)*3,bx=H.x-Math.sin(1.1)*3,bz=H.z-Math.cos(1.1)*3;
 ok(b.camPlane.distanceToPoint(new THREE.Vector3(cx,H.g.position.y+1,cz))<0,'a point between the camera and the hero is clipped');
 ok(b.camPlane.distanceToPoint(new THREE.Vector3(bx,H.g.position.y+1,bz))>0,'a point behind the hero is not');
 ok(b.camPlane.distanceToPoint(new THREE.Vector3(H.x,H.g.position.y+1,H.z))>0,'the hero\'s own spot is not clipped');}
/* turning the camera turns the plane */
TPC.yaw=3.3;step(5);{const n=b.camPlane.normal;ok(near(n.x,-Math.sin(3.3),.01)&&near(n.z,-Math.cos(3.3),.01),'turning the camera turns the plane');}
/* the materials really hold the planes */
ok(Object.keys(b.mats).every(k=>{const m=b.mats[k];return m.clippingPlanes&&m.clippingPlanes.includes(k==='r'?b.roofPlane:b.topPlane)&&m.clippingPlanes.includes(b.camPlane);}),'every outside material is clipped by the storey plane (the roof by its own, lower plane) and the camera-side plane');
ok(b.ic.mats[0].clippingPlanes[0]===b.cutPlane&&(!b.ic.pmesh||(b.ic.pmesh.material.clippingPlanes.includes(b.cutPlane)&&b.ic.pmesh.material.clippingPlanes.includes(b.camPlane))),'floors and furniture use the interior plane, partitions the interior plane and the camera-side plane');
/* first person and the free camera: nothing is cut */
camSet('fp');step(60);ok(noneActive(null),'first person: nothing is cut');
camSet('fc');step(60);ok(noneActive(null),'free camera: nothing is cut');
camSet('fp');camSet('tp');TPC.yaw=.4;step(90);ok(active(b).top&&active(b).cut&&active(b).cam&&OWI.cb===b,'back in third person the cut comes back');
/* upstairs */
if(P.stairs.length){const f=P.stairs[0],xs=(f.x0+f.x1)/2,zq=f.zb+(f.zt-f.zb)*.97,wq=owiL2W(b,xs,zq);I.tele(wq[0],wq[1]);step(60);
  const lv=OWI.lv;ok(lv===f.to,'the hero on the flight has arrived on floor '+f.to+' ('+lv+')');
  const Fu=P.floors[lv],e2=b.hi+Fu.y+Fu.h-(lv<P.floors.length-1?OWI_SLAB:0)-.01;ok(near(b.topPlane.constant,e2),'upstairs: the outside is clipped at the ceiling of that storey ('+b.topPlane.constant.toFixed(2)+' vs '+e2.toFixed(2)+')');
  ok(near(b.cutPlane.constant,b.hi+Fu.y+OWI.CUT),'upstairs: the interior plane is OWI.CUT over that floor');}
/* leaving restores everything */
{const q=I.ground(b,6);I.tele(q[0],q[1]);step(120);ok(OWI.cb==null||!OWI.in,'outside again');ok(noneActive(null),'leaving: every plane is off again (roof back)');}
return res.fail+' failed, '+res.pass+' passed\n'+out.join('\n');})()
