/* ===================== Kingsgaard main menu (logic) =====================
   Play: the existing new-game flow (world forged by the existing generator, then the existing hub with heroes, scrolls and the start button).
   Load: the saves this game already has (the latest autosave) plus any adventure that was set aside, never saves of Kingsroad Keep.
   Settings: the existing settings window.
   Nothing here builds a world by itself, and nothing here touches storage keys of the other game. */
const GM={open:false,busy:false,view:'main',art:{nx:.6016,ny:.463,r:.07},fx:null};
const GM_SLOTS=GAME.key+'.slots';
const gmEl=id=>document.getElementById(id);
const gmEsc=v=>String(v==null?'':v).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c]);
const gmSlots=()=>{const a=lsGet(GM_SLOTS);return Array.isArray(a)?a:[];};
/* an adventure that is replaced is set aside here, never deleted */
function gmArchive(run){if(run==null)return;const a=gmSlots();a.unshift({id:'s'+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36),at:Date.now(),run});lsSet(GM_SLOTS,a);}

/* ---- describing a save ---- */
function gmRealm(seed){const A=['Ash','Frost','Raven','Stone','Ember','Thorn','Gloam','Silver','Iron','Wolf','Storm','Dusk'],B=['reach','vale','march','holm','fell','moor','gard','mere','wold','crag'];
  const h=(Math.imul((seed|0)^0x9e3779b9,2654435761)>>>0);return A[h%A.length]+B[(h>>>9)%B.length];}
function gmAgo(t){if(!t)return'';const s=Math.max(0,(Date.now()-t)/1000);if(s<90)return'just now';if(s<3600)return Math.round(s/60)+' minutes ago';if(s<86400){const h=Math.round(s/3600);return h+(h===1?' hour':' hours')+' ago';}
  if(s<172800)return'yesterday';try{return new Date(t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});}catch(e){return'';}}
function gmDur(sec){sec=sec|0;if(sec<60)return'';const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);return h?h+'h '+m+'m played':m+'m played';}
function gmInfo(run,kind,id,at){
  const it={kind,id,run,status:'ok',note:'',wave:0,hero:'',seed:0,found:null,gold:0,t:0,pt:0};
  if(!run||typeof run!=='object'||Array.isArray(run)){it.status='bad';it.note='This save is damaged and cannot be read.';return it;}
  let m=null;try{m=migrateRun(JSON.parse(JSON.stringify(run)));}catch(e){m=null;}
  if(!m){it.status='bad';it.note='This save is damaged and cannot be read.';return it;}
  it.wave=(m.wave|0)+1;it.seed=m.mapSeed|0;it.gold=m.gold|0;it.t=run.t||at||0;it.pt=run.pt|0;
  {const hid=m.hero&&m.hero.id,hb=hid&&HB[hid];it.hero=m.pc&&m.pc.name?pcClean(m.pc).name:(hb&&!hb.pc?hb.n:'');it.lvl=m.pcp&&m.pcp.lvl?m.pcp.lvl|0:0;}
  if(m.ow&&Array.isArray(m.ow.v))it.found=m.ow.v.filter(v=>v&&v.r).length;
  if(m.mode!=='open'){it.status='bad';it.note='This belongs to Kingsroad Keep and cannot be resumed here.';}
  else if(m.wv!==OW_WV){it.status='old';it.note='Made in an older, smaller world: it can no longer be resumed.';}
  return it;}

/* ---- the Load panel ---- */
function gmItems(){const L=[],cur=lsGet(KR);if(cur!=null)L.push(gmInfo(cur,'current','cur'));gmSlots().forEach(s=>L.push(gmInfo(s&&s.run,'slot',s&&s.id,s&&s.at)));return L;}
function gmRender(){const L=gmItems(),box=gmEl('gmList');
  if(!L.length){box.innerHTML='<div class="gm-empty"><p>No saved adventures yet.</p><small>When you begin an adventure it is kept here automatically, and you can return to it whenever you like.</small></div>';return;}
  box.innerHTML=L.map(it=>{const ok=it.status==='ok',tag=it.kind==='current'?'Latest':'Set aside';
    const bits=[];if(it.found!=null)bits.push(it.found+(it.found===1?' village':' villages')+' found');if(it.gold)bits.push(it.gold+' gold');const d=gmDur(it.pt);if(d)bits.push(d);const ago=gmAgo(it.t);if(ago)bits.push(ago);
    return '<div class="gm-save'+(ok?'':' bad')+'" role="listitem"><button class="gm-save-main" type="button" data-act="go" data-id="'+gmEsc(it.id)+'"'+(ok?'':' aria-disabled="true"')+'>'
      +'<span class="gm-save-top"><b>'+(it.wave?'Wave '+it.wave:'Unreadable save')+'</b><em>'+tag+'</em>'+(ok?'':'<em>'+(it.status==='old'?'Old world':'Unavailable')+'</em>')+'</span>'
      +(it.hero||it.seed?'<span class="gm-save-meta">'+gmEsc(it.hero||'Unknown hero')+(it.lvl?' &middot; Level '+it.lvl:'')+(it.seed?' &middot; Realm of '+gmRealm(it.seed):'')+'</span>':'')
      +'<span class="gm-save-meta"><small>'+(ok?gmEsc(bits.join(' '+String.fromCharCode(183)+' ')):gmEsc(it.note))+'</small></span></button>'
      +'<button class="gm-del" type="button" data-act="del" data-id="'+gmEsc(it.id)+'" aria-label="Delete this save" title="Delete this save">&times;</button></div>';}).join('');}
function gmFind(id){return gmItems().find(x=>String(x.id)===String(id));}

/* ---- small pieces: dialog, loading veil, views ---- */
function gmDialog(title,body,btns){return new Promise(res=>{const d=gmEl('gmDlg'),a=gmEl('gmDlgA'),prev=document.activeElement;gmEl('gmDlgT').textContent=title;gmEl('gmDlgP').textContent=body;a.innerHTML='';
  const kd=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done('x');}else if(e.key==='Tab'){const bs=[...a.querySelectorAll('button')];if(!bs.length)return;e.preventDefault();const i=bs.indexOf(document.activeElement);bs[(i+(e.shiftKey?-1:1)+bs.length)%bs.length].focus();}};
  const done=k=>{d.hidden=true;document.removeEventListener('keydown',kd,true);if(prev&&prev.focus&&document.contains(prev))prev.focus({preventScroll:true});res(k);};
  btns.filter(b=>b.show!==false).forEach(b=>{const x=document.createElement('button');x.type='button';x.className='gm-small';x.textContent=b.t;x.onclick=()=>done(b.k);if(b.main)x.dataset.main='1';a.appendChild(x);});
  d.hidden=false;document.addEventListener('keydown',kd,true);(a.querySelector('[data-main]')||a.querySelector('button')).focus({preventScroll:true});});}
function gmBusy(on,txt){GM.busy=on;gmEl('gmVeil').hidden=!on;if(txt)gmEl('gmVeilT').textContent=txt;['gmPlay','gmLoadBtn','gmSetBtn'].forEach(id=>{gmEl(id).disabled=on;});}
function gmView(v){const was=GM.view;GM.view=v;gmEl('gMenu').scrollLeft=0;gmEl('gMenu').scrollTop=0;const load=v==='load',cr=v==='create';gmEl('gmNav').hidden=load;gmEl('gmLoad').hidden=!load;gmEl('gmBody').hidden=cr;gmEl('gmCreate').hidden=!cr;
  gmEl('gMenu').classList.toggle('gm-sub',load);gmEl('gMenu').classList.toggle('gm-creating',cr);if(was==='create'&&!cr)gmCreateStop();
  if(cr)gmCreateStart();
  else if(load){gmRender();setTimeout(()=>{const f=gmEl('gmList').querySelector('.gm-save-main:not([aria-disabled])')||gmEl('gmBack');if(f)f.focus({preventScroll:true});},30);}
  else setTimeout(()=>{const b=gmEl('gmPlay');if(b&&!b.disabled)b.focus({preventScroll:true});},30);
  gmFxFit();}
function gmShow(){gmEl('gMenu').hidden=false;GM.open=true;gmBusy(false);gmEl('gmDlg').hidden=true;gmView('main');gmFxStart();}
function gmHide(){gmEl('gMenu').hidden=true;GM.open=false;gmFxStop();gmCreateStop();}
function gaardBoot(){state='menu';['home','pause','over'].forEach(k=>{$('#'+k).hidden=true;});gmShow();}
function gaardMenu(){state='menu';paused=false;['home','pause','over'].forEach(k=>{$('#'+k).hidden=true;});gmShow();}

/* ---- Play: the character creator, then the world ----
   Play opens the creator: seven steps (gender, name, head, hair, clothing, accessory, confirm) that can be taken in order with Back and Next or opened directly from the row of steps. Every option is shown as a picture of the character
   wearing it (drawn by the stage of the preview into a render target, pcSnap, a few per frame, cached), and the big figure on the right changes with every choice. The catalogue is src/pc.js (PCX): a new item there appears here.
   Nothing is saved or changed until Create Character is pressed: the realm is forged first, and only when that has worked is the adventure in progress (if there is one) set aside (never deleted: it stays in Load)
   and the new one begun with the character, which newGame writes into the save at once. Back, Escape and a failed forging leave every save as it was. */
const GMC={cfg:null,yaw:.5,drag:null,raf:0,on:false,last:0,step:0,touched:false,view:'auto',focus:null,cam:null,idle:0,built:false,thumbs:new Map(),queue:[]};
const gmHex=c=>'#'+('000000'+c.toString(16)).slice(-6);
const GM_STEPS=[{id:'gender',n:'Gender'},{id:'name',n:'Name'},{id:'head',n:'Head'},{id:'hair',n:'Hair'},{id:'clothes',n:'Clothing'},{id:'acc',n:'Accessory'},{id:'confirm',n:'Confirm'}];
/* how the pictures of the options frame the figure (the big preview has its own views, PCV) */
const GM_TV={full:{ty:.19,dist:.98,dais:1},head:{ty:.334,dist:.22},bust:{ty:.305,dist:.42},torso:{ty:.208,dist:.47},legs:{ty:.078,dist:.55},feet:{ty:.03,dist:.33}};
/* the categories: what they are called, their items (PCX) or palette, the colour that goes with an item, the view of the pictures, the step they belong to, and what is left off the figure in the pictures so that the item itself is seen */
const GM_CATS={
  head:{l:'Head shape',list:'head',grid:1,tv:'head',yaw:.42,pv:'head',strip:c=>({acc:'none'})},
  skin:{l:'Skin tone',pal:PCX_SKIN},
  hair:{l:'Hairstyle',list:'hair',grid:1,tv:'head',yaw:.85,pv:'head',strip:c=>({acc:'none'})},
  hairC:{l:'Hair colour',pal:PCX_HAIRC},
  top1:{l:'Top 1',sub:'base layer',list:'top1',col:'top1C',tv:'torso',yaw:.45,pv:'torso',strip:c=>({top2:'none',acc:c.acc==='scarf'||c.acc==='pendant'?'none':c.acc})},
  top2:{l:'Top 2',sub:'worn over it',list:'top2',col:'top2C',tv:'torso',yaw:.45,pv:'torso',strip:c=>({acc:c.acc==='scarf'||c.acc==='pendant'?'none':c.acc})},
  bottoms:{l:'Bottoms',list:'bottoms',col:'botC',tv:'legs',yaw:.45,pv:'legs',strip:c=>({top2:c.top2==='coat'?'none':c.top2,top1:c.top1==='tunic'?'shirt':c.top1})},
  shoes:{l:'Shoes',list:'shoes',col:'shoeC',tv:'feet',yaw:.6,pv:'feet',strip:c=>({})},
  acc:{l:'Accessory',sub:'one',list:'acc',grid:1,tv:'bust',yaw:.5,pv:'bust',strip:c=>({})}};
const GM_STEP_CATS={head:['head','skin'],hair:['hair','hairC'],clothes:['top1','top2','bottoms','shoes'],acc:['acc']};
const gmHash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return'k'+(h>>>0).toString(36)+s.length;};
const GM_BLANK='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
/* the picture of a configuration: from the cache, or queued (drawn in gmCreateLoop) */
function gmPic(img,cfg,tv,yaw){const c=Object.assign({},cfg,{name:'',_nokit:tv!=='full'}),key=gmHash(JSON.stringify(c)+tv+yaw);img.dataset.tk=key;const hit=GMC.thumbs.get(key);
  if(hit){if(img.getAttribute('src')!==hit)img.src=hit;img.classList.remove('gm-ph0');return;}
  img.src=GM_BLANK;img.classList.add('gm-ph0');if(!GMC.queue.some(j=>j.key===key))GMC.queue.push({key,cfg:c,tv,yaw});}
function gmPicsRun(budget){const t0=performance.now();let n=0;
  while(GMC.queue.length&&(n===0||performance.now()-t0<budget)){const j=GMC.queue.shift();n++;let url='';try{url=pcSnap(j.cfg,GM_TV[j.tv],j.tv==='full'?256:160,j.yaw);}catch(e){console.error(e);continue;}
    GMC.thumbs.set(j.key,url);if(GMC.thumbs.size>360)GMC.thumbs.delete(GMC.thumbs.keys().next().value);
    for(const im of gmEl('gmCreate').querySelectorAll('img[data-tk="'+j.key+'"]')){im.src=url;im.classList.remove('gm-ph0');}}}
/* the creator's controls are built once; gmSync brings them up to date after every change (so strips keep their scroll and focus stays where it was) */
function gmBuild(){if(GMC.built)return;GMC.built=true;
  gmEl('gmSteps').innerHTML=GM_STEPS.map((s,i)=>'<li><button type="button" data-goto="'+i+'" aria-label="Step '+(i+1)+': '+s.n+'"><i>'+(i+1)+'</i><span>'+s.n+'</span></button></li>').join('');
  gmEl('gmOptGender').innerHTML=PCX.gender.map(o=>'<button type="button" class="gm-th" role="radio" data-k="gender" data-v="'+o.id+'"><img alt="" src="'+GM_BLANK+'"><span>'+gmEsc(o.n)+'</span></button>').join('');
  for(const el of gmEl('gmCreate').querySelectorAll('.gm-cat')){const k=el.dataset.cat,C=GM_CATS[k];let h='';
    if(C.pal){h='<span class="gm-lbl">'+C.l+' <em data-nm="'+k+'"></em></span><div class="gm-sw" role="radiogroup" aria-label="'+C.l+'">'+C.pal.map((o,i)=>'<button type="button" role="radio" aria-label="'+gmEsc(o.n)+'" title="'+gmEsc(o.n)+'" data-k="'+k+'" data-i="'+i+'" style="--c:'+gmHex(o.c)+'"></button>').join('')+'</div>';}
    else{const items=PCX[C.list],th=o=>'<button type="button" class="gm-th" role="radio" data-k="'+k+'" data-v="'+o.id+'" aria-label="'+gmEsc(o.n)+'"><img alt="" src="'+GM_BLANK+'"><span>'+gmEsc(o.n)+'</span></button>';
      h='<div class="gm-cat-h"><span class="gm-lbl">'+C.l+(C.sub?' <em>'+C.sub+'</em>':'')+'</span><div class="gm-pn"><button type="button" data-pn="'+k+'" data-d="-1" aria-label="Previous '+C.l+'">&lsaquo;</button><b data-nm="'+k+'"></b><button type="button" data-pn="'+k+'" data-d="1" aria-label="Next '+C.l+'">&rsaquo;</button></div></div>';
      h+='<div class="'+(C.grid?'gm-grid':'gm-strip')+'" role="radiogroup" aria-label="'+C.l+'">'+items.map(th).join('')+'</div>';
      h+='<p class="gm-hint" data-ht="'+k+'"></p>';
      if(C.col)h+='<div class="gm-sw" data-colrow="'+k+'" role="radiogroup" aria-label="Colour of '+C.l+'">'+PCX_CLOTH.map((o,i)=>'<button type="button" role="radio" aria-label="'+gmEsc(o.n)+'" title="'+gmEsc(o.n)+'" data-k="'+C.col+'" data-i="'+i+'" style="--c:'+gmHex(o.c)+'"></button>').join('')+'</div>';}
    el.innerHTML=h;}}
/* the items of a category that fit the chosen gender (an item's g): the others are not shown and cannot be chosen */
function gmCatItems(k){return pcFor(GM_CATS[k].list,GMC.cfg.gender);}
function gmSync(){const c=GMC.cfg,root=gmEl('gmCreate'),st=GM_STEPS[GMC.step].id;
  for(const b of root.querySelectorAll('.gm-cat button.gm-th[data-v]')){const C=GM_CATS[b.dataset.k];b.hidden=!!(C&&C.list&&!pcFits(pcItem(C.list,b.dataset.v),c.gender));}
  for(const b of root.querySelectorAll('button[data-k]')){const k=b.dataset.k,on=b.dataset.v!=null?c[k]===b.dataset.v:c[k]===+b.dataset.i;b.setAttribute('aria-checked',on?'true':'false');b.tabIndex=on?0:-1;}
  for(const e of root.querySelectorAll('[data-nm]')){const k=e.dataset.nm,C=GM_CATS[k];e.textContent=C.pal?C.pal[c[k]].n:pcItem(C.list,c[k]).n;}
  for(const e of root.querySelectorAll('[data-ht]')){const k=e.dataset.ht,C=GM_CATS[k],it=pcItem(C.list,c[k]);e.textContent=k==='head'?it.d:k==='hair'?'Fitted to every head shape, with a natural hairline; a hat or a hood covers what it would hide.':it.d||'';}
  for(const e of root.querySelectorAll('[data-colrow]'))e.hidden=e.dataset.colrow==='top2'&&c.top2==='none';
  for(const b of gmEl('gmSteps').querySelectorAll('button')){const i=+b.dataset.goto;if(i===GMC.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');b.classList.toggle('done',i<GMC.step);}
  for(const s of root.querySelectorAll('.gm-step'))s.hidden=s.dataset.step!==st;
  gmEl('gmCrPrev').disabled=GMC.step===0;gmEl('gmCrNext').hidden=st==='confirm';gmEl('gmCreateGo').hidden=st!=='confirm';
  /* pictures of what this step shows */
  GMC.queue.length=0;
  if(st==='gender')for(const b of gmEl('gmOptGender').children)gmPic(b.querySelector('img'),gmGenderCfg(b.dataset.v),'full',.45);
  for(const k of GM_STEP_CATS[st]||[]){const C=GM_CATS[k];if(C.pal)continue;const base=Object.assign({},c,C.strip(c));
    for(const b of root.querySelectorAll('.gm-cat[data-cat="'+k+'"] button.gm-th'))if(!b.hidden)gmPic(b.querySelector('img'),Object.assign({},base,{[k]:b.dataset.v}),C.tv,C.yaw);}
  if(st==='confirm')gmSummary();
  gmViews();gmEl('gmPrevName').textContent=pcName(gmEl('gmName').value).name||'';
  try{pcStageSet(c);}catch(e){console.error(e);}}
/* the look the other gender would have: its defaults while nothing was chosen yet, otherwise the same choices on the other build */
function gmGenderCfg(g){return GMC.touched?pcClean(Object.assign({},GMC.cfg,{gender:g})):pcDefaults(g,'');}
function gmSummary(){const c=GMC.cfg,nm=pcName(gmEl('gmName').value),it=(k)=>pcItem(GM_CATS[k].list,c[k]).n,sw=(pal,i)=>'<i style="--c:'+gmHex(pal[i].c)+'"></i>';
  const rows=[['Gender',PCX_IDX.gender[c.gender].n,0],['Name',nm.ok?gmEsc(nm.name):'<span style="color:#e8a095">Not chosen yet</span>',1],['Head',it('head')+' '+sw(PCX_SKIN,c.skin)+PCX_SKIN[c.skin].n,2],['Hair',it('hair')+(c.hair==='bald'?'':' '+sw(PCX_HAIRC,c.hairC)+PCX_HAIRC[c.hairC].n),3],
    ['Top 1',sw(PCX_CLOTH,c.top1C)+it('top1'),4],['Top 2',c.top2==='none'?'None':sw(PCX_CLOTH,c.top2C)+it('top2'),4],['Bottoms',sw(PCX_CLOTH,c.botC)+it('bottoms'),4],['Shoes',sw(PCX_CLOTH,c.shoeC)+it('shoes'),4],['Accessory',it('acc'),5]];
  gmEl('gmSum').innerHTML=rows.map(r=>'<dt>'+r[0]+'</dt><dd>'+r[1]+'</dd><button type="button" class="gm-edit" data-goto="'+r[2]+'" aria-label="Change '+r[0]+'">Change</button>').join('');}
/* the views of the big preview: the whole figure, or a close view of what the step (or the last category touched) is about */
function gmCloseView(){const st=GM_STEPS[GMC.step].id;if(GMC.focus&&GM_CATS[GMC.focus]&&GM_CATS[GMC.focus].pv)return GMC.focus&&GM_STEP_CATS[st]&&GM_STEP_CATS[st].includes(GMC.focus)?GM_CATS[GMC.focus].pv:'torso';
  return st==='head'||st==='hair'?'head':st==='acc'?'bust':'torso';}
function gmViewMode(){if(GMC.view!=='auto')return GMC.view;const st=GM_STEPS[GMC.step].id;return st==='head'||st==='hair'||st==='acc'?'close':'full';}
function gmViews(){const m=gmViewMode();for(const b of gmEl('gmViews').children)b.setAttribute('aria-checked',b.dataset.view===m?'true':'false');}
function gmTargetView(){return gmViewMode()==='full'?PCV.full:PCV[gmCloseView()];}
function gmNameErr(msg){const f=gmEl('gmName');gmEl('gmNameErr').textContent=msg||'';if(msg)f.setAttribute('aria-invalid','true');else f.removeAttribute('aria-invalid');}
function gmStep(i,focus){i=Math.max(0,Math.min(GM_STEPS.length-1,i));GMC.step=i;GMC.view='auto';GMC.focus=null;gmSync();gmEl('gmCrScroll').scrollTop=0;
  if(focus!==false){const st=GM_STEPS[i].id;setTimeout(()=>{if(GM.view!=='create')return;const t=st==='name'?gmEl('gmName'):gmEl('gmCreate').querySelector('.gm-step[data-step="'+st+'"] [aria-checked="true"]')||(st==='confirm'?gmEl('gmCreateGo'):null);if(t)t.focus({preventScroll:true});},30);}}
function gmNext(){const st=GM_STEPS[GMC.step].id;if(st==='name'){const nm=pcName(gmEl('gmName').value);if(!nm.ok){gmNameErr(nm.msg);gmEl('gmName').focus();return;}}gmStep(GMC.step+1);}
function gmSet(k,v){const c=GMC.cfg;if(k==='gender'){GMC.cfg=GMC.touched?pcClean(Object.assign({},c,{gender:v})):pcDefaults(v,'');}else{c[k]=v;GMC.cfg=pcClean(c);GMC.touched=true;}
  const base=k.replace(/C$/,'').replace(/^botC$/,'bottoms');GMC.focus=k==='botC'?'bottoms':k==='shoeC'?'shoes':GM_CATS[k]?k:GM_CATS[base]?base:null;gmSync();}
function gmCreateStart(){gmBuild();GMC.on=true;GMC.touched=false;GMC.cfg=pcDefaults('m','');gmEl('gmName').value='';gmNameErr('');
  const box=gmEl('gmPrevBox'),S=pcStage();if(S.cv.parentNode!==box){box.innerHTML='';box.appendChild(S.cv);}
  GMC.yaw=.5;GMC.drag=null;GMC.cam=null;GMC.idle=0;gmStep(0);GMC.last=performance.now();cancelAnimationFrame(GMC.raf);GMC.raf=requestAnimationFrame(gmCreateLoop);}
function gmCreateStop(){GMC.on=false;cancelAnimationFrame(GMC.raf);GMC.queue.length=0;}
function gmCreateLoop(now){if(!GMC.on)return;GMC.raf=requestAnimationFrame(gmCreateLoop);if(document.hidden)return;const dt=Math.min(.05,(now-GMC.last)/1000);GMC.last=now;
  GMC.idle+=dt;if(!GMC.drag&&GMC.idle>2.5)GMC.yaw+=dt*.4;
  const T=gmTargetView();if(!GMC.cam)GMC.cam={ty:T.ty,dist:T.dist};const k=1-Math.exp(-dt*7);GMC.cam.ty+=(T.ty-GMC.cam.ty)*k;GMC.cam.dist+=(T.dist-GMC.cam.dist)*k;
  const r=gmEl('gmPrevBox').getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  if(r.width>=8&&r.height>=8){try{pcStageDraw(r.width*dpr,r.height*dpr,GMC.yaw,GMC.cam,dt);}catch(e){}}
  if(GMC.queue.length)gmPicsRun(10);}
gmEl('gmCreate').addEventListener('click',e=>{if(GM.busy)return;
  const g=e.target.closest('[data-goto]');if(g){gmStep(+g.dataset.goto);return;}
  const pn=e.target.closest('button[data-pn]');if(pn){const k=pn.dataset.pn,L=gmCatItems(k),i=L.findIndex(o=>o.id===GMC.cfg[k]),n=L[(i+(+pn.dataset.d)+L.length)%L.length];gmSet(k,n.id);
    const sel=gmEl('gmCreate').querySelector('.gm-cat[data-cat="'+k+'"] button[data-v="'+n.id+'"]');if(sel)sel.scrollIntoView({block:'nearest',inline:'nearest'});return;}
  const b=e.target.closest('button[data-k]');if(!b||b.disabled)return;gmSet(b.dataset.k,b.dataset.v!=null?b.dataset.v:+b.dataset.i);b.focus({preventScroll:true});});
/* the arrow keys move through the items of a category */
gmEl('gmCreate').addEventListener('keydown',e=>{const b=e.target.closest&&e.target.closest('button[data-k]');if(!b||!/^Arrow(Left|Right|Up|Down)$/.test(e.key))return;
  const grp=[...b.parentNode.querySelectorAll('button[data-k="'+b.dataset.k+'"]')].filter(x=>!x.hidden);
  const i=grp.indexOf(b),d=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1,n=grp[(i+d+grp.length)%grp.length];if(!n)return;e.preventDefault();e.stopPropagation();n.click();n.focus({preventScroll:false});});
gmEl('gmViews').addEventListener('click',e=>{const b=e.target.closest('button[data-view]');if(!b)return;GMC.view=b.dataset.view;gmViews();});
gmEl('gmName').addEventListener('input',()=>{gmNameErr('');gmEl('gmPrevName').textContent=pcName(gmEl('gmName').value).name||'';});
gmEl('gmName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();gmNext();}});
const gmRandName=()=>{const L=PC_NAMES[GMC.cfg.gender==='f'?'f':'m'];return L[Math.floor(Math.random()*L.length)];};
gmEl('gmNameDice').addEventListener('click',()=>{gmEl('gmName').value=gmRandName();gmNameErr('');gmEl('gmPrevName').textContent=gmEl('gmName').value;});
gmEl('gmRand').addEventListener('click',()=>{if(GM.busy)return;GMC.cfg=pcRandom(GMC.cfg.gender,'');GMC.touched=true;if(!gmEl('gmName').value.trim()){gmEl('gmName').value=gmRandName();gmNameErr('');}GMC.focus=null;gmSync();});
gmEl('gmReset').addEventListener('click',()=>{if(GM.busy)return;GMC.cfg=pcDefaults(GMC.cfg.gender,'');GMC.touched=false;GMC.focus=null;gmSync();});
gmEl('gmCrPrev').addEventListener('click',()=>{if(!GM.busy)gmStep(GMC.step-1);});
gmEl('gmCrNext').addEventListener('click',()=>{if(!GM.busy)gmNext();});
gmEl('gmCrBack').addEventListener('click',()=>{if(!GM.busy)gmView('main');});
gmEl('gmCreateGo').addEventListener('click',gmCreateGo);
(function(){const box=gmEl('gmPrevBox');let px=0;box.addEventListener('pointerdown',e=>{GMC.drag=e.pointerId;px=e.clientX;GMC.idle=0;try{box.setPointerCapture(e.pointerId);}catch(_){}});
  box.addEventListener('pointermove',e=>{if(GMC.drag!==e.pointerId)return;GMC.yaw+=(e.clientX-px)*.011;px=e.clientX;GMC.idle=0;});
  const up=e=>{if(GMC.drag===e.pointerId)GMC.drag=null;};box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);})();
function gmCreateGo(){if(GM.busy)return;const nm=pcName(gmEl('gmName').value);if(!nm.ok){gmStep(1,false);gmNameErr(nm.msg);gmEl('gmName').focus();return;}
  gmStartNew(pcClean(Object.assign({},GMC.cfg,{name:nm.name})));}
function gmStartNew(cfg){gmBusy(true,'Forging the realm');
  setTimeout(()=>{let ok=false;try{meta.world='open';buildMap(Math.floor(Math.random()*1e9));MAP.fresh=true;ok=true;}catch(e){console.error(e);}
    if(!ok){gmBusy(false);toast('The realm could not be forged. Your saves are untouched.','bad');return;}
    try{const prev=lsGet(KR);if(prev!=null){gmArchive(prev);lsSet(KR,null);}pcBegin(cfg);gmHide();gmCreateStop();newGame(1);gmBusy(false);}
    catch(e){console.error(e);gmBusy(false);gmShow();gmView('create');toast('The adventure could not begin. Any adventure you had is in Load.','bad');}},80);}
async function gmPlay(){if(GM.busy)return;const cur=lsGet(KR);
  if(cur!=null){const it=gmInfo(cur,'current','cur');
    const ch=await gmDialog('Begin a new adventure?','You have an adventure in progress'+(it.wave?' (wave '+it.wave+')':'')+'. It will not be lost: beginning anew sets it aside, and you can return to it at any time from Load.',
      [{k:'x',t:'Cancel'},{k:'c',t:'Continue it',show:it.status==='ok'},{k:'n',t:'Begin anew',main:it.status!=='ok'}]);
    if(ch==='c')return gmContinue(it);if(ch!=='n')return;}
  gmView('create');}

/* ---- Load: continue a save ---- */
function gmContinue(it){if(GM.busy||!it||it.status!=='ok')return;
  if(it.kind==='slot'){const cur=lsGet(KR);if(cur!=null)gmArchive(cur);lsSet(GM_SLOTS,gmSlots().filter(s=>String(s.id)!==String(it.id)));lsSet(KR,it.run);}
  gmBusy(true,'Returning to the realm');
  setTimeout(()=>{let ok=false;try{const r=lsGet(KR);gmHide();loadRun(r);ok=state==='playing';}catch(e){console.error(e);}
    gmBusy(false);if(!ok){gmShow();toast('That adventure could not be resumed','bad');}},80);}
async function gmDelete(it){if(!it)return;
  const ch=await gmDialog('Delete this save?','This adventure will be removed from this device for good.',[{k:'x',t:'Keep it'},{k:'d',t:'Delete',main:false}]);
  if(ch!=='d')return;if(it.kind==='current')lsSet(KR,null);else lsSet(GM_SLOTS,gmSlots().filter(s=>String(s.id)!==String(it.id)));gmRender();}
gmEl('gmList').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const it=gmFind(b.dataset.id);if(b.dataset.act==='go')gmContinue(it);else gmDelete(it);});

/* ---- Load: import a save code (for example from Kingsroad Keep). Replaces heroes and spells, never settings, and sets the current adventure aside ---- */
async function gmImport(){const raw=gmEl('gmCode').value.trim(),msg=gmEl('gmImpMsg');let o;
  try{if(raw.slice(0,4)!=='KK1:')throw 0;o=JSON.parse(decodeURIComponent(escape(atob(raw.slice(4)))));if(!o||typeof o!=='object'||!o.meta||typeof o.meta!=='object')throw 0;}
  catch(e){msg.textContent='That code did not work. Copy the whole code, starting with KK1:';return;}
  const ch=await gmDialog('Import this save code?','The heroes, spells and progress in the code replace those of this game. Your settings stay as they are, and any adventure in progress is set aside, not deleted.',[{k:'x',t:'Cancel'},{k:'y',t:'Import',main:true}]);
  if(ch!=='y')return;
  const cur=lsGet(KR);if(cur!=null){gmArchive(cur);lsSet(KR,null);}
  const keep={};['shadows','banners','shake','sfx','fov','rd','sd','sens','fol','keys'].forEach(k=>{if(meta[k]!==undefined)keep[k]=meta[k];});
  meta=migrateMeta(o.meta);['shadows','banners','shake','sfx','fov','rd','sd','sens','fol','keys'].forEach(k=>{if(keep[k]===undefined)delete meta[k];else meta[k]=keep[k];});meta.world='open';saveMeta();refreshTorder();
  const run=routeRun(migrateRun(o.run));if(run)lsSet(KR,run);
  try{applyShadows();}catch(e){}
  msg.textContent='Imported.'+(run?' Your adventure is waiting in the list.':'');gmEl('gmCode').value='';gmRender();}
gmEl('gmImpBtn').addEventListener('click',gmImport);

/* ---- buttons and keys ---- */
gmEl('gmPlay').addEventListener('click',gmPlay);
gmEl('gmLoadBtn').addEventListener('click',()=>{if(!GM.busy)gmView('load');});
gmEl('gmSetBtn').addEventListener('click',()=>{if(!GM.busy&&window.openSettings)window.openSettings();});
gmEl('gmBack').addEventListener('click',()=>gmView('main'));
gmEl('gMenu').addEventListener('keydown',e=>{if(!GM.open||GM.busy||!gmEl('gmDlg').hidden)return;
  if(e.key==='Escape'&&(GM.view==='load'||GM.view==='create')){e.preventDefault();gmView('main');return;}
  if(GM.view==='main'&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();const bs=[...gmEl('gmNav').querySelectorAll('button')],i=bs.indexOf(document.activeElement);bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length].focus();}
  if(GM.view==='load'&&(e.key==='ArrowDown'||e.key==='ArrowUp')){const bs=[...gmEl('gmList').querySelectorAll('.gm-save-main')],i=bs.indexOf(document.activeElement);if(i>=0){e.preventDefault();bs[Math.max(0,Math.min(bs.length-1,i+(e.key==='ArrowDown'?1:-1)))].focus();}}});
gmEl('gmImg').addEventListener('load',()=>{gmEl('gmImg').classList.add('ready');gmFxFit();});
if(gmEl('gmImg').complete&&gmEl('gmImg').naturalWidth)gmEl('gmImg').classList.add('ready');
const hubBack=document.getElementById('bGMain');if(hubBack)hubBack.addEventListener('click',()=>{if(state==='menu')gaardMenu();});

/* ---- ambient life: embers and ash drifting, motes spiralling into the singularity. Cheap, quiet, paused when hidden ---- */
function gmFxRect(){const img=gmEl('gmImg'),box=gmEl('gmFx').getBoundingClientRect(),nw=img.naturalWidth||3840,nh=img.naturalHeight||2160,cs=getComputedStyle(img),p=(cs.objectPosition||'50% 50%').split(' ').map(v=>parseFloat(v)/100);
  const sc=(cs.objectFit==='contain')?Math.min(box.width/nw,box.height/nh):Math.max(box.width/nw,box.height/nh),dw=nw*sc,dh=nh*sc;return{x:(box.width-dw)*(p[0]),y:(box.height-dh)*(isNaN(p[1])?.5:p[1]),w:dw,h:dh,bw:box.width,bh:box.height};}
function gmFxFit(){const f=GM.fx;if(!f)return;const cv=gmEl('gmFx'),dpr=Math.min(2,window.devicePixelRatio||1),r=cv.getBoundingClientRect();cv.width=Math.max(1,Math.round(r.width*dpr));cv.height=Math.max(1,Math.round(r.height*dpr));f.dpr=dpr;f.rect=gmFxRect();}
function gmFxStart(){if(GM.fx&&GM.fx.on)return;const rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd2=Math.random,em=[],db=[];for(let i=0;i<46;i++)em.push({x:rnd2(),y:rnd2(),vx:-.004-.006*rnd2(),vy:-.008-.012*rnd2(),s:.6+rnd2()*1.5,ph:rnd2()*6.28,w:rnd2()<.6});
  for(let i=0;i<58;i++)db.push({a:rnd2()*6.28,r:.03+rnd2()*.2,s:.4+rnd2()*.9,k:rnd2()});
  GM.fx={on:true,t:0,last:performance.now(),em,db,rm,dpr:1,rect:null};gmFxFit();
  const step=now=>{const f=GM.fx;if(!f||!f.on)return;requestAnimationFrame(step);if(document.hidden)return;const dt=Math.min(.05,(now-f.last)/1000);if(dt<1/40)return;f.last=now;f.t+=dt;gmFxDraw(f,dt);};requestAnimationFrame(step);}
function gmFxStop(){if(GM.fx)GM.fx.on=false;}
function gmFxDraw(f,dt){const cv=gmEl('gmFx'),g=cv.getContext('2d'),R=f.rect;if(!g||!R)return;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);g.scale(f.dpr,f.dpr);
  const hx=R.x+GM.art.nx*R.w,hy=R.y+GM.art.ny*R.h,hr=GM.art.r*R.w;
  /* a very slow breath of light around the singularity */
  const br=.5+.5*Math.sin(f.t*.7),gr=g.createRadialGradient(hx,hy,hr*.6,hx,hy,hr*3.4);gr.addColorStop(0,'rgba(150,185,255,'+(.10+.07*br)+')');gr.addColorStop(.5,'rgba(120,130,220,'+(.035+.02*br)+')');gr.addColorStop(1,'rgba(90,100,200,0)');g.fillStyle=gr;g.beginPath();g.arc(hx,hy,hr*3.4,0,6.283);g.fill();
  if(f.rm)return;
  /* motes drawn in toward the void: they speed up and flatten as they fall */
  g.lineCap='round';for(const d of f.db){const r0=d.r,sp=(.12+.05/(r0+.02))*d.s;d.a+=sp*dt*(1.4+.5/(r0*8+.4));d.r-=dt*(.006+.02*(1-Math.min(1,r0*5)))*d.s;
    if(d.r<.012){d.r=.16+Math.random()*.1;d.a=Math.random()*6.283;d.k=Math.random();}
    const rr=d.r*R.w,x=hx+Math.cos(d.a)*rr*1.0,y=hy+Math.sin(d.a)*rr*.5,px=hx+Math.cos(d.a-sp*dt*3)*rr,py=hy+Math.sin(d.a-sp*dt*3)*rr*.5,fade=Math.min(1,(d.r-.012)*28)*Math.min(1,(.26-d.r)*14);
    g.strokeStyle='rgba('+(d.k<.5?'190,215,255':'235,225,255')+','+(.55*fade)+')';g.lineWidth=.6+d.s*.9;g.beginPath();g.moveTo(px,py);g.lineTo(x,y);g.stroke();}
  /* embers and ash */
  for(const e of f.em){e.x+=e.vx*dt;e.y+=e.vy*dt+Math.sin(f.t*.6+e.ph)*.0005;if(e.y<-.02){e.y=1.02;e.x=Math.random();}if(e.x<-.02)e.x=1.02;
    const x=R.x+e.x*R.w,y=R.y+e.y*R.h;if(x<-4||y<-4||x>R.bw+4||y>R.bh+4)continue;const fl=.55+.45*Math.sin(f.t*(1.1+e.s)+e.ph);
    g.fillStyle=e.w?'rgba(255,196,130,'+(.5*fl)+')':'rgba(170,180,200,'+(.28*fl)+')';g.beginPath();g.arc(x,y,e.s,0,6.283);g.fill();}}
window.addEventListener('resize',()=>{if(GM.open)gmFxFit();});
