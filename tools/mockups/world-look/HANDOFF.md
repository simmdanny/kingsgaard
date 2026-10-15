# Kingsgaard: stylized world look (handoff for Claude Code)

Designed in a standalone Three.js mockup, not yet in the game:
`tools/mockups/world-look/surface-study.html`. Open it in a browser (it loads three r128 from cdnjs). The buttons switch between the
**Current game** look and the **New** look, brown and grey stone, and several camera views. Reference shots of the target
are in `shots/`. The style references from the designer are `shots/ref-world.jpg` and `shots/ref-cliff.jpg`.

Base: this branch sits on `great-elder-circle` (not yet merged), because both touch the terrain shader in `src/world/wterrain.js`.
If `great-elder-circle` has been merged into main, rebase this branch onto main first.

The mockup is the spec for the look. **Port the ideas, not the code.** It is one HTML file with a hand-built scene: it has no tiles,
no LOD and no workers, and its terrain function `H(x,z)` is fake. In the game, everything below has to come out of world generation,
per tile, deterministic from the world seed.

## Priorities

1. **The new cliffs in world generation. This is the most important change.** Do this first and spend the most care on it.
2. Boulders (the new seeded boulder system).
3. Tier 1–2 roads become blended dirt trails.
4. The meadow ground colour.
5. 3D grass tufts. This is a new system the others lean on for blending, so it can be built alongside 2 and 3.

Ship each one as its own commit (or PR), with before/after screenshots from the same camera.

---

## 1. Cliffs (MOST IMPORTANT): one continuous stylized rock face, generated with the terrain

**Today:** `src/world/wrock.js` dresses steep ground (over about 53°) near the player with separate chiselled blocks lined up along
each terrace contour (`wrkGen`, `wrkPut`, `wrkShape`), plus far cards (`wrkFar`). The designer does not want walls built from
separate blocks.

**Target:** `shots/cliff-brown.jpg`, `shots/cliff-grey.jpg`, `shots/overview.jpg`, `shots/camera-a.jpg`, and `shots/ref-cliff.jpg`
for the reference.

- **One continuous surface.** The cliff is a single mesh along the cliff face, made in the same pass that finds the face today. It is
  not separate meshes.
- **Carved stones.** Large interlocking stones (about 1.6–7 m) are pushed out of that surface:
  - Each has a flat, slightly tilted front and a soft, narrow bevel.
  - Relief is shallow: about 8–18% of the stone's smaller side.
  - A mix of blockier and more weathered stones.
  - Few small stones. There are fewer, bigger stones than in the old wall.
- **Interlocking.** Each stone has a score (its relief plus a small random priority), and the highest score wins. This lets one stone
  cut into its neighbour instead of always sitting on top of it.
- **Line hierarchy.** This matters a lot; see v11 in `shots/camera-a.jpg`.
  - Seams between stones are the main lines. They are thin and dark, but never black: the darkest seam is about 70% of the base colour,
    tinted warm.
  - Cracks on stone faces are faint hairlines, appear on only about one stone in three, and fade out between 10 and 28 m from the camera.
  - Specks and chips are barely visible.
  - The shape of each stone should come mostly from light (lighter tops, darker undersides), not from outlines.
- **Height along the cliff.** The top edge is uneven, the height varies along the cliff, and the cliff fades into the slope at its ends.
  It must still read as one continuous cliff, not as separate piles.
- **Blend at the foot.**
  - In places a grassy soil slope climbs part-way up the face. The grass line is irregular, never a straight horizontal line.
  - Grass paint creeps over the lowest stones.
  - The rock is a little darker just above the grass.
  - 3D grass tufts stand in front of the foot and on some ledges.

### How the mockup does it

All of these live in `surface-study.html`:

- **The stone layout: `LUMPS`, `lumpsAt`, `winnerAt`.** Each stone is a superellipse pillow in (s, y), where s is the distance along
  the cliff and y is the height. Its fields are:
  - `amp`: the relief.
  - `bw`: the bevel width, with a bounded slope.
  - `ta` / `tb`: the face tilt.
  - `pr`: the priority.
- **The mesh: `cliffGeo`.**
  - One sheet per cliff, built column by column along the foot line. It goes from the buried foot, up the leaning face, over a rounded
    rim, and back under the grass on top.
  - The stone relief pushes it out along the face normal.
  - **Normals are analytic.** They come from 5 samples of the height field per vertex, not from `computeVertexNormals`. This is what
    removed all the streaks and pinching.
- **The material: `cliffMat`.**
  - Palette: the `PAL.brown` and `PAL.grey` ramps, with 4 soft tone steps (posterised at 80%).
  - Tops are lighter; the fill light is applied only to the rock.
  - **The seam is drawn per pixel.** The stone table is a float `DataTexture` (`BLK_TEX`), and a grid texture lists the stones near
    each cell (`GRID_TEX`). The fragment shader finds the best and second-best stone at its exact (s, y) (`seamGap`). It turns the gap
    between their scores into metres using a world-space gradient, then draws the line with `fwidth()` + `smoothstep()`. This removed
    all the stair-stepping and blur.
  - Seams with no real step (`vis`) are hidden, so faces stay clean.
- **Baked AO: the `aCrev` attribute.**
  - Only the concavity and the recess behind stones are baked; the recess gets at most 0.35.
  - Darkening is capped at 70% of the base colour.
  - `shots/cliff-ao-diagnosis.jpg` shows the bug we hit, where whole faces went near-black. The cause was a "two stones meet" AO term that
    fired across whole overlaps. Don't repeat it.

### How it should work in the game (please design this properly, the mockup cheats here)

- **World-anchored stones.** The mockup measures s as arc length along one hand-made foot line. That does not carry over to tiles,
  because each tile would measure s differently and the stones would not match at tile edges. Anchor stone placement to world space
  instead. One option is a jittered cell grid along the face: cells of about 2.5 m horizontally by 1.5 m vertically in the face's
  local frame, with each cell's seed taken from hashing its world position and `WG.seed`. Then any tile can rebuild the same stones at
  its edges. Pick whatever is cleanest, but the cliff must be identical across tile borders and on every reload.
- **Detection and heights.** Keep the game's own cliff detection and cliff heights (tablelands tiers, mountain faces, the Great Elder
  Circle peaks). The varying height along the cliff should come from the terrain itself where possible. Use the mockup's grass slope
  (`glF`, `gLev`, `gRun`) as the model for how the foot blends.
- **Material.** The cliff mesh uses the new cliff material, and `wterrain.js` should colour steep ground with the same stone, so the
  2 m terrain facets behind and around the cliff match it. Use the region's stone colour for the palette (brown for sandy regions,
  grey for stony ones). Both palettes are in `PAL`.
- **LOD.**
  - Near tiles: the fine sheet plus per-pixel seams.
  - Middle tiles: a coarser sheet, with the seam baked per vertex into an attribute (cheaper; the mockup's v9 approach is fine at
    a distance).
  - Far: keep something like today's `wrkFar` cards, but with the new material. No block cards.
  - **Budget:** near cliffs in the mockup are about 160k vertices for an 80 m wall, which is too much for the game as is. Reduce
    density away from the camera and measure frame time.
- **Keep-offs.** Villages, roads, trees and boulders must not end up inside the cliff mesh, same as today.
- **Generation must never use proximity-triggered texture swaps.** The cliff has its final look as soon as its tile is generated.

## 2. Boulders: seeded, chunky stones that look broken off the cliff

**Target:** `shots/boulder-row-brown.jpg`, `shots/boulder-row-grey.jpg`, `shots/boulder-base.jpg`.

**Today:** `WROCK` in `src/world/wstream.js` uses `wrkBoulderTpl()` from `wrock.js`. That is replaced.

- **Shape: `makeBoulder(seed)`.**
  - Start from an icosahedron (detail 4), stretched non-uniformly.
  - Make 6–11 random plane cuts, which give the flat faces, and flatten the bottom.
  - Add light noise, then one light smoothing pass so cut edges become soft bevels.
  - Bake the edge, occlusion and seam-plane attributes.
- **Pool.** Build 12 shapes once and place them with one `InstancedMesh` per shape (per tile, or per region, whatever fits the tile
  system).
- **Placement: `placeBoulder(x, z, seed)`.** It is fully deterministic from the seed:
  - Shape, size (0.2–2.1 m, mostly small), rotation and ±7% tint all come from the seed.
  - The boulder is aligned to the terrain normal.
  - It is sunk 25% (large) to 45% (small) of its height.
  - 40% of the large ones get 1–3 small companions.
- **Material: `boulderMat`.** It is the cliff's stone (same palette, tone steps and line hierarchy):
  - One plane seam on about 45% of shapes.
  - Moss on about 40% of tops only.
  - The lowest roughly 30 cm fades to a dark green-brown earth tone.
- **The instance colour carries data, not colour.** The mockup stores brightness, ground height and seed in the instance colour, then
  injects the shader after `color_fragment` and resets `diffuseColor` there, because three.js multiplies the instance colour in. Use
  a proper instanced attribute instead if that is cleaner.
- **Blend with the ground.**
  - Tufts are placed around every base, overlapping it.
  - A tighter, darker contact ring is drawn in the ground's occlusion.
- **Spawn rules.**
  - Keep today's density logic: more on talus and steep ground, and so on.
  - **Never on roads or trails** (see 3). Boulders and cluster companions must stay outside the path mask, plus a margin.

## 3. Tier 1–2 roads become worn dirt trails

**Target:** `shots/path-view.jpg`, `shots/path-topdown.jpg`, and `shots/ref-world.jpg` for the reference.

**Which roads:** roads where **both** villages are tier 1 or 2. Other roads keep the current look. Roads are built in
`src/kingsgaard.html`: `owgFinish`, `owgBuildTile`, `owMarkRoads`, with `OW_CFG.roadHalf = 1.5`.

- **The trail is a mask (`pathMask`), not a strip mesh.** It is the distance to the road spline, minus a half-width, broken by two
  scales of noise, with a wide transition band of about 45% of the width. The terrain material reads it and mixes dirt and grass
  through noise:
  - dirt patches poke into the grass;
  - grass patches creep onto the trail;
  - there is no visible line anywhere.
- **Width.** `pathHalfAt` gives a base half-width of 0.8 m, varying 0.6×–1.4× along the road with low-frequency noise. The road's seed
  sets the noise, so roads differ but share the style.
- **Surface.**
  - Muted dusty brown: the ramp runs from (0.30, 0.23, 0.17) to (0.66, 0.56, 0.44).
  - Lighter worn middle, darker damp blotches, sparse pebbles.
  - The terrain dips about 9 cm × mask.
- **Grass falloff.** Tuft density and height drop through the band:
  - About 7% of tufts survive inside, near the edge.
  - About 2% survive in the middle.
- **Props.** `pathMask` and `pathHalfAt` are the only things props should consult for keep-out. That covers boulders, tufts,
  flowers, and anything else that spawns.

## 4. Meadow ground colour (`WT_GLSL_COLOR` in `src/world/wterrain.js`)

**Target:** the ground in any of the shots. In the mockup this is the `MEADOW:` block in the ground shader, plus `grassRamp`,
`meadowT`, `meadowStrokes` and `gStrokes` in `GLSL_NOISE`.

- A painted green made of several shades:
  - broad patches and darker clover clumps;
  - two sizes of painted blade strokes that lean along a slowly turning direction;
  - the strokes fade out with distance (14–42 m).
- It changes by where it is:
  - crests lighter, hollows deeper;
  - slopes darker;
  - darker at the foot of rocks;
  - faces turned to the sun warmer;
  - dry yellow patches on sunny flat ground;
  - bare earth only on very steep ground;
  - a few tiny flowers.
- The cliff's grass (over the rim, on ledges, at the foot) uses the **same** functions, so there is no seam where cliff and ground meet.

## 5. 3D grass tufts (a new system)

The game has no general 3D grass. Only the ring has blade clumps, in `wring.js`. The cliff foot, boulder bases and trail edges all
depend on tufts, so build:

- **Instanced crossed cards.** The blades are drawn in the fragment shader: about 11 pointed blades per card, with no texture (see
  `grassMat`).
- **Placement** (see `tuftSpots`):
  - dense along cliff feet;
  - around boulders;
  - on cliff ledges;
  - across the meadow, thinning with distance;
  - falling off through the trail mask.
- **Distance culling and LOD.** In the mockup, about 35k tufts sit within about 55 m. Measure frame time; it must stay fast.

---

## Process

1. `git fetch origin && git checkout world-look`. Read this file, open the mockup, and click through all the views.
2. Build in the order above. Commit each feature separately.
3. If terrain heights change (the trail dip, and possibly the cliff foot slopes), raise `WG_VER` and regenerate the world signature,
   following the repo convention (archive the old `tests/world-sig2-base.json`).
4. Run the existing tests:
   - `tests/great-check.js`
   - `tests/eg-check.js`
   - `tests/trees-check.js`
   - `tests/world-sig2.js`
   
   Don't loosen checks to make them pass; report failures.
5. Add a simple test that cliffs are identical across a tile border and across two generations from the same seed.
6. Screenshots: take them at devicePixelRatio 2 with antialiasing on, as the game runs. Earlier mockup screenshots were taken at 1×
   and looked jagged for that reason alone. Take before/after from the same cameras for each feature, including at least one cliff on
   the tablelands, one mountain face and one Great Elder Circle peak.
7. Check in the game:
   - frame time near tall cliffs and in dense meadow;
   - tile pop-in;
   - fog at day, sunset and night (the new materials must keep the fog patches used by `wdepth.js`, as the current terrain material does);
   - walking on trails;
   - that nothing spawns on roads.
8. Update the README with a "world look" section and bump the version.
9. Push and open a PR (based on `great-elder-circle` if it is still open). Attach the screenshots.

## Known limits of the mockup (don't copy these)

- The cliff is a displaced sheet, so it has no real overhangs. That is fine for this style.
- Stone positions in the mockup come from one random sequence. Reshuffle them freely, as long as the game's version is deterministic per world.
- The "Current game" toggle in the mockup only approximates the game's look; it is there for comparison.
