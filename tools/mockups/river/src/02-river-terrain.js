/* VERBATIM from tools/mockups/river/surface-study.html, lines 95-113. The river channel, shoreline wobble, width, bank profiles (gentle / steep), bed. In the game RIV, rivHalf and WL come from the river network; rivBank is the shape.
   Port this code as it is (same functions, same constants, same noise). Only the plumbing around it may change. */
/* ===================== the stream: a spline + a half-width; it carves its bed into the land and raises low banks so the water stays in.
   The water level is flat here (a slow stretch); phase 2 adds the drops. ===================== */
const RIV=[];for(let z=80;z>=-34;z-=1){const x=26+3.2*Math.sin(z*.055+.4)+1.3*Math.sin(z*.16+2.1)+.7*Math.sin(z*.31+.7);RIV.push([x,z]);}
function rivNear(x,z){let best=1e9,bs=0,sd=1;for(let i=0;i<RIV.length-1;i++){const a=RIV[i],b=RIV[i+1];if(z>Math.max(a[1],b[1])+9||z<Math.min(a[1],b[1])-9)continue;
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz))),ex=x-a[0]-dx*t,ez=z-a[1]-dz*t,d=Math.hypot(ex,ez);if(d<best){best=d;bs=i+t;sd=Math.sign(dx*ez-dz*ex)||1;}}return[best,bs,sd];}
function rivHalf(z){return 2.4+1.5*(fbq2(z*.035+11,3.3)-.5)*2+3.0*Math.exp(-Math.pow((z-6)/7,2));}/* (a pool around z=6) */
const WL=(()=>{const v=RIV.filter(q=>q[1]<44).map(q=>Hland(q[0],q[1])).sort((a,b)=>a-b);return v[Math.floor(v.length*.3)]-.12;})();/* the water level */
/* the bank, at any point: the shore wobbles (bays, bumps, points); along each side the profile changes from a gentle muddy shore (grass almost
   to the water) to a steep earth cut with a lip. Returns the height, how much of the earth face this is, and how steep the bank is here. */
function rivBank(x,z){const h=Hland(x,z);if(x<12||x>46||z<-42)return{y:h,face:0,steep:0,dd:99,w:1,run:1};const rn=rivNear(x,z),w=rivHalf(z);
  const e=.95*(fbq2(x*.18+3,z*.18)-.5)*2+.30*(vq2(x*.7,z*.7+5)-.5)*2;const dd=rn[0]-e;/* (the shore pushed in and out) */
  const steep=S(.42,.58,fbq2(z*.12+rn[2]*13,5.1+rn[2]));const run=.75+2.3*(1-steep),lev=.16+.62*steep+.08*(vq2(x*.5,z*.5)-.5)*2;
  if(dd>w+run+4)return{y:h,face:0,steep,dd,w,run};const top=Math.max(h,WL+lev);
  if(dd<w){const q=Math.max(0,dd)/w;return{y:Math.min(h,WL-.18-1.15*(1-q*q)*(.75+.25*vq2(x*.3,z*.3))),face:0,steep,dd,w,run};}
  if(dd<w+run){const t=(dd-w)/run,sh=S(0,1,t)*(1-steep)+Math.pow(t,.5)*steep;/* (a gentle S, or a cut bank: steep low, rounding over at the lip) */
    return{y:(WL-.18)+(top-(WL-.18))*sh,face:1,steep,dd,w,run};}
  return{y:top+(h-top)*S(w+run,w+run+4,dd),face:0,steep,dd,w,run};}
function H(x,z){return rivBank(x,z).y;}
function rivMask(x,z,m){if(x<12||x>46)return false;const b=rivBank(x,z);return b.dd<b.w+(m||2.2);}
