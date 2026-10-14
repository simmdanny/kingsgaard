(function(){
/* Props (dev hook window.__propLog) against the platform and steps of the pavilions, and against the approach (steps and the ground in front of the door) of every enterable or solid building: how many stand on them. Needs int-lib.js. window.__seeds */
const I=window.__iw,seeds=window.__seeds||[3],sum={props:0,onPavilion:0,onApproach:0,byKind:{},ex:[]};
for(const seed of seeds){window.__propLog=[];I.setup(seed);const log=window.__propLog;window.__propLog=null;
  const bs=OW.villages.flatMap(v=>v.buildings).filter(b=>b.enter);
  for(const e of log){sum.props++;
    for(const b of bs){const l=owiW2L(b,e.x,e.z);const pav=b.pl&&b.pl.open,A=b.arch,S=A.scale||b.BSc,r=A.rect0;
      if(pav){const run=b.enter.ends[0].spec.run;if(l[0]>r.x0*S-.2&&l[0]<r.x1*S+.2&&l[1]>r.z0*S-.2&&l[1]<r.z1*S+run+.2){sum.onPavilion++;sum.byKind[e.kind]=(sum.byKind[e.kind]||0)+1;if(sum.ex.length<6)sum.ex.push(e.kind+' on pavilion '+b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0));}}
      else if(owiNearApproach(b,e.x,e.z,.25)){sum.onApproach++;sum.byKind[e.kind]=(sum.byKind[e.kind]||0)+1;if(sum.ex.length<6)sum.ex.push(e.kind+' on the approach of '+b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0));}}}}
return JSON.stringify(sum);})()
