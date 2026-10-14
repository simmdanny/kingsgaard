/* =====================================================================================================================
   KINGSGAARD INTERIORS (3/5): reserved zones and the placement engine.
   ===================================================================================================================== */
/* ---------- reserved zones: places that must stay empty ---------- */
function owiReserve(P,F){const i=F.i,res=F.res,Q=F.Q,R=(x0,x1,z0,z1,tag)=>res.push({x0,x1,z0,z1,tag});
  if(i===0){/* the way in, and the strip along the front wall where the open door leaf lies */
    const u=P.door.u,w=P.door.w;R(u-w/2-.35,u+w/2+.35,Q.zb-1.5,Q.zb,'door');
    const hs=P.hingeSide;R(Math.min(u+hs*(w/2),u+hs*(w/2+1.05)),Math.max(u+hs*(w/2),u+hs*(w/2+1.05)),Q.zb-.24,Q.zb,'leaf');}
  /* stairs: the flight itself, the landing in front of its bottom, and the gate at its top */
  for(const f of P.stairs){const rs=P.col.s>0?-1:1;
    if(i===f.from){const zlo=f.dir<0?f.zb:f.zb-.95,zhi=f.dir<0?f.zb+.95:f.zb;
      R(f.x0-.05,f.x1+.05,Math.min(f.z0,zlo),Math.max(f.z1,zhi),'stair');
      if(rs<0)R(f.x0-.65,f.x0,zlo,zhi,'stair');else R(f.x1,f.x1+.65,zlo,zhi,'stair');}
    if(i===f.to){R(f.x0-.05,f.x1+.05,f.z0-.03,f.z1+.03,'hole');
      const za=f.dir<0?f.zt-.8:f.zt,zb=f.dir<0?f.zt:f.zt+.8;R(f.x0-.05,f.x1+.05,za,zb,'gate');
      const z0=f.dir<0?f.zt:f.zt-1.05,z1=f.dir<0?f.zt+1.05:f.zt;if(rs<0)R(f.x0-1.0,f.x0,z0,z1,'gate');else R(f.x1,f.x1+1.0,z0,z1,'gate');}}
  /* both sides of every doorway of every partition */
  for(const w of F.walls)for(const d of w.doors){const h=d.w/2+.25;if(w.ax==='x')R(d.c-h,d.c+h,w.p-1.0,w.p+1.0,'doorway');else R(w.p-1.0,w.p+1.0,d.c-h,d.c+h,'doorway');}}

const owiFoot=(x,z,rot,sp)=>{const q=Math.abs(Math.round(rot/(Math.PI/2)))%2,ax=q?sp.d:sp.w,az=q?sp.w:sp.d;return{ax,az,x0:x-ax/2,x1:x+ax/2,z0:z-az/2,z1:z+az/2};};
/* the clear space in front of an item (its front faces (sin rot, cos rot)) */
function owiFront(x,z,rot,sp){const fp=owiFoot(x,z,rot,sp),fx=Math.round(Math.sin(rot)),fz=Math.round(Math.cos(rot)),r=sp.res||0;
  if(fz!==0)return fz>0?{x0:fp.x0,x1:fp.x1,z0:fp.z1,z1:fp.z1+r}:{x0:fp.x0,x1:fp.x1,z0:fp.z0-r,z1:fp.z0};
  return fx>0?{x0:fp.x1,x1:fp.x1+r,z0:fp.z0,z1:fp.z1}:{x0:fp.x0-r,x1:fp.x0,z0:fp.z0,z1:fp.z1};}
const owiItemBox=it=>({x0:it.x-it.ax/2,x1:it.x+it.ax/2,z0:it.z-it.az/2,z1:it.z+it.az/2});
function owiInRoom(room,fp){for(const q of room.rects)if(fp.x0>=q.xa-.001&&fp.x1<=q.xb+.001&&fp.z0>=q.za-.001&&fp.z1<=q.zb+.001)return true;return false;}
/* is the wall behind this point a real wall (not an opening into another part of the same room)? */
function owiWallSolid(S,x,z){for(const r of S.F.rooms)for(const q of r.rects)if(x>q.xa-.001&&x<q.xb+.001&&z>q.za-.001&&z<q.zb+.001)return false;return true;}
function owiWinBlock(S,wall,a,b){for(const w of S.P.wins){if(w.st!==S.F.i||w.wall!==wall)continue;if(a<w.b&&b>w.a)return true;}return false;}
/* does a footprint stand against an outer wall in front of a window of that wall? (also when it stands in a corner against the neighbouring wall) */
function owiTouchWin(S,fp){const Q=S.F.Q;
  if(fp.z0<Q.za+.12&&owiWinBlock(S,'za',fp.x0,fp.x1))return true;if(fp.z1>Q.zb-.12&&owiWinBlock(S,'zb',fp.x0,fp.x1))return true;
  if(fp.x0<Q.xa+.12&&owiWinBlock(S,'xa',fp.z0,fp.z1))return true;if(fp.x1>Q.xb-.12&&owiWinBlock(S,'xb',fp.z0,fp.z1))return true;return false;}
function owiFits(S,room,kind,x,z,rot,opt,wallName,runA,runB){const sp=Object.assign({},OWI_ITEM[kind],opt.dim||{}),F=S.F,fp=owiFoot(x,z,rot,sp);
  if(!owiInRoom(room,fp))return null;
  if(!sp.flat){
    for(const r of F.res){if(owiOv(fp,r,0)&&!(opt.ignore&&opt.ignore.includes(r.tag)))return null;}
    const pad=opt.pad==null?.26:opt.pad;
    for(const it of F.items){if(it.spec.flat||it.deco)continue;const small=it.spec.small||sp.small;if(owiOv(fp,owiItemBox(it),opt.pad==null&&small?.03:pad))return null;}
    if(sp.res>0){const cr=owiFront(x,z,rot,sp);for(const it of F.items){if(it.spec.flat||it.deco||it.spec.small)continue;if(owiOv(cr,owiItemBox(it),0))return null;}
      for(const r of F.res)if((r.tag==='hole'||r.tag==='stair'||r.tag==='gate')&&owiOv(cr,r,0))return null;}}
  if(sp.tall&&F.low&&F.low.length){for(const r of F.low)if(owiOv(fp,r,0))return null;}/* the ceiling under a gable roof is low near the eaves walls */
  if((sp.tall||opt.windowsBlock)&&owiTouchWin(S,fp))return null;
  return{x,z,rot,fp};}
/* place one item. opt: wall (list or false), center (true), near/far [x,z,weight], score(fn), req, pad, ignore, dim override, tag */
function owiPlace(S,room,kind,opt){opt=opt||{};const spec0=OWI_ITEM[kind];if(!spec0)return null;const sp=Object.assign({},spec0,opt.dim||{}),R=S.R,cands=[],gap=opt.gap==null?.03:opt.gap;
  const walls=opt.wall===false?[]:(opt.wall==null?['za','zb','xa','xb']:[].concat(opt.wall));
  for(const q of room.rects){
    for(const wn of walls){
      if(wn==='za'||wn==='zb'){const rot=wn==='za'?0:Math.PI,f=owiFoot(0,0,rot,sp),x0=q.xa+f.ax/2+.02,x1=q.xb-f.ax/2-.02;if(x1<x0-.001)continue;
        const z=wn==='za'?q.za+f.az/2+gap:q.zb-f.az/2-gap,wz=wn==='za'?q.za-.07:q.zb+.07,n=Math.max(1,Math.round((x1-x0)/.2));
        for(let k=0;k<=n;k++){const x=x0+(x1-x0)*(n?k/n:.5);if(!owiWallSolid(S,x-f.ax/2+.03,wz)||!owiWallSolid(S,x+f.ax/2-.03,wz))continue;const t=owiFits(S,room,kind,x,z,rot,opt,wn,x-f.ax/2,x+f.ax/2);if(t)cands.push(t);}}
      else{const rot=wn==='xa'?Math.PI/2:-Math.PI/2,f=owiFoot(0,0,rot,sp),z0=q.za+f.az/2+.02,z1=q.zb-f.az/2-.02;if(z1<z0-.001)continue;
        const x=wn==='xa'?q.xa+f.ax/2+gap:q.xb-f.ax/2-gap,wx=wn==='xa'?q.xa-.07:q.xb+.07,n=Math.max(1,Math.round((z1-z0)/.2));
        for(let k=0;k<=n;k++){const z=z0+(z1-z0)*(n?k/n:.5);if(!owiWallSolid(S,wx,z-f.az/2+.03)||!owiWallSolid(S,wx,z+f.az/2-.03))continue;const t=owiFits(S,room,kind,x,z,rot,opt,wn,z-f.az/2,z+f.az/2);if(t)cands.push(t);}}}
    if(opt.center){const rots=opt.rots||[0,Math.PI/2],m=opt.margin==null?.75:opt.margin;
      for(const rot of rots){const f=owiFoot(0,0,rot,sp);for(let x=q.xa+f.ax/2+m;x<=q.xb-f.ax/2-m+1e-6;x+=.25)for(let z=q.za+f.az/2+m;z<=q.zb-f.az/2-m+1e-6;z+=.25){const t=owiFits(S,room,kind,x,z,rot,opt,null);if(t)cands.push(t);}}}}
  if(!cands.length)return null;
  for(const c of cands){let sc=R()*(opt.jit==null?.8:opt.jit);
    if(opt.near)sc-=(opt.near[2]==null?1:opt.near[2])*Math.hypot(c.x-opt.near[0],c.z-opt.near[1]);
    if(opt.far)sc+=(opt.far[2]==null?1:opt.far[2])*Math.hypot(c.x-opt.far[0],c.z-opt.far[1]);
    if(opt.score)sc+=opt.score(c);c.sc=sc;}
  cands.sort((a,b)=>b.sc-a.sc);
  /* the best place wins unless the piece would cut a route: every doorway, room and stair gate has to stay reachable for a hero-sized body */
  const mk=c=>{const f=owiFoot(c.x,c.z,c.rot,sp),it={kind,spec:sp,x:c.x,z:c.z,rot:c.rot,ax:f.ax,az:f.az,room:room.id,req:!!opt.req,tag:opt.tag||null,seed:Math.floor(R()*1e9)};S.F.items.push(it);
    if(sp.res>0&&!sp.flat){const fr=Object.assign(owiFront(c.x,c.z,c.rot,sp),{tag:'front',of:it});S.F.res.push(fr);it.fr=fr;}return it;};
  const undo=it=>{S.F.items.pop();if(it.fr)S.F.res.pop();};
  const lim=Math.min(cands.length,opt.tries||14);
  for(let k=0;k<lim;k++){const it=mk(cands[k]);if(sp.flat||!S.baseOk||owiProve(S.P,S.F).ok)return it;undo(it);}
  if(opt.req)return mk(cands[0]);
  return null;}
/* seats around a table: chairs, stools or benches along its sides and ends; each checked like any other item, those that do not fit are left out */
function owiSeat(S,room,tbl,kinds,count){const F=S.F,R=S.R,out=[],along=Math.abs(Math.round(tbl.rot/(Math.PI/2)))%2===0,L=along?tbl.ax:tbl.az,spots=[],nL=Math.max(1,Math.floor(L/.66));
  for(let k=0;k<nL;k++){const t=((k+.5)/nL-.5)*(L-.3);spots.push({s:1,t},{s:-1,t});}spots.push({e:1},{e:-1});
  for(let i=spots.length-1;i>0;i--){const j=Math.floor(R()*(i+1)),t=spots[i];spots[i]=spots[j];spots[j]=t;}/* a real shuffle: a random comparator is not the same sort after the engine has optimised it */
  for(const sp of spots){if(out.length>=count)break;const kind=kinds[Math.floor(R()*kinds.length)],spec=OWI_ITEM[kind];let x,z,rot;
    if(sp.e){const off=(along?tbl.ax:tbl.az)/2+spec.d/2+.04;if(along){x=tbl.x+sp.e*off;z=tbl.z;rot=sp.e>0?-Math.PI/2:Math.PI/2;}else{x=tbl.x;z=tbl.z+sp.e*off;rot=sp.e>0?Math.PI:0;}}
    else{const off=(along?tbl.az:tbl.ax)/2+spec.d/2+.04;if(along){x=tbl.x+sp.t;z=tbl.z+sp.s*off;rot=sp.s>0?Math.PI:0;}else{x=tbl.x+sp.s*off;z=tbl.z+sp.t;rot=sp.s>0?-Math.PI/2:Math.PI/2;}}
    const fp=owiFoot(x,z,rot,spec);if(!owiInRoom(room,fp))continue;let ok=true;
    for(const r of F.res)if(r.tag!=='front'&&owiOv(fp,r,0)){ok=false;break;}if(!ok)continue;
    for(const it of F.items){if(it===tbl||it.spec.flat||it.deco)continue;if(owiOv(fp,owiItemBox(it),0)){ok=false;break;}}if(!ok)continue;
    const item={kind,spec:Object.assign({},spec),x,z,rot,ax:fp.ax,az:fp.az,room:room.id,req:false,seat:true,seed:Math.floor(R()*1e9)};F.items.push(item);if(S.baseOk&&!owiProve(S.P,F).ok){F.items.pop();continue;}out.push(item);}
  return out;}
/* wall decorations (tapestries, plates, herbs, a map, antlers...) go where nothing tall, no window and no doorway is in the way */
function owiDeco(S,room,n,kinds){const F=S.F,R=S.R,P=S.P;let placed=0;
  for(let tries=0;tries<n*14&&placed<n;tries++){const q=room.rects[Math.floor(R()*room.rects.length)],wn=['za','zb','xa','xb'][Math.floor(R()*4)],kind=kinds[Math.floor(R()*kinds.length)],w=kind==='plates'||kind==='antlers'?.9:.8;
    const alongX=wn==='za'||wn==='zb',lo=alongX?q.xa+w/2+.2:q.za+w/2+.2,hi=alongX?q.xb-w/2-.2:q.zb-w/2-.2;if(hi<lo)continue;const t=lo+(hi-lo)*R();
    const x=alongX?t:(wn==='xa'?q.xa:q.xb),z=alongX?(wn==='za'?q.za:q.zb):t;if(!owiWallSolid(S,alongX?t:(wn==='xa'?q.xa-.07:q.xb+.07),alongX?(wn==='za'?q.za-.07:q.zb+.07):t))continue;
    const a=t-w/2,b=t+w/2;if(owiWinBlock(S,wn,a-.1,b+.1))continue;
    const fp=alongX?{x0:a,x1:b,z0:z-.3,z1:z+.3}:{x0:x-.3,x1:x+.3,z0:a,z1:b};let bad=false;
    for(const r of F.res)if((r.tag==='doorway'||r.tag==='door'||r.tag==='leaf')&&owiOv(fp,r,.0)){bad=true;break;}if(bad)continue;
    for(const it of F.items){if(it.deco||it.spec.flat)continue;if(it.spec.tall||it.kind==='hearth'||it.kind==='hearthS'){if(owiOv(fp,owiItemBox(it),.05)){bad=true;break;}}}if(bad)continue;
    for(const d of F.items)if(d.deco&&Math.hypot(d.x-x,d.z-z)<1.0){bad=true;break;}if(bad)continue;
    const rot=wn==='za'?0:wn==='zb'?Math.PI:wn==='xa'?Math.PI/2:-Math.PI/2;
    F.items.push({kind:'deco_'+kind,deco:true,spec:{w,d:.05,h:.9,flat:0},x:alongX?t:(wn==='xa'?q.xa+.025:q.xb-.025),z:alongX?(wn==='za'?q.za+.025:q.zb-.025):t,rot,ax:w,az:.05,room:room.id,seed:Math.floor(R()*1e9)});placed++;}
  return placed;}
