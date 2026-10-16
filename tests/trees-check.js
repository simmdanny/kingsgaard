(async function(){
/* The trees (src/trees.js): run in a --dev build after the world is set up and the player has stood somewhere a little while (wl-lib.js __wl.go).
   Checks every tree the view has placed: the same placement every time and in any order; none by the keep, on a village's ground, on a road, where a
   ring or an arch stands, in water (against the level-0 tile's own water where it is made), on steep ground (against the drawn ground), floating or sunk;
   the trunks block the hero; the near trees are exactly those within R0 + 14 m. window.__trc = {pass, fail, out:[...], n:{...}} */
const R=window.__trc={pass:0,fail:0,out:[],n:{}};const ok=(c,m)=>{R[c?'pass':'fail']++;if(!c||R.out.length<400)R.out.push((c?'PASS ':'FAIL ')+m);return c;};
const S=WG_CFG.tile,F=TRW_F,tiles=[...TRW.tiles.values()].filter(T=>T.a&&T.out);ok(tiles.length>20,'tiles placed: '+tiles.length);
/* 1. the same placement, again and in another order */
{const pick=tiles.filter((T,i)=>i%Math.max(1,Math.floor(tiles.length/24))===0).slice(0,24).reverse();let same=0;
  for(const T of pick){const p=trwPlace(T.ti,T.tk);let eq=p.n===T.n&&p.a.length===T.a.length;if(eq)for(let i=0;i<p.a.length;i++)if(p.a[i]!==T.a[i]){eq=false;break;}if(eq)same++;else ok(false,'placement differs on a second run: tile '+T.key);}
  ok(same===pick.length,'placement the same on a second run, in reverse order: '+same+'/'+pick.length);}
/* 2. what is kept clear */
const K=OW.keep,rw=[],bad={keep:0,site:0,road:0,mark:0,water:0,steep:0,y:0,grid:0};let n=0,nNear=0,maxDy=0;
for(const T of tiles){const wt=WT.tiles.get(T.key);
  for(let j=0;j<T.n;j++){if(T.out[j])continue;n++;const x=T.a[j*F],z=T.a[j*F+1];
    if(K&&Math.hypot(x-K.x,z-K.z)<72)bad.keep++;
    {const C=WS_CFG.cell;for(let b=Math.floor((z-200)/C);b<=Math.floor((z+200)/C);b++)for(let a=Math.floor((x-200)/C);a<=Math.floor((x+200)/C);a++){const s=WS.sites.get(wgKey(a,b));if(s&&Math.hypot(x-s.x,z-s.z)<s.fr+28)bad.site++;}}
    {const r=6.5;let hit=false;for(let gx=Math.floor((x-r)/8);gx<=Math.floor((x+r)/8)&&!hit;gx++)for(let gz=Math.floor((z-r)/8);gz<=Math.floor((z+r)/8)&&!hit;gz++){const L=WS.rh.get(gx+','+gz);if(!L)continue;for(let q=0;q<L.length;q+=2){const p=L[q].pts[L[q+1]];if(Math.hypot(p[0]-x,p[1]-z)<r){hit=true;break;}}}if(hit)bad.road++;}
    {const FC=WF.cell;for(let b=Math.floor((z-180)/FC);b<=Math.floor((z+180)/FC);b++)for(let a=Math.floor((x-180)/FC);a<=Math.floor((x+180)/FC);a++){const f=WF.list.get(wgKey(a,b));if(!f)continue;const ca=Math.cos(f.yaw),sa=Math.sin(f.yaw),dx=x-f.x,dz=z-f.z;if(Math.abs(dx*ca+dz*sa)<f.R+6&&Math.abs(-dx*sa+dz*ca)<f.th*.6+7)bad.mark++;}}
    if(wt){nNear++;const h=wtHt(wt,x,z),wl=wtWater(x,z);if(wl>h-.15){bad.water++;if(bad.water<6)rw.push('water at '+x.toFixed(1)+','+z.toFixed(1)+' h '+h.toFixed(2)+' wl '+wl.toFixed(2));}
      const e=1.2,sl=Math.hypot(wtHt(wt,Math.min(x+e,T.ti*S+S-.01),z)-wtHt(wt,Math.max(x-e,T.ti*S),z),wtHt(wt,x,Math.min(z+e,T.tk*S+S-.01))-wtHt(wt,x,Math.max(z-e,T.tk*S)))/(2*e);if(sl>.75){bad.steep++;if(bad.steep<6)rw.push('steep '+sl.toFixed(2)+' at '+x.toFixed(1)+','+z.toFixed(1));}
      const dy=Math.abs(T.a[j*F+2]-h);if(dy>maxDy)maxDy=dy;if(dy>1.2)bad.y++;
      if(OW.on&&Math.abs(x-OW.focus.x)<400&&Math.abs(z-OW.focus.z)<400){const c=owCell(x,z);const v=grid[c.r]&&grid[c.r][c.c];if(v===2&&sl<.5&&(OW.villages.some(vv=>Math.hypot(vv.x-x,vv.z-z)<(vv.rad||20)+40)||(K&&Math.hypot(K.x-x,K.z-z)<100)))bad.grid++;}}}}
R.n={trees:n,nearTiles:nNear,tiles:tiles.length,maxDy:+maxDy.toFixed(2)};
ok(bad.keep===0,'none within 72 m of the keep ('+bad.keep+')');ok(bad.site===0,'none on a known village\'s ground or within 28 m of it ('+bad.site+')');ok(bad.road===0,'none within 6.5 m of a road ('+bad.road+')');
ok(bad.mark===0,'none where a ring or an arch stands ('+bad.mark+')');ok(bad.water===0,'none in water, by the level-0 tiles\' own water ('+bad.water+' of '+nNear+') '+rw.filter(s=>s.startsWith('water')).join('; '));
ok(bad.steep===0,'none on drawn ground steeper than 0.7 - 35 degrees, the rock look (+.05 for the measure: a trunk reaches 1.2 m into the ground) ('+bad.steep+') '+rw.filter(s=>s.startsWith('steep')).join('; '));ok(bad.y===0,'the world function\'s height within 1.2 m of the drawn ground (worst '+maxDy.toFixed(2)+' m, '+bad.y+' over)');
ok(bad.grid===0,'none on closed flat ground by a village or the keep, within the grid window ('+bad.grid+')');
/* 3. the trunks block the hero; outside them it can stand */
{const f=OW.focus;let best=null,bd=1e9;for(const T of tiles){if(!T.props)continue;for(const p of T.props){const d=Math.hypot(p.x-f.x,p.z-f.z);if(d<bd){bd=d;best=p;}}}
  if(ok(!!best,'a tree with a trunk prop near the player')){ok(!owCanStand(best.x,best.z),'the hero cannot stand in a trunk');ok(!owCanStand(best.x+best.r+.15,best.z),'nor right against it (its own radius)');
    const fx=best.x+best.r+1.2,fz=best.z;if(!trwBlock(fx,fz,.28))ok(true,'the hero is not blocked 1.2 m outside a trunk (the grid may still close it: '+owCanStand(fx,fz)+')');}}
/* 4. the near trees: those within R0 + 14 m of the last gather, all of them, none else */
{const N=TRW.near,e=N.eye;let want=0;for(const T of tiles)for(let j=0;j<T.n;j++){if(T.out[j])continue;if(Math.hypot(T.a[j*F]-e.x,T.a[j*F+1]-e.z)<=TRW.R0+14)want++;}
  let have=0;for(const im of N.ims)if(im)have+=im.count;ok(have===want,'the near trees are the '+want+' within R0 + 14 m ('+have+')');}
/* 5. the villages round every tile with trees were worked out before its trees were kept (none read from a partial picture); near the player its roads too */
{let noSite=0,noRoad=0,near=0,held=0,leak=0;const f=OW.focus;for(const T of tiles){if(!T.lod&&!T.mesh)continue;if(trwSiteMissing(T))noSite++;
    if(trwDist(T,f.x,f.z)<TRW.RR&&T.mesh){near++;if(trwHeld(T,f)){held++;if(T.mesh.visible||T.props)leak++;}else if(!trwRoadsKnown(T))noRoad++;}}
  ok(noSite===0,'every tile with trees knows the villages round it ('+noSite+' do not)');
  ok(noRoad===0,'every tile shown within '+TRW.RR+' m of the player had the roads round it known when its trees were kept ('+noRoad+' of '+near+' did not; '+held+' held back until their roads come)');
  ok(leak===0,'a held-back tile shows nothing and blocks nothing ('+leak+')');}
/* 6. the props are those of the tiles within PR, none twice */
{const seen=new Set();let dup=0,cnt=0;for(const p of OW.props){if(p.type!=='tree')continue;cnt++;if(seen.has(p))dup++;seen.add(p);}ok(dup===0,'no trunk prop twice ('+cnt+' trunks)');}
return R;})()
