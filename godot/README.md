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

## Tepui region (phases 1, 2A, 2B done; erosion pass)

The first region, built on the base terrain: a land of tables - a flat floor, six big flat-topped plateaus standing on it
(two of them stacked in terraces), sheer walls, narrow canyons and a wide valley (`scripts/world/tepui_region.gd`, every key
value in `region_settings.gd` - a `RegionSettings` resource; seeded, same seed + settings = same region). Greybox for now:
flat colours (the ground a little lighter the higher it is), pale grey walls, no grass, no paths or buildings.
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
  (vertex colour: the lips), so the faces and the rubble stay rock.
- **Carved features** (phases 2A, 2B): rock that a heightmap cannot hold, each a signed distance volume over a box of its
  own (positive inside the rock), meshed at bake time with surface nets (2.5 m voxels; three smoothing passes, then every
  vertex put back onto the surface, normals from the volume's gradient blended across cells), trimesh collision, the walls'
  material. Where a box cuts through walls (arches, supports, overhangs) the rock there is the plateau as the walls build it
  - its plan from its level's edge, the face 9 m out, the rock's top over the edge, the foot under the ground - so the walls
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
    is the walkable bridge.
  - **pillars under plateau sections** (`arches`, kind 2, "supports"): a fin's outer part hollowed out under a slab (a
    share of its height thick) standing on two elephant legs - thick, flared and toed at the foot, lobed, wrinkled - joined
    to the slab through rounded vaults; the slab's top is walkable.
  - **overhangs** (`overhangs`): a stretch of a plateau's edge whose top juts 14 - 24 m out past the wall, the wall under it
    undercut, drips hanging under the lip (long downward cones), fading back to the plain wall at both ends; grass on the lip.
    One stands in front of the ref1 camera, as in ref_1.
  - **pillars** (`pillars`): freestanding elephant legs in the canyons and the valley, 140 - 236 m tall, 76 - 100 m across at
    the foot: a broad toed foot, leaning, a bulge, lumpy at two scales, lobed, grooved, rubble round the foot; two carry a cap
    of plateau with grass on it.
  - **sinkholes** (`sinkholes`): round holes 50 - 110 m across and 90 - 140 m deep down from a plateau's top, sheer inside
    (the top a little overhanging), the heightmap's own flat floor at the bottom with rubble round its edge (water comes in
    phase 3). Shift + F10 / F11 / F12 in the game.
  Bake time (one after another, on mains power) and triangles: arches 3.4 - 4.8 s (37k - 59k), pillars under plateau
  sections 9.0 / 15.1 s (73k / 113k), overhangs 2.8 - 5.8 s (30k - 60k), pillars 1.4 - 3.3 s (19k - 39k), sinkholes
  0.7 - 1.7 s (15k - 32k); 61 s in all. Checked by `region_seam_probe.gd`: every wall end at a carved box has rock behind
  it, no rock top shows above the grass outside the rims.
  Bookmarks: one per feature (`arch1`, `support1`, `overhang1`, `pillar1`, `sinkhole1`, ...; Page Up / Page Down in the
  game, `shot.gd --bookmark=pillar2`), each from a spot the generator finds open (nothing in the line of sight).
- **Ways up:** ravines cut into the plateaus' edges, two per plateau piece and level (18 in all): a 90 m wide slot whose floor
  climbs at 30 degrees from the ground in front to the top, between sheer sides; the ramp starts where the edge crosses the
  slot's mouth furthest in, so the ground meets it level all across. Placed out of the bookmarks' views where possible. The
  generator walks each one and checks every plateau piece is reached on foot from the floor.
- **Bookmarks:** 4 cameras after the reference pictures (`bookmark_views`, in layout coordinates; an 8th number puts the
  camera that far in from the nearest rim) - ref1 on a terrace's rim looking along its cliff line, the drop on the left,
  overhang1 jutting out ahead, the stacked terraces and the mountains beyond (placed with a planner over the exported
  heightmap),
  ref2 high over the island plateau looking across the valley at the stacked plateau, ref3 on a rim looking down the canyon,
  ref4 from the air down the valley past arch1 and a sinkhole. F6-F9 in the game, F10-F12 the arches, Page Up / Down every
  carved feature; `shot.gd --bookmark=ref1`. An 8th number puts
  the camera at the visible rim (the top of the wall's face) nearest its spot, a 9th makes it look along that rim.
- **Cost:** ~107 s to generate in the region test, on mains power (the carving 61 s of it, baked one feature after another
  there; the game bakes them side by side on all cores - 28 s instead of 51 s when measured), then cached in `user://terrain/region_*.bin`. On battery Windows slows background
  processes 6 - 8 times.
- **Tools:** `scripts/tools/region_test.gd` (generator alone: report with the plateau table, gaps, terrace depths and wall
  heights, every carved feature's size, bake time (baked one after another there) and triangles; writes the game's cache,
  `region_map.png`, `region_data.json` with two height profiles and every feature's camera views, and the raw heights and
  level grid `region_h.bin` / `region_lv.bin` for planning cameras outside the game), `region_walk_test.gd`
  (the hero walks up a ravine onto a plateau, into the tallest wall, through the biggest arch's opening, across its top and
  out along a support's slab), `region_seam_probe.gd` (carved rock tops standing above the grass, per feature: rings and
  slabs that would show, wall ends at a carved box with nothing behind them, wedges between wall pieces), `region_height_probe.gd`
  (Terrain3D's heights against the region's, in the running game), `surround_probe.gd` (the base terrain round the region,
  per direction), `deck_probe.gd` (an arch's walkable top along its axis against the terrain), `region_probe.gd` (level, height and nearest edge
  at layout points - for placing cameras), `region_scan.gd` (single-tier 4 km windows); `shot.gd --overview=region`.
- **Next phases:** 3 rivers, waterfalls, lakes, mist; 4 materials,
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
