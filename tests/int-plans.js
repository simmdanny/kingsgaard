(function(){
/* Generates the interior plan of every enterable building in several worlds and reports what came out. */
const out=[],seeds=window.__seeds||[11,23,37],stat={};let dumps=0;
function world(seed){meta.world='open';resetRun();buildMap(seed);MAP.fresh=false;startWave=1;wave=0;gold=500;lives=99;nextQ=buildWave(1);state='playing';showOverlay(null);owSpawnHero();}
const bump=(k,n)=>{stat[k]=(stat[k]||0)+(n==null?1:n);};
const f2=v=>+v.toFixed(2);
for(const seed of seeds){
  world(seed);const list=OWI.reg.slice();bump('worlds');bump('enterable',list.length);
  for(const b of list){const key=b.type;bump('t:'+key);
    try{const ic=owiEnsurePlan(b),P=ic.P;bump('planned');
      P.floors.forEach(F=>{bump('floors');bump('rooms',F.rooms.length);bump('items',F.items.filter(i=>!i.deco).length);bump('deco',F.items.filter(i=>i.deco).length);
        if(F.baseWhy){bump('BASE-FAIL');out.push('seed '+seed+' '+key+' tier'+P.tier+' floor '+F.i+' base layout: '+F.baseWhy);}
        if(!F.proof.ok){bump('PROOF-FAIL');out.push('seed '+seed+' '+key+' tier'+P.tier+' floor '+F.i+' proof: '+F.proof.why);if(dumps++<2){OWI.dbg=true;const r=owiProve(P,F);OWI.dbg=false;out.push(r.dump||'');}}});
      bump('dropped',P.log.filter(l=>l.indexOf('dropped')===0).length);
      if(P.stairs.length)bump('withStairs');
      owiBuildMesh(b);bump('meshes');owiFreeMesh(b);if(b.enter)bump('enterable');
    }catch(e){bump('ERR');out.push('seed '+seed+' '+key+' tier'+(b.pl&&b.pl.tier)+' EXC '+e.message+' @ '+(e.stack||'').split('\n')[1]);}}
}
out.unshift(JSON.stringify(stat));
return out.slice(0,70).join('\n');})()
