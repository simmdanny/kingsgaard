(function(){
/* Every furniture mesh drawn on its own (origin = middle of its footprint on the floor): the lowest point of its parts. A piece that rests on the floor should have min y = 0; > 1 cm is a gap, < -3 cm sinks.
   Pieces that hang on walls (deco) and rugs are listed separately. */
const out={rest:[],hang:[],float:[],sink:[]};const e=new THREE.Euler(),q=new THREE.Quaternion(),v=new THREE.Vector3(),s=new THREE.Vector3(),pm=new THREE.Matrix4(),p=new THREE.Vector3();
const kinds=Object.keys(OWI_MESH);
for(const k of kinds){const base=k;const spec=OWI_ITEM[k]||OWI_ITEM[k.replace(/[SLWX]+$/,'')]||{w:1,d:.6};let minY=1e9,maxY=-1e9,n=0;
  const a=(key,geo,col,x,y,z,rx,ry,rz,sx,sy,sz)=>{e.set(rx||0,ry||0,rz||0);q.setFromEuler(e);v.set(x||0,y||0,z||0);s.set(sx||1,sy==null?(sx||1):sy,sz==null?(sx||1):sz);pm.compose(v,q,s);geo.computeBoundingBox?0:0;if(!geo.boundingBox)geo.computeBoundingBox();const b=geo.boundingBox;if(key==='g')return;
    for(const cx of[b.min.x,b.max.x])for(const cy of[b.min.y,b.max.y])for(const cz of[b.min.z,b.max.z]){p.set(cx,cy,cz).applyMatrix4(pm);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}n++;};
  let ok=true;try{OWI_MESH[k](a,spec.w,spec.d,mulberry(12345),{kind:k,seed:12345,spec,tier:3,ceil:2.4});}catch(err){ok=false;}
  if(!ok||!n)continue;const r={k,min:+minY.toFixed(3),max:+maxY.toFixed(2),flat:!!spec.flat};
  if(minY>.012)(spec.flat||/deco|tapestry|banner|picture|plates|sconce|shelfW?$/.test(k)?out.hang:out.float).push(r);else if(minY<-.03)out.sink.push(r);else out.rest.push(k);}
return 'checked '+kinds.length+'; resting '+out.rest.length+'\nFLOAT '+JSON.stringify(out.float)+'\nSINK '+JSON.stringify(out.sink)+'\nhang/flat '+out.hang.map(o=>o.k+':'+o.min).join(' ');})()
