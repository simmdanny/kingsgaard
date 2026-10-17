# Art presets: A_current vs B_stylized

F9 in game switches between them; `--compare=DIR` on a screenshot run renders the comparison views (scripts/tools/shot.gd).
Everything not listed here is the same in both: terrain shape, placement of trees and grass, the hero, gameplay, the boulders' stone
(`art/stone.tres`, the browser game's) and the project settings.

## WorldEnvironment (`art/*/environment.tres`)

| Setting | A_current | B_stylized |
|---|---|---|
| Sky | ProceduralSkyMaterial: top (0.30, 0.52, 0.82), horizon (0.72, 0.82, 0.90), ground (0.36, 0.46, 0.52) | sky shader `shaders/b/sky_b.gdshader`: zenith (0.15, 0.39, 0.82) to a hazier horizon (0.68, 0.81, 0.94), warm sun glow and disc, soft clouds (cover 0.42) lit on the sun's side |
| Sky radiance size | 256 (default) | 128 |
| Ambient light | sky, energy 0.65 | sky, energy 0.80 (the blue sky makes it cool) |
| Tonemap | Filmic, exposure 1.0 | ACES, exposure 1.0 (AgX tried first: washed out) |
| Fog | exponential, density 0.00016, colour (0.70, 0.79, 0.88), aerial perspective 0.6, sky affect 0 | exponential, density 0.00018, colour (0.74, 0.84, 0.94), aerial perspective 0.3, sky affect 0.12, sun scatter 0.12 |
| Height fog | off | fog height 18 m, height density 0.012 (valleys) |
| SSAO | off | on: radius 1.2, intensity 1.1, power 1.4, light affect 0.1 (works only on Forward+ / Compatibility, not on the Mobile renderer the project uses) |
| Glow | off | on: intensity 0.25, strength 0.9, HDR threshold 1.15, soft light blend, no bloom |
| Adjustments | off | on: contrast 1.03, saturation 1.03 |

## Sun (DirectionalLight3D, `art/*.tres`)

| Setting | A_current | B_stylized |
|---|---|---|
| Rotation | (-38, -35, 0): 38 degrees up | (-42, -62, 0): 42 degrees up, more from the side |
| Colour | (1.00, 0.96, 0.88) | (1.00, 0.89, 0.72) warmer |
| Energy | 1.25 | 1.55 |
| Angular distance | 0 | 1.2 degrees (shadows soften away from their caster) |
| Shadow blur | 1.5 | 1.2 |
| Shadow bias / normal bias | 0.1 / 2.0 | 0.06 / 1.6 |
| Shadow max distance | 90 m | 110 m |

## Materials and meshes

| Thing | A_current | B_stylized |
|---|---|---|
| Ground | `shaders/terrain.gdshader`: grass (0.37, 0.55, 0.21), meadow (0.52, 0.62, 0.25), forest (0.23, 0.34, 0.15), value noise | `shaders/b/terrain_b.gdshader`: the browser game's meadow ramp of five greens with broad patches and clover clumps (`shaders/inc/meadow.gdshaderinc`), meadows +0.10 lighter, forest -0.20 darker with soft dusty earth patches (0.36, 0.33, 0.20), the boulders' stone on slopes past 0.30-0.50 (`stone_slope`, triplanar), painted strokes off (`strokes` 0) |
| Trees | faceted low-poly (`proc_meshes.gd` broadleaf / conifer), one colour per face, `shaders/tree.gdshader` | smooth clumped crowns (`broadleaf_b` / `conifer_b`: about 650 / 150 / 30 triangles for the three levels, normals bent toward the crown's middle, gradient colours, baked AO), `shaders/b/tree_b.gdshader` with AO and backlight |
| Grass blades | `shaders/grass.gdshader`, A ground colours, tip (0.78, 0.86, 0.42) | `shaders/b/grass_b.gdshader`: grass (0.37, 0.56, 0.13), meadow (0.45, 0.63, 0.15), forest (0.22, 0.40, 0.10), tip (0.66, 0.76, 0.27), darker base (x0.68) with soft AO, normals 85 % up, wind x0.7 |
| Water | shallow (0.26, 0.80, 0.76), deep (0.06, 0.27, 0.45) blue | shallow (0.24, 0.82, 0.76) turquoise, deep (0.04, 0.40, 0.46) teal |
| Boulders | `art/stone.tres` (the browser game's stone) | the same |
