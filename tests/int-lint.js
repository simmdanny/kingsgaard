(function(){
/* Layout rules checked on every generated plan: nothing in a wall, nothing in a doorway, nothing over a window, nothing inside anything else. */
const I=window.__iw,seeds=window.__seeds||[11,23,37],bad={},ex={},cnt={plans:0,floors:0,items:0};
const note=(k,m)=>{bad[k]=(bad[k]||0)+1;if((ex[k]=ex[k]||[]).length<3)ex[k].push(m);};
const box=i=>({x0:i.x-i.ax/2,x1:i.x+i.ax/2,z0:i.z-i.az/2,z1:i.z+i.az/2});
const ov=(a,b,p)=>a.x0<b.x1-p&&a.x1>b.x0+p&&a.z0<b.z1-p&&a.z1>b.z0+p;
for(const seed of seeds){I.setup(seed);
  for(const b of OWI.list){const P=owiEnsurePlan(b).P;cnt.plans++;const tag=seed+' '+b.type+' t'+P.tier+' @'+b.x.toFixed(0)+','+b.z.toFixed(0);
    for(const F of P.floors){cnt.floors++;const Q=F.Q,solid=F.items.filter(i=>!i.deco&&!i.spec.flat);
      for(const it of F.items){cnt.items++;const bx=box(it);
        /* inside a room, inside the floor */
        if(!it.deco){let inRoom=false;for(const r of F.rooms)for(const q of r.rects)if(bx.x0>=q.xa-.003&&bx.x1<=q.xb+.003&&bx.z0>=q.za-.003&&bx.z1<=q.zb+.003)inRoom=true;if(!inRoom)note('item outside its room',tag+' '+it.kind);}
        /* never in a doorway or the way in */
        if(!it.deco&&!it.spec.flat)for(const r of F.res)if((r.tag==='doorway'||r.tag==='door'||r.tag==='hole'||r.tag==='stair'||r.tag==='gate'||r.tag==='leaf')&&ov(bx,r,.02))note('item in a reserved zone ('+r.tag+')',tag+' f'+F.i+' '+it.kind);
        /* nothing in the stairwell */
        if(!it.deco)for(const f of P.stairs)if((F.i===f.from||F.i===f.to)&&ov(bx,{x0:f.x0,x1:f.x1,z0:f.z0,z1:f.z1},.02))note('item in the stairwell',tag+' '+it.kind);
        /* tall things never stand in front of a window */
        if(it.spec.tall&&!it.deco)for(const w of P.wins){if(w.st!==F.i)continue;const wall=w.wall;let touch=false,a,c;
          if(wall==='za'&&bx.z0<Q.za+.12){touch=true;a=bx.x0;c=bx.x1;}else if(wall==='zb'&&bx.z1>Q.zb-.12){touch=true;a=bx.x0;c=bx.x1;}else if(wall==='xa'&&bx.x0<Q.xa+.12){touch=true;a=bx.z0;c=bx.z1;}else if(wall==='xb'&&bx.x1>Q.xb-.12){touch=true;a=bx.z0;c=bx.z1;}
          if(touch&&a<w.b&&c>w.a&&w.y1>.4)note('tall item in front of a window',tag+' '+it.kind+' wall '+wall);}
        /* a bed or table that sits in a fireplace: nothing else overlaps a hearth's box or its clear front */
      }
      for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++){const A=solid[i],B=solid[j];if(A.seat&&B.seat)continue;if(ov(box(A),box(B),.015))note('two items overlap',tag+' '+A.kind+'+'+B.kind);}
      /* the clear space in front of a piece is clear of other solid pieces */
      for(const r of F.res){if(r.tag!=='front')continue;for(const o of solid){if(o===r.of||o.spec.small)continue;if(ov(box(o),r,.02))note('piece blocks the front of another',tag+' '+o.kind+' vs '+(r.of&&r.of.kind));}}
      /* hearths never share a spot with a bed or table */
    }
    /* windows: the plan must agree with the building's own wall openings */
    const wl=b.arch.windows.filter(w=>!w.attic).length;if(P.wins.length<wl-b.arch.windows.filter(w=>w.shop&&w.storey>0).length)note('windows lost',tag);}}
return JSON.stringify(cnt)+'\n'+(Object.keys(bad).length?Object.keys(bad).map(k=>k+': '+bad[k]+'  e.g. '+ex[k].join(' | ')).join('\n'):'NO RULE VIOLATIONS');})()
