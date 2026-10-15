(function(){
/* The main thread's frame times while the land fills round a standing hero (the hydrology-in-the-workers check, v54).
   Load int-lib.js first (through __kk.ev, like this file). Every call returns at once; results land on window.__hfR (poll it).
   __hf.setup(seed,rd,dd)      a world round the keep (I.setup, at the default Render and Detail distance), then Render distance rd and Detail distance dd set
   __hf.run({max,min,quiet,settle:{rd,dd}})  (settle: the world finished first at the settings it has, then Render/Detail distance set to rd/dd and the fill measured)
                               frames driven by hand (the game's own loop held: frame swapped for a stub while it runs), each one timed
                               (anim + tpcApply + owFrame + owView, as the game's frame has them) with the main thread's land samples
                               (WG.stats.h0) and cold hydrology blocks counted; it stops when nothing is left to fill for `quiet` frames
                               (no worker jobs, no road jobs, no tiles waiting, no chunks missing, no new land samples) or after `max` frames.
                               vel:[vx,vz] (m/s): the hero carried along instead, for max frames (travelling into new land at the settings it has)
                               -> {frames, secs, work:{med,p95,p99,max,over25,over50,over100}, h0, hydMain, hydPre, slow:[[frame,ms]...]}
   __hf.prof(on)               exclusive time per function (the hydrology steps and their callers) added up while it runs (window.__hfP) */
const H=window.__hf={};
const pct=a=>{a=a.slice().sort((p,q)=>p-q);const n=a.length,at=f=>+a[Math.min(n-1,Math.floor(n*f))].toFixed(1);
  return{n,med:at(.5),p95:at(.95),p99:at(.99),max:+a[n-1].toFixed(1),over25:a.filter(v=>v>25).length,over50:a.filter(v=>v>50).length,over100:a.filter(v=>v>100).length};};
H.setup=function(seed,rd,dd){setRd(170);setDd(200);if(rd===undefined)rd=170;if(dd===undefined)dd=200;/* (the world built at the default settings, then the setting changed: the fill is what is measured) */const t0=performance.now();window.__iw.setup(seed);setRd(rd);setDd(dd);return{ms:Math.round(performance.now()-t0),fog:Math.round(owFogEnd()),dd:owDd(),pool:WT.pool.length};};
/* the game's own frame held while frames are driven here (the pane may be visible) */
H.hold=function(on){if(on){if(!window.__hfF){window.__hfF=frame;frame=function(){requestAnimationFrame(frame);};}}else if(window.__hfF){frame=window.__hfF;window.__hfF=null;}};
const busy=()=>{const want=WT.want||[];let miss=0;for(const w of want)if(!WT.chunks.has(w.key))miss++;
  return WT.asked.size+WS.jobs.length+miss+(OW._ddM&&OW._ddMi<OW._ddM.length?1:0)+(typeof WHP!=='undefined'?WHP.inFlight||0:0);};
H.run=function(o){o=o||{};if(o.settle){/* (the world round the keep first finished at the settings it was built with - its villages' blocks, its tiles - unmeasured; then the
     setting is changed and the fill measured: a player standing in the world turning the Detail distance up) */const so=o.settle;o.settle=null;window.__hfR=null;H.run({max:so.max||1500,min:60,quiet:45,then:()=>{
      window.__hfS=window.__hfR;if(so.rd)setRd(so.rd);if(so.dd)setDd(so.dd);H.run(o);}});return 'settling';}
  const max=o.max||3000,min=o.min||60,quiet=o.quiet||45;window.__hfR=null;H.hold(true);
  const W=[],slow=[],T=performance.now()/1000;let q=0,i=0,h0p=WG.stats.h0;const h00=WG.stats.h0,hm0=WG.stats.hydMain||0,hp0=WG.stats.hydPre||0,t0=performance.now();
  const cnt=()=>[WG.stats.h0,WG.stats.hydMain||0,WS.sites.size,WS.stats.roads,WT.stats.tiles,WF.list.size,WT.stats.built];
  const V=o.vel;/* (vel: [vx,vz] m/s - the hero carried along at that speed every frame, the frames timed for max frames: travelling into new land) */
  const step=()=>{if(window.__hfPF)for(const k in window.__hfPF)delete window.__hfPF[k];const c0=cnt(),a=performance.now();if(V){heroU.x+=V[0]/30;heroU.z+=V[1]/30;heroU.hx=heroU.x;heroU.hz=heroU.z;}anim(1/30,T+i/30);tpcApply();owFrame();owView();const w=performance.now()-a;W.push(w);
    if(w>50){const c1=cnt(),e=[i,Math.round(w),'h0 '+(c1[0]-c0[0])+' hyd '+(c1[1]-c0[1])+' site '+(c1[2]-c0[2])+' road '+(c1[3]-c0[3])+' tile '+(c1[4]-c0[4])+' lm '+(c1[5]-c0[5])+' ch '+(c1[6]-c0[6])];if(window.__hfPF&&PW.owFrame){const PF=window.__hfPF;e.push(Object.keys(PF).sort((x,y)=>PF[y]-PF[x]).slice(0,3).map(k=>k+':'+Math.round(PF[k])).join(' '));}slow.push(e);}
    const h0=WG.stats.h0;q=(!V&&busy()===0&&h0===h0p)?q+1:0;h0p=h0;i++;
    if((i>=min&&q>=quiet)||i>=max){H.hold(false);const n=W.length-(q>=quiet?quiet:0);/* (the quiet frames at the end are not part of the fill) */
      window.__hfR={frames:i,fill:n,secs:+((performance.now()-t0)/1000).toFixed(1),done:q>=quiet,work:pct(W.slice(0,Math.max(1,n))),h0:WG.stats.h0-h00,hydMain:(WG.stats.hydMain||0)-hm0,hydPre:(WG.stats.hydPre||0)-hp0,
        slow:o.all?slow:slow.slice(0,40).concat(slow.filter((e,k)=>k>=40&&e[1]>150)),sites:WS.sites.size,tiles:WT.tiles.size,chunks:WT.chunks.size,rings:WF.list.size,heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):0};if(o.then)o.then();return;}
    setTimeout(step,2);};
  setTimeout(step,2);return 'started';};
/* who makes the main thread work out a block of hydrology itself: the first caller outside the generator, counted (window.__hfW), on(false) restores */
let WHO=null;
H.who=function(on){if(on&&!WHO){const f=wgHydBlock,C=window.__hfW={};WHO=f;const skip=/^(wgHyd|wgHydBlock|wgAcc|wgDown|wgSeg|wgLake|wgLakeRaw|wgHydroIn|wgHeightRaw|wgHeightAt|wgH0|wgH0At|g|eval|Object|wgHydPack)$/;
    const g2=function(bi,bj){const st=(new Error().stack||'').split('\n').slice(2).map(l=>(l.match(/at (?:Object\.)?([\w$.]+)/)||[])[1]).filter(Boolean);let who='?';for(const n of st)if(!skip.test(n)){who=n;break;}C[who]=(C[who]||0)+1;return f(bi,bj);};
    eval('wgHydBlock=g2');return 'on';}
  if(!on&&WHO){const f=WHO;eval('wgHydBlock=f');WHO=null;}return JSON.stringify(window.__hfW||{});};
/* exclusive time per function: a stack of the time spent in wrapped callees */
const PW={};
/* (hot cached functions - wgSeg, wgLake, wsSite, wfSite - are left out unless o.hot: the wrapper costs more than their cached answer; window.__hfPF holds the
   per-frame times of the last frame, and run() keeps the three biggest of every slow frame) */
H.prof=function(on,hot){const names=['wgHydBlock','wgAcc','wgHydroIn','wrMesh','wrvUpdate','wtUpdate','wstFrame','wsStep','owDetailRoads','owDetailTiles','owDetailAsk','wtBuild','wtTile','wstGridTile','wstVillage','wstLazyStep','wstBlocksStep','wstRocksView','wfUpdate','wfGreat','wgGreat','owgView','owFolView','grsView','trwView','trwPlace','trwMesh','owFrame','wgHeightRaw','wgHeightAt','wsWant','whpStep','wgHydPut','wtHydReady'].concat(hot?['wgSeg','wgLake','wgLakeRaw','wsSite','wfSite','wsKeep']:['wsSite']);
  if(on){window.__hfP={};window.__hfPF={};const P=window.__hfP,PF=window.__hfPF,st=[];
    for(const n of names){let f;try{f=eval(n);}catch(e){continue;}if(typeof f!=='function'||PW[n])continue;PW[n]=f;
      const g=function(){const t=performance.now();st.push(0);let r;try{r=f.apply(this,arguments);}finally{const c=st.pop(),d=performance.now()-t;const e=P[n]||(P[n]={ms:0,n:0,max:0});e.ms+=d-c;e.n++;if(d>e.max)e.max=d;PF[n]=(PF[n]||0)+d-c;if(st.length)st[st.length-1]+=d;}return r;};
      eval(n+'=g');}
    return Object.keys(PW);}
  for(const n in PW){const f=PW[n];eval(n+'=f');delete PW[n];}
  const P=window.__hfP||{},out={};for(const k of Object.keys(P).sort((a,b)=>P[b].ms-P[a].ms))out[k]=[Math.round(P[k].ms),P[k].n,Math.round(P[k].max)];return out;};
})();
