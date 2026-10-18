extends Node3D
## KINGSGAARD - THE ISLAND (scripts/main.gd): builds the scene in code - the sky, the sun, the terrain (Terrain3D, generated:
## scripts/world/terrain_world.gd), the grass, the sea, the hero and his camera - and wires them together each frame (everything
## streams round the camera; the grass round the hero). The hero is placed once the terrain is ready. The floating origin
## (scripts/world/floating_origin.gd) keeps the camera near (0, 0, 0) on the 30 km island. The first region - tepui plateaus
## (scripts/world/tepui_region.gd, settings in region_settings.gd) - sits on it; the hero starts there, and F6 - F9 fly the
## camera to its four bookmark views (after the reference pictures). Also the input map, the HUD (F1), the terrain's debug maps
## (F2 heights, F3 tiers, F4 slopes, F5 the steep-edge mask), the menus (scripts/ui/menu.gd) and applying the player's
## settings (Settings).

## the old continent (terrain_gen.gd: cliffs, passes and rivers on a 10 km map) instead of the clean base terrain - kept, off
const CLASSIC_TERRAIN := false
## the old biome spawners on the mainland (forests, groves and lone trees: foliage.gd) - kept, off while the base terrain is a
## clean canvas
const BIOME_SPAWNERS := false

const TerrainWorld := preload("res://scripts/world/terrain_world.gd")
const TerrainConfig := preload("res://scripts/world/terrain_config.gd")
const BaseConfig := preload("res://scripts/world/base_terrain_config.gd")
const RegionSettings := preload("res://scripts/world/region_settings.gd")
const BOOKMARKS := ["ref1", "ref2", "ref3", "ref4"]
const FloatingOrigin := preload("res://scripts/world/floating_origin.gd")
const Foliage := preload("res://scripts/world/foliage.gd")
const Grass := preload("res://scripts/world/grass.gd")
const Ocean := preload("res://scripts/world/ocean.gd")
const Player := preload("res://scripts/player/player.gd")
const CameraRig := preload("res://scripts/player/camera_rig.gd")
const Menu := preload("res://scripts/ui/menu.gd")

## the ground's colours, shared by the terrain and the grass (sRGB)
const GROUND := {
	"grass_col": Color(0.37, 0.55, 0.21),
	"meadow_col": Color(0.52, 0.62, 0.25),
	"forest_col": Color(0.23, 0.34, 0.15),
}

var gen
var terrain
var foliage
var grass
var ocean
var player
var rig
var origin
var region_cfg

var menu
var _hud: Label
var _help: Label
var _sun: DirectionalLight3D
var _env: Environment
var _spawned := false


func _ready() -> void:
	_input_map()
	_environment()
	# the camera first: the terrain's level of detail and collision follow it
	rig = CameraRig.new()
	rig.name = "Camera"
	add_child(rig)
	var cfg = TerrainConfig.new() if CLASSIC_TERRAIN else BaseConfig.new()
	cfg.seed_value = Shot.seed_value
	terrain = TerrainWorld.new()
	terrain.name = "Terrain"
	terrain.cfg = cfg
	if not CLASSIC_TERRAIN:
		region_cfg = RegionSettings.new()
		terrain.region_cfg = region_cfg
	terrain.camera = rig.camera
	terrain.ground = GROUND
	add_child(terrain)
	gen = terrain.gen
	rig.gen = gen
	origin = FloatingOrigin.new()
	origin.name = "Origin"
	origin.terrain = terrain
	origin.gen = gen
	origin.enabled = not CLASSIC_TERRAIN
	origin.step = cfg.region_size * cfg.vertex_spacing
	add_child(origin)
	foliage = Foliage.new()
	foliage.name = "Trees"
	foliage.gen = gen
	foliage.material = _shader("res://shaders/tree.gdshader", {})
	add_child(foliage)
	if not BIOME_SPAWNERS:
		foliage.process_mode = Node.PROCESS_MODE_DISABLED
		foliage.visible = false
	grass = Grass.new()
	grass.name = "Grass"
	grass.gen = gen
	grass.material = _shader("res://shaders/grass.gdshader", GROUND)
	add_child(grass)
	ocean = Ocean.new()
	ocean.name = "Sea"
	ocean.material_override = _shader("res://shaders/water.gdshader", {})
	add_child(ocean)
	player = Player.new()
	player.name = "Hero"
	player.gen = gen
	add_child(player)
	rig.target = player
	player.rig = rig
	origin.about_to_shift.connect(grass.finish_jobs)
	origin.shifted.connect(player.shift_origin)
	origin.shifted.connect(rig.shift_origin)
	origin.shifted.connect(grass.shift_origin)
	origin.shifted.connect(foliage.shift_origin)
	if not CLASSIC_TERRAIN:
		# a 30 km island: the view reaches across it, through a thinner haze
		rig.camera.far = 60000.0
		_env.fog_density = 0.00008
		ocean.size = 100000.0
	if Shot.orbit != Vector2.ZERO:
		rig.dist = Shot.orbit.x
		rig.pitch = deg_to_rad(-Shot.orbit.y)
		rig.yaw = deg_to_rad(Shot.orbit_yaw)
	if Shot.view != "":
		_set_view({"height": 1, "tiers": 2, "slope": 3, "steep": 4}.get(Shot.view, 0))
	_ui()
	menu = Menu.new()
	menu.name = "Menu"
	menu.main = self
	add_child(menu)
	if Shot.active:
		player.set_hero(Shot.hero)
		menu.in_game = true
		menu.visible = false
		if Shot.ui == "pause":
			menu.pause()
		elif Shot.ui != "":
			menu.in_game = false
			menu.visible = true
			menu.show_screen(Shot.ui)
	Settings.changed.connect(apply_settings)
	for k in Shot.settings:
		Settings.set(k, Shot.settings[k])
	apply_settings()


## the player's settings, onto the window and the world
func apply_settings() -> void:
	if not Shot.active:
		var mode := DisplayServer.WINDOW_MODE_FULLSCREEN if Settings.window == 1 else DisplayServer.WINDOW_MODE_WINDOWED
		if DisplayServer.window_get_mode() != mode:
			DisplayServer.window_set_mode(mode)
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED if Settings.vsync else DisplayServer.VSYNC_DISABLED)
	var sc: float = Settings.SCALES[Settings.render_scale]
	get_viewport().scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR if sc < 1.0 else Viewport.SCALING_3D_MODE_BILINEAR
	get_viewport().scaling_3d_scale = sc
	_sun.shadow_enabled = Settings.shadows > 0
	RenderingServer.directional_shadow_atlas_set_size(1024 if Settings.shadows == 1 else 2048, true)
	# (no grass while a region's landforms are greybox)
	grass.set_density(0.0 if region_cfg != null and region_cfg.greybox else [0.0, 0.5, 1.0][Settings.grass])
	foliage.set_reach([0.6, 1.0][Settings.trees])
	rig.sensitivity = Settings.sensitivity
	_hud.visible = Settings.info


func _shader(path: String, params: Dictionary) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = load(path)
	for k in params:
		m.set_shader_parameter(k, params[k])
	return m


func _environment() -> void:
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.30, 0.52, 0.82)
	sky_mat.sky_horizon_color = Color(0.72, 0.82, 0.90)
	sky_mat.ground_horizon_color = Color(0.72, 0.82, 0.90)
	sky_mat.ground_bottom_color = Color(0.36, 0.46, 0.52)
	sky_mat.sun_angle_max = 30.0
	var sky := Sky.new()
	sky.sky_material = sky_mat
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.65
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.0
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_EXPONENTIAL
	env.fog_light_color = Color(0.70, 0.79, 0.88)
	env.fog_density = 0.00016
	env.fog_aerial_perspective = 0.6
	env.fog_sky_affect = 0.0
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = Vector3(-38.0, -35.0, 0.0)
	sun.light_color = Color(1.0, 0.96, 0.88)
	sun.light_energy = 1.25
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	sun.directional_shadow_max_distance = 90.0
	sun.shadow_blur = 1.5
	add_child(sun)
	_sun = sun
	_env = env


func _input_map() -> void:
	_bind("move_forward", [KEY_W, KEY_UP])
	_bind("move_back", [KEY_S, KEY_DOWN])
	_bind("move_left", [KEY_A, KEY_LEFT])
	_bind("move_right", [KEY_D, KEY_RIGHT])
	_bind("run", [KEY_SHIFT])
	_bind("sprint", [KEY_ALT])
	_bind("jump", [KEY_SPACE])
	_bind("down", [KEY_CTRL])
	_bind("fly", [KEY_F])
	_bind("hud", [KEY_F1])
	_bind("view_height", [KEY_F2])
	_bind("view_tiers", [KEY_F3])
	_bind("view_slope", [KEY_F4])
	_bind("view_steep", [KEY_F5])
	_bind("bookmark_1", [KEY_F6])
	_bind("bookmark_2", [KEY_F7])
	_bind("bookmark_3", [KEY_F8])
	_bind("bookmark_4", [KEY_F9])
	_bind("bookmark_arch_1", [KEY_F10])
	_bind("bookmark_arch_2", [KEY_F11])
	_bind("bookmark_arch_3", [KEY_F12])
	_bind("bookmark_feature_prev", [KEY_PAGEUP])
	_bind("bookmark_feature_next", [KEY_PAGEDOWN])


func _bind(action: String, keys: Array) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	for k in keys:
		var e := InputEventKey.new()
		e.physical_keycode = k
		InputMap.action_add_event(action, e)


func _ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	_hud = Label.new()
	_hud.position = Vector2(12.0, 10.0)
	_hud.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.7))
	_hud.add_theme_constant_override("shadow_offset_x", 1)
	_hud.add_theme_constant_override("shadow_offset_y", 1)
	_hud.visible = false
	layer.add_child(_hud)
	_help = Label.new()
	_help.text = "W A S D move   Shift run   Alt sprint   Space jump   drag mouse to look   wheel zoom   F fly   F1 info"
	_help.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.7))
	_help.add_theme_constant_override("shadow_offset_x", 1)
	_help.add_theme_constant_override("shadow_offset_y", 1)
	_help.anchor_top = 1.0
	_help.anchor_bottom = 1.0
	_help.offset_left = 12.0
	_help.offset_top = -30.0
	_help.text = "W A S D move   Shift run   Alt sprint   Space jump   drag mouse to look   wheel zoom   F fly   F2-F5 maps   Esc menu"
	layer.add_child(_help)


## a line for the loading screen: what the terrain is doing (empty once the world is ready)
func loading_text() -> String:
	if terrain.is_idle():
		return ""
	if terrain.stage.begins_with("shaping"):
		return "Shaping the island - only on the first start, about a minute (%s)" % gen.stage
	return "Loading the island"


func world_idle() -> bool:
	return _spawned and terrain.is_idle() and foliage.is_idle() and grass.is_idle()


func stats_line() -> String:
	return "trees=%d blades=%d draws=%d prims=%d" % [foliage.stats.trees, grass.stats.blades,
		RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME),
		RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)]


func _unhandled_input(e: InputEvent) -> void:
	if e.is_action_pressed("hud"):
		_hud.visible = not _hud.visible
	for v in [["view_height", 1], ["view_tiers", 2], ["view_slope", 3], ["view_steep", 4]]:
		if e.is_action_pressed(v[0]):
			_set_view(0 if terrain.debug_view == v[1] else v[1])
	for k in 4:
		if e.is_action_pressed("bookmark_%d" % (k + 1)):
			go_bookmark(BOOKMARKS[k], true)
	for k in 3:
		if e.is_action_pressed("bookmark_arch_%d" % (k + 1)):
			go_bookmark("arch%d" % (k + 1), true)
	# (Page Up / Page Down: through every carved feature's bookmark - arches, supports, overhangs, pillars, sinkholes)
	if terrain.region != null and not terrain.region.features.is_empty():
		var nf: int = terrain.region.features.size()
		var step := -1 if e.is_action_pressed("bookmark_feature_prev") else (1 if e.is_action_pressed("bookmark_feature_next") else 0)
		if step != 0:
			_feature_i = posmod(_feature_i + step, nf)
			go_bookmark(str(terrain.region.features[_feature_i].name), true)


var _feature_i := -1


## put the camera at one of the region's bookmark views (map coordinates): flying from there (keys F6 - F9) or pinned
## (screenshots, with the view's own field of view)
func go_bookmark(name: String, flying: bool) -> bool:
	if terrain.region == null or not terrain.region.bookmarks.has(name):
		return false
	var b: Dictionary = terrain.region.bookmarks[name]
	var pos: Vector3 = origin.to_local_pos(b.pos)
	var look: Vector3 = origin.to_local_pos(b.look)
	if flying:
		var d := (look - pos).normalized()
		if not rig.fly:
			rig._toggle_fly()
		rig.pinned = false
		rig._fly_pos = pos
		rig.yaw = atan2(-d.x, -d.z)
		rig.pitch = asin(clampf(d.y, -1.0, 1.0))
	else:
		rig.camera.fov = float(b.get("fov", 65.0))
		rig.pin(pos, look)
	return true


## a terrain debug map (0 = the game look); the maps colour the sea themselves, so the water is hidden while one shows
func _set_view(v: int) -> void:
	terrain.set_debug_view(v)
	ocean.visible = v == 0


## once the terrain is ready: the hero onto it (the spawn in the lowlands, or a screenshot's place) and the screenshot cameras.
## The generator's places are in map coordinates: the floating origin is first moved to the place, then it is made local.
func _spawn() -> void:
	_spawned = true
	var pois: Dictionary = gen.pois
	var sp: Vector3 = pois.get("spawn", Vector3.ZERO)
	if Shot.spawn.x != INF:
		sp = Vector3(Shot.spawn.x, 0.0, Shot.spawn.y)
	var look := Vector3.INF
	var cam_back := 4.5
	var cam_up := 1.7
	var cam_side := 0.0
	var tilt := 0.0
	# the region: the hero starts on its plateaus, beside the long canyon, facing down it (else at another of its views)
	var face_to := Vector3.INF
	if terrain.region != null and Shot.spawn.x == INF and Shot.poi == "":
		for name in ["ref3", "ref1", "ref2", "ref4"]:
			if terrain.region.bookmarks.has(name):
				var b: Dictionary = terrain.region.bookmarks[name]
				var bp: Vector3 = b.pos
				var bl: Vector3 = b.look
				sp = Vector3(bp.x, 0.0, bp.z)
				face_to = bl
				if name == "ref2" or name == "ref4":
					sp = Vector3(bl.x, 0.0, bl.z)
					face_to = Vector3.INF
				break
	match Shot.poi:
		"low":
			# out in the lowlands, looking up at a high plateau's rim: the camera low behind the hero, tilted up part of the way
			sp = pois.low_stand
			look = pois.low_look
			cam_back = 5.5
			cam_up = 1.5
			tilt = 0.6
		"edge":
			# on the plateau's rim, behind and above the hero, looking out and down over the lowlands
			sp = pois.edge_stand
			look = pois.edge_look
			cam_back = 9.0
			cam_up = 6.0
		"mount":
			# on a mountain top, looking out across the island
			sp = pois.mount_stand
			look = pois.mount_look
			cam_back = 9.0
			cam_up = 5.0
		"pass":
			# (the old continent) from the side and below: a ramp cutting up through the cliff line, the hero on it
			var foot: Vector3 = pois.pass_foot
			var top: Vector3 = pois.pass_top
			sp = foot.lerp(top, 0.4)
			look = foot.lerp(top, 0.5)
			cam_back = 230.0
			cam_up = 60.0
			cam_side = 170.0
	origin.recenter(origin.to_local_pos(sp))
	sp = origin.to_local_pos(sp)
	player.place(sp.x, sp.z)
	if face_to != Vector3.INF:
		var fl: Vector3 = origin.to_local_pos(face_to)
		var fd := Vector3(fl.x - sp.x, 0.0, fl.z - sp.z).normalized()
		player.face(fd)
		rig.yaw = atan2(-fd.x, -fd.z)
	if look != Vector3.INF:
		look = origin.to_local_pos(look)
		var d := Vector3(look.x - sp.x, 0.0, look.z - sp.z).normalized()
		player.face(d)
		var c: Vector3 = player.position - d * cam_back + Vector3(-d.z, 0.0, d.x) * cam_side
		c.y = maxf(gen.height(c.x, c.z), 0.0) + cam_up + maxf(player.position.y - gen.height(c.x, c.z), 0.0)
		if tilt > 0.0:
			# aim part of the way up towards the target, so the hero stays in the frame below it
			var dist := Vector2(look.x - c.x, look.z - c.z).length()
			look.y = c.y + tan(atan2(look.y - c.y, dist) * tilt) * dist
		rig.pin(c, look)
	if Shot.cam.size() == 6:
		var cc := Shot.cam
		var a0: Vector3 = origin.to_local_pos(Vector3(cc[0], 0.0, cc[1]))
		var a1: Vector3 = origin.to_local_pos(Vector3(cc[3], 0.0, cc[4]))
		rig.pin(Vector3(a0.x, maxf(gen.height(a0.x, a0.z), 0.0) + cc[2], a0.z), Vector3(a1.x, maxf(gen.height(a1.x, a1.z), 0.0) + cc[5], a1.z))
	if Shot.bookmark != "":
		go_bookmark(Shot.bookmark, false)
	if Shot.fov > 0.0:
		rig.camera.fov = Shot.fov
	if Shot.overview:
		# straight down over the middle of the map (or the region), orthographic, all of it in the frame; no fog from up there
		var over_c := Vector3.ZERO
		var over_size: float = gen.map_size
		if Shot.overview_target == "region" and terrain.region != null:
			over_c = Vector3(terrain.region.center.x, 0.0, terrain.region.center.y)
			over_size = terrain.region.half * 2.0 + 200.0
		origin.recenter(origin.to_local_pos(over_c))
		var mid: Vector3 = origin.to_local_pos(over_c + Vector3(0.0, 6000.0, 0.0))
		rig.pinned = true
		rig.camera.projection = Camera3D.PROJECTION_ORTHOGONAL
		rig.camera.size = over_size
		rig.camera.far = 20000.0
		rig.camera.global_transform = Transform3D(Basis(Vector3(1.0, 0.0, 0.0), -PI * 0.5), mid)
		_env.fog_enabled = false
		# open sea with no terrain region under it: the deep sea's colour
		_env.background_mode = Environment.BG_COLOR
		_env.background_color = Color(0.022, 0.07, 0.2)


## a screenshot camera in map coordinates (x, z, height above the ground, look-at x, z, its height above the ground): the
## floating origin moved under it first, so the world streams in round it; the hero is parked out of the way (hidden, still)
func shot_cam(cc: PackedFloat32Array) -> void:
	var m := Vector3(cc[0], 0.0, cc[1])
	player.process_mode = Node.PROCESS_MODE_DISABLED
	player.visible = false
	origin.recenter(origin.to_local_pos(m))
	var a0: Vector3 = origin.to_local_pos(Vector3(cc[0], 0.0, cc[1]))
	var a1: Vector3 = origin.to_local_pos(Vector3(cc[3], 0.0, cc[4]))
	rig.pin(Vector3(a0.x, maxf(gen.height(a0.x, a0.z), 0.0) + cc[2], a0.z), Vector3(a1.x, maxf(gen.height(a1.x, a1.z), 0.0) + cc[5], a1.z))


func _process(dt: float) -> void:
	if not _spawned:
		# while the continent is being made, draw no faster than needed so its threads get the processor
		Engine.max_fps = 30
		if terrain.is_idle():
			Engine.max_fps = 0
			_spawn()
	if _spawned:
		origin.update(rig.camera.global_position)
	var cam: Vector3 = rig.camera.global_position
	foliage.focus = cam
	ocean.focus = cam
	grass.focus = Vector3(cam.x, 0.0, cam.z) if rig.fly or rig.pinned else player.position
	_help.visible = not menu.visible and not Shot.active
	if _hud.visible and gen.ready:
		var p: Vector3 = player.position
		var m: Vector3 = origin.to_map_pos(p)
		var t: int = gen.tier_at(p.x, p.z)
		var lv: int = terrain.region.level_at(p.x, p.z) if terrain.region != null else -1
		_hud.text = "%d fps   x %.0f  z %.0f  height %.1f m   %s   slope %.0f deg\n%s   origin %+.1f %+.1f km" % [Engine.get_frames_per_second(),
			m.x, m.z, p.y, ("region floor" if lv == 0 else "plateau level %d" % lv) if lv >= 0 else ("sea" if t == 255 else str(gen.cfg.tier_names[t])), gen.slope(p.x, p.z), stats_line(), origin.offset.x / 1000.0,
			origin.offset.y / 1000.0]
	Shot.tick(self, dt)
