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
| D6 | Game only: rivBank's land `h` is the game's land after its lakes and with its valley (the soft minimum that keeps a river through a hill in a sloping valley - never under the plain minimum of the two: its dip of up to a metre put the land just beyond a bank under the water, which showed the ribbon over grass; added in step 5); no river look inside a lake's basin, and by the world's water rivBank only carves (its levee would stand in the sea) | the mockup's land has no lakes, valleys or sea, and never stands under its water | game only |
| D7 | Game only: the ground's `vOcc` in the river block was 0 until the rocks in the water existed (step 3; now D17) | not ported yet | game only |
| D8 | Game only: near the camera (150 m) the ground along a stream is drawn again at 0.5 m (`wrdetail.js`) - the mockup's ground is 0.57 m, the game's lattice 2 m; same function, same material; the lattice lowered under it; its hollows/crests and rock floor measured over 2 m as the lattice's | plumbing: meshes, LOD (R1) | game only |

## Step 2: the stone generator, the stone material, every field boulder from makeStone

| # | What | Why | Parity before -> after |
|---|---|---|---|
| D9 | `makeStone(seed, o)` takes the icosphere's level from `o.det` (5 when not given): the game draws each field boulder with the same projection on a level 5 (within 32 m), 4 (within 110 m) or 3 icosphere (beyond) | HANDOFF 3.1: "make a far LOD by running the same projection on a level-3 icosphere" | `stone-row` 0.00 / 0.00 % (exact: the lab passes no `det`) |
| D10 | Game only: the field boulders' material is `WRL.boulderMat` with the mockup's `boulderU` settings (`palU(pal, .7, 0)`, `uMossP .4`, `uMossTop 0`, `uUpK .30`, `uUW 0`), but two materials (brown, grey) instead of one switched with `setPal`, the sun direction the game's (`WCM.sun`), and the three.js point lights left out of its program (`wcmLights`, as world look's cliff material: with them the stone shader ran out of registers) | the game draws both palettes in one frame; the game's lights (section 6 adapts the light itself) | game only |
| D11 | Game only: a boulder's palette is grey where the region's weight for grey (world look's `RW[1]*2 + (1-RW[2]-RW[1])*.35`) is over .5, brown otherwise; the instance data is the mockup's `instanceColor` exactly, `(r(), (groundY + 20) / 60, r())` from the boulder's own seed | the mockup's scene has one palette at a time | game only |
| - | Not a deviation: placement, density, sinking, companions, keep-offs and contact rings are world look's (`wbldPlace`), as HANDOFF 3.1 asks; the shapes are 14, seeds `1000 + 37 i` (were 12 of `wbldMake`) | | |

In game: the fourteen level-5 shapes take ~305 ms once (first boulders), the lower levels a few ms each when first drawn.

## Step 3: bank stones, rocks in the water, pebbles

| # | What | Why | Parity before -> after |
|---|---|---|---|
| D12 | The bank code (`08-river-banks.js`) and `placeBoulder` are in WRL as functions whose inputs are passed in: `bankUniforms(SUN)`, `bankShapes(det)` (the three kinds' options as the mockup's, plus the icosphere level for the LOD, D9), `bankKit({BSH,BKIND,BKI,H})` (seedWith, putStone, fract7, fract11), `riverStones(E)` (the clusters, the rocks in the water, the pebble clusters), `makePlaceBoulder(E)`, and the ground's contact shade `occAt(x,z,solids)` (line 627); `PAL.bank` lives in WRL's `PAL` | plumbing (R1) | all 10 shots 0.00 / 0.00 % (exact) |
| D13 | Plumbing inside `riverStones` (the lab passes the mockup's values, so the lab is unchanged): `rivHalf(z, v)` and `WL = WLat(v)` take where along the river (the game's half width and water level vary along a stream); the rocks in the water come in as `ROCKS` (the mockup's literal list in the lab) and the number of pebble clusters as `NPEB` (26); the pebbles' seeds are offset by `sd` (0 in the lab) | the game's streams; seeds differ per stream piece | lab exact |
| D14 | Game only: per stream piece (`wgSeg` of a hydrology point) the mockup's `RIV` is the piece's curve resampled at 1 m; `rivHalf` = `wrbHalf` (D2) where along; `rivBank` = this stream's `bankCore` (no land: the placing reads only `dd`, `w`, `steep`); the seeded stream `mkRng(hash(world seed, piece))` instead of `mkRng(777)`; the clusters start again at each piece; the rocks in the water: one rocky reach of 5-8 rocks (4-5.4 m apart, from side to side, 0.15-0.5 of the half width out, size 0.7-1.3, none where the half width is under 1.5 m) per ~115 m of river, as the mockup's one reach in its 115 m river; `NPEB` = 26 per 115 m | the mockup has one hand-made river and seven hand-placed rocks | game only |
| D15 | Game only: a stone (bank stone, rock, pebble) is kept only where the game's ground there is this stream's bank: the ground's river value `rvW` (D3-D6) equals this stream's water level within 5 cm - so none in a lake, where the water falls (D5), or in another stream's channel; `H` is exact (`wgHeightAt`'s numbers incl. settlements), measured by a world worker: the placing runs once to learn its points (no height changes a position or the seeded stream), then again with the numbers | the game's hydrology (lakes, falls, confluences); the main thread cannot afford ~1000 exact heights a piece | game only |
| D16 | Game only: the bank stones' material takes the water level per stone (an instanced attribute `aWli`, the stream's level at the stone) in place of the uniform `uWL`; sun and point lights as D10; bank stones and pebbles drawn with levels 5 / 4 / 3 by distance (32 / 110 m, D9), bank stones within 300 m, pebbles within 150 m; pebbles in the region's palette (D11); the bigger bank stones and the rocks block the hero (the game's props) | the game's water falls along a stream; LOD | game only |
| D17 | Game only: the ground's contact shade (`aOcc` from the solids: each rock in the water at .85 of its reach, each pebble at .95, `occAt` verbatim) is on the river ground in detail (D8, within 150 m) as `aRv`'s third value; 0 on the 2 m lattice; the mockup's cliff-foot shade is the mockup's cliff only; field boulders keep world look's contact rings. Resolves D7 | plumbing (meshes, LOD) | game only |

## Step 4: grass at the river, reeds, ivy

| # | What | Why | Parity before -> after |
|---|---|---|---|
| D18 | The grass and ivy code (`10-grass-tufts.js`, `09-ivy.js`) are functions whose inputs are passed in: `grassMaterial(SUN)`, `tuftGeometry()`, `tuftKit()` (one tuft's matrix and colour; the caller puts it on the instance), `ivyMaterial(SUN)`, `ivySpots(E)` (the ray cast passed in: three.js's own `Raycaster` in the lab and the game alike), `ivyKit()` in WRL; `bankTufts(E)`, `lipReeds(E)` and the meadow's rule `meadowSkip(bk,WL)` in WRB (no three.js in them: the game's world workers run the first two, the game's grass reads the third). Inside: the water level per stone (`WLof(st)`) in the "behind the stone" test and the ivy; `rivHalf(z, where)` and `WLat(i)` in `lipReeds`; the number of reed clusters `NREED` (34 in the lab) | plumbing (R1) | all 10 shots 0.00 / 0.00 % (exact) |
| D19 | Game only: per stream piece the grass's random stream (the mockup's `rnd`, line 67) and `lipReeds`' stream (`mkRng(515)` in the lab) are seeded per piece (the mockup's `rnd` also feeds its meadow, which the game does not port); `NREED` = 34 per 115 m; `H` exact (the worker places the grass with `wgHeightAt`'s numbers at hand; `rivBank().y` there is the ground, as the mockup's `H` is `rivBank().y`); a tuft or reed stays only along the metres of the piece whose middle is this stream's water (not a lake, a fall, another stream's channel). The worker's grass equals the same job on the main thread (tests/rs-check.js: 4 pieces, 10932 spots, number for number) | the game's streams; frame time (the lip grass alone is ~8000 bank evaluations a piece) | game only |
| D20 | Game only: the meadow's grass is the game's (`grass.js`, world look 5) - the mockup's meadow tufts are not ported (HANDOFF: do not redo world look); at the river its plants follow the mockup's rule (`WRB.meadowSkip` on the nearest gentle stream's `bankCore`, `y` the ground) on top of the game's own (none under water, none steeper than .5). The mockup's tufts round the boulders (line 669) are world look 5's; the river's pebbles are under its .3 size anyway | HANDOFF 3.7: the game's grass, the mockup's placement rules | game only |
| D21 | Game only: the river's tufts, lip grass, reeds and ivy are drawn with the mockup's own `grassMat` and `ivyMat` (HANDOFF 3.7: the tuft shape and colour the mockup's - 11 pointed blades per crossed card, its colour ramp, `vSh`), the sun the game's, and `vec3 wdV=mvPosition.xyz;` before `#include <fog_vertex>` (the game's air, wdepth.js, reads the view position its `project_vertex` sets, which these shaders do not include); tufts within 100 m, ivy within 60 m; the tufts' matrices a few hundred a frame and the ivy a few stones a frame (their random streams carried on: the same tufts and leaves as all at once - same counts checked) | plumbing (materials, LOD, frame time) | game only |

## Step 5: the water

| # | What | Why | Parity before -> after |
|---|---|---|---|
| D22 | The water code (`11-water.js`) is functions whose inputs are passed in: `makeNTEX()`, `waterUniforms(SUN, NTEX, depthTexture)`, `waterMaterial(WU)`, `waterRibbon(E)` (its points, its columns `C` - 25 in the lab -, whether it runs on 3 m past its end `ext`, `rivHalf(z, i)` and `WLat(i)` where along), `makeFloat(E)` (how many `NF` and how many of them leaves `NL` - 34 and 12 in the lab), `fleckMaterial()`, `updFloat(t, E)` (`rivHalf(z, u)`, `WLat(u)`); the lab's depth pre-pass and `renderFrame` are the lab's own | plumbing (R1) | all 10 shots 0.00 / 0.00 % (exact) |
| D23 | Game only: the ribbons (wriver.js) along each stream piece where its water is nearly level (`wrbGentle` > .5); where it falls the old ribbon and water stay (waterfalls are out of scope, D5), lakes and the world's water keep theirs. Sections at every metre, the run's ends exact; at a joint between pieces the section is the same from both sides (its direction from the curve's points a section away in the neighbouring pieces: the main stream upstream, the next piece downstream) so the pieces meet without a seam; the water level per section the stream's own (it falls along a stream); beyond 420 m a cell's ribbons have 5 columns and a section every 4 m (the surface is flat across: the same water) | the game's streams; vertex count far off | game only |
| D24 | Game only: the depth pre-pass draws only what can lie under or behind a river's water - the ground's chunks, the river ground in detail, the bank stones, pebbles and boulders (on layer 9) - each with a depth material that moves its vertices as its own material does (the ground's push at the cliffs, its lattice lowered under the detail); no shadows in it; only when a ribbon is in the camera's view (step 7: the open meadow then costs what it did); `uRes` the drawing buffer. The water's vertices go through the game's far-sight depth (wdepth.js) as the depth texture's do; the water's own fog (`uFog`, `uFogC`) is set to the game's air (from `WD.S` of its end to the end, its colour) | frame time; the game's depth and air | game only |
| D25 | Game only: `uRk` per ribbon mesh (a 256 m cell): the 8 rocks in the water nearest the camera; drifting leaves and flecks per stream piece within 90 m, 34 per 115 m (12 of them leaves), seeded per piece, drawn only where the piece's middle is this stream's water | HANDOFF 3.8 (8 nearest per water tile, deterministic, only near the player) | game only |

## Step 6: the game's light (HANDOFF section 6)

The parity shots rendered under the game's daytime light (`parity-gamelight.html`, made by `make-parity.py`: the game's sun 0xfff0d8 x 0.8, its sky light 0xe8f2ff / 0x4a5530 x 0.58, no ambient, no fog - the game's air is clear at these distances), measured per material by the masks of `parity-ids.html` (every material a flat colour) with `gamelight.py` (each material's mean colour in the reference and the game-light render over its pixels, edges left out; the factor that brings it back is reference / game light by luminance). Then the smallest change: one multiplier per material (`src/world/wrlight.js`, the same code in the lab and the game).

| # | What | Why | Numbers before -> after |
|---|---|---|---|
| D26 | Game light: the stone material's final colour times 1.285 (field boulders, bank stones, rocks in the water, pebbles); the ground's river part times 1.210 on its own colours only - its code is affine in the colour it starts from (three mixes by weights of their own), so the colour is divided by 1.21 going in and multiplied coming out: the river's colours times 1.21, the meadow's share as it was, no seam where the river's part ends; the water, grass, ivy and flecks 1 (they read no scene light; the water's 1.041 was the bed seen through it, which the river ground's factor brings back) | the game's light is dimmer and cooler than the mockup's (HANDOFF section 0.3) | by material (reference / game light): stones 1.283 -> 1.008, river ground 1.210 -> 1.027, water 1.041 -> 1.004, grass / ivy / flecks 1.000 -> 1.000; the whole shots below |
| D27 | Game only: the materials with a light of their own (water, grass, ivy, flecks) are multiplied by the game's light level `WRX.L` = (sky light x its luminance + 0.75 x sun x its luminance) / the game's noon value (0xe8f2ff x 0.58, 0xfff4e4 x 0.8), clamped to 0.04-1.25: 1 at noon, about 0.62 at the game's night | HANDOFF 6.4: no glowing water at night | checked in the game at noon, dusk (day time 1185) and night (1500): the water darkens with the scene, the stones are moonlit grey, not black |
| - | Not changed: the meadow (world look's) darkens by the same 1.208 under the game's light, the mockup's own cliff by 1.263; neither is the river look's (HANDOFF: leave world look as it is), so the shots with much meadow (river-wide, stone-row) stay apart from the reference under the game's light. An open point for the designer. | | other ground 1.208 -> 1.208 |

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

Step 2 (+ PAL, palU, setPal, ROCK_DECL, weld, makeStone, boulderMat from the game's modules):
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

Step 3 (+ placeBoulder, the bank palette/uniforms/shapes, putStone, the placing of bank stones, rocks and pebbles, occAt from the game's modules):
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

Step 4 (+ the ivy's material/leaves/matrices, the grass material and cards, the meadow's rule, the tufts behind the stones, the lip grass and reeds, the tufts' matrices from the game's modules; bankTufts and lipReeds from WRB):
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

Step 5 (+ the ripple/foam texture, the water's uniforms and shader, the ribbon, the drifting bits from the game's modules):
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

Step 6, under the game's light - `python compare.py reference parity-gamelight-k1` (every factor 1):
```
shot                       mean   over24  result
river-wide                 9.92   40.91%  DIFFERENT
river-mid                  8.65   20.85%  DIFFERENT
river-close                9.58   26.01%  DIFFERENT
flow-t3.0                  8.51   23.38%  DIFFERENT
flow-t4.2                  8.51   23.41%  DIFFERENT
flow-t5.4                  8.46   23.35%  DIFFERENT
stone-row                 16.59   64.99%  DIFFERENT
river-mid-nowater         17.08   46.25%  DIFFERENT
river-close-nowater       15.16   44.34%  DIFFERENT
river-wide-grey            9.50   38.45%  DIFFERENT
FAIL: 10 shot(s) differ
```
`python compare.py reference parity-gamelight` (the factors of D26):
```
shot                       mean   over24  result
river-wide                 7.65   31.98%  DIFFERENT
river-mid                  3.18    8.00%  DIFFERENT
river-close                3.94   10.68%  DIFFERENT
flow-t3.0                  2.36    3.01%  ok
flow-t4.2                  2.36    3.01%  ok
flow-t5.4                  2.35    3.01%  ok
stone-row                 10.73   41.08%  DIFFERENT
river-mid-nowater          3.69    8.03%  DIFFERENT
river-close-nowater        4.54   10.82%  DIFFERENT
river-wide-grey            7.58   31.98%  DIFFERENT
FAIL: 7 shot(s) differ
```
`python gamelight.py reference parity-gamelight-k1 parity-ids` (all shots):
```
all shots, pixel-weighted (exposure factor = reference / game light):
  material             pixels          reference RGB         game light RGB  factor
  river ground        4913420   (130.4, 133.7, 79.6)   (108.8, 110.2, 65.2)   1.210
  other ground        5177173   (127.5, 192.8, 43.3)   (106.6, 159.4, 34.1)   1.208
  stones              7630682   (152.7, 128.5, 88.0)   (119.1, 100.2, 67.4)   1.283
  cliff (mockup)       471791  (213.4, 178.0, 129.8)  (168.1, 141.3, 101.9)   1.263
  water               9884991   (70.5, 159.7, 160.0)   (65.0, 154.0, 155.8)   1.041
  grass               4346636    (99.1, 139.0, 34.4)    (99.1, 139.0, 34.4)   1.000
  ivy                   64741     (56.9, 94.2, 22.7)     (56.9, 94.2, 22.7)   1.000
  flecks                  528  (217.8, 239.9, 239.4)  (217.0, 239.6, 239.4)   1.002
```
`python gamelight.py reference parity-gamelight parity-ids`:
```
all shots, pixel-weighted (exposure factor = reference / game light):
  material             pixels          reference RGB         game light RGB  factor
  river ground        4913420   (130.4, 133.7, 79.6)   (129.1, 129.5, 78.1)   1.027
  other ground        5177173   (127.5, 192.8, 43.3)   (106.6, 159.4, 34.1)   1.208
  stones              7630682   (152.7, 128.5, 88.0)   (148.9, 128.3, 86.2)   1.008
  cliff (mockup)       471791  (213.4, 178.0, 129.8)  (168.1, 141.3, 101.9)   1.263
  water               9884991   (70.5, 159.7, 160.0)   (70.1, 159.1, 159.3)   1.004
  grass               4346636    (99.1, 139.0, 34.4)    (99.1, 139.0, 34.4)   1.000
  ivy                   64741     (56.9, 94.2, 22.7)     (56.9, 94.2, 22.7)   1.000
  flecks                  528  (217.8, 239.9, 239.4)  (217.8, 239.8, 239.4)   1.000
```
