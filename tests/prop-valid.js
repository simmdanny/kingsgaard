(function(){
/* Validation of the props that owTownDress put in a world (dev hook window.__propLog; hidden ghost props have no parts and are skipped). Counts, per kind: props that overlap another prop (boxes of their parts overlap in x, z and y by more than 4 cm),
   props inside the footprint of a house (the footprint obb of the building), props on the doorway and the steps of an enterable building (owiNearSteps: the zone of the entrance as built, with a margin of the prop's own radius), and props
   standing on the middle of a street or road segment (the ground segments of OW.G are not kept, so this one uses OW.roads and the village nets). Needs int-lib.js. window.__seeds = [..] */
const I=window.__iw,seeds=window.__seeds||[3],S={props:0,overlap:0,inHouse:0,onSteps:0,byKind:{},ex:[]};
const add=(k,m,e)=>{S[k]++;const o=S.byKind[e.kind]||(S.byKind[e.kind]={n:0,overlap:0,inHouse:0,onSteps:0});o[k]++;if(S.ex.length<12)S.ex.push(m+' '+e.kind+' at '+e.x.toFixed(0)+','+e.z.toFixed(0));};
for(const seed of seeds){window.__propLog=[];I.setup(seed);const log=window.__propLog;window.__propLog=null;
  const L=[];for(const e of log){if(!e.parts.length)continue;const g=mergeParts(e.parts);g.computeBoundingBox();const bb=g.boundingBox.clone();g.dispose();L.push({e,bb});}
  const bs=OW.villages.flatMap(v=>v.buildings);
  for(const o of L){const e=o.e;S.props++;(S.byKind[e.kind]||(S.byKind[e.kind]={n:0,overlap:0,inHouse:0,onSteps:0})).n++;}
  /* overlaps: a grid hash of the boxes */
  const G=new Map();const key=(i,j)=>i+','+j;for(let n=0;n<L.length;n++){const b=L[n].bb;for(let i=Math.floor(b.min.x/4);i<=Math.floor(b.max.x/4);i++)for(let j=Math.floor(b.min.z/4);j<=Math.floor(b.max.z/4);j++){const k=key(i,j);(G.get(k)||G.set(k,[]).get(k)).push(n);}}
  const done=new Set();
  for(const[k,arr]of G){for(let a=0;a<arr.length;a++)for(let c=a+1;c<arr.length;c++){const A=L[arr[a]],B=L[arr[c]],pk=arr[a]*1e6+arr[c];if(done.has(pk))continue;done.add(pk);
    const a1=A.bb,b1=B.bb,m=.04;if(a1.min.x+m<b1.max.x&&b1.min.x+m<a1.max.x&&a1.min.z+m<b1.max.z&&b1.min.z+m<a1.max.z&&a1.min.y+m<b1.max.y&&b1.min.y+m<a1.max.y){
      /* a laundry line / signpost are thin and tall: only count when the footprints overlap in more than a quarter of the smaller one */
      const ox=Math.min(a1.max.x,b1.max.x)-Math.max(a1.min.x,b1.min.x),oz=Math.min(a1.max.z,b1.max.z)-Math.max(a1.min.z,b1.min.z),sa=(a1.max.x-a1.min.x)*(a1.max.z-a1.min.z),sb=(b1.max.x-b1.min.x)*(b1.max.z-b1.min.z);
      if(ox*oz>.25*Math.min(sa,sb))add('overlap','overlaps '+B.e.kind+' @'+B.e.x.toFixed(0)+','+B.e.z.toFixed(0),A.e);}}}
  for(const o of L){const e=o.e,r=Math.max(o.bb.max.x-o.bb.min.x,o.bb.max.z-o.bb.min.z)/2;
    for(const b of bs){if(!b.arch||!b.arch.leaf)continue;const A=b.arch,Sc=A.scale||b.BSc,l=owiW2L(b,e.x,e.z);
      for(const s of A.storeys){const q=s.rect;if(l[0]>q.x0*Sc+.05&&l[0]<q.x1*Sc-.05&&l[1]>q.z0*Sc+.05&&l[1]<q.z1*Sc-.05){add('inHouse','in '+b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0),e);break;}}
      if(b.enter&&owiNearSteps(b,e.x,e.z,Math.min(r,.5)*.5)){add('onSteps','on the way up to '+b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0),e);}}}}
return JSON.stringify(S);})()
