(function(){
/* Coplanar faces of different colours that overlap (they flicker against each other), counted per layer of a building's meshes: window.__zf(b) -> {layer: {faces, zf, ex}}; the call below summarises the
   buildings of the world by type and tier. */
window.__zf=function(b){const res={};for(const k of['w','u','x','f','r','d']){const m=b.meshes[k];if(!m)continue;const g=m.geometry,P=g.attributes.position.array,C=g.attributes.color.array,ix=g.index?g.index.array:null,n=(ix?ix.length:P.length/3)/3;const bk=new Map();
 for(let t=0;t<n;t++){const i0=ix?ix[t*3]:t*3,i1=ix?ix[t*3+1]:t*3+1,i2=ix?ix[t*3+2]:t*3+2;const a=[P[i0*3],P[i0*3+1],P[i0*3+2]],b2=[P[i1*3],P[i1*3+1],P[i1*3+2]],c=[P[i2*3],P[i2*3+1],P[i2*3+2]];
  const ux=b2[0]-a[0],uy=b2[1]-a[1],uz=b2[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz);if(l<1e-9)continue;nx/=l;ny/=l;nz/=l;
  const ax=Math.abs(nx)>.99?0:Math.abs(ny)>.99?1:Math.abs(nz)>.99?2:-1;if(ax<0)continue;const sgn=ax===0?Math.sign(nx):ax===1?Math.sign(ny):Math.sign(nz);const d=ax===0?a[0]:ax===1?a[1]:a[2];
  const key=ax+(sgn>0?'+':'-')+Math.round(d*2000);const o=ax===0?[1,2]:ax===1?[0,2]:[0,1];const lo=[Math.min(a[o[0]],b2[o[0]],c[o[0]]),Math.min(a[o[1]],b2[o[1]],c[o[1]])],hi=[Math.max(a[o[0]],b2[o[0]],c[o[0]]),Math.max(a[o[1]],b2[o[1]],c[o[1]])];
  (bk.get(key)||bk.set(key,[]).get(key)).push({lo,hi,col:(Math.round(C[i0*3]*255)<<16)|(Math.round(C[i0*3+1]*255)<<8)|Math.round(C[i0*3+2]*255)});}
 let zf=0;const ex=[];for(const[key,list]of bk){if(list.length<2||list.length>400)continue;for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const A=list[i],B=list[j];if(A.col===B.col)continue;const ox=Math.min(A.hi[0],B.hi[0])-Math.max(A.lo[0],B.lo[0]),oz=Math.min(A.hi[1],B.hi[1])-Math.max(A.lo[1],B.lo[1]);if(ox>.004&&oz>.004){zf++;if(ex.length<2)ex.push(key+' '+ox.toFixed(3)+'x'+oz.toFixed(3)+' '+A.col.toString(16)+'/'+B.col.toString(16));}}}
 res[k]={faces:n,zf,ex};}return res;};
const seen=new Set(),o=[];for(const b of OWI.reg){const key=b.type+b.arch.tier;if(!(window.__zfTypes||['scroll']).includes(b.type)||seen.has(key))continue;seen.add(key);const z=__zf(b);o.push(key+' '+Object.entries(z).map(([k,v])=>k+':'+v.zf).join(' '));}
return o.join('\n');})()
