(function(){
/* The market pavilions (stalls and market halls, pavilion.js): each one is a walkable structure. For every pavilion of the world: the hero walks from the square up the steps onto the platform (the height follows the steps, no jump over 25 cm, the platform is at floor height) and to the middle;
   at least 40% of the platform floor is reachable for a hero's circle from the steps (free floor between posts and counters, not a solid box); the posts, counters and the edge of the platform are solid (a walk into a post or over the edge from the side is stopped); every collider box lies
   within the platform plus its ledge and the steps (no big invisible box); the roof is at least 1.7 m over the floor; the roof is cut away like a house's when the hero stands under it in third person. Needs int-lib.js. Returns PASS/FAIL lines. */
const I=window.__iw,out=[],res={pass:0,fail:0};const ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);return c;};
const H=heroU,list=[];for(const v of OW.villages)for(const b of v.buildings)if((b.type==='stall'||b.type==='market')&&b.enter)list.push(b);
const bad=[];let n=0,reach=[],solidBad=[],bigBox=[],headBad=[],cutBad=[];const R=OWI.RAD;
const kinds={};for(const b of list)kinds[b.type]=(kinds[b.type]||0)+1;
for(const b of list.slice(0,14)){const e=b.enter,nd=e.ends[0],A=b.arch,r0=A.rect0,BS=b.BSc,tag=b.type+' T'+b.v.tier+'@'+b.x.toFixed(0)+','+b.z.toFixed(0);
  let st=false;for(const d of[7,5,3.5,2.5]){const q=I.ground(b,d);I.tele(q[0],q[1]);owView(true);for(let i=0;i<40;i++){OWI.tScan=-9;heroUpdate(1/30);owiTick(1/30);}if(!OWI.cb){st=true;break;}}
  const c=owiL2W(b,0,(r0.z0+r0.z1)/2*BS-.2),ph=I.walkTo(c[0],c[1],{maxT:16,tol:.4});n++;for(let i=0;i<30;i++){heroUpdate(1/30);owiTick(1/30);}const y=H.g.position.y,fy=b.hi+(b.ic?b.ic.P.floors[0].y:OW_FH*BS);
  if(!ph.ok||Math.abs(y-fy)>.12||ph.maxDy>.25)bad.push(tag+' ok '+ph.ok+' y '+y.toFixed(2)+' floor '+fy.toFixed(2)+' maxDy '+ph.maxDy.toFixed(2)+' at '+JSON.stringify(ph.at));
  /* reachable floor */
  const col=b.ic&&b.ic.col;if(col){const cs=.12,x0=r0.x0*BS,x1=r0.x1*BS,z0=r0.z0*BS,z1=r0.z1*BS,nx=Math.ceil((x1-x0)/cs),nz=Math.ceil((z1-z0)/cs),fr=new Uint8Array(nx*nz);let free=0;
    for(let k=0;k<nz;k++)for(let j=0;j<nx;j++){const x=x0+(j+.5)*cs,z=z0+(k+.5)*cs;if(!owiHit(col,x,z,1,R)){fr[k*nx+j]=1;free++;}}
    const sj=Math.floor((nd.u-x0)/cs),sk=nz-1;let seen=new Uint8Array(nx*nz),qu=[],reached=0;let sj2=sj;for(let t=0;t<nx&&!fr[sk*nx+sj2];t++)sj2=(sj+t>=nx)?sj:sj+t;
    let k0=sk;while(k0>0&&!fr[k0*nx+sj2])k0--;if(fr[k0*nx+sj2]){qu.push(k0*nx+sj2);seen[k0*nx+sj2]=1;}
    for(let h=0;h<qu.length;h++){const q=qu[h],j=q%nx,k=(q-j)/nx;reached++;for(const[dj,dk]of[[1,0],[-1,0],[0,1],[0,-1]]){const J=j+dj,K=k+dk;if(J<0||K<0||J>=nx||K>=nz)continue;const i=K*nx+J;if(seen[i]||!fr[i])continue;seen[i]=1;qu.push(i);}}
    reach.push(+(reached/Math.max(1,free)).toFixed(2)+'/'+(free*cs*cs).toFixed(1)+'m2');if(reached<.4*nx*nz*0.25&&solidBad.length<5)solidBad.push(tag+' reachable cells '+reached+' of '+nx*nz);
    /* every box lies near the platform */
    for(let i=0;i<col.n;i++){const m=.6+nd.spec.run+.2;if(col.x0[i]<x0-m||col.x1[i]>x1+m||col.z0[i]<z0-m||col.z1[i]>z1+m+nd.spec.run+.4)if(bigBox.length<5)bigBox.push(tag+' box '+i+' outside the platform');}
    /* a post is solid */
    const po=A.pav.posts[0];if(po){const px=(po[0]+po[1])/2*BS,pz=(po[2]+po[3])/2*BS;const w=owiL2W(b,px,pz+1.0);I.tele(w[0],w[1]);for(let i=0;i<20;i++){heroUpdate(1/30);owiTick(1/30);}const tgt=owiL2W(b,px,pz-.1);I.walkTo(tgt[0],tgt[1],{maxT:3,tol:.05});const l=owiW2L(b,H.x,H.z);if(Math.hypot(l[0]-px,l[1]-pz)<R-.03&&solidBad.length<5)solidBad.push(tag+' walked into a post (distance '+Math.hypot(l[0]-px,l[1]-pz).toFixed(2)+')');}
    /* the side edge is closed: from the ground beside the platform towards its middle */
    const sx=owiL2W(b,x1+1.4,(z0+z1)/2),mid=owiL2W(b,(x0+x1)/2,(z0+z1)/2);I.tele(sx[0],sx[1]);for(let i=0;i<20;i++){heroUpdate(1/30);owiTick(1/30);}I.walkTo(mid[0],mid[1],{maxT:4,tol:.1});const lp=owiW2L(b,H.x,H.z);if(lp[0]<x1-.1&&lp[0]>x0+.1&&Math.abs(H.g.position.y-fy)<.15&&solidBad.length<5)solidBad.push(tag+' walked onto the platform over its side edge');}
  const rise=(A.roof.ridgeY-A.storeys[0].floorY)*BS,eave=(A.storeys[0].ceilY-A.storeys[0].floorY)*BS;if(eave<1.7&&headBad.length<5)headBad.push(tag+' headroom '+eave.toFixed(2)+' m');
  /* standing under the roof (third person) the roof is cut away so that the camera sees the hero; away from it the roof is back */
  camSet('tp');const q2=owiL2W(b,0,0);I.tele(q2[0],q2[1]);for(let i=0;i<40;i++){heroUpdate(1/30);owiTick(1/30);}owiAnim(5);const roofOff=b.roofPlane.constant<1e4,postsKept=b.topPlane.constant>=owiCeilY(b,b.ic.P,0)-.02;
  const q3=I.ground(b,7);I.tele(q3[0],q3[1]);for(let i=0;i<60;i++){heroUpdate(1/30);owiTick(1/30);}owiAnim(5);const roofBack=b.roofPlane.constant>=1e4;if(!(roofOff&&postsKept&&roofBack)&&cutBad.length<5)cutBad.push(tag+' roof cut under it '+roofOff+' posts kept '+postsKept+' roof back '+roofBack);}
/* a pavilion reaches a little beyond the lot the placement gave it: it must not touch another building or another pavilion (platform and steps against the physical footprint of every other building of the settlement) */
const rectsOf=b=>{const A=b.arch;if(!A||!A.rect0)return null;const S=A.scale||b.BSc,r=A.rect0,pad=b.pl&&b.pl.open?.07*S:0,e=b.enter&&b.enter.ends&&b.enter.ends[0],run=e&&b.pl&&b.pl.open?e.spec.run:0;return[[r.x0*S-pad,r.z0*S-pad],[r.x1*S+pad,r.z0*S-pad],[r.x1*S+pad,r.z1*S+pad+run],[r.x0*S-pad,r.z1*S+pad+run]].map(q=>owiL2W(b,q[0],q[1]));};
const sat=(A,B)=>{for(const P of[A,B])for(let i=0;i<4;i++){const a=P[i],c=P[(i+1)%4],nx=-(c[1]-a[1]),nz=c[0]-a[0];let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9;for(const q of A){const d=q[0]*nx+q[1]*nz;a0=Math.min(a0,d);a1=Math.max(a1,d);}for(const q of B){const d=q[0]*nx+q[1]*nz;b0=Math.min(b0,d);b1=Math.max(b1,d);}if(a1<=b0||b1<=a0)return false;}return true;};
const touch=[];for(const v of OW.villages)for(const b of v.buildings){if(!(b.pl&&b.pl.open))continue;const A=rectsOf(b);if(!A)continue;for(const c of v.buildings){if(c===b)continue;if(Math.hypot(c.x-b.x,c.z-b.z)>b.r*3+c.r*3+8)continue;const B=rectsOf(c);if(B?sat(A,B):(!c.arch&&Math.hypot(c.x-b.x,c.z-b.z)<c.r*.7+b.r*.6)){if(touch.length<6)touch.push(b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' touches '+c.type+'@'+c.x.toFixed(0)+','+c.z.toFixed(0));}}}
ok(touch.length===0,'no pavilion (platform and steps) overlaps the footprint of another building'+(touch.length?' '+touch.join(' | '):''));
ok(list.length>0,'there are pavilions in the world: '+JSON.stringify(kinds));
ok(bad.length===0,'the hero walks up the steps to the middle of every pavilion, standing at floor height with no jump ('+n+' checked)'+(bad.length?' '+bad.slice(0,4).join(' | '):''));
ok(solidBad.length===0,'posts and the platform edge are solid and the floor between them is reachable ('+reach.join(', ')+')'+(solidBad.length?' '+solidBad.join(' | '):''));
ok(bigBox.length===0,'no collider box reaches beyond the platform and its steps'+(bigBox.length?' '+bigBox.join(' | '):''));
ok(headBad.length===0,'the roof is at least 1.7 m over the platform'+(headBad.length?' '+headBad.join(' | '):''));
ok(cutBad.length===0,'standing under the roof (third person) the roof is cut away, the posts stay, and the roof is back when the hero walks away'+(cutBad.length?' '+cutBad.join(' | '):''));
res.out=out;return JSON.stringify(res);
})()
