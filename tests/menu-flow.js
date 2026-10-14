(async function(){
/* The whole flow from the main menu, driven through the real buttons of the page (a --dev build): Play -> (the question about the adventure in progress) -> the character creator (seven steps: gender, name, head, hair,
   clothing, accessory, confirm) -> Back; a bad name; Create Character with the forging of the realm failing (nothing may change in the saves); a full character made through the buttons -> the world -> Quit -> Load ->
   the new save (every field of the look comes back), an older one (a premade hero) and one of the first creator (v1, converted on loading) -> back to the new one. Each step compares the saves in the browser's storage
   with what they were: nothing is ever lost (an adventure that is replaced is set aside, in Load). Needs nothing else. window.__mf = {pass, fail, out:[...]}
   It uses the page's own storage keys kingsgaard.run, kingsgaard.slots and kingsgaard.meta: they are saved first and put back at the end. */
const R=window.__mf={pass:0,fail:0,out:[]};const ok=(c,m)=>{R[c?'pass':'fail']++;R.out.push((c?'PASS ':'FAIL ')+m);return c;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),$=id=>document.getElementById(id),Q=s=>document.querySelector(s),QA=s=>[...document.querySelectorAll(s)];
const keys=['kingsgaard.run','kingsgaard.slots','kingsgaard.meta'],bk={};for(const k of keys)bk[k]=localStorage.getItem(k);
const snap=()=>{const run=JSON.parse(localStorage.getItem('kingsgaard.run')||'null'),sl=JSON.parse(localStorage.getItem('kingsgaard.slots')||'[]');return{run:run&&{seed:run.mapSeed,pc:run.pc&&run.pc.name,hero:run.hero&&run.hero.id},slots:sl.map(s=>s.run&&s.run.mapSeed)};};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const waitState=async(st,ms)=>{for(let i=0;i<(ms||60)*2&&state!==st;i++)await sleep(500);return state===st;};
const clickBtn=(sel,txt)=>{const b=QA(sel).find(x=>x.textContent.trim()===txt);if(b)b.click();return !!b;};
const openCreator=async()=>{$('gmPlay').click();await sleep(300);if(!$('gmDlg').hidden)clickBtn('#gmDlgA button','Begin anew');await sleep(400);};
const step=i=>Q('#gmSteps button[data-goto="'+i+'"]').click();
const pick=(k,v)=>{const b=Q('#gmCreate button[data-k="'+k+'"][data-'+(typeof v==='number'?'i':'v')+'="'+v+'"]');if(b)b.click();return !!b;};
const colours=m=>{const s=new Set();m.traverse(o=>{if(o.isMesh&&o.material&&o.material.color)s.add(o.material.color.getHex());});return s;};
const near=(set,c)=>{for(const h of set){const d=Math.abs((h>>16)-(c>>16))+Math.abs((h>>8&255)-(c>>8&255))+Math.abs((h&255)-(c&255));if(d<6)return true;}return false;};
try{
  /* an older adventure of a premade hero, so that there is something to keep */
  if(!localStorage.getItem('kingsgaard.run')){lsSet(KR,{v:SAVE_V,t:Date.now()-86400000,pt:600,mode:'open',wv:OW_WV,ow:null,mapSeed:777,wave:3,gold:300,lives:20,kills:5,bossKills:0,startWave:1,spellCd:{},towers:[],hero:{id:'robin',c:4,r:7,up:{},target:'first'}});}
  /* and an adventure of the first creator (v1 character), set aside */
  {const a=gmSlots();a.push({id:'sv1test',at:Date.now()-3600000,run:{v:SAVE_V,t:Date.now()-3600000,pt:300,mode:'open',wv:OW_WV,ow:null,mapSeed:4242,wave:2,gold:120,lives:20,kills:1,bossKills:0,startWave:1,spellCd:{},towers:[],hero:{id:'pc',c:4,r:7,up:{},target:'first'},pc:{v:1,name:'Old Maren',body:1,head:1,hair:3,c1:2,c2:5},pcp:{lvl:3,xp:10,perks:{},pending:[]}}});lsSet(GM_SLOTS,a);}
  if(state!=='menu'){state='menu';gaardMenu();}
  gmShow();await sleep(200);
  const s0=snap();
  /* Play, the steps, Back */
  $('gmPlay').click();await sleep(300);const dlg=!$('gmDlg').hidden;ok(dlg||GM.view==='create','Play with an adventure in progress asks first (or opens the creator when there is none)');if(dlg)clickBtn('#gmDlgA button','Begin anew');await sleep(500);
  ok(GM.view==='create'&&!$('gmCreate').hidden,'Play opens the character creator, not a hero list');
  ok(!!$('gmPrevBox').querySelector('canvas'),'the preview of the character is drawn');
  const st=QA('#gmSteps button').map(b=>b.textContent.replace(/\d/g,'').trim());
  ok(same(st,['Gender','Name','Head','Hair','Clothing','Accessory','Confirm']),'seven steps in the order of the brief: '+st.join(', '));
  ok(GMC.step===0&&!Q('.gm-step[data-step="gender"]').hidden&&QA('#gmOptGender button').length===2,'the creator opens on Gender (Male, Female)');
  /* gender: the sets of each gender come from the items' g, and the creator shows exactly those */
  const cats=['head','hair','top1','top2','bottoms','shoes','acc'],cnt=g=>Object.fromEntries(cats.map(k=>[k,pcFor(k,g).length]));const cm=cnt('m'),cf=cnt('f');
  ok(cm.head>=4&&cf.head>=4&&cm.hair>=5&&cf.hair>=5&&cm.top1>=5&&cf.top1>=5&&cm.top2>=6&&cm.bottoms>=4&&cf.bottoms>=5&&cm.shoes>=3&&cm.acc>=8&&PCX.top2[0].id==='none'&&PCX.acc[0].id==='none','each gender has its own set ('+JSON.stringify(cm)+' / '+JSON.stringify(cf)+'), Top 2 and Accessory start with None');
  ok(pcFor('head','m').every(h=>h.g==='m')&&pcFor('head','f').every(h=>h.g==='f')&&!pcFor('hair','m').some(h=>h.id==='bun'||h.id==='pixie')&&!pcFor('hair','f').some(h=>h.id==='crop'||h.id==='bald')&&!pcFor('bottoms','m').some(b=>/skirt/.test(b.id))&&!pcFor('top1','m').some(t=>t.id==='blouse'),'heads are gender-specific; gender-specific hair, skirts and the blouse are kept to their gender; unisex items stay for both');
  const shown=()=>Object.fromEntries(cats.map(k=>[k,QA('#gmCreate button.gm-th[data-k="'+k+'"]').filter(b=>!b.hidden).map(b=>b.dataset.v)]));
  pick('gender','m');await sleep(60);let sh=shown();ok(cats.every(k=>JSON.stringify(sh[k])===JSON.stringify(pcFor(k,'m').map(o=>o.id))),'for him the creator shows exactly the male and unisex items, with a picture each');
  pick('gender','f');await sleep(60);sh=shown();ok(cats.every(k=>JSON.stringify(sh[k])===JSON.stringify(pcFor(k,'f').map(o=>o.id))),'for her the creator shows exactly the female and unisex items');
  pick('gender','m');await sleep(60);
  /* the pictures of a step are drawn */
  step(4);await sleep(100);gmPicsRun(20000);const imgs=QA('.gm-step[data-step="clothes"] button.gm-th').filter(b=>!b.hidden).map(b=>b.querySelector('img'));
  ok(imgs.length>=18&&imgs.every(i=>/^data:image\/png/.test(i.getAttribute('src'))&&!i.classList.contains('gm-ph0')),'the clothing step shows a picture of every garment ('+imgs.length+')');
  /* Randomize, Reset */
  $('gmRand').click();await sleep(100);const rc=JSON.stringify(pcClean(GMC.cfg));ok(GM.view==='create'&&$('gmName').value.length>=2&&rc===JSON.stringify(GMC.cfg),'Randomize gives a valid look and fills an empty name');
  $('gmReset').click();await sleep(100);ok(same(Object.assign({},GMC.cfg,{name:''}),Object.assign(pcDefaults(GMC.cfg.gender,''),{name:''})),'Reset gives the default look of the chosen gender');
  step(0);pick('gender','m');step(3);pick('hair','swept');step(4);pick('bottoms','loose');step(0);pick('gender','f');await sleep(60);
  ok(GMC.cfg.gender==='f'&&pcFits(pcItem('hair',GMC.cfg.hair),'f')&&pcFits(pcItem('head',GMC.cfg.head),'f')&&GMC.cfg.bottoms==='loose','changing to Female replaces what does not fit her (hair, head) and keeps the rest');
  step(3);let arrowsOk=true;for(let i=0;i<14;i++){Q('#gmCreate button[data-pn="hair"][data-d="1"]').click();if(!pcFits(pcItem('hair',GMC.cfg.hair),'f'))arrowsOk=false;}ok(arrowsOk,'the arrows only go through her hairstyles');
  $('gmCrBack').click();await sleep(300);ok(GM.view==='main'&&same(snap(),s0),'Back returns to the menu and the saves are exactly as they were');
  /* a bad name */
  await openCreator();step(1);await sleep(100);
  $('gmName').value='';$('gmCrNext').click();ok($('gmNameErr').textContent.length>0&&GMC.step===1,'an empty name is refused with a message (Next stays on Name)');
  $('gmName').value='R2-D2!!';$('gmName').dispatchEvent(new Event('input'));step(6);await sleep(100);$('gmCreateGo').click();ok($('gmNameErr').textContent.length>0&&GMC.step===1&&same(snap(),s0),'a name with strange characters is refused at Create (back on Name) and nothing is saved');
  /* the forging fails */
  const bm=buildMap;buildMap=function(){throw new Error('test: forging fails');};
  $('gmName').value='Thessaly';$('gmName').dispatchEvent(new Event('input'));step(6);await sleep(80);$('gmCreateGo').click();await sleep(900);buildMap=bm;
  ok(!GM.busy&&same(snap(),s0),'when the realm cannot be forged the saves are untouched and the menu is usable again');
  if(GM.view!=='create')await openCreator();
  /* a character made through the buttons: female, the two layers combined (a white undershirt under an open jacket), every category set */
  step(0);await sleep(60);pick('gender','f');
  step(1);await sleep(60);$('gmName').value='Thessaly Vane';$('gmName').dispatchEvent(new Event('input'));$('gmCrNext').click();await sleep(60);ok(GMC.step===2,'a good name lets Next go on to Head');
  pick('head','f_heart');pick('skin',4);$('gmCrNext').click();await sleep(60);
  Q('#gmCreate button[data-pn="hair"][data-d="1"]').click();pick('hair','braid');pick('hairC',5);$('gmCrNext').click();await sleep(60);
  pick('top1','undershirt');pick('top1C',1);pick('top2','jacket');pick('top2C',3);pick('bottoms','skirt');pick('botC',8);pick('shoes','tallboots');pick('shoeC',4);
  const m1=pcStage().model,cs=colours(m1);
  ok(near(cs,PCX_CLOTH[1].c)&&near(cs,PCX_CLOTH[3].c),'the preview wears both layers at once: the white undershirt and the leather jacket over it');
  const pr1=m1.userData.pcRig;ok(!!(pr1&&pr1.springs.length>=8&&pr1.springs.some(sp=>/^sk/.test(sp.links[0].b.name))),'the skirt hangs from its chains of spring bones (they follow the legs)');
  $('gmCrNext').click();await sleep(60);pick('acc','circlet');$('gmCrNext').click();await sleep(60);
  ok(GMC.step===6&&!$('gmCreateGo').hidden&&/Thessaly Vane/.test($('gmSum').textContent)&&/Undershirt/.test($('gmSum').textContent)&&/Open jacket/.test($('gmSum').textContent),'Confirm shows the summary with both layers and Create Character');
  const want={v:2,name:'Thessaly Vane',gender:'f',head:'f_heart',skin:4,hair:'braid',hairC:5,top1:'undershirt',top1C:1,top2:'jacket',top2C:3,bottoms:'skirt',botC:8,shoes:'tallboots',shoeC:4,acc:'circlet'};
  ok(same(pcClean(Object.assign({},GMC.cfg,{name:'Thessaly Vane'})),want),'the configuration holds every choice');
  $('gmCreateGo').click();
  const playing=await waitState('playing',60);await sleep(500);
  ok(playing&&meta.equipped==='pc'&&heroU&&heroU.hero==='pc','Create Character starts the game with the new character as the hero');
  ok(same(PC,want)&&heroU.mdl&&near(colours(heroU.mdl),PCX_CLOTH[1].c)&&near(colours(heroU.mdl),PCX_CLOTH[3].c),'the hero in the world is the character as made (both layers on the walking model)');
  ok(!!(heroU.rig&&heroU.rig.legs&&heroU.rig.ctl&&heroU.rig.R&&heroU.rig.L&&heroU.mdl.userData.pcRig.skin.meshes.length>3),'the walking model has its rig (skinned on its skeleton, the animation controller, arms and legs)');
  const s1=snap();ok(s1.run&&s1.run.pc==='Thessaly Vane'&&s1.run.hero==='pc','the new save holds the character');
  ok(same(lsGet(KR).pc,want),'the save holds every field of the look');
  ok(s0.run?s1.slots.includes(s0.run.seed):true,'the adventure that was in progress is set aside, not deleted ('+(s0.run?s0.run.seed:'-')+' is in the list)');
  ok(s1.slots.length>=s0.slots.length+(s0.run?1:0),'no other save was lost ('+s0.slots.length+' + 1 = '+s1.slots.length+')');
  const newSeed=s1.run&&s1.run.seed;
  /* Quit, Load */
  $('bQuit').click();await sleep(600);ok(state==='menu','Quit goes back to the menu');
  $('gmLoadBtn').click();await sleep(400);const items=QA('#gmList .gm-save').map(e=>e.innerText.replace(/\s+/g,' '));
  ok(/Thessaly Vane/.test(items[0]||''),'Load lists the new save first with the name of the character ('+(items[0]||'').slice(0,70)+')');
  const older=items.findIndex((t,i)=>i>0&&/Robin/.test(t));
  if(older>=0){QA('#gmList .gm-save-main')[older].click();ok(await waitState('playing',60),'an older save of a premade hero loads');await sleep(500);ok(meta.equipped==='robin'&&heroU&&heroU.hero==='robin','and keeps its hero (compatibility): nothing is converted');
    $('bQuit').click();await sleep(600);$('gmLoadBtn').click();await sleep(400);}
  const v1=QA('#gmList .gm-save').findIndex(e=>/Old Maren/.test(e.innerText));
  if(v1>=0){QA('#gmList .gm-save-main')[v1].click();ok(await waitState('playing',60),'a save of the first creator (v1) loads');await sleep(500);
    ok(PC.v===2&&PC.name==='Old Maren'&&PC.gender==='f'&&PC.top2==='cloak'&&PC.acc==='circlet'&&heroU.hero==='pc'&&hs('pc').lvl===3,'its character is converted to the new look (name, gender, cloak, circlet, level kept): '+JSON.stringify(PC));
    $('bQuit').click();await sleep(600);$('gmLoadBtn').click();await sleep(400);}
  else ok(false,'the v1 save is in the list');
  const idx=QA('#gmList .gm-save').findIndex(e=>/Thessaly Vane/.test(e.innerText));
  if(idx>=0){QA('#gmList .gm-save-main')[idx].click();ok(await waitState('playing',60),'the new save loads');await sleep(500);
    ok(same(PC,want)&&meta.equipped==='pc'&&heroU&&heroU.hero==='pc','with the character exactly as it was made (all fifteen fields)');
    ok(MAP.seed===newSeed,'in the same world (the seed of the save, not a new one)');}
  else ok(false,'the new save is in the list');
  /* the rules hold outside the creator too: a save with items of the other gender, old head ids, randomize, the arrows */
  const gx1=pcClean({v:2,name:'Mara',gender:'f',head:'m_chisel',hair:'crop',top1:'blouse',bottoms:'skirt',skin:3,top2:'coat',acc:'circlet'});ok(gx1.head==='f_classic'&&gx1.hair===PCX_DEF.f.hair&&gx1.top1==='blouse'&&gx1.bottoms==='skirt'&&gx1.skin===3&&gx1.top2==='coat'&&gx1.acc==='circlet'&&gx1.name==='Mara','a female save with male items gets female defaults for those fields only (the rest is kept)');
  const gx2=pcClean({v:2,name:'Bran',gender:'m',head:'f_heart',hair:'bun',top1:'blouse',bottoms:'longskirt',skin:2});ok(gx2.head==='m_classic'&&gx2.hair==='crop'&&gx2.top1==='shirt'&&gx2.bottoms==='trousers'&&gx2.skin===2,'a male save with female items gets male defaults for those fields');
  ok(pcClean({gender:'m',head:'square'}).head==='m_chisel'&&pcClean({gender:'f',head:'heart'}).head==='f_heart'&&pcClean({gender:'f',head:'round'}).head==='f_round','the heads of the old catalogue become the nearest head of the gender');
  let rnd=true;for(let i=0;i<60;i++){const g=i%2?'f':'m',c=pcRandom(g,'');for(const k of cats)if(!pcFits(pcItem(k,c[k]),g))rnd=false;}ok(rnd,'Randomize only ever picks items of the chosen gender (60 tries)');
  {const run=lsGet(KR);run.pc=Object.assign({},run.pc,{hair:'bun',bottoms:'skirt',gender:'m'});lsSet(KR,run);$('bQuit').click();await sleep(600);$('gmLoadBtn').click();await sleep(400);const i2=QA('#gmList .gm-save').findIndex(e=>/Thessaly Vane/.test(e.innerText));
    if(i2>=0){QA('#gmList .gm-save-main')[i2].click();await waitState('playing',60);await sleep(400);ok(PC.gender==='m'&&PC.hair==='crop'&&PC.bottoms==='trousers'&&PC.name==='Thessaly Vane'&&PC.top2==='jacket','a loaded save with items of the other gender is repaired field by field ('+PC.hair+', '+PC.bottoms+')');}
    else ok(false,'the edited save is in the list');}
  /* broken looks fall back to defaults */
  const bad=pcClean({v:2,name:'X',gender:'q',head:'cube',skin:99,hair:7,top1:'mail',top2C:-3,acc:{}});ok(bad.name==='Wanderer'&&bad.gender==='m'&&bad.head==='m_classic'&&bad.skin===PCX_DEF.m.skin&&bad.hair==='crop'&&bad.top1==='shirt'&&bad.acc==='none','a damaged look falls back to the defaults field by field');
  /* the damaged entry, if there is one, is shown as damaged and cannot be started */
  $('bQuit').click();await sleep(600);$('gmLoadBtn').click();await sleep(300);const badE=QA('#gmList .gm-save.bad');
  if(badE.length){const b=badE[0].querySelector('.gm-save-main'),before=snap();b.click();await sleep(400);ok(state==='menu'&&same(snap(),before),'a damaged save does nothing when it is chosen, and nothing is lost');}
}catch(e){ok(false,'the flow raised '+e+' '+(e.stack||'').split('\n')[1]);}
finally{/* put the saves back as they were */for(const k of keys){if(bk[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,bk[k]);}try{meta=migrateMeta(lsGet(KM));PC=pcClean(meta.pc);if(state!=='menu'){state='menu';gaardMenu();}gmShow();}catch(e){}}
return JSON.stringify(R);})()
