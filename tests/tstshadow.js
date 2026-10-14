(function(){
const o=[];
try{
meta.world='open';resetRun();buildMap(555);MAP.fresh=false;startWave=1;wave=0;gold=500;lives=20;nextQ=buildWave(1);state='playing';showOverlay(null);owSpawnHero();
meta.shadows=true;applyShadows();meta.sd=300;
const v=OW.villages.find(v=>v.size==='medium'),pts=[[v.x+5,v.z+3],[v.x-12,v.z+9],[v.x+20,v.z-6],[v.x,v.z+30]].map(q=>new THREE.Vector3(q[0],owH(q[0],q[1])+2,q[1]));
FLY.on=true;FLY.pos.set(v.x-30,owH(v.x,v.z)+14,v.z+40);FLY.yaw=Math.PI;FLY.pitch=-.3;
function frame(){flyApply();update(.033);updFx(.033);owFrame();owView();renderer.render(scene,camera);}
for(let i=0;i<6;i++)frame();
const px=(m,P,ms)=>{const e=m.elements,x=e[0]*P.x+e[4]*P.y+e[8]*P.z+e[12],y=e[1]*P.x+e[5]*P.y+e[9]*P.z+e[13],w=e[3]*P.x+e[7]*P.y+e[11]*P.z+e[15];return[x/w*ms,y/w*ms];};
function drift(label,stepFn,N){const base=[];let max=0,jumps=0,prevInt=null;
  for(let i=0;i<N;i++){stepFn(i);frame();const ms=sun.shadow.mapSize.x;pts.forEach((P,k)=>{const q=px(sun.shadow.matrix,P,ms);if(i===0){base[k]=q;}else{let dx=q[0]-base[k][0],dy=q[1]-base[k][1];dx-=Math.round(dx);dy-=Math.round(dy);max=Math.max(max,Math.abs(dx),Math.abs(dy));}});}
  o.push(label+': max sub-texel drift='+max.toFixed(4)+' texels over '+N+' frames  (0 = shadows glued to the world)');}
drift('fly forward .4/frame',i=>{FLY.pos.x+=Math.sin(FLY.yaw)*.4;FLY.pos.z+=Math.cos(FLY.yaw)*.4;},120);
drift('strafe + climb',i=>{FLY.pos.x+=.5;FLY.pos.y+=.1;},100);
drift('turn left/right (no move)',i=>{FLY.yaw+=Math.sin(i*.2)*.05;FLY.pitch=-.3+Math.sin(i*.13)*.4;},120);
/* the far cascade: static casters, update rate */
let refresh=0;const orig=sunFar.shadow.needsUpdate;let last=0;for(let i=0;i<300;i++){FLY.pos.x+=.6;frame();if(sunFar.shadow.needsUpdate)refresh++;}
o.push('far cascade refreshes during 300 frames of movement (180 units): needsUpdate seen '+refresh+' times; castShadow='+sunFar.castShadow+' radius='+sunFar.shadow.camera.right);
/* light direction consistency: target moved, light position follows in the same frame */
const off=sun.position.clone().sub(sun.target.position);o.push('sun offset vs DAYC.off diff='+off.distanceTo(DAYC.off).toFixed(5));
FLY.on=false;
}catch(e){o.push('ERR '+e.message+' '+(e.stack||'').slice(0,500));}
return o.join('\n');})()
