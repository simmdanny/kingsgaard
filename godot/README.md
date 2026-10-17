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
| F10 / F11 / F12 | the region's arches (arch1-arch3) |
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
  (`route_path()`). First start ~80 s on the laptop, then cached in `user://terrain` (one file per seed + settings; delete it
  to regenerate) - later starts ~7 s.
- **Turned off, kept:** the old 10 km continent with its cliffs, passes and rivers (`terrain_gen.gd`, `terrain_config.gd`:
  `CLASSIC_TERRAIN` in `main.gd`), the forests, groves and lone trees (`foliage.gd`: `BIOME_SPAWNERS`), the stone, dirt, sand and
  snow ground (`biomes` in the terrain shader).
- **Look** (`shaders/terrain3d.gdshader`, from Terrain3D's minimum shader): one grass everywhere (the game's grass colour),
  a little uneven, shaded subtly by slope (deeper and warmer the steeper it is); debug maps on F2-F5.
- **Tools:** `scripts/tools/base_terrain_test.gd` (generator alone: report + quick maps, and writes the game's cache),
  `base_walk_test.gd` (collision rays, a route walked up along its path, an escarpment walked into, the floating origin),
  `poi_profile.gd` (ground along the screenshot views), `t3d_probe.gd` (Terrain3D's API); `shot.gd` options `--overview`,
  `--view=height|tiers|slope|steep`, `--poi=low|edge|mount`. (`terrain_test.gd` / `terrain_walk_test.gd`: the old continent.)

## Tepui region (phase 1 done, phase 2A: arches)

The first region, built on the base terrain: a land of tables - a flat floor, six big flat-topped plateaus standing on it
(two of them stacked in terraces), sheer walls, narrow canyons and a wide valley (`scripts/world/tepui_region.gd`, every key
value in `region_settings.gd` - a `RegionSettings` resource; seeded, same seed + settings = same region). Greybox for now:
flat colours (the ground a little lighter the higher it is), pale grey walls, no grass, no paths or buildings.
- **Where:** a 4 x 4 km square centred on map (4000, -1496), picked automatically: highland / high-plateau ground (56% / 43%)
  with mountains in view. The floor is flat at the island's middle height there (408 m, gentle swells of +-3 m) and blends
  back into the island's ground across a 280 m border band, so the region sits in the island without a seam. No 4 km
  window on the island lies on a single tier (`region_scan.gd`), so the floor is levelled rather than taken as it is.
- **A step function:** every 4 m height sample is on the floor or on a plateau's level, never between (except in the ways
  up), so at each edge the heightmap jumps the whole wall height from one sample to the next - flat top, straight drop, flat
  floor. Far from the camera Terrain3D's coarser rings would smear each step into a slope; the terrain shader moves those
  vertices onto the edge of their own terrace (a snap map: per sample, the nearest sample at its terrace's edge), so the
  steps stay steps at every distance; its normals ignore the jump, so tops and floors stay flat-shaded to the edge.
- **Plateaus:** six, from a list in the settings (layout position, radii, base level, stacked terraces): ellipses whose
  outlines are bent by a domain warp, big bays and headlands and smaller zig-zags; neighbours kept apart along their Voronoi
  border by a canyon (canyon pairs, 120 - 300 m wide) or a wider gap; the borders bend gently (no long straight canyon side).
  One canyon's floor is sunk 85 m below the valley's (`sunk_canyon`): 235 m deep, 165 - 195 m wide at the ref3 bookmark,
  with an 85 m step where it opens on the valley (for a waterfall later). Levels about 150 / 280 / 430 m above the floor (A, B, C;
  C only on B, so no wall is taller than about 290 m); stacked terraces at least 105 m deep (a true distance), measured 100 -
  230 m. Areas 0.3 - 1.8 km2. The layout's axis comes from the sun (the walls the bookmark views look at face it).
- **Walls:** separate meshes along every level's edge (marching squares, 8 m columns, 10 m rows, 48 columns a piece), each
  column snapped onto the exact edge: the face stands 9 m out from the terrain's step (so the step is always behind it),
  nearly vertical (3% batter), its foot 4 m into the ground, and a rock lip runs from the face's top edge back over the
  plateau's edge and under the grass - the plateau's edge is the rock's edge. Shapes: slow curvature, buttresses, broad
  flutes, fine grooves, setbacks at rock layers. Trimesh collision. Measured on every column: 85 - 282 m.
- **Arches** (phase 2A): rock fins sticking out from the walls (or necks between two plateau parts), added to the layout's
  fields from the settings (`arches`), with an opening carved through each: around the opening the rock is a signed
  distance volume - the fin as the walls have it (its plan from its level's edge, the face 9 m out, the rock lip, the foot
  under the ground), minus a tall, rounded, leaning, rough-edged opening that flares towards both mouths - meshed at bake
  time with surface nets (2.5 m voxels), smoothed, normals from the volume, trimesh collision. The walls stop at the
  carving's box and the carving reaches 18 m past it behind them (0.15 m back), with the walls' shapes calmed there, so the
  two meet on the same plain face; under the opening the ground is lowered and the carved rock's top is the walkable bridge.
  Three now: a huge one (a 276 m rock tongue from P3, opening 80 x 130 m, after ref_4) and two smaller (30 x 48 m,
  20 x 28 m); bake 0.8 - 2.5 s and 17k - 50k triangles each. Bookmarks arch1-3 (F10-F12): each from its sunlit side.
- **Ways up:** ravines cut into the plateaus' edges, two per plateau piece and level (18 in all): a 90 m wide slot whose floor
  climbs at 30 degrees from the ground in front to the top, between sheer sides; the ramp starts where the edge crosses the
  slot's mouth furthest in, so the ground meets it level all across. Placed out of the bookmarks' views where possible. The
  generator walks each one and checks every plateau piece is reached on foot from the floor.
- **Bookmarks:** 4 cameras after the reference pictures (`bookmark_views`, in layout coordinates; an 8th number puts the
  camera that far in from the nearest rim) - ref1 high on the stacked plateau's lowest terrace looking along its cliff line,
  ref2 high over the island plateau looking across the valley at the stacked plateau, ref3 on a rim looking down the canyon,
  ref4 from the air down the valley. F6-F9 in the game, F10-F12 the arches; `shot.gd --bookmark=ref1`. An 8th number puts
  the camera at the visible rim (the top of the wall's face) nearest its spot, a 9th makes it look along that rim.
- **Cost:** ~39 s to generate on the laptop the first time (the arches' bake ~4 s of it), then cached in `user://terrain/region_*.bin`; 65-79 fps at the
  bookmarks (greybox, laptop); walls 113k vertices.
- **Tools:** `scripts/tools/region_test.gd` (generator alone: report with the plateau table, gaps, terrace depths and wall
  heights, the arches' bake times; writes the game's cache, `region_map.png` and `region_data.json` with two height profiles
  and the arches' camera views), `region_walk_test.gd` (the hero walks up a ravine onto a plateau, into the tallest wall,
  through the biggest arch's opening and across its top), `region_probe.gd` (level, height and nearest edge
  at layout points - for placing cameras), `region_scan.gd` (single-tier 4 km windows); `shot.gd --overview=region`.
- **Next phases:** 2B overhangs, pillars, sinkholes (the same carving); 3 rivers, waterfalls, lakes, mist; 4 materials,
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
