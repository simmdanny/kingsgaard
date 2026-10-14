(function(){
/* The sword, the first item: the starting hotbar, the hand following the selected slot, the scabbard, no bow, empty hands not fighting, X / R gone, the hotbar in the run save.
   Needs a started open world with the player's character (int-lib.js: __iw.setup(seed)). window.__swStep: 'hold' (default) | 'save' | 'old' | 'new'. Returns PASS/FAIL lines. */
const out=[],res={pass:0,fail:0},ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);};
const H=heroU,R=H&&H.mdl&&H.mdl.userData.pcRig,K=R&&R.kit||{},vis=k=>!!(K[k]&&K[k].visible);
/* (int-lib's frame runs the game's update but not anim(), where the page's own loop moves the heroes' rigs: a hidden page runs no loop of its own) */
const frames=n=>{for(let i=0;i<n;i++){__iw.frame(1/30);window.__swT=(window.__swT||100)+1/30;anim(1/30,window.__swT);}};
const key=code=>{const t=document.body;t.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));t.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
const step=window.__swStep||'hold';
if(!R){ok(false,'the hero is the player\'s character with its kit');return JSON.stringify(res)+'\n'+out.join('\n');}
if(step==='hold'){
  ok(hotGet(0)&&hotGet(0).id==='sword'&&hotSelected().i===0&&HOT.st.slots.slice(1).every(s=>s===null),'the adventure starts with the sword in slot 1, selected, and nothing else');
  {const b=$('#hotbar').children[0];ok(b.getAttribute('aria-label')==='Slot 1: Sword'&&!!b.querySelector('svg'),'slot 1 shows the sword (named, with its picture)');}
  frames(40);ok(pcHold()==='sword'&&!R.st.drawn&&vis('sword')&&!vis('swordHip')&&vis('scab'),'selected: the sword is in the hand (at rest: no fight), the scabbard at the hip is empty');
  ok(!vis('bow')&&!vis('bowBack')&&!vis('quiver')&&!vis('arrow'),'no bow, no quiver');
  ok(R.hands&&R.hands.R.grip.visible,'the right hand grips it');
  ok(pcWeapon()==='sword'&&heroCls('pc').melee===true&&H.melee===true,'the character is a swordsman (class blade, fights hand to hand)');
  key('Digit2');frames(40);ok(hotSelected().i===1&&pcHold()===null&&!R.st.drawn&&!vis('sword')&&vis('swordHip')&&vis('scab'),'an empty slot selected: the sword is in its scabbard at the hip');
  key('Digit1');frames(40);ok(vis('sword')&&!vis('swordHip'),'slot 1 again: in the hand again');
  frames(330);ok(vis('sword')&&!R.st.drawn,'still in the hand after 11 s without a fight (at rest, not in a guard)');
  /* fighting: a stand-in foe at arm's length, heroAttack counted (scrolls off, so nothing else reaches for the stand-in) */
  {const atk=heroAttack,scr=HB.pc.scrolls;let n=0;heroAttack=function(){n++;H.cd=1;};HB.pc.scrolls=false;
    const foe={x:H.x+.3,z:H.z,hp:50,maxHp:50,dead:false,fly:false,blockBy:null,hitT:0};enemies.push(foe);
    try{H.hx=H.x;H.hz=H.z;H.dest=null;H.pend=null;H.cd=0;heroUpdate(1/30);const armed=n;
      releaseBlocks();key('Digit2');H.cd=0;n=0;for(let i=0;i<30;i++){H.cd=0;heroUpdate(1/30);}
      ok(armed>0,'with the sword in hand the hero strikes a foe at arm\'s length');ok(n===0&&H.blk.size===0,'with empty hands it strikes nothing and holds no foe');}
    finally{enemies.splice(enemies.indexOf(foe),1);releaseBlocks();heroAttack=atk;HB.pc.scrolls=scr;key('Digit1');}}
  /* no sword anywhere / a sword in the inventory */
  hotSet(0,null);frames(30);ok(!vis('sword')&&!vis('swordHip')&&!vis('scab'),'with no sword in the hotbar or the inventory there is no scabbard either');
  invAdd({id:'sword'});frames(30);ok(!vis('sword')&&vis('swordHip')&&vis('scab'),'a sword in the inventory hangs at the hip');
  {const b=$('#invGrid').children[0];ok(b.getAttribute('aria-label')==='Slot 1: Sword'&&!!b.querySelector('svg'),'the inventory shows it (named, with its picture)');}
  invLoad(null);hotSet(0,{id:'sword'});hotSelect(0);frames(30);ok(vis('sword'),'(back in slot 1: in the hand)');
  /* the old keys */
  const pcw=meta.pcw;key('KeyX');key('KeyR');frames(10);ok(pcWeapon()==='sword'&&vis('sword')&&meta.pcw===pcw,'X and R do nothing now');
  ok(!KB.bad.includes('KeyX')&&!KB.bad.includes('KeyR'),'X and R can be bound to scrolls');
  ok(!/bow|R weapon/.test(camHint()),'the control hints name neither');
  ok((lsGet(KR)||{}).hot&&(lsGet(KR).hot.slots[0]||{}).id==='sword','the hotbar is in the saved run');}
else if(step==='save'){hotSelect(2);const r=JSON.parse(JSON.stringify(serializeRun()));hotLoad(null);loadRun(r);ok(hotSelected().i===2&&hotGet(0)&&hotGet(0).id==='sword','a loaded run has its hotbar back (slot 3 selected, the sword in slot 1)');
  frames(20);const R2=heroU.mdl.userData.pcRig;ok(!R2.kit.sword.visible&&R2.kit.swordHip.visible,'and the sword is at the hip (slot 3 is empty)');hotSelect(0);}
else if(step==='old'){const r=JSON.parse(JSON.stringify(serializeRun()));delete r.hot;hotSet(0,null);loadRun(r);ok(hotGet(0)&&hotGet(0).id==='sword'&&hotSelected().i===0,'a run saved before the hotbar was its own gets the starting sword, selected');}
else if(step==='new'){hotSelect(3);hotSet(0,null);newGame(1);ok(hotGet(0)&&hotGet(0).id==='sword'&&hotSelected().i===0,'a new adventure starts with the sword in slot 1, selected');}
return JSON.stringify(res)+'\n'+out.join('\n');})()
