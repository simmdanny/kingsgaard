(function(){
const o=[];
try{
meta.world='open';resetRun();buildMap(42);MAP.fresh=false;startWave=1;wave=0;gold=9999;lives=20;nextQ=buildWave(1);state='playing';showOverlay(null);owSpawnHero();
callWave();const rt0=OW.armies[0].route;let placed=0;
for(let d=rt0.len-70;d<rt0.len-10&&placed<10;d+=6){const p=posAt(d,rt0),a=p[2];for(const sd of[1,-1]){const x=p[0]+Math.cos(a)*5*sd,z=p[1]-Math.sin(a)*5*sd,c=Math.round(x/TS+OX),r=Math.round(z/TS+OZ);placing={type:'archer'};if(placed<10&&placeValid(c,r)){if(placeTower('archer',c,r,{}))placed++;}}}placing=null;
o.push('towers='+placed);
const A=(OW.armies||[]).map(a=>'cave'+a.cave.id+':'+Math.round(a.route.len));o.push('wave1 armies '+A.join(','));
let t=0,maxAlive=0,reached=0,minRem=1e9,errs=0,lastLives=lives;const t0=performance.now();
for(let i=0;i<9000;i++){try{update(.05);updFx(.05);}catch(e){errs++;if(errs<3)o.push('ERR '+e.message+' '+(e.stack||'').slice(0,300));break;}
  t+=.05;if(i%20===0){owView();}
  const al=enemies.length;maxAlive=Math.max(maxAlive,al);enemies.forEach(e=>{if(e.route)minRem=Math.min(minRem,e.route.len-e.dist);});
  if(i>200&&al===0&&!spawners.length)break;}
o.push('simulated '+t.toFixed(0)+'s in '+Math.round(performance.now()-t0)+'ms maxAlive='+maxAlive+' enemiesLeft='+enemies.length+' kills='+kills+' lives '+lastLives+'->'+lives+' minRem='+Math.round(minRem)+' errs='+errs+' gold='+Math.round(gold));
}catch(e){o.push('ERR '+e.message+' '+(e.stack||'').slice(0,500));}
return o.join('\n');})()
