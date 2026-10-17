extends Resource
## AN ART STYLE PRESET (scripts/world/art_preset.gd): everything that makes the landscape look the way it does, in one resource -
## the WorldEnvironment (sky, tone mapping, fog, SSAO, glow, adjustments), the sun, the materials of the ground, trees, grass, water
## and rock, and which tree meshes to build. main.gd applies one with apply_preset(); F9 switches between them in game.
##   art/A_current.tres  - the look as it was (the low-poly, one colour per facet look)
##   art/B_stylized.tres - the stylized 3D look of ART_STYLE.md
## Each preset's Environment and materials are their own .tres files beside it (art/<preset>/), so they open and tune in the editor.

@export var title := ""
@export var environment: Environment

@export_group("Sun")
@export var sun_rotation_degrees := Vector3(-38.0, -35.0, 0.0)
@export var sun_color := Color(1.0, 0.96, 0.88)
@export var sun_energy := 1.25
## the sun's apparent size in degrees: above 0 the shadows soften with distance from their caster
@export var sun_angular_distance := 0.0
@export var sun_shadow_blur := 1.5
@export var sun_shadow_bias := 0.1
@export var sun_shadow_normal_bias := 2.0
@export var sun_shadow_max_distance := 90.0

@export_group("Materials")
@export var terrain_material: Material
@export var tree_material: Material
@export var grass_material: Material
@export var water_material: Material
## the boulders' material (scripts/world/boulders.gd): the browser game's stone (art/stone.tres) in both presets
@export var rock_material: Material
## which tree meshes scripts/world/proc_meshes.gd builds: 0 faceted low-poly, 1 stylized smooth clumps
@export_enum("Faceted", "Stylized") var tree_meshes := 0
