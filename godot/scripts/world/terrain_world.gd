extends Node3D
## THE TERRAIN IN THE WORLD (scripts/world/terrain_world.gd): makes the heightmap with terrain_gen.gd on a background thread -
## or loads it from the cache (user://terrain, one file per seed + settings) - and hands it to Terrain3D, which draws it as a
## clipmap (fine round the camera, coarser rings further out, the whole map always visible) and builds collision from the
## same heights round the camera. Debug views (set_debug_view): 0 the game look, 1 heights, 2 tiers, 3 slopes.
##
## LOD and collision: vertex spacing 2.5 m; mesh_size 48 with 7 LOD rings - LOD0 is 120 m of 2.5 m cells round the camera,
## each ring doubles the cell, the outermost (160 m cells) reaches past the map's edge. Collision is DYNAMIC_GAME: built from
## the heightmap itself (so it matches exactly) in 16-sample pieces within 72 m of the camera, rebuilt as the camera moves.

const TerrainConfig := preload("res://scripts/world/terrain_config.gd")
const TerrainGen := preload("res://scripts/world/terrain_gen.gd")
const CACHE_DIR := "user://terrain"
const MESH_SIZE := 48
const MESH_LODS := 7
const COLLISION_RADIUS := 72
const COLLISION_SHAPE := 16

var cfg
var gen
var terrain: Terrain3D
var camera: Camera3D
var ground := {}
var debug_view := 0
var stage := "starting"

var _thread: Thread
var _imported := false


func _ready() -> void:
	if cfg == null:
		cfg = TerrainConfig.new()
	gen = TerrainGen.new(cfg)
	terrain = Terrain3D.new()
	terrain.name = "Terrain3D"
	# (Terrain3D makes its material and data when it enters the tree: add it first, then set it up)
	add_child(terrain)
	terrain.region_size = cfg.region_size
	terrain.vertex_spacing = cfg.vertex_spacing
	terrain.mesh_size = MESH_SIZE
	terrain.mesh_lods = MESH_LODS
	terrain.collision_mode = Terrain3DCollision.DYNAMIC_GAME
	terrain.collision_radius = COLLISION_RADIUS
	terrain.collision_shape_size = COLLISION_SHAPE
	terrain.material.world_background = Terrain3DMaterial.NONE
	# (with no texture assets Terrain3D turns its checkered debug view on, which draws over any shader)
	terrain.material.show_checkered = false
	# the game's own terrain shader: set the shader, then switch the override on and rebuild the material
	terrain.material.shader_override = load("res://shaders/terrain3d.gdshader")
	terrain.material.shader_override_enabled = true
	terrain.material.update()
	if camera != null:
		terrain.set_camera(camera)
	_thread = Thread.new()
	_thread.start(_build)


## the background thread: the cached world if there is one for these settings, else a fresh one (then cached)
func _build() -> void:
	var key: String = cfg.cache_key(TerrainGen.VERSION)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(CACHE_DIR))
	var path := "%s/world_%d_%s.bin" % [CACHE_DIR, cfg.seed_value, key]
	stage = "loading the cached continent"
	if gen.load_cache(path):
		return
	stage = "forging the continent"
	gen.generate()
	# keep the cache small: only this world's file stays
	for f in DirAccess.get_files_at(CACHE_DIR):
		if f.begins_with("world_") and f.ends_with(".bin"):
			DirAccess.remove_absolute(ProjectSettings.globalize_path(CACHE_DIR + "/" + f))
	gen.save(path)


func is_idle() -> bool:
	return _imported


func _process(_dt: float) -> void:
	if _imported or _thread == null or _thread.is_alive():
		return
	_thread.wait_to_finish()
	_thread = null
	terrain.data.import_images([gen.height_img, null, gen.color_img], Vector3(gen.origin, 0.0, gen.origin), 0.0, 1.0)
	gen.height_img = null
	gen.color_img = null
	var m := terrain.material
	for k in ground:
		m.set_shader_param(k, ground[k])
	m.set_shader_param("walk_angle", cfg.max_walk_angle)
	m.set_shader_param("cliff_angle", cfg.cliff_threshold)
	m.set_shader_param("debug_view", debug_view)
	_imported = true
	print("terrain: %s" % JSON.stringify(gen.report))


func set_debug_view(v: int) -> void:
	debug_view = v
	if terrain != null:
		terrain.material.set_shader_param("debug_view", v)


func _exit_tree() -> void:
	if _thread != null and _thread.is_started():
		_thread.wait_to_finish()
