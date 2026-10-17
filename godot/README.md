# Kingsgaard (Godot)

The native Windows rebuild of the browser game, in Godot 4.7.2 (GDScript, Mobile renderer).

**Phase 1:** one large island (a continent, about 22 km across) with plains, meadows and forests, the sea and the sky,
two heroes to walk it, the title screen and menus.

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
`assets/characters/male01/SOURCE.md`), Female is the same model made feminine in code (`scripts/player/feminize.gd`). Both are
animated in code, hands and fingers included (`scripts/player/rig_anim.gd`).

| Key | Action |
| --- | --- |
| W A S D / arrows | move (relative to the camera) |
| Shift / Alt | run / sprint |
| Space | jump |
| mouse drag, wheel | turn the camera, zoom |
| F | fly over the land (Space up, Ctrl down, Shift x5, Alt x25); F again lands the hero under the camera |
| F1 | info: fps, position, streaming counters |
| F9 | switch the art preset: A_current / B_stylized (see `ART_STYLE.md`) |
| Esc | pause menu / back |

## Layout

- `scripts/world/world_gen.gd`: the continent as a pure function of (seed, x, z): the coast, heights, ground cover
- `scripts/world/terrain.gd`: quadtree terrain chunks streamed round the camera, built on worker threads
- `scripts/world/foliage.gd`: trees per 256 m cell (instanced, 3 distance levels); `proc_meshes.gd` builds the meshes
- `scripts/world/grass.gd`: grass blades round the hero; `ocean.gd`: the sea
- `scripts/world/boulders.gd`: the browser game's boulders (wboulder.js, rock look v59) - its fourteen stones (`art/stones/stones.res`,
  from `tools/stones/make_stones.py`, its generator ported line for line, baked by `scripts/tools/bake_stones.gd`) in its stone material
  (`shaders/stone.gdshader`, `art/stone.tres`), placed by its rules per 128 m tile, three levels by distance, a contact ring under each
- `scripts/player/`: the hero, the camera, and `rig_anim.gd` (code-driven idle/walk/run/sprint/jump for metarig skeletons)
- `shaders/`: terrain, trees, grass, water (the current look); `shaders/b/`: the stylized look's terrain, trees, grass, sky and
  the one rock material (`shaders/inc/rock.gdshaderinc`, shared by rock props and the terrain's steep slopes)
- `art/`: the art presets (`scripts/world/art_preset.gd`): `A_current.tres` (the look as it was) and `B_stylized.tres` (the stylized
  3D look of `ART_STYLE.md`), each with its Environment and materials in `art/<preset>/` - open them in the editor to tune;
  F9 switches in game, `--preset=B_stylized` picks one for a screenshot run
- `scripts/ui/`: the menus (`menu.gd`) and the saved settings (`settings.gd`, autoload `Settings`)
- `scripts/tools/shot.gd`: automated screenshots and timing (see the file); `probe.gd`: prints places worth a look;
  `ui_flow_test.gd`: walks the menus by pressing their buttons and checks each step

## Credits

- Heroes: This work is based on "Low Poly Male Character [Free Download]"
  (https://sketchfab.com/3d-models/low-poly-male-character-free-download-634469944b1f4778940da77b72deb439) by alicewithalex
  (https://sketchfab.com/alicewithalex) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). The female
  hero is that model reshaped in code (changes made: body, hair, ponytail, top).
- Title screen: the painting from the browser Kingsgaard (painted in code, `tools/menu-art` in the HTML repo); fonts Cinzel and
  Cormorant Garamond from Google Fonts, SIL Open Font License 1.1 (`assets/fonts/*-OFL.txt`)
