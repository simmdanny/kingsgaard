/* World Lab: the world generator and the streamed terrain on their own, with a free camera, for tuning the landscape. */
wdPatch();
const Q=new URLSearchParams(location.search),SEED=+(Q.get('seed')||3);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,2100);
const SKYH=new THREE.Color(0xb9d3e6),SKYZ=new THREE.Color(0x4f86c6);scene.fog=new THREE.Fog(SKYH.clone(),1700,-300);scene.background=SKYH.clone();
/* sky: a gradient dome drawn first, at infinity */
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:false,uniforms:{uH:{value:SKYH},uZ:{value:SKYZ},uS:{value:new THREE.Vector3(0,1,0)}},
  vertexShader:'varying vec3 vD;void main(){vD=position;vec4 p=projectionMatrix*mat4(mat3(modelViewMatrix))*vec4(position,1.0);gl_Position=p.xyww;}',
  fragmentShader:'uniform vec3 uH,uZ,uS;varying vec3 vD;void main(){vec3 d=normalize(vD);float t=pow(clamp(d.y,0.0,1.0),0.55);vec3 c=mix(uH,uZ,t);float s=max(dot(d,normalize(uS)),0.0);c+=vec3(1.0,0.9,0.7)*(pow(s,600.0)*2.0+pow(s,8.0)*0.12);gl_FragColor=vec4(c,1.0);}'});
const sky=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),skyMat);sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);
const sun=new THREE.DirectionalLight(0xfff4e0,1.05),hemi=new THREE.HemisphereLight(0xc8dcf0,0x4a5a30,.62),amb=new THREE.AmbientLight(0xffffff,.08);scene.add(sun,sun.target,hemi,amb);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-120,right:120,top:120,bottom:-120,near:1,far:900});sun.shadow.bias=-.0006;sun.shadow.normalBias=.05;
let SUNA=+(Q.get('sa')||2.2),SUNE=+(Q.get('se')||.62);
function setSun(){const d=new THREE.Vector3(Math.cos(SUNE)*Math.cos(SUNA),Math.sin(SUNE),Math.cos(SUNE)*Math.sin(SUNA));sun.userData.dir=d;skyMat.uniforms.uS.value.copy(d);}
setSun();
const G=new THREE.Group();scene.add(G);
wgInit(SEED);wtInit(G);wfInit(G);
/* camera */
const cam={x:+(Q.get('x')||0),y:+(Q.get('y')||60),z:+(Q.get('z')||300),yaw:+(Q.get('yaw')||0),pitch:+(Q.get('pitch')||-.1),spd:40};
function camApply(){camera.position.set(cam.x,cam.y,cam.z);const cp=Math.cos(cam.pitch);camera.lookAt(cam.x-Math.sin(cam.yaw)*cp,cam.y+Math.sin(cam.pitch),cam.z-Math.cos(cam.yaw)*cp);camera.updateMatrixWorld();
  const d=sun.userData.dir;sun.target.position.set(cam.x,wtHasTile(cam.x,cam.z)?wtH(cam.x,cam.z):cam.y-50,cam.z);sun.position.copy(sun.target.position).addScaledVector(d,400);sun.target.updateMatrixWorld();sky.position.copy(camera.position);}
const keys=new Set();addEventListener('keydown',e=>keys.add(e.code));addEventListener('keyup',e=>keys.delete(e.code));
let drag=null;renderer.domElement.addEventListener('mousedown',e=>{drag={x:e.clientX,y:e.clientY};});addEventListener('mouseup',()=>drag=null);
addEventListener('mousemove',e=>{if(!drag)return;cam.yaw-=(e.clientX-drag.x)*.004;cam.pitch=Math.max(-1.5,Math.min(1.5,cam.pitch-(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY};});
addEventListener('wheel',e=>{cam.spd*=e.deltaY>0?.8:1.25;});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
let last=performance.now(),fps=0;
function tick(){const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;fps=fps*.95+.05/dt;
  const f=[-Math.sin(cam.yaw),-Math.cos(cam.yaw)],r=[Math.cos(cam.yaw),-Math.sin(cam.yaw)],s=cam.spd*dt*(keys.has('ShiftLeft')?4:1);
  if(keys.has('KeyW')){cam.x+=f[0]*s;cam.z+=f[1]*s;}if(keys.has('KeyS')){cam.x-=f[0]*s;cam.z-=f[1]*s;}if(keys.has('KeyA')){cam.x-=r[0]*s;cam.z-=r[1]*s;}if(keys.has('KeyD')){cam.x+=r[0]*s;cam.z+=r[1]*s;}
  if(keys.has('KeyE'))cam.y+=s;if(keys.has('KeyQ'))cam.y-=s;
  camApply();wtUpdate(camera,false);wfUpdate(camera.position,false);renderer.render(scene,camera);
  document.getElementById('hud').textContent=`seed ${SEED}  x ${cam.x.toFixed(0)} y ${cam.y.toFixed(0)} z ${cam.z.toFixed(0)}  yaw ${cam.yaw.toFixed(2)} pitch ${cam.pitch.toFixed(2)}  fps ${fps.toFixed(0)}\nchunks ${WT.chunks.size} shown ${WT.shown.size} built ${WT.stats.built} (${(WT.stats.ms/Math.max(1,WT.stats.built)).toFixed(1)} ms)  tiles ${WT.tiles.size}  h0 ${WG.stats.h0}`;
  requestAnimationFrame(tick);}
/* the automation API (used from the browser tools) */
window.LAB={cam,go(x,y,z,yaw,pitch,rel){Object.assign(cam,{x,y,z,yaw,pitch});if(rel)cam.y=wtH(x,z)+y;camApply();return this;},
  settle(){camApply();for(let i=0;i<3;i++)wtUpdate(camera,true);wfUpdate(camera.position,true);camApply();renderer.render(scene,camera);return {chunks:WT.chunks.size,shown:WT.shown.size};},
  sites(cx,cz,r){const out=[];const C=WF.cell;for(let b=Math.floor((cz-r)/C);b<=Math.floor((cz+r)/C);b++)for(let a=Math.floor((cx-r)/C);a<=Math.floor((cx+r)/C);a++){const f=wfSite(a,b);if(f)out.push({kind:f.kind,x:Math.round(f.x),z:Math.round(f.z),R:Math.round(f.R),y:+f.y.toFixed(1),yaw:+f.yaw.toFixed(2)});}return out;},
  roads(x,z,R){window.__labRoads=1;const T0=performance.now();const vs=wsWant(x,z,R);const n=WS.jobs.length;wsStep(Infinity);return{villages:vs.length,jobs:n,roads:[...WS.roads.values()].filter(r=>r).length,failed:[...WS.roads.values()].filter(r=>!r).length,ms:Math.round(performance.now()-T0),siteMs:Math.round(WS.stats.ms)};},
  sun(a,e){SUNA=a;SUNE=e;setSun();return this;},
  /* the Great Elder Circles of the elderglades within r of a point: where, how big, how far off the middle of the region, how well it fits */
  greats(cx,cz,r){const RC=WG_CFG.regionCell,out=[];for(let b=Math.round((cz-r)/RC);b<=Math.round((cz+r)/RC);b++)for(let a=Math.round((cx-r)/RC);a<=Math.round((cx+r)/RC);a++){const G=wgGreat(wgRegCell(a,b));if(!G)continue;
      out.push({a,b,x:Math.round(G.x),z:Math.round(G.z),off:Math.round(Math.hypot(G.x-G.cx,G.z-G.cz)),Rb:Math.round(G.Rb),Hs:Math.round(G.Hs),e:+G.e.toFixed(2),R:Math.round(G.R),fit:+G.fitM.toFixed(2),summit:+wgHeightRaw(G.x,G.z).toFixed(1)});}return out;},
  /* the relief of an area by region (where its weight is over .9): height percentiles, how much is level (slope under 5 %), walkable (under 50 %), steep */
  stats(cx,cz,size,step){step=step||8;const n=Math.floor(size/step),o={},R={1:[],2:[],3:[]},S={1:[],2:[],3:[]};let rc=null;const row=new Float32Array(n+2),prev=new Float32Array(n+2);
    for(let j=0;j<=n;j++){const z=cz-size/2+j*step;rc=wgCtx(cx-size/2-step,z-step,cx+size/2+step,z+step,0);for(let i=0;i<=n;i++){const x=cx-size/2+i*step;o.mtn=0;const h=wgH0(x,z,o,rc);row[i]=h;
        if(i>0&&j>0){const sl=Math.hypot(h-row[i-1],h-prev[i])/step,t=o.w1>.9?1:o.w2>.9?2:o.w3>.9?3:0;if(t){R[t].push(h);S[t].push(sl);}}}prev.set(row);}
    const out={};for(const t of[1,2,3]){const H=R[t].sort((a,b)=>a-b),L=S[t];if(!H.length)continue;const pc=p=>+H[Math.floor(p*(H.length-1))].toFixed(0);
      out[['','high','plateau','glade'][t]]={n:H.length,h:[pc(0),pc(.1),pc(.5),pc(.9),pc(1)],level:+(L.filter(v=>v<.05).length/L.length).toFixed(2),under30:+(L.filter(v=>v<.3).length/L.length).toFixed(2),under50:+(L.filter(v=>v<.5).length/L.length).toFixed(2),steep85:+(L.filter(v=>v>.85).length/L.length).toFixed(2),water:+(H.filter(v=>v<WG_CFG.WL).length/H.length).toFixed(2)};}
    return out;},
  async shot(name,w,h){w=w||1600;h=h||900;const ow=innerWidth,oh=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();this.settle();renderer.render(scene,camera);
    const url=renderer.domElement.toDataURL('image/jpeg',.88);renderer.setSize(ow,oh,false);camera.aspect=ow/oh;camera.updateProjectionMatrix();
    await fetch('http://localhost:8766/'+name,{method:'POST',body:url});return name;},
  /* a top-down map: the land coloured as it looks (grass tinted by the region, rock where steep, snow on the high spires, water), shaded relief,
     brighter higher up, contour lines every 25 m (thicker every 100 m) */
  async map(name,cx,cz,size,px){px=px||600;const cv=document.createElement('canvas');cv.width=cv.height=px;const g=cv.getContext('2d'),im=g.createImageData(px,px),step=size/px,T0=performance.now();
    const o={},P1=px+1,hs=new Float32Array(P1*P1),WW=new Float32Array(P1*P1*4);
    const HQ=wgHydroIn(cx-size/2,cz-size/2,cx+size/2,cz+size/2);
    let rc=null;for(let j=0;j<=px;j++)for(let i=0;i<=px;i++){const x=cx-size/2+i*step,z=cz-size/2+j*step;if(i===0)rc=wgCtx(cx-size/2-step,z-step,cx+size/2+step,z+step,step*2);o.mtn=0;o.tier=0;const h0=wgH0(x,z,o,rc);const q=j*P1+i;hs[q]=h0;
      WW[q*4]=o.w1;WW[q*4+1]=o.w2;WW[q*4+2]=o.w3;WW[q*4+3]=o.w1>0?o.w1*wnS(o.mtn,70,190):0;}
    const GR=[[.40,.60,.30],[.52,.62,.26],[.36,.60,.40]],RK=[[.62,.63,.67],[.80,.68,.50],[.42,.46,.42]];
    for(let j=0;j<px;j++)for(let i=0;i<px;i++){const q=j*P1+i,k=(j*px+i)*4,a=hs[q],b=hs[q+1],c=hs[q+P1],sl=Math.hypot(b-a,c-a)/step;let R=0,Gc=0,B=0;
      for(let t=0;t<3;t++){const w=WW[q*4+t],rk=wnS(sl,.55,.85);R+=w*(GR[t][0]*(1-rk)+RK[t][0]*rk);Gc+=w*(GR[t][1]*(1-rk)+RK[t][1]*rk);B+=w*(GR[t][2]*(1-rk)+RK[t][2]*rk);}
      const sn=wnS(WW[q*4+3],.3,.55)*(1-wnS(sl,.8,1.2));R+=(.95-R)*sn;Gc+=(.96-Gc)*sn;B+=(.98-B)*sn;
      const sh=Math.max(.35,Math.min(1.5,1+((a-b)-(a-c))/step*.6))*(.7+.3*Math.min(1,Math.max(0,a/350)));R*=sh;Gc*=sh;B*=sh;
      const lv=Math.floor(a/25),cl=lv!==Math.floor(b/25)||lv!==Math.floor(c/25);if(cl){const m=(Math.floor(a/100)!==Math.floor(b/100)||Math.floor(a/100)!==Math.floor(c/100))?.55:.8;R*=m;Gc*=m;B*=m;}
      if(a<WG_CFG.WL){R=.16;Gc=.43;B=.78;}
      im.data[k]=Math.min(255,R*255);im.data[k+1]=Math.min(255,Gc*255);im.data[k+2]=Math.min(255,B*255);im.data[k+3]=255;}
    g.putImageData(im,0,0);g.strokeStyle='#2a6ad0';g.lineCap='round';for(const s of HQ.segs){g.lineWidth=Math.max(1,s.hw*2/step);g.beginPath();for(let k=0;k<=s.n;k++){const X=(s.pts[k*2]-cx+size/2)/step,Y=(s.pts[k*2+1]-cz+size/2)/step;k?g.lineTo(X,Y):g.moveTo(X,Y);}g.stroke();}
    g.fillStyle='#2a6ad0';for(const l of HQ.lakes){g.beginPath();g.arc((l.x-cx+size/2)/step,(l.z-cz+size/2)/step,l.R/step,0,6.283);g.fill();}
    if(window.__labRoads){g.strokeStyle='#e8d090';g.lineWidth=2;for(const r of WS.roads.values()){if(!r)continue;g.beginPath();r.pts.forEach((q,i)=>{const X=(q[0]-cx+size/2)/step,Y=(q[1]-cz+size/2)/step;i?g.lineTo(X,Y):g.moveTo(X,Y);});g.stroke();g.fillStyle='#ff3030';for(const c of r.cross){g.fillRect((c.x0-cx+size/2)/step-2,(c.z0-cz+size/2)/step-2,4,4);}}
      for(const v of WS.sites.values()){if(!v)continue;g.fillStyle='#ffe08a';g.strokeStyle='#5a3a10';g.beginPath();g.arc((v.x-cx+size/2)/step,(v.z-cz+size/2)/step,Math.max(3,v.fr/step),0,6.283);g.fill();g.stroke();g.fillStyle='#000';g.font='10px sans-serif';g.fillText(v.name+' '+v.size,(v.x-cx+size/2)/step+6,(v.z-cz+size/2)/step-6);}
      const K=WS.keep;if(K){g.fillStyle='#3b5ea6';g.fillRect((K.x-cx+size/2)/step-5,(K.z-cz+size/2)/step-5,10,10);}}
    /* the Great Elder Circles: the middle of the region (a cross), the mountain's footprint, the ring (a bar across its summit) */
    {const RC=WG_CFG.regionCell;for(let b=Math.round((cz-size/2)/RC)-1;b<=Math.round((cz+size/2)/RC)+1;b++)for(let a=Math.round((cx-size/2)/RC)-1;a<=Math.round((cx+size/2)/RC)+1;a++){const G=wgGreat(wgRegCell(a,b));if(!G)continue;
      const X=v=>(v-cx+size/2)/step,Y=v=>(v-cz+size/2)/step;g.strokeStyle='#ffffff';g.lineWidth=1.5;g.beginPath();for(let k=0;k<=48;k++){const t=k/48*6.2832,c=Math.cos(t),s=Math.sin(t),rr=wgMtnR(G,c,s),lu=c*G.e*rr,lv=s*rr;const x=G.x+lu*G.cp-lv*G.sp,z=G.z+lu*G.sp+lv*G.cp;k?g.lineTo(X(x),Y(z)):g.moveTo(X(x),Y(z));}g.stroke();
      const ca=Math.cos(G.yaw),sa=Math.sin(G.yaw);g.strokeStyle='#ff4040';g.lineWidth=4;g.beginPath();g.moveTo(X(G.x-ca*G.R),Y(G.z-sa*G.R));g.lineTo(X(G.x+ca*G.R),Y(G.z+sa*G.R));g.stroke();
      g.strokeStyle='#ffff00';g.lineWidth=2;g.beginPath();g.moveTo(X(G.cx)-6,Y(G.cz));g.lineTo(X(G.cx)+6,Y(G.cz));g.moveTo(X(G.cx),Y(G.cz)-6);g.lineTo(X(G.cx),Y(G.cz)+6);g.stroke();}}
    g.fillStyle='#fff';g.font='12px sans-serif';g.fillText(`seed ${SEED} centre ${cx},${cz} size ${size} m  ${Math.round(performance.now()-T0)} ms  streams ${HQ.segs.length} lakes ${HQ.lakes.length}`,6,14);
    await fetch('http://localhost:8766/'+name,{method:'POST',body:cv.toDataURL('image/jpeg',.9)});return {name,ms:Math.round(performance.now()-T0),segs:HQ.segs.length,lakes:HQ.lakes.length};}};
camApply();tick();
