# Backlog

Known issues kept for later, not fixed yet. Newest first.

## Tepui region look (noted 2026-10-24, the performance + polish pass)

- **Waterfalls are flat sheets on the wall.** Each fall is one flat ribbon hugging the face, so from the side it has no
  thickness and no leap out from the lip. It should arc out from the lip, thicken and break up into separate tongues as it
  falls, then hit the plunge pool. Now: `_fall_mesh` in `tepui_water.gd` (a strip down the face, a little proud of it).
- **A river meets its falls in square notches.** Where river7's side channels pour over the lip, the water stops in a stepped,
  square edge against the wall's grass lip and the sheets start just below it (seen from close above, shots/p6/rapids_close).
  Now: the surface is cut square at the course's end (`_river_mesh`, the `fk` term along the last segment) on the terrain's
  4 m step; it should curve over the lip into the sheet.

## Tepui region water (noted 2026-10-22, the phase 3 revision)

- **The terrain's 4 m step shows beside river6's falls.** Where the valley lake meets the sunk canyon's step, the rim dips
  below the lake's water, so the lake now stops 18 m short of the edge and fades out; from high views the heightmap's
  staircase along the rim shows between the lake and river6's lips. Now: `_off_floor_edge` / the fade in `_lake_mesh`
  (`tepui_water.gd`); a fix would raise a sill under the lake there or let river6's surface cover the strip.
- **Spray and canyon clouds are not sorted per billboard** (one mesh each): now and then a far puff draws over a near one.

## Tepui region (noted 2026-10-20, after phase 2 was approved)

- **Overhang drips look like round wax blobs.** They should read as lumpy rock, slightly tapered.
  Now: tapered round cones with a smooth union and light noise (`tepui_region.gd`, overhang drips in `_feature_mesh`).
- **Pillar rubble is tiny scattered white specks.** It should be a natural pile of rocks.
  Now: a grassed talus apron with rounded-box rock blocks (`_rock`), most of them small and half buried.
- **Arch1's opening has a pointed, gothic top.** It should be rounder and irregular.
  Now: the opening's profile above its widest point is `pow(1 - t^2, 0.72)`, which peaks to a point on tall openings.
