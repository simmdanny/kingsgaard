(async function(){
/* A dark corner behind large furniture: at night, in houses with a fire and a tall piece (wardrobe, cupboard, shelf) on the same floor, the floor right behind the piece (on the side away from the fire) against the floor at the same distance
   from the fire in the open (no piece or wall between), as drawn (L.probe: the hero is at that place, so the real shadowed point light is the nearest fire). Also two plain numbers from the grid: the baked fire light and the baked ambient occlusion
   behind the piece against the open place. Needs int-lib.js and ls-shot.js (I.setup(3) first). window.__dc = {pass, fail, out:[...], data:[...]} */
const I=window.__iw,L=window.__ls,R=window.__dc={pass:0,fail:0,out:[],data:[]};
const ok=(c,m)=>{R[c?'pass':'fail']++;R.out.push((c?'PASS ':'FAIL ')+m);return c;};
meta.dayT=1500;
const inRoom=(F,x,z)=>F.rooms.some(r=>r.rects.some(q=>x>=q.xa+.3&&x<=q.xb-.3&&z>=q.za+.3&&z<=q.zb-.3));
const segSolid=(b,F,x1,z1,x2,z2)=>{const S=owlmSegs(F);return S.length&&owlmSegHit(S,x1,z1,x2,z2);};
const freeCell=(b,lv,x,z)=>!(b.ic.col&&owiHit(b.ic.col,x,z,1<<lv,OWI.RAD+.1))&&!b.ic.P.stairs.some(f=>x>f.x0-.5&&x<f.x1+.5&&z>Math.min(f.z0,f.z1)-.5&&z<Math.max(f.z0,f.z1)+.5);
let n=0;
for(const b of OWI.list.filter(q=>q.arch&&q.arch.leaf&&!q.tunnel)){if(n>=8)break;owiEnsurePlan(b);const P=b.ic.P;if(!P.floors)continue;
  for(const F of P.floors){if(n>=8)break;const fires=F.items.filter(it=>OWIL_SRC[it.kind]&&OWIL_SRC[it.kind].fire);if(!fires.length)continue;const fr=fires[0],s=OWIL_SRC[fr.kind],fx=fr.x+Math.sin(fr.rot)*s.f,fz=fr.z+Math.cos(fr.rot)*s.f;
    for(const it of F.items){const sp=OWI_ITEM[it.kind];if(!sp||!sp.tall||OWIL_SRC[it.kind]||it.deco)continue;const fp=owiFoot(it.x,it.z,it.rot,sp),cx=(fp.x0+fp.x1)/2,cz=(fp.z0+fp.z1)/2,dx=cx-fx,dz=cz-fz,d=Math.hypot(dx,dz);if(d<1.6||d>5.5)continue;
      const half=Math.max(fp.x1-fp.x0,fp.z1-fp.z0)/2,ux=dx/d,uz=dz/d,bx=cx+ux*(half+.55),bz=cz+uz*(half+.55);if(!inRoom(F,bx,bz)||!freeCell(b,F.i,bx,bz))continue;
      const db=Math.hypot(bx-fx,bz-fz);let op=null;for(let a=35;a<=180&&!op;a+=12)for(const sg of[1,-1]){const th=sg*a*Math.PI/180,rx=ux*Math.cos(th)-uz*Math.sin(th),rz=ux*Math.sin(th)+uz*Math.cos(th),ox=fx+rx*db,oz=fz+rz*db;
        if(!inRoom(F,ox,oz)||!freeCell(b,F.i,ox,oz)||segSolid(b,F,fx,fz,ox,oz))continue;let blocked=false;for(const j of F.items){const q=OWI_ITEM[j.kind];if(!q||j===it||q.low||q.small||j.deco)continue;const f2=owiFoot(j.x,j.z,j.rot,q);const t=(a2,b2,c2,d2)=>0;if(ox>f2.x0-.2&&ox<f2.x1+.2&&oz>f2.z0-.2&&oz<f2.z1+.2){blocked=true;break;}}
        if(!blocked){op=[ox,oz];break;}}
      if(!op)continue;
      const pb=L.probe(b,F.i,bx,bz,{t:1500,frames:50}),po=L.probe(b,F.i,op[0],op[1],{t:1500,frames:50});
      /* the grid, as baked */
      owlmInit(b);const lm=b.ic.lm||owlmBake(b),B=lm.tb.image.data,cs=lm.cs,idx=(x,z)=>{const i=Math.floor((x-lm.X0)/cs),j=Math.floor((z-lm.Z0)/cs);return((j)*lm.TW+F.i*(lm.W1+1)+i)*4;};
      const gb=B[idx(bx,bz)+3]/255,go=B[idx(op[0],op[1])+3]/255,ab=B[idx(bx,bz)+1]/255,ao=B[idx(op[0],op[1])+1]/255;
      R.data.push({b:b.type+'@'+Math.round(b.x)+','+Math.round(b.z),lv:F.i,piece:it.kind,fireDist:+db.toFixed(1),behind:pb.lum,open:po.lum,gridFire:[+gb.toFixed(2),+go.toFixed(2)],gridAO:[+ab.toFixed(2),+ao.toFixed(2)]});n++;break;}}}
ok(R.data.length>=3,'places measured: '+R.data.length);
ok(R.data.filter(r=>r.behind<r.open*.8).length>=Math.ceil(R.data.length*.7),'behind the piece the floor is clearly darker than the open floor at the same distance from the fire ('+R.data.map(r=>r.behind+'/'+r.open).join(', ')+')');
ok(R.data.every(r=>r.behind>=6),'and not black: the colour and the detail of the floor are still there ('+R.data.map(r=>r.behind).join(', ')+')');
return JSON.stringify(R);})()
