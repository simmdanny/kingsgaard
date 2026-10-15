/* VERBATIM from tools/mockups/river/surface-study.html, lines 624-624. Per ground vertex: aWd and aBf (the river parts of the ground). Note the .3 m limit on aWd: beyond the bank it is -9, never on low meadow.
   Port this code as it is (same functions, same constants, same noise). Only the plumbing around it may change. */
 for(let i=0;i<n;i++){const x=p.getX(i),z=p.getZ(i);let h=H(x,z);const d=pathDist(x,z);pd[i]=d;pm[i]=pathMask(x,z);h-=.09*pathMask(x,z);hh[i]=h;const bk=rivBank(x,z);wd[i]=bk.dd<bk.w+bk.run+.3?WL-h:-9;bf[i]=bk.face*(.25+.75*bk.steep);}
