(async function(){
/* world-sig.js on seeds 1..24, one seed at a time (the page stays responsive: poll window.__wsOut), each seed's signature hashed (FNV-1a of JSON.stringify of its entry) and compared with the hashes of the
   baseline ws2_v6 (the v13-verified release, kept in localStorage of localhost:8773 and unchanged since: v14 and v15 were checked against it). window.__wsSrc must hold the text of world-sig.js. */
const BASE={"1":"95b9a4ce","2":"27710d30","3":"4182e280","4":"7bd195a4","5":"79eb3aac","6":"2e777b21","7":"7de832fc","8":"863213d","9":"4ef0a23b","10":"e85572ea","11":"6164eb6a","12":"627e6d68","13":"4b611e8e","14":"99a45678","15":"e3f80de0","16":"9daff71e","17":"f2cf47be","18":"f7b6960a","19":"2d4f2e5d","20":"79211ad9","21":"574df1a6","22":"c77dfcdc","23":"5c4d83b9","24":"10b1f1be"};
const fnv=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16);};
const res={same:0,diff:[],done:0};window.__wsOut=res;
for(let s=1;s<=24;s++){window.__ws={seeds:[s]};const o=JSON.parse(eval(window.__wsSrc));const h=fnv(JSON.stringify(o[s]));if(h===BASE[s])res.same++;else res.diff.push(s+':'+h);res.done=s;await new Promise(r=>{const c=new MessageChannel();c.port1.onmessage=()=>r();c.port2.postMessage(0);});}
res.finished=true;return res;})()
