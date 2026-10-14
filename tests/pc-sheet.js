(function(){
/* Contact sheets of the character creator's options (a --dev build and the screenshot server on 8766): window.__pcSheet(list, {name, cols, size, view, yaw}) draws each {cfg, label, view?, yaw?} with pcSnap
   into one picture and uploads it as name.jpg. window.__pcCombos(kind) gives the lists used to check the catalogue: 'heads', 'hair', 'tops', 'bottoms', 'acc', 'random'. */
const V={full:{ty:.19,dist:1.0,dais:1},head:{ty:.305,dist:.3},head2:{ty:.3,dist:.4},bust:{ty:.27,dist:.5},torso:{ty:.2,dist:.5},legs:{ty:.08,dist:.56},feet:{ty:.03,dist:.33},body:{ty:.16,dist:.78}};
window.__pcV=V;
window.__pcSheet=async function(list,o){o=o||{};const cols=o.cols||6,sz=o.size||200,rows=Math.ceil(list.length/cols),LH=16;
  const cv=document.createElement('canvas');cv.width=cols*sz;cv.height=rows*(sz+LH);const cx=cv.getContext('2d');cx.fillStyle='#262a36';cx.fillRect(0,0,cv.width,cv.height);
  for(let i=0;i<list.length;i++){const it=list[i],x=(i%cols)*sz,y=Math.floor(i/cols)*(sz+LH);
    pcSnap(it.cfg,V[it.view||o.view||'full'],sz,it.yaw!=null?it.yaw:o.yaw!=null?o.yaw:.45);cx.drawImage(pcStage().tc,x,y);/* the canvas pcSnap drew into (an image would not decode while the page is hidden) */
    cx.fillStyle='#d8d8d8';cx.font='12px sans-serif';cx.fillText(String(it.label||'').slice(0,34),x+4,y+sz+12);cx.strokeStyle='#3a3f4e';cx.strokeRect(x+.5,y+.5,sz-1,sz+LH-1);}
  return fetch('http://localhost:8766/'+(o.name||'sheet')+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.9)}).then(r=>r.status);};
/* variants of head shapes: [[label, id, params to override]] -> a sheet (front and three quarters, both genders) */
window.__pcHeadVar=async function(name,vars){const Hh=PCX_IDX.head,keep={};for(const k in Hh)keep[k]=Hh[k].p;const list=[];
  try{for(const [lab,id,p] of vars){Hh[id].p=Object.assign({},keep[id],p);for(const g of['m','f'])for(const y of[0,.8]){const cv=document.createElement('canvas');cv.width=cv.height=200;
    pcSnap(Object.assign(pcDefaults(g,''),{head:id,hair:'crop',acc:'none',_nokit:true}),V.head,200,y);cv.getContext('2d').drawImage(pcStage().tc,0,0);list.push({cv,label:lab+' '+g+(y?' 3/4':'')});}Hh[id].p=keep[id];}}
  finally{for(const k in Hh)Hh[k].p=keep[k];}
  const cols=8,sz=200,rows=Math.ceil(list.length/cols),cv=document.createElement('canvas');cv.width=cols*sz;cv.height=rows*(sz+16);const cx=cv.getContext('2d');cx.fillStyle='#262a36';cx.fillRect(0,0,cv.width,cv.height);
  list.forEach((o,i)=>{const x=(i%cols)*sz,y=Math.floor(i/cols)*(sz+16);cx.drawImage(o.cv,x,y);cx.fillStyle='#ddd';cx.font='12px sans-serif';cx.fillText(o.label,x+4,y+sz+12);});
  return fetch('http://localhost:8766/'+name+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.9)}).then(r=>r.status);};
window.__pcCombos=function(kind,g){const D=pcDefaults(g||'m',''),out=[],w=(c,label,view,yaw)=>out.push({cfg:pcClean(Object.assign({},D,c)),label,view,yaw});
  if(kind==='heads'){for(const gg of['m','f'])for(const h of PCX.head){w({gender:gg,head:h.id,hair:'buzz',acc:'none'},gg+' '+h.id,'head',0);w({gender:gg,head:h.id,hair:'buzz',acc:'none'},gg+' '+h.id+' 3/4','head',.8);}}
  else if(kind==='hair'){for(const h of PCX.hair){w({hair:h.id,acc:'none'},h.id+' front','head2',0);w({hair:h.id,acc:'none'},h.id+' side','head2',1.4);w({hair:h.id,acc:'none'},h.id+' back','head2',Math.PI);}}
  else if(kind==='tops'){for(const a of PCX.top1)for(const b of PCX.top2)w({top1:a.id,top2:b.id,top1C:1,top2C:3},a.id+' + '+b.id,'torso',.35);}
  else if(kind==='bottoms'){for(const a of PCX.bottoms)for(const s of PCX.shoes)w({bottoms:a.id,shoes:s.id},a.id+' + '+s.id,'legs',.5);}
  else if(kind==='acc'){for(const a of PCX.acc)for(const h of['crop','long','bun','bald'])w({acc:a.id,hair:h},a.id+' / '+h,'head2',.6);}
  else if(kind==='random'){for(let i=0;i<24;i++){const c=pcRandom(i%2?'f':'m','');out.push({cfg:c,label:[c.head,c.hair,c.top1,c.top2,c.bottoms,c.acc].join(' '),view:'full',yaw:.5});}}
  return out;};
})();
