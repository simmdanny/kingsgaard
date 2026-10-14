(function(){
/* The sun and the moon against the day cycle (open world, dev build, after __iw.setup or __pw.setup). Samples the whole cycle and checks the path, the continuity, and that the light, the sky's sun and the moon agree. */
const out=[],ok=(c,m)=>{out.push((c?'PASS ':'FAIL ')+m);return c;};
const T=DAYC.T,DAY=DAYC.day,keep=meta.dayT,N=1800,S=[];
for(let i=0;i<=N;i++){meta.dayT=i%T;dayStep(0);anim(0,0);owSkyUpdate(1);S.push({t:i,e:DAYC.e,el:DAYC.el,dir:DAYC.dir.clone(),i:sun.intensity,c:sun.color.clone(),h:hemi.intensity,bg:scene.background.clone(),lp:sun.position.clone().sub(sun.target.position).normalize(),dome:OWSKY.domeMat.uniforms.uSunDir.value.clone(),sunA:OWSKY.domeMat.uniforms.uSunA.value,moon:OWSKY.dir.clone(),moonA:OWSKY.a});}
const day=S.filter(s=>s.t<DAY);
ok(day[0].dir.x>.9&&day[Math.round(DAY/2)].dir.x>-.05&&day[Math.round(DAY/2)].dir.x<.05&&day[DAY-1].dir.x<-.9,'the sun rises in the east (+x), is overhead of the north-south line at noon and sets in the west (-x): x '+day[0].dir.x.toFixed(2)+' / '+day[600].dir.x.toFixed(2)+' / '+day[DAY-1].dir.x.toFixed(2));
ok(day[600].dir.z>0,'noon sun is in the south (+z)');
const elMax=Math.max(...day.map(s=>s.el)),elMin=Math.min(...day.map(s=>s.el));ok(Math.abs(day[600].el-elMax)<.01&&elMax>1.0&&elMax<1.15,'highest around midday ('+(elMax*57.3).toFixed(0)+' deg)');ok(elMin>.1&&elMin<.2,'lowest at sunrise and sunset, above the horizon ('+(elMin*57.3).toFixed(0)+' deg)');
let maxTurn=0,maxI=0,maxC=0,maxBg=0,maxH=0;for(let i=1;i<S.length;i++){const a=S[i-1],b=S[i];if(a.i>.08&&b.i>.08)maxTurn=Math.max(maxTurn,Math.acos(Math.min(1,a.dir.dot(b.dir)))*57.3);maxI=Math.max(maxI,Math.abs(a.i-b.i));maxH=Math.max(maxH,Math.abs(a.h-b.h));maxC=Math.max(maxC,Math.abs(a.c.r-b.c.r)+Math.abs(a.c.g-b.c.g)+Math.abs(a.c.b-b.c.b));maxBg=Math.max(maxBg,Math.abs(a.bg.r-b.bg.r)+Math.abs(a.bg.g-b.bg.g)+Math.abs(a.bg.b-b.bg.b));}
ok(maxTurn<.8,'the light turns smoothly wherever it shines (largest step '+maxTurn.toFixed(2)+' deg per game second)');
const sw=S.filter(s=>s.t>=DAY-1&&s.t<=DAY+1);ok(sw.every(s=>s.i<.03),'at the swap from sun to moon the light is almost out (highest '+Math.max(...sw.map(s=>s.i)).toFixed(3)+'), so the change of direction is not seen');
ok(maxI<.06&&maxH<.02,'intensity changes smoothly (sun '+maxI.toFixed(3)+', sky '+maxH.toFixed(3)+' per second)');ok(maxC<.08&&maxBg<.08,'colour changes smoothly (light '+maxC.toFixed(3)+', sky '+maxBg.toFixed(3)+' per second)');
let worstL=0,worstD=0;for(const s of S){worstL=Math.max(worstL,Math.acos(Math.min(1,s.lp.dot(s.dir)))*57.3);}for(const s of day){if(s.sunA>.05)worstD=Math.max(worstD,Math.acos(Math.min(1,s.dome.dot(s.dir)))*57.3);}
ok(worstL<.05,'the light stands exactly in the direction of DAYC.dir (worst '+worstL.toFixed(3)+' deg)');ok(worstD<.05,'the sun in the sky is where the light comes from (worst '+worstD.toFixed(3)+' deg)');
const night=S.filter(s=>s.t>DAY+150&&s.t<T-60);let worstM=0;for(const s of night)worstM=Math.max(worstM,Math.acos(Math.min(1,s.moon.dot(s.dir)))*57.3);ok(worstM<8,'at night the moon is in the direction of the night light (worst '+worstM.toFixed(1)+' deg)');ok(night.every(s=>s.moonA>.5),'the moon is up all night');
ok(S.filter(s=>s.t<DAY&&s.e>.2).every(s=>s.moonA<.2),'no moon in full daylight');
const noon=S[600],dawn=S[40],dusk=S[DAY-40],mid=S[300];ok(noon.c.r+noon.c.g+noon.c.b>dawn.c.r+dawn.c.g+dawn.c.b-.2&&dawn.c.r>dawn.c.b+.15&&dusk.c.r>dusk.c.b+.15,'warm light near sunrise and sunset ('+dawn.c.getHexString()+', '+dusk.c.getHexString()+'), neutral at noon ('+noon.c.getHexString()+')');
ok(noon.i>mid.i*.9&&noon.i>dawn.i,'the light is strongest around midday ('+noon.i.toFixed(2)+' vs '+dawn.i.toFixed(2)+' at dawn)');
/* the shadow of a 10 m wall: length at three times */
const len=s=>10/Math.tan(s.el);ok(len(day[40])>len(day[300])*1.8&&len(day[300])>len(day[600])*1.3,'shadows are long at sunrise ('+len(day[40]).toFixed(0)+' m), shorter in the morning ('+len(day[300]).toFixed(0)+' m) and shortest at noon ('+len(day[600]).toFixed(0)+' m) for a 10 m wall');
meta.dayT=keep;dayStep(0);
return out.filter(l=>l.startsWith('FAIL')).length+' failed, '+out.filter(l=>l.startsWith('PASS')).length+' passed\n'+out.join('\n');})()
