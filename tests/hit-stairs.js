(function(){
/* Random steering on and around every flight of stairs: the hero starts at the mouth and at the top of each flight (on the right floor), then wanders with random WASD / camera input for a few seconds.
   Reports hero positions that overlap a collider, frozen heroes, and level changes that leave the hero inside a box. Needs int-lib.js. Options window.__sx = {seed, per, skip, secs} */
const I=window.__iw,o=Object.assign({seed:11,per:40,skip:0,secs:6},window.__sx||{});
I.setup(o.seed);const H=heroU,R=mulberry(o.seed*13+5),out={flights:0,frames:0,traps:0,invalid:0,startInvalid:0,levelChanges:0,examples:[]};
const frame=dt=>{heroUpdate(dt);owiTick(dt);};
const withStairs=OWI.list.filter(b=>b.ic||true).filter(b=>{owiEnsurePlan(b);return b.ic.P.stairs.length;}).slice(o.skip,o.skip+o.per);
for(const b of withStairs){const P=b.ic.P,e=b.enter,g=I.ground(b,3);I.tele(g[0],g[1]);if(!I.settle(b))continue;
  for(const f of P.stairs){const xc=(f.x0+f.x1)/2,s=Math.sign(f.zt-f.zb);
    for(const [lv,lz] of [[f.from,f.zb-s*.55],[f.to,f.zt+s*.55],[f.from,(f.zb+f.zt)/2]]){
      const w=owiL2W(b,xc,lz);I.tele(w[0],w[1]);OWI.cb=b;OWI.lv=lv;OWI.in=true;heroU.oyT=null;for(let i=0;i<4;i++)frame(1/60);
      if(!owiValid(H.x,H.z)){out.startInvalid++;continue;}/* a start point flush with a wall: the hero's circle does not fit there */
      out.flights++;let lastLv=OWI.lv,still=0,lx=H.x,lz2=H.z,left=0;
      for(let k=0;k<o.secs*60;k++){
        if(left--<=0){left=15+Math.floor(R()*70);TPC.yaw=R()*Math.PI*2;TPC.keys.clear();TPC.keys.add('KeyW');if(R()<.25)TPC.keys.add('ShiftLeft');}
        frame(1/60);out.frames++;if(OWI.lv!==lastLv){out.levelChanges++;lastLv=OWI.lv;}
        if(!owiValid(H.x,H.z)){out.invalid++;if(out.examples.length<6)out.examples.push({type:b.type,at:[+b.x.toFixed(1),+b.z.toFixed(1)],lv:OWI.lv,local:(()=>{const l=owiW2L(b,H.x,H.z);return[+l[0].toFixed(2),+l[1].toFixed(2)];})(),why:'invalid during walk',k});break;}
        const mv=Math.hypot(H.x-lx,H.z-lz2);lx=H.x;lz2=H.z;
        if(mv<.004){still++;if(still===60){/* held a key for a second without moving: any way out? */
            const s0={x:H.x,z:H.z,lv:OWI.lv,cb:OWI.cb,in:OWI.in};let best=0;for(let a=0;a<16&&best<.5;a++){H.x=s0.x;H.z=s0.z;OWI.lv=s0.lv;OWI.cb=s0.cb;OWI.in=s0.in;TPC.keys.clear();TPC.yaw=a/16*Math.PI*2;TPC.keys.add('KeyW');for(let q=0;q<30;q++)frame(1/60);best=Math.max(best,Math.hypot(H.x-s0.x,H.z-s0.z));}
            H.x=s0.x;H.z=s0.z;OWI.lv=s0.lv;OWI.cb=s0.cb;OWI.in=s0.in;TPC.keys.clear();still=0;
            if(best<.3){out.traps++;if(out.examples.length<6){const l=owiW2L(b,H.x,H.z);out.examples.push({type:b.type,at:[+b.x.toFixed(1),+b.z.toFixed(1)],lv:OWI.lv,local:[+l[0].toFixed(2),+l[1].toFixed(2)],why:'frozen',best:+best.toFixed(3)});}break;}}}else still=0;}
      TPC.keys.clear();}}}
return JSON.stringify(out,null,1);})()
