/* VERBATIM from tools/mockups/river/surface-study.html, lines 432-467. makeStone (box -> 3-6 plane cuts -> exact bevel by projection) and placeBoulder. This REPLACES wbldMake: the same generator for every rock.
   Port this code as it is (same functions, same constants, same noise). Only the plumbing around it may change. */
/* every rock in the game from one generator: a box, scaled unevenly; 3-6 plane cuts chop off corners and edges (big flat faces); then a small
   bevel, exact: each vertex of a dense sphere is pulled onto the cut box shrunk by the bevel radius (closest point, Dykstra's projection onto
   the half-spaces), then pushed back out by that radius. Faces stay perfectly flat, only edges and corners round; normals are exact. */
function makeStone(seed,o){o=o||{};const r=mkRng(seed);
  const sx=(o.x0||.75)+(o.xr||.75)*r(),sy=(o.y0||.45)+(o.yr||.6)*r(),sz=(o.z0||.6)+(o.zr||.6)*r();
  const PL=[[1,0,0,sx],[-1,0,0,sx],[0,1,0,sy],[0,-1,0,sy],[0,0,1,sz],[0,0,-1,sz]];
  const k=3+Math.floor(r()*4);
  for(let c=0;c<k;c++){let nx=(r()<.5?-1:1)*(.4+.6*r()),ny=(r()<.75?1:-.35)*(.25+.7*r()),nz=(r()<.5?-1:1)*(.4+.6*r());if(r()<.35){if(r()<.5)nx*=.15;else nz*=.15;}/* (corners, sometimes an edge) */
    const L=Math.hypot(nx,ny,nz);nx/=L;ny/=L;nz/=L;const sup=Math.abs(nx)*sx+Math.abs(ny)*sy+Math.abs(nz)*sz;PL.push([nx,ny,nz,sup*(.52+.3*r())]);}
  const bev=(o.bev||.075)*Math.min(sx,sy,sz)*2;/* 5-10% of the stone's size */
  const SH=PL.map(q=>[q[0],q[1],q[2],q[3]-bev]);
  const g=weld(new THREE.IcosahedronGeometry(1,5)),p=g.attributes.position,n=p.count,nrm=new Float32Array(n*3),edge=new Float32Array(n);const R0=3*Math.max(sx,sy,sz);
  for(let i=0;i<n;i++){const P0=[p.getX(i)*R0,p.getY(i)*R0,p.getZ(i)*R0];let x=P0.slice();const Y=SH.map(()=>[0,0,0]);
    for(let it=0;it<40;it++){for(let j=0;j<SH.length;j++){const q=SH[j],zx=x[0]+Y[j][0],zy=x[1]+Y[j][1],zz=x[2]+Y[j][2],d=zx*q[0]+zy*q[1]+zz*q[2]-q[3];
      const nxv=d>0?[zx-d*q[0],zy-d*q[1],zz-d*q[2]]:[zx,zy,zz];Y[j]=[zx-nxv[0],zy-nxv[1],zz-nxv[2]];x=nxv;}}
    let dx=P0[0]-x[0],dy=P0[1]-x[1],dz=P0[2]-x[2];const dl=Math.hypot(dx,dy,dz)||1;dx/=dl;dy/=dl;dz/=dl;
    p.setXYZ(i,x[0]+dx*bev,x[1]+dy*bev,x[2]+dz*bev);nrm[i*3]=dx;nrm[i*3+1]=dy;nrm[i*3+2]=dz;
    let best=-1;for(const q of PL)best=Math.max(best,dx*q[0]+dy*q[1]+dz*q[2]);edge[i]=Math.min(1,(1-best)*6);}/* (on a bevel: the normal is between faces) */
  let ymin=1e9,ymax=-1e9;for(let i=0;i<n;i++){ymin=Math.min(ymin,p.getY(i));ymax=Math.max(ymax,p.getY(i));}
  const occ=new Float32Array(n),seam=new Float32Array(n),rel=new Float32Array(n);
  const sm=r()<.35?(()=>{const a=r()*6.283,b=(r()-.5)*.8;return[Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a),(r()-.5)*.4*Math.min(sx,sz)];})():null;
  for(let i=0;i<n;i++){const y=p.getY(i);rel[i]=(ymax-y)/(ymax-ymin);occ[i]=.6*Math.pow(rel[i],1.5);seam[i]=sm?(p.getX(i)*sm[0]+y*sm[1]+p.getZ(i)*sm[2]-sm[3]):10;}
  g.setAttribute('normal',new THREE.BufferAttribute(nrm,3));g.setAttribute('aEdge',new THREE.BufferAttribute(edge,1));g.setAttribute('aOcc',new THREE.BufferAttribute(occ,1));
  g.setAttribute('aSeam',new THREE.BufferAttribute(seam,1));g.setAttribute('aRel',new THREE.BufferAttribute(rel,1));
  g.userData={ymin,ymax,rx:Math.max(sx,sz),sx,sy,sz};return g;}
const SHAPES=[];for(let i=0;i<14;i++)SHAPES.push(makeStone(1000+i*37));
/* placing: every boulder from a seed (shape, size, rotation); aligned to the slope and sunk 20-40% (deeper when small); sometimes a cluster */
const BINST=SHAPES.map(()=>[]);
function placeBoulder(x,z,seed,fixedScale,shapeIdx){const r=mkRng(seed);const s0=Math.floor(r()*SHAPES.length),si=shapeIdx!=null?shapeIdx:s0,G=SHAPES[si],ud=G.userData;
  const u=r();const sc=fixedScale||(.22+1.9*Math.pow(u,2.4));const h=(ud.ymax-ud.ymin)*sc;
  const f=.45-.20*Math.min(1,Math.max(0,(sc-.3)/1.6));/* sink fraction: 25% for the big ones, 45% for pebbles */
  const e=.4,nx=-(H(x+e,z)-H(x-e,z))/(2*e),nz=-(H(x,z+e)-H(x,z-e))/(2*e);const nrm=new THREE.Vector3(nx,1,nz).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),nrm).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r()*6.283));
  const y=H(x,z)-f*h-ud.ymin*sc;/* the lowest point sits f*h under the ground */const M=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(sc,sc,sc));
  BINST[si].push({M,tint:new THREE.Color(r(),(H(x,z)+20)/60,r()),x,z,sc,rw:ud.rx*sc});
  if(!fixedScale&&sc>.6&&r()<.4){const k=1+Math.floor(r()*3);for(let j=0;j<k;j++){const a=r()*6.283,d=sc*ud.rx*(1.3+1.0*r());const cx=x+Math.cos(a)*d,cz=z+Math.sin(a)*d;if(pathDist(cx,cz)<pathHalfAt(cx,cz)*1.6+.4||rivMask(cx,cz,2.5))continue;placeBoulder(cx,cz,seed*7+j*13+1,sc*(.22+.3*r()));}}}
