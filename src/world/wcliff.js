/* =====================================================================================================
   CLIFFS (src/world/wcliff.js, world look 1): the rock of a cliff is one continuous surface, made with the ground - not walls of separate blocks.
   For a level-0 tile (128 m) this builds the sheet that covers its cliff faces, as plain arrays (no three.js here: the workers can run it too).
   - The face: the land's own heights, sampled on a world-anchored raster of WCL.r (1 m) from the generator itself (wgH0 + the hydrology +
     the settlements' stamps, exactly as wgGrid makes the tiles), read back with a cubic B-spline (a smooth surface and its slope everywhere). The
     2 m lattice the ground is drawn with is far too coarse for walls 10-90 m tall over a few metres.
   - The stones, of two kinds by the cliff's own height (the cliff rework's rule): where the land rises more than WCL.tall (7 m, about four times
     the hero) over 12 m along the slope, tall columns; lower walls and outcrops, stacked blocks; the loose rocks are the boulders (wboulder.js). All
     three share the palette and the material (wcliffmat.js). Anchored to the world, not to the tile: a jittered 3D grid of cells per kind and scale
     (blocks 2.6 x 1.6 m, columns 1.8 x 5 m, times the cliff's scale sc = 1, 2, 3 or 5 by how tall it is - a column no wider or taller than at 2.5),
     each cell's point snapped onto the face along the slope; a cell keeps a stone only if the face passes through it, it is steep there, the scale
     and the kind there are the grid's, and (so a face running across the grid is no denser than one along it) with a chance of 1 / (|nx| + |nz|).
     Every tile finds the same stones, so the sheet is the same on both sides of a tile border and after every reload. A stone is a carved
     parallelogram in the face's plane with up to two corners cut off and straight bevels. A block is shallow; a column stands out 0.25-2.6 m (so
     the columns step forward and back), most with a ridge down its front and a bend along its height, its top flat (the moss's) or cut; here and
     there a row of columns ends level, the row above set back - the ledges. Where stones overlap the one standing furthest out wins.
   - The surface: an isosurface (surface nets on a world-anchored grid of WCL.cs per level: 0.8, 1.6, 3.2 m) of the larger of the turf's part -
     the distance under the smooth face, less a burial (0.45 m under the turf on gentle ground, so the grass line at the foot and over the rim is
     wherever the slope eases; some metres from any cliff the sheet dives deep, where it ends) - and the wall's: the stones' relief less the wall's
     horizontal distance at the node's own height (from a running maximum of the land along the way up), so a stone stands out of a sheer wall as
     far as its relief and down to the ground. Every node's F is a function of where it is alone, so two tiles agree on every node they share.
   - For the material, per vertex: the face's normal without the stones (the stones' own shape is lit per pixel), the eight best stones there
     (the shader finds the seams between them per pixel), the recess and concavity (baked occlusion, at most 0.35), rho, and the palette
     (grey on the spires' stone, brown on the tablelands').
   The cliff never looks at the camera: a tile's sheet is final as soon as it is made.
   ===================================================================================================== */
const WCL_SN=24;/* (floats a stone: see wclStones) */
const WCL={face:[[1.5,2.4],[2.5,10.5]],foot:[[2,.6],[3,.8]],r:1,cs:[.8,1.6,3.2],cellH:2.6,cellV:1.6,colH:1.8,colV:5,tall:7,crown:5,steep:1.0,ring:4,margin:72,SC:[1,2,3,5],wp:9,ws:.5,rw:3.4,bury:.45,deep:3,ms:3,stats:{built:0,ms:0,verts:0,stones:0}};
/* cubic B-spline weights (and their derivatives): smooth, and never overshooting at a sheer step as an interpolating spline does (its ripples ran
   down the walls as ribs) - the face is the raster smoothed by about its own spacing */
const WCL_CR=(u,w,d)=>{const u2=u*u,u3=u2*u,m=1-u;w[0]=m*m*m/6;w[1]=(3*u3-6*u2+4)/6;w[2]=(-3*u3+3*u2+3*u+1)/6;w[3]=u3/6;
  d[0]=-m*m*.5;d[1]=(3*u2-4*u)*.5;d[2]=(-3*u2+2*u+1)*.5;d[3]=u2*.5;};
/* the land under a tile and round it: a raster of full heights (as wgGrid: wgH0, the hydrology, the stamps) and how much the cliff is barred
   there (the spires, the elderglade, water), each sample made the first time it is read. st: the stamps (the main thread finds them itself) */
function wclSampler(x0,z0,S,st){const M=WCL.margin,r=WCL.r,X0=x0-M,Z0=z0-M,n=Math.round((S+2*M)/r)+1,E=n*r;
  const c=wgCtx(X0-4,Z0-4,X0+E+4,Z0+E+4,0),Hy=wgHydroIn(X0-60,Z0-60,X0+E+60,Z0+E+60);
  const ST=st!==undefined?st:(WG.stampsIn?WG.stampsIn(X0-2,Z0-2,X0+E+2,Z0+E+2):null);
  const h=new Float32Array(n*n).fill(NaN),wv=new Float32Array(n*n),sn=new Float32Array(n*n),ko=new Float32Array(n*n);
  const s={x0,z0,S,X0,Z0,n,r,h,wv,sn,ko,cnt:0,
    at(ix,iz){if(ix<0)ix=0;else if(ix>=n)ix=n-1;if(iz<0)iz=0;else if(iz>=n)iz=n-1;const q=iz*n+ix;if(h[q]!==h[q])fill(q,ix,iz);return q;}};
  function fill(q,ix,iz){const x=X0+ix*r,z=Z0+iz*r,o=_wgO;o.mtn=0;o.tier=0;o.isl=0;o.sink=null;o.ped=0;
    const h0=wgH0(x,z,o,c);wgHydroApply(x,z,h0,Hy,_wgHo);let hv=_wgHo.h;if(ST)hv=wgStampApply(ST,x,z,hv,_wgHo);
    let wl=_wgHo.wl;if(o.sink&&o.w2>.95&&o.sink>wl)wl=o.sink;
    h[q]=hv;wv[q]=wl>-1e8?wl:-1e9;sn[q]=o.w1>0?o.w1*wnS(o.mtn,70,190):0;ko[q]=ST?wclKeepOff(ST,x,z):0;s.cnt++;}
  return s;}
/* the keep-offs (1: no stone stands out here): a road's corridor (as wgStampApply finds the road: within 5.6 m of its points, fading from 2.4 m), a village's
   ground, the keep's - so a stone never pushes into a road or a yard; the plain face is there instead */
function wclKeepOff(S,x,z){let k=0;const V=S.vs;for(let i=0;i<V.length;i+=4){const VR=V[i+3],dx=x-V[i],dz=z-V[i+1];k=Math.max(k,1-wnS(Math.sqrt(dx*dx+dz*dz),VR*.7,VR*1.0));}
  const K=S.keep;if(K){const dx=x-K[0],dz=z-K[1];k=Math.max(k,1-wnS(Math.sqrt(dx*dx+dz*dz),K[6],K[6]+8));}
  if(S.nr&&k<1)for(let tz=Math.floor((z-6)/8);tz<=Math.floor((z+6)/8);tz++)for(let tx=Math.floor((x-6)/8);tx<=Math.floor((x+6)/8);tx++){const L=S.rh[tx+','+tz];if(!L)continue;
    for(let i=0;i<L.length;i+=2){const rd=S.roads[L[i]],j=L[i+1],dx=rd.p[j*2]-x,dz=rd.p[j*2+1]-z;k=Math.max(k,1-wnS(Math.sqrt(dx*dx+dz*dz),3.2,6.0));}}
  return k;}
/* the smooth face at x,z: o.h, its slope o.hx, o.hz, the water level o.wl (the highest of the four samples round it; -1e9: none), the snow o.sn */
/* how barred a point at height y is by water of level wl: only under it (the rock goes down into a stream or a lake, the water is drawn over it) */
const wclWet=(y,wl)=>wl>-1e8?wnS(y-wl,.3,-.6):0;
const _wclW=[new Float64Array(4),new Float64Array(4),new Float64Array(4),new Float64Array(4)];
function wclH(s,x,z,o){const fx=(x-s.X0)/s.r,fz=(z-s.Z0)/s.r,i=Math.floor(fx),k=Math.floor(fz),wu=_wclW[0],du=_wclW[1],wv=_wclW[2],dv=_wclW[3],h=s.h,n=s.n;
  WCL_CR(fx-i,wu,du);WCL_CR(fz-k,wv,dv);let H=0,Hx=0,Hz=0;
  for(let b=0;b<4;b++){let a0=0,a1=0;for(let a=0;a<4;a++){const v=h[s.at(i-1+a,k-1+b)];a0+=wu[a]*v;a1+=du[a]*v;}H+=a0*wv[b];Hx+=a1*wv[b];Hz+=a0*dv[b];}
  const u=fx-i,v=fz-k,q00=s.at(i,k),q10=s.at(i+1,k),q01=s.at(i,k+1),q11=s.at(i+1,k+1),e=s.wv;
  o.h=H;o.hx=Hx/s.r;o.hz=Hz/s.r;o.wl=Math.max(e[q00],e[q10],e[q01],e[q11]);const w=s.sn;o.sn=(w[q00]*(1-u)+w[q10]*u)*(1-v)+(w[q01]*(1-u)+w[q11]*u)*v;const kk=s.ko;o.ko=(kk[q00]*(1-u)+kk[q10]*u)*(1-v)+(kk[q01]*(1-u)+kk[q11]*u)*v;return o;}
/* the cliff's scale at a point (how tall it is: the rise over 10 m either side, uphill along the slope) */
function wclScale(s,x,z,gx,gz){const o=_wclO2;wclH(s,x+gx*20,z+gz*20,o);const up=o.h;wclH(s,x-gx*20,z-gz*20,o);const rel=up-o.h;return rel<16?1:rel<34?2:rel<60?3:5;}
const _wclO1={h:0,hx:0,hz:0,wl:0,sn:0,ko:0},_wclO2={h:0,hx:0,hz:0,wl:0,sn:0,ko:0},_wclO3={h:0,hx:0,hz:0,wl:0,sn:0,ko:0},_wclO4={h:0,hx:0,hz:0,wl:0,sn:0,ko:0};
/* the cliff's own height at a point of its face: the rise over 6 m either side along the slope - taller than WCL.tall (7 m, about four times the
   hero) it is a tall cliff of columns, lower a wall of stacked blocks (the rule of the cliff rework) */
function wclTall(s,x,z,gx,gz){const o=_wclO2;wclH(s,x+gx*6,z+gz*6,o);const up=o.h;wclH(s,x-gx*6,z-gz*6,o);return up-o.h>WCL.tall?1:0;}
/* a lattice cell (2 m, world indices) is steep: its corners rise more than WCL.steep per metre, not barred (from raster samples at lattice points) */
function wclSteepCell(s,I,K){const g=WG_CFG.res,f=g/s.r,ix=Math.round((I*g-s.X0)/s.r),iz=Math.round((K*g-s.Z0)/s.r),h=s.h,e=s.wv;
  const a=s.at(ix,iz),b=s.at(ix+f,iz),c=s.at(ix,iz+f),d=s.at(ix+f,iz+f);if(wclWet(h[a],e[a])+wclWet(h[b],e[b])+wclWet(h[c],e[c])+wclWet(h[d],e[d])>2)return false;
  const ha=h[a],hb=h[b],hc=h[c],hd=h[d],m=Math.max(Math.abs(hb-ha),Math.abs(hc-ha),Math.abs(hd-hb),Math.abs(hd-hc),Math.abs(hd-ha)/1.414,Math.abs(hc-hb)/1.414);return m>=WCL.steep*g;}

/* ---------- the stones that can reach a tile ---------- */
/* stones: Float32Array of WCL_SN (24) per stone, as the material's table (6 texels):
     x, y, z (world), w | h, cos rot, sin rot, skew | amp, bevel (m), ta, tb | nx, nz (out of the face), id, sc | pr, cut 1 (dir x, y, offset) | cut 2, -
   A stone is a carved block: a parallelogram in the face's plane (w x h, turned by rot, its sides slanted by skew) with up to two corners cut off,
   pushed out of the face with straight bevels of a constant width (mitred at the corners: a block, not a pillow) */
function wclStones(s,xa,za,xb,zb,steepAt){const out=[],seed=WG.seed|0,o=_wclO1,o2=_wclO3,g=WG_CFG.res;
  /* (two grids: mode 0 the stacked blocks of the low walls, mode 1 the columns of the tall cliffs - a stone is kept by the grid of its own kind) */
  for(const mode of[0,1])for(const sc of WCL.SC){const Ah=mode?WCL.colH*Math.min(sc,2.5):WCL.cellH*sc,Av=mode?WCL.colV*Math.min(sc,2.5):WCL.cellV*sc,E=mode?.6*Math.hypot(1.85*Ah,2.2*Av+.4)+Ah+1:4*sc+Ah;/* (a column of the biggest cliffs: no wider and no taller than at scale 2.5; E: the cells round the tile whose stones can reach it) */
    for(let ck=Math.floor((za-E)/Ah);ck<=Math.floor((zb+E)/Ah);ck++)for(let ci=Math.floor((xa-E)/Ah);ci<=Math.floor((xb+E)/Ah);ci++){
      /* (only where the cell, or a lattice cell beside it, is steep; its heights bound the levels to try) */
      const I0=Math.floor(ci*Ah/g)-1,I1=Math.floor((ci+1)*Ah/g)+1,K0=Math.floor(ck*Ah/g)-1,K1=Math.floor((ck+1)*Ah/g)+1;let any=false;
      for(let K=K0;K<=K1&&!any;K++)for(let I=I0;I<=I1;I++)if(steepAt(I,K)){any=true;break;}if(!any)continue;
      const hc=(X,Z)=>s.h[s.at(Math.round((X-s.X0)/s.r),Math.round((Z-s.Z0)/s.r))],cH00=hc(ci*Ah,ck*Ah),cH10=hc((ci+1)*Ah,ck*Ah),cH01=hc(ci*Ah,(ck+1)*Ah),cH11=hc((ci+1)*Ah,(ck+1)*Ah);
      let lo=1e9,hi=-1e9;for(let K=K0;K<=K1+1;K++)for(let I=I0;I<=I1+1;I++){const q=s.at(Math.round((I*g-s.X0)/s.r),Math.round((K*g-s.Z0)/s.r)),hv=s.h[q];if(hv<lo)lo=hv;if(hv>hi)hi=hv;}
      /* (the cliff's scale at the cell, from its corner plane: more than a class from this grid's, none of its stones would pass the test below) */
      {const dx=(cH11+cH10-cH01-cH00)*.5,dz=(cH11+cH01-cH10-cH00)*.5,dl=Math.hypot(dx,dz);if(dl>1e-3&&Math.abs(WCL.SC.indexOf(wclScale(s,(ci+.5)*Ah,(ck+.5)*Ah,dx/dl,dz/dl))-WCL.SC.indexOf(sc))>1)continue;}
      for(let cj=Math.floor(lo/Av)-1;cj<=Math.floor(hi/Av);cj++)for(let kc=0;kc<1;kc++){/* (one stone a cell: about twice its size, so the stones cover the face overlapping about twice) */const R=wnRng(wnHashI(ci*7919+cj*104729+kc*7,ck*1299709+cj*15485863,seed+7100+sc*131+kc*977+mode*5003));
        /* (courses: the stones of a cell row sit at about the same height, the rows wandering gently along the cliff) */
        let x=(ci+.1+.8*R())*Ah,z=(ck+.1+.8*R())*Ah,y=(cj+.5+.6*(R()-.5))*Av+.45*Av*wnN(WG.N[18],x/(9*sc),z/(9*sc));
        const w=mode?Ah*(.75+1.1*R()):(2.4+2.6*R())*sc,hh=mode?Av*(1.2+1.0*R()):Av*(1.0+.6*R())*(R()<.14?1.5:1);let ok=false;
        /* (the face at this height: along the cell's overall slope (a plane through its corners), bracketed in half-metre steps either way of the
           start, then bisected; a start on the flat above or below a wall finds the wall too) */
        {const dx=(cH11+cH10-cH01-cH00)*.5,dz=(cH11+cH01-cH10-cH00)*.5,dl=Math.hypot(dx,dz);
          if(dl>1e-3){const ux=dx/dl,uz=dz/dl;let fmin=1e9,fmax=-1e9;
            const snap=yv=>{const F=t=>{wclH(s,x+ux*t,z+uz*t,o);const f=o.h-yv;if(f<fmin)fmin=f;if(f>fmax)fmax=f;return f;};let tb=null,fa=F(0);
              if(Math.abs(fa)<1e-3)return 0;let pp=fa,pm=fa;for(let t=.5;t<=Ah*1.2&&tb===null;t+=.5){const fpp=F(t),fmm=F(-t);let lo=null,hi=0,flo=0;
                if((pp<=0)!==(fpp<=0)){lo=t-.5;hi=t;flo=pp;}else if((pm<=0)!==(fmm<=0)){lo=-(t-.5);hi=-t;flo=pm;}
                if(lo!==null){for(let it=0;it<14;it++){const md=(lo+hi)*.5,fm=F(md);if((fm<=0)===(flo<=0)){lo=md;flo=fm;}else hi=md;}tb=(lo+hi)*.5;}pp=fpp;pm=fmm;}return tb;};
            let tb=snap(y);
            /* (a stone of the lowest course whose middle is under the foot - or of the highest, over the rim - within a course of it settles onto it:
               its middle 0.3 of its height up from the foot (down from the rim), so the stones go down to the grass and up to the top) */
            if(tb===null&&fmin>0&&fmin<Av+hh*.5){y+=fmin+.3*hh;fmin=1e9;fmax=-1e9;tb=snap(y);}else if(tb===null&&fmax<0&&-fmax<Av+hh*.5){y+=fmax-.3*hh;fmin=1e9;fmax=-1e9;tb=snap(y);}
            if(tb!==null){x+=ux*tb;z+=uz*tb;ok=true;}}}
        if(!ok)continue;wclH(s,x,z,o);const gl=Math.hypot(o.hx,o.hz);if(Math.abs(o.h-y)>.1||gl<1.1||wclWet(y,o.wl)>.5||o.ko>.3)continue;
        if(x<ci*Ah||x>=(ci+1)*Ah||z<ck*Ah||z>=(ck+1)*Ah)continue;/* (a point of the face belongs to one cell only) */
        /* (rock look: a stone only on a face that stays steep - a block where the land rises 2.4 m over the 3 m across it (39 degrees on average), a
           column 10.5 m over 5 m (65 degrees: a wall, not a steep hillside) - not on a hillside that is steep for a step or two, nor on the steep
           flanks under a peak: there a column or a block only poked out of the turf, painted with its grass - half-buried shards, ribs fanning down -
           and the land falls on under it (a block 0.6 a metre over the 2 m down the slope, a column 0.8 over 3 m: at a cliff's ragged foot a stone
           stood half out of the turf) */
        {const q4=_wclO4,gq=o.hx/gl,gr=o.hz/gl,F=WCL.face[mode],D=WCL.foot[mode];wclH(s,x+gq*F[0],z+gr*F[0],q4);const hu=q4.h;wclH(s,x-gq*F[0],z-gr*F[0],q4);if(hu-q4.h<F[1])continue;
          wclH(s,x-gq*D[0],z-gr*D[0],q4);if(o.h-q4.h<D[1]*D[0])continue;}
        const gx=o.hx/gl,gz=o.hz/gl;if(R()>1/(Math.abs(gx)+Math.abs(gz)))continue;
        if(wclScale(s,x,z,gx,gz)!==sc||wclTall(s,x,z,gx,gz)!==mode)continue;
        if(mode){/* a column: tall, upright, its sides a little slanted, its front turned a little (and on most of them a ridge down its middle: two facets), standing
            out 0.25-2.6 m, evenly spread - so the columns step forward and back - with crisp bevels and a flat top (the grass and the moss on it) or a chamfered or pointed one (the
            tops break the cliff's skyline). Never further out than 3 m at its most turned edge (the wall's reach, WCL.rw) */
          const rot=(R()-.5)*.08,sk=(R()-.5)*.2,bev=(.06+.06*R())*w,ta=(R()-.5)*1.2,amp0=Math.min(2.6,(.3+2.0*R())*(sc>1?1.2:.85)),tb=(R()-.5)*.15,rg=R()<.9?.35+.5*R():0;let amp=Math.min(amp0,3.0/(1+Math.abs(ta)));
          const cut=[0,0,1e3,0,0,1e3];for(let k2=0;k2<2;k2++)if(R()<.55){const th=Math.PI/2+(k2?-1:1)*(.45+.35*R()),cx=Math.cos(th),cy=Math.sin(th);cut[k2*3]=cx;cut[k2*3+1]=cy;cut[k2*3+2]=(Math.abs(cx)*w*.5+Math.abs(cy)*hh*.5)*(.72+.22*R());}
          /* the ledges: here and there (a third of the rows, in stretches of 40 m) the columns of a row end level with each other at the line the rows wander
             along, flat-topped, and the row above stands 1.3 m further back - a shelf for the grass and the moss, broken where a column's front is behind
             the one above it */
          let hs=hh;{const yb=(cj+1)*Av+.45*Av*wnN(WG.N[18],x/(9*sc),z/(9*sc)),gx4=Math.floor(x/40),gz4=Math.floor(z/40),
              ledge=k=>wnRng(wnHashI(gx4*733+k*31,gz4*977+k*17,seed+7300+sc*13))()<.33;
            if(ledge(cj)&&yb-y>.15*hh&&yb-y<.5*hh){hs=Math.max(hh,2*(yb-y)+.4);/* (the line within the column's own top half: a column settled onto the foot is not stretched up to it) */amp=Math.max(amp,Math.min(3.0/(1+Math.abs(ta)),1.7+.7*R()));cut[0]=0;cut[1]=1;cut[2]=yb-y;if(cut[5]<1e3&&cut[4]>0){cut[3]=0;cut[4]=0;cut[5]=1e3;}}/* (its top level at the line) */
            if(ledge(cj-1))amp=Math.max(.25,amp-1.3);}/* (the row over a ledge, set back) */
          out.push(x,y,z,w,hs,Math.cos(rot),Math.sin(rot),sk,amp,bev,ta,tb,-gx,-gz,R(),sc,R()*.06*sc,cut[0],cut[1],cut[2],cut[3],cut[4],cut[5],rg);continue;}
        const rot=(R()-.5)*.36,sk=(R()-.5)*.6,mn=Math.min(w,hh),bev=(.12+.10*R())*mn,amp=Math.min(1.5,bev*(.75+.5*R()));
        const cut=[0,0,1e3,0,0,1e3];for(let ci2=0;ci2<2;ci2++)if(R()<(ci2?.35:.7)){const th=Math.atan2((R()<.5?-1:1)*hh*.5,(R()<.5?-1:1)*w*.5)+(R()-.5)*.7,cx=Math.cos(th),cy=Math.sin(th);
          cut[ci2*3]=cx;cut[ci2*3+1]=cy;cut[ci2*3+2]=(Math.abs(cx)*w*.5+Math.abs(cy)*hh*.5)*(.6+.28*R());}
        out.push(x,y,z,w,hh,Math.cos(rot),Math.sin(rot),sk,amp,bev,(R()-.5)*.5,(R()-.5)*.5,-gx,-gz,R(),sc,R()*.06*sc,cut[0],cut[1],cut[2],cut[3],cut[4],cut[5],0);}}}
  return new Float32Array(out);}
/* a column's front, bent back once along its height (0.65-1 of its relief, at a height of its own: two facets up it) - from its id, as the material
   finds it; a block, or a ledge's flat-topped column, is not bent */
const wclFr=v=>v-Math.floor(v);
function wclKink(A,q,b,w,h){if(h<1.9*w||(A[q+17]===0&&A[q+18]===1))return 1;const id=A[q+14];return 1-.35*wclFr(id*7.13)*Math.abs(b-(wclFr(id*3.37)-.5)*.6*h)/(h*.5);}
/* a stone's score and relief at a point (or -1 outside it); A: the stones array, k: its index */
/* res.f: the stone's relief as painted (its own bevel); res.g: as built - the same pillow with a bevel at least WCL.bg metres wide, so the surface is
   smooth at the grid's spacing (the crisp edges are the shader's) */
function wclStoneAt(A,k,x,y,z,res){const q=k*WCL_SN,dx=x-A[q],dy=y-A[q+1],dz=z-A[q+2],nx=A[q+12],nz=A[q+13],w=A[q+3],h=A[q+4],dn0=dx*nx+dz*nz,mx=.6*Math.min(w,h);
  /* (along its normal: in front of the face it reaches as far as it stands out and a margin, behind it 0.6 of its size) */
  const dn=dn0>0?Math.max(0,dn0-A[q+8]):-dn0;if(dn>mx){res.d=-1e9;return -1;}
  const u0=-dx*nz+dz*nx,a=u0*A[q+5]+dy*A[q+6],b=-u0*A[q+6]+dy*A[q+5],sk=A[q+7];
  let d=Math.min((w*.5-Math.abs(a+sk*b))/Math.sqrt(1+sk*sk),h*.5-Math.abs(b));
  d=Math.min(d,A[q+19]-(a*A[q+17]+b*A[q+18]),A[q+22]-(a*A[q+20]+b*A[q+21]));res.d=d;if(d<=0)return -1;
  const mn=Math.min(w,h),fd=1-wnS(dn,.2*mn,.6*mn);if(fd<=0){res.d=-1e9;return -1;}
  const amp=A[q+8]*fd,bev=A[q+9],t=Math.min(1,d/bev),tl=(1+A[q+10]*a/(w*.5)+A[q+11]*b/(h*.5))*(1-A[q+23]*Math.abs(a)/(w*.5))*wclKink(A,q,b,w,h),f=amp*t*tl;/* (A[q+23]: a column's ridge) */res.f=f;res.cap=Math.min(1,d/(.5*mn));
  const tg=Math.min(1,d/Math.max(bev,WCL.bg));res.g=amp*tg*tg*(3-2*tg)*tl;return f+A[q+16]*fd;}
/* the stones by cell of WCL_G metres (local to the tile's box) */
const WCL_G=3;
function wclGrid(A,X0,Z0,mg){const m=new Map(),n=A.length/WCL_SN;
  for(let k=0;k<n;k++){const q=k*WCL_SN,w=A[q+3],h=A[q+4],mn=Math.min(w,h),rad=.55*w+.5*h*(Math.abs(A[q+7])+Math.abs(A[q+6]))+.6*mn+A[q+8]+.1+(mg||0),rv=.55*h+.2*w+.1+(mg||0);
    for(let gy=Math.floor((A[q+1]-rv)/WCL_G);gy<=Math.floor((A[q+1]+rv)/WCL_G);gy++)for(let gz=Math.floor((A[q+2]-rad-Z0)/WCL_G);gz<=Math.floor((A[q+2]+rad-Z0)/WCL_G);gz++)
      for(let gx=Math.floor((A[q]-rad-X0)/WCL_G);gx<=Math.floor((A[q]+rad-X0)/WCL_G);gx++){const key=gx+256*(gz+256*(gy+8192));let L=m.get(key);if(!L)m.set(key,L=[]);L.push(k);}}
  return {m,X0,Z0};}
/* the winning stone at a point: relief of the winner (q.f), its index (q.k), the cap there, and the best four (q.top: indices, by score) */
/* mg: also rank the candidates (q.top, q.n: up to 8) - the stones over the point by score, then those within mg metres of it by how near (a triangle's
   stones are its corner's: one that covers only part of the triangle must be among them); mg < 0: no ranking (the surface needs only q.g) */
const _wclR={f:0,g:0,cap:0,d:0};
function wclWin(A,G,x,y,z,q,nx,nz,mg){q.f=0;q.g=0;q.k=-1;q.cap=0;q.n=0;if(mg===undefined)mg=-1;const L=G.m.get(Math.floor((x-G.X0)/WCL_G)+256*(Math.floor((z-G.Z0)/WCL_G)+256*(Math.floor(y/WCL_G)+8192)));if(!L)return q;
  let s1=-1;const T=q.top,S=q.ts;
  for(const k of L){const kk=k*WCL_SN;if(A[kk+12]*nx+A[kk+13]*nz<.3)continue;/* (a stone of another face: the far side of a pillar, a fin) */
    const sc=wclStoneAt(A,k,x,y,z,_wclR);
    if(sc>=0){if(_wclR.g>q.g)q.g=_wclR.g;if(sc>s1){s1=sc;q.f=_wclR.f;q.k=k;q.cap=_wclR.cap;}}
    if(mg<0)continue;const rk=sc>=0?10+sc:_wclR.d>-mg?5+_wclR.d:-1;if(rk<0)continue;
    /* the best eight */let p=Math.min(q.n,8);while(p>0&&S[p-1]<rk){if(p<8){S[p]=S[p-1];T[p]=T[p-1];}p--;}if(p<8){S[p]=rk;T[p]=k;if(q.n<8)q.n++;}}
  return q;}

/* ---------- a tile's sheet (a generator: it yields when its time, WCL.ms, is up; the arrays are in out) ----------
   t: the level-0 tile, lod 0 (WCL.cs[0]) or 1 */
function* wclGen(t,lod,out,st){const T0=performance.now();let tY=T0;const S=WG_CFG.tile,g=WG_CFG.res,x0=t.x0,z0=t.z0,c=WCL.cs[lod]||1,N=Math.round(S/c);WCL.bg=1.6*c;
  const tm=out.tm=[];const mark=()=>tm.push(Math.round(performance.now()-T0));
  const s=wclSampler(x0,z0,S,st);mark();yield;
  /* the steep lattice cells round the tile (from the raster: the same everywhere) and how far each cell is from one (in cells, capped) */
  const RG=WCL.ring,GM=RG+3,NC=S/g+2*GM,I0=Math.round(x0/g)-GM,K0=Math.round(z0/g)-GM,/* (the grid 3 cells wider than the distance reaches: the nodes past the tile's edge see every steep cell their neighbour tile sees) */stp=new Uint8Array(NC*NC),dist=new Float32Array(NC*NC).fill(99),memo=new Map();
  const steepAt=(I,K)=>{const li=I-I0,lk=K-K0;if(li>=0&&lk>=0&&li<NC&&lk<NC)return stp[lk*NC+li]===1;const key=I+','+K;let v=memo.get(key);if(v===undefined){v=wclSteepCell(s,I,K);memo.set(key,v);}return v;};
  let nSteep=0;for(let lk=0;lk<NC;lk++){for(let li=0;li<NC;li++)if(wclSteepCell(s,I0+li,K0+lk)){stp[lk*NC+li]=1;nSteep++;}if(performance.now()-tY>WCL.ms){yield;tY=performance.now();}}
  out.steep=nSteep;mark();if(!nSteep){out.pos=null;return;}
  for(let lk=0;lk<NC;lk++)for(let li=0;li<NC;li++){if(!stp[lk*NC+li])continue;for(let b=-RG;b<=RG;b++)for(let a=-RG;a<=RG;a++){const ii=li+a,kk=lk+b;if(ii<0||kk<0||ii>=NC||kk>=NC)continue;const d=Math.hypot(a,b),q=kk*NC+ii;if(d<dist[q])dist[q]=d;}}
  /* the cells' distance, read at a point (bilinear between cell centres) */
  const distAt=(x,z)=>{const fx=(x-I0*g)/g-.5,fz=(z-K0*g)/g-.5,i=Math.floor(fx),k=Math.floor(fz),u=fx-i,v=fz-k,D=(a,b)=>{a=Math.max(0,Math.min(NC-1,a));b=Math.max(0,Math.min(NC-1,b));return Math.min(dist[b*NC+a],RG);};
    return (D(i,k)*(1-u)+D(i+1,k)*u)*(1-v)+(D(i,k+1)*(1-u)+D(i+1,k+1)*u)*v;};
  /* the stones */
  const A=wclStones(s,x0-c,z0-c,x0+S+c,z0+S+c,steepAt),G=wclGrid(A,x0-40,z0-40,1.5*c);out.stones=A;mark();yield;tY=performance.now();
  /* the columns of nodes: i = x0/c - 1 .. x0/c + N (one past the tile at the low side, the border at the high side) */
  const iA=Math.round(x0/c)-1,kA=Math.round(z0/c)-1,NI=N+2,colOn=new Uint8Array(NI*NI),cH=new Float32Array(NI*NI),cL=new Float32Array(NI*NI),cRho=new Float32Array(NI*NI),cB=new Float32Array(NI*NI),
    cNx=new Float32Array(NI*NI),cNz=new Float32Array(NI*NI),cLo=new Int32Array(NI*NI),cHi=new Int32Array(NI*NI),cOff=new Int32Array(NI*NI),cWl=new Float32Array(NI*NI),cKo=new Float32Array(NI*NI),WP=WCL.wp,WS=WCL.ws,cW=new Uint8Array(NI*NI),cUx=new Float32Array(NI*NI),cUz=new Float32Array(NI*NI),cPM=new Float32Array(NI*NI*WP);
  const N1=WG.N[17],o=_wclO1,win={f:0,k:-1,cap:0,n:0,top:new Int32Array(8),ts:new Float64Array(8)};
  /* the column's own values (pure functions of x,z) */
  const colEval=(x,z,q)=>{wclH(s,x,z,o);const gl=Math.hypot(o.hx,o.hz),L=Math.sqrt(1+gl*gl),dd=distAt(x,z);
    const rho=wnS(gl+.45*wnN(N1,x/6.5,z/6.5)+.2*wnN(N1,x/2.1+7,z/2.1),1.0,1.6)*(1-wnS(dd,1.2,2.4));
    const b=WCL.bury*(1-rho)+WCL.deep*wnS(dd,1.0,2.0);cWl[q]=o.wl;cKo[q]=o.ko;cH[q]=o.h;cL[q]=L;cRho[q]=rho;cB[q]=b;cNx[q]=gl>1e-6?-o.hx/gl:0;cNz[q]=gl>1e-6?-o.hz/gl:0;
    cLo[q]=Math.floor((o.h-L*(b+.2))/c)-1;cHi[q]=Math.ceil((o.h+L*.2)/c)+1;
    /* the wall beside the column: which way it is (the slope over 3 m either side - at a foot, the wall is the way up) and the highest the land rises
       that way every WCL.ws metres out to 4 m (a running maximum): how far the wall is from the column at any height */
    {const o4=_wclO4,E3=3;wclH(s,x+E3,z,o4);const a1=o4.h;wclH(s,x-E3,z,o4);const a2=o4.h;wclH(s,x,z+E3,o4);const a3=o4.h;wclH(s,x,z-E3,o4);
      const gx=(a1-a2)/(2*E3),gz=(a3-o4.h)/(2*E3),gm=Math.hypot(gx,gz);cW[q]=0;
      if(gm>.3){const ux=gx/gm,uz=gz/gm,b0=q*WP;let m=o.h;cUx[q]=ux;cUz[q]=uz;cPM[b0]=m;for(let k=1;k<WP;k++){wclH(s,x+ux*k*WS,z+uz*k*WS,o4);if(o4.h>m)m=o4.h;cPM[b0+k]=m;}
        if(cPM[b0+WP-1]>o.h+.05){cW[q]=1;cHi[q]=Math.max(cHi[q],Math.ceil((cPM[b0+Math.min(WP-1,Math.ceil(WCL.rw/WS))]+WCL.crown+.3)/c)+1);}}}};
  /* the wall's distance from column q at height y (horizontal, toward the wall; 1e9: none within 4 m). Under the column's own ground it is the distance
     at the ground (a stone's foot goes down into the turf) */
  const wdist=(q,y)=>{const b0=q*WP,H0=cPM[b0],top=cPM[b0+WP-1];let yy=y<H0+.01?H0+.01:y;if(yy>top){if(yy>top+WCL.crown)return 1e9;yy=top-.01;}/* (over the top: as at the top - a column's top may stand over the rim) */
    for(let k=1;k<WP;k++){const m1=cPM[b0+k];if(m1>=yy){const m0=cPM[b0+k-1];return (k-1+(yy-m0)/Math.max(1e-6,m1-m0))*WS;}}return 1e9;};
  let nCol=0;for(let lk=0;lk<NI;lk++){for(let li=0;li<NI;li++){const x=(iA+li)*c,z=(kA+lk)*c;if(distAt(x,z)>2.3)continue;colOn[lk*NI+li]=1;nCol++;}}
  let off=0;for(let q=0;q<NI*NI;q++){if(!colOn[q])continue;const li=q%NI,lk=(q-li)/NI;colEval((iA+li)*c,(kA+lk)*c,q);cOff[q]=off;off+=cHi[q]-cLo[q]+1;}
  mark();const FV=new Float32Array(off);let done=0;
  /* the nodes' F: the larger of the turf's (the distance under the smooth face, less the burial) and the wall's (minus the wall's distance at the node's
     own height, plus the stones' relief there; buried as the turf near the column's ground): a stone stands out of a sheer wall as far as its relief
     and down to the ground - never cut off where the slope under it eases */
  const fWall=(q,x,y,z,b,H)=>{const dW=wdist(q,y);if(dW>=WCL.rw)return -1e9;wclWin(A,G,x,y,z,win,-cUx[q],-cUz[q]);if(win.g<=0)return -1e9;
    return -dW+win.g*(1-wnS(wclWet(y,cWl[q]),.3,.7))*(1-cKo[q])-b*(1-wnS(y-H,0,.6));};
  for(let q=0;q<NI*NI;q++){if(!colOn[q])continue;const li=q%NI,lk=(q-li)/NI,x=(iA+li)*c,z=(kA+lk)*c,H=cH[q],L=cL[q],b=cB[q],o0=cOff[q],w=cW[q];
    for(let j=cLo[q];j<=cHi[q];j++){const y=j*c;let F=(H-y)/L-b;if(w){const Fw=fWall(q,x,y,z,b,H);if(Fw>F)F=Fw;}FV[o0+j-cLo[q]]=F;}
    if((++done&63)===0&&performance.now()-tY>WCL.ms){yield;tY=performance.now();}}
  mark();
  /* F at any node: from its column, or the plain distance under the face (with no stones) where the column holds nothing there */
  const cX=new Uint8Array(NI*NI);/* (a column outside: its height and slope, made once when first asked) */
  const nodeF=(li,j,lk)=>{if(li<0||lk<0||li>=NI||lk>=NI)return -9;const q=lk*NI+li;
    if(colOn[q]){if(j>=cLo[q]&&j<=cHi[q])return FV[cOff[q]+j-cLo[q]];return (cH[q]-j*c)/cL[q]-cB[q];}
    if(!cX[q]){wclH(s,(iA+li)*c,(kA+lk)*c,o);const gl=Math.hypot(o.hx,o.hz);cH[q]=o.h;cL[q]=Math.sqrt(1+gl*gl);cB[q]=WCL.bury+WCL.deep;cX[q]=1;}
    return (cH[q]-j*c)/cL[q]-cB[q];};
  /* the vertices: one per cube that the surface crosses (cubes li = 0..NI-2), at the mean of the crossings on its edges */
  const vmap=new Map(),pos=[],cube=new Float64Array(8),EDG=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]],CO=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
  const ckey=(li,j,lk)=>li+NI*(lk+NI*(j+65536));
  for(let lk=0;lk<NI-1;lk++){for(let li=0;li<NI-1;li++){const q=lk*NI+li;if(!colOn[q]&&!colOn[q+1]&&!colOn[q+NI]&&!colOn[q+NI+1])continue;
      let jlo=1e9,jhi=-1e9;for(const qq of[q,q+1,q+NI,q+NI+1])if(colOn[qq]){jlo=Math.min(jlo,cLo[qq]);jhi=Math.max(jhi,cHi[qq]);}
      for(let j=jlo-1;j<=jhi;j++){let np=0;for(let v=0;v<8;v++){const F=nodeF(li+CO[v][0],j+CO[v][1],lk+CO[v][2]);cube[v]=F;if(F>0)np++;}if(np===0||np===8)continue;
        let sx=0,sy=0,sz=0,ne=0;for(const[a,b]of EDG){const Fa=cube[a],Fb=cube[b];if((Fa>0)===(Fb>0))continue;const tt=Fa/(Fa-Fb);sx+=CO[a][0]+(CO[b][0]-CO[a][0])*tt;sy+=CO[a][1]+(CO[b][1]-CO[a][1])*tt;sz+=CO[a][2]+(CO[b][2]-CO[a][2])*tt;ne++;}
        vmap.set(ckey(li,j,lk),pos.length/3);pos.push((iA+li+sx/ne)*c,(j+sy/ne)*c,(kA+lk+sz/ne)*c);}}
    if(performance.now()-tY>WCL.ms){yield;tY=performance.now();}}
  mark();
  /* the quads: one for every edge with a sign change whose lower node is the tile's own (li, lk = 1 .. N) */
  const tri=[];const quad=(a,b,cc,d,flip)=>{if(a===undefined||b===undefined||cc===undefined||d===undefined)return;if(flip)tri.push(a,cc,b,a,d,cc);else tri.push(a,b,cc,a,cc,d);};
  for(let lk=1;lk<=N;lk++){for(let li=1;li<=N;li++){const q=lk*NI+li;if(!colOn[q]&&!colOn[q-1]&&!colOn[q-NI]&&!colOn[q-NI-1])continue;
      let jlo=1e9,jhi=-1e9;for(const qq of[q,q-1,q-NI,q-NI-1,q+1,q+NI])if(qq>=0&&qq<NI*NI&&colOn[qq]){jlo=Math.min(jlo,cLo[qq]);jhi=Math.max(jhi,cHi[qq]);}
      for(let j=jlo-1;j<=jhi+1;j++){const F0=nodeF(li,j,lk),in0=F0>0;
        {const F1=nodeF(li+1,j,lk);if(in0!==(F1>0))quad(vmap.get(ckey(li,j-1,lk-1)),vmap.get(ckey(li,j,lk-1)),vmap.get(ckey(li,j,lk)),vmap.get(ckey(li,j-1,lk)),!in0);}
        {const F1=nodeF(li,j+1,lk);if(in0!==(F1>0))quad(vmap.get(ckey(li-1,j,lk-1)),vmap.get(ckey(li,j,lk-1)),vmap.get(ckey(li,j,lk)),vmap.get(ckey(li-1,j,lk)),in0);}
        {const F1=nodeF(li,j,lk+1);if(in0!==(F1>0))quad(vmap.get(ckey(li-1,j-1,lk)),vmap.get(ckey(li,j-1,lk)),vmap.get(ckey(li,j,lk)),vmap.get(ckey(li-1,j,lk)),!in0);}}}
    if(performance.now()-tY>WCL.ms){yield;tY=performance.now();}}
  /* the deep skirt (a metre and more under the turf, where the sheet dives away from the cliff) is never seen: its triangles go */
  /* (and the sheet under the turf more than 1.3 cells from a cliff - the ground always covers it there; nearer, the ground's lattice stands back from the
     faces and the buried sheet is what the rim and the foot show. Past 1.6 cells, all but what stands clear of the turf: a column standing out of the wall reaches further than that) */
  {const nv0=pos.length/3,dp=new Uint8Array(nv0),o5=_wclO4;for(let v=0;v<nv0;v++){const x=pos[v*3],z=pos[v*3+2],dv=distAt(x,z);if(dv>1.3){wclH(s,x,z,o5);const yv=pos[v*3+1];if(o5.h-yv>.3||(dv>1.6&&yv-o5.h<.25))dp[v]=1;}}let w=0;
    for(let i=0;i<tri.length;i+=3){if(dp[tri[i]]&&dp[tri[i+1]]&&dp[tri[i+2]])continue;tri[w++]=tri[i];tri[w++]=tri[i+1];tri[w++]=tri[i+2];}tri.length=w;}
  if(!tri.length){out.pos=null;return;}
  mark();
  /* keep the vertices the quads use; their attributes */
  const remap=new Int32Array(pos.length/3).fill(-1);let nv=0;for(const v of tri)if(remap[v]<0)remap[v]=nv++;
  const P=new Float32Array(nv*3),NR=new Float32Array(nv*3),BK=new Float32Array(nv*8),CR=new Float32Array(nv),RK=new Float32Array(nv),PL=new Float32Array(nv*3),IX=new Uint32Array(tri.length);
  for(let i=0;i<tri.length;i++)IX[i]=remap[tri[i]];
  const o3=_wclO2,e=.25;let vi=0;
  for(let v=0;v<pos.length/3;v++){const r=remap[v];if(r<0)continue;const x=pos[v*3],y=pos[v*3+1],z=pos[v*3+2];
    wclH(s,x,z,o3);const gl=Math.hypot(o3.hx,o3.hz),L=Math.sqrt(1+gl*gl),nx=gl>1e-6?-o3.hx/gl:0,nz=gl>1e-6?-o3.hz/gl:0;
    P[r*3]=x-x0;P[r*3+1]=y;P[r*3+2]=z-z0;PL[r*3+1]=o3.sn;
    {const o4=_wclO4,E2=.8;wclH(s,x+E2,z,o4);const a1=o4.h;wclH(s,x-E2,z,o4);const a2=o4.h;wclH(s,x,z+E2,o4);const a3=o4.h;wclH(s,x,z-E2,o4);
      const sx=(a1-a2)/(2*E2),sz=(a3-o4.h)/(2*E2),ls=Math.sqrt(1+sx*sx+sz*sz);NR[r*3]=-sx/ls;NR[r*3+1]=1/ls;NR[r*3+2]=-sz/ls;
      /* the grass at the foot (as the mockup's gLev): the soil climbs a wandering height up the face - none in places, two or three metres in others -
         measured over the ground 1.2 m out from the face; and wherever the face eases (rho) it is the turf's */
      const hl=Math.hypot(sx,sz);let gr=0;if(hl>1e-4){wclH(s,x+sx/hl*-1.2,z+sz/hl*-1.2,o4);const hf=y-o4.h,gl0=.25+2.4*wnS(wnN(N1,x/9.5+3.1,z/9.5),-.25,.6)+.5*wnN(N1,x/2.7+5,z/2.7);gr=1-wnS(hf,gl0-.3,gl0+.3);}
      PL[r*3+2]=gr;}
    const dd=distAt(x,z),wet=1-wnS(wclWet(y,o3.wl),.3,.7);let rho=wnS(gl+.45*wnN(N1,x/6.5,z/6.5)+.2*wnN(N1,x/2.1+7,z/2.1),1.0,1.6)*wet*(1-wnS(dd,1.2,2.4));
    /* (on the wall's part - a stone in front of a wall, the face itself - the vertex is rock, its normal the wall's (leaning back as the wall's distance
       grows with height), and its grass is measured out from the wall) */
    let fn=nx,fz=nz;{const li=Math.round(x/c)-iA,lk=Math.round(z/c)-kA,qc=li>=0&&lk>=0&&li<NI&&lk<NI?lk*NI+li:-1;
      if(qc>=0&&colOn[qc]&&cW[qc]){const bv=WCL.bury*(1-rho)+WCL.deep*wnS(dd,1.0,2.0),Fw=fWall(qc,x,y,z,bv,o3.h),Fv=(o3.h-y)/L-bv,wl=wnS(Fw-Fv,-.15,.15);
        if(wl>0){const ux=cUx[qc],uz=cUz[qc],ln=Math.max(-2,Math.min(5,(Math.min(9,wdist(qc,y+.4))-Math.min(9,wdist(qc,y-.4)))/.8)),nl=Math.hypot(1,ln);
          let ax=NR[r*3]*(1-wl)-ux/nl*wl,ay=NR[r*3+1]*(1-wl)+ln/nl*wl,az=NR[r*3+2]*(1-wl)-uz/nl*wl;const al=Math.hypot(ax,ay,az)||1;NR[r*3]=ax/al;NR[r*3+1]=ay/al;NR[r*3+2]=az/al;
          rho=Math.max(rho,wl*wet);fn=-ux;fz=-uz;
          if(wl>.5){const o4=_wclO4;wclH(s,x-ux*1.2,z-uz*1.2,o4);const hf=y-o4.h,gl0=.25+2.4*wnS(wnN(N1,x/9.5+3.1,z/9.5),-.25,.6)+.5*wnN(N1,x/2.7+5,z/2.7);PL[r*3+2]=1-wnS(hf,gl0-.3,gl0+.3);}}}}
    RK[r]=rho;
    wclWin(A,G,x,y,z,win,fn,fz,1.5*c);const f0=win.f,k0=win.k;for(let a=0;a<8;a++)BK[r*8+a]=a<win.n?win.top[a]:-1;
    /* baked occlusion: the recess behind the stones and the concavity of the relief (along the face: tx,tz; and up), capped */
    const tx=-fz,tz=fn,nk=win.n,ck=win.top;let lap=0;{const R1=(dx,dy,dz)=>{let gm=0;for(let a=0;a<nk;a++){const kk=ck[a],q=kk*WCL_SN;if(A[q+12]*fn+A[q+13]*fz<.3)continue;if(wclStoneAt(A,kk,x+dx,y+dy,z+dz,_wclR)>=0&&_wclR.g>gm)gm=_wclR.g;}return gm;};const ra=R1(tx*e,0,tz*e),rb=R1(-tx*e,0,-tz*e),rc=R1(0,e,0),rd=R1(0,-e,0);lap=(ra+rb+rc+rd-4*R1(0,0,0))/(e*e);
}
    const sc=k0>=0?A[k0*WCL_SN+15]:1,gap=k0<0?1:Math.max(0,1-f0/(.06*sc));CR[r]=Math.min(.35,Math.max(gap*.35,Math.min(1,Math.max(0,lap*.05))))*rho;
    if((++vi&255)===0&&performance.now()-tY>WCL.ms){yield;tY=performance.now();}}
  mark();
  /* every triangle facing out of the rock (against its vertices' normal without the stones) */
  for(let i=0;i<IX.length;i+=3){const a=IX[i]*3,b=IX[i+1]*3,d=IX[i+2]*3,ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[d]-P[a],vy=P[d+1]-P[a+1],vz=P[d+2]-P[a+2];
    const gx=uy*vz-uz*vy,gy=uz*vx-ux*vz,gz=ux*vy-uy*vx,mx=NR[a]+NR[b]+NR[d],my=NR[a+1]+NR[b+1]+NR[d+1],mz=NR[a+2]+NR[b+2]+NR[d+2];
    if(gx*mx+gy*my+gz*mz<0){const tq=IX[i+1];IX[i+1]=IX[i+2];IX[i+2]=tq;}}
  /* the palette: grey where the spires' stone is, warm tan elsewhere (rock look; the region weights at the vertex, from the generator's lattice fields) */
  {const ctx=wgCtx(x0-4,z0-4,x0+S+4,z0+S+4,0),W=new Float64Array(9);for(let r=0;r<nv;r++){wgFields(ctx,P[r*3]+x0,P[r*3+2]+z0,W);PL[r*3]=Math.min(1,Math.max(0,W[1]*2));/* (rock look: warm tan everywhere, grey only on the spires' stone) */}}
  out.pos=P;out.nrm=NR;out.blk=BK;out.crev=CR;out.rk=RK;out.pal=PL;out.idx=IX;out.nv=nv;out.ntri=IX.length/3;out.samples=s.cnt;out.cols=nCol;out.nodes=off;mark();
  WCL.stats.built++;WCL.stats.ms+=performance.now()-T0;WCL.stats.verts+=nv;WCL.stats.stones+=A.length/WCL_SN;}
