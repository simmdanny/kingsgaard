(function(){
/* Doors: closed at the start, the hinge geometry against the real colliders, F, collision following the state, direction, the save. Needs int-lib.js (I.setup first).
   window.__dt = {fails, log, n} */
const I=window.__iw;I.keepDoors=true;const D=window.__dt={fails:[],log:[],n:0,geo:{}};const F=(c,m)=>{if(!c&&D.fails.length<40)D.fails.push(m);};
const key=(code)=>{window.dispatchEvent(new KeyboardEvent('keydown',{code,key:code,bubbles:true,cancelable:true}));window.dispatchEvent(new KeyboardEvent('keyup',{code,key:code,bubbles:true}));};
const list=(window.__dtSel?window.__dtSel():I.list()).filter(b=>b.enter&&b.arch.leaf&&!b.tunnel);
const bid=b=>b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0);
const H=heroU;
const frames=(n,dt)=>{for(let i=0;i<n;i++){const d=dt||1/30;heroUpdate(d);owiTick(d);}};
/* the board's plan corners in the building frame, metres, taken from the real mesh of the pivot (pivot and child matrices) */
const leafPts=(b,deg,dir)=>{const d=owdGet(b,true),g=owdG(b);d.dir=dir;d.a=Math.min(1,deg/90);d.t=1;
  /* the pose as the game applies it for this fraction of the swing, but with the angle given in degrees directly */
  owdApply(b);const p=owdPose(g,dir,deg*Math.PI/180);d.pv.position.set(p.px,0,p.pz);d.pv.rotation.y=p.rot;d.pm.position.set(0,0,p.cz);d.pv.updateMatrix();d.pm.updateMatrix();
  const m=d.pv.matrix.clone().multiply(d.pm.matrix),pos=d.pm.geometry.attributes.position,out=[],v=new THREE.Vector3();
  for(let i=0;i<24;i++){v.fromBufferAttribute(pos,i).applyMatrix4(m);out.push([v.x*g.BS,v.y*g.BS,v.z*g.BS]);}return out;};
let nIn=0,nOut=0,nChecked=0,clipIn=0,clipOut=0,clipWall=0;const clipEx=[];
const NMAX=window.__dtN||60,step=Math.max(1,Math.floor(list.length/NMAX));let seen=0;
for(const b of list){if((seen++)%step)continue;{const q=I.ground(b,4);I.tele(q[0],q[1]);}I.settle(b);if(!b.ic||!b.ic.col){D.log.push('no col '+bid(b));continue;}const c=b.ic.col,g=owdG(b),d=owdGet(b,true);D.n++;
  /* shut at the start */
  F(d.a===0&&d.t===0,bid(b)+': not shut at the start');F(c.mk[c.dA]===255&&c.mk[c.dB]===0,bid(b)+': door boxes wrong when shut');
  F(b.meshes.d&&(b.meshes.d.visible||(b.blk&&b.blk.state===true)),bid(b)+': static leaf neither drawn nor in the batch when shut');
  /* the hinge geometry for every angle and both swings, against every box of the building (not its own door boxes) and the doorway frame */
  for(const dir of[1,-1]){let bad=0,maxDevB=0;
    for(let deg=5;deg<=90;deg+=5){const pts=leafPts(b,deg,dir),hull=[],u2={};
      for(const p of pts){const k=p[0].toFixed(4)+','+p[2].toFixed(4);if(!u2[k]){u2[k]=1;hull.push([p[0],p[2]]);}}
      const cx=hull.reduce((a,p)=>a+p[0],0)/hull.length,cz=hull.reduce((a,p)=>a+p[1],0)/hull.length;hull.sort((p,q)=>Math.atan2(p[1]-cz,p[0]-cx)-Math.atan2(q[1]-cz,q[0]-cx));
      const hit=(x,z)=>{for(let i=0;i<c.n;i++){if(i===c.dA||i===c.dB||!(c.mk[i]&1))continue;if(x>c.x0[i]+.002&&x<c.x1[i]-.002&&z>c.z0[i]+.002&&z<c.z1[i]-.002)return i;}return -1;};
      let hb=-1;for(let i=0;i<hull.length&&hb<0;i++){const p=hull[i],q=hull[(i+1)%hull.length];for(let k=0;k<=12;k++){const t=k/12,x=p[0]+(q[0]-p[0])*t,z=p[1]+(q[1]-p[1])*t;hb=hit(x,z);if(hb>=0){if(clipEx.length<6)clipEx.push(bid(b)+' dir'+dir+' deg'+deg+' box'+hb+' ['+c.x0[hb].toFixed(2)+','+c.x1[hb].toFixed(2)+','+c.z0[hb].toFixed(2)+','+c.z1[hb].toFixed(2)+'] pt '+x.toFixed(3)+','+z.toFixed(3));break;}}}
      if(hb>=0)bad++;
      /* the doorway's jambs: the leaf stays between them */
      {const j0=g.um-g.wm/2,j1=g.um+g.wm/2;for(const p of hull){const zin=p[1]>g.zcm-.0275*g.BS-1e-6&&p[1]<g.zcm-.0275*g.BS+OW_T*g.BS+1e-6;if(zin&&(p[0]<j0-.001||p[0]>j1+.001)){bad++;if(clipEx.length<6)clipEx.push(bid(b)+' dir'+dir+' deg'+deg+' corner outside the jambs '+p[0].toFixed(3)+' ['+j0.toFixed(3)+','+j1.toFixed(3)+']');break;}}}
      if(deg===90){/* the open leaf collider holds the whole leaf */d.a=1;d.t=1;owdApply(b);const bx=[c.x0[c.dB],c.x1[c.dB],c.z0[c.dB],c.z1[c.dB]];for(const p of hull){maxDevB=Math.max(maxDevB,bx[0]-p[0],p[0]-bx[1],bx[2]-p[1],p[1]-bx[3]);}}
      nChecked++;}
    if(maxDevB>.003){F(false,bid(b)+' dir'+dir+': open leaf outside its collider by '+maxDevB.toFixed(3));}
    if(bad){if(dir>0)clipIn++;else clipOut++;}
    if(dir>0)nIn++;else nOut++;}
  /* back to shut */
  d.a=0;d.t=0;owdApply(b);
}
D.log.push('buildings '+D.n+' hinge checks '+nChecked+' | inward: '+clipIn+' of '+nIn+' with a part of the leaf inside a collider | outward: '+clipOut+' of '+nOut);
D.log=D.log.concat(clipEx);
return D.fails.length?('FAIL '+D.fails.join(' | ')+' || '+D.log.join(' ; ')):('OK '+D.log.join(' ; '));})()
