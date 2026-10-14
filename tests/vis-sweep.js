(function(){
/* Does the house the hero is in stay drawn? The hero stands at several places on every floor of a sample of buildings; the orbit camera looks from 8 headings, 3 pitches and 3 distances. For every view:
   culled     the camera frustum misses a mesh of the building that must be there (walls 'w', foundation 'f', the interior mesh) although its bounding sphere is near the camera path
   hidden     one of those meshes is switched off (visible=false) or its merged copy is hidden, not both shown nor both hidden
   clipAll    the cutaway plane sits at or below the floor the hero walks on (everything clipped), or is not a number
   window.__vs = {views, bad:{...}, ex:[...]} */
const I=window.__iw,V=window.__vs={views:0,bad:{},ex:[]};const NMAX=window.__vsN||24,list=I.list().filter(b=>b.enter&&b.arch.leaf&&!b.tunnel);const stp=Math.max(1,Math.floor(list.length/NMAX));let seen=0;
const bump=(k,m)=>{V.bad[k]=(V.bad[k]||0)+1;if(V.ex.length<30)V.ex.push(k+' '+m);};
const fr=new THREE.Frustum(),pm=new THREE.Matrix4();
const shown=(o)=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
for(const b of list){if((seen++)%stp)continue;{const q=I.ground(b,4);I.tele(q[0],q[1]);}I.settle(b);if(!b.ic||!b.ic.grp)continue;owdSet(b,true,{instant:true,dir:1});const P=b.ic.P,id=b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0);
  const spots=[];for(const F of P.floors){const Q=F.Q;if(F.i>2)continue;spots.push([F.i,(Q.xa+Q.xb)/2,(Q.za+Q.zb)/2]);}
  for(const[lv,lx,lz]of spots){const w=owiL2W(b,lx,lz);I.tele(w[0],w[1]);
    /* upper floors are reached by tele only if the hero's height follows: set it from the plan */
    for(let i=0;i<20;i++){OWI.tScan=-9;heroUpdate(1/30);owiTick(1/30);}
    for(let h=0;h<8;h++)for(const pit of[.2,.6,1.1])for(const dist of[2.6,5.4,10]){TPC.yaw=h*Math.PI/4;TPC.pitch=pit;TPC.dist=dist;for(let k=0;k<2;k++){owFrame();}owView(true);tpcApply();camera.updateMatrixWorld();scene.updateMatrixWorld(true);V.views++;
      pm.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);fr.setFromProjectionMatrix(pm);
      if(OWI.cb!==b){bump('notCb',id+' lv'+lv);continue;}
      const must=[['w',b.meshes.w],['f',b.meshes.f],['ic',b.ic.mesh]];
      for(const[k,m]of must){if(!m)continue;
        if(!shown(m))bump('hidden',id+' '+k+' lv'+lv);
        else if(m.frustumCulled&&!fr.intersectsObject(m)){/* the camera is inside or beside the house; a house the camera looks away from is allowed to be culled, but not one the hero (in front of the camera) stands in */ bump('culled',id+' '+k+' lv'+lv+' yaw'+h+' pit'+pit+' d'+dist);}}
      const k=b.blk;if(k&&k.state===true)bump('hidden',id+' merged copy still used while the hero is in it');
      if(!(b.cutPlane.constant>b.hi+P.floors[OWI.lv].y-.001))if(b.cutPlane.constant<1e4)bump('clipAll',id+' const '+b.cutPlane.constant);}}
  owdSet(b,false,{instant:true});
}
return V.views+' views; '+JSON.stringify(V.bad)+'\n'+V.ex.join('\n');})()
