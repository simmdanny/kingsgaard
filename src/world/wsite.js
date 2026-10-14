/* =====================================================================================================
   SETTLEMENTS AND ROADS (src/world/wsite.js): where the villages stand, where the keep stands, and the roads between them -
   every one a pure function of the seed, found the same way whichever way the player comes.
   - VILLAGES: one cell of WS_CFG.cell (720 m) holds at most one. Its chance and its size depend on the region (the highlands have the most and
     the biggest, in the valleys among their hills); the site is the flattest dry spot of a few dozen tries inside the cell (it never reaches past
     the cell, so two villages never overlap), away from streams, lakes and landmarks.
   - THE KEEP stands near the middle of the world on the flattest dry spot within 260 m of it, its approach running north.
   - ROADS join each village to its nearest neighbours (and the villages round the keep to the keep): A* over a cost grid of the land between
     them (slopes cost, cliffs and water are closed, streams can be crossed at a price), smoothed. The ground under a road is smoothed along it;
     where a road crosses a stream it keeps above the water (a plain crossing; the channel stays open under it).
   - STAMPS: the villages flatten their ground, the keep its own, the roads smooth theirs; wgGrid applies them after the streams (WG.stampsIn).
   Expensive steps are generators run a few milliseconds a frame (wsStep); a level-0 tile is never made before its roads are known.
   ===================================================================================================== */
const WS_CFG={cell:720,roadHalf:1.5,linkMax:1150,keepR:24,gridCs:12,margin:230};
const WS={sites:new Map(),edges:new Map(),roads:new Map(),keep:null,jobs:[],rh:new Map(),done:new Set(),stats:{sites:0,roads:0,ms:0}};
const WS_VR={tiny:26,small:40,medium:62,large:80,city:104};
const WS_NAMES=[['Oak','Willow','Stone','Ash','Mill','Hart','Fern','Raven','Thorn','Elm','Bright','Copper','Dun','Lark','Glen','Wolf','Briar','Kings','Amber','Frost','Iron','Silver','Moss','Heath','Fox','Holly','Rose','Black','White','Red','Green','Gold','Swan','Hawk','Barrow','Wren','Alder','Birch','Cold','High'],
  ['ridge','brook','haven','ford','wick','hollow','mere','by','stead','water','field','dale','vale','hill','moor','gate','burn','wood','ton','ham','well','cross','fell','thorpe','bury','combe','shaw','ley']];
function wsName(a,b){const s=WG.seed,p=WS_NAMES[0][wnHashI(a,b,s+501)%WS_NAMES[0].length],q=WS_NAMES[1][wnHashI(a,b,s+502)%WS_NAMES[1].length];return p+q;}
/* the height of the land before settlements (cheap: no streams), for choosing sites and routing roads */
function wsH(x,z,c){return wgH0(x,z,null,c);}
/* ---------- the keep ---------- */
function wsKeep(){if(WS.keep)return WS.keep;const c=wgCtx(-320,-320,320,320,0),H=wgHydroIn(-320,-320,320,320);let best=null;
  for(let j=-5;j<=5;j++)for(let i=-5;i<=5;i++){const x=i*45,z=22+j*45,d0=Math.hypot(x,z-22);if(d0>260)continue;const h=wsH(x,z,c);if(h<WG_CFG.WL+3)continue;
    let dev=0;for(let a=0;a<12;a++){const an=a/12*6.283;for(const r of[20,40,62]){dev+=Math.abs(wsH(x+Math.cos(an)*r,z+Math.sin(an)*r,c)-h)*(r<45?1.5:.7);}}
    /* the approach to the north must be fit to walk */for(let d=20;d<=70;d+=10)dev+=Math.abs(wsH(x,z-d,c)-h)*.5;
    let wet=0;for(const s of H.segs){const o=wgSegNear(s,x,z,{});if(o.d<95+o.hw)wet+=200;}for(const l of H.lakes)if(Math.hypot(l.x-x,l.z-z)<l.R*1.3+80)wet+=200;
    const sc=dev+wet+d0*.15;if(!best||sc<best.sc)best={x,z,h,sc};}
  if(!best)best={x:0,z:22,h:wsH(0,22,c),sc:0};
  const K={x:best.x,z:best.z,h:best.h,id:'keep'};K.gate={x:K.x,z:K.z-6.2*2.4-3};K.app={x:K.gate.x,z:K.gate.z-46};K.hApp=wsH(K.app.x,K.app.z,c);WS.keep=K;return K;}
/* ---------- villages ---------- */
/* by region: [0 unused (the meadows of the first version), highlands, floating plateau, elderglade] */
const WS_SIZES={0:[['tiny',.15],['small',.27],['medium',.28],['large',.18],['city',.12]],1:[['tiny',.17],['small',.28],['medium',.28],['large',.17],['city',.1]],2:[['tiny',.3],['small',.35],['medium',.25],['large',.1]],3:[['tiny',.35],['small',.35],['medium',.2],['large',.1]]};
const WS_CHANCE=[.85,.75,.58,.55];
/* the cells round the keep always have a village, and a big one is likely (the hero starts there); a site that finds no ground for its size tries the next size down */
const _wsSN={d:0,u:0,w:0,hw:0,fx:0,fz:0};
const WS_SIZES_KEEP=[['small',.25],['medium',.35],['large',.25],['city',.15]],WS_DOWN={city:'large',large:'medium',medium:'small',small:'tiny',tiny:null};
function wsSite(a,b){const k=wgKey(a,b);if(WS.sites.has(k))return WS.sites.get(k);const T0=performance.now(),s=WG.seed,C=WS_CFG.cell,R=wnRng(wnHashI(a,b,s+511));
  const cx=(a+.5)*C,cz=(b+.5)*C,RW=wgRegions(cx,cz,new Float64Array(4));let kind=0;for(let t=1;t<4;t++)if(RW[t]>RW[kind])kind=t;
  let site=null;const K=wsKeep(),nearK=Math.hypot(cx-K.x,cz-K.z)<1100;
  if(R()<WS_CHANCE[kind]||nearK){let u=R(),size='tiny';for(const[sz,p]of nearK?WS_SIZES_KEEP:WS_SIZES[kind]){if(u<p){size=sz;break;}u-=p;}
    const c=wgCtx(a*C,b*C,(a+1)*C,(b+1)*C,0);let best=null;
    /* the water and the landmarks of the cell, once: a candidate must keep clear of them (the flattest dry one wins) */
    const H=wgHydroIn(a*C,b*C,(a+1)*C,(b+1)*C),LM=[],GN=wgGreatNear(cx,cz);
    if(typeof wfSite==='function'){const FC=WF.cell;for(let fb=Math.floor((b*C-400)/FC);fb<=Math.floor(((b+1)*C+400)/FC);fb++)for(let fa=Math.floor((a*C-400)/FC);fa<=Math.floor(((a+1)*C+400)/FC);fa++){const f=wfSite(fa,fb);if(f)LM.push(f);}}
    const dry=(x,z,F)=>{for(const sg of H.segs){if(x+F+30<sg.x0||x-F-30>sg.x1||z+F+30<sg.z0||z-F-30>sg.z1)continue;const o=wgSegNear(sg,x,z,_wsSN);if(o.d<F+o.hw+10)return false;}
      for(const l of H.lakes)if(Math.hypot(l.x-x,l.z-z)<l.R*1.35+F+12)return false;for(const f of LM)if(Math.hypot(f.x-x,f.z-z)<f.R+F+20)return false;
      if(GN&&wgGreatQ(GN,x,z)<1.05+(F+30)/GN.Rb)return false;/* (not on the great mountain) */return true;};
    for(let relax=0,sz=size;sz&&!best;relax++,sz=WS_DOWN[sz]){const VR=WS_VR[sz],F=VR*1.3,m=F+28;
      for(let t=0;t<22;t++){const x=a*C+m+R()*(C-2*m),z=b*C+m+R()*(C-2*m);if(Math.hypot(x-K.x,z-K.z)<F+150)continue;
        const h=wsH(x,z,c);if(h<WG_CFG.WL+2.5)continue;let dev=0,ok=true;
        for(let q=0;q<10&&ok;q++){const an=q/10*6.283;for(const rr of[VR*.45,VR*.9,F*1.05]){const hh=wsH(x+Math.cos(an)*rr,z+Math.sin(an)*rr,c),dh=Math.abs(hh-h);if(hh<WG_CFG.WL+1){ok=false;break;}dev+=dh*(rr<VR?1.6:.6);if(rr<VR&&dh>4.2+(relax?2.5:0)+Math.max(0,rr-30)*.06){ok=false;break;}/* (the land rolls: a village levels a few metres of it) */}}
        if(!ok)continue;const sc=dev+Math.hypot(x-cx,z-cz)*.02;if((!best||sc<best.sc)&&dry(x,z,F))best={x,z,h,size:sz,sc,F};}}
    if(best)site={a,b,id:wnHashI(a,b,s+513)%1000000+1000*0,key:'v'+a+'_'+b,x:best.x,z:best.z,h:best.h,size:best.size,fr:best.F,name:wsName(a,b)};}
  WS.sites.set(k,site);WS.stats.sites++;WS.stats.ms+=performance.now()-T0;return site;}
/* ---------- the road network: each village joins its nearest neighbour, and its second nearest if not much farther; the villages near the keep join the keep ---------- */
function wsNear(v){if(v.near)return v.near;const L=[];for(let db=-1;db<=1;db++)for(let da=-1;da<=1;da++){if(!da&&!db)continue;const o=wsSite(v.a+da,v.b+db);if(o){const d=Math.hypot(o.x-v.x,o.z-v.z);if(d<WS_CFG.linkMax)L.push({o,d});}}
  L.sort((p,q)=>p.d-q.d);const out=[];if(L[0])out.push(L[0].o);if(L[1]&&L[1].d<L[0].d*1.3)out.push(L[1].o);
  const K=wsKeep(),dk=Math.hypot(K.x-v.x,K.z-v.z);if(dk<1300&&(!L[0]||dk<L[0].d*1.6||Math.abs(v.a)<=1&&Math.abs(v.b)<=1))out.push(K);v.near=out;return out;}
const wsEdgeKey=(p,q)=>{const a=p.key||'keep',b=q.key||'keep';return a<b?a+'|'+b:b+'|'+a;};
/* the roads of a village (computing nothing: the edges only) */
function wsEdgesOf(v){const out=new Map();for(const o of wsNear(v))out.set(wsEdgeKey(v,o),[v,o]);
  for(let db=-1;db<=1;db++)for(let da=-1;da<=1;da++){if(!da&&!db)continue;const o=wsSite(v.a+da,v.b+db);if(o&&wsNear(o).includes(v))out.set(wsEdgeKey(v,o),[o,v]);}return out;}
/* ---------- one road: a cost grid of the land between its ends, A*, smoothing, its height profile ---------- */
function* wsRoadJob(key,A,B){const C=WS_CFG,cs=C.gridCs,K=wsKeep(),pa=A.key?[A.x,A.z]:[K.app.x,K.app.z],pb=B.key?[B.x,B.z]:[K.app.x,K.app.z];
  const x0=Math.min(pa[0],pb[0])-C.margin,x1=Math.max(pa[0],pb[0])+C.margin,z0=Math.min(pa[1],pb[1])-C.margin,z1=Math.max(pa[1],pb[1])+C.margin,nx=Math.ceil((x1-x0)/cs)+1,nz=Math.ceil((z1-z0)/cs)+1;
  const c=wgCtx(x0,z0,x1,z1,0),hh=new Float32Array(nx*nz);let T=performance.now();
  for(let j=0;j<nz;j++){for(let i=0;i<nx;i++)hh[j*nx+i]=wsH(x0+i*cs,z0+j*cs,c);if(performance.now()-T>3){yield;T=performance.now();}}
  /* water and landmarks are closed, streams cost to cross, other villages and the keep are avoided (but for the ends themselves) */
  const n1=nx-1,m1=nz-1,cost=new Float32Array(n1*m1),H=wgHydroIn(x0,z0,x1,z1);
  for(let j=0;j<m1;j++)for(let i=0;i<n1;i++){const q=j*nx+i,a=hh[q],b=hh[q+1],d=hh[q+nx],e=hh[q+nx+1],sl=Math.max(Math.abs(a-e),Math.abs(b-d))/(cs*1.414),lo=Math.min(a,b,d,e);
    let cc=1+38*Math.pow(Math.max(0,sl-.04),1.25)+(sl>.42?400:0);if(lo<WG_CFG.WL+1.2)cc+=900;cost[j*n1+i]=cc;}
  if(performance.now()-T>3){yield;T=performance.now();}
  const mark=(x,z,r,add)=>{const i0=Math.max(0,Math.floor((x-r-x0)/cs)),i1=Math.min(n1-1,Math.floor((x+r-x0)/cs)),j0=Math.max(0,Math.floor((z-r-z0)/cs)),j1=Math.min(m1-1,Math.floor((z+r-z0)/cs));for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const cx=x0+(i+.5)*cs,cz=z0+(j+.5)*cs;if(Math.hypot(cx-x,cz-z)<=r)cost[j*n1+i]+=add;}};
  for(const sg of H.segs)for(let k=0;k<=sg.n;k+=2)mark(sg.pts[k*2],sg.pts[k*2+1],sg.hw+3,60);
  for(const l of H.lakes)mark(l.x,l.z,l.R*1.25+6,900);
  for(let jb=Math.floor(z0/C.cell)-1;jb<=Math.floor(z1/C.cell)+1;jb++)for(let ia=Math.floor(x0/C.cell)-1;ia<=Math.floor(x1/C.cell)+1;ia++){const o=wsSite(ia,jb);if(o&&o!==A&&o!==B)mark(o.x,o.z,o.fr+10,300);}
  /* the feet of the Great Elder Circle are closed (its mountain can be crossed) */
  {const G=wgGreatNear((x0+x1)/2,(z0+z1)/2);if(G){const dF=Math.sqrt(Math.max(0,G.R*G.R-(G.R-G.sink)*(G.R-G.sink))),ca=Math.cos(G.yaw),sa=Math.sin(G.yaw);for(const sd of[-1,1])mark(G.x+ca*dF*sd,G.z+sa*dF*sd,G.th*2.4+10,900);}}
  if(A!==K&&B!==K){mark(K.x,K.z,70,500);}else{/* the keep: closed but for its approach, which the road comes in along */mark(K.x,K.z,50,300);}
  if(typeof wfSite==='function'){const FC=WF.cell;for(let fb=Math.floor((z0-300)/FC);fb<=Math.floor((z1+300)/FC);fb++)for(let fa=Math.floor((x0-300)/FC);fa<=Math.floor((x1+300)/FC);fa++){const f=wfSite(fa,fb);if(f){const ca=Math.cos(f.yaw),sa=Math.sin(f.yaw);mark(f.x+ca*f.R,f.z+sa*f.R,f.th*2+8,900);mark(f.x-ca*f.R,f.z-sa*f.R,f.th*2+8,900);}}}
  yield;
  /* A* (8 neighbours) */
  const cell=(x,z)=>[Math.max(0,Math.min(n1-1,Math.floor((x-x0)/cs))),Math.max(0,Math.min(m1-1,Math.floor((z-z0)/cs)))];
  const sa=cell(pa[0],pa[1]),sb=cell(pb[0],pb[1]),N=n1*m1,g=new Float32Array(N).fill(1e9),from=new Int32Array(N).fill(-1),closed=new Uint8Array(N);
  let hk=new Float64Array(4096),hv=new Int32Array(4096),hn=0;const hp=(i,j)=>Math.hypot(i-sb[0],j-sb[1])*.9;
  const push=(f,k)=>{if(hn>=hk.length){const a2=new Float64Array(hk.length*2),b2=new Int32Array(hk.length*2);a2.set(hk);b2.set(hv);hk=a2;hv=b2;}let c2=hn++;while(c2>0){const p=(c2-1)>>1;if(hk[p]<=f)break;hk[c2]=hk[p];hv[c2]=hv[p];c2=p;}hk[c2]=f;hv[c2]=k;};
  const pop=()=>{const k=hv[0],lf=hk[--hn],lv=hv[hn];let c2=0;for(;;){let l=c2*2+1;if(l>=hn)break;if(l+1<hn&&hk[l+1]<hk[l])l++;if(hk[l]>=lf)break;hk[c2]=hk[l];hv[c2]=hv[l];c2=l;}hk[c2]=lf;hv[c2]=lv;return k;};
  const ka=sa[1]*n1+sa[0],kb=sb[1]*n1+sb[0];g[ka]=0;push(hp(sa[0],sa[1]),ka);let it=0;
  while(hn){const k=pop();if(k===kb)break;if(closed[k])continue;closed[k]=1;const ci=k%n1,cj=(k/n1)|0;
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ni=ci+di,nj=cj+dj;if(ni<0||nj<0||ni>=n1||nj>=m1)continue;const nk=nj*n1+ni,t=g[k]+cost[nk]*(di&&dj?1.414:1);if(t<g[nk]){g[nk]=t;from[nk]=k;push(t+hp(ni,nj),nk);}}
    if(++it%3000===0&&performance.now()-T>3){yield;T=performance.now();}}
  let road=null;
  if(from[kb]>=0||ka===kb){const cells=[];let k=kb;while(k>=0){cells.push([k%n1,(k/n1)|0]);k=from[k];}cells.reverse();
    const straight=Math.hypot(pb[0]-pa[0],pb[1]-pa[1]);let blocked=false;for(const[i,j]of cells)if(cost[j*n1+i]>=300){blocked=true;break;}
    if(!blocked&&cells.length*cs<straight*2.6+200){
      /* smooth: jittered cell centres, three rounds of corner cutting, resampled every 1.6 m */
      const jit=(i,j,s2)=>{let h=((i*73856093)^(j*19349663)^(WG.seed*83492791)^s2)>>>0;h=Math.imul(h^(h>>>13),1274126177)>>>0;return h/4294967296-.5;};
      let pts=cells.map(([i,j])=>{const gi=Math.floor((x0+(i+.5)*cs)/cs),gj=Math.floor((z0+(j+.5)*cs)/cs);return[x0+(i+.5)*cs+jit(gi,gj,1)*cs*.5,z0+(j+.5)*cs+jit(gi,gj,2)*cs*.5];});
      if(pts.length<2)pts=[pa.slice(),pb.slice()];pts[0]=pa.slice();pts[pts.length-1]=pb.slice();
      for(let r=0;r<3;r++){const q=[pts[0]];for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];q.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}q.push(pts[pts.length-1]);pts=q;}
      const out=[pts[0]],step=1.6;let acc=0,prev=pts[0];for(let i=1;i<pts.length;i++){let a=prev,b=pts[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);while(acc+l>=step){const t=(step-acc)/l;a=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];out.push(a);l=Math.hypot(b[0]-a[0],b[1]-a[1]);acc=0;}acc+=l;prev=b;}out.push(pts[pts.length-1]);
      /* a road to the keep runs on along its approach to the gate */
      if(B===K)for(let d=0;d<=46;d+=1.6)out.push([K.app.x,K.app.z+d]);
      road={key,A,B,pts:out};}}
  if(road){yield;/* its height profile: the land (with streams and the villages' flat ground) along it, smoothed; above the water where it crosses a stream */
    const p=road.pts,n=p.length,H2=wgHydroIn(x0,z0,x1,z1),hgt=new Float32Array(n),wet=new Uint8Array(n),wo={},o2={};
    for(let i=0;i<n;i++){const x=p[i][0],z=p[i][1];o2.mtn=0;o2.tier=0;o2.isl=0;const h0=wgH0(x,z,o2,c);wgHydroApply(x,z,h0,H2,wo);let h=wo.h;h=wsVillageFlat(x,z,h);hgt[i]=h;if(wo.chan||wo.wl>h-.3){wet[i]=1;hgt[i]=Math.max(h,wo.wl);}if(i%40===39&&performance.now()-T>3){yield;T=performance.now();}}
    const sm=new Float32Array(n);for(let i=0;i<n;i++){let a=0,w=0;for(let k=-8;k<=8;k++){const j=i+k;if(j<0||j>=n)continue;const ww=1-Math.abs(k)/9;a+=hgt[j]*ww;w+=ww;}sm[i]=a/w;}
    /* crossings: the road keeps 1.2 m over the water, ramped over 10 m either side */
    const cr=[];for(let i=0;i<n;i++)if(wet[i]){let j=i;while(j+1<n&&wet[j+1])j++;let top=0;for(let k=i;k<=j;k++)top=Math.max(top,hgt[k]+1.2);cr.push({i0:i,i1:j,top});i=j;}
    for(const q of cr){for(let k=Math.max(0,q.i0-7);k<=Math.min(n-1,q.i1+7);k++){const t=k<q.i0?1-(q.i0-k)/7:k>q.i1?1-(k-q.i1)/7:1;sm[k]=Math.max(sm[k],sm[k]+(q.top-sm[k])*wnS(t,0,1));}
      const a=p[q.i0],b=p[q.i1];q.x0=a[0];q.z0=a[1];q.x1=b[0];q.z1=b[1];q.len=Math.hypot(b[0]-a[0],b[1]-a[1])+3;}
    road.h=sm;road.cross=cr;let bx0=1e9,bx1=-1e9,bz0=1e9,bz1=-1e9;for(const q of p){bx0=Math.min(bx0,q[0]);bx1=Math.max(bx1,q[0]);bz0=Math.min(bz0,q[1]);bz1=Math.max(bz1,q[1]);}road.bb=[bx0-8,bz0-8,bx1+8,bz1+8];}
  WS.roads.set(key,road||false);if(road){WS.stats.roads++;wsRoadHash(road);if(WS.onRoad)WS.onRoad(road);}}
/* the road points in a hash of 8 m cells (for the stamps and for "is there a road near") */
function wsRoadHash(r){r.pts.forEach((q,i)=>{const k=Math.floor(q[0]/8)+','+Math.floor(q[1]/8);let L=WS.rh.get(k);if(!L)WS.rh.set(k,L=[]);L.push(r,i);});}
/* ---------- the stamps ---------- */
/* the stamps that reach into a rectangle, as plain data (wgStampApply in wgen.js applies them; the workers get the same data) - null if none */
WG.stampsIn=function(x0,z0,x1,z1){const C=WS_CFG.cell,vs=[];for(let b=Math.floor((z0-140)/C);b<=Math.floor((z1+140)/C);b++)for(let a=Math.floor((x0-140)/C);a<=Math.floor((x1+140)/C);a++){const v=wsSite(a,b);if(v)vs.push(v.x,v.z,v.h,WS_VR[v.size]);}
  const K=wsKeep(),kin=Math.abs(K.x-(x0+x1)/2)<(x1-x0)/2+140&&Math.abs(K.z-(z0+z1)/2)<(z1-z0)/2+140;
  const roads=[],ri=new Map(),rh={};let nr=0;
  for(let tz=Math.floor((z0-8)/8);tz<=Math.floor((z1+8)/8);tz++)for(let tx=Math.floor((x0-8)/8);tx<=Math.floor((x1+8)/8);tx++){const key=tx+','+tz,L=WS.rh.get(key);if(!L)continue;const out=new Array(L.length);
    for(let i=0;i<L.length;i+=2){const r=L[i];let k=ri.get(r);if(k===undefined){k=roads.length;ri.set(r,k);const p=new Float64Array(r.pts.length*2);r.pts.forEach((q,j)=>{p[j*2]=q[0];p[j*2+1]=q[1];});roads.push({p,h:r.h});}out[i]=k;out[i+1]=L[i+1];nr++;}
    rh[key]=out;}
  if(!vs.length&&!kin&&!nr)return null;return{vs,keep:kin?[K.x,K.z,K.h,K.gate.x,K.gate.z,K.hApp,WS_CFG.keepR]:null,roads,rh,nr};};
/* the flat ground of the villages and the keep at a point (what the roads' profiles see) */
function wsVillageFlat(x,z,h){const S=WG.stampsIn(x-1,z-1,x+1,z+1);if(!S)return h;const S2={vs:S.vs,keep:S.keep,nr:0};return wgStampApply(S2,x,z,h,{chan:false});}
/* ---------- work: sites and roads round a point, run within a time budget ---------- */
function wsWant(x,z,R){/* the villages within R and every road of theirs */const C=WS_CFG.cell,out=[];for(let b=Math.floor((z-R)/C);b<=Math.floor((z+R)/C);b++)for(let a=Math.floor((x-R)/C);a<=Math.floor((x+R)/C);a++){const v=wsSite(a,b);if(v)out.push(v);}
  for(const v of out)for(const[k,e]of wsEdgesOf(v))if(!WS.roads.has(k)&&!WS.jobs.some(j=>j.key===k))WS.jobs.push({key:k,g:wsRoadJob(k,e[0],e[1]),d:Math.hypot(v.x-x,v.z-z)});
  /* the keep's own roads */const K=wsKeep();if(Math.hypot(K.x-x,K.z-z)<R)for(let b=-2;b<=1;b++)for(let a=-2;a<=1;a++){const v=wsSite(a,b);if(v)for(const[k,e]of wsEdgesOf(v))if(!WS.roads.has(k)&&!WS.jobs.some(j=>j.key===k))WS.jobs.push({key:k,g:wsRoadJob(k,e[0],e[1]),d:Math.hypot(v.x-x,v.z-z)});}
  WS.jobs.sort((p,q)=>p.d-q.d);return out;}
/* run the queued road jobs for at most ms milliseconds (Infinity: all of them) */
function wsStep(ms){const T0=performance.now();while(WS.jobs.length&&performance.now()-T0<ms){const j=WS.jobs[0];const r=j.g.next();if(r.done)WS.jobs.shift();}return WS.jobs.length;}
/* are all roads that can reach a rectangle known? (a level-0 tile waits for them) */
function wsReady(x0,z0,x1,z1){const C=WS_CFG.cell;for(let b=Math.floor((z0-C)/C);b<=Math.floor((z1+C)/C);b++)for(let a=Math.floor((x0-C)/C);a<=Math.floor((x1+C)/C);a++){const v=wsSite(a,b);if(!v)continue;for(const[k]of wsEdgesOf(v))if(!WS.roads.has(k))return false;}return true;}
function wsReset(){WS.sites.clear();WS.edges.clear();WS.roads.clear();WS.keep=null;WS.jobs=[];WS.rh.clear();WS.stats={sites:0,roads:0,ms:0};}

