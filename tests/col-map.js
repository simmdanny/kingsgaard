(function(){
/* diagnostic: ASCII map of where the hero (radius RAD) can stand on one floor of one building, from the real colliders. window.__cm = {x, z, type, lv, step} */
const o=Object.assign({x:171,z:-164,type:'rowc',lv:1,step:.1},window.__cm||{});
const I=window.__iw;I.setup(window.__seed||3);
const b=OWI.list.find(b=>b.type===o.type&&Math.abs(b.x-o.x)<1.5&&Math.abs(b.z-o.z)<1.5);if(!b)return 'no building';
owiEnsurePlan(b);owiBuildCol&&0;const ic=b.ic;if(!ic.col){const g=I.ground(b,3);I.tele(g[0],g[1]);I.settle(b);}
const Q=ic.P.st[0].Q,rows=[];const lvOf=o.lv;
for(let z=Q.za-.1;z<=Q.zb+.1;z+=o.step){let s='';for(let x=Q.xa-.1;x<=Q.xb+.1;x+=o.step){s+=owiHit(ic.col,x,z,lvOf,OWI.RAD)?'#':'.';}rows.push((z.toFixed(1)+'     ').slice(0,6)+s);}
return 'x from '+(Q.xa-.1).toFixed(2)+' step '+o.step+'\n'+rows.join('\n');})()
