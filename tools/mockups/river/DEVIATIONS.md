# River look: deviations from the mockup

Every place where the game's code is not the mockup's code word for word, with the reason and the parity numbers before and after
(`python compare.py reference parity`: mean absolute difference 0-255 / share of pixels off by more than 24; pass = mean < 6 and < 4 %).

How the port is organised (not a deviation in behaviour): the mockup's code lives in two namespaces, `WRB` (`src/world/wrbank.js`, no three.js, also
loaded by the world workers) and `WRL` (`src/world/wrlook.js`), so its own names (`S`, `h2`, `fbq2`, `rivBank`, `GLSL_NOISE`, `patch`, ...) stay as they
are and never meet the game's. The parity lab (`parity.html`, built by `make-parity.py`) is the mockup with each ported block replaced by a call into
these modules; everything not yet ported stays the mockup's own code byte for byte.

## Step 1: river terrain, ground attributes, ground shader

| # | What | Why | Parity before -> after |
|---|---|---|---|
| D0 | `rivBank`'s body is `WRB.bankCore(x,z,h,rn,w,WL,sz)`; its first line (where `h`, `rn`, `w`, `WL` come from) is the caller's: `WRB.makeRivBank(env)` in the lab, `wrbApply` in `wgHydroApply` in the game | plumbing (R1: data from the game's streams) | `river-close-nowater` 0.00 / 0.00 % (exact) |
| D1 | The steepness noise along each side runs along `sz`: `z` in the lab (as the mockup), the distance along the stream's curve in the game | HANDOFF 3.3: the mockup's river runs along z | lab unchanged (uses z) |
| D2 | Game only: the half width is the hydrology's (`wgSeg` hw..hwQ) times the mockup's noise factor `1 + .62 (fbq2(s .035 + 11, 3.3) - .5) 2`, s = distance along the curve | HANDOFF 3.3 | game only |
| D3 | Game only: `WL` is the stream's own water level at the nearest point of its curve (the hydrology's level falls along a stream), not one flat level | the game's rivers fall | game only |
| D4 | Game only: of several streams near a point, the one whose `rivBank` gives the lowest ground wins (channels cut through other banks; confluences) | the mockup has one river | game only |
| D5 | Game only: where a stream's water falls faster than 2-5 cm a metre (rapids, falls) the old channel (`wgHydroApply`) stays, blended by `1 - S(.02,.05,slope)` | HANDOFF: waterfalls are out of scope | game only |
| D6 | Game only: rivBank's land `h` is the game's land after its lakes and with its valley (the soft minimum that keeps a river through a hill in a sloping valley); no river look inside a lake's basin, and by the world's water rivBank only carves (its levee would stand in the sea) | the mockup's land has no lakes, valleys or sea | game only |
| D7 | Game only: the ground's `vOcc` in the river block is 0 until the rocks in the water exist (step 3) | not ported yet | game only |
| D8 | Game only: near the camera (150 m) the ground along a stream is drawn again at 0.5 m (`wrdetail.js`) - the mockup's ground is 0.57 m, the game's lattice 2 m; same function, same material; the lattice lowered under it; its hollows/crests and rock floor measured over 2 m as the lattice's | plumbing: meshes, LOD (R1) | game only |

## Parity log

Rendered with `python render-all.py --page parity.html --out parity` (render-reference.py unchanged, run through a shim that lifts only Playwright's
timeouts), compared with `python compare.py reference parity`.

Step 1 (rivBank, riverAttrs, GLSL_NOISE, patch, the ground's river GLSL from the game's modules):
```
shot                       mean   over24  result
river-wide                 0.00    0.00%  ok
river-mid                  0.00    0.00%  ok
river-close                0.00    0.00%  ok
flow-t3.0                  0.00    0.00%  ok
flow-t4.2                  0.00    0.00%  ok
flow-t5.4                  0.00    0.00%  ok
stone-row                  0.00    0.00%  ok
river-mid-nowater          0.00    0.00%  ok
river-close-nowater        0.00    0.00%  ok
river-wide-grey            0.00    0.00%  ok
PASS
```
