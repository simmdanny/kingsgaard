(function(){
/* The Great Elder Circle across many worlds (a --dev build; it re-seeds the generator: reload the page after it). For each seed, every elderglade
   within two region cells of the start:
   - exactly one great circle, standing in its own region, 380-700 m off the middle of the region (never on it), the offsets pointing every way;
   - the mountain fits the region's core, is several times wider than it is tall, its summit at its height, mostly gentle and green (rock only on its
     outcrops and short risers), no pit lake, crag cluster, ordinary ring or village on it;
   - the ring two to three times the size of an ordinary ring (by the mean of their sizes) and bigger than every ordinary ring of the region;
   - its two feet meet the ground (wrFeet), no stream under them;
   - the peak under its right side: the ring's lower right buried in it up to where the ring comes out at the top, its inner side stony up high, its grassy ramp outwards adding nothing steeper than the walking limit (OW_CFG.slopeMax2, .72) below its crown (the mountain's greenness is measured without the peak);
   - the top of the ring can be seen from most of the region's shores 1-2.2 km off (the line of sight clears the land).
   window.__gc = {seeds:[...]} ; returns a report and window.__gcR = {pass, fail, lines} */
const o=window.__gc||{},seeds=o.seeds||[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],R={pass:0,fail:0,lines:[],stat:{n:0,ratio:[],off:[],oct:[0,0,0,0,0,0,0,0],vis:[],green:[],wide:[],shrunk:0}};
const ok=(c,m)=>{R[c?'pass':'fail']++;if(!c)R.lines.push('FAIL '+m);return c;};
const W=new Float64Array(4),RC=WG_CFG.regionCell;
for(const seed of seeds){wgInit(seed);wsReset();wfReset();
  for(let b=-2;b<=2;b++)for(let a=-2;a<=2;a++){const r=wgRegCell(a,b);if(r.type!==WG_T.GLADE)continue;const G=wgGreat(r),tag='seed '+seed+' cell '+a+','+b;
    if(!ok(!!G,tag+': no great circle'))continue;R.stat.n++;
    /* its own region, never two: no other elderglade cell touches this one */
    for(let db=-1;db<=1;db++)for(let da=-1;da<=1;da++)if((da||db)&&wgRegCell(a+da,b+db).type===WG_T.GLADE)ok(false,tag+': another elderglade touches it');
    wgRegions(G.x,G.z,W);ok(W[3]>.99,tag+': not in the core of its region ('+W[3].toFixed(2)+')');
    const off=Math.hypot(G.x-G.cx,G.z-G.cz);ok(off>=370&&off<=710,tag+': '+off.toFixed(0)+' m off the middle');R.stat.off.push(Math.round(off));
    R.stat.oct[Math.floor(((Math.atan2(G.z-G.cz,G.x-G.cx)+Math.PI)/(2*Math.PI))*8)%8]++;if(G.fitM<0)R.stat.shrunk++;
    /* the mountain: wide, its summit, green */
    const summit=wgHeightRaw(G.x,G.z);ok(Math.abs(summit-G.Hs)<22,tag+': summit '+summit.toFixed(0)+' m, meant '+G.Hs.toFixed(0));
    ok(G.Rb/G.Hs>=4,tag+': not wide enough ('+(G.Rb/G.Hs).toFixed(1)+')');R.stat.wide.push(+(G.Rb/G.Hs).toFixed(1));
    let n=0,steep=0,mid=0;const c=wgCtx(G.x-G.bd,G.z-G.bd,G.x+G.bd,G.z+G.bd,0),oo={};
    for(let j=-30;j<=30;j++)for(let i=-30;i<=30;i++){const x=G.x+i*G.bd/30,z=G.z+j*G.bd/30;if(wgGreatQ(G,x,z)>.8)continue;if(G.crag&&wgCragIn(G.crag,x,z))continue;/* (the peak under the right side is meant to be stony in places: checked below) */oo.mtn=0;const h=wgH0(x,z,oo,c),hx=wgH0(x+3,z,oo,c),hz=wgH0(x,z+3,oo,c),sl=Math.hypot(hx-h,hz-h)/3;n++;if(sl>.75)steep++;if(sl<.35)mid++;}
    const green=1-steep/n;ok(green>.9,tag+': '+(100*steep/n).toFixed(1)+' % of the mountain is rock-steep');R.stat.green.push(+(green*100).toFixed(1));
    /* the peak under the right side: the ring's lower right buried up to where it comes out at the top (its inner and outer edges, its front and
       back), its inner side stony up high, its grassy ramp outwards adding nothing steeper than the walking limit below the crown */
    {const C=G.crag;ok(!!C,tag+': no peak under the right side');if(C){const yc=wgHeightRaw(G.x,G.z)+C.c0,ax=Math.cos(G.yaw),az=Math.sin(G.yaw),th=G.th*1.12;let nb=0,bur=0;
      for(let k=1;k<=40;k++){const ph=k/40*Math.PI/2;if(yc-C.c0+C.He-6<yc-G.R*Math.cos(ph))break;/* (up to just under where the ring comes out) */
        for(const [r,t] of[[G.R-th,0],[G.R+th,0],[G.R,th],[G.R,-th]]){const sx=r*Math.sin(ph),y=yc-r*Math.cos(ph),x=G.x+sx*ax-t*az,z=G.z+sx*az+t*ax;if(y<yc-C.c0+1)continue;nb++;if(wgHeightRaw(x,z)>=y-1)bur++;}}
      ok(nb>8&&bur/nb>=.95,tag+': the ring\'s lower right is not buried ('+bur+' of '+nb+' points of its stone under the ground)');
      const mNo=(x,z)=>{const k0=G.crag;G.crag=null;const v=wgMtn(G,x,z,0);G.crag=k0;return v;},own=(x,z)=>{const m=mNo(x,z);return wgCragApply(C,m,x,z,0)-m;};
      const sl=(f,x,z)=>{const h=f(x,z);return Math.hypot(f(x+3,z)-h,f(x,z+3)-h)/3;},at=(u,v)=>[C.x+u*C.ca-v*C.sa,C.z+u*C.sa+v*C.ca];
      let fi=0,ni=0;for(let k=0;k<10;k++){const r=C.rin-3-6*(k%2),hy=C.He*(.55+.35*k/9),ph=Math.acos(Math.min(1,(C.c0-hy)/r)),sx=r*Math.sin(ph)-12,t=((k%3)-1)*G.th*.5;
        const x=G.x+sx*ax-t*az,z=G.z+sx*az+t*ax;ni++;if(sl((X,Z)=>wgH0(X,Z,oo,c),x,z)>.9)fi++;}
      ok(fi/ni>=.7,tag+': the peak\'s inner side is not stony up high ('+fi+' of '+ni+' steep)');
      let fo=0,no=0;for(let k=0;k<16;k++){const [x,z]=at(C.Lo*(.26+.6*k/15),(k%3-1)*C.Lv*.15);no++;if(sl(own,x,z)<.72)fo++;}/* (below the crown, which is rock all round; its own slope: the mountain's terraces under it are its own) */
      ok(fo/no>=.85,tag+': the peak\'s outer slope is too steep ('+fo+' of '+no+' under the walking limit)');}}
    /* the ordinary rings of the region: none on the mountain, all smaller */
    let maxR=0;const FC=WF.cell;for(let fb=Math.floor((G.z-3000)/FC);fb<=Math.floor((G.z+3000)/FC);fb++)for(let fa=Math.floor((G.x-3000)/FC);fa<=Math.floor((G.x+3000)/FC);fa++){const f=wfSite(fa,fb);if(!f||f.kind!=='ring')continue;
      ok(wgGreatQ(G,f.x,f.z)>1.05,tag+': an ordinary ring on the mountain');if(f.R>maxR)maxR=f.R;}
    const ratio=G.R/(50+100/2.4);ok(ratio>=2&&ratio<=3.2,tag+': ring '+ratio.toFixed(2)+' x an ordinary one');ok(G.R>maxR*1.3,tag+': an ordinary ring nearly as big ('+maxR.toFixed(0)+' vs '+G.R.toFixed(0)+')');R.stat.ratio.push(+ratio.toFixed(2));
    /* villages keep off */
    const C=WS_CFG.cell;for(let vb=Math.floor((G.z-2000)/C);vb<=Math.floor((G.z+2000)/C);vb++)for(let va=Math.floor((G.x-2000)/C);va<=Math.floor((G.x+2000)/C);va++){const v=wsSite(va,vb);if(v)ok(wgGreatQ(G,v.x,v.z)>1+v.fr/G.Rb,tag+': village '+v.name+' on the mountain');}
    /* its feet */
    const f=wfGreat(G),ft=wrFeet(f);ok(ft.length===2,tag+': '+ft.length+' feet meet the ground');
    for(const p of ft){const Hs=wgHydroIn(p.x-80,p.z-80,p.x+80,p.z+80);for(const s of Hs.segs){const q=wgSegNear(s,p.x,p.z,{});ok(q.d>p.half+q.hw+8,tag+': a stream under a foot');}}
    /* seen from the shores: points 1-2.2 km off at the water's edge, the line from 3 m over the ground to the ring's top */
    let seen=0,tried=0;const top=f.y+2*G.R-G.sink;
    for(let k=0;k<24;k++){const an=k/24*6.2832;let P=null;for(let d=1000;d<2200;d+=40){const x=G.x+Math.cos(an)*d,z=G.z+Math.sin(an)*d;wgRegions(x,z,W);if(W[3]<.9)break;const h=wgHeightRaw(x,z);if(h>.3&&h<2.5){P={x,z,h};break;}}
      if(!P)continue;tried++;let clear=true;for(let t=.04;t<.97;t+=.02){const x=P.x+(G.x-P.x)*t,z=P.z+(G.z-P.z)*t,ly=P.h+3+(top-P.h-3)*t;if(wgHeightRaw(x,z)>ly){clear=false;break;}}if(clear)seen++;}
    if(tried)R.stat.vis.push(+(seen/tried).toFixed(2));ok(!tried||seen/tried>=.6,tag+': its top is seen from '+seen+' of '+tried+' shores');}}
const S=R.stat,avg=a=>a.length?+(a.reduce((s,v)=>s+v,0)/a.length).toFixed(2):null;
const rep=['great circles: '+S.n+' in '+seeds.length+' worlds; '+R.pass+' passed, '+R.fail+' failed; shrunk to fit: '+S.shrunk,
  'off the middle: '+Math.min(...S.off)+'-'+Math.max(...S.off)+' m, by direction (octants) '+S.oct.join(' '),
  'ring / ordinary: '+Math.min(...S.ratio)+'-'+Math.max(...S.ratio)+'; width / height: '+Math.min(...S.wide)+'-'+Math.max(...S.wide),
  'green: '+Math.min(...S.green)+'-'+Math.max(...S.green)+' % (mean '+avg(S.green)+'); seen from the shores: mean '+avg(S.vis)+', least '+Math.min(...S.vis)].concat(R.lines.slice(0,30));
window.__gcR=R;return rep.join('\n');})()
