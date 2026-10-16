# Kingsgaard (Godot)

The native Windows rebuild of the browser game, in Godot 4.7.2 (GDScript, Mobile renderer).

**Phase 1:** one large island (a continent, about 22 km across) with plains, meadows and forests, the sea and the sky,
two heroes to walk it, the title screen and menus.

## Set up on another PC

The game lives in the `godot/` folder of github.com/simmdanny/kingsgaard (apart from the browser game's files).
1. Get the repo: `git clone https://github.com/simmdanny/kingsgaard` (later: `git pull` for updates), or Code > Download ZIP.
2. Get Godot 4.7.2: "Godot Engine - Windows" (the standard one, not .NET) from https://godotengine.org/download/windows/
   (older versions: https://godotengine.org/download/archive/), unzip it to `C:\Godot` (or set the `GODOT` environment
   variable to the .exe).
3. Optional, the female hero: her model is not in the public repo (no license) - see `assets/characters/girl01/SOURCE.md`
   (a free download, two files). Without it the Female button plays as Female B.
4. Double-click `godot/Play Kingsgaard.bat`. The first start imports everything (a minute); later starts take seconds.
   Or open `godot/project.godot` in the Godot editor and press F5.

## Play

Double-click `Play Kingsgaard.bat` (it finds Godot 4.7.2 as above). The title screen has Play,
Settings (window, vsync, render scale, shadows, grass, tree distance, mouse sensitivity, info overlay - saved in
`user://settings.cfg`), Controls, Credits and Quit; Esc in the game opens the pause menu. Play asks for the hero: Female is DBlob_UA's Low_poly_Girl_01v1 (see `assets/characters/girl01/SOURCE.md`), Male is alicewithalex's Low Poly Male Character (see `assets/characters/male01/SOURCE.md`). Both are animated in code
(`scripts/player/rig_anim.gd`).

| Key | Action |
| --- | --- |
| W A S D / arrows | move (relative to the camera) |
| Shift / Alt | run / sprint |
| Space | jump |
| mouse drag, wheel | turn the camera, zoom |
| F | fly over the land (Space up, Ctrl down, Shift x5, Alt x25); F again lands the hero under the camera |
| F1 | info: fps, position, streaming counters |
| Esc | pause menu / back |

## Layout

- `scripts/world/world_gen.gd`: the continent as a pure function of (seed, x, z): the coast, heights, ground cover
- `scripts/world/terrain.gd`: quadtree terrain chunks streamed round the camera, built on worker threads
- `scripts/world/foliage.gd`: trees per 256 m cell (instanced, 3 distance levels); `proc_meshes.gd` builds the meshes
- `scripts/world/grass.gd`: grass blades round the hero; `ocean.gd`: the sea
- `scripts/player/`: the hero, the camera, and `rig_anim.gd` (code-driven idle/walk/run/sprint/jump for metarig skeletons)
- `shaders/`: terrain, trees, grass, water
- `scripts/ui/`: the menus (`menu.gd`) and the saved settings (`settings.gd`, autoload `Settings`)
- `scripts/tools/shot.gd`: automated screenshots and timing (see the file); `probe.gd`: prints places worth a look;
  `ui_flow_test.gd`: walks the menus by pressing their buttons and checks each step

## Credits

- Female hero: "Low_poly_Girl_01v1" by DBlob_UA - https://dblob-ua.itch.io/low-poly-girl-01v1 (no license stated; ask before publishing)
- Male hero: This work is based on "Low Poly Male Character [Free Download]"
  (https://sketchfab.com/3d-models/low-poly-male-character-free-download-634469944b1f4778940da77b72deb439) by alicewithalex
  (https://sketchfab.com/alicewithalex) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- Title screen: the painting from the browser Kingsgaard (painted in code, `tools/menu-art` in the HTML repo); fonts Cinzel and
  Cormorant Garamond from Google Fonts, SIL Open Font License 1.1 (`assets/fonts/*-OFL.txt`)
