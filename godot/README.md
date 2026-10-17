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

## Tepui region (phase 1 of 4: landform blockout)

The first region, built on the base terrain: a tepui / plateau land of sheer-walled table mountains
(`scripts/world/tepui_region.gd`, every key value in `region_settings.gd` - a `RegionSettings` resource; seeded, same seed +
settings = same region). Greybox for now: flat grass-green ground and pale grey walls, no grass, no paths or buildings.
- **Where:** a 4 x 4 km square centred on map (4000, -1496), picked automatically: the most highland / high-plateau ground
  (56% / 43%) with mountains in view, its floor at ~402 m. The base terrain stays as the floor - flattened toward the region's
  median height inside and back to the base terrain across a 380 m noisy border, so the edge blends in.
- **Plateaus:** three levels about 150 / 300 / 450 m above the floor (shares of the region: floor 42%, 21%, 26%, 11%), 4 + 3 + 3
  plateau pieces, stacked as terraces; outlines domain-warped with bays and peninsulas; flat tops with gentle rolling hills. A
  wide valley (650-1050 m) runs across the region and 3 canyons (110-300 m wide) cut into the plateaus.
- **Walls:** separate meshes along every level's edge contour (marching squares, 8 m columns, 10 m rows, 48 columns a piece):
  42.9 km of wall, 186 pieces, 173k vertices / 323k triangles; heights median 169 m, 10% under 140, 90% under 311, tallest
  451 m. Large-scale variation: curvature, buttresses, grooves, setbacks, a slight taper. Trimesh collision. Under each wall the
  terrain is pulled down steeply to its foot rather than cut with Terrain3D holes: holes remove whole coarse triangles at far
  clipmap levels and showed gaps from afar (`cut_holes` still switches them on).
- **Walking routes:** rock spurs leaning on the walls - a 52 m wide grassy crest climbing at 25 degrees from the ground below to
  a plateau's top, with sheer sides - at least 2 per plateau piece (20 in all), placed level by level only where the walker
  already arrives. The generator checks itself: each spur walked over 8 m cells, every plateau of every level reached on foot
  from the floor (all 20 spurs and all 10 plateaus pass).
- **Bookmarks:** 4 cameras that recreate the 4 reference paintings' compositions (`bookmark_views`: position, height above
  ground, target, field of view) - ref1 stacked terraces seen from a ledge, ref2 over plateaus across the valley, ref3 down a
  canyon, ref4 from the air. F6-F9 in the game; `shot.gd --bookmark=ref1`.
- **Cost:** ~32 s to generate on the laptop the first time, then cached in `user://terrain/region_*.bin`; 61-82 fps at the
  bookmarks (greybox, laptop).
- **Tools:** `scripts/tools/region_test.gd` (generator alone: report, spurs, canyons, bookmarks, writes the game's cache and
  `shots/region/region_map.png`), `region_walk_test.gd` (the hero walks up a spur onto a plateau and into a 441 m wall),
  `region_scan.gd` (scores 4 km windows for the region's place); `shot.gd --overview=region`.
- **Next phases:** 2 overhangs, arches, pillars, sinkholes; 3 rivers, waterfalls, lakes, mist; 4 materials, vegetation, sky,
  performance.

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
