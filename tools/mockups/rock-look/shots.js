const G=wgGreatNear(-3579,165),C0=G.crags[0],C1=G.crags[1],out=[];
let gf=null;for(const f of WF.great.values())if(Math.hypot(f.x-G.x,f.z-G.z)<5)gf=f;if(!gf)gf=wfGreat(G);const FT=wrFeet(gf),F0=FT[0],Wx=-Math.sin(gf.yaw),Wz=Math.cos(gf.yaw);
const ONLY=window.__only||null;const want=n=>!ONLY||ONLY.includes(n);
const V={
 'spire':()=>LOOK('spire',[F0.x+Wx*620,owH(F0.x,F0.z)+60,F0.z+Wz*620],[F0.x,owH(F0.x,F0.z)+70,F0.z],{}),
 'ribs':()=>LOOK('ribs',[C0.x-C0.ca*420+C0.sa*120,C0.hc+C0.H*.2+330,C0.z-C0.sa*420-C0.ca*120],[C0.x-C0.ca*170,null,C0.z-C0.sa*170],{}),
 'ribs2':()=>LOOK('ribs2',[C1.x-C1.ca*480+C1.sa*200,null,C1.z-C1.sa*480-C1.ca*200],[C1.x-C1.ca*90,null,C1.z-C1.sa*90],{h:200}),
 'ribs3':()=>LOOK('ribs3',[C0.x-C0.ca*150+C0.sa*330,null,C0.z-C0.sa*150-C0.ca*330],[C0.x-C0.ca*110,null,C0.z-C0.sa*110],{h:60}),
 'lake-aerial':()=>LOOK('lake-aerial',[-1571+230,null,423+260],[-1571,null,423],{h:150}),
 'lake-low':()=>LOOK('lake-low',[-1571+120,null,423+150],[-1571,null,423],{h:35}),
 'hill2':()=>LOOK('hill2',[-1489-150,null,1079+170],[-1489,185,1079],{h:25}),
};
for(const k in V)if(want(k))out.push(await V[k]());
return out;
