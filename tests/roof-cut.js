(function(){
/* The cutaway of the roof (walk.js owiRegister / owiAnim): for every enterable house and every floor the hero can stand on, with the cutaway on, the roof plane lies below the lowest point of the whole roof mesh (so no rim of eaves is left round
   the cut-away house), the storey plane lies at the ceiling of that storey (its walls stay), and with the hero out of the house every plane is off. Also checks that a cut roof is not left cut after leaving. Needs int-lib.js. */
const I=window.__iw,out=[],res={pass:0,fail:0};const ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);return c;};
let nb=0,floors=0,badRoof=[],badWall=[],badOff=[],notLow=0;
for(const b of OWI.list){if(!b.meshes.r&&!b.meshes.u)continue;const P=owiEnsurePlan(b).P;nb++;
  const rg=b.meshes.r&&b.meshes.r.geometry;let lo=1e9;if(rg){rg.computeBoundingBox();lo=b.hi+rg.boundingBox.min.y*b.BSc;}
  for(let lv=0;lv<P.floors.length;lv++){floors++;OWI.cb=b;OWI.lv=lv;OWI.in=true;OWI.cutOn=true;owiCut(b,true);for(let k=0;k<4;k++)owiAnim(5);
    const c=b.roofPlane.constant,tp=b.topPlane.constant,ceil=owiCeilY(b,P,lv);
    if(rg&&!(c<=lo+1e-6)&&badRoof.length<5)badRoof.push(b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' f'+lv+': roof plane '+c.toFixed(2)+' above the lowest roof point '+lo.toFixed(2));
    if(Math.abs(tp-ceil)>.02&&badWall.length<5)badWall.push(b.type+'@'+b.x.toFixed(0)+' f'+lv+' storey plane '+tp.toFixed(2)+' vs ceiling '+ceil.toFixed(2));
    if(rg&&lo<ceil-.02)notLow++;}
  OWI.in=false;owiCut(b,false);for(let k=0;k<4;k++)owiAnim(5);OWI.cb=null;
  if((b.roofPlane.constant<1e4||b.topPlane.constant<1e4||b.cutPlane.constant<1e4)&&badOff.length<5)badOff.push(b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' roof '+b.roofPlane.constant+' top '+b.topPlane.constant);}
ok(badRoof.length===0,'the roof plane is below the whole roof for every floor of every house ('+nb+' houses, '+floors+' floors; in '+notLow+' of them the roof reaches below the ceiling of the storey, which the storey plane alone would have left standing)'+(badRoof.length?' '+badRoof.join(' | '):''));
ok(badWall.length===0,'the storey plane is at the ceiling of the hero\'s storey, so its walls stay'+(badWall.length?' '+badWall.join(' | '):''));
ok(badOff.length===0,'out of the house every plane is off again'+(badOff.length?' '+badOff.join(' | '):''));
res.out=out;return JSON.stringify(res);
})()
