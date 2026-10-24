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
## the walls' far stand-ins (HLOD): the wall pieces gathered per HLOD_CELL m square of the map into one mesh simplified to
## about HLOD_SHARE of its triangles, drawn instead of its pieces from HLOD_FROM m (to the square's middle) on
const HLOD_CELL := 600.0
const HLOD_FROM := 1800.0
const HLOD_SHARE := 0.18

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
## toward the sun (world; main.gd sets it): the rock's lit faces warmer, its shaded ones cooler
var sun_dir := Vector3(0.45, 0.52, 0.72):
	set(v):
		sun_dir = v
		if _wall_mat != null:
			_wall_mat.set_shader_parameter("sun_dir", v.normalized())
			_wall_mat.set_shader_parameter("lawn_light", v.normalized())
		if terrain != null and terrain.material != null:
			terrain.material.set_shader_param("lawn_light", v.normalized())
## the graphics preset's detail (settings.gd PRESETS), applied to the materials once they exist
var _quality := {}
var _wall_mat: ShaderMaterial
var _water_mats := {}
## the falls the rock knows (it darkens and wets the rock round them - not on the low preset: a loop over all of them per
## vertex, and the carved rock's meshes are dense)
var _fall_n := 0
## near water over the region (for the grass's tint): the texture, its map corner and size
var _wet_tex: ImageTexture
var _wet_org := Vector2.ZERO
var _wet_size := 1.0


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
	m.set_shader_param("region_look", region != null and not region_cfg.greybox)
	# the region's steps stay steps far away: the shader moves far vertices onto the edges of their terraces
	m.set_shader_param("snap_on", region != null)
	if region != null:
		m.set_shader_param("snap_map", region.snap_texture())
		m.set_shader_param("snap_origin", region.snap_origin())
		m.set_shader_param("snap_texels", float(region.fn))
		m.set_shader_param("greybox_floor", region.floor_h)
		_lawn_params(func(k, v): m.set_shader_param(k, v))
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
	mat.set_shader_parameter("sun_dir", sun_dir.normalized())
	_wall_mat = mat
	# (the waterfalls, for the rock's wet streaks beside and below them)
	var fa: Array[Vector4] = []
	var fb: Array[Vector4] = []
	for f in region.water_falls:
		if fa.size() >= 16:
			break
		fa.append(Vector4(f[0], f[1], f[2], f[3]))
		fb.append(Vector4(f[4], f[5], f[6], 0.0))
	while fa.size() < 16:
		fa.append(Vector4.ZERO)
		fb.append(Vector4.ZERO)
	mat.set_shader_parameter("fall_a", fa)
	mat.set_shader_parameter("fall_b", fb)
	_fall_n = mini(region.water_falls.size(), 16)
	mat.set_shader_parameter("fall_n", _fall_n if _quality.is_empty() or int(_quality.rock) >= 1 else 0)
	print("terrain: %d waterfalls wet the rock" % mini(region.water_falls.size(), 16))
	var hl_cells := {}
	for w in region.walls:
		# (a wall piece carries its own chain of coarser meshes, picked by the size on screen; a carved feature has its baked LODs)
		var mi := _wall_instance(w, mat, not w.get("arch", false))
		walls.add_child(mi)
		if not w.get("arch", false) and not (w.verts as PackedVector3Array).is_empty():
			var c: Vector3 = (w.verts as PackedVector3Array)[0]
			var key := Vector2i(int(floor((c.x + region.center.x) / HLOD_CELL)), int(floor((c.z + region.center.y) / HLOD_CELL)))
			if not hl_cells.has(key):
				hl_cells[key] = []
			hl_cells[key].append([w, mi])
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
	var th := Time.get_ticks_msec()
	var hl := _build_hlod(hl_cells, mat)
	print("terrain: %d wall pieces in %.1f s (%d far stand-ins in %.1f s)" % [region.walls.size(), (Time.get_ticks_msec() - t) / 1000.0, hl,
		(Time.get_ticks_msec() - th) / 1000.0])
	_build_water()
	_wet_map()
	_lawn_params(func(k, v): mat.set_shader_parameter(k, v))
	if not _quality.is_empty():
		set_quality(_quality)


## the region's water (phase 3): rivers, lakes and pools, waterfalls, their splash and spray, the canyons' mist - each kind with
## its own material, none casting shadows, all under the walls' node (the floating origin moves them together)
func _build_water() -> void:
	var mats := {}
	var make := func(path: String, params: Dictionary) -> ShaderMaterial:
		var m := ShaderMaterial.new()
		m.shader = load(path)
		for k in params:
			m.set_shader_parameter(k, params[k])
		return m
	mats["river"] = make.call("res://shaders/region_water.gdshader", {})
	mats["lake"] = mats["river"]
	mats["pool"] = mats["river"]
	mats["fall"] = make.call("res://shaders/region_waterfall.gdshader", {})
	mats["foam"] = make.call("res://shaders/region_foam.gdshader", {})
	# (the foam lies on the water: drawn after it)
	(mats["foam"] as ShaderMaterial).render_priority = 1
	mats["spray"] = make.call("res://shaders/region_mist.gdshader", {"mode": 1})
	mats["drops"] = make.call("res://shaders/region_mist.gdshader", {"mode": 2})
	mats["cloud"] = make.call("res://shaders/region_mist.gdshader", {"mode": 3})
	# (the spray over the water, the cloud deck over everything else see-through: drawn after the water and the foam)
	(mats["spray"] as ShaderMaterial).render_priority = 1
	(mats["drops"] as ShaderMaterial).render_priority = 1
	(mats["cloud"] as ShaderMaterial).render_priority = 2
	var count := 0
	for m in region.water_meshes:
		if (m.indices as PackedInt32Array).is_empty():
			continue
		var arrays := []
		arrays.resize(Mesh.ARRAY_MAX)
		arrays[Mesh.ARRAY_VERTEX] = m.verts
		arrays[Mesh.ARRAY_NORMAL] = m.normals
		arrays[Mesh.ARRAY_INDEX] = m.indices
		arrays[Mesh.ARRAY_COLOR] = m.colors
		arrays[Mesh.ARRAY_TEX_UV] = m.uv
		arrays[Mesh.ARRAY_TEX_UV2] = m.uv2
		# (a river's own coordinates per vertex - metres along its course, metres across it - for streaks that follow the flow)
		var flags := 0
		if m.has("flow"):
			var fl := PackedFloat32Array()
			for v in (m.flow as PackedVector2Array):
				fl.append(v.x)
				fl.append(v.y)
			arrays[Mesh.ARRAY_CUSTOM0] = fl
			flags = Mesh.ARRAY_CUSTOM_RG_FLOAT << Mesh.ARRAY_FORMAT_CUSTOM0_SHIFT
		# (the falls' sheets carry coarser levels of detail for far away; not the surfaces - simplified, a river's soft-edged
		# contour sank under its banks and a pool shrank to a blurred square - nor the billboards, whose four corners sit on
		# one point)
		var mi := MeshInstance3D.new()
		mi.mesh = _mesh_with_lods(arrays) if str(m.kind) == "fall" else _plain_mesh(arrays, flags)
		mi.material_override = mats[str(m.kind)]
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mi.set_meta("water", str(m.kind))
		# (the spray's and the drops' billboards fly past their vertices' box, the cloud deck's puffs rise over it)
		if str(m.kind) == "spray" or str(m.kind) == "drops" or str(m.kind) == "foam" or str(m.kind) == "cloud":
			mi.extra_cull_margin = 90.0
			mi.visibility_range_end = 1800.0 if str(m.kind) == "drops" else 3500.0
		walls.add_child(mi)
		count += 1
	walls.set_meta("water_materials", mats.values())
	_water_mats = mats
	print("terrain: %d water meshes" % count)


## one wall piece's (or carved feature's) mesh
func _wall_instance(w: Dictionary, mat: Material, lods := false) -> MeshInstance3D:
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = w.verts
	arrays[Mesh.ARRAY_NORMAL] = w.normals
	arrays[Mesh.ARRAY_INDEX] = w.indices
	# (r: where the grass grows - the rock's tops; the faces and the rubble stay rock)
	if w.has("colors"):
		arrays[Mesh.ARRAY_COLOR] = w.colors
	var mi := MeshInstance3D.new()
	mi.mesh = _mesh_with_lods(arrays) if lods else _plain_mesh(arrays)
	mi.material_override = mat
	return mi


## near water (0..1) over the region, for the grass's tint (deeper green by the rivers and lakes): their surfaces' vertices
## marked in a 256 x 256 grid over the region (some 17 m a cell), widened by a cell and blurred out over some 60 - 80 m
func _wet_map() -> void:
	var nn := 256
	_wet_size = region.half * 2.0 + 400.0
	var cc := Vector2(region.center.x, region.center.y)
	_wet_org = cc - Vector2.ONE * _wet_size * 0.5
	var g := PackedFloat32Array()
	g.resize(nn * nn)
	for m in region.water_meshes:
		if not (str(m.kind) in ["river", "lake", "pool"]):
			continue
		var vs: PackedVector3Array = m.verts
		var cs: PackedColorArray = m.colors
		for i in vs.size():
			if cs[i].a < 0.3:
				continue
			var x := int((vs[i].x + cc.x - _wet_org.x) / _wet_size * nn)
			var z := int((vs[i].z + cc.y - _wet_org.y) / _wet_size * nn)
			if x > 0 and z > 0 and x < nn - 1 and z < nn - 1:
				for dz in range(-1, 2):
					for dx in range(-1, 2):
						g[(z + dz) * nn + x + dx] = 1.0
	for it in 2:
		g = _box_blur(g, nn, 3)
	for i in g.size():
		g[i] = minf(g[i] * 1.8, 1.0)
	_wet_tex = ImageTexture.create_from_image(Image.create_from_data(nn, nn, false, Image.FORMAT_RF, g.to_byte_array()))


## a square grid blurred by a box (2 r + 1 cells wide) along each axis in turn
static func _box_blur(g: PackedFloat32Array, nn: int, r: int) -> PackedFloat32Array:
	var tmp := PackedFloat32Array()
	tmp.resize(nn * nn)
	var out := PackedFloat32Array()
	out.resize(nn * nn)
	var inv := 1.0 / (2 * r + 1)
	for z in nn:
		var acc := 0.0
		for x in range(-r, r + 1):
			acc += g[z * nn + clampi(x, 0, nn - 1)]
		for x in nn:
			tmp[z * nn + x] = acc * inv
			acc += g[z * nn + mini(x + r + 1, nn - 1)] - g[z * nn + maxi(x - r, 0)]
	for x in nn:
		var acc := 0.0
		for z in range(-r, r + 1):
			acc += tmp[clampi(z, 0, nn - 1) * nn + x]
		for z in nn:
			out[z * nn + x] = acc * inv
			acc += tmp[mini(z + r + 1, nn - 1) * nn + x] - tmp[maxi(z - r, 0) * nn + x]
	return out


## the grass's tint inputs onto a material (the terrain's or the rock's): the floor, the sun, the water map
func _lawn_params(set_p: Callable) -> void:
	set_p.call("lawn_floor", region.floor_h)
	set_p.call("lawn_light", sun_dir.normalized())
	if _wet_tex != null:
		set_p.call("lawn_wet", _wet_tex)
		set_p.call("lawn_wet_origin", _wet_org)
		set_p.call("lawn_wet_size", _wet_size)
		set_p.call("lawn_wet_on", true)


static func _plain_mesh(arrays: Array, flags := 0) -> ArrayMesh:
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays, [], {}, flags)
	return mesh


## a mesh with its chain of coarser levels of detail (simplified by Godot's importer; the renderer picks one by its size on
## screen and the viewport's mesh_lod_threshold - the graphics preset)
static func _mesh_with_lods(arrays: Array) -> ArrayMesh:
	var im := ImporterMesh.new()
	im.add_surface(Mesh.PRIMITIVE_TRIANGLES, arrays)
	im.generate_lods(25.0, 60.0, [])
	return im.get_mesh()


## the walls' far stand-ins: per square of the map, its wall pieces merged into one mesh and simplified to about HLOD_SHARE of
## their triangles (the coarsest of Godot's own LODs at or under that), shown from HLOD_FROM m away instead of the pieces - each
## piece's visibility parent is its square's stand-in, so they switch together. Returns how many
func _build_hlod(cells: Dictionary, mat: Material) -> int:
	var n := 0
	for key in cells:
		var group: Array = cells[key]
		var vs := PackedVector3Array()
		var ns := PackedVector3Array()
		var cs := PackedColorArray()
		var ids := PackedInt32Array()
		for e in group:
			var w: Dictionary = e[0]
			var o := vs.size()
			vs.append_array(w.verts)
			ns.append_array(w.normals)
			if w.has("colors"):
				cs.append_array(w.colors)
			else:
				var pad := PackedColorArray()
				pad.resize((w.verts as PackedVector3Array).size())
				cs.append_array(pad)
			for i in (w.indices as PackedInt32Array):
				ids.append(o + i)
		if ids.is_empty():
			continue
		var arrays := []
		arrays.resize(Mesh.ARRAY_MAX)
		arrays[Mesh.ARRAY_VERTEX] = vs
		arrays[Mesh.ARRAY_NORMAL] = ns
		arrays[Mesh.ARRAY_COLOR] = cs
		arrays[Mesh.ARRAY_INDEX] = ids
		var im := ImporterMesh.new()
		im.add_surface(Mesh.PRIMITIVE_TRIANGLES, arrays)
		im.generate_lods(25.0, 60.0, [])
		var best := ids
		for li in im.get_surface_lod_count(0):
			var lid: PackedInt32Array = im.get_surface_lod_indices(0, li)
			if lid.size() >= 3 and lid.size() <= int(ids.size() * HLOD_SHARE):
				best = lid
				break
			best = lid
		arrays[Mesh.ARRAY_INDEX] = best
		var far := MeshInstance3D.new()
		far.mesh = _plain_mesh(arrays)
		far.material_override = mat
		far.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		far.visibility_range_begin = HLOD_FROM
		far.set_meta("wall_hlod", true)
		walls.add_child(far)
		for e in group:
			var mi: MeshInstance3D = e[1]
			mi.visibility_parent = mi.get_path_to(far)
		n += 1
	return n


## the graphics preset's detail onto the region's materials (main.gd apply_settings; kept for when they are built)
func set_quality(pr: Dictionary) -> void:
	_quality = pr
	if _wall_mat != null:
		_wall_mat.set_shader_parameter("rock_quality", int(pr.rock))
		_wall_mat.set_shader_parameter("fall_n", _fall_n if int(pr.rock) >= 1 else 0)
	if _water_mats.is_empty():
		return
	(_water_mats["river"] as ShaderMaterial).set_shader_parameter("water_quality", int(pr.water))
	var mist_shader: Shader = load("res://shaders/region_mist.gdshader" if pr.soft else "res://shaders/region_mist_fast.gdshader")
	for k in ["spray", "drops", "cloud"]:
		var m: ShaderMaterial = _water_mats[k]
		m.shader = mist_shader
		m.set_shader_parameter("mode", {"spray": 1, "drops": 2, "cloud": 3}[k])
		m.set_shader_parameter("size_scale", float(pr.spray))
		m.set_shader_parameter("drop_share", float(pr.drops))


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
