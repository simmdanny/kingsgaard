(async function(){
/* Two spaces separated by a closed opaque door: at night, inside a house with a lantern next to its front door, the floor behind the door as drawn (L.probe) with the door shut and then open. A shut door stops the light of the lantern outside (its shadow light is drawn again when
   the door moves), an open one lets it in. Needs int-lib.js and ls-shot.js (I.setup(3) first). window.__dl = {pass, fail, out:[...], data:[...]} */
const I=window.__iw,L=window.__ls,R=window.__dl={pass:0,fail:0,out:[],data:[]};
const ok=(c,m)=>{R[c?'pass':'fail']++;R.out.push((c?'PASS ':'FAIL ')+m);return c;};
meta.dayT=1500;let n=0;
for(const b of OWI.list.filter(q=>q.arch&&q.arch.leaf&&!q.tunnel)){if(n>=5)break;owiEnsurePlan(b);const P=b.ic.P;if(!P.door||b.ic.lit)continue;const A=b.arch,S=A.scale||b.BSc,z1=A.rect0.z1*S,door=owiL2W(b,P.door.u,z1+1.2);
  const lamp=OW.lamps.find(l=>(l.s||1)===1&&Math.hypot(l.x-door[0],l.z-door[1])<6.5);if(!lamp)continue;
  const F=P.floors[0],room=F.rooms.find(r=>r.rects.some(q=>Math.abs(q.zb-F.Q.zb)<.4&&P.door.u>q.xa&&P.door.u<q.xb));if(!room)continue;const q=room.rects.find(r=>Math.abs(r.zb-F.Q.zb)<.4&&P.door.u>r.xa&&P.door.u<r.xb);
  let pt=null,bd=1e9;for(let x=q.xa+.3;x<=q.xb-.3;x+=.15)for(let z=q.za+.3;z<=q.zb-.3;z+=.15){if(b.ic.col&&owiHit(b.ic.col,x,z,1,OWI.RAD+.1))continue;const d=Math.hypot(x-P.door.u,z-(F.Q.zb-1.4));if(d<bd){bd=d;pt=[x,z];}}if(!pt)continue;
  /* the hero stays out of doors by the lantern for a while, so that the lantern's shadow light is bound; then he goes in */
  I.tele(lamp.x+1.2,lamp.z+1.2);camSet('tp');for(let i=0;i<80;i++){heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+i/30);owFrame();}
  const bound=OWLT.slots.some(s=>s.sh&&s.key!=null&&OW.lamps[+s.key.slice(1)]&&Math.hypot(OW.lamps[+s.key.slice(1)].x-lamp.x,OW.lamps[+s.key.slice(1)].z-lamp.z)<2.5);
  owdSet(b,false,{instant:true});owLampShadowDirty(b.x,b.z,30);const shut=L.probe(b,0,pt[0],pt[1],{t:1500,frames:50});
  owdSet(b,true,{instant:true});owLampShadowDirty(b.x,b.z,30);const open=L.probe(b,0,pt[0],pt[1],{t:1500,frames:70});owdSet(b,false,{instant:true});
  R.data.push({b:b.type+'@'+Math.round(b.x)+','+Math.round(b.z),lampBound:bound,shut:shut.lum,open:open.lum});n++;}
ok(R.data.length>=2,'houses measured: '+R.data.length);
ok(R.data.filter(r=>r.open>r.shut*1.03+.5).length>=Math.ceil(R.data.length*.6),'the floor behind the front door is brighter with the door open than shut ('+R.data.map(r=>r.shut+'>'+r.open).join(', ')+')');
return JSON.stringify(R);})()
