/* VERBATIM from tools/mockups/river/surface-study.html, lines 254-260. Stone palettes and uniforms.
   Port this code as it is (same functions, same constants, same noise). Only the plumbing around it may change. */
const PAL={
  brown:{r:[[.30,.22,.16],[.48,.39,.29],[.66,.56,.43],[.82,.73,.58]],warm:[1.04,1.0,.94],cool:[.95,.96,1.02]},
  grey:{r:[[.14,.15,.18],[.27,.28,.30],[.42,.42,.42],[.60,.60,.57]],warm:[1.04,1.0,.94],cool:[.90,.96,1.07]}};
function palU(name,moss,strata){const p=PAL[name];return{uR0:{value:new THREE.Vector3(...p.r[0])},uR1:{value:new THREE.Vector3(...p.r[1])},uR2:{value:new THREE.Vector3(...p.r[2])},
  uR3:{value:new THREE.Vector3(...p.r[3])},uWarm:{value:new THREE.Vector3(...p.warm)},uCool:{value:new THREE.Vector3(...p.cool)},uMoss:{value:moss},uStrata:{value:strata}};}
function setPal(u,name){const p=PAL[name];u.uR0.value.set(...p.r[0]);u.uR1.value.set(...p.r[1]);u.uR2.value.set(...p.r[2]);u.uR3.value.set(...p.r[3]);u.uWarm.value.set(...p.warm);u.uCool.value.set(...p.cool);}
const ROCK_DECL='uniform vec3 uR0;uniform vec3 uR1;uniform vec3 uR2;uniform vec3 uR3;uniform vec3 uWarm;uniform vec3 uCool;uniform float uMoss;uniform float uStrata;';
