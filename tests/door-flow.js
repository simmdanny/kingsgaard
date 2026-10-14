(function(){
/* The doors in play: shut at the start, the prompt, F, the swing direction, collision following the state, the doorway, obstruction, reversal, the save. Needs int-lib.js and a started world.
   Returns a list of PASS/FAIL lines. */
const I=window.__iw;I.keepDoors=true;const out=[],res={pass:0,fail:0};const ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);return c;};
const key=(code)=>{window.dispatchEvent(new KeyboardEvent('keydown',{code,key:code,bubbles:true,cancelable:true}));window.dispatchEvent(new KeyboardEvent('keyup',{code,key:code,bubbles:true}));};
const H=heroU,bid=b=>b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0);
const step=(n,dt)=>{for(let i=0;i<n;i++){const d=dt||1/30;heroUpdate(d);owiTick(d);if(i%5===0){owFrame();}}};
const Lw=(b,lx,lz)=>owiL2W(b,lx,lz);
const pick=(type)=>I.list(type).filter(b=>b.enter&&b.arch.leaf&&!b.tunnel&&b.ic!==undefined)[0];
const b=window.__dfB||I.list().filter(b=>b.enter&&b.arch.leaf&&!b.tunnel&&b.type==='cot')[3];
{const q=I.ground(b,4);I.tele(q[0],q[1]);}I.settle(b);
const g=owdG(b),c=b.ic.col,d=owdGet(b,true),P=b.ic.P,zb=g.zcm-.0275*g.BS,z1=zb+OW_T*g.BS,u=g.um;
const outPt=[u,z1+.55],inPt=[u,zb-.9],deepPt=[u,zb-2.4];
const at=(p)=>{const w=Lw(b,p[0],p[1]);I.tele(w[0],w[1]);OWI.tScan=-9;step(3);};
const hl=()=>owiW2L(b,H.x,H.z);
ok(d.a===0&&d.t===0&&c.mk[c.dA]===OWI_GND,'the door of '+bid(b)+' is shut at the start and its doorway is solid');
/* (the front door is on the ground floor: its boxes stand on that level only - on every level they were an invisible wall above the door upstairs) */
{const g0=owdG(b);let up=false;for(let lv=1;lv<8;lv++)if(c.mk[c.dA]&(1<<lv))up=true;ok(!up&&!(c.mk[c.dB]&~OWI_GND),'the door boxes are on the ground floor only (upstairs the spot above the door is free of them)');}
/* walking at the shut door from outside: the hero is held on the outside */
{const w=Lw(b,...outPt);I.tele(w[0],w[1]);OWI.tScan=-9;step(3);const w2=Lw(b,...inPt);I.walkTo(w2[0],w2[1],{maxT:5});const l=hl();ok(l[1]>z1,'a shut door stops the hero outside (local z '+l[1].toFixed(2)+', wall '+z1.toFixed(2)+')');}
/* the prompt */
at(outPt);key('KeyF');/* not yet: first the prompt */
{const d0=owdGet(b,true);d0.t=0;d0.a=0;owdApply(b);}
at(outPt);step(2);ok(OWD.tgt===b,'the hero at the door has it as the target');ok(OWD.el&&OWD.el.style.display!=='none'&&OWD.el.textContent==='F — Open Door','the prompt says "F — Open Door" ('+(OWD.el&&OWD.el.textContent)+')');
{const q=Lw(b,u+3.2,z1+.6);I.tele(q[0],q[1]);step(3);ok(OWD.tgt==null&&OWD.el.style.display==='none','away from every door there is no prompt');}
at(outPt);
/* F opens: from outside it swings inward, the doorway stays solid while it moves and opens when it stands open */
key('KeyF');step(1);ok(d.t===1&&d.a>0&&c.mk[c.dA]===OWI_GND&&c.mk[c.dB]===0,'F starts the swing; the doorway is still solid while it moves');
step(8);ok(d.a>.2&&d.a<1&&c.mk[c.dA]===OWI_GND,'in the middle of the swing the doorway is still solid (a '+d.a.toFixed(2)+')');
ok(!b.meshes.d.visible&&d.pv&&d.pv.visible,'a moving door is drawn by its own pivot, the shut leaf is hidden');
key('KeyF');step(1);ok(d.t===0,'F during the swing reverses it (no second animation)');
key('KeyF');step(20);ok(d.t===1&&d.a===1&&d.dir===1,'F again: it opens fully and swings inward (dir '+d.dir+')');
ok(c.mk[c.dA]===0&&c.mk[c.dB]===OWI_GND,'standing open: the doorway is free, the open leaf is a thin solid');
ok(OWD.el.textContent==='F — Close Door','the prompt now says "F — Close Door"');
/* through the doorway and back */
{const w=Lw(b,...deepPt);const r1=I.walkTo(w[0],w[1],{maxT:8});const l=hl();ok(l[1]<zb-1.5,'the hero walks in through the open doorway (local z '+l[1].toFixed(2)+')');
 const w3=Lw(b,...outPt);I.walkTo(w3[0],w3[1],{maxT:8});const l3=hl();ok(l3[1]>z1,'and out again (local z '+l3[1].toFixed(2)+')');}
/* the leaf is solid where it stands */
{const q=owdOpenBox(g,d.dir),mx=(q[0]+q[1])/2,mz=(q[2]+q[3])/2;ok(owiHit(c,mx,mz,1,OWI.RAD-.02),'the open leaf is solid');}
/* shutting with the hero in the doorway is refused */
at([u,(zb+z1)/2]);key('KeyF');step(10);ok(d.t===1&&d.a===1,'F with the hero standing in the doorway does not close the door');
/* from inside, with the door shut: it opens outward, away from the hero */
at(outPt);key('KeyF');step(20);ok(d.t===0&&d.a===0&&c.mk[c.dA]===OWI_GND,'F from outside the doorway closes the door');
at(inPt);ok(OWD.tgt===b,'from inside, the same door is the target');key('KeyF');step(20);ok(d.t===1&&d.a===1&&d.dir===-1,'opened from inside it swings outward (dir '+d.dir+')');
{const q=owdOpenBox(g,d.dir);ok(q[2]>=zb-.01&&q[3]>z1,'the outward leaf stands outside the house ('+q[2].toFixed(2)+'..'+q[3].toFixed(2)+', wall '+zb.toFixed(2)+'..'+z1.toFixed(2)+')');}
{const w=Lw(b,...outPt);I.walkTo(w[0],w[1],{maxT:8});const l=hl();ok(l[1]>z1,'the hero walks out through it');
 const mid=[u,z1+1.2];const w2=Lw(b,...mid);I.walkTo(w2[0],w2[1],{maxT:8});}
/* nothing is in the way of closing it from the front, and the swing returns the way it came */
at(outPt);key('KeyF');step(20);ok(d.t===0&&d.a===0&&d.dir===-1,'it closes again');
/* something in the outward swing: from inside the door falls back to the inward swing when the hero is clear of it, and is refused when the hero is in it */
{const sv=owdBlockedAt;owdBlockedAt=(bb,lx,lz,r)=>lz>z1+.01||sv(bb,lx,lz,r);
  at([u+g.ax*.1,zb-1.75]);ok(OWD.tgt===b,'a hero 1.7 m inside still has the door');key('KeyF');step(20);ok(d.t===1&&d.dir===1,'with something outside the swing, the door opens inward when the hero stands clear of it (dir '+d.dir+')');
  owdSet(b,false,{instant:true});at(inPt);let msg='';const st=toast;toast=m=>{msg=m;};key("KeyF");step(10);toast=st;ok(d.t===0&&msg==='Something is in the way','with the hero in the inward swing too the door stays shut and says so ('+msg+')');
  owdBlockedAt=sv;}
/* the save */
d.t=0;d.a=0;owdApply(b);owdSet(b,true,{instant:true,dir:-1});{const s=owSave(),vi=OW.villages.findIndex(v=>v.buildings.includes(b)),bi=OW.villages[vi].buildings.indexOf(b),SV=o=>o.gv>=2?o.vs[OW.villages[vi].key]:o.v[vi];/* (the streamed world saves its villages by key) */ok(SV(s).b[bi][3]===2,'the save keeps an outward-open door ('+SV(s).b[bi][3]+')');
  owdSet(b,false,{instant:true});ok(SV(owSave()).b[bi][3]===0,'and a shut one');owLoad(s);ok(b.dr.t===1&&b.dr.a===1&&b.dr.dir===-1&&c.mk[c.dB]===OWI_GND,'loading restores the open door, its swing and its collider');owdSet(b,false,{instant:true});}
/* a window open: the key waits */
{const w=Lw(b,...outPt);I.tele(w[0],w[1]);step(3);paused=true;const t0=d.t;key('KeyF');ok(d.t===t0,'F does nothing while the game is paused');paused=false;}
/* the freecam: no prompt, no key */
{FLY.on=true;step(2);owdPrompt();ok(OWD.el.style.display==='none','no prompt in the free camera');const t0=d.t;key('KeyF');ok(d.t===t0,'F does nothing in the free camera');FLY.on=false;}
/* a touch screen (no hover, no fine pointer): the door opens by itself when the hero comes up to it and shuts when they walk away */
{const mm=window.matchMedia;window.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){}});
  owdSet(b,false,{instant:true});OWD.auto.clear();at([u,z1+3.5]);step(5);ok(d.t===0,'touch: far from the door it stays shut');
  at(outPt);step(3);ok(d.t===1,'touch: the hero at the door opens it by itself (t '+d.t+')');step(20);ok(d.a===1,'touch: and it stands open');
  at([u,z1+4.2]);step(5);step(20);ok(d.t===0&&d.a===0,'touch: it shuts again when the hero has walked away');
  window.matchMedia=mm;}
return res.fail+' failed, '+res.pass+' passed\n'+out.join('\n');})()
