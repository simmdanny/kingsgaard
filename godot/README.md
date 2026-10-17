# Kingsgaard (Godot)

The native Windows rebuild of the browser game, in Godot 4.7.2 (GDScript, Mobile renderer).

One large island - a continent of five height tiers (coast, lowlands, highlands, plateaus, peaks) with cliffs between them,
walkable passes through them and river valleys down them - forests, meadows, the sea and the sky, two heroes to walk it,
the title screen and menus.

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
| F2 / F3 / F4 | terrain maps: heights / tiers / slopes (again = back) |
| Esc | pause menu / back |

## Terrain

Terrain3D 1.0.2 (`addons/terrain_3d`, MIT, Windows binaries only) draws and collides; the heightmap is generated in script.
- **Map:** 4096 x 4096 samples at 2.5 m = 10.24 km square (16 Terrain3D regions of 1024 samples), the continent about
  8-9 km across in the sea. Big enough to take ~20 minutes to cross on foot with 600 m of relief; small enough to generate
  in ~40 s and run at 35-45 fps on the laptop (Intel HD 520). All of it is in `scripts/world/terrain_config.gd`.
- **LOD:** Terrain3D's clipmap, mesh size 48, 7 rings: 2.5 m cells for the first 120 m round the camera, each ring doubling,
  the last (160 m cells) beyond the map's edge - the whole continent always drawn, detail only where it is seen.
- **Collision:** `DYNAMIC_GAME`, built by Terrain3D from the same heightmap in 16-sample pieces within 72 m of the camera
  (tested: rays hit within 2.4 cm of the heightmap). The hero is a CharacterBody3D with `floor_max_angle` 35 degrees.
- **Generator** (`scripts/world/terrain_gen.gd`, seeded; same seed + settings = same world): on a 10 m planning grid, a
  domain-warped tier field cut into five tiers by land share; across each tier edge the height steps over a width in metres -
  narrow cliffs (70 degrees) on most of it, straight 22 degree ramps in pass zones (at least 2 working per region, plus a
  spare); rolling hills scaled by tier, ridged crests in the peaks; 9 rivers traced down the tiers in order (they never climb)
  carve valleys with a floor that only descends (waterfalls at the cliffs); passes relaxed to stay walkable; then upsampled to
  2.5 m with small bumps. It checks itself: every pass walked foot to top on cells under 32 degrees, every region of every
  tier reached from the lowlands. Cached in `user://terrain` (one file per seed + settings; delete it to regenerate).
- **Look** (`shaders/terrain3d.gdshader`, from Terrain3D's minimum shader): the game's grass colours on gentle ground, warm
  painted stone on steep ground, sand at the shore, snow high on the peaks; the debug maps on F2-F4.
- **Tools:** `scripts/tools/terrain_test.gd` (generator alone: report + quick maps), `terrain_walk_test.gd` (collision rays,
  a pass walked up, a cliff walked into), `poi_profile.gd` (ground along the screenshot views), `t3d_probe.gd` (Terrain3D's
  API); `shot.gd` options `--overview`, `--view=height|tiers|slope`, `--poi=low|edge|pass`.

## Layout

- `scripts/world/terrain_config.gd`, `terrain_gen.gd`, `terrain_world.gd`: the terrain (above)
- `scripts/world/foliage.gd`: trees per 256 m cell (instanced, 3 distance levels); `proc_meshes.gd` builds the meshes
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
