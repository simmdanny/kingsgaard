/* LOOK(name, [cx,cy|null,cz], [tx,ty|null,tz], hAbove) : camera at c (y absolute, or ground+hAbove when null), looking at t */
const LOOK=async(name,c,t,o)=>{o=o||{};const cy=c[1]==null?owH(c[0],c[2])+(o.h||30):c[1];const ty=t[1]==null?owH(t[0],t[2]):t[1];
  const dx=t[0]-c[0],dy=ty-cy,dz=t[2]-c[2];const yaw=Math.atan2(dx,dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));
  const r=await __wl.go(c[0],c[2],{t:o.t==null?600:o.t,fly:[cy-owH(c[0],c[2]),0,0],yaw,pitch,wait:o.wait||70});
  /* wait a little more for the landmarks, then draw again */
  for(let k=0;k<(o.extra||20);k++){owView();wtUpdate(camera,false);await new Promise(r=>setTimeout(r,60));}
  flyEnter();FLY.pos.set(c[0],cy,c[2]);FLY.yaw=yaw;FLY.pitch=pitch;flyApply();wtUpdate(camera,true);owView(true);
  if(o.prep)o.prep();await window.__sh(name);flyExit();return {name,cy:+cy.toFixed(1),ty:+ty.toFixed(1)};};
