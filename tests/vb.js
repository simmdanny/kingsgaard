(function(){
/* A third person view of one side of a building (open world): window.__vb(bx, bz, side 'front'|'rear', name, {dz (metres from the wall, 5), pitch, dist, t (dayT, 1500 = night), light:(fn run before the picture)}) -> status. Needs int-lib.js and ls-shot.js (I.setup first), and gshot.js on the page. */
window.__vb=async function(bx,bz,side,name,o){o=o||{};
  const b=OW.villages.flatMap(v=>v.buildings).find(q=>Math.abs(q.x-bx)<1.5&&Math.abs(q.z-bz)<1.5);if(!b)return 'no building';
  const A=b.arch,S=A.scale||b.BSc,r=A.rect0,ln=side==='front'?1:-1,lz=ln>0?r.z1*S+(o.dz||5):r.z0*S-(o.dz||5),w=owiL2W(b,0,lz),w2=owiL2W(b,0,lz-ln*3);
  window.__gs={at:w,look:[w2[0]-w[0],w2[1]-w[1]],pitch:o.pitch==null?.25:o.pitch,dist:o.dist||7,t:o.t==null?1500:o.t,name};
  const src=await (await fetch('gshot.js?'+Date.now())).text();
  if(o.pre)o.pre();
  return await eval(src);};
return 'ok';})()
