(function(){
/* Batching of settlements: an intact building is drawn from the merged mesh of its cell, a damaged / ruined / explored one from its own meshes, and the two never show
   at the same time (nothing doubled, nothing missing). Run in the dev build after __pw.setup(3). */
const out=[],ok=(c,m)=>{out.push((c?'ok   ':'FAIL ')+m);return c;};
const v=OW.villages[0];
const merged=b=>{const k=b.blk;if(!k)return null;let a=0;for(let i=k.start;i<k.start+k.count;i++)if(k.attr.array[i]<.5)a++;return a===k.count?1:a===0?0:-1;};
const own=b=>{const k=b.blk;return k.layers.filter(m=>m!==b.meshes.g).some(m=>m.visible);};
const glassMerged=b=>{const g=b.gblk;if(!g)return null;let a=0;for(let i=g.start;i<g.start+g.count;i++)if(g.attrS.array[i]<.5)a++;return a===g.count?1:a===0?0:-1;};
const bs=v.buildings.filter(b=>b.blk);
ok(bs.length>v.buildings.length*.7,'most buildings of the village are batched ('+bs.length+'/'+v.buildings.length+')');/* (not the specials: the well, stalls, the windmill, sheds and barns are drawn on their own - a smaller village has more of them for its size) */
let bad=0;for(const b of bs){if(merged(b)!==1||own(b))bad++;}
ok(bad===0,'every intact building: merged on, own meshes off ('+bad+' wrong)');
/* damage steps */
const b=bs.find(x=>x.gblk&&x.def&&!x.ruined)||bs[0];
const set=(hp,ruined)=>{b.hp=hp;b.ruined=!!ruined;b.vis=-1;owBldVis(b);};
set(b.maxHp,false);ok(merged(b)===1&&!own(b),'intact: merged');
set(b.maxHp*.7,false);ok(merged(b)===0&&own(b),'damaged to 70%: own meshes');
ok(glassMerged(b)===0,'damaged: merged glass off');
set(b.maxHp*.4,false);ok(merged(b)===0&&own(b),'damaged to 40%: own meshes');
set(0,true);ok(merged(b)===0,'ruin: merged off');
set(b.maxHp*.5,true);ok(merged(b)===0,'rebuilding: merged off');
set(b.maxHp,false);ok(merged(b)===1&&!own(b)&&glassMerged(b)===1,'repaired: merged again, own off');
/* the colour tint of a damaged building does not leak into the merged state */
ok([...Object.values(b.mats)].every(m=>m.color.getHexString()==='ffffff'),'repaired: building materials are clean');
/* save / load round trip */
set(b.maxHp*.3,false);const s=JSON.parse(JSON.stringify(owSave()));set(b.maxHp,false);ok(merged(b)===1,'before load: merged');owLoad(s);
ok(merged(b)===0&&own(b)&&Math.abs(b.hp-b.maxHp*.3)<.2,'after load: the damaged building uses its own meshes');
set(b.maxHp,false);
/* exploring: the building being explored shows its own (cut-away) meshes */
const en=bs.find(x=>x.enter&&x!==b)||null;
if(en){OWI.cb=en;owBldRefresh(en);ok(merged(en)===0&&own(en)&&glassMerged(en)===0,'explored building: own meshes, merged glass off');OWI.cb=null;owBldRefresh(en);ok(merged(en)===1&&!own(en)&&glassMerged(en)===1,'left the building: merged again');}
else out.push('skip no enterable batched building found');
/* glass state follows the interior */
let gl=0,gwrong=0;for(const x of bs){if(!x.gblk)continue;gl++;const loaded=!!(x.ic&&x.ic.grp);if(x.gblk.near!==(loaded?1:0))gwrong++;}
ok(gwrong===0,'merged glass: near flag follows interior state on '+gl+' buildings ('+gwrong+' wrong)');
return out.join('\n');})()
