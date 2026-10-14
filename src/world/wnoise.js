/* =====================================================================================================
   WORLD NOISE (src/world/wnoise.js): seeded 2D simplex noise and the few combinations the world generator is built from.
   Everything here is a pure function of (seed, x, z): the infinite world is generated from it piece by piece, in any order,
   and always comes out the same.
   ===================================================================================================== */
/* a 32-bit integer hash of two integers and a salt, and the same as a float in [0,1) */
function wnHashI(a,b,s){let h=Math.imul(a|0,374761393)+Math.imul(b|0,668265263)+Math.imul(s|0,1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return h>>>0;}
function wnHash(a,b,s){return wnHashI(a,b,s)/4294967296;}
/* a small seeded stream (for the few choices that are made in order, one place at a time) */
function wnRng(s){let a=s|0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
/* 2D simplex noise (after S. Gustavson), seeded by a shuffled permutation table; output about -1..1 */
const WN_F2=.5*(Math.sqrt(3)-1),WN_G2=(3-Math.sqrt(3))/6;
const WN_GX=new Float64Array([1,-1,1,-1,1,-1,0,0,.7071,-.7071,.7071,-.7071]),WN_GZ=new Float64Array([1,1,-1,-1,0,0,1,-1,.7071,.7071,-.7071,-.7071]);
function wnSimplex(seed){const R=wnRng(seed^0x2c1b3c6d),p=new Uint8Array(256);for(let i=0;i<256;i++)p[i]=i;for(let i=255;i>0;i--){const j=Math.floor(R()*(i+1)),t=p[i];p[i]=p[j];p[j]=t;}
  const P=new Int32Array(512),PM=new Int32Array(512);for(let i=0;i<512;i++){P[i]=p[i&255];PM[i]=P[i]%12;}return{P,PM};}
/* one noise function for every seed (the table is an argument), so V8 can inline it into its callers */
function wnN(T,x,y){const P=T.P,PM=T.PM,s=(x+y)*WN_F2,i=Math.floor(x+s),j=Math.floor(y+s),t=(i+j)*WN_G2,x0=x-(i-t),y0=y-(j-t);let i1=0,j1=1;if(x0>y0){i1=1;j1=0;}
  const x1=x0-i1+WN_G2,y1=y0-j1+WN_G2,x2=x0-1+2*WN_G2,y2=y0-1+2*WN_G2,ii=i&255,jj=j&255;let n=0,tt=.5-x0*x0-y0*y0;
  if(tt>0){const g=PM[ii+P[jj]];tt*=tt;n+=tt*tt*(WN_GX[g]*x0+WN_GZ[g]*y0);}
  tt=.5-x1*x1-y1*y1;if(tt>0){const g=PM[ii+i1+P[jj+j1]];tt*=tt;n+=tt*tt*(WN_GX[g]*x1+WN_GZ[g]*y1);}
  tt=.5-x2*x2-y2*y2;if(tt>0){const g=PM[ii+1+P[jj+1]];tt*=tt;n+=tt*tt*(WN_GX[g]*x2+WN_GZ[g]*y2);}
  return 70*n;}
/* fractal sums of one noise: fbm (smooth hills), ridged (sharp crests, Musgrave's ridged multifractal: each octave weighted by the one before it, so the
   detail gathers on the ridges and the valleys stay smooth) and billow */
function wnFbm(N,x,z,oct,lac,gain){let a=1,f=1,s=0,n=0;for(let o=0;o<oct;o++){s+=a*wnN(N,x*f+o*17.3,z*f-o*9.1);n+=a;a*=gain;f*=lac;}return s/n;}
function wnRidged(N,x,z,oct,lac,gain,off,sharp){let f=1,s=0,w=1,a=1,n=0;for(let o=0;o<oct;o++){let r=off-Math.abs(wnN(N,x*f+o*31.7,z*f+o*11.9));r=r<0?0:r;r=sharp===2?r*r:Math.pow(r,sharp);r*=w;s+=r*a;n+=a;w=Math.min(1,Math.max(0,r*gain*2));a*=gain;f*=lac;}return s/n;}
/* smoothstep with the value first (the game's SMS convention) and a smooth maximum / minimum (k: how wide the blend) */
const wnS=(v,a,b)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t);};
const wnSmax=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.max(a,b)+h*h*k*.25;};
const wnSmin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
const wnLerp=(a,b,t)=>a+(b-a)*t;

