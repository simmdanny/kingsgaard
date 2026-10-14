(function(){
/* The inventory (I): opening and closing with I and Esc through real key events, the 6 x 3 grid in the middle of the screen, the game's keys held while it is open, where it does not open,
   and the slots in the run save. Needs a started open world (int-lib.js: __iw.setup(seed)). window.__invStep: 'ui' (default) | 'save' | 'old' | 'new'. Returns PASS/FAIL lines. */
const out=[],res={pass:0,fail:0},ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);};
const key=(code,o)=>{const t=document.body,init=Object.assign({code,key:code.replace(/^Key/,'').toLowerCase(),bubbles:true,cancelable:true},o||{});t.dispatchEvent(new KeyboardEvent('keydown',init));t.dispatchEvent(new KeyboardEvent('keyup',init));};
const down=(code,o)=>document.body.dispatchEvent(new KeyboardEvent('keydown',Object.assign({code,bubbles:true,cancelable:true},o||{})));
const shown=()=>!$('#inv').hidden&&getComputedStyle($('#inv')).display!=='none';
const step=window.__invStep||'ui';
if(step==='ui'){const ev=[],h=e=>ev.push(e.detail.open);window.addEventListener('inventory',h);
  invClose();ok(!shown()&&!INV.open,'the inventory is closed at the start');
  key('KeyI');ok(shown()&&INV.open,'I opens it');
  const cells=[...$('#invGrid').children],xs=new Set(cells.map(c=>Math.round(c.getBoundingClientRect().left))),ys=new Set(cells.map(c=>Math.round(c.getBoundingClientRect().top)));
  ok(cells.length===18&&xs.size===6&&ys.size===3,'18 slots in 6 columns and 3 rows ('+cells.length+', '+xs.size+' x '+ys.size+')');
  {const R=cells.map(c=>c.getBoundingClientRect());let lap=0;for(let i=0;i<18;i++){if(i%6<5&&R[i].right>R[i+1].left+.5)lap++;if(i<12&&R[i].bottom>R[i+6].top+.5)lap++;}ok(!lap&&R[0].width>=30,'the slots do not overlap (slot '+Math.round(R[0].width)+' px)');}
  {$('#inv .inv-card').getAnimations().forEach(a=>a.finish());/* (it slides in from 8 px lower) */const r=$('#inv .inv-card').getBoundingClientRect(),cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;ok(Math.abs(cx-innerWidth/2)<2&&Math.abs(cy-innerHeight/2)<2&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,'the panel is in the middle of the screen and on it ('+[r.left,r.top,r.right,r.bottom].map(Math.round)+' in '+innerWidth+'x'+innerHeight+')');}
  ok($('#invTitle').textContent==='Inventory'&&/I or Esc/.test($('#inv .inv-head span').textContent),'it is titled and says how to close it');
  ok(uiBlocksKeys(),'uiBlocksKeys() counts it as an open panel');
  {const z=+getComputedStyle($('#inv')).zIndex;ok(z>+getComputedStyle($('#hud')).zIndex&&z>+getComputedStyle($('#bottom')).zIndex&&z<+getComputedStyle($('#pause')).zIndex,'it lies over the top bar and the hotbar, under the menus (z '+z+')');}
  /* the game's keys wait while it is open */
  down('KeyW');ok(!TPC.keys.has('KeyW')&&!FLY.keys.has('KeyW'),'W does not walk while it is open');document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));
  {const s0=hotSelected().i;key(s0===2?'Digit2':'Digit3');ok(hotSelected().i===s0,'1-6 do not change the hotbar while it is open');}
  key('KeyI',{repeat:true});ok(shown(),'a held I (key repeat) does not close it');
  key('KeyI');ok(!shown()&&!INV.open,'I closes it');
  key('KeyI');key('Escape');ok(!shown()&&!INV.open,'Esc closes it');
  /* a key that was held when it opened stops */
  down('KeyW');ok(TPC.keys.has('KeyW')||FLY.keys.has('KeyW'),'(W walks when it is closed)');key('KeyI');ok(!TPC.keys.has('KeyW')&&!FLY.keys.has('KeyW'),'opening it stops the hero (held keys are let go)');key('Escape');document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));
  ok(!uiBlocksKeys(),'closed, it no longer holds the keys');
  /* where it does not open */
  paused=true;key('KeyI');ok(!shown(),'not while the game is paused');paused=false;
  KB.cap=0;key('KeyI');ok(!shown(),'not while a scroll key is being bound');KB.cap=-1;
  key('KeyI',{ctrlKey:true});ok(!shown(),'not with Ctrl');
  {const inp=document.createElement('input');document.body.appendChild(inp);inp.focus();inp.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyI',key:'i',bubbles:true,cancelable:true}));ok(!shown(),'not while typing in a field');inp.remove();}
  key('KeyI',{altKey:true});ok(shown(),'with Alt held (sprint) it still opens');key('KeyI');
  ok(KB.bad.includes('KeyI'),'I cannot be bound to a scroll');
  ok(/I inventory/.test(camHint()),'the control hints name it ('+camHint().slice(0,70)+'...)');
  window.removeEventListener('inventory',h);ok(JSON.stringify(ev)===JSON.stringify([true,false,true,false,true,false,true,false]),'an inventory event for every open and close: '+JSON.stringify(ev));
  /* items */
  const it={id:'test',name:'Test stone'};invLoad(null);ok(invAdd(it)===0&&invGet(0)===it&&$('#invGrid').children[0].getAttribute('aria-label')==='Slot 1: Test stone','invAdd puts an item in the first empty slot and the slot shows it');
  ok((lsGet(KR)||{}).inv&&(lsGet(KR).inv[0]||{}).id==='test','the change is in the saved run at once');
  for(let i=1;i<18;i++)invSet(i,{id:'s'+i,name:'S'+i});ok(invAdd({id:'x',name:'X'})===-1,'invAdd says -1 when every slot is taken');invLoad(null);saveRun();}
else if(step==='save'){invLoad(null);invSet(4,{id:'apple',name:'Apple'});const r=JSON.parse(JSON.stringify(serializeRun()));invLoad(null);loadRun(r);ok(invGet(4)&&invGet(4).id==='apple'&&INV.slots.length===18,'a loaded run has its slots back');ok(!INV.open&&!shown(),'and the inventory is closed');}
else if(step==='old'){const r=JSON.parse(JSON.stringify(serializeRun()));delete r.inv;invSet(0,{id:'x',name:'X'});loadRun(r);ok(INV.slots.length===18&&INV.slots.every(s=>s===null),'a run saved before there was an inventory has empty slots');}
else if(step==='new'){invSet(0,{id:'x',name:'X'});key('KeyI');newGame(1);ok(INV.slots.every(s=>s===null)&&!INV.open&&!shown(),'a new adventure starts with an empty, closed inventory');}
return JSON.stringify(res)+'\n'+out.join('\n');})()
