/* VERBATIM from tools/mockups/river/surface-study.html, lines 542-586. Bank stones (clusters of slabs/blocks/small, gaps, snapped to the real shore, rooted into the bed), rocks in the water (+ contact patch, pebbles), pebble clusters at the waterline.
   Port this code as it is (same functions, same constants, same noise). Only the plumbing around it may change. */
/* ===================== the stream's banks: rounded warm stones along both edges, partly under water; rocks in the water ===================== */
PAL.bank={r:[[.34,.21,.14],[.56,.39,.27],[.75,.59,.43],[.90,.79,.62]],warm:[1.05,1.0,.92],cool:[.94,.95,1.03]};
const bankU=palU('bank',1.0,0);bankU.uSunDir={value:SUN.clone()};bankU.uDbg={value:0};bankU.uMossP={value:.45};bankU.uIvy={value:0};bankU.uMossTop={value:.3};bankU.uUpK={value:.16};bankU.uUW={value:1};bankU.uWL={value:0};
const bankMat=boulderMat(bankU);
const BSH=[],BKIND=[];/* 0-3 flat slabs, 4-8 blocks, 9-11 small stones */
for(let i=0;i<4;i++){BSH.push(makeStone(3000+i*41,{x0:1.0,xr:.6,y0:.28,yr:.18,z0:.75,zr:.4}));BKIND.push(0);}
for(let i=0;i<5;i++){BSH.push(makeStone(3200+i*43,{x0:.7,xr:.5,y0:.5,yr:.4,z0:.6,zr:.4}));BKIND.push(1);}
for(let i=0;i<3;i++){BSH.push(makeStone(3400+i*47,{x0:.55,xr:.4,y0:.4,yr:.35,z0:.5,zr:.35}));BKIND.push(2);}
const BKI=BSH.map(()=>[]),bankSpots=[],bankTops=[];
function seedWith(r,want){for(let k=0;k<40;k++){const s=r();if(want(s))return s;}return r();}
function putStone(x,z,y,sc,yaw,tilt,r,mossy,ivy,groundY,kind){const pool=BSH.map((g,i)=>i).filter(i=>kind==null||BKIND[i]===kind),si=pool[Math.floor(r()*pool.length)],ud=BSH[si].userData;
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt[0],yaw,tilt[1]));
  const h0=(ud.ymax-ud.ymin)*sc,bedY=H(x,z),ys=Math.min(3.5,Math.max(1,(y-(bedY-.28*h0))/h0));/* (reach down into the bed: never end at the water) */
  const yy=y-ud.ymax*sc*ys;/* (y is where its top sits) */groundY=bedY;
  const M=new THREE.Matrix4().compose(new THREE.Vector3(x,yy,z),q,new THREE.Vector3(sc,sc*ys,sc));
  const sd=seedWith(r,s=>(fract7(s)<.75)===mossy&&(fract11(s)<.3)===ivy);
  BKI[si].push({M,tint:new THREE.Color(kind===0?.15*r():r(),(groundY+20)/60,sd)});return{x,z,top:y,rw:ud.rx*sc,h:h0*ys,si,M,yaw,bed:bedY};}
const fract7=s=>(s*7.13)%1,fract11=s=>(s*11.3)%1;const waterRocks=[];
{const r=mkRng(777);
 /* along each bank: a cluster of 2-6 stones (now and then one big flat slab, blocks, small stones), then a gap where the grass meets the water */
 const at=(u)=>{const i=Math.max(0,Math.min(RIV.length-2,Math.floor(u))),f=u-i,a=RIV[i],b=RIV[i+1];return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,b[0]-a[0],b[1]-a[1]];};
 for(const side of[-1,1]){let u=r()*2;while(u<RIV.length-3){const nCl=2+Math.floor(r()*5);let v=u;
   for(let c=0;c<nCl&&v<RIV.length-3;c++){const [px,pz,tx,tz]=at(v),tl=Math.hypot(tx,tz),nx=-tz/tl*side,nz=tx/tl*side,w=rivHalf(pz);
     const roll=r(),kind=roll<.22?0:roll<.68?1:2;
     const size=kind===0?2.2+1.0*r():kind===1?1.0+.7*r():.45+.4*r();const sc=size/2/1.15;
     const rel=(kind===0?-.25:-.05)+.25*(r()-.4)+(kind===2?(r()-.5)*.6:0);let off=w+rel;for(let it=0;it<4;it++){const bk=rivBank(px+nx*off,pz+nz*off);off+=(bk.w+rel)-bk.dd;}/* (on the real, wobbly shore) */const x=px+nx*off,z=pz+nz*off;
     const topAbove=kind===0?.18+.22*r():kind===1?.4+.5*r():.12+.3*r();
     const flat=kind===0||r()<.45,tilt=flat?[(r()-.5)*.08,(r()-.5)*.08]:[(r()-.5)*.6,(r()-.5)*.6];
     const yaw=Math.atan2(nx,nz)+(r()-.5)*.6;/* (roughly along the bank) */
     const st=putStone(x,z,WL+topAbove,sc,yaw,tilt,r,r()<.7,false,WL-.05,kind);st.kind=kind;bankSpots.push(st);bankTops.push([st,nx,nz]);
     v+=(size*.55+.15*r())/1.0;}
   u=v+1.5+3.5*r();}}
 /* rocks in the water: mossy tops */
 for(const [t,o,sz] of [[50,.15,1.1],[55,-.45,.8],[60,.5,1.3],[64,-.25,.9],[69,.35,.7],[74,-.4,1.0],[78,.2,.8]]){const a=RIV[t],b=RIV[t+1],tx=b[0]-a[0],tz=b[1]-a[1],tl=Math.hypot(tx,tz);
   const w=rivHalf(a[1]),x=a[0]-tz/tl*o*w,z=a[1]+tx/tl*o*w;const sc=sz/2/1.1;
   const st=putStone(x,z,WL+sz*(.3+.2*r()),sc,r()*6.283,[(r()-.5)*.2,(r()-.5)*.2],r,true,false,WL-.05);bankSpots.push(st);waterRocks.push(st);
   solids.push([x,z,st.rw*.85,1]);for(let j=0;j<5;j++){const a=r()*6.283,d=st.rw*(1.0+.7*r());placeBoulder(x+Math.cos(a)*d,z+Math.sin(a)*d,7000+t*13+j,.08+.1*r());}}/* (a darker contact patch and pebbles on the bed) */
 /* pebbles: small clusters at the waterline in the gaps */
 for(let c=0;c<26;c++){const i=Math.floor(r()*(RIV.length-2)),side=r()<.5?-1:1,a=RIV[i],b=RIV[i+1],tx=b[0]-a[0],tz=b[1]-a[1],tl=Math.hypot(tx,tz),nx=-tz/tl*side,nz=tx/tl*side;
   let d=rivHalf(a[1]),x=a[0]+nx*d,z=a[1]+nz*d;for(let it=0;it<3;it++){const bk=rivBank(x,z);d+=(bk.w+.05)-bk.dd;x=a[0]+nx*d;z=a[1]+nz*d;}
   if(bankSpots.some(q=>Math.hypot(q.x-x,q.z-z)<q.rw+.4)||rivBank(x,z).steep>.35)continue;const m=3+Math.floor(r()*6);
   for(let j=0;j<m;j++){const u=(r()-.5)*1.4,v=(r()-.5)*.6;placeBoulder(x-nz*u+nx*v,z+nx*u+nz*v,9000+c*31+j,.07+.12*r());}}
}
const bankMeshes=[];BKI.forEach((list,si)=>{if(!list.length)return;const m=new THREE.InstancedMesh(BSH[si],bankMat,list.length);
  list.forEach((b,i)=>{m.setMatrixAt(i,b.M);m.setColorAt(i,b.tint);});m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;m.castShadow=m.receiveShadow=true;scene.add(m);bankMeshes.push(m);});
