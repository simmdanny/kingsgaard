(function(){
/* The front door standing open must not shut anything off. For every enterable building of the seeds (window.__seeds, default [11]): a flood over the building's own ground-floor
   colliders with the hero's radius (6 cm grid) from just inside the door, once with the doorway free and no leaf and once with the leaf standing open inwards (slot B as
   owdSyncCol sets it). Reports the buildings where a room or the foot of a flight is reached with the door shut but not (or much less) with it open.
   Needs int-lib.js. Returns {n, leaf, bad, base} and one line per building that the open leaf hurts (base: rooms already poorly reached with the door shut). */
const seeds=window.__seeds||[11],R=OWI.RAD,cs=window.__cs||.06,out=[],stat={n:0,leaf:0,bad:0,base:0};
function grid(b,P,mask){const Q=P.st[0].Q,x0=Q.xa-.2,z0=Q.za-.2,nx=Math.ceil((Q.xb-Q.xa+.4)/cs)+1,nz=Math.ceil((Q.zb-Q.za+.4)/cs)+1,col=b.ic.col;
  const free=new Uint8Array(nx*nz);for(let k=0;k<nz;k++)for(let j=0;j<nx;j++)free[k*nx+j]=owiHit(col,x0+j*cs,z0+k*cs,mask,R)?0:1;return{x0,z0,nx,nz,free};}
function flood(G,sx,sz){const{x0,z0,nx,nz,free}=G,ix=x=>Math.round((x-x0)/cs),iz=z=>Math.round((z-z0)/cs);let s=-1,bd=1e9;
  for(let k=Math.max(0,iz(sz)-6);k<=Math.min(nz-1,iz(sz)+6);k++)for(let j=Math.max(0,ix(sx)-6);j<=Math.min(nx-1,ix(sx)+6);j++){if(!free[k*nx+j])continue;const d=(j-ix(sx))**2+(k-iz(sz))**2;if(d<bd){bd=d;s=k*nx+j;}}
  const seen=new Uint8Array(nx*nz);if(s<0)return seen;seen[s]=1;const q=[s];
  for(let h=0;h<q.length;h++){const c=q[h],j=c%nx,k=(c-j)/nx;for(const[dj,dk]of[[1,0],[-1,0],[0,1],[0,-1]]){const J=j+dj,K=k+dk;if(J<0||K<0||J>=nx||K>=nz)continue;const id=K*nx+J;if(seen[id]||!free[id])continue;seen[id]=1;q.push(id);}}return seen;}
/* the share of the free cells of some rects that the flood reached (the stairs themselves are not floor) */
function cover(G,seen,rects,P){const{x0,z0,nx,nz,free}=G;let tot=0,got=0;for(let k=0;k<nz;k++)for(let j=0;j<nx;j++){const x=x0+j*cs,z=z0+k*cs;let inR=false;for(const r of rects)if(x>=r.xa&&x<=r.xb&&z>=r.za&&z<=r.zb)inR=true;if(!inR||!free[k*nx+j])continue;
  if(P.stairs.some(f=>x>f.x0-.05&&x<f.x1+.05&&z>f.z0-.05&&z<f.z1+.05))continue;tot++;if(seen[k*nx+j])got++;}return tot?got/tot:1;}
function check(b){const P=b.ic.P,F0=P.floors[0],c=b.ic.col,Q=P.st[0].Q;if(c.dA==null)return null;
  const run=open=>{c.mk[c.dA]=0;if(open){const q=owdOpenBox(owdG(b),1);c.x0[c.dB]=q[0];c.x1[c.dB]=q[1];c.z0[c.dB]=q[2];c.z1[c.dB]=q[3];c.mk[c.dB]=OWI_GND;}else c.mk[c.dB]=0;
    const G=grid(b,P,1),seen=flood(G,P.door.u,Q.zb-.45),r={};for(const rm of F0.rooms)r[rm.id]=cover(G,seen,rm.rects,P);
    for(const f of P.stairs)if(f.from===0){const s=Math.sign(f.zt-f.zb),xc=(f.x0+f.x1)/2,z=f.zb-s*.45;r['stair'+f.id]=cover(G,seen,[{xa:xc-.06,xb:xc+.06,za:z-.06,zb:z+.06}],P);}return r;};
  const a=run(false),o=run(true);owdSyncCol(b);return{a,o};}
for(const seed of seeds){__iw.setup(seed);
  for(const b of OWI.list){if(b.pl&&((b.pl.solid&&!b.pl.solidLeaf)||b.pl.open))continue;if(!owdLeaf(b))continue;if(!b.ic)owiEnsurePlan(b);if(!b.ic.col)continue;stat.n++;
    const r=check(b);if(!r)continue;stat.leaf++;let bad=[],base=[];for(const k in r.o){if(r.a[k]<.65)base.push(k+' '+(r.a[k]*100).toFixed(0)+'%');else if(r.o[k]<.65||r.o[k]<r.a[k]-.25)bad.push(k+' '+(r.a[k]*100).toFixed(0)+'->'+(r.o[k]*100).toFixed(0)+'%');}
    if(base.length)stat.base++;if(bad.length){stat.bad++;const P=b.ic.P;out.push('seed '+seed+' '+b.type+' ('+P.kind+') @'+b.x.toFixed(0)+','+b.z.toFixed(0)+' u='+P.door.u.toFixed(2)+' hs='+P.hingeSide+' walls='+P.floors[0].walls.map(w=>w.ax+w.p.toFixed(2)+'/'+w.doors.map(d=>d.c.toFixed(2)).join(',')).join(';')+' Qzb='+P.st[0].Q.zb.toFixed(2)+': '+bad.join(', ')+(base.length?' [door shut: '+base.join(', ')+']':''));}
    else if(base.length&&window.__showBase)out.push('DOOR SHUT seed '+seed+' '+b.type+' @'+b.x.toFixed(0)+','+b.z.toFixed(0)+': '+base.join(', '));}}
return JSON.stringify(stat)+'\n'+out.join('\n');})()
