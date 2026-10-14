(function(){
const o=[];
try{
meta.world='open';resetRun();buildMap(555);MAP.fresh=false;startWave=1;wave=0;gold=500;lives=20;nextQ=buildWave(1);state='playing';showOverlay(null);owSpawnHero();
meta.shadows=true;applyShadows();
/* stand in a forest */
let p=OW.props.filter(q=>q.type==='decid'&&Math.hypot(q.x,q.z)>60&&Math.hypot(q.x,q.z)<200)[0];
heroU.x=p.x-3;heroU.z=p.z+4;owHeroCell(heroU);TPC.on=true;
function frame(){update(.033);updFx(.033);owFrame();owView();applyCam();if(DOM.post&&DOM.post.on)DOM.post.render();else renderer.render(scene,camera);}
for(let i=0;i<10;i++)frame();
const count=()=>{let on=0,vis=0,inst=0;for(const k in OW.chunks){const c=OW.chunks[k];if(c.on){on++;c.meshes.forEach(m=>{if(m.visible)vis++;inst+=m.count;});}}return 'chunksOn='+on+' meshesVisible='+vis+' instances='+inst;};
o.push('before: '+count());
const sp=SPELLS?SPELLS.expanse:null;
castExpanse(heroU,{},{});
for(let i=0;i<200;i++)frame();
o.push('during(6s): DOM.on='+DOM.on+' post='+(DOM.post&&DOM.post.on)+' '+count());
/* what do the tree meshes look like */
const ch=Object.values(OW.chunks).find(c=>c.on);const m=ch.meshes[0];
o.push('tree mesh: visible='+m.visible+' parent='+(m.parent&&m.parent.type)+' mat='+(m.material===VCMAT?'VCMAT':'other')+' layers='+m.layers.mask+' frustumCulled='+m.frustumCulled+' count='+m.count);
window.__tp=p;
}catch(e){o.push('ERR '+e.message+' '+(e.stack||'').slice(0,400));}
return o.join('\n');})()
