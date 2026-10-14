(function(){
/* The elderglade fixes of v48 across many worlds (a --dev build; it re-seeds the generator: reload the page after it). window.__eg = {seeds:[...]}.
   - rings: whole, broken and ruined rings all appear, in about the shares meant (a third / two in five / a quarter);
   - rivers: along every stream the water never rises; where one stream runs into the next the levels meet; the bed is under the water; beside a stream
     the land stands no higher than its valley allows (no wall: water plus bank plus half a metre per metre beyond, with a metre of slack);
   - water: no sheet of water between two waters at different levels in the chunks' water meshes (a cell with corners at different levels is only drawn
     as a fall of one flowing stream);
   - lakes: no two lakes overlap, no lake reaches the world's water;
   - regions: the elderglades are 4 km and more across (as a square of the same area), the great mountains 0.8-1.1 km out to their foot.
   Returns a report; window.__egR = {pass, fail, lines}. */
const o=window.__eg||{},seeds=o.seeds||[1,2,3,4,5,6],R={pass:0,fail:0,lines:[]},ok=(c,m)=>{R[c?'pass':'fail']++;if(!c&&R.lines.length<40)R.lines.push('FAIL '+m);return c;};
const W=new Float64Array(4),RC=WG_CFG.regionCell,S={whole:0,broken:0,ruin:0,seedsAll3:0,segs:0,rise:0,gap:0,bed:0,wall:0,sheets:0,tris:0,lakes:0,overlap:0,sea:0,sizes:[],Rb:[]};
for(const seed of seeds){wgInit(seed);wsReset();wfReset();const kinds={whole:0,broken:0,ruin:0};
  for(let b=-2;b<=2;b++)for(let a=-2;a<=2;a++){const r=wgRegCell(a,b);if(r.type!==WG_T.GLADE)continue;const G=wgGreat(r);S.Rb.push(Math.round(G.Rb));
    /* its size */let n=0;for(let j=-45;j<=45;j++)for(let i=-45;i<=45;i++){wgRegions(r.sx+i*100,r.sz+j*100,W);if(W[3]>.5)n++;}S.sizes.push(Math.round(Math.sqrt(n*1e4)));
    /* its rings */const FC=WF.cell;for(let fb=Math.floor((G.z-3500)/FC);fb<=Math.floor((G.z+3500)/FC);fb++)for(let fa=Math.floor((G.x-3500)/FC);fa<=Math.floor((G.x+3500)/FC);fa++){const f=wfSite(fa,fb);if(!f||f.kind!=='ring')continue;const v=wrVar(f);const k=v.ruin?'ruin':v.brk?'broken':'whole';kinds[k]++;S[k]++;}
    /* its rivers and lakes */
    const H=wgHydroIn(G.cx-2400,G.cz-2400,G.cx+2400,G.cz+2400);
    for(const s of H.segs){S.segs++;for(let k=1;k<=s.n;k++)if(s.wl[k]>s.wl[k-1]+1e-4){S.rise++;ok(false,'seed '+seed+': water rises along a stream');break;}
      const nx=wgSeg(s.q);if(nx&&Math.abs(nx.wl[0]-s.wl[s.n])>.02){S.gap++;ok(false,'seed '+seed+': a stream ends '+(s.wl[s.n]-nx.wl[0]).toFixed(2)+' m off the next one');}
      for(const k of[2,8,12,16,22]){const x=s.pts[k*2],z=s.pts[k*2+1],h=wgHeightRaw(x,z);if(h>s.wl[k]+.05&&_wgHo.wl>-1e8&&!_wgHo.chan){}if(_wgHo.chan&&h>s.wl[k]+.05){S.bed++;}
        const dx=s.pts[k*2+2]-x,dz=s.pts[k*2+3]-z,l=Math.hypot(dx,dz)||1,bw=Math.max(6,(s.hw+(s.hwQ-s.hw)*k/s.n)*1.6+4);
        for(const dd of[bw*.6,bw+8,bw+25,bw+50]){if(dd>s.hw+WG_MG+bw+s.vw)continue;for(const sd of[-1,1]){const px=x-dz/l*(s.hw+dd)*sd,pz=z+dx/l*(s.hw+dd)*sd,hh=wgHeightRaw(px,pz);
          if(_wgHo.wl>-1e8&&Math.abs(_wgHo.wl-s.wl[k])>.5)continue;/* (another water there) */const q=wgSegNear(s,px,pz,{}),bq=Math.max(6,q.hw*1.6+4),cw=q.hw+WG_MG;if(q.d<cw||q.d>cw+bq+s.vw)continue;/* (beyond its valley the land is its own) */
          const ceil=q.w+.25+Math.min(q.d-cw,bq)*.32+Math.max(0,q.d-cw-bq)*WG_VS+1;if(s.vw>0&&hh>ceil&&!wgHydroIn(px-40,pz-40,px+40,pz+40).segs.some(o2=>{if(o2===s)return false;const n2=wgSegNear(o2,px,pz,{});return n2.d<n2.hw+WG_MG+Math.max(6,n2.hw*1.6+4)&&n2.w>ceil-1.5;})/* (another stream higher up, its bank holding its water: not a wall of this valley) */){S.wall++;if(S.wall<4)ok(false,'seed '+seed+': land '+(hh-ceil).toFixed(1)+' m over a valley side');}}}}}
    for(let i=0;i<H.lakes.length;i++){S.lakes++;const A=H.lakes[i];for(let j=i+1;j<H.lakes.length;j++){const B=H.lakes[j];if(Math.hypot(A.x-B.x,A.z-B.z)<(A.R+B.R)*1.32+60){S.overlap++;ok(false,'seed '+seed+': two lakes overlap');}}
      for(let k=0;k<12;k++){const an=k/12*6.2832,h=wgHeightRaw(A.x+Math.cos(an)*A.R*1.25,A.z+Math.sin(an)*A.R*1.25);if(h<WG_CFG.WL+.2&&_wgHo.wl===WG_CFG.WL){S.sea++;ok(false,'seed '+seed+': a lake by the world water');break;}}}
    /* the water meshes of the chunks round the middle: no sheet between two levels */
    for(let k=-2;k<=2;k++)for(let i=-2;i<=2;i++){const L=1,Sz=WG_CFG.tile<<L,ci=Math.floor(G.cx/Sz)+i,ck=Math.floor(G.cz/Sz)+k,ch=wtBuild(L,ci,ck);if(!ch.water){wtDispose(ch);continue;}
      const P=ch.water.geometry.attributes.position.array,D=ch.water.geometry.attributes.aD.array,I=ch.water.geometry.index.array,step=Sz/WT.N,tol=.3+.12*step;
      for(let t=0;t<I.length;t+=3){S.tris++;const a3=I[t],b3=I[t+1],c3=I[t+2],ys=[P[a3*3+1],P[b3*3+1],P[c3*3+1]];if(Math.max(...ys)-Math.min(...ys)<=tol*1.01)continue;
        const fl=[a3,b3,c3].map(q=>Math.hypot(D[q*3+1],D[q*3+2]));if(Math.min(...fl)<.5){S.sheets++;if(S.sheets<4)ok(false,'seed '+seed+': a sheet of water between two levels');}}
      wtDispose(ch);}}
  if(kinds.whole&&kinds.broken&&kinds.ruin)S.seedsAll3++;ok(kinds.broken+kinds.ruin>0,'seed '+seed+': no broken ring near the start');}
const T=S.whole+S.broken+S.ruin;ok(T>0&&S.broken/T>.28&&S.ruin/T>.14&&S.whole/T>.2,'ring shares off: '+S.whole+'/'+S.broken+'/'+S.ruin);
ok(Math.min(...S.sizes)>=3600&&S.sizes.reduce((s,v)=>s+v,0)/S.sizes.length>=4200,'elderglades too small: '+S.sizes.join(' '));
ok(Math.max(...S.Rb)<=1110&&Math.min(...S.Rb)>=700,'great mountains out of range: '+S.Rb.join(' '));
ok(S.rise===0&&S.gap===0&&S.wall===0&&S.sheets===0&&S.overlap===0&&S.sea===0&&S.bed===0,'rivers/water/lakes');
const rep=['worlds '+seeds.length+': '+R.pass+' passed, '+R.fail+' failed',
  'rings: whole '+S.whole+', broken '+S.broken+', ruined '+S.ruin+' ('+(T?Math.round(100*S.whole/T)+'/'+Math.round(100*S.broken/T)+'/'+Math.round(100*S.ruin/T)+' %':'-')+'); worlds with all three near the start: '+S.seedsAll3,
  'streams '+S.segs+': rising '+S.rise+', gaps '+S.gap+', bed over water '+S.bed+', walls beside '+S.wall,
  'water triangles '+S.tris+', sheets between levels '+S.sheets+'; lakes '+S.lakes+', overlapping '+S.overlap+', by the world water '+S.sea,
  'elderglades (side of a square of their area): '+Math.min(...S.sizes)+'-'+Math.max(...S.sizes)+' m, mean '+Math.round(S.sizes.reduce((s,v)=>s+v,0)/S.sizes.length)+'; great mountains '+Math.min(...S.Rb)+'-'+Math.max(...S.Rb)+' m'].concat(R.lines);
window.__egR=R;return rep.join('\n');})()
