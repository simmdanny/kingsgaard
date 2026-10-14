(function(){
/* Visibility invariants while a real hero walks through real buildings. Installs a per-frame hook in int-lib's walkTo and then runs int-walk.js over the chosen buildings
   (window.__types, window.__per, window.__skip, window.__seeds as for int-walk). What it checks every frame:
     noMesh      the interior of the building the hero is in has no mesh in the scene
     stairClip   the hero is on a flight and the cut-away plane has already clipped the steps under it
     cbFlip      the building the hero belongs to changes while the hero is still inside the first one
     houseGone   a building near the hero is drawn by neither its merged mesh nor its own meshes (or by both)
     wallsOff    the building the hero is in has its own wall layer switched off
   Results: window.__vis = {frames, counts, examples}. */
const I=window.__iw;if(!I){return 'load int-lib.js first';}
const V=window.__vis={frames:0,counts:{},ex:[],walks:0};
const bump=(k,info)=>{V.counts[k]=(V.counts[k]||0)+1;if(V.ex.length<30&&!V.seen[k+':'+(info&&info.id)]){V.seen[k+':'+(info&&info.id)]=1;V.ex.push(k+' '+JSON.stringify(info));}};V.seen={};
const drawn=b=>{const k=b.blk,M=b.meshes,own=!!(M.w&&M.w.visible);if(!k)return{merged:false,own,ok:own||!!b.ruined};const m=k.state===true;return{merged:m,own,ok:m!==own};};
let last={cb:null,lv:0};
I.hook=function(dt){const H=heroU,cb=OWI.cb;V.frames++;
  if(cb){const id=cb.type+'@'+cb.x.toFixed(0)+','+cb.z.toFixed(0);
    if(!(cb.ic&&cb.ic.grp&&cb.ic.grp.parent===cb.g&&cb.ic.mesh&&cb.ic.mesh.visible))bump('noMesh',{id,hasIc:!!cb.ic,grp:!!(cb.ic&&cb.ic.grp)});
    const M=cb.meshes;if(!(M.w&&M.w.visible))bump('wallsOff',{id,w:M.w&&M.w.visible,blk:cb.blk&&cb.blk.state});
    if(last.cb&&last.cb!==cb){bump('cbFlip',{id:last.cb.type+'@'+last.cb.x.toFixed(0)+','+last.cb.z.toFixed(0)+'->'+id,lv:last.lv,newlv:OWI.lv,hero:[+H.x.toFixed(1),+H.z.toFixed(1)]});}
    const P=cb.ic&&cb.ic.P;if(P){const l=owiW2L(cb,H.x,H.z),y=H.g.position.y;for(const f of P.stairs){if(l[0]>=f.x0&&l[0]<=f.x1&&l[1]>=Math.min(f.zb,f.zt)&&l[1]<=Math.max(f.zb,f.zt)){const sm=cb.ic.stairMesh;if(!(sm&&sm.visible&&sm.parent===cb.ic.grp&&cb.ic.grp.parent===cb.g&&!(sm.material.clippingPlanes&&sm.material.clippingPlanes.length)))bump('stairClip',{id,cut:+cb.cutPlane.constant.toFixed(2),y:+y.toFixed(2),lv:OWI.lv,flight:[f.from,f.to],mesh:!!sm,vis:sm&&sm.visible,clip:sm&&sm.material.clippingPlanes&&sm.material.clippingPlanes.length});}}}
    /* the buildings round it */
    for(const v of OW.villages){if(Math.hypot(v.x-H.x,v.z-H.z)>v.rad+30)continue;for(const b of v.buildings){if(Math.hypot(b.x-H.x,b.z-H.z)>40)continue;const d=drawn(b);if(!d.ok)bump('houseGone',{id:b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0),merged:d.merged,own:d.own,cb:id,ruined:!!b.ruined});}}}
  last={cb,lv:OWI.lv};};
return 'hook installed';})()
