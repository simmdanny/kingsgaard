(function(){
/* Do the lantern lights pop or flicker while the hero walks? At night the hero walks 90 m along the main street of the city of seed 3 (about 25 s at the running speed, steps of 1/30 s through the real controller update); every frame the lights are
   read: which lantern each slot is bound to, and how much each slot's intensity changes from one frame to the next. Reports the number of binds (a slot taking a new lantern), the largest change of intensity in one frame (as a part of the
   brightest light), the number of frames in which a lantern changed from a shadow light to a plain one or back, and the shadow maps drawn. Needs int-lib.js and ls-shot.js (I.setup(3) first). window.__ls2 = {...} */
const I=window.__iw,R=window.__ls2={frames:0,binds:0,maxJump:0,swaps:0,maps:0,slotsMax:0};
meta.dayT=1500;const v=OW.villages.find(q=>q.tier===5),a=[v.x-70,v.z-8],b=[v.x+70,v.z-8];
I.tele(a[0],a[1]);camSet('tp');for(let i=0;i<60;i++){heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+i/30);owFrame();}
const prevKey=OWLT.slots.map(s=>s.key),prevI=OWLT.slots.map(s=>s.l.intensity);const wasShadow=new Map();
const N=900;for(let f=0;f<N;f++){const t=f/N;heroU.x=a[0]+(b[0]-a[0])*t;heroU.z=a[1]+(b[1]-a[1])*t;heroU.g.position.x=heroU.x;heroU.g.position.z=heroU.z;
  heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+f/30);owFrame();R.frames++;
  OWLT.slots.forEach((s,i)=>{if(s.key!==prevKey[i]&&s.key!=null)R.binds++;prevKey[i]=s.key;const d=Math.abs(s.l.intensity-prevI[i]);prevI[i]=s.l.intensity;if(d>R.maxJump)R.maxJump=d;
    if(s.key!=null&&s.sh)wasShadow.set(s.key,1);});
  R.slotsMax=Math.max(R.slotsMax,OWLT.slots.filter(s=>s.key!=null&&s.k>.5).length);}
R.maxJump=+R.maxJump.toFixed(3);R.brightest=+Math.max(...OWLT.slots.map(s=>s.base)).toFixed(2);R.jumpShare=+(R.maxJump/Math.max(.01,R.brightest)).toFixed(3);R.shadowLanternsUsed=wasShadow.size;
return JSON.stringify(R);})()
