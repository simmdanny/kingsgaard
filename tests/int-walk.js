(function(){
/* Walks a real hero (the real controller, the real colliders) into every enterable building of several worlds:
   steps -> threshold -> every room of every floor -> up and down the stairs -> back out. Reports whatever goes wrong. */
const I=window.__iw,seeds=window.__seeds||[11],per=window.__per||99,types=window.__types||null,R=OWI.RAD;let cs=window.__cs||.12;/* a corridor 80 cm wide leaves a hero of radius .27 less than a grid cell of slack: a room that looks cut off at the usual grid is checked again on a fine one */
const covOk=(b,P,mask,from,goal,room)=>{if(window.__cover>=.65)return true;const o=cs;cs=.04;try{bfs(b,P,mask,from,goal,room);}finally{cs=o;}return window.__cover>=.65;};
const rep={built:0,ok:0,fail:0,legs:0,stairsUp:0,stairsDown:0,rooms:0,maxDy:0},fails=[],byType={};
const bump=(o,k,n)=>{o[k]=(o[k]||0)+(n==null?1:n);};
/* breadth-first path over the building's own colliders */
function bfs(b,P,mask,from,goal,room){const Q=P.st.reduce((a,s)=>({xa:Math.min(a.xa,s.Q.xa),xb:Math.max(a.xb,s.Q.xb),za:Math.min(a.za,s.Q.za),zb:Math.max(a.zb,s.Q.zb)}),{xa:1e9,xb:-1e9,za:1e9,zb:-1e9}),x0=Q.xa-.2,z0=Q.za-.2,nx=Math.ceil((Q.xb-Q.xa+.4)/cs)+1,nz=Math.ceil((Q.zb-Q.za+.4)/cs)+1,col=b.ic.col;
  const free=new Uint8Array(nx*nz);for(let k=0;k<nz;k++)for(let j=0;j<nx;j++)free[k*nx+j]=owiHit(col,x0+j*cs,z0+k*cs,mask,R)?0:1;
  const ix=x=>Math.round((x-x0)/cs),iz=z=>Math.round((z-z0)/cs),near=(x,z)=>{let best=-1,bd=1e9;for(let k=Math.max(0,iz(z)-8);k<=Math.min(nz-1,iz(z)+8);k++)for(let j=Math.max(0,ix(x)-8);j<=Math.min(nx-1,ix(x)+8);j++){if(!free[k*nx+j])continue;const d=(j-ix(x))**2+(k-iz(z))**2;if(d<bd){bd=d;best=k*nx+j;}}return best;};
  let s=near(from[0],from[1]),g=near(goal[0],goal[1]);if(s<0)return null;if(g<0&&!room)return null;const prev=new Int32Array(nx*nz).fill(-2);prev[s]=-1;const q=[s];
  for(let h=0;h<q.length;h++){const c=q[h];if(c===g&&!room)break;const j=c%nx,k=(c-j)/nx;for(const[dj,dk]of[[1,0],[-1,0],[0,1],[0,-1]]){const J=j+dj,K=k+dk;if(J<0||K<0||J>=nx||K>=nz)continue;const id=K*nx+J;if(prev[id]!==-2||!free[id])continue;prev[id]=c;q.push(id);}}
  if(room){/* the goal is the reachable free cell of the room nearest to its middle */
    let bd=1e9;g=-1;for(const c of q){const j=c%nx,k=(c-j)/nx,x=x0+j*cs,z=z0+k*cs;let inR=false;for(const r of room.rects)if(x>=r.xa&&x<=r.xb&&z>=r.za&&z<=r.zb)inR=true;if(!inR)continue;if(P.stairs.some(f=>x>f.x0-.05&&x<f.x1+.05&&z>f.z0-.05&&z<f.z1+.05))continue;const d=(x-goal[0])**2+(z-goal[1])**2;if(d<bd){bd=d;g=c;}}
    if(g<0)return null;
    /* and how much of the room's free floor can be reached at all */
    let tot=0,got=0;for(let k=0;k<nz;k++)for(let j=0;j<nx;j++){const x=x0+j*cs,z=z0+k*cs;let inR=false;for(const r of room.rects)if(x>=r.xa&&x<=r.xb&&z>=r.za&&z<=r.zb)inR=true;if(!inR||!free[k*nx+j])continue;if(P.stairs.some(f=>x>f.x0-.05&&x<f.x1+.05&&z>f.z0-.05&&z<f.z1+.05))continue;tot++;if(prev[k*nx+j]!==-2)got++;}
    window.__cover=got/Math.max(1,tot);}
  if(prev[g]===-2)return null;const path=[];for(let c=g;c!==-1;c=prev[c]){const j=c%nx,k=(c-j)/nx;path.push([x0+j*cs,z0+k*cs]);}path.reverse();
  /* string pulling: keep only the corners */
  const los=(a,c)=>{const d=Math.hypot(c[0]-a[0],c[1]-a[1]),n=Math.ceil(d/.04);for(let i=1;i<=n;i++){if(owiHit(col,a[0]+(c[0]-a[0])*i/n,a[1]+(c[1]-a[1])*i/n,mask,R))return false;}return true;};
  const out=[path[0]];let a=0;while(a<path.length-1){let b2=path.length-1;while(b2>a+1&&!los(path[a],path[b2]))b2--;out.push(path[b2]);a=b2;}return out;}
window.__bfs=bfs;
function leg(b,name,pts,opt,res){for(const p of pts){const r=I.walkLocal(b,p[0],p[1],Object.assign({tol:.22,maxT:14,run:window.__run,dt:window.__dt},opt||{}));rep.legs++;rep.maxDy=Math.max(rep.maxDy,r.maxDy);if(!r.ok){res.push(name+' stuck near local ('+p[0].toFixed(2)+','+p[1].toFixed(2)+') state '+JSON.stringify(r.at));return false;}}return true;}
function testBuilding(seed,b,res){const e=b.enter,S=e.spec;const g0=I.ground(b,4);I.tele(g0[0],g0[1]);if(!I.settle(b)){res.push('interior did not load');return false;}const ic=b.ic,P=ic.P,F0=P.floors[0],Q=P.st[0].Q;
  /* 1. from outside, up the steps, over the sill */
  const g=I.ground(b,4);I.tele(g[0],g[1]);I.settle(b);
  if(!owCanStand(g[0],g[1])){res.push('approach point is blocked on the grid (skipped)');return 'skip';}
  {const zo=owiZoneAt(g[0],g[1]);if(zo&&zo.b!==b&&zo.k===1){res.push('approach point lies inside a neighbour footprint (skipped)');return 'skip';}}
  if(!leg(b,'steps',[[e.u,e.zF+S.run+.3],[e.u,e.zF-.1],[e.u,Q.zb-.7]],{},res))return false;
  if(!OWI.in)res.push('not inside after crossing the threshold ('+JSON.stringify(I.state())+')');
  const yFloor=b.hi+F0.y+.015,sy=heroU.g.position.y;if(Math.abs(sy-yFloor)>.06)res.push('floor height mismatch inside: '+sy.toFixed(3)+' vs '+yFloor.toFixed(3));
  /* 2. every room of the ground floor */
  const here=()=>{const l=owiW2L(b,heroU.x,heroU.z);return l;};
  const mask0=1;
  for(const room of F0.rooms){const q=room.rects.slice().sort((a,c)=>(c.xb-c.xa)*(c.zb-c.za)-(a.xb-a.xa)*(a.zb-a.za))[0],goal=[(q.xa+q.xb)/2,(q.za+q.zb)/2],st=here();
    const path=bfs(b,P,mask0,st,goal,room);rep.rooms++;if(window.__cover<.65&&!covOk(b,P,mask0,st,goal,room))res.push('room '+room.id+' ('+room.kind+') only '+(window.__cover*100).toFixed(0)+'% reachable');if(!path){res.push('no path to room '+room.id+' ('+room.kind+') on floor 0');return false;}
    if(!leg(b,'room '+room.id,path.slice(1),{},res))return false;
    if(heroU.g.position.y<yFloor-.05||heroU.g.position.y>yFloor+.08)res.push('hero y off floor in room '+room.id+': '+heroU.g.position.y.toFixed(3));}
  /* 3. stairs: up (flight after flight), around every upper floor, then back down */
  const settle=()=>{for(let i=0;i<40;i++){heroUpdate(1/60);owiTick(1/60);}};
  for(const f of P.stairs){const xc=(f.x0+f.x1)/2,s=Math.sign(f.zt-f.zb),mouth=[xc,f.zb-s*.45],top=[xc,f.zt+s*.45],st=here();
    const path=bfs(b,P,1<<f.from,st,mouth);if(!path){res.push('no path to the bottom of the stairs (floor '+f.from+')');return false;}
    if(!leg(b,'to stairs',path.slice(1),{},res))return false;
    if(!leg(b,'stairs up',[[xc,f.zb-s*.1],[xc,f.zt],top],{maxT:8},res))return false;rep.stairsUp++;
    if(OWI.lv!==f.to){res.push('lv after climbing is '+OWI.lv+' (wanted '+f.to+')');return false;}
    const Fu=P.floors[f.to],yU=b.hi+Fu.y+.02;settle();if(Math.abs(heroU.g.position.y-yU)>.07)res.push('top of stairs: y '+heroU.g.position.y.toFixed(3)+' vs floor '+yU.toFixed(3));
    const cutOk=b.cutTarget<b.hi+Fu.y+OWI.CUT+.01&&b.cutTarget>b.hi+Fu.y;if(!cutOk)res.push('cut target not at the upper floor');
    for(const room of Fu.rooms){const q=room.rects.slice().sort((a,c)=>(c.xb-c.xa)*(c.zb-c.za)-(a.xb-a.xa)*(a.zb-a.za))[0],goal=[(q.xa+q.xb)/2,(q.za+q.zb)/2],p2=bfs(b,P,1<<f.to,here(),goal,room);rep.rooms++;
      if(!p2){res.push('no path to room '+room.id+' ('+room.kind+') on floor '+f.to);return false;}if(window.__cover<.65&&!covOk(b,P,1<<f.to,here(),goal,room))res.push('room '+room.id+' ('+room.kind+') on floor '+f.to+' only '+(window.__cover*100).toFixed(0)+'% reachable');if(!leg(b,'room '+room.id+' f'+f.to,p2.slice(1),{},res))return false;}}
  for(const f of P.stairs.slice().reverse()){const xc=(f.x0+f.x1)/2,s=Math.sign(f.zt-f.zb),mouth=[xc,f.zb-s*.45],top=[xc,f.zt+s*.45];
    const p3=bfs(b,P,1<<f.to,here(),top);if(!p3){res.push('no path back to the top of the stairs (floor '+f.to+')');return false;}if(!leg(b,'back to stairs',p3.slice(1),{},res))return false;
    if(!leg(b,'stairs down',[[xc,f.zt],[xc,f.zb],mouth],{maxT:8},res))return false;rep.stairsDown++;
    if(OWI.lv!==f.from){res.push('lv after descending is '+OWI.lv+' (wanted '+f.from+')');return false;}
    const yD=b.hi+P.floors[f.from].y+(f.from?.02:.015);settle();if(Math.abs(heroU.g.position.y-yD)>.07)res.push('bottom of stairs: y '+heroU.g.position.y.toFixed(3)+' vs '+yD.toFixed(3));}
  /* 4. and out again */
  const pOut=bfs(b,P,mask0,here(),[e.u,Q.zb-.7]);if(!pOut){res.push('no path back to the door');return false;}
  if(!leg(b,'to door',pOut.slice(1),{},res))return false;
  let far=S.run+.3;for(const d of[3.5,2.5,1.5,.8]){const w2=owiL2W(b,e.u,e.zF+S.run+d);if(owCanStand(w2[0],w2[1])){far=S.run+d;break;}}
  if(!leg(b,'out',[[e.u,e.zF-.1],[e.u,e.zF+S.run+.3]],{},res))return false;
  {const tmp=[];leg(b,'far',[[e.u,e.zF+far]],{},tmp);}/* the street beyond may hold a neighbour's steps, a lamp or a cart: reaching the foot of the steps is what counts */
  for(let i=0;i<40;i++){heroUpdate(1/60);owiTick(1/60);}
  if(OWI.in)res.push('still inside after leaving');
  const ty=gy(heroU.x,heroU.z),zo=owiZoneAt(heroU.x,heroU.z);if((!zo||zo.b===b)&&Math.abs(heroU.g.position.y-ty)>.05)res.push('outside: y '+heroU.g.position.y.toFixed(3)+' vs terrain '+ty.toFixed(3));
  return true;}
for(const seed of seeds){I.setup(seed);let n=0,nSk=0;
  for(const b of OWI.list.slice()){if(types&&types.indexOf(b.type)<0)continue;if(b.pl&&((b.pl.solid&&!b.pl.solidLeaf)||b.pl.open))continue;/* sheds, stables (shut door) and pavilions are not entered: steps-collision.js / pavilion-test.js; the hall is (solidLeaf) */if(window.__at&&(Math.abs(b.x-__at[0])>2||Math.abs(b.z-__at[1])>2))continue;if(window.__skip&&nSk++<window.__skip)continue;if(n>=per)break;n++;rep.built++;const res=[];let ok;
    try{ok=testBuilding(seed,b,res);}catch(err){res.push('EXC '+err.message+' '+(err.stack||'').split('\n')[1]);ok=false;}
    const t=b.type;bump(byType,t+(ok===true&&!res.length?':ok':ok==='skip'?':skip':':FAIL'));
    if(ok==='skip'){rep.built--;continue;}
    if(ok===true&&!res.length)rep.ok++;else{rep.fail++;if(fails.length<25)fails.push('seed '+seed+' '+t+' tier'+(b.ic?b.ic.P.tier:'?')+' @'+b.x.toFixed(0)+','+b.z.toFixed(0)+': '+res.join(' | '));}}}
rep.penetrations=I.pen||0;return JSON.stringify(rep)+'\n'+JSON.stringify(byType)+'\n'+fails.join('\n');})()
