(function(){const out=[];const seeds=window.__seeds||[555,1,2];
for(const seed of seeds){const t0=performance.now();owEnter();buildOpenWorld(seed);const ms=Math.round(performance.now()-t0);
 for(const v of OW.villages){const sc=v.buildings.filter(b=>b.type==='scroll').length;out.push(JSON.stringify({seed,ms,n:v.name,t:v.tier,b:v.buildings.length,scroll:sc,dress:v.dress,walls:!!v.walls}));}}
return out.join('\n');})()
