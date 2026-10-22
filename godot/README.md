# Kingsgaard (Godot)

The native Windows rebuild of the browser game, in Godot 4.7.2 (GDScript, Mobile renderer).

One 30 x 30 km island - a clean base terrain of vast smooth grassy hills and big raised areas in five height tiers (coast,
lowlands, highlands, high plateaus, mountains), smooth escarpments between them, walking routes up every edge and broad valleys
down to the sea; no cliffs, rocks or biomes yet (regions will be designed on top of it) - the sea and the sky, two heroes to
walk it, the title screen and menus.

## Set up on another PC

The game lives in the `godot/` folder of github.com/simmdanny/kingsgaard (apart from the browser game's files).
1. Get the repo: `git clone https://github.com/simmdanny/kingsgaard` (later: `git pull` for updates), or Code > Download ZIP.
2. Get Godot 4.7.2: "Godot Engine - Windows" (the standard one, not .NET) from https://godotengine.org/download/windows/
   (older versions: https://godotengine.org/download/archive/). Unzipped anywhere is fine.
3. Double-click `godot/Play Kingsgaard.bat` (`tools/launch.ps1`). It searches the usual places for Godot (beside the game,
   C:\Godot, Downloads, Desktop, Documents, Program Files, Steam, winget, scoop, other drives - a few folders deep), unzips a
   Godot zip left in Downloads, or asks you to pick the Godot .exe once; it remembers the choice in `godot-path.txt` (delete
   that file to choose again). The first start imports everything (a minute); later starts take seconds.
   Or open `godot/project.godot` in the Godot editor and press F5.

## Play

Double-click `Play Kingsgaard.bat` (it finds Godot 4.7.2 as above). The title screen has Play,
Settings (window, vsync, render scale, shadows, grass, tree distance, mouse sensitivity, info overlay - saved in
`user://settings.cfg`), Controls, Credits and Quit; Esc in the game opens the pause menu. Play asks for the hero: Male is alicewithalex's Low Poly Male Character (see
`assets/characters/male01/SOURCE.md`), Female is the same model made feminine in code (`scripts/player/feminize.gd`: her
bust, waist, hips and thighs reshaped, and narrower, gently sloping shoulders - her arm joints moved in and down by
`SHOULDER_IN` / `SHOULDER_DOWN`, about 4 cm and 1 cm). Both are animated in code, hands and fingers included
(`scripts/player/rig_anim.gd`). `scripts/tools/shape_probe.gd` measures the body's joints and widths by height.

| Key | Action |
| --- | --- |
| W A S D / arrows | move (relative to the camera) |
| Shift / Alt | run / sprint |
| Space | jump |
| mouse drag, wheel | turn the camera, zoom |
| F | fly over the land (Space up, Ctrl down, Shift x5, Alt x25); F again lands the hero under the camera |
| F1 | info: fps, position, tier and slope underfoot |
| F2 / F3 / F4 / F5 | terrain maps: heights / tiers / slopes / steep-edge mask (again = back) |
| F6 / F7 / F8 / F9 | the tepui region's camera bookmarks ref1-ref4 (fly mode there; F again lands the hero) |
| F10 / F11 / F12 | the region's arches (arch1-arch3); with Shift its sinkholes (sinkhole1-sinkhole3) |
| Page Up / Page Down | through all the region's carved features (arches, pillars under plateau sections, overhangs, pillars, sinkholes) |
| Esc | pause menu / back |

## Terrain

Terrain3D 1.0.2 (`addons/terrain_3d`, MIT, Windows binaries only) draws and collides; the heightmap is generated in script
(`scripts/world/base_terrain_gen.gd`, every setting in `base_terrain_config.gd`; seeded - same seed + settings = same island).
- **Size:** the island is 29.7 x 29.7 km (fitted to 30 km on both axes), about 720 km2 of land, in a 32.8 km map square:
  8192 x 8192 samples at 4 m. Relief 0 - 1430 m.
- **Terrain3D setup:** 64 regions of 1024 x 1024 samples (4.096 km each, an 8 x 8 grid; Terrain3D's region map allows 32 x 32,
  so up to 131 km at this spacing). All regions stay loaded - from a mountain the whole island is in view - about 0.85 GB of
  maps in memory and the same on the GPU (height, control and colour maps). **LOD:** the clipmap, mesh size 48 with 8 rings -
  4 m cells for the first ~190 m round the camera, each ring doubling, the outermost (512 m cells) reaching ~50 km, past the far
  coast. **Streaming:** what streams is the detail - the clipmap's rings and the collision follow the camera; the heightmap
  itself is resident. **Collision:** `DYNAMIC_GAME`, built from the heightmap itself in 64 m pieces within 192 m of the camera
  (tested: rays hit within 1 mm of the heightmap). The hero is a CharacterBody3D with `floor_max_angle` 35 degrees.
- **No jitter: a floating origin** (`scripts/world/floating_origin.gd`). Godot is built with 32-bit floats: 15 km from the origin
  a position only moves in 1 mm steps, enough to make the hero, the camera and the ground shimmer. Whenever the camera gets more
  than 3 km from (0, 0, 0) along x or z, the whole world moves back by a whole number of regions: Terrain3D's regions are re-filed
  under new locations (only its 32 x 32 region map is rebuilt - no heightmap is copied or re-uploaded, so it costs nothing you
  can see), and the hero, camera and grass move with it; shaders that paint by world position add the global uniform
  `world_offset`. The camera is never more than ~3 km out - 0.25 mm steps. (Tested: collision exact after a shift, the hero walks
  across a shift with no jump.) A double-precision build was the other way: it needs Godot and Terrain3D compiled from source
  (Terrain3D calls its double build experimental) and that custom engine on every PC instead of the standard Godot 4.7.2.
- **Generator** (planning grid 2048 x 2048, 16 m cells; then upsampled cubic to 4 m): a rounded-square coastline (domain-warped,
  bays and headlands); a very low-frequency domain-warped tier field rising inland, cut by land share into lowlands 10-80 m,
  highlands 150-350 m, high plateaus 450-700 m and mountains 900-1500 m (the coast 0-10 m is a band along the whole shore), each
  tier kept a ring's width from the tier two below and small pieces folded in, so regions are several km wide; each tier has its
  own broad ground inside its range plus large rolling hills scaled by tier (ridges and peaks only in the mountains). Across
  every tier edge the height ramps up as a smooth grassy escarpment centred on the edge - 30-39.5 degrees, varying along it -
  built on exact (smooth) distances to the edge. Walking routes: 21 degree ramps spread along every edge (at least 2 per edge,
  more on long edges, plus a spare); 10 broad valleys run from the high tiers to the sea, their floors only descending and
  climbing gently, cutting broad notches back through the escarpments (routes too). Then a slope cap: nothing anywhere steeper
  than ~39.8 degrees. It checks itself: every route walked on cells under 33 degrees (failing ones relaxed), every region of
  every tier reached on foot from the spawn, slopes measured at 4 m. Stored for later: the steep-edge mask (where the edges
  are steepest - for cliffs), the valleys' courses with floor heights (for rivers), each route's walkable path
  (`route_path()`). Last, the backdrop ranges: big ridged-and-rounded massifs in a ring 5.2 - 11 km round the tepui region,
  crests up to ~1700 m (about 1300 m above the region's floor), always filling the directions its bookmarks look in, only on
  land and easing out toward the coast, never lowering higher ground - scenery behind the plateaus, nothing walks up them
  (`backdrop_*`). First start ~85 - 100 s on the laptop, then cached in `user://terrain` (one file per seed + settings; delete it
  to regenerate) - later starts ~7 s.
- **Turned off, kept:** the old 10 km continent with its cliffs, passes and rivers (`terrain_gen.gd`, `terrain_config.gd`:
  `CLASSIC_TERRAIN` in `main.gd`), the forests, groves and lone trees (`foliage.gd`: `BIOME_SPAWNERS`), the stone, dirt, sand and
  snow ground (`biomes` in the terrain shader).
- **Look** (`shaders/terrain3d.gdshader`, from Terrain3D's minimum shader): one grass everywhere (the game's grass colour),
  a little uneven, shaded subtly by slope (deeper and warmer the steeper it is); debug maps on F2-F5.
- **Tools:** `scripts/tools/base_terrain_test.gd` (generator alone: report + quick maps, and writes the game's cache),
  `base_walk_test.gd` (collision rays, a route walked up along its path, an escarpment walked into, the floating origin),
  `poi_profile.gd` (ground along the screenshot views), `t3d_probe.gd` (Terrain3D's API); `shot.gd` options `--overview`,
  `--view=height|tiers|slope|steep`, `--poi=low|edge|mount`, `--camfile=cams.txt` (many `--cam` shots in one run, one
  "out.png x,z,h,tx,tz,th" per line). (`terrain_test.gd` / `terrain_walk_test.gd`: the old continent.)

## Tepui region (phases 1 - 3 done; phase 4A: materials and atmosphere)

The first region, built on the base terrain: a land of tables - a flat floor, six big flat-topped plateaus standing on it
(two of them stacked in terraces), sheer walls, narrow canyons and a wide valley (`scripts/world/tepui_region.gd`, every key
value in `region_settings.gd` - a `RegionSettings` resource; seeded, same seed + settings = same region). Its look (phase 4A,
below): pale limestone, lush grass, a hazy blue distance and big soft clouds; no grass blades, trees, paths or buildings yet
(`greybox` in the settings brings back the flat colours the landforms were judged in).
- **Where:** a 4 x 4 km square centred on map (4000, -1496) (picked automatically once, now pinned in the settings so a
  change to the base terrain cannot move it): highland / high-plateau ground (56% / 43%) with mountains in view. The floor is flat at the island's middle height there (408 m, gentle swells of +-3 m) and blends
  back into the island's ground across a 280 m border band, so the region sits in the island without a seam. No 4 km
  window on the island lies on a single tier (`region_scan.gd`), so the floor is levelled rather than taken as it is.
- **A step function:** every 4 m height sample is on the floor or on a plateau's level, never between (except in the ways
  up and the rims' dip), so at each edge the heightmap jumps the whole wall height from one sample to the next - top, straight
  drop, flat floor. The rim is eroded: the top sinks toward its edge by 5 - 20 m at the edge (varying along it, here and there
  a deeper crumbled notch), easing out over 30 - 75 m inward - rounded, and the walls' top edge wanders with it. Far from the camera Terrain3D's coarser rings would smear each step into a slope; the terrain shader moves those
  vertices onto the edge of their own terrace (a snap map: per sample, the nearest sample at its terrace's edge), so the
  steps stay steps at every distance; its normals ignore the jump, so tops and floors stay flat-shaded to the edge.
- **Plateaus:** six, from a list in the settings (layout position, radii, base level, stacked terraces): ellipses whose
  outlines are bent by a domain warp, big bays and headlands, smaller zig-zags, then notches and small headlands at two finer
  scales and narrow inlets; every corner where two shapes meet is rounded (smooth minimum), the fins' roots blend into their
  plateaus, the fields are blurred a little, and the ravines are rounded slots with uneven sides; neighbours kept apart along their Voronoi
  border by a canyon (canyon pairs, 120 - 300 m wide) or a wider gap; the borders bend gently (no long straight canyon side).
  One canyon's floor is sunk 85 m below the valley's (`sunk_canyon`): 235 m deep, 165 - 195 m wide at the ref3 bookmark,
  with an 85 m step where it opens on the valley (for a waterfall later). Levels about 150 / 280 / 430 m above the floor (A, B, C;
  C only on B, so no wall is taller than about 290 m); stacked terraces at least 112 m deep (a true distance), measured 103 -
  220 m. Areas 0.3 - 1.8 km2. The layout's axis comes from the sun (the walls the bookmark views look at face it).
- **Walls:** separate meshes along every level's edge (marching squares, 6 m columns, 48 columns a piece), each column snapped
  onto the exact edge. Per column, from the plateau out: a rock lip from under the grass, over the sunk rim, to the face's top
  edge; the face, standing at least 9 m out from the terrain's step (so the step is always behind it), its rows denser at the
  rim for a rounded shoulder; then a scree of rubble from the face out and down under the ground. The profile changes along
  the wall (noise over the map, so it is the same on both sides of a piece's join): leaning back 0 - 12 degrees (or out up to
  3), a bulge of up to 16 m at its own height, ledges where some rock layers stand out along some 150 m stretches, slow
  curvature and buttresses, broad flutes and fine grooves each with its own place, width and depth, fading in and out down the
  face. The rubble is 10 - 25% of the wall's height, at 33 degrees, lumpy, and never reaches across more than a third of the
  free ground in front (lean and rubble both shrink in narrow canyons; none beside the ways up). Why meshes and not the SDF
  carving for the walls: 41 km of wall through the voxel bake would be ~60 million samples in GDScript (minutes per build)
  and millions of triangles; displaced column meshes give the same silhouettes along the walls for a fraction (walls ~0.5M
  triangles), and the SDF stays for what columns cannot do (openings, undercuts, pillars, pits). Trimesh collision. Measured
  on every column (top to the ground in front, rubble included): 85 - 282 m. A run's normals are smoothed along the whole run
  before it is cut into pieces (no wedge at a sharp bend), its open ends capped with rock. The mesh marks where grass grows
  (vertex colour: the lips), so the faces and the rubble stay rock. Beside a carved feature's box a wall's lean and rubble
  never reach into the box, and its shapes ease in along the wall over 80 m from where the carving takes over (a wall leaning
  40 m out with 80 m of scree that stopped dead at arch1's box left a stray flat slab of rubble at its base).
- **Carved features** (phases 2A, 2B): rock that a heightmap cannot hold, each a signed distance volume over a box of its
  own (positive inside the rock), meshed at bake time with surface nets (2.5 m voxels; three smoothing passes, then every
  vertex put back onto the surface, normals from the volume's gradient blended across cells), trimesh collision, the walls'
  material. **LOD:** each feature is baked three times from the same volume - 2.5, 5 and 10 m voxels (a quarter and a
  sixteenth of the triangles) - and each mesh is drawn only in its own band of distance from the camera (visibility ranges,
  measured to the mesh's centre): the full one to 450 m, LOD1 to 1400 m, LOD2 beyond, the bands meeting exactly (a
  hysteresis margin left a gap where a camera starting between two lines found both hidden); the collision is always the full
  mesh. Rock lying on the terrain - a rim's ring, a pile's toe - takes the terrain's own normal and the grass colour, so no
  ring or seam shows where it meets the grass. Where a box cuts through walls (arches, supports, overhangs) the rock there is
  the plateau as the walls build it - its plan from its level's edge, the face 9 m out, the rock's top over the edge, the foot under the ground - so the walls
  stop at the box and the carving reaches 18 m past it on all four sides behind them (0.15 m back), the walls' shapes calmed
  over the last 20 m: the two meet on the same plain face. One rock style for all of it (`_style`, `_layers`): broad smooth
  forms, flutes and soft vertical grooves, and the walls' own rock layers at the same heights; rubble at the foot of every
  carved face (none in an arch's passage or under a support's slab), grass marked on the rock's top surfaces. Each from the
  settings:
  - **arches** (`arches`, kinds 0 / 1): a fin from a wall (or a neck between two plateau parts) with an opening carved
    through: a natural bridge on two legs, with arch2's proportions (the rock above the opening 30% of the height, the
    opening about half the freestanding fin). The opening is widest a third of the way up, much narrower at the ground (the
    legs flare out into their rubble), arched above; the legs thicker than the span, the span thinnest in its middle, its top
    sagging a little and uneven, broad bulges on its sides. Under the opening the ground is lowered and the carved rock's top
    is the walkable bridge. The opening is carved last - after the face, the legs' flare and the rubble - and right through
    the fin's whole foot, and the box holds the whole flared foot (arch1's opening had been filled again from both mouths by
    its own flared base). Measured on the final mesh (`arch_measure.gd`, rays straight through the fin every metre): arch1
    150 x 192 m, arch2 114 x 103 m, arch3 111 x 102 m (clear width x height; targets 150 x 193, 115 x 103, 112 x 102;
    rock above the opening at its thinnest, the middle of the sagging span, 22 - 24% of the height).
  - **pillars under plateau sections** (`arches`, kind 2, "supports"): a fin's outer part hollowed out under a slab (a
    share of its height thick) standing on two elephant legs - thick, flared and toed at the foot, lobed, wrinkled - joined
    to the slab through rounded vaults; the slab's top is walkable.
  - **overhangs** (`overhangs`): a stretch of a plateau's edge whose top juts 14 - 24 m out past the wall, the wall under it
    undercut, fading back to the plain wall at both ends, grass on the lip; drips in 2 - 3 groups where the lip juts out most,
    with gaps between them (5 - 9 an overhang): in each a long one and shorter ones of their own thickness (tapered round
    cones), lumpy, run together into clusters, their tips blunt and round.
    One stands in front of the ref1 camera, as in ref_1.
  - **pillars** (`pillars`): freestanding elephant legs in the canyons and the valley, 140 - 236 m tall, 76 - 100 m across at
    the foot: leaning a little, an irregular cross-section (a blunt polygon of its own six faces, turning slowly up the shaft,
    blended with a circle), lumpy at two scales, a bulge, toes, grooved; round the foot a talus apron - big on some sides,
    next to none on others - grassed over where it runs out into the ground, with rock blocks heaped on it and a few strewn
    beyond. Two carry a slab of plateau rock: flat, its outline a blunt irregular polygon wider than the shaft, tilted 3.5 - 7
    degrees, an uneven underside, sheer grooved sides, grass on top.
  - **sinkholes** (`sinkholes`): holes 50 - 110 m across (on average) and 90 - 140 m deep down from a plateau's top, with an
    irregular outline (lobes and bays: the radius times one plus five cosines of their own), sheer walls grooved and fluted up
    and down like the walls (no rings), the rim overhanging by 2 - 6.5 m; the heightmap's own flat floor at the bottom, a low
    scree here and there at the wall's foot and a few rock blocks (water comes in phase 3). The rock's top over the rim lies
    on the grass out to 22 m past the outline - past the terrain's own sloping triangles round the hole - then dips under it.
    Shift + F10 / F11 / F12 in the game.
  Bake time (one after another, on mains power; the two LODs add ~17%) and triangles of the full mesh: arches 5.8 - 16.4 s
  (49k - 121k), pillars under plateau sections 9.5 / 16.1 s (76k / 119k), overhangs 3.1 - 6.6 s (33k - 68k), pillars 3.9 -
  16.5 s (23k - 47k), sinkholes 1.5 - 3.6 s (25k - 52k); 138 s in all. All carved features together: 839k / 205k / 49k
  triangles (full / LOD1 / LOD2). Checked by `region_seam_probe.gd`: every wall end at a carved box has rock behind it, no
  rock top shows above the grass outside the rims.
  Bookmarks: one per feature (`arch1`, `support1`, `overhang1`, `pillar1`, `sinkhole1`, ...; Page Up / Page Down in the
  game, `shot.gd --bookmark=pillar2`), each from a spot the generator finds open (nothing in the line of sight).
- **Ways up:** ravines cut into the plateaus' edges, two per plateau piece and level (18 in all): a 90 m wide slot whose floor
  climbs at 30 degrees from the ground in front to the top, between sheer sides; the ramp starts where the edge crosses the
  slot's mouth furthest in, so the ground meets it level all across. Placed out of the bookmarks' views where possible. The
  generator walks each one and checks every plateau piece is reached on foot from the floor.
- **Water** (phase 3, made bigger in its revision; `scripts/world/tepui_water.gd`, settings group Water): planned before the
  heights, carved into them, meshed after the walls and the carving. **Rivers** (`rivers`; the settings number them in their
  own order, side channels added as they come): on the plateaus' tops from a source (moved onto its level with room round it)
  meandering to a real cliff edge (the nearest edge to the given mouth with a 40 m drop, clear of arches, supports, overhangs
  and the ways up), and on the valley floor from a waterfall's pool to a lake; the bends only sideways of the straight line,
  pushed clear of edges, the level above, carved features, sinkholes and ravines (a river on the floor may run under an arch,
  between its legs; a river into a lake keeps no distance from what stands in that lake). 25 - 60 m wide (`river_width_min` /
  `max`, each river a mean width): a little narrower near the source, uneven along it (noise over ~170 m and ~45 m), up to
  22% wider on its long calm treads, a third narrower over its rapids, eased over 40 m, and never wider than its level leaves
  room for its banks. No sharp corner anywhere: every bend at least twice the river's mean width in radius (`_smooth_turns`:
  a point turning more sharply is pulled toward its neighbours, sweep after sweep, until none does; the meander flat at both
  ends), the run-in to a fall a curve meeting the edge square 40 m before it, a side channel long enough to swing its
  sideways offset at that radius (river8 had a canal's right angle past arch1). Their water is stairs, never a ramp: the
  lowest ground across the bed and banks along the course (sampled as wide as a calm tread gets), its running minimum, then
  flat treads and short risers - rapids, the water sloped over 8 - 28 m, fast and foaming - wherever it steps down more than
  0.8 m; only the edge itself gets a waterfall. Beds 2.5 m deep (0.8 - 1.5 times that, the wider the deeper) with banks
  easing into the ground over 12 m. A river into a lake steps down to the lake's level where it reaches the water, and a lake
  never stands above the river feeding it (lake 3 lies 0.7 m lower for it). One merged surface per river system; far off the
  water is drawn a little nearer the camera along the line of sight (as much as covers up to 6 m of height error at that
  viewing angle), so Terrain3D's coarse far rings, their vertices on a river's banks, no longer cut it into dashes. Eleven
  rivers: river1 1.9 km across P2 into the canyon lake; river2 (0.9 km, P2) now its own river, falling in two strands into
  the canyon lake in front of ref3; river3 and river4 the stairs of P1; river5 across P3 into its three falls, whose pool
  feeds river8 (1.2 km on the floor, north past arch1's leg into lake 3); river6 from the valley lake over the sunk canyon's
  step; river7 (0.75 km) across the west plateau, falling in three strands toward ref4, its pool feeding river9 (0.5 km) into
  lake 3; river10 (0.44 km) across the west plateau's top terrace, falling in two strands onto the terrace below in ref1's
  view, its pool feeding river11, which joins river7.
  **Waterfalls** where a river leaves its level, 15 - 60 m wide (`fall_width_min` / `max`): one about as wide as its river,
  or several side by side - together 1.35 - 1.75 times the river's width, each its own share of it, ribs of rock 7 - 22 m
  wide between them; one is the river's own, the others fed by side channels splitting off 60 - 260 m before the edge, their
  lips on the nearest real edge within 60 m (snapping onto the edge could leap to another edge: river6's second fall once
  landed 420 m away at another plateau's foot), their lips 0.8 - 4.5 m lower (or level), so no two are the same. A sheet
  spreads 30 - 50% as it falls; a pair less than 16 m apart fans out further and merges partway down (35 - 65% of the drop).
  The wall's top comes down under the water at each lip and its face stays plain for 25 m either side. The sheet leaves the
  lip level and bends down (a projectile's curve slowed by the air), clear of the face, curved across, 3 m into the water
  below; glossy and clear at the lip, a streak every few metres racing down, white by a fifth of the way down, a wide sheet
  parting into curtains lower down, soft torn edges. At its foot (`shaders/region_foam.gdshader`, `region_mist.gdshader`):
  white foam on the water, solid at the foot, breaking up into lace and rings drifting outward; billowing mist - big soft
  puffs rolling outward over the water and a plume rising up the fall, soft all the way out and faded where they meet the
  water or the rock (the depth texture, which the sea reads anyway) - and fine drops thrown out in arcs. Each is checked with
  horizontal rays down its middle every metre (`check_falls`, in the region test's report): all 15 (84 - 273 m) pass, no ray
  through a gap, every sheet's foot 3 m under the water, every sheet reaching 22 - 35 m out from its lip and at most 7 m past
  its own width (the long red fans in the debug views from above were perspective - 270 m sheets seen from a camera a few
  hundred metres over them; the debug views now look straight down, orthographic, `shot.gd --overview=x,z,size`). river1 one
  fall 46 m wide (210 m); river2 43 + 24 m (215 / 217 m, merging 60% of the way down); river3 33 m (113 m); river4 39 m (130
  m); river5 three of 22, 28 and 40 m (263 - 266 m, lips at 671 / 672 / 669 m, two merging at 45%); river6 34 + 36 m (84 / 86
  m, merging at 40%) off the sunk canyon's west end, where its step faces the valley lake; river7 three of 47, 19 and 35 m
  (271 - 273 m, two merging at 55%); river10 38 + 24 m (135 / 136 m).
  **Lakes** (`lakes`) at the cliffs' feet on the low ground and **plunge pools**: no oval anywhere - each outline an ellipse
  seen through a domain warp (two octaves of smooth noise in units of its smaller radius, `lake_warp`; a long lake gets more
  bays along its length) and its radius rippled by a finer one: bays and points. A lake's bowl only where the ground is low
  (never into a plateau), 9 - 10 m deep in the middle, the ground round it eased down to its rim over 10 m; its surface only
  over its own bowl (the valley lake's outline reaching out over the sunk canyon drew a sheet of water in the air there), its
  shoreline a contour, not the grid: a field over the grid - negative in the water: the ground below the level, inside the
  outline, over the bowl, clear of the sunk canyon's edge - cut along its zero by marching squares, each crossing placed
  where the field crosses on its cell's edge, the surface fading out over the last stretch to the shore (the grid's staircase
  showed from above round the valley lake and river9's pools; sinkhole pools the same). A plunge pool, where the falls do not
  land in a lake, is one for all of a river's falls: 30 m + 0.42 x the drop across, within 60 - 150 m (`plunge_pool_min` /
  `max`), wide enough for all of them, its outline warped more gently, 8 m + 2% of the drop deep, and the next river starts
  in it. The canyon lake round pillar1 (water at 320.5 m; 260 x 840 m before the warp) fills the sunk canyon's floor from
  river6's step to past river2's falls; the valley lake round pillar4 (406.7 m, 360 x 540 m) stops 18 m short of the sunk
  canyon's edge, where the rim dips below its water, and fades out there; lake 3 round pillar2 (406.0 m, 330 x 450 m) takes
  river4's fall, river8 and river9. Plunge pools: 61 x 77 m (river3's 113 m fall), 113 x 180 m (the triple falls, 263 - 266
  m), 115 x 183 m (river7, 271 - 273 m), 69 x 114 m (river10, 135 - 136 m). Every sinkhole has a pool 6 m over its floor and
  10 m deeper in the middle, filling the floor - turquoise over the floor, dark only over the bowl. The surfaces
  (`shaders/region_water.gdshader`) take everything from their vertices and read no depth texture: clear turquoise in the
  shallows to teal in the deep, foam along the shores, streaming over the rapids and in a ring round each pillar, ripples
  moving with the flow.
  **Mist** in the deep canyon (`mist_deck`; the sunk canyon only - in the valleys it lay like snow at the walls' feet): big
  soft clouds on a jittered 34 m grid over the canyon's floor - one where the mist is thin, two where it is thick, higher
  (18 - 70 m over the floor), bigger and denser toward the canyon's middle, so its top is uneven - each swaying slowly to and
  fro along the canyon and breathing a little; soft all the way out and lumpy inside like the falls' spray, lit from above,
  see-through toward the walls, and soft wherever it meets rock, the ground or the water (`region_mist.gdshader` mode 3, the
  depth texture); the pillars and walls stand up through it. (A cloud deck - a grid raised into billowing puffs - read as
  snow and ice floes however it was shaded, and was dropped.) Godot's FogVolume needs the Forward+ renderer, this game runs
  the Mobile one. `shot.gd --waterdebug` tints the water by kind (green flat, yellow rapids, red falls) and hides the foam,
  spray and mist. Building it: the plan 2 - 3 s, the meshes ~25 s on a cool laptop; 310k triangles. Drawing it at 1920 x
  1080: 3.1 - 7.9 ms of GPU per frame (alternating pairs, `shot.gd --perfpairs`; before the revision 2.0 - 3.6 ms), most in
  ref4 (the triple falls' spray, river8) and ref3 (the canyon's clouds, the falls' spray).
- **Look** (phase 4A; `region_settings.gd` `greybox` off; the grass blades and trees, `vegetation`, come in phase 4B): the
  references' colours and mood, not their painting. **Rock** (`shaders/region_wall.gdshader`, one material for the walls,
  arches, supports, overhangs, pillars and sinkholes): pale limestone - big soft patches between a cool pale grey and a warm
  sandy grey, soft horizontal bands where the layers run, long vertical streaks of staining and darker runnels down the
  faces, all mapped triplanar in map coordinates (no stretching on any face; the finest detail fading out with the metres per
  pixel, no shimmer far off); undersides of overhangs and arches a little darker; darker, cooler, glossy and streaked beside
  and below every waterfall (the falls' lips and feet kept in the region's cache, `water_falls`, and passed to the material).
  The **talus** at the walls' feet is the same rock, darker and browner, the grass creeping up its flatter toe. **Grass**
  (`shaders/region_ground.gdshaderinc`, shared by the terrain and the rock's grassed tops so the carpet runs on over a lip
  without a seam): a lush saturated green in large soft patches - yellower sunlit meadows, deeper green hollows - over some
  400, 130 and 30 m and a fine mottle near the camera, wrapping well over the cliffs' rounded lips with a ragged edge. The
  warm and the cool come from the light: a warm sun lower and more to the side (31 degrees up, its azimuth kept: the layout
  is turned to it), the blue sky filling the shade (no black shadows). **Atmosphere** (`main.gd` `_region_atmosphere`): a
  strong blue haze (exponential fog, aerial perspective from the sky's colour, a little warm scatter toward the sun) that
  fades the far plateaus and the mountains; the sky (`shaders/sky_clouds.gdshader`) a deep blue overhead paling to the
  horizon, a soft sun in a warm glow, big soft stylized clouds - heaped, their tops lit from the sun's side, their bellies a
  cool blue-grey, thinning into the haze toward the horizon; still (no time), so the sky's light for the ambient and the
  reflections is worked out once. Frame time at 1920 x 1080 with the look (alternating pairs, shot.gd --perfpairs; this
  laptop, its CPU kept busy by other apps part of the time, which slows its shared GPU): 57 - 72 ms per frame (14 - 18 fps),
  17 - 22 ms more than the greybox of phase 3 (38 - 50 ms) - the walls 6.6 - 14 ms (2.6 - 6.9 in greybox: the limestone's
  noise, looked up only on the projection planes a face uses), the carved rock 3.3 - 6.2, the water 3.7 - 10.4, the terrain
  up to 11.5, MSAA 2x 14 - 18, the shadows 3.8 - 5.5, the sky and post-processing a fixed 10 - 11 (the clouds at half
  resolution; per pixel at full resolution they cost 3 - 5 ms more). MSAA off, a 67% render scale (FSR), the sea off and
  smaller shadow maps: 25 - 30 ms (33 - 40 fps). Before the grass and trees: MSAA (FXAA instead) and the render scale first,
  then the rock's detail far away (its colour baked into the meshes, or a cheaper far shader) and the wet rock worked out
  once into the meshes instead of per vertex every frame.
- **Bookmarks:** 4 cameras after the reference pictures (`bookmark_views`, in layout coordinates; an 8th number puts the
  camera that far in from the nearest rim) - ref1 on a terrace's rim looking along its cliff line, the drop on the left,
  overhang1 jutting out ahead, the stacked terraces and the mountains beyond (placed with a planner over the exported
  heightmap),
  ref2 high over the island plateau looking across the valley at the stacked plateau, ref3 on a rim looking down the canyon,
  ref4 from the air down the valley past arch1 and a sinkhole. F6-F9 in the game, F10-F12 the arches, Page Up / Down every
  carved feature; `shot.gd --bookmark=ref1`. An 8th number puts
  the camera at the visible rim (the top of the wall's face) nearest its spot, a 9th makes it look along that rim.
- **Cost:** ~195 s to generate in the region test, on mains power (the carving 138 s of it, baked one feature after another
  there; the game bakes them side by side on all cores), then cached in `user://terrain/region_*.bin`. On battery Windows
  slows background processes 6 - 8 times.
- **Frame time at real resolutions** (`shot.gd --perf`, the game windowed off-screen): at the start of the revision (the
  phase 3 water as delivered), each setting run once at the four bookmarks at 1920 x 1080: 48 - 67 ms per frame (15 - 21
  fps) - single runs drift by up to 10 ms as the laptop heats (some parts came out negative), so after the revision every
  part was measured in alternating pairs (`shot.gd --perfpairs`: the whole, the whole without that part, the whole, ...):
  38 - 50 ms (20 - 26 fps). MSAA 2x 12 - 16 ms, the terrain 3 - 10 ms, the water 3 - 8 ms, the walls 3 - 7 ms, the sun's
  shadows 3.5 - 6 ms, the carved features 1.3 - 3.2 ms, the sea 1 - 2 ms behind the land (11 - 16 ms with the land hidden,
  when it covers the screen), the sky, the clear and the post-processing a fixed 9 ms. MSAA off, a 67% render scale (FSR),
  the sea off and smaller shadow maps: 16 - 20 ms (49 - 62 fps). At 2560 x 1410 (phase 3 step 0, before the water) 69 - 105
  ms. What to cut first below 60 fps: MSAA (FXAA instead), then the render scale (67 - 75% with FSR), then the terrain's far
  rings and the shadow maps; the water's spray and clouds come next (fewer, smaller billboards far off).
- **Frame time** (`shot.gd --perf`, this laptop: Intel HD 520, 1280 x 720, greybox, at the four bookmarks; each group's share
  = the GPU time saved by hiding it): 20.5 - 25.6 ms per frame on the GPU (39 - 49 fps; before the LODs 24.2 - 31.1 ms, 32 -
  41 fps): the carved features 0.6 - 1.6 ms (before 3.2 - 5.5 ms; 0.07 - 0.20M primitives drawn instead of 0.58 - 0.79M), the
  walls 1.6 - 3.8 ms, the terrain 1.7 - 5.2 ms, MSAA 2x 5 - 7 ms, the sun's shadows 2.5 - 3 ms, and 9 - 11 ms that stay with
  the land hidden (sky, sea, post-processing). At the bookmarks' own portrait size (585 x 1040) 55 - 66 fps. 60 fps at 1280 x
  720 on this GPU after phase 4 (materials, grass, water, fog) needs about 6 ms found: MSAA off (or FXAA), render scale ~75%
  with FSR, and grass and water budgeted at a few ms each; the full-resolution, MSAA, greybox scene is already over 16.7 ms.
- **Tools:** `scripts/tools/region_test.gd` (generator alone: report with the plateau table, gaps, terrace depths and wall
  heights, every carved feature's size, bake time (baked one after another there) and triangles, the water's rivers, falls (with
  their ray check) and lakes; writes the game's cache,
  `region_map.png`, `region_data.json` with two height profiles and every feature's camera views, and the raw heights and
  level grid `region_h.bin` / `region_lv.bin` for planning cameras outside the game), `region_walk_test.gd` (the hero walks
  up a ravine onto a plateau, into the tallest wall, through the biggest arch's opening, across its top and out along a
  support's slab), `arch_measure.gd` (every arch's clear opening measured with rays through the final baked mesh, against its
  target, flagged when more than 15% off; a picture of the opening per arch), `pick_probe.gd` (which mesh a screenshot's
  pixel shows; `abs:` for a bookmark's camera, a 4th number for a LOD), `shot.gd --perf=N` (the GPU's time with each group
  hidden in turn) and `--hide=carved,lods,walls,terrain,shadows` (to tell what a pixel is), `region_seam_probe.gd` (carved
  rock tops standing above the grass, per feature: rings and slabs that would show, wall ends at a carved box with nothing
  behind them, wedges between wall pieces), `region_height_probe.gd` (Terrain3D's heights against the region's, in the
  running game), `surround_probe.gd` (the base terrain round the region, per direction), `deck_probe.gd` (an arch's walkable
  top along its axis against the terrain), `region_probe.gd` (level, height and nearest edge at layout points - for placing
  cameras), `region_scan.gd` (single-tier 4 km windows); `shot.gd --overview=region`.
- **Next phase:** 4 materials,
  vegetation, sky, performance.

## Layout

- `scripts/world/base_terrain_config.gd`, `base_terrain_gen.gd`, `terrain_world.gd`, `floating_origin.gd`: the terrain (above);
  `region_settings.gd`, `tepui_region.gd`: the tepui region (above; its walls drawn with `shaders/region_wall.gdshader`);
  `terrain_config.gd`, `terrain_gen.gd`: the old continent (off)
- `scripts/world/foliage.gd`: trees per 256 m cell (instanced, 3 distance levels; off for now); `proc_meshes.gd` builds the meshes
- `scripts/world/grass.gd`: grass blades round the hero; `ocean.gd`: the sea
- `scripts/player/`: the hero, the camera, and `rig_anim.gd` (code-driven idle/walk/run/sprint/jump for metarig skeletons)
- `shaders/`: terrain, trees, grass, water
- `scripts/ui/`: the menus (`menu.gd`) and the saved settings (`settings.gd`, autoload `Settings`)
- `scripts/tools/shot.gd`: automated screenshots and timing (see the file); `ui_flow_test.gd`: walks the menus by pressing
  their buttons and checks each step

## Credits

- Heroes: This work is based on "Low Poly Male Character [Free Download]"
  (https://sketchfab.com/3d-models/low-poly-male-character-free-download-634469944b1f4778940da77b72deb439) by alicewithalex
  (https://sketchfab.com/alicewithalex) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). The female
  hero is that model reshaped in code (changes made: body, hair, ponytail, top).
- Terrain: Terrain3D by Cory Petkovsek, Roope Palmroos and contributors (MIT, `addons/terrain_3d/LICENSE.txt`)
- Title screen: the painting from the browser Kingsgaard (painted in code, `tools/menu-art` in the HTML repo); fonts Cinzel and
  Cormorant Garamond from Google Fonts, SIL Open Font License 1.1 (`assets/fonts/*-OFL.txt`)
