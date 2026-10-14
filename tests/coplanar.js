(function(){
/* Faces of two parts of one piece of furniture that lie in the same plane, face the same way and overlap are drawn on top of each other: they flicker (z-fighting). This builds the pieces with many seeds and tiers (the way owiAddItem
   does) and looks for such pairs among the boxes of the piece. Needs the dev build. window.__cp = {kinds, bad:[...]}  Options: window.__cpk = ['hearth', ...] */
const kinds=window.__cpk||['hearth','hearthS','stove','forge','firepit','wardrobe','cupboard','shelf','table','tableL','bench','bed1','bed2','chest','worktable'];
const R0=window.__cp={kinds:{},bad:[]};
const EPS=window.__cpRaw?.0025:.00025,MINA=.0002;/* with owiDeFight two faces that were in one plane are at least 0.6 mm apart (the depth buffer resolves 0.1 mm at 10 m) */
const faces=(parts)=>{const out=[];parts.forEach((p,pi)=>{const g=p.geo,P=g&&g.parameters;if(!P||g.type!=='BoxGeometry')return;const w=P.width/2,h=P.height/2,d=P.depth/2,m=p.m.elements;
    const pt=(x,y,z)=>[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];
    const dir=(x,y,z)=>{const v=[m[0]*x+m[4]*y+m[8]*z,m[1]*x+m[5]*y+m[9]*z,m[2]*x+m[6]*y+m[10]*z],l=Math.hypot(...v)||1;return v.map(a=>a/l);};
    for(const[nx,ny,nz]of[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const n=dir(nx,ny,nz),c=pt(nx*w,ny*h,nz*d);
      /* the face as a polygon of four corners */
      const u=nx?[0,1,0]:[1,0,0],v=nz?[0,1,0]:ny?[0,0,1]:[0,0,1];const ext=[nx?[0,h,0]:[w,0,0],nx?[0,0,d]:ny?[0,0,d]:[0,h,0]];
      const e1=ext[0],e2=ext[1],cs=[[1,1],[1,-1],[-1,-1],[-1,1]].map(s=>pt(nx*w+s[0]*e1[0]+s[1]*e2[0],ny*h+s[0]*e1[1]+s[1]*e2[1],nz*d+s[0]*e1[2]+s[1]*e2[2]));
      out.push({pi,n,c,cs,col:p.col,key:p.key});}});return out;};
/* the overlap of two coplanar convex quads, by clipping one with the other (Sutherland-Hodgman in the plane's 2D coordinates) */
const area2=(poly)=>{let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p[0]*q[1]-q[0]*p[1];}return a/2;};
const clip=(subj,clipp)=>{let out=subj;const cw=area2(clipp)>0?1:-1;for(let i=0;i<clipp.length&&out.length;i++){const a=clipp[i],b=clipp[(i+1)%clipp.length],inp=out;out=[];const side=p=>cw*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]));
    for(let j=0;j<inp.length;j++){const p=inp[j],q=inp[(j+1)%inp.length],sp=side(p),sq=side(q);if(sp>=0)out.push(p);if((sp>=0)!==(sq>=0)){const t=sp/(sp-sq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}}return out;};
const to2=(f,ax)=>f.cs.map(p=>ax===0?[p[1],p[2]]:ax===1?[p[0],p[2]]:[p[0],p[1]]);
for(const kind of kinds){const spec=OWI_ITEM[kind];if(!spec||!OWI_MESH[kind]&&!OWI_MESH[kind.replace(/[SLWX]+$/,'')]){continue;}let nb=0,np=0;const seen=new Set();
  for(let tier=1;tier<=5;tier++)for(let seed=1;seed<=24;seed++){const kb={B:{}},planes=new Map();const a=(key,geo,col,x,y,z,rx,ry,rz,sx,sy,sz)=>{if(!window.__cpRaw&&geo.type==='BoxGeometry'&&sx==null&&sy==null&&sz==null&&!rx&&!rz){const f=owiDeFight(planes,geo.parameters,x||0,y||0,z||0,ry||0);if(f){x=f.x;y=f.y;z=f.z;sx=f.sx;sy=f.sy;sz=f.sz;}}const e=new THREE.Euler(rx||0,ry||0,rz||0),q=new THREE.Quaternion().setFromEuler(e),pm=new THREE.Matrix4().compose(new THREE.Vector3(x||0,y||0,z||0),q,new THREE.Vector3(sx||1,sy==null?(sx||1):sy,sz==null?(sx||1):sz));(kb.B.all||(kb.B.all=[])).push({geo,col,key,m:pm});};
    const it={kind,tier,ceil:2.6+(seed%3)*.2,seed,x:0,z:0,rot:0,spec};const f=OWI_MESH[kind]||OWI_MESH[kind.replace(/[SLWX]+$/,'')];
    try{f(a,spec.w,spec.d,mulberry(seed),it);}catch(e){continue;}
    const parts=kb.B.all||[],fs=faces(parts);np+=parts.length;
    for(let i=0;i<fs.length;i++)for(let j=i+1;j<fs.length;j++){const A=fs[i],B=fs[j];if(A.pi===B.pi)continue;const dn=A.n[0]*B.n[0]+A.n[1]*B.n[1]+A.n[2]*B.n[2];if(dn<.999)continue;
      const dist=Math.abs((B.c[0]-A.c[0])*A.n[0]+(B.c[1]-A.c[1])*A.n[1]+(B.c[2]-A.c[2])*A.n[2]);if(dist>EPS)continue;
      const ax=Math.abs(A.n[0])>.9?0:Math.abs(A.n[1])>.9?1:Math.abs(A.n[2])>.9?2:-1;if(ax<0)continue;
      const ov=clip(to2(A,ax),to2(B,ax)),ar=ov.length>2?Math.abs(area2(ov)):0;if(ar<MINA)continue;
      if(A.key==='g'||B.key==='g')continue;/* glow parts are drawn by their own material */
      {let cx=0,cy=0;for(const q of ov){cx+=q[0];cy+=q[1];}cx/=ov.length;cy/=ov.length;const P3=ax===0?[A.c[0],cx,cy]:ax===1?[cx,A.c[1],cy]:[cx,cy,A.c[2]],o=[P3[0]+A.n[0]*.004,P3[1]+A.n[1]*.004,P3[2]+A.n[2]*.004];
       let hid=false;for(let q=0;q<parts.length&&!hid;q++){const g=parts[q].geo,Pa=g&&g.parameters;if(!Pa||g.type!=='BoxGeometry')continue;if(!parts[q].inv)parts[q].inv=new THREE.Matrix4().copy(parts[q].m).invert();const v=new THREE.Vector3(o[0],o[1],o[2]).applyMatrix4(parts[q].inv);if(Math.abs(v.x)<=Pa.width/2&&Math.abs(v.y)<=Pa.height/2&&Math.abs(v.z)<=Pa.depth/2)hid=true;}
       if(hid)continue;}
      const key=tier+':'+Math.round(A.c[0]*100)+','+Math.round(A.c[1]*100)+','+Math.round(A.c[2]*100)+'|'+Math.round(B.c[0]*100)+','+Math.round(B.c[1]*100)+','+Math.round(B.c[2]*100);if(seen.has(key))continue;seen.add(key);nb++;
      const dsc=q=>{const P=parts[q].geo.parameters,m=parts[q].m.elements;return 'box('+[P.width,P.height,P.depth].map(v=>+v.toFixed(3))+')@('+[m[12],m[13],m[14]].map(v=>+v.toFixed(3))+')';};
      if(R0.bad.length<(window.__cpn||40))R0.bad.push(kind+' t'+tier+' s'+seed+': '+A.pi+' '+dsc(A.pi)+' / '+B.pi+' '+dsc(B.pi)+' coplanar '+(ar*1e4).toFixed(0)+' cm2 n('+A.n.map(v=>+v.toFixed(0))+')');}}
  R0.kinds[kind]={pieces:120,partsPerPiece:Math.round(np/120),coplanarPairs:nb};}
return JSON.stringify(R0);})()
