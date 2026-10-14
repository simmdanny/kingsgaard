/* =====================================================================================================================
   KINGSGAARD INTERIORS (8/8): the light of the room the hero is in, and its shadows.
   The sun reaches a room through its windows and doorways (the real walls and roof cast, geo.js / walk.js) and the furniture and the partition walls shade the floor from it. At night, and in the glow of a fire,
   the light comes from the room itself: ONE real point light follows the nearest source (a hearth, stove, forge or fire pit; a sconce or the scroll merchant's orb at night) on the hero's floor, or, when the hero
   is out of doors at night, the nearest street lamp. It is the only point light that casts a shadow (and is in the scene's lights only while it lights something), its map is small (512) and is drawn only when the source or the house changes (kingsgaard.html, the wrapper of
   renderer.shadowMap.render: a pass of its own that sees only layer OWIL_LAYER), so a lit room costs the sun's passes plus one cube map per change. Its two shader variants (with and without it) are each compiled once and kept; with nothing to light it is switched off. Changing sources fades out, moves, and fades in.
   ===================================================================================================================== */
const OWIL_LAYER=3;
/* the pieces that give light: height above the floor (m), how far in front of the piece (m), colour, intensity, range (m), fire = burns by day too */
const OWIL_SRC={hearth:{y:.55,f:.32,c:0xff9648,i:1.22,r:9,fire:1},hearthS:{y:.5,f:.3,c:0xff9648,i:1.08,r:8,fire:1},firepit:{y:.4,f:0,c:0xff9648,i:1.15,r:9,fire:1},stove:{y:.95,f:.35,c:0xff8a40,i:0.86,r:7,fire:1},
  forge:{y:1.0,f:.45,c:0xff7a30,i:1.44,r:10,fire:1},deco_sconce:{y:1.95,f:.14,c:0xffb860,i:0.72,r:7,fire:0},orb:{y:1.15,f:0,c:0xb89cff,i:0.79,r:7,fire:0}};
const OWIL={l:null,cur:null,pend:null,k:0,t:0,grp:null,base:0,day:1,ph:0,prime:0};
function owilInit(){if(OWIL.l)return;const l=new THREE.PointLight(0xffa850,0,10,2),sh=l.shadow;l.position.set(0,-600,0);l.castShadow=true;l.visible=false;/* in the lights of the scene only while it has something to light: an idle shadow-casting light costs every lit pixel of a city about 2 ms on a weak GPU */sh.mapSize.set(512,512);sh.camera.near=.12;sh.bias=-.003;sh.normalBias=.035;sh.autoUpdate=false;sh.needsUpdate=false;
  /* its map is drawn in the pass of layer OWIL_LAYER (kingsgaard.html, the wrapper of renderer.shadowMap.render): without this flag it was drawn in the ordinary pass, which froze the hero and any villager into it where they stood when the source was picked */
  l.userData.owLayer3=true;
  scene.add(l);OWIL.l=l;window.OWIL=OWIL;}
owilInit();
function owilReset(){const L=OWIL.l;if(!L)return;L.intensity=0;L.position.y=-600;L.visible=false;OWIL.cur=null;OWIL.pend=null;OWIL.k=0;OWIL.grp=null;OWIL.prime=0;owhsOff();}
/* the nearest source: {key, x, y, z, s (OWIL_SRC row or the street-lamp row)} or null */
const _owlLamp={y:0,f:0,c:0xffa850,i:1.25,r:17,fire:0,lamp:1};
function owilPick(){const H=heroU&&tpcCam()?heroU:{x:camera.position.x,z:camera.position.z},cur=OWIL.cur,b=OWI.cb;let best=null,bd=1e9;
  if(b&&OWI.in&&b.ic&&b.ic.grp&&b.ic.P){const F=b.ic.P.floors[OWI.lv];if(F)for(const it of F.items){const s=OWIL_SRC[it.kind];if(!s)continue;
    const w=owiL2W(b,it.x+Math.sin(it.rot)*s.f,it.z+Math.cos(it.rot)*s.f),d=Math.hypot(w[0]-H.x,w[1]-H.z)-(cur&&cur.it===it?1.3:0);if(d<bd&&d<s.r+1.5){bd=d;best={key:'i'+it.kind+it.x.toFixed(2)+','+it.z.toFixed(2),x:w[0],y:b.hi+F.y+s.y,z:w[1],s,it,b};}}}
  /* out of doors the lanterns have real lights of their own (kingsgaard.html owLampPick); this light is the room's */
  return best;}
const owilPlace=p=>{const L=OWIL.l;L.visible=true;OWIL.cur=p;L.position.set(p.x,p.y,p.z);L.color.setHex(p.s.c);L.distance=p.s.r;OWIL.base=p.s.i;L.shadow.needsUpdate=true;OWIL.grp=p.b?p.b.ic.grp:null;};
function owilTick(dt){const L=OWIL.l;if(!L||!heroU)return;OWIL.t+=dt;OWIL.ph+=dt;
  /* the first two frames of a world draw it once with the light in the scene and once without, so that the shaders of both variants are compiled while the world is still being brought up and not when the hero first steps into a lit room */
  if(OWIL.prime<4&&!OWIL.cur){L.visible=(OWIL.prime&1)===0;OWLT.pv=(OWIL.prime&2)===0;L.intensity=0;L.position.y=-600;if(typeof owlmPrime==='function')owlmPrime(OWIL.prime);OWIL.prime++;if(OWIL.prime===4){OWLT.pv=false;if(typeof owlmPrime==='function')owlmPrime(4);}return;}
  if(OWIL.t>=.25){OWIL.t=0;const p=owilPick(),c=OWIL.cur;
    if(!p){OWIL.pend=null;OWIL.drop=true;}
    else if(!c){owilPlace(p);OWIL.pend=null;OWIL.drop=false;}
    else if(c.key===p.key){OWIL.pend=null;OWIL.drop=false;if(p.b&&OWIL.grp!==p.b.ic.grp)owilPlace(p);/* the interior was built again */}
    else{OWIL.pend=p;OWIL.drop=true;}}
  const c=OWIL.cur;let tg=0;
  if(c&&!OWIL.drop){const n=OWLT.n;tg=c.s.lamp?n:c.s.fire?.5+.5*n:.3+.7*n;}
  OWIL.k+=(tg-OWIL.k)*Math.min(1,dt*(tg>OWIL.k?4:6));if(OWIL.k<.01&&!tg)OWIL.k=0;
  if(OWIL.k===0&&OWIL.drop&&c){if(OWIL.pend){owilPlace(OWIL.pend);OWIL.pend=null;OWIL.drop=false;}else{OWIL.cur=null;}}
  if(!OWIL.cur){L.intensity=0;L.position.y=-600;L.visible=false;owhsTick(dt);return;}
  L.intensity=OWIL.base*OWIL.k*(1+.07*Math.sin(OWIL.ph*9)+.04*Math.sin(OWIL.ph*23+1));owhsTick(dt);}

/* ---- The shadows of the people in the light of the room ----
   The cube map of the point light above holds only what does not move, and is drawn only when the source changes. The people of the room - the hero and the villagers on the same floor of the same house - are drawn every
   frame into a cube map of their own, seen from the flame (OWHS.l: a point light that is never added to the scene, so no shader of the world gets another light; three.js only draws its shadow map, in the pass below, which
   sees nothing but them). The shaders of the house (lightmap.js, USE_LM) use it twice: the real light of that source is cut where someone stands between it and the surface, and so is the warm light of the grid (most of a
   fire's light in a room), but only where that source really reaches (its own cube shadow), so a shadow never shows through a partition or another house. A shadow falls away from the fire, turns as its figure turns and
   swings with the stride; it is sharp at the feet and soft further off (the flame has a size, OWHS_SIZE: the blocker's distance sets the penumbra). A cube sees all round the flame, so a fire pit in the middle of a room
   throws everyone's shadow outwards. The shaders look the map up only near the figures (uHSC: a cone from the flame round each of them). In first person the hero's body still casts.
   Cost: the figures' meshes once more, into the faces of a 6 x 512 map that see them, while the hero is in the reach of a source. */
const OWHS={l:null,u:null,k:0,want:false,b:null,m:null,tiny:[],hc:.7,R:1.2,MAP:512,NEAR:.08,S:.88,BIAS:.035,PEN:.06,N:8,cast:[],root:null,primed:false};
/* the size of the flame of each source (m): the penumbra grows with it */
const OWHS_SIZE={hearth:.34,hearthS:.28,firepit:.36,stove:.18,forge:.4,deco_sconce:.07,orb:.14};
function owhsInit(){if(OWHS.l)return;const l=new THREE.PointLight(0xffffff,0,10,2),sh=l.shadow;l.castShadow=true;sh.mapSize.set(OWHS.MAP,OWHS.MAP);sh.camera.near=OWHS.NEAR;sh.camera.updateProjectionMatrix();sh.autoUpdate=false;sh.needsUpdate=false;
  const w=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1,THREE.RGBAFormat);w.needsUpdate=true;const C=[];for(let i=0;i<OWHS.N;i++)C.push(new THREE.Vector4());
  /* only the faces of the cube that see a figure are drawn (the whole map is cleared first, so the others read 'nobody there'): the skinned meshes are not culled by three.js, and would be drawn into all six */
  {const gv=sh.getViewport.bind(sh),gm=sh.updateMatrices.bind(sh);OWHS.faces=[0,1,2,3,4,5];sh.getViewportCount=()=>OWHS.faces.length;sh.getViewport=i=>gv(OWHS.faces[i]);sh.updateMatrices=(L,i)=>gm(L,OWHS.faces[i||0]);}
  OWHS.l=l;OWHS.white=w;OWHS.root=new THREE.Object3D();/* (never in the scene: the pass is handed it as its scene, with the figures as its children for the length of the pass) */
  OWHS.u={uHS:{value:w},uHSM:{value:new THREE.Matrix4()},uHSK:{value:new THREE.Vector4()},uHSN:{value:new THREE.Vector4(OWHS.NEAR,10,0,1/(2*OWHS.MAP))},uHSL:{value:new THREE.Vector3(0,-1e4,0)},uHSC:{value:C}};window.OWHS=OWHS;}
owhsInit();
function owhsOff(){OWHS.k=0;OWHS.want=false;OWHS.b=null;OWHS.cast.length=0;if(OWHS.u)OWHS.u.uHSK.value.x=0;}
const _owhsV=new THREE.Vector3(),_owhsB=new THREE.Box3(),_owhsM=new THREE.Matrix4();
/* a villager's size, once: the centre of its figure over its feet and the radius of its mesh's bounding sphere (in the figure's units) */
function owhsVilSize(p){if(p._hs)return p._hs;let r=.45,cy=.45;p.g.traverse(o=>{if(o.isSkinnedMesh&&o.geometry.boundingSphere){const bs=o.geometry.boundingSphere;r=bs.radius;cy=bs.center.y;}});return p._hs={cy,r};}
/* the figures that cast: the hero first, then the villagers on the hero's floor of the house of the source (or in its doorway), nearest the flame first, at most OWHS.N in all; a villager's sphere is half as large
   again as its mesh's, so that it also holds it lying down */
function owhsCasters(c,L,H,m){const cast=OWHS.cast;cast.length=0;cast.push({o:m,x:H.g.position.x,y:H.g.position.y+OWHS.hc,z:H.g.position.z,R:OWHS.R,d:0});
  const b=c.b,P=b.ic&&b.ic.P,st=P&&P.st&&P.st[OWI.lv],F=P&&P.floors&&P.floors[OWI.lv];if(!st||!F||!OW.villages)return;const Q=st.Q,fy=b.hi+F.y,lx=L.position.x,lz=L.position.z,vs=[];
  for(const v of OW.villages){if(!v.near||!v.villagers||!v.g||!v.g.visible)continue;
    for(const p of v.villagers){const g=p.g;if(!g||!g.visible||(p.vhCov&&p.vhCov.visible))continue;/* (asleep under its own covers: neither it nor they cast) */const gp=g.position;if(Math.abs(gp.y-fy)>1.1)continue;const d=Math.hypot(gp.x-lx,gp.z-lz);if(d>L.distance)continue;
      const q=owiW2L(b,gp.x,gp.z);if(q[0]<Q.xa-.3||q[0]>Q.xb+.3||q[1]<Q.za-.3||q[1]>Q.zb+.6)continue;
      const z=owhsVilSize(p),s=g.scale.x;vs.push({o:g,x:gp.x,y:gp.y+z.cy*s,z:gp.z,R:z.r*s*1.5+.15,d});}}
  vs.sort((a,b)=>a.d-b.d);for(let i=0;i<vs.length&&cast.length<OWHS.N;i++)cast.push(vs[i]);}
function owhsTick(dt){const c=OWIL.cur,L=OWIL.l,H=heroU,m=H&&H.mdl,S=OWHS.l,u=OWHS.u;let tg=0;
  if(!OWHS.primed&&m&&H.g.visible&&renderer.shadowMap.enabled){/* once, as a world comes up: one pass that shows nothing, so that the programs that draw skinned figures into a cube map are compiled now and not at the first fire
    (asked for every tick until a pass has really run: owhsPass sets OWHS.primed) */
    S.position.set(H.g.position.x,H.g.position.y+3,H.g.position.z);S.distance=6;OWHS.cast.length=0;OWHS.cast.push({o:m,x:H.g.position.x,y:H.g.position.y+1,z:H.g.position.z,R:1.5});owhsFaces();u.uHSK.value.x=0;OWHS.want=true;return;}
  if(c&&c.b&&L.visible&&m&&H.g.visible&&OWI.in&&OWI.cb===c.b&&renderer.shadowMap.enabled){
    if(OWHS.m!==m){/* the hero's size, once a model: the centre of the body above the feet and a radius that keeps a drawn bow or a swing inside */_owhsB.setFromObject(m);OWHS.m=m;OWHS.hc=(_owhsB.min.y+_owhsB.max.y)/2-H.g.position.y;OWHS.R=Math.max(.6,_owhsB.getSize(_owhsV).length()*.58+.25);
      /* the small parts (eyes, brows, trims under 6 cm) cast nothing a fire's shadow would show: they are left out of this pass */OWHS.tiny=[];m.updateMatrixWorld(true);m.traverse(o=>{if(!o.isMesh||!o.castShadow)return;const g=o.geometry;if(!g.boundingSphere)g.computeBoundingSphere();o.getWorldScale(_owhsV);if(g.boundingSphere.radius*Math.abs(_owhsV.x)<.06)OWHS.tiny.push(o);});}
    if(Math.hypot(H.g.position.x-L.position.x,H.g.position.z-L.position.z)<L.distance)tg=1;}
  OWHS.k+=(tg-OWHS.k)*Math.min(1,(dt||1/60)*5);if(OWHS.k<.01&&!tg)OWHS.k=0;
  const k=OWHS.k*Math.min(1,OWIL.k/.3)*OWHS.S;
  if(k<.004||!c||!c.b||!m){u.uHSK.value.x=0;OWHS.want=false;OWHS.b=null;OWHS.cast.length=0;return;}
  /* the flame wavers a little, and the shadows with it */
  const ph=OWIL.ph;S.position.set(L.position.x+.012*Math.sin(ph*7.3),L.position.y+.01*Math.sin(ph*11.1+.5),L.position.z+.012*Math.sin(ph*5.7+1.3));S.distance=L.distance;
  owhsCasters(c,L,H,m);
  /* the cone from the flame round each figure: its direction times the nearest distance, and the cosine of the half angle (a flame inside a figure's sphere: everything beyond 1 cm) */
  const C=u.uHSC.value,sx=S.position.x,sy=S.position.y,sz=S.position.z;
  for(let i=0;i<OWHS.N;i++){const f=OWHS.cast[i];if(!f){C[i].set(0,0,0,0);continue;}const dx=f.x-sx,dy=f.y-sy,dz=f.z-sz,dc=Math.hypot(dx,dy,dz)||1e-3;
    if(dc<=f.R+.05){C[i].set(dx/dc*.01,dy/dc*.01,dz/dc*.01,-1);continue;}const dn=Math.max(.01,dc-f.R),ha=Math.min(Math.PI,Math.asin(Math.min(1,f.R/dc))+OWHS.PEN+.03);C[i].set(dx/dc*dn,dy/dc*dn,dz/dc*dn,Math.cos(ha));}
  owhsFaces();
  u.uHSN.value.set(OWHS.NEAR,L.distance,.5*(OWHS_SIZE[c.it&&c.it.kind]||.25),1/(2*OWHS.MAP));
  u.uHSK.value.set(k,OWHS.BIAS,.005,OWHS.PEN);OWHS.b=c.b;OWHS.want=true;}
/* the faces of the cube a figure can be seen in: its sphere within the corner angle of the face (54.7 degrees) of the face's axis */
function owhsFaces(){const D=OWHS.l.shadow._cubeDirections,P=OWHS.l.position,F=OWHS.faces;F.length=0;
  for(let i=0;i<6;i++){const d=D[i];for(const f of OWHS.cast){const dx=f.x-P.x,dy=f.y-P.y,dz=f.z-P.z,dc=Math.hypot(dx,dy,dz);if(dc<=f.R||Math.acos(Math.max(-1,Math.min(1,(dx*d.x+dy*d.y+dz*d.z)/dc)))<.9553+Math.asin(Math.min(1,f.R/dc))){F.push(i);break;}}}}
/* the pass: after the shadow maps of every frame (the wrapper of kingsgaard.html is wrapped once more), only the figures, only for the scene itself and once a frame */
function owhsPass(sm,r1,cam){OWHS.want=false;OWHS.primed=true;const H=heroU,m=H&&H.mdl,S=OWHS.l,u=OWHS.u,R=OWHS.root,fr=renderer.info.render.frame,kids=[];if(!m||!OWHS.cast.length){u.uHSK.value.x=0;return;}
  for(const f of OWHS.cast)kids.push(f.o);
  const vis=m.visible;if(!vis)m.visible=true;/* (first person hides the model from the camera) */
  const tiny=OWHS.m===m&&OWHS.tiny||[];for(const o of tiny)o.castShadow=false;
  /* culled face by face: three.js never culls a skinned mesh (its bounds are those of the rest pose), so for this pass the hero's skinned meshes take the sphere of the whole hero (OWHS.R round the centre of the body)
     and a villager's mesh is drawn in every face drawn (one call each); everything is put back after the pass */
  const cul=[],hc=_owhsV.set(H.g.position.x,H.g.position.y+OWHS.hc,H.g.position.z);
  m.traverse(x=>{if(x.isSkinnedMesh&&!x.frustumCulled&&x.visible){const g=x.geometry;cul.push([x,g,g.boundingSphere,false]);_owhsM.copy(x.matrixWorld).invert();const sp=new THREE.Sphere(hc.clone().applyMatrix4(_owhsM),OWHS.R/Math.max(1e-6,x.matrixWorld.getMaxScaleOnAxis()));g.boundingSphere=sp;x.frustumCulled=true;}});
  for(const o of kids)if(o!==m)o.traverse(x=>{if(x.isMesh&&x.frustumCulled){cul.push([x,null,null,true]);x.frustumCulled=false;}});
  /* the bones the renderer did not move this frame: the hero in first person, a villager out of view */
  for(const o of kids)o.traverse(x=>{if(x.isSkinnedMesh&&x.visible&&x.skeleton&&x.skeleton.frame!==fr){x.skeleton.update();x.skeleton.frame=fr;}});
  S.updateMatrixWorld(true);S.shadow.needsUpdate=true;R.children=kids;
  try{r1.call(sm,[S],R,cam);}finally{R.children=[];m.visible=vis;for(const o of tiny)o.castShadow=true;for(let i=cul.length-1;i>=0;i--){const q=cul[i];if(q[1])q[1].boundingSphere=q[2];q[0].frustumCulled=q[3];}}
  u.uHS.value=S.shadow.map?S.shadow.map.texture:OWHS.white;u.uHSM.value.copy(S.shadow.matrix);
  /* the shaders find the source among the point lights by its position in view space (as three.js sets it for this camera) */
  u.uHSL.value.setFromMatrixPosition(OWIL.l.matrixWorld).applyMatrix4(cam.matrixWorldInverse);}
(function(){const sm=renderer.shadowMap,r1=sm.render;sm.render=function(l,sc,c){r1.call(this,l,sc,c);if(sc===scene&&OWHS.want)owhsPass(this,r1,c);};})();
