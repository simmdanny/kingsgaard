(function(){
const out=[],types=['hut','cot','town','rowh','rowc','cottage','stonecottage','house','timberhouse','stonehouse','tavern','smith','stable','storage','shed','carpenter','hall','merchant'];
const _v=new THREE.Vector3();
function aabb(p){const g=p.geo;if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox,m=p.m;let x0=1e9,y0=1e9,z0=1e9,x1=-1e9,y1=-1e9,z1=-1e9;for(let i=0;i<8;i++){_v.set(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z).applyMatrix4(m);x0=Math.min(x0,_v.x);y0=Math.min(y0,_v.y);z0=Math.min(z0,_v.z);x1=Math.max(x1,_v.x);y1=Math.max(y1,_v.y);z1=Math.max(z1,_v.z);}return{x0,y0,z0,x1,y1,z1};}
const _iv=new THREE.Matrix4();
function prep(p){const g=p.geo;if(!g.boundingBox)g.computeBoundingBox();return{k:p.k,col:p.col,inv:new THREE.Matrix4().copy(p.m).invert(),bb:g.boundingBox,size:Math.max(g.boundingBox.max.x-g.boundingBox.min.x,g.boundingBox.max.y-g.boundingBox.min.y,g.boundingBox.max.z-g.boundingBox.min.z)};}
function volumeHits(parts,x0,x1,y0,y1,z0,z1,skip){const found=[];const pt=new THREE.Vector3();for(const q of parts){if(skip&&skip(q))continue;let inside=false;
  for(let i=0;i<=4&&!inside;i++)for(let j=0;j<=6&&!inside;j++)for(let k=0;k<=3&&!inside;k++){pt.set(x0+(x1-x0)*i/4,y0+(y1-y0)*j/6,z0+(z1-z0)*k/3).applyMatrix4(q.inv);const b=q.bb,e=.002;if(pt.x>b.min.x+e&&pt.x<b.max.x-e&&pt.y>b.min.y+e&&pt.y<b.max.y-e&&pt.z>b.min.z+e&&pt.z<b.max.z-e)inside=true;}
  if(inside)found.push(q);}return found;}
const rep={};let total=0,withDoor=0;
function audit(type,seed,tier){
  const R=mulberry(seed*131+tier),pl=OWB[type].plan(R,{wealth:.5,tier,slotW:1.1+R()*.6,slotD:1.7});const kb=kitBuilder();const info=OWB[type].build(kb.P,R,pl)||{};const A=info.arch;total++;if(!A||!A.doors.length)return;withDoor++;
  const parts=[];for(const k in kb.B)for(const p of kb.B[k])parts.push(prep({k,col:p.col,geo:p.geo,m:p.m}));
  const add=(key,v)=>{(rep[type+'|'+key]=rep[type+'|'+key]||[]).push(v);};
  for(const d of A.doors){if(d.kind==='balcony')continue;const front=d.face==='front',D=A.D,top=d.y0+d.h;
    const mx=(a,b)=>front?[a,b]:[-b,-a],[xa,xb]=mx(d.u-d.w/2+.015,d.u+d.w/2-.015);
    /* 1. the free space in front of the opening (walking space) */
    const zf=front?[D/2+.02,D/2+.4]:[-D/2-.4,-D/2-.02];
    const f1=volumeHits(parts,xa,xb,d.y0+.03,top-.05,zf[0],zf[1],q=>q.k==='f'||q.size<.06);
    if(f1.length)add('blocked-in-front',tier+':'+f1.map(q=>q.k+q.col.toString(16)).join(','));
    /* 2. the wall slot of the opening may only contain the door leaf */
    const zs=front?[D/2-OW_T+.006,D/2-.006]:[-D/2+.006,-D/2+OW_T-.006];
    const f2=volumeHits(parts,xa,xb,d.y0+.03,top-.02,zs[0],zs[1],q=>q.col===pl.doorCol);
    if(f2.length)add('wall-fills-opening',tier+':'+f2.map(q=>q.k+q.col.toString(16)).join(','));
    /* 3. head room: the roof must not enter the doorway zone (opening plus a hand's width above it, a body's width in front) */
    const f3=volumeHits(parts,xa-.05,xb+.05,top+.005,top+.07,zf[0]-.04,zf[1],q=>q.k!=='r');
    if(f3.length)add('roof-meets-doorway',tier);
    /* 4. nothing of the doorway (lintel, arch, hood) may reach above its own storey */
    const st=A.storeys[0].ceilY,zone=front?[D/2-.05,D/2+.12]:[-D/2-.12,-D/2+.05];const f4=volumeHits(parts,xa-.12,xb+.12,st+.012,st+.2,zone[0],zone[1],q=>q.k==='r'||q.k==='u'||q.k==='f'||q.size>.5);
    if(f4.length)add('doorway-parts-above-storey',tier+':'+f4.map(q=>q.k).join(','));
    if(d.h*A.BS<1.7||d.w*A.BS<.85||top>st-.03)add('proportions',tier+':h='+(d.h*A.BS).toFixed(2)+',w='+(d.w*A.BS).toFixed(2)+',gap='+(st-top).toFixed(2));
  }}
const N=window.__N||60;
for(const t of types)for(let tier=1;tier<=5;tier++)for(let i=0;i<N;i++)audit(t,i+1,tier);
const keys=Object.keys(rep).sort();out.push('buildings audited='+total+' with doors='+withDoor);
if(!keys.length)out.push('NO ISSUES');
keys.forEach(k=>{const a=rep[k];const byTier={};a.forEach(x=>{const t=String(x).split(':')[0];byTier[t]=(byTier[t]||0)+1;});out.push(k+' x'+a.length+' tiers '+JSON.stringify(byTier)+(typeof a[0]==='string'&&a[0].includes(':')?' e.g. '+a[0]:''));});
return out.join('\n');})()
