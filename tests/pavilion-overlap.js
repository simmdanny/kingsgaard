(function(){
/* Over many seeds: no pavilion (platform and steps) overlaps the footprint of another building or another pavilion. window.__po = {seeds:[...]} Needs int-lib.js */
const I=window.__iw,seeds=(window.__po&&window.__po.seeds)||[1,2,3,4,5,6],out={n:0,touch:[],seeds:{}};
const rectsOf=b=>{const A=b.arch;if(!A||!A.rect0)return null;const S=A.scale||b.BSc,r=A.rect0,pad=b.pl&&b.pl.open?.07*S:0,e=b.enter&&b.enter.ends&&b.enter.ends[0],run=e&&b.pl&&b.pl.open?e.spec.run:0;return[[r.x0*S-pad,r.z0*S-pad],[r.x1*S+pad,r.z0*S-pad],[r.x1*S+pad,r.z1*S+pad+run],[r.x0*S-pad,r.z1*S+pad+run]].map(q=>owiL2W(b,q[0],q[1]));};
const sat=(A,B)=>{for(const P of[A,B])for(let i=0;i<4;i++){const a=P[i],c=P[(i+1)%4],nx=-(c[1]-a[1]),nz=c[0]-a[0];let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9;for(const q of A){const d=q[0]*nx+q[1]*nz;a0=Math.min(a0,d);a1=Math.max(a1,d);}for(const q of B){const d=q[0]*nx+q[1]*nz;b0=Math.min(b0,d);b1=Math.max(b1,d);}if(a1<=b0||b1<=a0)return false;}return true;};
for(const seed of seeds){I.setup(seed);let n=0,t=0;for(const v of OW.villages)for(const b of v.buildings){if(!(b.pl&&b.pl.open))continue;n++;const A=rectsOf(b);if(!A)continue;
  for(const c of v.buildings){if(c===b)continue;if(Math.hypot(c.x-b.x,c.z-b.z)>b.r*3+c.r*3+8)continue;const B=rectsOf(c);if(B?sat(A,B):(!c.arch&&Math.hypot(c.x-b.x,c.z-b.z)<c.r*.7+b.r*.6)){t++;if(out.touch.length<8)out.touch.push('seed '+seed+' '+b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' touches '+c.type+'@'+c.x.toFixed(0)+','+c.z.toFixed(0));}}}
  out.seeds[seed]=n+' pavilions, '+t+' overlaps';out.n+=n;}
return JSON.stringify(out);})()
