/* =====================================================================================================================
   KINGSGAARD - THE PLAYER'S CHARACTER: the catalogue of the creator, the saved configuration, the model and the little stage of the preview.

   The character is made in the creator (menu/menu.js) in this order: gender, name, head shape, hairstyle, clothing (a base layer, an outer layer worn over it, bottoms, shoes), one accessory, and is kept in PC:
     {v:2, name, gender:'m'|'f', head, skin, hair, hairC, top1, top1C, top2, top2C, bottoms, botC, shoes, shoeC, acc}
   Every item says who can wear it (g: 'm', 'f' or 'mf'); pcClean keeps only items of the saved gender (pcFits) and the creator shows only those (pcFor).
   The item fields hold the ids of the catalogue below (not positions in it), the colour fields indices into the palettes; pcClean turns anything (an old save, a damaged one, a version of the creator that had other items) into
   a valid configuration, falling back to the defaults of the gender. Adding an item is adding a row to its list (and, for a new shape, a builder below): nothing else changes, and saves made before keep working.

   The model is built by pcAssemble (src/pcm.js, called from heroModel('pc')) on the skeleton of src/pc2.js: a skinned body and skinned clothes (the base layer is the torso itself, the outer layer the same surface
   4.5 mm further out, skirts and the skirts of coats and the cloak on chains of spring bones), the head lofted with its neck (pcHeadSurf, below) and skinned to head, neck and chest, the hair of src/pchair.js, the hands, the
   accessory and the weapons as rigid parts on their bones; src/pcanim.js animates it (pcCtl). Smooth, stylized materials by kind (PM: skin, hair, cloth and the fabrics of PCFAB, leather, metal, eyes) with a soft rim of the sky light.
   Figure units: the figure is 0.365 tall to the crown and is drawn 3.72 times larger (HS; the villagers 3.45, VIL_HS); the landmarks are PCL (pc2.js); the front of the body is +z.
   ===================================================================================================================== */
const PCX_SKIN=[{n:'Fair',c:0xf7d8c0},{n:'Light',c:0xefc3a0},{n:'Warm',c:0xdca276},{n:'Tan',c:0xc08457},{n:'Brown',c:0x925f3c},{n:'Deep',c:0x613d28}];
const PCX_HAIRC=[{n:'Flaxen',c:0xeccf8c},{n:'Golden',c:0xd49d40},{n:'Chestnut',c:0x844b29},{n:'Dark brown',c:0x4d2e1d},{n:'Raven',c:0x241b1a},{n:'Auburn',c:0xb6492a},{n:'Ash grey',c:0x9e9c97},{n:'Silver',c:0xe4e2dc}];
const PCX_CLOTH=[{n:'Linen',c:0xeae0c8},{n:'White',c:0xf4f2ed},{n:'Charcoal',c:0x3a3a43},{n:'Leather',c:0x7c4b27},{n:'Umber',c:0x50311c},{n:'Forest',c:0x3f7a3b},{n:'Moss',c:0x6b7b39},{n:'Azure',c:0x316ca8},{n:'Navy',c:0x27365b},{n:'Crimson',c:0xa02b30},{n:'Plum',c:0x70396e},{n:'Ochre',c:0xc6963b}];
/* the categories, in the order of the creator. view: how a thumbnail of an item frames the figure. for (hair): the genders a style is offered to first (any style can be worn by anybody). */
const PCX={
  gender:[{id:'m',g:'m',n:'Male'},{id:'f',g:'f',n:'Female'}],
  head:[
    {id:'m_classic',g:'m',n:'Classic',d:'Balanced features, a moderately defined jaw.',p:{}},
    {id:'m_chisel',g:'m',n:'Chiselled',d:'A clean, angular jaw, a firm chin and higher cheekbones.',p:{jaw:.84,chinW:.52,chinZ:.8,chinE:2.15,ja:.05,cb:.04,cheek:.95,L:1.04,nb:.2,brow:.05}},
    {id:'m_broad',g:'m',n:'Broad',d:'A wider face and jaw, a stronger brow and nose.',p:{temple:1.04,cheek:1.03,jaw:.88,chinW:.58,chinE:2.1,brow:.05,nw:.065,nx:1.15,rn:.49,ll:.032,ja:.04}},
    {id:'m_lean',g:'m',n:'Lean',d:'A narrow face, a longer jaw and nose.',p:{temple:.93,cheek:.9,jaw:.7,chinW:.42,L:1.12,nb:.215,cb:.035,rn:.42}},
    {id:'m_soft',g:'m',n:'Soft',d:'Fuller cheeks, a softer jaw and a rounder chin.',p:{cheek:.98,jaw:.74,chinW:.46,chinZ:.74,chinE:1.85,ja:.0,cb:.012,cf:.035,L:.95,nt:.065,brow:.03}},
    {id:'f_classic',g:'f',n:'Classic',d:'A balanced oval, a gently tapered jaw.',p:{}},
    {id:'f_heart',g:'f',n:'Heart',d:'Wide cheekbones narrowing to a fine chin.',p:{temple:1.0,cheek:.99,jaw:.62,chinW:.3,chinE:1.55,cb:.05,L:.98}},
    {id:'f_angular',g:'f',n:'High cheekbones',d:'Defined cheekbones and a light, clean jaw.',p:{cheek:.97,jaw:.71,chinW:.4,chinE:2,cb:.065,ja:.02,L:1.02,nb:.155}},
    {id:'f_oval',g:'f',n:'Long oval',d:'A longer, narrower face.',p:{temple:.93,cheek:.9,jaw:.64,chinW:.36,L:1.1,nb:.16}},
    {id:'f_round',g:'f',n:'Soft round',d:'Fuller cheeks and a rounder jaw.',p:{temple:1.0,cheek:.99,jaw:.76,chinW:.44,chinE:1.85,cf:.03,cb:.02,L:.93,nt:.05}}],
  hair:[
    {id:'crop',g:'m',n:'Short crop'},{id:'messy',g:'m',n:'Messy'},{id:'swept',g:'m',n:'Swept back'},{id:'spiky',g:'m',n:'Spiky'},{id:'buzz',g:'m',n:'Buzzed'},{id:'bald',g:'m',n:'Shaved'},
    {id:'ponytail',g:'mf',n:'Tied back'},{id:'pixie',g:'f',n:'Pixie cut'},{id:'medium',g:'f',n:'Bob'},{id:'long',g:'f',n:'Long'},{id:'bun',g:'f',n:'Bun'},{id:'braid',g:'f',n:'Braid'}],
  top1:[
    {id:'shirt',g:'mf',n:'Shirt',d:'Long sleeves, a collar and buttons.',sl:'long'},{id:'tee',g:'mf',n:'Short-sleeved shirt',d:'Short sleeves and a round neck.',sl:'short'},
    {id:'undershirt',g:'mf',n:'Undershirt',d:'Sleeveless, with a low neck.',sl:'none'},{id:'blouse',g:'f',n:'Blouse',d:'Puffed sleeves and a laced neckline.',sl:'puff'},
    {id:'tunic',g:'mf',n:'Tunic',d:'Long sleeves, a belt and a skirt to mid-thigh.',sl:'long'},{id:'sweater',g:'mf',n:'Sweater',d:'Knitted, with a high collar and ribbed cuffs.',sl:'long'}],
  top2:[
    {id:'none',g:'mf',n:'None',d:'Only the base layer.'},{id:'jacket',g:'mf',n:'Open jacket',d:'Open at the front, with lapels.',sl:'long',gap:.024},{id:'vest',g:'mf',n:'Vest',d:'A buttoned waistcoat, no sleeves.',gap:.009},
    {id:'coat',g:'mf',n:'Long coat',d:'A riding coat to the knee, open at the front.',sl:'long',gap:.018},{id:'hoodie',g:'mf',n:'Hooded top',d:'Closed, with a hood down and a pocket.',sl:'long',gap:0},
    {id:'openshirt',g:'mf',n:'Open shirt',d:'An unbuttoned shirt over the base layer, rolled sleeves.',sl:'rolled',gap:.032},{id:'jerkin',g:'mf',n:'Leather jerkin',d:'Laced at the front, with shoulder guards.',gap:0},
    {id:'cloak',g:'mf',n:'Cloak',d:'A cloak on the back, held by a clasp.'}],
  bottoms:[
    {id:'trousers',g:'mf',n:'Trousers',d:'Straight and plain.'},{id:'fitted',g:'mf',n:'Fitted breeches',d:'Close to the leg.'},{id:'loose',g:'mf',n:'Loose trousers',d:'Wide, flared at the ankle.'},
    {id:'shorts',g:'mf',n:'Knee shorts',d:'To the knee.'},{id:'skirt',g:'f',n:'Skirt',d:'A skirt to the knee.'},{id:'longskirt',g:'f',n:'Long skirt',d:'A skirt to the ankle.'}],
  shoes:[{id:'boots',g:'mf',n:'Boots',d:'Ankle boots.'},{id:'tallboots',g:'mf',n:'Tall boots',d:'To below the knee, with a folded top.'},{id:'shoes',g:'mf',n:'Shoes',d:'Low shoes with a sole.'},{id:'sandals',g:'mf',n:'Sandals',d:'A sole and two straps.'},{id:'pointed',g:'mf',n:'Pointed shoes',d:'Long, pointed toes.'}],
  acc:[
    {id:'none',g:'mf',n:'None'},{id:'glasses',g:'mf',n:'Spectacles'},{id:'hat',g:'mf',n:'Wide hat'},{id:'cap',g:'mf',n:'Feathered cap'},{id:'hood',g:'mf',n:'Hood'},{id:'circlet',g:'mf',n:'Circlet'},
    {id:'earrings',g:'mf',n:'Earrings'},{id:'pendant',g:'mf',n:'Pendant'},{id:'scarf',g:'mf',n:'Scarf'},{id:'eyepatch',g:'mf',n:'Eyepatch'}]};
const PCX_IDX={};for(const k in PCX){PCX_IDX[k]={};for(const o of PCX[k])PCX_IDX[k][o.id]=o;}
const PCX_DEF={
  m:{head:'m_classic',skin:1,hair:'crop',hairC:3,top1:'shirt',top1C:0,top2:'jacket',top2C:3,bottoms:'trousers',botC:4,shoes:'boots',shoeC:4,acc:'none'},
  f:{head:'f_classic',skin:1,hair:'ponytail',hairC:2,top1:'blouse',top1C:1,top2:'vest',top2C:5,bottoms:'fitted',botC:3,shoes:'boots',shoeC:4,acc:'none'}};
const PCX_KEYS=['head','skin','hair','hairC','top1','top1C','top2','top2C','bottoms','botC','shoes','shoeC','acc'];
const PC_NAMES={m:['Aldwyn','Corwin','Eadric','Garrick','Ivor','Osric','Perrin','Rowan','Ulric','Wystan','Yorick','Bram','Cedric','Doran'],f:['Brenna','Dagny','Fenna','Halla','Jorunn','Kestrel','Linnea','Maelis','Nerys','Sigrid','Tamsin','Vesna','Rowan','Ysolde']};
/* the items of a category a gender can wear: the g of an item says who ('m', 'f' or both) */
const pcFits=(o,g)=>!!o&&(o.g||'mf').indexOf(g)>=0,pcFor=(k,g)=>PCX[k].filter(o=>pcFits(o,g));
/* the heads of the first catalogue (shared by both) and the head of each gender they became */
const PC_HEAD_OLD={m:{oval:'m_classic',round:'m_soft',square:'m_chisel',long:'m_lean',heart:'m_classic',broad:'m_broad'},f:{oval:'f_classic',round:'f_round',square:'f_angular',long:'f_oval',heart:'f_heart',broad:'f_angular'}};
/* a name: two to eighteen characters, letters first, then letters, spaces, hyphens, apostrophes and full stops */
function pcName(s){s=String(s==null?'':s).replace(/\s+/g,' ').trim();
  if(s.length<2)return{ok:false,msg:'A name needs at least two letters.',name:s};
  if(s.length>18)return{ok:false,msg:'A name can have at most 18 characters.',name:s.slice(0,18)};
  if(!/^[\p{L}][\p{L}'\u2019 .-]*$/u.test(s)||(s.match(/\p{L}/gu)||[]).length<2)return{ok:false,msg:'Use letters, spaces, hyphens and apostrophes only.',name:s};
  return{ok:true,name:s};}
/* the nearest colour of a palette (for configurations of the first creator) */
function pcNear(pal,c){let b=0,bd=1e9;for(let i=0;i<pal.length;i++){const p=pal[i].c,d=((p>>16&255)-(c>>16&255))**2+((p>>8&255)-(c>>8&255))**2+((p&255)-(c&255))**2;if(d<bd){bd=d;b=i;}}return b;}
/* a configuration of the first creator (v1: a body of two, a hooded or bare head, two colours, indices) becomes the nearest one of this one */
function pcMigrate1(o){const cl1=[0x3f7a34,0x2f6f9f,0x9a5a24,0x7a3a6a,0x4a6a7a,0xc9a04a,0x9a2a2a,0xc8c0a8],cl2=[0x2e5a24,0x2a4a6a,0x5a3a22,0x5a1a3a,0x4a4a52,0x1f5a5a,0x8a6a2a,0x1e1a26],hc=[0xe8c870,0x7a4a26,0x2a2220,0xb4502a,0xd4d8dc,0x4a4f78];
  const pi=(v,n)=>{v=Math.floor(+v);return v>=0&&v<n?v:0;},hood=pi(o.head,2)===0,fem=pi(o.body,2)===1;
  return{v:2,name:o.name,gender:fem?'f':'m',head:fem?'f_classic':'m_classic',skin:1,hair:fem?(hood?'pixie':'braid'):(hood?'crop':'ponytail'),hairC:pcNear(PCX_HAIRC,hc[pi(o.hair,6)]),top1:'tunic',top1C:pcNear(PCX_CLOTH,cl1[pi(o.c1,8)]),top2:'cloak',top2C:pcNear(PCX_CLOTH,cl2[pi(o.c2,8)]),
    bottoms:'trousers',botC:4,shoes:'boots',shoeC:3,acc:hood?'hood':'circlet'};}
/* what the save keeps: always valid, whatever it is given */
function pcClean(o){o=o&&typeof o==='object'&&!Array.isArray(o)?o:{};if(o.v!==2&&(o.body!=null||o.c1!=null||o.c2!=null))o=pcMigrate1(o);
  const gd=o.gender==='f'?'f':'m',D=PCX_DEF[gd],nm=pcName(o.name),id=k=>{let v=o[k];if(k==='head'&&typeof v==='string'&&PC_HEAD_OLD[gd][v])v=PC_HEAD_OLD[gd][v];return(typeof v==='string'&&pcFits(PCX_IDX[k][v],gd))?v:D[k];},ix=(k,n)=>{const v=Math.floor(+o[k]);return v>=0&&v<n?v:D[k];};
  return{v:2,name:nm.ok?nm.name:'Wanderer',gender:gd,head:id('head'),skin:ix('skin',PCX_SKIN.length),hair:id('hair'),hairC:ix('hairC',PCX_HAIRC.length),top1:id('top1'),top1C:ix('top1C',PCX_CLOTH.length),
    top2:id('top2'),top2C:ix('top2C',PCX_CLOTH.length),bottoms:id('bottoms'),botC:ix('botC',PCX_CLOTH.length),shoes:id('shoes'),shoeC:ix('shoeC',PCX_CLOTH.length),acc:id('acc')};}
function pcDefaults(gender,name){return pcClean(Object.assign({v:2,gender,name},PCX_DEF[gender==='f'?'f':'m']));}
/* a random look of one gender out of things that go together: a hairstyle offered to that gender, two layers of different colours, shoes and bottoms that are not the colour of the top */
function pcRandom(gender,name){const r=a=>a[Math.floor(Math.random()*a.length)],ri=n=>Math.floor(Math.random()*n),g=gender==='f'?'f':'m',nC=PCX_CLOTH.length,F=k=>pcFor(k,g);
  const top1C=ri(nC);let top2C=ri(nC);if(top2C===top1C)top2C=(top2C+3)%nC;let botC=ri(nC);if(botC===top1C)botC=(botC+5)%nC;
  return pcClean({v:2,gender:g,name,head:r(F('head')).id,skin:ri(PCX_SKIN.length),hair:r(F('hair')).id,hairC:ri(PCX_HAIRC.length),top1:r(F('top1')).id,top1C,top2:Math.random()<.2?'none':r(F('top2').filter(o=>o.id!=='none')).id,top2C,
    bottoms:r(F('bottoms')).id,botC,shoes:r(F('shoes')).id,shoeC:r([2,3,4,4,8]),acc:Math.random()<.35?'none':r(F('acc').filter(o=>o.id!=='none')).id});}
const pcItem=(k,id)=>PCX_IDX[k][id];
/* the colour the game uses for the character (its spawn flash): the outer layer, or the base layer when there is none */
const pcCol=o=>{o=pcClean(o);return PCX_CLOTH[o.top2==='none'||o.top2==='cloak'?o.top1C:o.top2C].c;};
/* the weapon of the character: the sword (fights hand to hand). It is an item now: drawn while its hotbar slot is selected, in its scabbard otherwise (kingsgaard.html pcHold).
   The bow (a ranger) is put away until it is an item of its own, so the old choice in the save (meta.pcw) is no longer read. */
function pcWeapon(){return 'sword';}
HB.pc={id:'pc',n:'Wanderer',title:'',stars:1,cl:'ranger',col:0x3f7a34,tn:'Deadeye',td:'+15% crit chance',price:0,pow:1,pc:true,mage:false,scrolls:true};
/* its class follows the weapon in its hands */
Object.defineProperty(HB.pc,'cl',{get(){return pcWeapon()==='sword'?'blade':'ranger';},set(){},enumerable:true,configurable:true});
let PC=pcClean(null);

/* ---------------------------------------------------------------- the model ---------------------------------------------------------------- */
/* The character is smooth, unlike the faceted world it walks in: every part is a smooth surface generated here (cached by its parameters in gget) with averaged normals, drawn with smooth-shaded materials of
   its own kind (skin, hair, cloth and the fabrics, felt, leather, metal, eyes), each with its own highlight, and a soft rim of the sky light along its edges (pcRimPatch) that keeps the figure readable in bright and dark places.
   The torso is pcBody2 (pc2.js); the garments are bands of it at growing offsets, so the layers always fit each other; the face, the hair and the hats are placed on the head surface (headAt in pcm.js). */
const pcMix=(a,b,k)=>{const r=(a>>16&255)*(1-k)+(b>>16&255)*k,g=(a>>8&255)*(1-k)+(b>>8&255)*k,bl=(a&255)*(1-k)+(b&255)*k;return(Math.round(r)<<16)|(Math.round(g)<<8)|Math.round(bl);};
const pcDark=(c,k)=>pcMix(c,0x000000,k),pcLite=(c,k)=>pcMix(c,0xffffff,k);
const k5=v=>Math.round(v*1e5);
/* materials by kind: [specular colour, shininess, flat] */
/* the low-poly look (Task L): every material flat shaded, matt, no fabric relief; colour does the work */
const PCLOW=true;
const PCK={blade:[0xb8c4d0,70,1],skinV:[0x0a0806,5,0,1],skin:[0x0a0806,5],hair:[0x100d0b,7,1,1],cloth:[0x060606,3],denim:[0x08090b,4],knit:[0x050505,2],wool:[0x050505,2],felt:[0x050505,2],leather:[0x1e1810,12],metal:[0x8a8270,46],eye:[0x202020,12],bead:[0x9a9a9a,46,1],gem:[0xffffff,90,1],dark:[0x080808,4]};
/* the fabrics: a relief drawn by the shader from where the surface is in the bind pose (no UVs, so it stays on a skinned garment): [the period of the pattern in figure units, the depth, the pattern]
   cotton: a fine plain weave; denim: a diagonal twill; knit: ribs and stitches; wool: a coarse twill; leather: a pebbled grain; felt: a soft fuzz. Too fine to draw at a distance, it fades out (never shimmers). */
const PCFAB={cloth:[.0032,.00011,0],denim:[.003,.00017,1],knit:[.0029,.00028,2],wool:[.0042,.0002,1],leather:[.0042,.00014,3],felt:[.0035,.0001,3]};
const PCFAB_H=['float pcH(vec3 p){return sin(p.y)*sin(p.x+p.z)+.35*sin(2.0*(p.x-p.z));}',
  'float pcH(vec3 p){float t=p.y+.72*(p.x+p.z);return sin(t)+.3*sin(3.0*t+.7)+.25*sin(p.y*.5-1.3*(p.x-p.z));}',
  'float pcH(vec3 p){float r=abs(sin(.55*(p.x+p.z)));return r*.9+.35*sin(p.y*1.7)*r;}',
  'float pcHn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float n=dot(i,vec3(1.0,57.0,113.0));vec4 a=fract(sin(vec4(n,n+1.0,n+57.0,n+58.0))*43758.5453);vec4 b=fract(sin(vec4(n+113.0,n+114.0,n+170.0,n+171.0))*43758.5453);vec4 c=mix(a,b,f.z);vec2 d=mix(c.xy,c.zw,f.y);return mix(d.x,d.y,f.x);}float pcH(vec3 p){return pcHn(p)+.5*pcHn(p*2.3+7.1);}'];
function pcFabPatch(sh,kind){pcRimPatch(sh);const F=PCFAB[kind];if(!F)return;const fq=(2*Math.PI/F[0]).toFixed(2),am=F[1].toFixed(6);
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPcObj;\nvarying float vPcS;').replace('#include <begin_vertex>','#include <begin_vertex>\n\tvPcObj=position;vPcS=length(modelMatrix[0].xyz);');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPcObj;\nvarying float vPcS;\n'+PCFAB_H[F[2]]+'\nvec3 pcPerturb(vec3 sp,vec3 sn,vec2 d){vec3 sx=dFdx(sp),sy=dFdy(sp),r1=cross(sy,sn),r2=cross(sn,sx);float det=dot(sx,r1);vec3 g=sign(det)*(d.x*r1+d.y*r2);return normalize(abs(det)*sn-g);}')
    .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n#if __VERSION__ >= 300 || defined(GL_OES_standard_derivatives)\n\t{vec3 pq=vPcObj*'+fq+';float h=pcH(pq)*'+am+'*vPcS;float fw=length(fwidth(pq));vec2 d=vec2(dFdx(h),dFdy(h))*clamp(2.2-fw*.75,0.0,1.0);normal=pcPerturb(-vViewPosition,normal,d);}\n#endif');}
const PCMC={};
/* the shading of the character: a soft rim of the sky light, and (low-poly) a wrapped diffuse light - the side away from the sun is half lit, not black, so faces and folds read as clean planes in any light */
const PCWRAP=THREE.ShaderChunk.lights_phong_pars_fragment.replace('float dotNL = saturate( dot( geometry.normal, directLight.direction ) );','float dotNL = saturate( dot( geometry.normal, directLight.direction ) * 0.5 + 0.5 ); dotNL = dotNL * ( 0.35 + 0.65 * dotNL );');
/* and the light of the sky is taken from a normal bent upwards, so planes that face down (under the chin, the jaw, the brim of a sleeve) are lit by the sky, not by the dark ground; it still follows the scene (dark at night) */
const PCHEMI=THREE.ShaderChunk.lights_pars_begin.replace('float dotNL = dot( geometry.normal, hemiLight.direction );','float dotNL = dot( normalize( geometry.normal + hemiLight.direction * 0.9 ), hemiLight.direction );');
function pcRimPatch(sh){if(PCLOW)sh.fragmentShader=sh.fragmentShader.replace('#include <lights_phong_pars_fragment>',PCWRAP).replace('#include <lights_pars_begin>',PCHEMI);sh.fragmentShader=sh.fragmentShader.replace('#include <envmap_fragment>','#include <envmap_fragment>\n\t{float pcF=1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0);outgoingLight+=reflectedLight.indirectDiffuse*(.45*pcF*pcF*pcF);}');}
function PM(col,kind,dbl){const key=col+'|'+kind+(dbl?'|2':'');let m=PCMC[key];if(m)return m;const K=PCK[kind]||PCK.cloth,fab=!PCLOW&&!!PCFAB[kind];
  m=new THREE.MeshPhongMaterial({color:col,specular:K[0],shininess:K[1],flatShading:PCLOW||!!K[2],vertexColors:!!K[3],side:dbl?THREE.DoubleSide:THREE.FrontSide});
  /* (low-poly: a little of its own colour as light, so the planes in shadow stay soft and clean, as in a bright stylized game) */
  if(PCLOW&&kind!=='eye'&&kind!=='dark'&&kind!=='gem')m.emissive=new THREE.Color(col).multiplyScalar(kind==='skin'||kind==='skinV'?.06:.04);
  if(fab){m.onBeforeCompile=sh=>pcFabPatch(sh,kind);m.customProgramCacheKey=()=>'pcfab'+kind;m.extensions={derivatives:true};}else{m.onBeforeCompile=pcRimPatch;m.customProgramCacheKey=()=>'pcrim';}return PCMC[key]=m;}
/* ---- smooth geometry ---- */
/* normals that are the same for vertices at the same place (the seam of a surface of revolution, its poles) */
function pcSmooth(g){g.computeVertexNormals();const p=g.attributes.position.array,n=g.attributes.normal.array,m=new Map();
  for(let i=0;i<p.length;i+=3){const k=Math.round(p[i]*2e5)+'_'+Math.round(p[i+1]*2e5)+'_'+Math.round(p[i+2]*2e5),a=m.get(k);if(a)a.push(i);else m.set(k,[i]);}
  for(const a of m.values())if(a.length>1){let x=0,y=0,z=0;for(const i of a){x+=n[i];y+=n[i+1];z+=n[i+2];}const l=Math.hypot(x,y,z)||1;x/=l;y/=l;z/=l;for(const i of a){n[i]=x;n[i+1]=y;n[i+2]=z;}}
  g.attributes.normal.needsUpdate=true;return g;}
/* front faces outward: 'axis' (away from the y axis), 'point' (away from the origin) */
function pcFix(g,mode){pcSmooth(g);if(!mode)return g;const p=g.attributes.position.array,n=g.attributes.normal.array;let s=0;
  for(let i=0;i<p.length;i+=3)s+=mode==='point'?n[i]*p[i]+n[i+1]*p[i+1]+n[i+2]*p[i+2]:n[i]*p[i]+n[i+2]*p[i+2];
  if(s<0){const ix=g.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t;}g.index.needsUpdate=true;pcSmooth(g);}return g;}
/* a grid surface: fn(u,v,out) for u,v in [0,1] */
function pcGrid(key,nu,nv,fn,mode){return gget('pcg'+key,()=>{const W=nu+1,N=W*(nv+1),pos=new Float32Array(N*3),o=[0,0,0];let k=0;
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){fn(i/nu,j/nv,o);pos[k++]=o[0];pos[k++]=o[1];pos[k++]=o[2];}
  const ix=new(N>65535?Uint32Array:Uint16Array)(nu*nv*6);let q=0;for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*W+i,b=a+1,c=a+W,d=c+1;ix[q++]=a;ix[q++]=b;ix[q++]=c;ix[q++]=b;ix[q++]=d;ix[q++]=c;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(new THREE.BufferAttribute(ix,1));return pcFix(g,mode);});}
/* a surface of revolution round y through the points [r, y] (bottom to top) */
function pcRev(key,pts,nu){return pcGrid('r'+key,nu||16,pts.length-1,(u,v,o)=>{const p=pts[Math.round(v*(pts.length-1))],a=u*2*Math.PI;o[0]=p[0]*Math.sin(a);o[1]=p[1];o[2]=p[0]*Math.cos(a);},'axis');}
const pcBall=()=>pcRev('ball',Array.from({length:6},(_,j)=>{const a=-Math.PI/2+j/5*Math.PI;return[Math.cos(a),Math.sin(a)];}),8);
const pcBead=()=>pcRev('bead',Array.from({length:5},(_,j)=>{const a=-Math.PI/2+j/4*Math.PI;return[Math.cos(a),Math.sin(a)];}),6);
/* a spherical cap round +y down to the polar angle a (an eyelid) */
const pcLidG=a=>pcRev('lid'+k5(a),Array.from({length:10},(_,j)=>{const t=a*(1-j/9);return[Math.sin(t),Math.cos(t)];}),22);
/* a capsule: the top end round a centre at 0 (radius r1), the bottom end round a centre at -len (radius r2); open:true leaves the bottom open (a sleeve) */
function pcCapG(r1,r2,len,nu,open){const h=4,pts=[];if(!open)for(let j=0;j<=h;j++){const a=-Math.PI/2+j/h*Math.PI/2;pts.push([r2*Math.cos(a),-len+r2*Math.sin(a)]);}else pts.push([r2,-len]);
  for(let j=0;j<=h;j++){const a=j/h*Math.PI/2;pts.push([r1*Math.cos(a),r1*Math.sin(a)]);}return pcRev(`cap${k5(r1)},${k5(r2)},${k5(len)},${open?1:0}`,pts,Math.min(nu||12,12));}
/* a superellipsoid of half-size 1 (e 1: a sphere, e .3: a soft box) */
function pcSEG(e1,e2,nu,nv){const c=(w,m)=>Math.sign(Math.cos(w))*Math.pow(Math.abs(Math.cos(w)),m),s=(w,m)=>Math.sign(Math.sin(w))*Math.pow(Math.abs(Math.sin(w)),m);
  return pcGrid(`se${e1},${e2},${nu||8},${nv||5}`,nu||8,nv||5,(u,v,o)=>{const la=-Math.PI/2+v*Math.PI,lo=-Math.PI+u*2*Math.PI;o[0]=c(la,e1)*s(lo,e2);o[1]=s(la,e1);o[2]=c(la,e1)*c(lo,e2);},'point');}
/* a tube along a curve cv(t) with radius rad(t) (a number or [rx, ry]); the frames follow the curve */
function pcTube(key,nu,nv,cv,rad,n0){return gget('pct'+key,()=>{const P=[],T=[],Ns=[],Bs=[];for(let j=0;j<=nv;j++)P.push(new THREE.Vector3().fromArray(cv(j/nv)));
  for(let j=0;j<=nv;j++)T.push(P[Math.min(nv,j+1)].clone().sub(P[Math.max(0,j-1)]).normalize());
  const N=n0?new THREE.Vector3().fromArray(n0):new THREE.Vector3(0,0,1);if(!n0&&Math.abs(T[0].z)>.9)N.set(1,0,0);for(let j=0;j<=nv;j++){N.sub(T[j].clone().multiplyScalar(N.dot(T[j]))).normalize();Ns.push(N.clone());Bs.push(T[j].clone().cross(N).normalize());}
  const W=nu+1,pos=new Float32Array(W*(nv+1)*3);let k=0;for(let j=0;j<=nv;j++){const r=rad(j/nv),rx=Array.isArray(r)?r[0]:r,ry=Array.isArray(r)?r[1]:r;
    for(let i=0;i<=nu;i++){const a=i/nu*2*Math.PI,c=Math.cos(a)*rx,s=Math.sin(a)*ry;pos[k++]=P[j].x+Ns[j].x*c+Bs[j].x*s;pos[k++]=P[j].y+Ns[j].y*c+Bs[j].y*s;pos[k++]=P[j].z+Ns[j].z*c+Bs[j].z*s;}}
  const ix=new Uint16Array(nu*nv*6);let q=0;for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*W+i,b=a+1,c=a+W,d=c+1;ix[q++]=a;ix[q++]=b;ix[q++]=c;ix[q++]=b;ix[q++]=d;ix[q++]=c;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(new THREE.BufferAttribute(ix,1));return pcSmooth(g);});}
/* a monotone cubic through the knots (xs ascending) */
function pcSpline(xs,ys){const n=xs.length,d=[],m=[];for(let i=0;i<n-1;i++)d.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]));m.push(d[0]);for(let i=1;i<n-1;i++)m.push(d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2);m.push(d[n-2]);
  for(let i=0;i<n-1;i++){if(d[i]===0){m[i]=m[i+1]=0;continue;}const a=m[i]/d[i],b=m[i+1]/d[i],h=a*a+b*b;if(h>9){const t=3/Math.sqrt(h);m[i]=t*a*d[i];m[i+1]=t*b*d[i];}}
  return x=>{if(x<=xs[0])return ys[0];if(x>=xs[n-1])return ys[n-1];let i=0;while(x>xs[i+1])i++;const h=xs[i+1]-xs[i],t=(x-xs[i])/h,t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1];};}
const pcSm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const pcWrap=a=>{a=((a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a;};
/* ---- the head ---- */
/* The head is lofted in head units (1 = U = .0345 in the head's own group, which pcm.js scales onto the head bone: .0255 of the figure): the eyes at y -.12, the brows at .13, the crown at 1.17, the chin at about -1.3, the neck on down to -1.86; x to the side, z forward. Each height has
   a section whose front half (the face: flatter) and back half (the skull, then the neck) are superellipses of their own; above the brows a dome closes it. The features are smooth displacements of that one
   surface: the brow ridge, the eye sockets, the nose (bridge, tip, wings), the lips and the line between them, the chin, the cheekbones, the angle of the jaw, the temples. Head and neck are one piece.
   PCHB: the base shape of each gender; a head of the catalogue (PCX.head p) changes some of it. */
const PCHB={m:{adam:.03,ch:.012,rn:.44,temple:.99,cheek:.96,jaw:.78,chinW:.46,chinZ:.76,chinE:1.9,L:1,zf:.88,brow:.035,cb:.022,ja:.018,cf:0,nb:.19,nt:.055,nw:.05,nx:1,ul:.034,ll:.04,mw:.29,er:.176,ri:.072,lash:.012,bw:.044,ba:.04,ex:.415,eU:.32,eL:-.25},
            f:{rn:.39,temple:.98,cheek:.95,jaw:.7,chinW:.38,chinZ:.73,chinE:1.75,L:.97,zf:.88,brow:.015,cb:.035,ja:.01,cf:.008,nb:.15,nt:.045,nw:.038,nx:.88,ul:.038,ll:.047,mw:.27,er:.18,ri:.076,lash:.018,bw:.032,ba:.07,ex:.42,eU:.36,eL:-.27}};
const PCHD={};
const pcMouthY=(x,p)=>(p.my||-.8)+.012*(x/p.mw)**2+.005*pcSm(0,p.mw,x);/* the line of the mouth (head units): the corners a little up, the right one a touch more (a face is never quite symmetric) */
function pcHeadSurf(p){const top=1.1,y0=.15,E=y=>Math.sqrt(Math.max(0,1-((y-y0)/(top-y0))**2)),rn=p.rn,gs=(a,s)=>Math.exp(-(a/s)*(a/s)),se=(t,e)=>Math.sign(t)*Math.pow(Math.abs(t),2/e);
  const Ys=[-1.86,-1.62,-1.46,-1.38,-1.3,-1.15,-1,-.85,-.6,-.35,-.12,y0];
  /* the width seen from the front: temples, cheekbones, then a steady taper through the jaw to the chin; the throat runs back almost level to the neck */
  /* the neck: a column that leans forward from under the skull to its base (its middle nc, its half depth dn); the throat runs back under the chin to it, its back rises to the base of the skull */
  const dn=rn*.92,nc=y=>-.06-.06*pcSm(-1.86,-1.38,y),nF=y=>nc(y)+dn,nB=y=>dn-nc(y);
  const cj=p.cheek-p.jaw,wF=pcSpline(Ys,[rn,rn,rn,rn,Math.min(rn,p.chinW+.07),Math.max(p.jaw-.32*(p.jaw-p.chinW),Math.min(p.jaw-.04,rn+.05)),p.jaw,p.cheek-.62*cj,p.cheek-.24*cj,p.cheek,p.temple,p.temple]);
  const zf=pcSpline(Ys,[nF(-1.86),nF(-1.62),nF(-1.46),nF(-1.38)+.06,p.chinZ-.06,p.chinZ+.13,p.zf-.012,p.zf+.012,p.zf+.02,p.zf+.005,p.zf,p.zf]);
  const ef=pcSpline(Ys,[2,2,2,1.95,p.chinE,1.8,1.85,1.87,1.95,2.02,2.06,2.1]);
  const b0=nB(-1.38),zb=pcSpline(Ys,[nB(-1.86),nB(-1.62),nB(-1.46),b0,b0+.016,Math.max(.6,b0+.03),Math.max(.65,b0+.04),Math.max(.73,b0+.055),Math.max(.87,b0+.1),Math.max(1.05,b0+.2),1.17,1.2]);
  const NY=[-.66,-.6,-.53,-.4,-.12,.06],nH=pcSpline(NY,[0,.45,1,.62,.16,0]),nS=pcSpline([-.66,-.53,-.4,-.12,.06],[.1,.085,.06,.048,.058]);
  const f=(y,ph,o)=>{const yd=y>=-.12?y:-.12+(y+.12)/p.L;let w,zF,zB,eF=2.15;
    /* the jaw line slants: under the ear the jaw ends higher than at the chin, so the sides of the face are read lower down the profile (towards the throat) than the front */
    const s2=Math.cos(ph)>0?Math.sin(ph)**2:1,ye=yd<-.55?yd-.3*s2*pcSm(-.55,-1.45,yd):yd;/* (spread so the surface never folds back: d(ye)/d(yd) stays above 0.4) */
    if(yd>=y0){const k=E(yd);w=p.temple*k;zF=p.zf*Math.pow(k,1.25);zB=1.2*Math.pow(k,.85);}else{w=wF(ye);if(yd<-.55){/* the sides and the back narrow in one smooth curve from the cheeks to the neck (the jaw's angle is its own bump, ja); the face's widths hold only towards the front */const wb=rn+(wF(-.55)-rn)*pcSm(-1.25,-.55,yd),cc=Math.cos(ph);w=cc>0?wb+(w+Math.max(0,wb-w)*pcSm(.6,.2,cc)-wb)*pcSm(0,.55,cc):wb;}zF=zf(yd<-1?yd-.25*s2*pcSm(-1,-1.6,yd):yd);/* (below the lips the underside of the jaw rises towards the ears too) */zB=zb(ye);eF=ef(yd);}/* (under the jaw the sides are the neck: never narrower than it) *//* the slant narrows the sides only: the profile of the front (lips, chin) stays */
    /* one superellipse per height, its centre moved forward or back so that it reaches zF in front and zB behind */
    const s=Math.sin(ph),c=Math.cos(ph),cz=(zF-zB)/2,dd=(zF+zB)/2,x=w*se(s,c>=0?eF:2.1),z=cz+dd*se(c,c>=0?eF:2.1);
    const ax=Math.abs(x),fw=Math.max(0,c),aph=Math.abs(ph);let dz=0,dr=0;
    if(fw>0){const fk=Math.min(1,fw*1.6);
      dz+=p.brow*gs(yd-.13,.09)*pcSm(.8,.5,ax)*(1+.35*gs(ax-.38,.2));
      dz-=(p.sock==null?.11:p.sock)*gs(ax-p.ex,.165)*gs(yd+.12,.13)+.014*gs(ax-p.ex,.17)*gs(yd+.31,.06);
      dz+=p.nb*nH(yd)*gs(x-.01,nS(yd)*p.nx)+p.nt*gs(x-.01,.09*p.nx)*gs(yd+.52,.065)+p.nw*gs(ax-.13*p.nx,.055)*gs(yd+.57,.05)-.022*gs(ax-.068*p.nx,.03)*gs(yd+.605,.022);
      dz+=.02*gs(x,.36)*gs(yd+.78,.17)+p.ul*gs(x,.22)*gs(yd+.755,.048)+p.ll*gs(x,.19)*gs(yd+.85,.045)-(p.mcr==null?.026:p.mcr)*gs(yd-pcMouthY(x,p),.013)*pcSm(p.mw+.02,p.mw-.04,ax)-.006*gs(x,.035)*gs(yd+.68,.05);
      dz+=.035*gs(x,.2)*gs(yd+1.18,.09)+.06*gs(x,p.chinW*.55)*gs(yd+1.27,.075)-.012*gs(x,.25)*gs(yd+.97,.04);/* the chin (its own: it never moves the sides), the groove under the lower lip */
      dz*=fk;
      dr+=(p.cb*gs(ax-.64,.26)*gs(yd+.42,.2)+p.cf*gs(ax-.52,.24)*gs(yd+.66,.22)-(p.ch||0)*gs(ax-.6,.2)*gs(yd+.74,.17))*fk;}
    dr+=p.ja*gs(aph-1.28,.24)*gs(yd+.98,.16)-.022*gs(aph-.95,.28)*gs(yd-.35,.18);/* the angle of the jaw (under the ear, never round the back), the temples */
    /* the neck: the two long muscles from behind the ears to the notch between the collarbones (they make its V), his larynx */
    {const t=(-.72-yd)/1.14;if(t>-.1&&t<1.1)dr+=(p.scm==null?.03:p.scm)*gs(aph-(1.5-1.25*t),.2)*pcSm(-.1,.15,t)*pcSm(1.1,.85,t);}
    if(p.adam)dr+=p.adam*gs(ph,.2)*gs(yd+1.56,.09);
    const h=Math.hypot(x,z)||1;o[0]=x+dr*x/h;o[1]=y;o[2]=z+dz+dr*z/h;return o;};
  return f;}
/* the head and neck as one mesh, dense where the face is (more columns at the front, more rows between the brows and the chin), with a little colour of its own: the lips, the line of the mouth, the eye sockets, a blush for her */
function pcHeadGeo(key,S,p,F){return gget('pchead'+key,()=>{const nu=56,nv=52,W=nu+1,N=W*(nv+1),pos=new Float32Array(N*3),col=new Float32Array(N*3),o=[0,0,0],gs=(a,s)=>Math.exp(-(a/s)*(a/s));
  const yv=pcSpline([0,.11,.6,.84,1],[1.099,.3,-1.05,-1.5,-1.86]);let k=0;
  for(let j=0;j<=nv;j++){const y=yv(j/nv),yd=y>=-.12?y:-.12+(y+.12)/p.L;
    for(let i=0;i<=nu;i++){const s=2*i/nu-1,ph=Math.PI*(.35*s+.65*s*s*s);S(y,ph,o);pos[k]=o[0];pos[k+1]=o[1];pos[k+2]=o[2];
      const x=Math.abs(o[0]),fw=Math.max(0,Math.cos(ph)),lip=gs(o[0],.2)*gs(yd+.8,.062)*fw,cr=gs(yd-pcMouthY(o[0],p),.012)*pcSm(p.mw+.02,p.mw-.04,x)*fw,ns=gs(x-.068*p.nx,.026)*gs(yd+.607,.018)*fw,bl=F?gs(x-.55,.2)*gs(yd+.45,.15)*fw:0,so=gs(x-p.ex,.2)*gs(yd+.1,.17)*fw;
      const L=F?[.0,.3,.26]:[.0,.15,.16];col[k]=1-cr*.35-so*.03-ns*.45;col[k+1]=1-lip*L[1]-cr*.48-bl*.07-so*(F?.08:.05)-ns*.55;col[k+2]=1-lip*L[2]-cr*.48-bl*.08-so*(F?.05:.05)-ns*.55;k+=3;}}
  const ix=new Uint16Array(nu*nv*6);let q=0;for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*W+i,b=a+1,c=a+W,d=c+1;ix[q++]=a;ix[q++]=b;ix[q++]=c;ix[q++]=b;ix[q++]=d;ix[q++]=c;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setIndex(new THREE.BufferAttribute(ix,1));return pcFix(g,'point');});}
/* ---- the hair ---- */
/* the hairline (head units y) at |ph| = 0 (front), .55, 1.15, 1.57 (over the ear), 2.1, pi (back); T: thickness; hang: the edge hangs free (a bob) instead of meeting the skin; quiff, flare: extra volume */
const PCHA=[0,.4,.8,1.15,1.57,2.1,Math.PI];
const PCHS={crop:{hl:[.53,.6,.42,.22,.14,-.22,-.6],T:.0036,sides:.5,top:1.2},buzz:{hl:[.64,.7,.46,.24,.16,-.2,-.58],T:.0014},messy:{hl:[.56,.58,.42,.2,.12,-.25,-.64],T:.0044,sides:.6,top:1.2,chop:.05},
  swept:{hl:[.7,.74,.48,.24,.14,-.22,-.6],T:.0036,quiff:.011,sides:.5,top:1.1},spiky:{hl:[.6,.64,.44,.21,.13,-.22,-.6],T:.004,sides:.5,top:1.15},
  ponytail:{hl:[.66,.64,.48,.25,.15,-.22,-.6],T:.0036,sides:.85},bun:{hl:[.66,.64,.48,.25,.15,-.22,-.6],T:.0036,sides:.85},braid:{hl:[.66,.64,.48,.25,.15,-.22,-.6],T:.0036,sides:.85},
  pixie:{hl:[.56,.54,.42,.18,.1,-.3,-.68],T:.0044,fr:.2,sides:.7,top:1.1},medium:{hl:[.44,.42,.3,-.4,-.95,-1,-1.05],T:.005,flare:.005,hang:1},long:{hl:[.46,.44,.32,-.6,-1.3,-1.38,-1.42],T:.005,flare:.004,hang:1}};
/* the iris: from the hair colour (blue for fair hair, browns and greens for darker, grey for grey) */
const PC_IRIS=[0x3f6f9a,0x4a7a8a,0x5b6a35,0x5a3b22,0x3d2a1c,0x5f6a2e,0x5a6a7a,0x6a7a8a];
/* The parts of one moving piece (the body, an upper arm, a forearm, a leg, the head, the skirts, the bow) that share a material are merged into one mesh, keeping their smooth normals: the character is drawn in a few
   dozen draw calls and moves as before (only the groups the animations turn are kept). The merged geometries belong to the model (userData.pcOwn): pcDispose frees them. */
function pcMerge(root){const nodes=[];root.traverse(o=>{if(!o.isMesh&&o.children.length)nodes.push(o);});const v=new THREE.Vector3(),nm=new THREE.Matrix3();
  for(const p of nodes){const by=new Map();for(const c of p.children)if(c.isMesh&&!c.isSkinnedMesh&&!c.children.length&&c.material&&!Array.isArray(c.material)){const k=c.material.uuid+(c.castShadow?'s':'');if(!by.has(k))by.set(k,[]);by.get(k).push(c);}
    for(const list of by.values()){if(list.length<2)continue;let nv=0,ni=0,hc=false,hf=false;for(const c of list){const gm=c.geometry;nv+=gm.attributes.position.count;ni+=gm.index?gm.index.count:gm.attributes.position.count;if(gm.attributes.color)hc=true;if(gm.attributes.flow)hf=true;}
      const P=new Float32Array(nv*3),N=new Float32Array(nv*3),I=new(nv>65535?Uint32Array:Uint16Array)(ni),CO=hc?new Float32Array(nv*3).fill(1):null,FL=hf?new Float32Array(nv*3):null,HS=hf?new Float32Array(nv):null;let vo=0,io=0;
      for(const c of list){c.updateMatrix();nm.getNormalMatrix(c.matrix);const gm=c.geometry;if(!gm.attributes.normal)gm.computeVertexNormals();const pa=gm.attributes.position.array,na=gm.attributes.normal.array,cnt=gm.attributes.position.count,flip=c.matrix.determinant()<0;
        const ca=gm.attributes.color,fa=gm.attributes.flow,ha=gm.attributes.hst;
        for(let i=0;i<cnt;i++){v.fromArray(pa,i*3).applyMatrix4(c.matrix);P[(vo+i)*3]=v.x;P[(vo+i)*3+1]=v.y;P[(vo+i)*3+2]=v.z;v.fromArray(na,i*3).applyMatrix3(nm).normalize();N[(vo+i)*3]=v.x;N[(vo+i)*3+1]=v.y;N[(vo+i)*3+2]=v.z;
          if(CO&&ca){CO[(vo+i)*3]=ca.array[i*3];CO[(vo+i)*3+1]=ca.array[i*3+1];CO[(vo+i)*3+2]=ca.array[i*3+2];}
          if(FL){if(fa){v.fromArray(fa.array,i*3).transformDirection(c.matrix);FL[(vo+i)*3]=v.x;FL[(vo+i)*3+1]=v.y;FL[(vo+i)*3+2]=v.z;}else FL[(vo+i)*3+1]=-1;HS[vo+i]=ha?ha.array[i]:0;}}
        const ix=gm.index?gm.index.array:null,n=ix?ix.length:cnt;for(let i=0;i<n;i+=3){const a=ix?ix[i]:i,b=ix?ix[i+1]:i+1,d=ix?ix[i+2]:i+2;I[io++]=a+vo;if(flip){I[io++]=d+vo;I[io++]=b+vo;}else{I[io++]=b+vo;I[io++]=d+vo;}}
        vo+=cnt;p.remove(c);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));if(CO)geo.setAttribute('color',new THREE.BufferAttribute(CO,3));
      if(FL){geo.setAttribute('flow',new THREE.BufferAttribute(FL,3));geo.setAttribute('hst',new THREE.BufferAttribute(HS,1));}geo.setIndex(new THREE.BufferAttribute(I,1));geo.computeBoundingSphere();
      const mm=new THREE.Mesh(geo,list[0].material);mm.castShadow=list[0].castShadow;mm.receiveShadow=list[0].receiveShadow;mm.userData.pcOwn=true;p.add(mm);}}}
function pcDispose(m){if(m)m.traverse(o=>{if(o.userData&&o.userData.pcOwn&&o.geometry)o.geometry.dispose();if(o.isSkinnedMesh&&o.skeleton&&o.skeleton.boneTexture){o.skeleton.boneTexture.dispose();o.skeleton.boneTexture=null;}});}

/* ---------------------------------------------------------------- the stage of the preview ---------------------------------------------------------------- */
/* A small renderer of its own (a second canvas) for the creator's preview and the thumbnails of its options (drawn into a render target and read back), and the thumbnail the hero sheet shows. Views frame a part of the figure. */
const PCV={full:{ty:.19,dist:1.12},torso:{ty:.21,dist:.72},head:{ty:.334,dist:.5},legs:{ty:.085,dist:.7},feet:{ty:.045,dist:.48},bust:{ty:.29,dist:.74}};
const PCS={r:null,sc:null,cam:null,pivot:null,tpivot:null,model:null,cv:null,rt:null,tc:null,w:0,h:0};
function pcStage(){if(PCS.r)return PCS;
  const cv=document.createElement('canvas'),r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});r.setClearColor(0x000000,0);r.setPixelRatio(1);
  const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight(0xf2f0ee,0xb28a6c,.66));const dl=new THREE.DirectionalLight(0xfff0dc,.55);dl.position.set(-1.4,2.2,2);sc.add(dl);const rim=new THREE.DirectionalLight(0x9fb4ff,.24);/* (a soft key light from above on the left and a warm light bounced from below, as the reference renders have) */rim.position.set(2,1.2,-2);sc.add(rim);
  const dais=new THREE.Mesh(new THREE.CylinderGeometry(.21,.24,.03,28),new THREE.MeshPhongMaterial({color:0x2c2c34,flatShading:true,shininess:6}));dais.position.y=-.015;sc.add(dais);
  const pivot=new THREE.Group(),tpivot=new THREE.Group();tpivot.visible=false;sc.add(pivot);sc.add(tpivot);Object.assign(PCS,{r,sc,cam:new THREE.PerspectiveCamera(26,1,.02,20),pivot,tpivot,cv,dais});return PCS;}
function pcStageSet(cfg){const S=pcStage();if(S.model){S.pivot.remove(S.model);pcDispose(S.model);}S.model=heroModel('pc',cfg);S.pivot.add(S.model);return S.model;}
const pcAim=(S,v,aspect)=>{const d=v.dist*(aspect<.55?1.1:1);S.cam.aspect=aspect;S.cam.position.set(0,v.ty+d*.16,d);S.cam.lookAt(0,v.ty,0);S.cam.updateProjectionMatrix();};
function pcStageDraw(w,h,yaw,view,dt){const S=pcStage();const R=S.model&&S.model.userData.rig;if(R&&R.ctl&&dt){S.pivot.rotation.y=yaw;try{R.ctl({preview:true},dt,0);}catch(e){}/* (a turntable: the feet turn with it, the hair feels it) */}w=Math.max(8,w|0);h=Math.max(8,h|0);if(S.w!==w||S.h!==h){S.r.setSize(w,h,false);S.w=w;S.h=h;}
  S.pivot.rotation.y=yaw;pcAim(S,view||PCV.full,w/h);S.r.setRenderTarget(null);S.r.render(S.sc,S.cam);}
/* a picture of a configuration, framed by a view, as a data URL (for the thumbnails of the options) */
function pcSnap(cfg,view,size,yaw){const S=pcStage();size=size||112;if(!S.rt)S.rt=new THREE.WebGLRenderTarget(size,size);else if(S.rt.width!==size)S.rt.setSize(size,size);
  const m=heroModel('pc',cfg);S.tpivot.add(m);S.tpivot.rotation.y=yaw==null?.45:yaw;S.tpivot.visible=true;S.pivot.visible=false;const dv=S.dais.visible;S.dais.visible=!!(view&&view.dais);
  pcAim(S,view||PCV.full,1);S.r.setRenderTarget(S.rt);S.r.setClearColor(0x000000,0);S.r.clear();S.r.render(S.sc,S.cam);const px=new Uint8Array(size*size*4);S.r.readRenderTargetPixels(S.rt,0,0,size,size,px);S.r.setRenderTarget(null);
  S.tpivot.remove(m);pcDispose(m);S.tpivot.visible=false;S.pivot.visible=true;S.dais.visible=dv;
  const cv=S.tc||(S.tc=document.createElement('canvas'));cv.width=size;cv.height=size;const cx=cv.getContext('2d'),id=cx.createImageData(size,size);for(let y=0;y<size;y++)id.data.set(px.subarray((size-1-y)*size*4,(size-y)*size*4),y*size*4);cx.putImageData(id,0,0);
  return cv.toDataURL('image/png');}
/* the thumbnail of the character that is in the game (hero sheet, damage report, scroll list) */
function pcThumb(){try{pcStageSet(PC);const S=pcStage();if(S.w!==160||S.h!==160){S.r.setSize(160,160,false);S.w=160;S.h=160;}S.pivot.rotation.y=.35;pcAim(S,{ty:.305,dist:.44},1);S.r.render(S.sc,S.cam);hthumbs.pc=S.cv.toDataURL();}catch(e){hthumbs.pc=hthumbs.pc||'';}}
/* put a character into the game: its numbers, its model, its name where the game shows a hero's name */
function pcApply(o){PC=pcClean(o);const h=HB.pc;h.n=PC.name;h.col=pcCol(PC);meta.pc=PC;pcThumb();}
/* a new adventure begins with a new character: level 1, no perks, no bought slots */
function pcBegin(o){pcApply(o);meta.owned.pc=true;meta.equipped='pc';meta.heroes.pc={lvl:1,xp:0,perks:{},pending:[]};saveMeta();}
