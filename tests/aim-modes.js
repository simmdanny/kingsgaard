(function(){
/* The aim after a change of camera (V): the same cast hits what is under the dot in third person, first person and the free camera. Needs int-lib.js. */
const I=window.__iw;I.setup(3);meta.scrAuto=false;const H=heroU,v=OW.villages[0],out=[],res={pass:0,fail:0};
const ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);return c;};
const place=(x,z)=>{H.x=x;H.z=z;H.hx=x;H.hz=z;H.oyT=null;H.g.position.set(x,owH(x,z),z);H._ga=H.g.position.y;H.ko=0;for(let i=0;i<4;i++){OWI.tScan=-9;owiTick(.1);}};
const mk=(type,x,z,y)=>{spawnEnemy({type},1);const e=enemies[enemies.length-1];e.spd=0;e.x=x;e.z=z;e.y=y==null?owH(x,z):y;e.g.position.set(e.x,0,e.z);e.b.position.y=e.y;e.g.updateMatrix();e.g.visible=true;e.hp=e.maxHp=1e7;e.pin=[e.x,e.y,e.z];return e;};
const clear=()=>{for(const e of enemies.slice())removeEnemy(e);enemies.length=0;for(const e of fx.slice()){try{scene.remove(e.o);}catch(_){}}fx.length=0;PSA.list.length=0;PSN.list.length=0;try{resetCine();}catch(_){}};
const run=(sec)=>{for(let i=0;i<sec*30;i++){update(1/30);for(const e of enemies)if(e.pin&&!e.dead){e.x=e.pin[0];e.y=e.pin[1];e.z=e.pin[2];e.g.position.set(e.x,0,e.z);e.b.position.y=e.y;e.g.updateMatrix();}updFx(1/30);dayStep(1/30);owFrame();if(!FLY.on)tpcApply();}};
const cast=(k)=>{meta.spells[k]=meta.spells[k]||{lvl:1};H.scd={};H.gcd=0;H.anim=null;H.ko=0;const s=tStats(H),A=aimFor(H,k,s);fireScroll(H,k,s,A.list,A);return A;};
const rayPoint=(d)=>{camera.updateMatrixWorld();AIM.rc.setFromCamera(AIM.c0,camera);const r=AIM.rc.ray;return[r.origin.x+r.direction.x*d,r.origin.y+r.direction.y*d,r.origin.z+r.direction.z*d];};
const sq=v.sqr,tap=c=>{window.dispatchEvent(new KeyboardEvent('keydown',{code:c,bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{code:c,bubbles:true}));};
const frames=n=>{for(let i=0;i<n;i++){owFrame();if(!FLY.on)tpcApply();}camera.updateMatrixWorld();};
const to=m=>{let n=0;while(camMode()!==m&&n++<4){tap('KeyV');frames(2);}return camMode()===m;};
/* aim the camera of the given mode: yaw is the direction it looks along (the orbit camera looks along (-sin, -cos)); pitch > 0 looks down in third person and first person */
const aimCam=(mode,yaw,pitch)=>{if(mode==='fc'){const gy=owH(H.x,H.z);FLY.pos.set(H.x+Math.sin(yaw)*4,gy+2.2,H.z+Math.cos(yaw)*4);FLY.yaw=yaw+Math.PI;FLY.pitch=-pitch;flyApply();}else{TPC.yaw=yaw;TPC.pitch=pitch;}frames(2);};
place(sq.x,sq.z);
for(const mode of['tp','fp','fc']){
  ok(to(mode),'camera mode '+mode+' reached by V');
  aimDotUpdate();{const r=AIM.dot.getBoundingClientRect(),cr=renderer.domElement.getBoundingClientRect();ok(AIM.dot.style.display==='block'&&Math.hypot(r.left+r.width/2-(cr.left+cr.width/2),r.top+r.height/2-(cr.top+cr.height/2))<.6,mode+': the dot is shown at the middle of the canvas');}
  let good=0,n=0,goodG=0,gN=0;
  for(const yaw of[0,1.3,2.6,3.9,5.2]){
    /* a bolt at an enemy whose body the dot covers, 9 m beyond the hero's place */
    clear();place(sq.x,sq.z);aimCam(mode,yaw,mode==='fp'?.03:.08);
    const d0=Math.hypot(camera.position.x-H.x,camera.position.z-H.z),p=rayPoint(d0+9),e=mk('soldier',p[0],p[2]);e.y=Math.max(owH(p[0],p[2]),p[1]-e.hitY*.5);e.pin=[e.x,e.y,e.z];e.b.position.y=e.y;
    H.face=yaw+1.9;H.g.rotation.y=H.face;const A=cast('lightbolt');run(1.6);n++;if(A.kind==='bld'?e.hp===e.maxHp:(A.enemy===e&&e.hp<e.maxHp))good++;/* a building between the camera and the enemy stops the bolt */
    /* a ground spell: the marker is where the dot meets the ground */
    clear();place(sq.x,sq.z);aimCam(mode,yaw,.38);{const A2=cast('wither');gN++;if(A2.kind==='ground'){const q=new THREE.Vector3(A2.gx,A2.gy,A2.gz).project(camera);if(Math.abs(q.x)<.03&&Math.abs(q.y)<.03)goodG++;}}}
  ok(good===n,mode+': the bolt hit the enemy under the dot in '+good+' of '+n+' directions');
  ok(goodG===gN,mode+': a ground spell lands under the dot in '+goodG+' of '+gN+' directions');
  /* a wall: the shot stops at the building and does not go through */
  {const b=v.buildings.find(b=>!b.ruined&&b.enter);if(b){clear();const q=I.ground(b,7);place(q[0],q[1]);const dx=b.x-H.x,dz=b.z-H.z;aimCam(mode,Math.atan2(-dx,-dz),0);const A=cast('lightbolt');
    ok(A.kind==='bld'||A.kind==='enemy',mode+': a cast at a building stops at it ('+A.kind+')');}}
}
to('tp');
return res.fail+' failed, '+res.pass+' passed\n'+out.join('\n');})()
