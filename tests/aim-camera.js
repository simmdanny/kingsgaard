(function(){
/* Acceptance checks for the camera-directed aim (src/aim.js). Needs int-lib.js. Every line is PASS or FAIL.
   The casts go through the same pipeline as a key press (aimFor -> fireScroll); an enemy counts as hit when its health went down. */
const I=window.__iw;I.setup(3);meta.scrAuto=false;const H=heroU,v=OW.villages[0],out=[],res={pass:0,fail:0};
const ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);return c;};
const place=(x,z)=>{H.x=x;H.z=z;H.hx=x;H.hz=z;H.oyT=null;H.g.position.set(x,owH(x,z),z);H._ga=H.g.position.y;H.ko=0;for(let i=0;i<4;i++){OWI.tScan=-9;owiTick(.1);}};
const mk=(type,x,z,y)=>{spawnEnemy({type},1);const e=enemies[enemies.length-1];e.spd=0;e.x=x;e.z=z;e.y=y==null?owH(x,z):y;e.g.position.set(e.x,0,e.z);e.b.position.y=e.y;e.g.updateMatrix();e.g.visible=true;e.hp=e.maxHp=1e7;e.pin=[e.x,e.y,e.z];return e;};
const clear=()=>{for(const e of enemies.slice())removeEnemy(e);enemies.length=0;for(const e of fx.slice()){try{scene.remove(e.o);}catch(_){}}fx.length=0;PSA.list.length=0;PSN.list.length=0;try{resetCine();}catch(_){}};
const cam=(yaw,pitch)=>{FLY.on=false;TPC.on=true;TPC.yaw=yaw;TPC.pitch=pitch;for(let i=0;i<2;i++){owFrame();tpcApply();}camera.updateMatrixWorld();};
const run=(sec)=>{for(let i=0;i<sec*30;i++){update(1/30);for(const e of enemies)if(e.pin&&!e.dead){e.x=e.pin[0];e.y=e.pin[1];e.z=e.pin[2];e.g.position.set(e.x,0,e.z);e.b.position.y=e.y;e.g.updateMatrix();}updFx(1/30);dayStep(1/30);owFrame();if(!FLY.on)tpcApply();}};
const cast=(k)=>{meta.spells[k]=meta.spells[k]||{lvl:1};H.scd={};H.gcd=0;H.anim=null;H.ko=0;const s=tStats(H),A=aimFor(H,k,s);fireScroll(H,k,s,A.list,A);return A;};
const rayPoint=(d)=>{camera.updateMatrixWorld();AIM.rc.setFromCamera(AIM.c0,camera);const r=AIM.rc.ray;return[r.origin.x+r.direction.x*d,r.origin.y+r.direction.y*d,r.origin.z+r.direction.z*d];};
const sq=v.sqr;
/* 0. the dot, the ray and the middle of the canvas are one point */
place(sq.x,sq.z);cam(0,.2);aimDotUpdate();
{const r=AIM.dot.getBoundingClientRect(),cr=renderer.domElement.getBoundingClientRect(),p=new THREE.Vector3(...rayPoint(20)).project(camera),px=cr.left+(p.x*.5+.5)*cr.width,py=cr.top+(1-(p.y*.5+.5))*cr.height;
  ok(AIM.dot.style.display==='block'&&r.width>=3&&r.width<=5,'the dot is shown in the hero camera and is 3 to 5 px ('+r.width+' px)');
  ok(Math.hypot(r.left+r.width/2-px,r.top+r.height/2-py)<.6&&Math.hypot(px-(cr.left+cr.width/2),py-(cr.top+cr.height/2))<.6,'the dot is at the point the aiming ray goes through, which is the middle of the canvas');
  ok(getComputedStyle(AIM.dot).pointerEvents==='none'&&document.elementFromPoint(r.left+2,r.top+2)===renderer.domElement,'the dot lets pointer events through to what is under it');}
/* 1. turning the camera on the spot: the bolt goes where the dot is, whatever way the hero was facing */
{let good=0,n=0;for(const yaw of[0,.9,1.8,2.7,3.6,4.5,5.4]){clear();place(sq.x,sq.z);cam(yaw,.07);H.face=yaw+3;H.g.rotation.y=H.face;const p=rayPoint(Math.hypot(camera.position.x-H.x,camera.position.z-H.z)+8);
    const e=mk('soldier',p[0],p[2]);const A=cast('lightbolt');run(1.6);n++;if(A.enemy===e&&e.hp<e.maxHp)good++;}
  ok(good===n,'camera yaw sweep, hero facing elsewhere: the bolt hit the enemy under the dot in '+good+' of '+n+' directions');}
/* 2. looking up and down: an enemy in the air above, and one on the ground below */
{clear();place(sq.x,sq.z);FLY.on=true;const gy=owH(H.x,H.z);FLY.pos.set(H.x,gy+2.4,H.z+3);FLY.yaw=Math.PI;const e=mk('raven',H.x,H.z-8,gy+6);e.fly=true;
  const dx=e.x-FLY.pos.x,dz=e.z-FLY.pos.z,dy=e.y+e.hitY*.5-FLY.pos.y;FLY.yaw=Math.atan2(dx,dz);FLY.pitch=Math.atan2(dy,Math.hypot(dx,dz));flyApply();camera.updateMatrixWorld();
  const A=cast('emberbolt');run(2);ok(FLY.pitch>.2&&A.enemy===e&&e.hp<e.maxHp,'looking upward (pitch '+FLY.pitch.toFixed(2)+'): the bolt rose and hit the flyer ('+(A.enemy===e)+', '+(e.hp<e.maxHp)+')');
  clear();place(sq.x,sq.z);const e2=mk('soldier',H.x+4,H.z-12);FLY.on=true;FLY.pos.set(H.x,gy+9,H.z+2);const dx2=e2.x-FLY.pos.x,dz2=e2.z-FLY.pos.z,dy2=e2.y+e2.hitY*.5-FLY.pos.y;FLY.yaw=Math.atan2(dx2,dz2);FLY.pitch=Math.atan2(dy2,Math.hypot(dx2,dz2));flyApply();camera.updateMatrixWorld();
  const B=cast('lightbolt');run(2);ok(FLY.pitch<-.3&&B.enemy===e2&&e2.hp<e2.maxHp,'looking downward (pitch '+FLY.pitch.toFixed(2)+'): the bolt hit the enemy below ('+(B.enemy===e2)+', '+(e2.hp<e2.maxHp)+')');FLY.on=false;}
/* 3. camera far from the hero (the camera and the casting origin are not at the same place): the shot still lands on what the dot covers */
{clear();place(sq.x,sq.z);const gy=owH(H.x,H.z);FLY.on=true;FLY.pos.set(H.x+14,gy+10,H.z+16);const e=mk('knight',H.x-6,H.z-9);
  const dx=e.x-FLY.pos.x,dz=e.z-FLY.pos.z,dy=e.y+e.hitY*.5-FLY.pos.y;FLY.yaw=Math.atan2(dx,dz);FLY.pitch=Math.atan2(dy,Math.hypot(dx,dz));flyApply();camera.updateMatrixWorld();
  const A=cast('lightbolt');run(2);ok(A.enemy===e&&e.hp<e.maxHp&&Math.hypot(camera.position.x-H.x,camera.position.z-H.z)>15,'camera 21 m from the hero: the bolt left the hero and hit the enemy under the dot');FLY.on=false;}
/* 4. nearby and distant targets, the reach */
{clear();place(sq.x,sq.z);cam(0,.07);const d0=Math.hypot(camera.position.x-H.x,camera.position.z-H.z);
  const near=mk('soldier',...(()=>{const p=rayPoint(d0+3);return[p[0],p[2]];})());const A=cast('hexspark');run(1.2);ok(A.enemy===near&&near.hp<near.maxHp,'a near target (3 m) is hit');
  clear();place(sq.x,sq.z);cam(0,.0);const far=mk('soldier',...(()=>{const p=rayPoint(d0+24);return[p[0],p[2]];})());const B=cast('lightbolt');run(2.2);ok(B.enemy===far&&far.hp<far.maxHp,'a distant target (24 m) is hit');
  /* an enemy 40 m away, seen by a camera high above: it is under the dot, but out of the hero's reach */
  clear();place(sq.x,sq.z);const gy=owH(H.x,H.z),far2=mk('soldier',H.x,H.z-40);FLY.on=true;FLY.pos.set(H.x,gy+25,H.z-20);{const dx=far2.x-FLY.pos.x,dz=far2.z-FLY.pos.z,dy=far2.y+far2.hitY*.5-FLY.pos.y;FLY.yaw=Math.atan2(dx,dz);FLY.pitch=Math.atan2(dy,Math.hypot(dx,dz));flyApply();camera.updateMatrixWorld();}
  const C=cast('lightbolt');ok(C.far&&C.enemy==null&&C.dist<=AIM.reach+.01,'a target beyond the reach ('+AIM.reach+' m) is not aimed at; the shot is brought within the reach ('+C.dist.toFixed(1)+' m, far='+!!C.far+')');FLY.on=false;}
/* 5. the ground, a wall, a building, the sky */
{clear();place(sq.x,sq.z);cam(0,.3);let A=aimResolve(H,30);const t0=owH(A.x,A.z);ok(A.kind==='ground'&&Math.abs(A.y-t0)<.1&&Math.abs(A.gy-owH(A.gx,A.gz))<.01,'aiming at the ground: the aim point is on the terrain ('+A.kind+')');
  /* a wall: face the nearest building across the square */let best=null,bd=1e9;for(const b of v.buildings){const d=Math.hypot(b.x-H.x,b.z-H.z);if(d>9&&d<bd){bd=d;best=b;}}const yaw=Math.atan2(H.x-best.x,H.z-best.z);cam(yaw,-.02);A=aimResolve(H,40);
  const inside=(x,z,y)=>{for(const b of v.buildings){if(Math.hypot(b.x-x,b.z-z)>b.r+4)continue;const ro={x,y,z};if(aimBld(b,x,y+3,z,0,0,0,0,0,{x:0,y:0,z:0})===Infinity&&false)return true;}return false;};
  ok(A.kind==='bld'||A.kind==='wall','aiming at a building: the aim point is on it ('+A.kind+')');
  /* the ground resolved for an area spell lies in front of the wall: nothing of the building is there */
  AIM.res.kind='sky';const q=aimCast(A.gx,owH(A.gx,A.gz)+30,A.gz,0,-1,0,0,80,true);ok(AIM.res.kind==='ground','the ground point for an area spell is in front of the wall, not inside the building ('+AIM.res.kind+')');
  FLY.on=true;FLY.pos.set(H.x,owH(H.x,H.z)+4,H.z);FLY.yaw=0;FLY.pitch=1.3;flyApply();camera.updateMatrixWorld();A=aimResolve(H,30);ok(A.kind==='sky'&&A.y>H.g.position.y+10,'aiming at the sky: a point high above ('+A.kind+', '+(A.y-H.g.position.y).toFixed(0)+' m up)');
  ok(Math.abs(A.gy-owH(A.gx,A.gz))<.01&&Math.hypot(A.gx-H.x,A.gz-H.z)<=30,'the ground for an area spell aimed at the sky is a real ground point within reach');FLY.on=false;}
/* 6. the line of fire: a wall between the hero and the enemy stops the shot, however the camera sees it */
{clear();place(sq.x,sq.z);let best=null,bd=1e9;for(const b of v.buildings){const d=Math.hypot(b.x-H.x,b.z-H.z);if(d>9&&d<bd){bd=d;best=b;}}
  const dirx=(best.x-H.x)/bd,dirz=(best.z-H.z)/bd,ex=best.x+dirx*(best.r+3),ez=best.z+dirz*(best.r+3),e=mk('soldier',ex,ez);
  FLY.on=true;const gy=owH(H.x,H.z);FLY.pos.set(ex-dirx*0-dirz*8,gy+14,ez+dirx*8);const dx=e.x-FLY.pos.x,dz=e.z-FLY.pos.z,dy=e.y+e.hitY*.5-FLY.pos.y;FLY.yaw=Math.atan2(dx,dz);FLY.pitch=Math.atan2(dy,Math.hypot(dx,dz));flyApply();camera.updateMatrixWorld();
  const A=aimResolve(H,40);ok(A.kind==='enemy'||A.blocked,'the camera, high above, sees the enemy behind the building ('+A.kind+(A.blocked?', blocked':'')+')');
  const B=cast('lightbolt');run(2.4);ok(B.blocked&&B.enemy==null&&e.hp===e.maxHp,'the building stops the shot: it aims at the wall ('+B.kind+'), the enemy behind it is not hit');FLY.on=false;}
/* 7. the hero is not a target, and objects between the camera and the hero do not count */
{clear();place(sq.x,sq.z);cam(0,.15);const A=aimResolve(H,30);ok(A.kind!=='enemy'&&A.enemy==null,'the ray passes through the hero\'s own place without taking it for a target');}
/* 8. the spells that are not aimed keep their own targets */
{clear();place(sq.x,sq.z);cam(0,.07);const e=mk('soldier',H.x+1.5,H.z-1.5);H.scd={};meta.spells.darkpulse=meta.spells.darkpulse||{lvl:1};const A=aimFor(H,'darkpulse',tStats(H));ok(A.cat==='self'&&A.list.length&&A.list[0]===e,'a self-centred spell keeps the enemies in range as its targets');}
/* 9. not available: the classic board and touch keep the old rules */
{const keep=OW.on;OW.on=false;ok(aimFor(H,'lightbolt',tStats(H))===null,'without the open world (classic board) there is no aimed cast');OW.on=keep;}
clear();
return res.pass+' passed, '+res.fail+' failed\n'+out.join('\n');})()
