(function(){
/* Settlements: the tier of every house (Tier 3 is the lowest in a Tier 4 or Tier 5 settlement), how the kinds of house change from the centre outwards, how far from a circle a Tier 4 town is, and whether
   the front of every building can be reached from the square over free ground. Run after __iw.setup(seed). */
const out={tiers:{},rows:[],shape:[],reach:[]};const houseTypes=new Set(['hut','cot','cottage','stonecottage','town','house','timberhouse','stonehouse','rowh','rowc','rowt']);
const bad=[];
for(const v of OW.villages){if(v.tier<4)continue;const T=v.tier,bands=[0,0,0].map(()=>({rowc:0,rowh:0,rowt:0,town:0,other:0}));
  const cen=OW.villages.length&&v.sqr?v.sqr:{x:v.x,z:v.z};
  for(const b of v.buildings){if(!houseTypes.has(b.type))continue;const t=b.arch?b.arch.tier:null;if(b.type==='hut'||b.type==='cot'||b.type==='cottage'||(t!=null&&t<3))bad.push(v.name+' t'+T+' '+b.type+' arch tier '+t+' @'+b.x.toFixed(0)+','+b.z.toFixed(0));
    const d=Math.hypot(b.x-cen.x,b.z-cen.z)/v.rad,bi=d<.33?0:d<.66?1:2;const k=['rowc','rowh','rowt','town'].includes(b.type)?b.type:'other';bands[bi][k]++;}
  out.rows.push(v.name+' tier '+T+(v.orgShape?' ('+v.orgShape+')':'')+': centre '+JSON.stringify(bands[0])+' middle '+JSON.stringify(bands[1])+' outer '+JSON.stringify(bands[2]));
  /* the shape: principal axes of the building positions, and how much of the radius the farthest building uses along each */
  const P=v.buildings.map(b=>[b.x,b.z]),n=P.length,mx=P.reduce((a,p)=>a+p[0],0)/n,mz=P.reduce((a,p)=>a+p[1],0)/n;let sxx=0,szz=0,sxz=0;for(const p of P){const dx=p[0]-mx,dz=p[1]-mz;sxx+=dx*dx;szz+=dz*dz;sxz+=dx*dz;}
  const tr=sxx+szz,det=sxx*szz-sxz*sxz,l1=tr/2+Math.sqrt(Math.max(0,tr*tr/4-det)),l2=tr/2-Math.sqrt(Math.max(0,tr*tr/4-det));
  const ds=P.map(p=>Math.hypot(p[0]-v.x,p[1]-v.z)),far=Math.max(...ds),meanD=ds.reduce((a,b)=>a+b,0)/n,sdD=Math.sqrt(ds.reduce((a,b)=>a+(b-meanD)**2,0)/n);
  out.shape.push(v.name+' tier '+T+(v.orgShape?' ('+v.orgShape+')':'')+': '+n+' buildings, elongation '+Math.sqrt(l1/Math.max(1,l2)).toFixed(2)+' (1 = round), farthest '+far.toFixed(0)+' m of radius '+v.rad+', distance spread '+(sdD/meanD).toFixed(2));
  /* reachability over the occupancy grid from the square: 4-connected cells that are not blocked (2) */
  {const s0=owCell(cen.x,cen.z),seen=new Uint8Array(H*W),q=[[s0.r,s0.c]];seen[s0.r*W+s0.c]=1;let qi=0;const lim=v.rad*1.7;while(qi<q.length){const[r,c]=q[qi++];const p=tw(c,r);if(Math.hypot(p.x-cen.x,p.z-cen.z)>lim)continue;for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc;if(rr<1||cc<1||rr>=H-1||cc>=W-1||seen[rr*W+cc])continue;const g=grid[rr][cc];if(g===2)continue;seen[rr*W+cc]=1;q.push([rr,cc]);}}
    let un=0,tot=0;for(const sp of v.spots){if(!sp.b.enter&&!sp.b.arch)continue;tot++;const a=owCell(sp.x,sp.z);let ok=false;for(let dr=-2;dr<=2&&!ok;dr++)for(let dc=-2;dc<=2&&!ok;dc++){const rr=a.r+dr,cc=a.c+dc;if(rr>=0&&cc>=0&&rr<H&&cc<W&&seen[rr*W+cc])ok=true;}if(!ok)un++;}
    out.reach.push(v.name+': '+(tot-un)+' of '+tot+' building fronts connect to the square');}}
return (bad.length?'FAIL '+bad.length+' houses below Tier 3: '+bad.slice(0,8).join(' | '):'PASS no hut or cottage and nothing below Tier 3 in any Tier 4 or Tier 5 settlement ('+OW.villages.filter(v=>v.tier>=4).reduce((a,v)=>a+v.buildings.filter(b=>houseTypes.has(b.type)).length,0)+' houses checked)')+'\n'+out.rows.join('\n')+'\n'+out.shape.join('\n')+'\n'+out.reach.join('\n');})()
