# Kingsgaard: the river system (handoff for Claude Code)

**Branch:** `river-look`, built on `world-look` (bd71a7d). Leave the world-look features as they are. Change them only where this document says, because the river touches them.

**The spec is the mockup.** Open `tools/mockups/river/surface-study.html` and use the **Stream** and **Shore** views. The page loads three r128 from cdnjs. The target pixels are in `reference/*.png`.

## 0. Read first: why the last port did not look 1:1, and the rules this time

Several features in the world-look port came out looking different from the mockup. I compared the code, and the main causes were:

1. **The noise was swapped.** The mockup's shaders build their patterns from procedural GLSL noise (`h31`, `vn`, `fbm`, `vn2`, `fbm2`, `cell2`, `vedge` in `GLSL_NOISE`) at fixed scales. The port read the game's noise texture (`tWN`) at other scales and from other channels instead. The numbers that follow (thresholds, smoothsteps, mixes) were tuned on the mockup's noise, so with different noise underneath the same constants give a different picture.
2. **Patterns were baked in a simplified form.** For example, the meadow strokes were pre-baked with only 2 lean angles, while the mockup turns them continuously.
3. **The lighting is different.** The colours were tuned under the mockup's light: sun `0xfff0d6` × 0.95, hemisphere `0xd8ecff`/`0x8a7a58` × 0.62, plus ambient 0.10. The game's daytime light is sun × 0.8 and hemisphere × 0.58, with no ambient. The same material renders darker and cooler under it.
4. **Nobody compared pixels.** Nothing checked the result against the mockup at the same camera.

**Rules for this port:**

- **R1. Port, don't rewrite.** The code for every feature is extracted word for word into `src/` (each file says which mockup lines it came from). Copy the functions, constants and GLSL as they are, including `GLSL_NOISE`. Change only the plumbing: where data comes from (the game's river curves instead of `RIV`), how meshes are chunked, and LOD.
- **R2. No substitutions without proof.** Don't replace a noise call with a texture read, bake a pattern, or "simplify" a formula unless `compare.py` still passes afterwards. If an optimisation is needed, bake **the same function at the same scale**, then prove it with the compare.
- **R3. Parity first, under the mockup's light.** Build the parity lab (section 2) and make every shot pass under the mockup's lighting **before** looking at anything in the game.
- **R4. Then the game's light, measured.** Only after R3 passes, adapt to the game's lighting (section 6). Do it with as few documented changes as possible, never by retuning by eye.
- **R5. Report every deviation.** If something cannot be ported as it is, write down what changed, why, and the compare numbers before and after, in `tools/mockups/river/DEVIATIONS.md`, and mention it in the PR.

## 1. What's in this folder

| File | What it is |
|---|---|
| `surface-study.html` | The full mockup (v19). The spec. |
| `src/01-glsl-noise-and-patch.js` | The GLSL noise every river shader uses, and the `onBeforeCompile` helper (`patch`). |
| `src/02-river-terrain.js` | `RIV`, `rivNear`, `rivHalf`, `WL`, **`rivBank`** (the bank shape), `H`, `rivMask`. |
| `src/03-ground-shader-river.glsl.js` | The river part of the ground fragment shader: bed, wet waterline, **earth bank face** (layers, bumps, pebbles, roots), mud patches. |
| `src/04-ground-river-attributes.js` | The per-vertex `aWd` / `aBf` values on the ground. |
| `src/05-rock-palette.js` | `PAL`, `palU`, `ROCK_DECL`. |
| `src/06-stone-material.js` + `06b` | **The stone material** for every rock: boulders, bank stones, water rocks, pebbles. |
| `src/07-stone-generator.js` | **`makeStone`** (box → 3–6 plane cuts → exact bevel) and `placeBoulder`. |
| `src/08-river-banks.js` | Bank stones, rocks in the water, pebble clusters. |
| `src/09-ivy.js` | 3D ivy leaf strands. |
| `src/10-grass-tufts.js` | Tuft material and the river-related tuft placement (lip grass, reeds, grass leaning over stones, keep-outs). |
| `src/11-water.js` | Water: ripple texture `NTEX`, the depth pre-pass, the water shader (colour, flow, foam, rock foam, fresnel, glints), ribbon attributes, drifting leaves and flecks. |
| `shots.json` | Cameras, time, lights and renderer settings of every reference shot. |
| `render-reference.py` | Re-renders `reference/` from the mockup (Playwright + a local three r128). |
| `reference/*.png` | The target: 10 shots at 2880×1620 (device pixel ratio 2, antialias on, time frozen). `*-nowater` shots show the bed, bank faces and rooted stones without the water. `river-wide-grey` is the grey palette. |
| `compare.py` | The 1:1 check (see section 2). |

## 2. The parity lab (build this first)

Make `tools/mockups/river/parity.html`: a page that builds the **mockup's scene with the game's ported code**.

- Use the mockup's terrain `Hland`, its river `RIV`, and the same seeds.
- Use the mockup's lights, fog, background, camera FOV (55) and renderer settings, all listed in `shots.json`.
- Use **the game's modules** for everything this document ports: the stone generator and material, the bank placement, the ground river shader, the water, the tufts and the ivy.
- Render the same shots at the same cameras and times into `parity/`. The easiest route is to give the page the same `window.SS` hooks as the mockup, so `render-reference.py --page parity.html --out parity` works unchanged.
- Run `python compare.py reference parity`. It prints mean difference and outlier share per shot, and writes side-by-side images (reference | game | difference × 4) into `compare/`.
- **Pass means mean < 6 and fewer than 4% of pixels off by more than 24, on every shot.**

### When a shot does not match

Open its side-by-side image and look at where the difference is.

| Where it differs | Likely cause |
|---|---|
| The whole image is brighter or darker | Light or fog differs from `shots.json`, or a colour-space or tone-mapping difference. |
| Only the stones | Material uniforms per use: `uUpK`, `uMossP`, `uMossTop`, `uUW`, `uWL`, the tint channels. |
| Only the ground at the river | `aWd`/`aBf` values, or the `.3 m` limit on `aWd`. |
| The water | `uRes` must be the drawing-buffer size; the depth pre-pass must exclude water, tufts and floaters. |
| Pattern shapes | Noise substituted (rule R1). |

## 3. The features, one by one

For each feature: the mockup source, where it goes in the game, what may change for the game, what must not change, and the shots that prove it.

### 3.1 The stone generator: every rock (replaces `wbldMake`)

- **Source:** `src/07-stone-generator.js`, `makeStone(seed, o)`.
  - Start from a box with half-sizes `sx, sy, sz` taken from the options.
  - Make 3–6 plane cuts through corners and edges, each at 0.52–0.82 of the support distance.
  - **Exact bevel:** every vertex of a level-5 icosphere at radius 3×size is projected onto the cut box *shrunk by the bevel* (Dykstra, 40 iterations), then pushed out by the bevel along the projection direction. The bevel is 0.075 × 2 × min half-size, which is 5–10% of the stone.
  - Normals are that direction, so they are exact. Faces stay perfectly flat.
- **Game:** replace the shape code in `wboulder.js` (`wbldMake`) with `makeStone`. Keep the game's placement, density, LOD and keep-offs.
  - Field boulders: `makeStone(seed)` with defaults (14 shapes).
  - Bank stones: three kinds, with exactly the options in `08-river-banks.js`:
    - slabs: `x0 1.0, xr .6, y0 .28, yr .18, z0 .75, zr .4`;
    - blocks: `x0 .7, xr .5, y0 .5, yr .4, z0 .6, zr .4`;
    - small stones: `x0 .55, xr .4, y0 .4, yr .35, z0 .5, zr .35`.
  - Build all shapes once, at load or in the worker, never per tile. The level-5 icosphere is 10k vertices: make a far LOD by running the same projection on a level-3 icosphere, so the shape is identical with fewer vertices.
- **Must not change:**
  - The bevel method. No subdivision smoothing, no spherify, no noise on the faces.
  - The cut distances.
  - The seeds: `1000 + i*37` for field boulders, `3000/3200/3400 + i*41/43/47` for bank stones.
- **Proof:** the `stone-row` shot.

### 3.2 The stone material (`06-stone-material.js`)

The same shader for every rock, configured per use by uniforms:

| Use | Palette | `uMossP` | `uMossTop` | `uUpK` | `uUW` | Notes |
|---|---|---|---|---|---|---|
| Field boulders | the region's (`brown` / `grey`) | 0.4 | 0 | 0.30 | 0 | |
| Bank and water stones | `PAL.bank` | 0.45 | 0.3 | 0.16 | 1 | `uWL` = the water level |

Details that matter, and are easy to lose:

- **Instance data.** The mockup passes `(brightness, (groundY + 20) / 60, seed)` in `instanceColor` and resets `diffuseColor` after `color_fragment`. The game already uses an instanced attribute (`iData`), which is fine, but the **decoding must give the same numbers**.
- **Brightness of flat slabs.** For bank stones of kind 0 (flat slabs), brightness = `0.15 × r()`. That is what stops slabs looking pale.
- **Base band.** The dark band at the base of each stone scales with the stone's size: `bnd = clamp(vSc × 0.45, 0.04, 1)`, with `vSc` taken from the instance matrix. That is why pebbles keep their colour.
- **Underwater fade** (`uUW`): below `uWL` the stone fades to `(0.16, 0.55, 0.55)` → `(0.05, 0.36, 0.42)` with depth. Not for field boulders.
- **Groundy for bank stones.** For bank and water stones, `groundY` is the **riverbed height at the stone** (`H(x, z)`), not the water level.

### 3.3 The river channel and banks in the terrain (`02-river-terrain.js`, `rivBank`)

- **Mockup vs game.** In the mockup, `RIV` is one hand-made curve and `WL` one flat level. In the game, use each stream's own curve, half-width and water level from the hydrology. `wriver.js` already has them per stream point.
- **Port `rivBank` as it is.** It returns `{y, face, steep, dd, w, run}`:
  - **Shoreline wobble:** `e = .95·(fbq2(x·.18 + 3, z·.18) − .5)·2 + .30·(vq2(x·.7, z·.7 + 5) − .5)·2`, applied as `dd = distance − e`.
  - **Steepness along each side:** `steep = S(.42, .58, fbq2(z·.12 + side·13, 5.1 + side))`. **In the game use the distance along the curve instead of `z`**, because the mockup's river runs along z. Write this down in `DEVIATIONS.md`.
  - **Bank run and levee height:** `run = .75 + 2.3·(1 − steep)`, `lev = .16 + .62·steep ± .08`.
  - **Bed:** `WL − .18 − 1.15·(1 − q²)·…`.
  - **Bank profile:** a gentle S, or a cut bank (`t^.5`) on the steep sides.
- **Width.** The mockup varies it 0.6–1.4× along the river (`rivHalf`). Keep the game's own width from the hydrology and add the same noise factor `1 + 0.62·(fbq2(s·.035 + 11, 3.3) − .5)·2`, with `s` = distance along the curve.
- **Meander.** The game's curves already bend, so don't add extra meander unless they look straighter than the mockup.
- **Where it applies.** In the chunks that carve stream channels (the ground already leaves stream cells to `wriver.js`), the ground height near a stream must come from `rivBank`. The water ribbon must cover the widest wobble: `w + 2.6`.
- **Ground attributes** (`04-ground-river-attributes.js`):
  - `aWd = WL − h` where `dd < w + run + 0.3`, otherwise **−9**.
  - `aBf = face × (0.25 + 0.75 × steep)`.
  - That `.3 m` limit fixed a real bug: without it, the riverbed colour bled onto low meadow.
- **Proof:** `river-*-nowater` (bed, bank faces, rooted stones) and `river-wide`.

### 3.4 The ground shader at the river (`03-ground-shader-river.glsl.js`)

Insert this after the meadow and path colour (`col`), inside the "new look" branch. It needs `P`, `X`, `fd`, `slope`, `vWd`, `vBf`, `vOcc`, `vCav` exactly as in the mockup's ground shader. The game's `WT_GLSL_COLOR` has equivalents; check each one means the same thing:

| Variable | Meaning |
|---|---|
| `fd` | `1 − smoothstep(28, 80, distance)` |
| `slope` | `1 − N.y` |

The earth uses 3D noise of the world position (`fbm(P·…)`, `vn(P·…)`, `cell2`), which is why the steep face doesn't stretch. Keep it 3D, not a texture.

### 3.5 Bank stones, water rocks, pebbles (`08-river-banks.js`)

Port the placement logic per stream, per tile, deterministic from the world seed and the stream id:

- **Clusters along each bank.** Each cluster has 2–6 stones of three kinds:
  - 22% flat slab (size 2.2–3.2);
  - 46% block (1.0–1.7);
  - 32% small (0.45–0.85).
  
  The gap to the next cluster is 1.5–5 m.
- **Snapped to the real shore.** Each stone's distance from the curve is iterated 4 times on `rivBank` so it sits on the wobbly shore at `w + rel`.
- **Height and tilt.** Top above water: slab 0.18–0.40, block 0.40–0.90, small 0.12–0.42. Yaw follows the bank ±0.3. 45% of non-slabs sit flat; the rest tilt up to ±0.3 rad.
- **Rooted in the bed.** `putStone` stretches each stone's Y so its bottom reaches 28% of its height **below the bed**, capped at 3.5×. Never a stone ending at the water line.
- **Water rocks.** Mossy rocks in the water, at about 0.15–0.5 of the half-width from the middle. Each gets a darker contact patch on the bed (`solids` → `aOcc`) and 5 pebbles around its base. Upload up to 8 nearest per water tile as `uRk[8] = (x, z, radius, 0)` for the water shader.
- **Pebble clusters** at the waterline: 3–8 stones of size 0.07–0.19, **only where `steep < .35`**, never next to a bank stone.
- **Proof:** `river-close`, `river-close-nowater`, `river-mid`.

### 3.6 Ivy (`09-ivy.js`)

- 3D leaf cards (pointed leaf drawn in the shader, no texture) in 2–4 strands of 0.35–0.95 m.
- On about 35% of block-kind bank stones whose top is more than 0.55 m above water, on the side facing the water.
- **Each leaf is placed by ray-casting onto the actual stone** (`Raycaster` against the stone's geometry and matrix), then pushed 2.5 cm off the surface. Do this at generation time (worker or tile build), not per frame.
- **Proof:** `river-mid`.

### 3.7 Grass at the river (`10-grass-tufts.js`)

The game has `grass.js` from world-look 5. Use its tuft drawing, but make sure the tuft shape and colour match the mockup's `grassMat`: 11 pointed blades per crossed card, the colour ramp, `vSh`. Then add these placement rules:

- **Exclusion.** A meadow tuft is skipped **only if** `dd < w + run + .5` **and** (`y < WL + .07` **or** it is on a steep earth face). An earlier version skipped every tuft below the water level anywhere, and a whole meadow went bald.
- **Lip grass.** 9 per metre of curve per side on banks with `steep > .22`, placed at the lip (`w + run − .12`, found by iterating `rivBank`). Scale 1.0–1.6, tilted 0.8–1.4 rad out over the water, plus a few upright tufts behind. Skip any within `rw + .35` of a bank stone.
- **Grass behind bank stones** (non-small, top < WL + 0.85): 5 tufts leaning 0.75–1.1 rad out over the stone's edge. **Never upright tufts on top of stones.**
- **Reeds.** About 34 clusters per 115 m of river, each 8–20 stems with height ×2.6–4.4, narrower (×0.6), yellower (`instanceColor.x` .45–.85). Only where `steep ≤ .5` and not next to bank stones. Some stand in shallow water down to WL − 0.35.

### 3.8 The water (`11-water.js`)

- **Shader.** Port the vertex and fragment shaders as they are and use them for `wriver.js`'s ribbons.
- **Ribbon attributes** the shader needs:
  - `aFlow`: the curve's tangent, pointing downstream.
  - `aSpd = clamp(2.8 / halfWidth, .55, 1.7)`: faster where narrow, slow in pools.
  - The existing `aD` (depth) is not needed. Colour comes from the depth texture.
- **Depth.** One depth-only pre-pass of the opaque scene per frame. Exclude the water, tufts, leaves and flecks, and don't update shadows in it. If the game already renders scene depth (for fog or another effect), **reuse that** instead of adding a pass. `uRes` must be the drawing-buffer size, which includes the pixel ratio.
- **Colour.**
  - It comes from `dvc = mix(dv, thick, 0.55)`, where `thick` is the view-ray distance through the water and `dv` is roughly the vertical depth. **Don't colour by `dv` alone:** that made stones under water look like pale glass.
  - Foam uses `dv`.
- **Flow.**
  - Two phases cross-faded (`ph0`, `ph1`, `kf`, period about 8 s), all samples offset by `−fl·sp·phase·k`, so the patterns move **downstream**.
  - The old version moved them upstream. Check the direction in game against `flow-t3.0` → `t4.2` → `t5.4`.
- **Foam.**
  - **Shoreline:** thin (`dv / 0.09`), broken by `step(.36, fn2)` and the slow clump mask `smoothstep(.38, .46, …X·0.22…)`.
  - **Second line:** a breathing line at `dv ≈ 0.42`.
  - **Rocks:** `upK` keeps foam on the upstream side and thins it at the sides; the trailing streaks run 1–4.2 radii downstream.
- **Edge.** A milky band within `dv < .14`, at 30% colour and 45% alpha.
- **Drifting leaves and flecks.**
  - 12 leaves and 22 foam flecks per about 115 m of river, moving at `(0.35–0.65) × aSpd` m/s and slipping round rocks.
  - Positions come from time (deterministic). Use instancing and update only those near the player.
  - Give every instanced mesh in the depth pass an `instanceColor`. A three r128 program-cache bug crashed the mockup when one didn't have it.
- **Proof:** `river-wide`, `river-mid`, `river-close`, and the three `flow-*` frames.

## 4. Order of work (commit each step)

1. The parity lab, the river terrain (`rivBank` + ground attributes) and the ground shader. Pass the `*-nowater` shots without the stones yet; it's fine if they fail only around where the stones should be.
2. The stone generator and material, and replacing `wbldMake`. Pass `stone-row`.
3. Bank stones, water rocks and pebbles. Pass `*-nowater`.
4. Grass rules, reeds and ivy.
5. The water: shader, flow, foam, depth pass, floaters. Pass all 10 shots.
6. The game's light (section 6).
7. In-game checks, tests, README, PR (section 7).

## 5. Performance

- Measure with the game's existing tools (`tests/dd-lab.js`, the frame-time walk), near a river and in open meadow, against `world-look`. Report the numbers.
- **Allowed** without asking:
  - LOD of the stone shapes (the same projection on a lower icosphere);
  - distance culling of tufts, ivy and floaters;
  - building in the worker;
  - reusing an existing depth pass.
- **Not allowed** without a passing compare (rule R2): replacing shader noise with textures, fewer flow phases, dropping the rock-foam loop.
- If the water shader is too slow, measure first. The likely cost is the 8-rock loop: cut it to the 4 nearest rocks, then compare.

## 6. The game's light (after parity passes)

1. Render the parity shots again with **the game's daytime light** (sun × 0.8, hemisphere `0xe8f2ff`/`0x4a5530` × 0.58, no ambient, the game's fog), into `parity-gamelight/`.
2. Compare them to `reference/` and write down the change per material.
3. Fix it with **the smallest global change** that brings it back:
   - first try a per-material exposure factor (one multiplier on the final `col`);
   - then the palette's darkest step;
   - never per-feature retuning by eye.
   
   Write every factor in `DEVIATIONS.md` with before/after numbers. The target is the reference's look, under the game's light.
4. Check sunset and night in the game. They don't have to match the reference, but they must not break: no glowing water at night, no black stones.

## 7. Done means

- `compare.py reference parity` passes. Attach its output and the 10 side-by-side images to the PR.
- `DEVIATIONS.md` lists everything that isn't a word-for-word port.
- In the game, screenshots at device pixel ratio 2 with antialias:
  - a river in meadow;
  - a river through a steep bank;
  - a pool with rocks;
  - close to a bank stone with ivy;
  - flow frames.
- The existing tests pass (`great-check`, `eg-check`, `trees-check`, `cliff-check`, `hyd-check`, `world-sig2`). If terrain heights change, raise `WG_VER` and regenerate the signature, following the repo convention.
- README: a "rivers" section. Version bump.
- Push `river-look` and open a PR against `world-look` (or `main` if world-look is merged).

## Not in this handoff

- **Waterfalls** (phase 3) are not designed yet. Leave steep sections as `wriver.js` draws them now.
- **The world-look features** are not to be redone, except replacing `wbldMake` with `makeStone` (3.1), which the designer asked for.
