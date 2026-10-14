/* =====================================================================================================================
   KINGSGAARD INTERIORS (1/5): shared constants, entrances and zones.

   One idea runs through the whole system: a building is a LOCAL frame (metres, x right, z towards the door, y up from the foundation
   origin of the building group). Everything about an interior (floors, rooms, stairs, furniture, colliders, the entrance steps) is written
   in that frame, so a building that is rotated, moved or built on a slope needs no per-building offsets. World <-> local is one formula:
       local  = ( dx*cos - dz*sin ,  dx*sin + dz*cos )      world = ( x + lx*cos + lz*sin ,  z - lx*sin + lz*cos )
   where (dx,dz) is the world offset from the building and cos/sin belong to the building rotation (the same one owObb uses).

   The walkable surface of an enterable building is a short chain: terrain -> entrance steps -> foundation ledge -> door sill -> floor.
   Every link is generated from the same numbers (the floor height, the terrain under the steps, the door), so they always meet.
   ===================================================================================================================== */
const OWI={
  /* archetype -> interior kind. Everything else stays exterior only for now. */
  types:{hut:'hut',cot:'cottage',cottage:'cottage',stonecottage:'cottage',town:'house',house:'house',timberhouse:'house',stonehouse:'large',tavern:'tavern',scroll:'scroll',rowh:'row',rowc:'row',rowt:'row',merchant:'merchant',smith:'forge',carpenter:'carpenter',hall:'hall',storage:'storage'},
  noEnter:{},/* (the hall used to be here - furnished and seen through its windows only; since its grand entrance it is entered like the rest: its plan keeps solid for the generator, its leaf is o.solidLeaf) */
  RAD:.27,        /* the hero's collision radius, metres */
  PT:.12,         /* partition thickness */
  PW:1.0,         /* clear width of an interior doorway */
  DH:2.0,         /* clear height of an interior doorway */
  CUT:1.5,        /* walls and roof are cut away this far above the floor the hero stands on */
  LOAD:62,UNLOAD:100,
  reg:[],         /* every furnished building of the current world */
  list:[],        /* the ones that can be entered */
  loaded:new Set(),
  cur:null,       /* the building whose cutaway is active */
  NARROW:.92,     /* the width of a flight in a house too narrow for the drawn 1.05 m (m) */
  fill:0,  /* 0..1: how far the hero is inside a house (the ambient light is raised a little by it, kingsgaard.html anim) */
  STAIRFRONT:.9,  /* the least floor in front of the first step of a flight (m): a walker with the hero's radius must be able to stand and turn there */
  MINBESIDE:1.0,  /* the least width the floor beside a stair bay may have (m); a house with less is given fewer upper floors (see owiRead) */
  cutOn:true,     /* the cutaway is used (third person only: see camSet) */
  stats:{plans:0,builds:0,frees:0}
};
/* The interface for a new enterable building type: OWI.register('smith','house') makes smithies use the house interior. A type that needs its own layout or
   furniture registers a kind with hooks: OWI.custom.forge={layout(P,F,tools){...},furnish(S,room){...return true when the room was furnished}}, then OWI.register('smith','forge'). */
OWI.custom={};
OWI.register=(type,kind,hooks)=>{OWI.types[type]=kind;if(hooks)OWI.custom[kind]=hooks;};
OWI.kindOf=(type,pl)=>pl&&pl.passage?'tunnel':OWI.types[type];
/* which buildings get an interior at all (seen through the windows, and entered where the entrance allows), and which of those can be entered */
OWI.canFurnish=(type,pl)=>{if(!OWI.types[type]||!pl)return false;if(pl.passage)return type==='rowc'&&!!pl.row;return !pl.noDoor&&!pl.noFill0;};
OWI.canEnter=(type,pl)=>OWI.canFurnish(type,pl)&&!OWI.noEnter[type];
const owiL2W=(b,lx,lz)=>{const c=Math.cos(b.rot),s=Math.sin(b.rot);return[b.x+lx*c+lz*s,b.z-lx*s+lz*c];};
const owiW2L=(b,x,z)=>{const c=Math.cos(b.rot),s=Math.sin(b.rot),dx=x-b.x,dz=z-b.z;return[dx*c-dz*s,dx*s+dz*c];};
/* The roof as seen from inside. A slab is a box whose upper face is the roof surface (it meets the top of the wall at the wall plate) and whose thickness lies below that: over the room, near the eaves walls, the roof
   comes down to dip = t / cos(pitch) under the top of the walls (31 cm for shingle at 36 degrees, 65 cm for thatch). u(s) is the height of the underside over the top of the walls, s being the coordinate across the ridge
   (z for a ridge along x, x for a ridge along z). A gable roof is lined by a coved ceiling (flat in the middle, following the underside near the eaves walls); hipped and gambrel roofs get a flat ceiling under their lowest point. */
function owiRoofShape(A){const rf=A&&A.roof;if(!rf||rf.rise==null||!A.storeys||!A.storeys.length)return null;const rm=ROOFM[rf.mat]||ROOFM.shingle,BS=A.scale||OW_BS,top=A.storeys[A.storeys.length-1].rect,ax=rf.axis||'x',span=ax==='x'?top.z1-top.z0:top.x1-top.x0,s2=span/2,rise=rf.rise;
  let tan=rise/s2;if(rf.kind==='gambrel'){const hs=s2+rm.ov,xk=hs*.55,yk=rise*.62,drop=rise*rm.ov/s2;tan=Math.max(tan,(yk+drop)/(hs-xk));}
  const dip=rm.t*Math.sqrt(1+tan*tan)*BS,c=(ax==='x'?(top.z0+top.z1):(top.x0+top.x1))/2*BS;return{kind:rf.kind||'gable',axis:ax,c,s2:s2*BS,tan,dip,coved:(rf.kind||'gable')==='gable'&&dip>.1};}
const owiRoofU=(rs,s)=>-rs.dip+rs.tan*(rs.s2-Math.abs(s-rs.c));
/* a stable per-building seed: world seed + where the building stands + what it is. The same building always gets the same plan. */
function owiSeed(b){let h=(OW.seed|0)^0x5bd1e995;const k=Math.round(b.x*8)*374761393+Math.round(b.z*8)*668265263;h=Math.imul(h^(k>>>0),2246822519);for(let i=0;i<b.type.length;i++)h=Math.imul(h^b.type.charCodeAt(i),3266489917);h^=h>>>15;return h>>>0;}

/* ---------------------------------------------------------------------------------------------------------------------
   The entrance. Steps are measured outwards from the front edge of the foundation ledge (s = 0). The ledge and the sill are at floor level;
   tread k (k = 1 nearest) has its top k risers below the floor; beyond the last tread the walker is back on the terrain.
   --------------------------------------------------------------------------------------------------------------------- */
function owiEntrance(wx,wz,ox,oz,Fy){
  const tread=.4,gAt=s=>owH(wx+ox*s,wz+oz*s);let n=2;
  for(let it=0;it<7;it++){const send=(n-1)*tread+.2,d=Fy-gAt(send),nn=Math.max(1,Math.min(18,Math.ceil(d/.19-.002)));if(nn===n)break;n=nn;}
  const run=(n-1)*tread,gE=gAt(run+.2),r=(Fy-gE)/n;
  return{n,tread,run,r,Fy,gEnd:gE};}
/* how high a building has to stand so that the door is never buried: the floor ends up at least 20 cm above the ground along the first 2 m of approach */
function owiNeedHi(wx,wz,ox,oz,BSc){let g=-1e9;for(const s of[.25,.65,1.05,1.45,1.85])g=Math.max(g,owH(wx+ox*s,wz+oz*s));return g+.2-OW_FH*BSc;}

/* ---- where the entrances are: one for a house, a front and a back one for a passage through a row ---- */
function owiPlanEnter(A,BSc,x,z,rot,hi,tunnel){const cs=Math.cos(rot),sn=Math.sin(rot);let u,w;
  if(tunnel){const d=A.doors.find(q=>q.kind==='passage'&&q.face==='front');if(!d)return null;u=d.u*BSc;w=d.w*BSc;}else{const L0=A.leaf||A.doorSolid;if(!L0)return null;u=L0.u*BSc;w=L0.w*BSc;}
  /* The entrance as the world was generated (the first release's numbers): the floor height of the house, and the steps that the village layout carved the approach for. A saved world must load as the same world, so what
     the generator sees (the carved approach, the rooms of the layout, the floor height) never changes. */
  const L=.07*BSc,zLf=A.rect0.z1*BSc,zLb=A.rect0.z0*BSc,mk=Ld=>{const ends=[{sgn:1,zL:zLf,zF:zLf+L+Ld,u}];if(tunnel)ends.push({sgn:-1,zL:zLb,zF:zLb-L,u});for(const d of ends){d.ox=sn*d.sgn;d.oz=cs*d.sgn;d.wx=x+cs*u+sn*d.zF;d.wz=z-sn*u+cs*d.zF;}return ends;};
  const ends=mk(0);for(const d of ends)hi=Math.max(hi,owiNeedHi(d.wx,d.wz,d.ox,d.oz,BSc));
  for(const d of ends){const spec=owiEntrance(d.wx,d.wz,d.ox,d.oz,hi+OW_FH*BSc);spec.width=A.porch?2*.25*BSc+.55:w+.7;spec.wing=.2;if(spec.n>14)return null;d.spec=spec;}
  /* A large building (7 m or more across) has a grand entrance instead: steps about a third of the front wide, a landing 0.8 m deep in front of the door (a floor-level ledge: the hero's height there is the floor's) and wing walls 36 cm
     thick. It is only what is built and walked on: the first numbers stay in 'gen' for the generator (the carve and the places where nothing is put). */
  let gend=null;if(!tunnel&&!A.porch&&A.W*BSc>=7){const ge=mk(.8),d=ge[0],spec=owiEntrance(d.wx,d.wz,d.ox,d.oz,hi+OW_FH*BSc);
    if(spec.n<=14){spec.width=Math.min(5.4,Math.max(w+1.8,A.W*BSc*.34));spec.grand=true;spec.wing=.36;d.spec=spec;gend=ge;}}
  const gen=ends,fe=gend||ends,f=fe[0];return{enter:{u,ends:fe,gen,zL:f.zL,zF:f.zF,spec:f.spec,wx:f.wx,wz:f.wz},hi};}

/* ---- zones and the carved approach ---- */
function owiZones(b){const A=b.arch,BS=A.scale,e=b.enter;let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
  for(const s of A.storeys){const r=s.rect;x0=Math.min(x0,r.x0*BS);x1=Math.max(x1,r.x1*BS);z0=Math.min(z0,r.z0*BS);z1=Math.max(z1,r.z1*BS);}
  e.F={x0:x0-.12,x1:x1+.12,z0:z0-.12,z1:Math.max(z1,e.zL)+.12};
  for(const nd of e.ends){const hw=nd.spec.width/2+(nd.spec.wing||.2),run=nd.spec.run;
    if(nd.sgn>0){nd.E={x0:nd.u-hw,x1:nd.u+hw,z0:nd.zF-.2,z1:nd.zF+run+.3};
      /* the carved approach runs to the far edge of the footprint the village layout reserved in front of the house, so that the steps join the free ground */
      const ext=((b.pl&&b.pl.hd)||0)*b.BSc+.3;nd.C={x0:nd.E.x0-.5,x1:nd.E.x1+.5,z0:nd.E.z0,z1:Math.max(nd.E.z1+.5,ext+.7)};}
    else{nd.E={x0:nd.u-hw,x1:nd.u+hw,z0:nd.zF-run-.3,z1:nd.zF+.2};const ext=((b.pl&&(b.pl.hdBack||b.pl.hd))||0)*b.BSc+.3;nd.C={x0:nd.E.x0-.5,x1:nd.E.x1+.5,z0:Math.min(nd.E.z0-.5,-(ext+.7)),z1:nd.E.z1};}}
  /* the zones of the generator: the same computation with the entrance the world was generated with (a grand entrance is bigger than it, and it must not change what the generator sees) */
  if(e.gen!==e.ends){for(const nd of e.gen){const hw=nd.spec.width/2+(nd.spec.wing||.2),run=nd.spec.run;
    if(nd.sgn>0){const E={x0:nd.u-hw,x1:nd.u+hw,z0:nd.zF-.2,z1:nd.zF+run+.3},ext=((b.pl&&b.pl.hd)||0)*b.BSc+.3;nd.C={x0:E.x0-.5,x1:E.x1+.5,z0:E.z0,z1:Math.max(E.z1+.5,ext+.7)};}}}
  /* the landing: from the wall to the top step, as wide as the steps zone. A grand entrance has 0.8 m of landing that neither the footprint (12 cm past the wall) nor the steps (from 20 cm before
     the top step) reached, and a hero standing there dropped to the ground under the slab. Only the hero's zones use it (owiKind); nd.E and nd.C stay as they were (villagers' solids, the generator) */
  for(const nd of e.ends){const hw=nd.spec.width/2+(nd.spec.wing||.2);nd.L={x0:nd.u-hw,x1:nd.u+hw,z0:Math.min(nd.zL,nd.zF),z1:Math.max(nd.zL,nd.zF)};}
  e.E=e.ends[0].E;e.C=e.ends[0].C;e.F.z0=Math.min(e.F.z0,...e.ends.map(n=>n.zL-.12));}
const owiIn=(r,lx,lz)=>lx>=r.x0&&lx<=r.x1&&lz>=r.z0&&lz<=r.z1;
/* 1 = inside the footprint, 2 = on the steps, 3 = on the carved approach, 0 = none of these */
function owiKind(e,l){if(owiIn(e.F,l[0],l[1]))return 1;for(const nd of e.ends)if(owiIn(nd.E,l[0],l[1])||(nd.L&&owiIn(nd.L,l[0],l[1])))return 2;for(const nd of e.ends)if(owiIn(nd.C,l[0],l[1]))return 3;return 0;}
/* free the approach in the occupancy grid. The footprint margin that owMarkObb paints would otherwise wall the steps in; cells that belonged to something
   else (a neighbour, a prop, a road) are left exactly as they were. */
function owiCarve(b,snap){const pts=[];for(const nd of b.enter.gen){const C=nd.C;for(let lz=C.z0;lz<=C.z1;lz+=.4)for(let lx=C.x0;lx<=C.x1;lx+=.4){const w=owiL2W(b,lx,lz),c=owCell(w[0],w[1]);pts.push([c.r,c.c]);}}
  for(const[r,c]of pts){if(r<0||c<0||r>=H||c>=W)continue;const k=r*W+c;if(snap.has(k)){const v=snap.get(k);if(grid[r][c]===2&&v!==2)grid[r][c]=v===0?1:v;/* open ground becomes path, so that nothing else is grown or put on the approach */}}}
const owiNearApproach=(b,x,z,r)=>{const l=owiW2L(b,x,z);for(const nd of b.enter.gen){const C=nd.C;if(l[0]>C.x0-r&&l[0]<C.x1+r&&l[1]>C.z0-r&&l[1]<C.z1+r)return true;}return false;};
/* the same for the entrance as it is built (a grand entrance is wider than the one the generator carved for) */
const owiNearSteps=(b,x,z,r)=>{const l=owiW2L(b,x,z);for(const nd of b.enter.ends){const C=nd.C;if(l[0]>C.x0-r&&l[0]<C.x1+r&&l[1]>C.z0-r&&l[1]<C.z1+r)return true;}return false;};
/* remember what the cells of the approach held before the building painted its footprint over them */
function owiSnapshot(b){const snap=new Map();for(const nd of b.enter.gen){const C=nd.C;for(let lz=C.z0;lz<=C.z1;lz+=.4)for(let lx=C.x0;lx<=C.x1;lx+=.4){const w=owiL2W(b,lx,lz),c=owCell(w[0],w[1]);if(c.r<0||c.c<0||c.r>=H||c.c>=W)continue;snap.set(c.r*W+c.c,grid[c.r][c.c]);}}return snap;}

/* ---- circle against axis-aligned boxes in the local frame ---- */
function owiHit(col,lx,lz,lv,r){const n=col.n,X0=col.x0,X1=col.x1,Z0=col.z0,Z1=col.z1,M=col.mk;
  for(let i=0;i<n;i++){if(!(M[i]&lv))continue;const dx=lx<X0[i]?X0[i]-lx:lx>X1[i]?lx-X1[i]:0;if(dx>=r)continue;const dz=lz<Z0[i]?Z0[i]-lz:lz>Z1[i]?lz-Z1[i]:0;if(dx*dx+dz*dz<r*r)return true;}return false;}
/* push a circle out of every box it overlaps (a few passes, so that corners round off and walls are slid along rather than stuck to) */
function owiPush(col,lx,lz,lv,r){let x=lx,z=lz;const n=col.n,X0=col.x0,X1=col.x1,Z0=col.z0,Z1=col.z1,M=col.mk;
  for(let pass=0;pass<4;pass++){let moved=false;
    for(let i=0;i<n;i++){if(!(M[i]&lv))continue;const cx=x<X0[i]?X0[i]:x>X1[i]?X1[i]:x,cz=z<Z0[i]?Z0[i]:z>Z1[i]?Z1[i]:z,dx=x-cx,dz=z-cz,d2=dx*dx+dz*dz;if(d2>=r*r)continue;
      if(d2>1e-12){const d=Math.sqrt(d2),k=(r-d)/d;x+=dx*k;z+=dz*k;}
      else{const l=x-X0[i],rr=X1[i]-x,t=z-Z0[i],bt=Z1[i]-z,m=Math.min(l,rr,t,bt);if(m===l)x=X0[i]-r;else if(m===rr)x=X1[i]+r;else if(m===t)z=Z0[i]-r;else z=Z1[i]+r;}
      moved=true;}
    if(!moved)break;}
  return[x,z];}
function owiColList(){return{n:0,x0:[],x1:[],z0:[],z1:[],mk:[],add(x0,x1,z0,z1,mk){if(x1-x0<1e-4||z1-z0<1e-4)return;this.x0.push(x0);this.x1.push(x1);this.z0.push(z0);this.z1.push(z1);this.mk.push(mk==null?255:mk);this.n++;},
  fin(){this.x0=Float32Array.from(this.x0);this.x1=Float32Array.from(this.x1);this.z0=Float32Array.from(this.z0);this.z1=Float32Array.from(this.z1);this.mk=Uint8Array.from(this.mk);return this;}};}

/* can a walker get from open ground to the foot of the steps? The village is finished, so the occupancy grid says what really stands there. */
function owiEndOpen(b,nd){const w0=owiL2W(b,nd.u,nd.zF+nd.sgn*(nd.spec.run+.6)),a=owCell(w0[0],w0[1]);if(a.r<1||a.c<1||a.r>=H-1||a.c>=W-1||grid[a.r][a.c]===2)return false;
  const seen=new Set([a.r*W+a.c]),q=[[a.r,a.c]],R0=Math.ceil(7/TS);
  for(let h=0;h<q.length;h++){const r=q[h][0],c=q[h][1],p=tw(c,r);if(Math.hypot(p.x-w0[0],p.z-w0[1])>5)return true;
    for(const d of[[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+d[0],cc=c+d[1];if(rr<1||cc<1||rr>=H-1||cc>=W-1||Math.abs(rr-a.r)>R0||Math.abs(cc-a.c)>R0)continue;const k=rr*W+cc;if(seen.has(k))continue;seen.add(k);if(grid[rr][cc]===2)continue;q.push([rr,cc]);}}
  return false;}
const owiApproachOpen=b=>b.enter.ends.every(nd=>owiEndOpen(b,nd));
/* a house whose door cannot be reached keeps its steps and gets its door shut again */
function owiDisable(b){const i=OWI.list.indexOf(b);if(i>=0)OWI.list.splice(i,1);owiFreeMesh(b);owdFree(b);b.enter=null;b.ic=null;if(b.arch.leaf)owiLeafMesh(b);OWI.stats.disabled=(OWI.stats.disabled||0)+1;
  /* a house whose door is blocked is still furnished: its windows show the interior. A passage with a blocked end has nothing to show. */
  if(b.tunnel){const j=OWI.reg.indexOf(b);if(j>=0)OWI.reg.splice(j,1);b.tunnel=false;}}
/* the cells round the approach that belong to something else (a neighbour, a fence, a prop): the hero is stopped by these. The house's own footprint margin, which the carve left in the grid, is not one of them. */
function owiForeign(b){const e=b.enter,pl=b.pl,BSc=b.BSc,cs=Math.cos(b.rot),sn=Math.sin(b.rot),row=!!pl.row,hdb=pl.hdBack||pl.hd,sh=row?0:(pl.hd-hdb)/2*BSc,cx=b.x+sn*sh,cz=b.z+cs*sh,hw=pl.w/2*BSc+(row?0:.4),hd=row?pl.d/2*BSc:(pl.hd+hdb)/2*BSc+.3,out=new Set();
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const nd of e.ends)for(const lx of[nd.C.x0-1.5,nd.C.x1+1.5])for(const lz of[nd.C.z0-1.5,nd.C.z1+1.5]){const w=owiL2W(b,lx,lz);x0=Math.min(x0,w[0]);x1=Math.max(x1,w[0]);z0=Math.min(z0,w[1]);z1=Math.max(z1,w[1]);}
  const a=owCell(x0,z0),d=owCell(x1,z1);
  for(let r=Math.max(0,Math.min(a.r,d.r));r<=Math.min(H-1,Math.max(a.r,d.r));r++)for(let c2=Math.max(0,Math.min(a.c,d.c));c2<=Math.min(W-1,Math.max(a.c,d.c));c2++){if(grid[r][c2]!==2)continue;
    const p=tw(c2,r),dx=p.x-cx,dz=p.z-cz,u=dx*cs-dz*sn,w=dx*sn+dz*cs;if(Math.abs(u)<=hw&&Math.abs(w)<=hd)continue;out.add(r*W+c2);}
  return out;}
function owiAudit(){for(const b of OWI.list.slice()){b.enter.fg=owiForeign(b);if(!owiApproachOpen(b))owiDisable(b);}}
const owiFgOk=(zs,x,z)=>{const a=owCell(x,z),k=a.r*W+a.c;for(const q of zs)if(q.k>1&&q.b.enter.fg&&q.b.enter.fg.has(k))return false;return true;};
