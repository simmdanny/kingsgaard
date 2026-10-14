(function(){
/* The cutaway: only the explored building loses its roof and upper walls, it comes back on leaving, nothing flickers at the doorway. */
const I=window.__iw,out=[],seeds=window.__seeds||[11,23],ok=(c,m)=>{if(!c)out.push('FAIL '+m);return c;};let tested=0,toggles=0,worst=0;
const frames=(n,dt)=>{for(let i=0;i<n;i++){heroUpdate(dt||1/60);owiTick(dt||1/60);}};
for(const seed of seeds){I.setup(seed);const list=OWI.list.filter(b=>b.type==='cot'||b.type==='town'||b.type==='tavern'||b.type==='scroll').slice(0,14);
  for(const b of list){const e=b.enter,S=e.spec;const g=I.ground(b,4);if(!owCanStand(g[0],g[1]))continue;I.tele(g[0],g[1]);if(!I.settle(b))continue;tested++;
    const P=b.ic.P,Q=P.st[0].Q;frames(20);
    /* before: nothing is clipped anywhere */
    ok(OWI.list.every(q=>q.cutPlane.constant>=1e4),'a plane is active before entering (seed '+seed+')');
    /* walk in */
    I.walkLocal(b,e.u,e.zF+S.run+.3,{});I.walkLocal(b,e.u,Q.zb+.3,{});
    ok(!OWI.in,'inside too early at the doorstep ('+b.type+')');
    I.walkLocal(b,e.u,Q.zb-.9,{});frames(60);
    ok(OWI.in&&OWI.cb===b,'not inside after entering ('+b.type+')');
    const want=b.hi+P.floors[0].y+OWI.CUT;ok(Math.abs(b.cutPlane.constant-want)<.03,'plane '+b.cutPlane.constant.toFixed(2)+' not at '+want.toFixed(2)+' ('+b.type+')');
    const others=OWI.list.filter(q=>q!==b&&q.cutPlane.constant<1e4);ok(!others.length,others.length+' other building(s) clipped');
    /* the camera never sits below the cut (so it cannot be inside a wall or the roof) */
    I.frame(1/60);ok(camera.position.y>=b.cutTarget+.2,'camera '+camera.position.y.toFixed(2)+' below the cut '+b.cutTarget.toFixed(2));
    /* dither on the threshold: a few toggles at most */
    I.walkLocal(b,e.u,Q.zb+.1,{});frames(40);let last=OWI.in,tg=0;for(let i=0;i<120;i++){const lz=Q.zb-.25+Math.sin(i*.35)*.5;const w=owiL2W(b,e.u,lz);heroU.x=w[0];heroU.z=w[1];frames(1);if(OWI.in!==last){tg++;last=OWI.in;}}
    toggles+=tg;worst=Math.max(worst,tg);
    /* out again */
    I.walkLocal(b,e.u,e.zF-.1,{});I.walkLocal(b,e.u,e.zF+S.run+.5,{});frames(90);
    ok(!OWI.in,'still inside after leaving ('+b.type+')');
    ok(b.cutPlane.constant>=1e4,'roof not restored after leaving: plane '+b.cutPlane.constant.toFixed(2));
    I.tele(g[0],g[1]);frames(10);}}
out.unshift('tested '+tested+' buildings, threshold toggles total '+toggles+', worst '+worst+' per 120 frames of dithering');
return out.slice(0,30).join('\n');})()
