# Backlog

Known issues kept for later, not fixed yet. Newest first.

## Tepui region (noted 2026-10-20, after phase 2 was approved)

- **Overhang drips look like round wax blobs.** They should read as lumpy rock, slightly tapered.
  Now: tapered round cones with a smooth union and light noise (`tepui_region.gd`, overhang drips in `_feature_mesh`).
- **Pillar rubble is tiny scattered white specks.** It should be a natural pile of rocks.
  Now: a grassed talus apron with rounded-box rock blocks (`_rock`), most of them small and half buried.
- **Arch1's opening has a pointed, gothic top.** It should be rounder and irregular.
  Now: the opening's profile above its widest point is `pow(1 - t^2, 0.72)`, which peaks to a point on tall openings.
- **The ref1 bookmark composition still doesn't match the reference.**
  Now: a pinned camera on a terrace rim, looking along the cliff line with overhang1 ahead (`region_settings.gd`, `bookmark_views.ref1`).
