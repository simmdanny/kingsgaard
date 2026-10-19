extends Node3D
## THE TERRAIN IN THE WORLD (scripts/world/terrain_world.gd): makes the heightmap on a background thread - or loads it from the
## cache (user://terrain, one file per seed + settings) - and hands it to Terrain3D, which draws it as a clipmap (fine round the
## camera, coarser rings further out, the whole island always visible) and builds collision from the same heights round the
## camera. Debug views (set_debug_view): 0 the game look, 1 heights, 2 tiers, 3 slopes, 4 the steep-edge mask.
##
## Two generators: the clean base terrain (base_terrain_gen.gd, the default: a 30 km island) and the older continent with cliffs,
## passes and rivers (terrain_gen.gd, 10 km - kept, switched off; main.gd's CLASSIC_TERRAIN turns it back on).
##
## Base terrain on Terrain3D: 8192 x 8192 samples at 4 m (a 32.8 km square) in regions of 1024 x 1024 samples (4.096 km) - an
## 8 x 8 grid, of which only the regions with land or shallows are made (open sea has none; the water covers it). All of them stay
## loaded: from a mountain the whole island is in view. Terrain3D's clipmap: mesh_size 48 and 8 LOD rings - 4 m cells for the
## first ~190 m round the camera, each ring doubling, the outermost 512 m cells reaching ~50 km, past the island's far side.
## Collision: DYNAMIC_GAME - built from the heightmap itself in 16-sample (64 m) pieces within 48 samples (192 m) of the camera.
## The floating origin (floating_origin.gd) moves the regions by whole region steps with shift_regions().

const TerrainConfig := preload("res://scripts/world/terrain_config.gd")
const TerrainGen := preload("res://scripts/world/terrain_gen.gd")
const BaseConfig := preload("res://scripts/world/base_terrain_config.gd")
const BaseGen := preload("res://scripts/world/base_terrain_gen.gd")
const TepuiRegion := preload("res://scripts/world/tepui_region.gd")
const CACHE_DIR := "user://terrain"
## the carved features' LODs: the full mesh up to LOD_BANDS[1] m from the camera, LOD1 to LOD_BANDS[2], LOD2 beyond, the bands
## meeting exactly. (No margin: as hysteresis it left a gap where a camera that started or jumped there between the lines
## found both neighbours hidden - no rock at all, the terrain's step showing in its place.)
const LOD_BANDS := [0.0, 450.0, 1400.0]
const LOD_MARGIN := 0.0

var cfg
var gen
## the region built on the base terrain (tepui_region.gd) and its settings (region_settings.gd); null = none
var region_cfg
var region
var walls: Node3D
var terrain: Terrain3D
var camera: Camera3D
var ground := {}
var debug_view := 0
var stage := "starting"
var base := true

var _thread: Thread
var _imported := false


func _ready() -> void:
	if cfg == null:
		cfg = BaseConfig.new()
	base = cfg is BaseConfig
	gen = BaseGen.new(cfg) if base else TerrainGen.new(cfg)
	terrain = Terrain3D.new()
	terrain.name = "Terrain3D"
	# (Terrain3D makes its material and data when it enters the tree: add it first, then set it up)
	add_child(terrain)
	terrain.region_size = cfg.region_size
	terrain.vertex_spacing = cfg.vertex_spacing
	terrain.mesh_size = 48
	terrain.mesh_lods = 8 if base else 7
	terrain.collision_mode = Terrain3DCollision.DYNAMIC_GAME
	terrain.collision_shape_size = 16
	terrain.collision_radius = 48 if base else 72
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
	var key: String = cfg.cache_key(BaseGen.VERSION if base else TerrainGen.VERSION)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(CACHE_DIR))
	var prefix := "base_" if base else "world_"
	var path := "%s/%s%d_%s.bin" % [CACHE_DIR, prefix, cfg.seed_value, key]
	stage = "loading the cached island"
	if not gen.load_cache(path):
		stage = "shaping the island"
		gen.generate()
		# keep the cache small: only this world's file stays
		for f in DirAccess.get_files_at(CACHE_DIR):
			if f.begins_with(prefix) and f.ends_with(".bin"):
				DirAccess.remove_absolute(ProjectSettings.globalize_path(CACHE_DIR + "/" + f))
		gen.save(path)
	# the region on top of it (cached on its own: its settings + the island's)
	if base and region_cfg != null and region_cfg.enabled:
		region = TepuiRegion.new(region_cfg, gen)
		var rpath := "%s/region_%d_%s.bin" % [CACHE_DIR, cfg.seed_value, region_cfg.cache_key(TepuiRegion.VERSION, key)]
		stage = "loading the region"
		if not region.load_cache(rpath):
			stage = "building the region"
			region.generate()
			for f in DirAccess.get_files_at(CACHE_DIR):
				if f.begins_with("region_") and f.ends_with(".bin"):
					DirAccess.remove_absolute(ProjectSettings.globalize_path(CACHE_DIR + "/" + f))
			region.save(rpath)
		region.apply()
		region.prepare_faces()


func is_idle() -> bool:
	return _imported


func _process(_dt: float) -> void:
	if _imported or _thread == null or _thread.is_alive():
		return
	_thread.wait_to_finish()
	_thread = null
	if base:
		_import_regions()
		if region != null:
			_build_walls()
	else:
		terrain.data.import_images([gen.height_img, null, gen.color_img], Vector3(gen.origin, 0.0, gen.origin), 0.0, 1.0)
		gen.height_img = null
		gen.color_img = null
	var m := terrain.material
	for k in ground:
		m.set_shader_param(k, ground[k])
	m.set_shader_param("walk_angle", cfg.max_walk_angle)
	m.set_shader_param("biomes", not base)
	m.set_shader_param("greybox", region != null and region_cfg.greybox)
	# the region's steps stay steps far away: the shader moves far vertices onto the edges of their terraces
	m.set_shader_param("snap_on", region != null)
	if region != null:
		m.set_shader_param("snap_map", region.snap_texture())
		m.set_shader_param("snap_origin", region.snap_origin())
		m.set_shader_param("snap_texels", float(region.fn))
		m.set_shader_param("greybox_floor", region.floor_h)
	if not base:
		m.set_shader_param("cliff_angle", cfg.cliff_threshold)
	m.set_shader_param("debug_view", debug_view)
	_imported = true
	print("terrain: %s" % JSON.stringify(gen.report))


## the base terrain's regions into Terrain3D: one Terrain3DRegion per 4.096 km square with land in it (its height and colour
## maps are the generator's own images, shared, not copied), then the texture arrays built once
func _import_regions() -> void:
	var t := Time.get_ticks_msec()
	var data := terrain.data
	var per: int = gen.regions_per_side
	var half := per / 2
	for ri in gen.region_heights.size():
		var hi = gen.region_heights[ri]
		if hi == null:
			continue
		var r := Terrain3DRegion.new()
		r.region_size = cfg.region_size
		r.vertex_spacing = cfg.vertex_spacing
		r.location = Vector2i(ri % per - half, ri / per - half)
		r.height_map = hi
		r.color_map = gen.region_colors[ri]
		# (holes cut under a region's walls)
		if ri < gen.region_controls.size() and gen.region_controls[ri] != null:
			r.control_map = gen.region_controls[ri]
		data.add_region(r, false)
	data.update_maps(Terrain3DRegion.TYPE_MAX, true, true)
	data.calc_height_range(true)
	gen.region_colors = []
	print("terrain: %d regions into Terrain3D in %.1f s" % [data.get_region_count(), (Time.get_ticks_msec() - t) / 1000.0])


## the region's walls: one mesh and one trimesh collision body per piece, under a node at the region's centre (which the
## floating origin moves with the terrain)
func _build_walls() -> void:
	var t := Time.get_ticks_msec()
	walls = Node3D.new()
	walls.name = "RegionWalls"
	add_child(walls)
	walls.position = Vector3(region.center.x - gen.offset.x, 0.0, region.center.y - gen.offset.y)
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/region_wall.gdshader")
	mat.set_shader_parameter("debug_view", debug_view)
	mat.set_shader_parameter("greybox", region_cfg.greybox)
	mat.set_shader_parameter("greybox_floor", region.floor_h)
	for w in region.walls:
		var mi := _wall_instance(w, mat)
		walls.add_child(mi)
		# (a carved feature's mesh comes with two coarser ones, baked from the same volume at twice and four times the voxel:
		# each drawn only in its own band of distance from the camera - to the mesh's centre; the collision stays the full one)
		if w.get("arch", false):
			mi.set_meta("carved", 0)
		else:
			mi.set_meta("wall", true)
		if w.has("lods"):
			mi.visibility_range_end = LOD_BANDS[1]
			mi.visibility_range_end_margin = LOD_MARGIN
			var lods: Array = w.lods
			for li in lods.size():
				var lm := _wall_instance(lods[li], mat)
				lm.set_meta("carved", li + 1)
				lm.visibility_range_begin = LOD_BANDS[li + 1]
				lm.visibility_range_begin_margin = LOD_MARGIN
				if li + 2 < LOD_BANDS.size():
					lm.visibility_range_end = LOD_BANDS[li + 2]
					lm.visibility_range_end_margin = LOD_MARGIN
				walls.add_child(lm)
		var shape := ConcavePolygonShape3D.new()
		shape.set_faces(w.faces)
		var body := StaticBody3D.new()
		var cs := CollisionShape3D.new()
		cs.shape = shape
		body.add_child(cs)
		walls.add_child(body)
	walls.set_meta("material", mat)
	print("terrain: %d wall pieces in %.1f s" % [region.walls.size(), (Time.get_ticks_msec() - t) / 1000.0])


## one wall piece's (or carved feature's) mesh
func _wall_instance(w: Dictionary, mat: Material) -> MeshInstance3D:
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = w.verts
	arrays[Mesh.ARRAY_NORMAL] = w.normals
	arrays[Mesh.ARRAY_INDEX] = w.indices
	# (r: where the grass grows - the rock's tops; the faces and the rubble stay rock)
	if w.has("colors"):
		arrays[Mesh.ARRAY_COLOR] = w.colors
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	return mi


## the floating origin: every region re-filed dk regions over (a whole-region shift of the world). Only Terrain3D's region map
## is rebuilt - its height, control and colour textures stay as they are, so this costs next to nothing: the regions keep
## their order in Terrain3D's region dictionary (which sets their texture layers) and only their locations change.
func shift_regions(dk: Vector2i) -> void:
	var data := terrain.data
	# (get_regions_all hands out Terrain3D's own dictionary, not a copy)
	var all: Dictionary = data.get_regions_all()
	var pairs := []
	for loc in all.keys():
		pairs.append([loc, all[loc]])
	all.clear()
	var locs: Array[Vector2i] = []
	for p in pairs:
		var nl: Vector2i = p[0] + dk
		var r: Terrain3DRegion = p[1]
		r.location = nl
		all[nl] = r
		if not r.is_deleted():
			locs.append(nl)
	data.set_region_locations(locs)
	if walls != null:
		walls.position += Vector3(dk.x, 0.0, dk.y) * gen.region_m


func set_debug_view(v: int) -> void:
	debug_view = v
	if terrain != null:
		terrain.material.set_shader_param("debug_view", v)
	if walls != null:
		(walls.get_meta("material") as ShaderMaterial).set_shader_parameter("debug_view", v)


func _exit_tree() -> void:
	if _thread != null and _thread.is_started():
		_thread.wait_to_finish()
