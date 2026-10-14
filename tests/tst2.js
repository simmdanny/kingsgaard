(function(){
const o=[];
try{
meta.world='open';resetRun();buildMap(555);MAP.fresh=false;startWave=1;wave=0;gold=9999;lives=20;nextQ=buildWave(1);state='playing';showOverlay(null);owSpawnHero();
o.push('state='+state+' hero='+(heroU?Math.round(heroU.x)+','+Math.round(heroU.z):'none'));
/* tower placement near the keep gate */
const gx=OW.keepGate.x,gz=OW.keepGate.z+14;const c=Math.round(gx/TS+OX),r=Math.round(gz/TS+OZ);
let placed=0;for(let dr=-6;dr<=6;dr+=2)for(let dc=-6;dc<=6;dc+=2){const cc=c+dc,rr=r+dr;placing={type:'archer'};try{if(placeValid(cc,rr)&&placed<6){const t=placeTower('archer',cc,rr,{});if(t)placed++;}}catch(e){o.push('place err '+e.message)}}placing=null;
o.push('towers placed='+placed);
/* run a wave: spawn and step the simulation, measure how far enemies get */
wave=1;owWaveStart(1);
const A=OW.armies||[];o.push('armies='+A.map(a=>'cave'+a.cave.id+' len='+Math.round(a.route.len)+' tgt='+a.target.type).join(';'));
/* walk one enemy along each cave's route: continuity and speed check */
OW.caves.forEach(cv=>{const rt=cv.keepRoute;let maxJump=0,prev=posAt(0,rt);for(let d=1;d<=rt.len;d+=1){const p=posAt(d,rt);maxJump=Math.max(maxJump,Math.hypot(p[0]-prev[0],p[1]-prev[1]));prev=p;}
  const e={route:rt,dist:0};let t=0;while(e.dist<rt.len&&t<2000){e.dist+=.93*owMarch(e)*.1;t+=.1;}
  o.push('cave'+cv.id+' len='+Math.round(rt.len)+' maxJump='+maxJump.toFixed(2)+' marchTime='+Math.round(t)+'s startAt='+Math.round(posAt(0,rt)[0])+','+Math.round(posAt(0,rt)[1])+' endNearKeep='+Math.round(Math.hypot(posAt(rt.len,rt)[0]-OW.keep.x,posAt(rt.len,rt)[1]-OW.keep.z)))});
/* village-target route */
const v=OW.villages[0];const rt2=owRouteTo(OW.caves[0],v);o.push('route to '+v.name+': '+(rt2?Math.round(rt2.len):'none'));
/* recognition, damage and recovery */
v.state='discovered';owRecognize(v);o.push('recognized='+v.recognized+' state='+v.state);
const b=v.buildings[3];const hp0=b.hp;owDamageBuilding(b,b.maxHp*.7);const hp1=b.hp;owVStates(v);
o.push('dmg '+hp0.toFixed(0)+'->'+hp1.toFixed(0)+' state='+v.state+' cond='+v.condition.toFixed(2));
v.lastAttack=-99;for(let i=0;i<400;i++){owUpdate(.1);}owVStates(v);o.push('after 40s: hp='+b.hp.toFixed(0)+'/'+b.maxHp.toFixed(0)+' state='+v.state+' cond='+v.condition.toFixed(2));
/* save / load roundtrip */
const sv=owSave();const cnt=JSON.stringify(sv).length;owLoad(JSON.parse(JSON.stringify(sv)));o.push('save bytes='+cnt+' wv='+sv.wv);
}catch(e){o.push('ERR '+e.message+' '+(e.stack||'').slice(0,400));}
return o.join('\n');})()
