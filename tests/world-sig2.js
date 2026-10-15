(function(){
/* The streamed world's signature (v42 on): for each seed the regions round the start, the keep, the village sites of the 5 x 5 cells round it, heights of the
   land on a 9 x 9 grid 2.4 km wide, the streams and lakes there - and with window.__ws2.build also the buildings of the villages built at the start (I.setup:
   their order is what a save's village state is kept by). Run it in two builds and compare (tests/world-sig2-base.json holds the output of the current generator, WG_VER 7 (world look 3: the trails between hamlets dip 9 cm - stamped
   ground, which this signature does not sample, so its numbers are those of WG_VER 6, kept as -gv6: the Great Elder Circle's
   mountain of two peaks, its cuesta ridges and sub-mountains); -gv5 that of v48 (bigger elderglades, rounded knolls, river valleys, lakes kept apart); -gv4 that of v47 (the Great Elder Circle), -gv3 that of v46, -gv2 that of v42-v45).
   A world must generate what its predecessor generated: a save is the seed and the state of each village by its key. window.__ws2 = {seeds:[1,2,3], build:false}
   (it re-seeds the generator: reload the page after it). */
const o=window.__ws2||{},seeds=o.seeds||[1,2,3,4,5,6,7,8,9,10,11,12],out={};
for(const seed of seeds){wgInit(seed);wsReset();wfReset();const K=wsKeep(),sites=[],regs=[],h=[];
  for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++)regs.push(wgRegCell(a,b).type);
  for(let b=-2;b<=2;b++)for(let a=-2;a<=2;a++){const s=wsSite(a,b);sites.push(s?s.name+':'+s.size+'@'+Math.round(s.x)+','+Math.round(s.z)+','+s.h.toFixed(2):'-');}
  for(let j=0;j<9;j++)for(let i=0;i<9;i++)h.push(wgHeightRaw(-1200+i*300,-1200+j*300).toFixed(2));
  const H=wgHydroIn(-1200,-1200,1200,1200);let L=0;for(const s of H.segs)L+=s.hw;
  out[seed]={keep:[K.x,K.z,+K.h.toFixed(2)],regs:regs.join(''),sites,h:h.join(' '),hyd:[H.segs.length,H.lakes.length,+L.toFixed(2)]};
  if(o.build){window.__iw.setup(seed);out[seed].v=OW.villages.map(v=>v.key+' '+v.name+' t'+v.tier+' '+v.buildings.map(b=>b.type+'@'+Math.round(b.x)+','+Math.round(b.z)).join(' '));}}
return JSON.stringify(out);})()
