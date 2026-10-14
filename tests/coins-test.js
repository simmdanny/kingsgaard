(function(){
/* Golden coins: the purse API, the 'coins' event, the counter in the top bar, and the purse in the run save. Needs a started open world (int-lib.js: __iw.setup(seed)).
   window.__coinStep: 'api' (default) | 'save' | 'old' (a run saved before there were coins) | 'new' (a new adventure). Returns PASS/FAIL lines. */
const out=[],res={pass:0,fail:0},ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);};
const shown=()=>document.getElementById('vCoins').textContent,step=window.__coinStep||'api';
if(step==='api'){const ev=[],h=e=>ev.push(e.detail);window.addEventListener('coins',h);
  coinsSet(0,true);ok(coinsGet()===0&&shown()==='0','the purse starts empty and the counter shows 0');
  ok(coinsAdd(250)===250&&shown()==='250','coinsAdd(250) gives 250, shown');
  ok((lsGet(KR)||{}).coins===250,'the change is in the saved run at once');
  ok(coinsSpend(100)===true&&coinsGet()===150&&shown()==='150','coinsSpend(100) pays: 150 left');
  ok(coinsSpend(1000)===false&&coinsGet()===150,'coinsSpend(1000) with 150 is refused and takes nothing');
  ok(coinsCan(150)&&!coinsCan(151),'coinsCan: 150 yes, 151 no');
  ok(coinsAdd(-5)===150&&coinsSpend(-5)===false&&coinsGet()===150,'negative amounts change nothing');
  ok(coinsSpend(0)===true&&coinsGet()===150,'paying 0 is fine and changes nothing');
  coinsAdd(12345);ok(coinsGet()===12495&&shown()===fmt(12495),'large counts are shown short ('+shown()+')');
  ok(document.getElementById('coinStat').getAttribute('aria-label')==='Golden coins: 12495','the counter says the whole count to a screen reader');
  window.removeEventListener('coins',h);
  ok(JSON.stringify(ev)===JSON.stringify([{n:250,d:250},{n:150,d:-100},{n:12495,d:12345}]),'one coins event per change: '+JSON.stringify(ev));
  const s=document.getElementById('coinStat'),r=s.getBoundingClientRect(),cs=getComputedStyle(s);
  ok(cs.display!=='none'&&r.left<40&&r.top<40&&r.width>20,'the counter is visible in the top left corner ('+[r.left,r.top,r.right,r.bottom].map(Math.round)+')');
  const f=document.getElementById('flyHud');if(f&&f.style.display!=='none'){const q=f.getBoundingClientRect();ok(q.top>=r.bottom+4,'the control hints stand below the counter ('+Math.round(q.top)+' vs '+Math.round(r.bottom)+')');}
  ok(serializeRun().coins===12495,'the run save holds the purse');}
else if(step==='save'){coinsSet(321,true);const r=JSON.parse(JSON.stringify(serializeRun()));coinsSet(5,true);loadRun(r);ok(coinsGet()===321&&shown()==='321','a loaded run has its purse back ('+coinsGet()+')');ok(state==='playing'&&OW.on,'the run is playing in the open world');}
else if(step==='old'){const r=JSON.parse(JSON.stringify(serializeRun()));delete r.coins;coinsSet(99,true);loadRun(r);ok(coinsGet()===0&&shown()==='0','a run saved before there were coins starts with none');}
else if(step==='new'){coinsSet(77,true);newGame(1);ok(coinsGet()===0&&shown()==='0','a new adventure starts with an empty purse');}
return JSON.stringify(res)+'\n'+out.join('\n');})()
