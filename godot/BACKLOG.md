# Backlog

Known issues kept for later, not fixed yet. Newest first.

## Tepui region water (noted 2026-10-22, the phase 3 revision)

- **The terrain's 4 m step shows beside river6's falls.** Where the valley lake meets the sunk canyon's step, the rim dips
  below the lake's water, so the lake now stops 18 m short of the edge and fades out; from high views the heightmap's
  staircase along the rim shows between the lake and river6's lips. Now: `_off_floor_edge` / the fade in `_lake_mesh`
  (`tepui_water.gd`); a fix would raise a sill under the lake there or let river6's surface cover the strip.
- **The cascade in ref1 is small in the frame.** ref1's own falls (river10, off the west plateau's top terrace) sit 1.65 km
  away above the near headland's skyline: visible, about 12 px wide each at 585 x 1040. Anything lower on that wall is
  hidden by the SW plateau's north-east headland (same height, 930 m from the camera).
- **Spray and canyon clouds are not sorted per billboard** (one mesh each): now and then a far puff draws over a near one.

## Tepui region (noted 2026-10-20, after phase 2 was approved)

- **Overhang drips look like round wax blobs.** They should read as lumpy rock, slightly tapered.
  Now: tapered round cones with a smooth union and light noise (`tepui_region.gd`, overhang drips in `_feature_mesh`).
- **Pillar rubble is tiny scattered white specks.** It should be a natural pile of rocks.
  Now: a grassed talus apron with rounded-box rock blocks (`_rock`), most of them small and half buried.
- **Arch1's opening has a pointed, gothic top.** It should be rounder and irregular.
  Now: the opening's profile above its widest point is `pow(1 - t^2, 0.72)`, which peaks to a point on tall openings.
- **The ref1 bookmark composition still doesn't match the reference.**
  Now: a pinned camera on a terrace rim, looking along the cliff line with overhang1 ahead (`region_settings.gd`, `bookmark_views.ref1`).
