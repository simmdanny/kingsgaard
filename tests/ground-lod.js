(function(){
/* How far the visible terrain mesh of each level of detail is from the height function the props were placed with (owH), under every building, lamp post and fence post of every village. */
const N=OW_TC,res=OW_CFG.res,s=OW.n+1;
const hLod=(x,z,lod)=>{const st=1<<lod,ci=Math.floor((x+OW.half)/res/N),cj=Math.floor((z+OW.half)/res/N),i0=ci*N,k0=cj*N,par=((i0>>lod)+(k0>>lod));
  const fx=(x+OW.half)/res,fz=(z+OW.half)/res,ii=Math.floor((fx-i0)/st),kk=Math.floor((fz-k0)/st),u=((fx-i0)/st)-ii,v=((fz-k0)/st)-kk;
  const q=(k,i)=>OW.hs[(k0+k*st)*s+(i0+i*st)],a=q(kk,ii),b=q(kk,ii+1),d=q(kk+1,ii),e=q(kk+1,ii+1);
  /* triangles (a,d,b)(b,d,e) when (ii+kk+par) even: the diagonal b-d; otherwise (a,d,e)(a,e,b): the diagonal a-e */
  if(((ii+kk+par)&1)===0)return u+v<=1?a+(b-a)*u+(d-a)*v:e+(b-e)*(1-v)+(d-e)*(1-u);
  return u>=v?a+(b-a)*u+(e-b)*v:a+(d-a)*v+(e-d)*u;};
const out={};const acc=(k,d)=>{const o=out[k]||(out[k]={n:0,sum:0,max:0,over10:0,over25:0});o.n++;o.sum+=Math.abs(d);o.max=Math.max(o.max,Math.abs(d));if(Math.abs(d)>.1)o.over10++;if(Math.abs(d)>.25)o.over25++;};
/* sanity: LOD 0 must be owH itself */
{let m=0;for(let i=0;i<200;i++){const x=(Math.random()-.5)*1400,z=(Math.random()-.5)*1400;m=Math.max(m,Math.abs(hLod(x,z,0)-owH(x,z)));}out.lod0check=+m.toFixed(5);}
for(const v of OW.villages){for(const b of v.buildings){for(const lod of[1,2,3])acc('bld lod'+lod,hLod(b.x,b.z,lod)-owH(b.x,b.z));}}
for(const l of OW.lamps||[]){for(const lod of[1,2])acc('lamp lod'+lod,hLod(l.x,l.z,lod)-owH(l.x,l.z));}
const r={};for(const k in out){const o=out[k];r[k]=typeof o==='number'?o:{n:o.n,mean:+(o.sum/o.n).toFixed(3),max:+o.max.toFixed(2),'>10cm':o.over10,'>25cm':o.over25};}
r.lodDist=OW_CFG.lod.map(q=>Math.round(q*OW_CFG.viewDist/OW_CFG.rd0));
return JSON.stringify(r);})()
