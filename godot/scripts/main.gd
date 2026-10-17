extends Node3D
## KINGSGAARD - THE CONTINENT (scripts/main.gd): builds the scene in code - the sky, the sun, the terrain (Terrain3D, generated:
## scripts/world/terrain_world.gd), the trees, the grass, the sea, the hero and his camera - and wires them together each frame
## (everything streams round the camera; the grass round the hero). The hero is placed once the terrain is ready. Also the
## input map, the HUD (F1), the terrain's debug maps (F2 heights, F3 tiers, F4 slopes), the menus (scripts/ui/menu.gd) and
## applying the player's settings (Settings).

const TerrainWorld := preload("res://scripts/world/terrain_world.gd")
const TerrainConfig := preload("res://scripts/world/terrain_config.gd")
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
	var cfg = TerrainConfig.new()
	cfg.seed_value = Shot.seed_value
	terrain = TerrainWorld.new()
	terrain.name = "Terrain"
	terrain.cfg = cfg
	terrain.camera = rig.camera
	terrain.ground = GROUND
	add_child(terrain)
	gen = terrain.gen
	rig.gen = gen
	foliage = Foliage.new()
	foliage.name = "Trees"
	foliage.gen = gen
	foliage.material = _shader("res://shaders/tree.gdshader", {})
	add_child(foliage)
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
	if Shot.orbit != Vector2.ZERO:
		rig.dist = Shot.orbit.x
		rig.pitch = deg_to_rad(-Shot.orbit.y)
		rig.yaw = deg_to_rad(Shot.orbit_yaw)
	if Shot.view != "":
		_set_view({"height": 1, "tiers": 2, "slope": 3}.get(Shot.view, 0))
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
	grass.set_density([0.0, 0.5, 1.0][Settings.grass])
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
	_help.text = "W A S D move   Shift run   Alt sprint   Space jump   drag mouse to look   wheel zoom   F fly   F2 F3 F4 maps   Esc menu"
	layer.add_child(_help)


func world_idle() -> bool:
	return _spawned and terrain.is_idle() and foliage.is_idle() and grass.is_idle()


func stats_line() -> String:
	return "trees=%d blades=%d draws=%d prims=%d" % [foliage.stats.trees, grass.stats.blades,
		RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME),
		RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)]


func _unhandled_input(e: InputEvent) -> void:
	if e.is_action_pressed("hud"):
		_hud.visible = not _hud.visible
	for v in [["view_height", 1], ["view_tiers", 2], ["view_slope", 3]]:
		if e.is_action_pressed(v[0]):
			_set_view(0 if terrain.debug_view == v[1] else v[1])


## a terrain debug map (0 = the game look); the maps colour the sea themselves, so the water is hidden while one shows
func _set_view(v: int) -> void:
	terrain.set_debug_view(v)
	ocean.visible = v == 0


## once the terrain is ready: the hero onto it (the spawn in the lowlands, or a screenshot's place), screenshot cameras
func _spawn() -> void:
	_spawned = true
	var sp: Vector3 = gen.find_spawn()
	var pois: Dictionary = gen.pois
	if Shot.spawn.x != INF:
		sp = Vector3(Shot.spawn.x, 0.0, Shot.spawn.y)
	var look := Vector3.INF
	var cam_back := 4.5
	var cam_up := 1.7
	var cam_side := 0.0
	match Shot.poi:
		"low":
			# well out in the lowlands, the camera tilted up about 14 degrees: the hero and the plateau's rim both in frame
			var rim: Vector3 = pois.low_look
			var stand: Vector3 = pois.low_stand
			var away := Vector3(stand.x - rim.x, 0.0, stand.z - rim.z).normalized()
			sp = stand + away * 160.0
			var dist := Vector2(rim.x - sp.x, rim.z - sp.z).length()
			look = Vector3(rim.x, gen.height(sp.x, sp.z) + 2.0 + tan(deg_to_rad(14.0)) * dist, rim.z)
			cam_back = 5.5
			cam_up = 1.9
		"edge":
			# behind and above the hero on the plateau's rim, looking out and down over the drop to the lowlands
			sp = pois.edge_stand
			var out := Vector3(pois.edge_look.x - sp.x, 0.0, pois.edge_look.z - sp.z).normalized()
			var far := sp + out * 480.0
			look = Vector3(far.x, gen.height(far.x, far.z), far.z)
			cam_back = 8.0
			cam_up = 7.0
		"pass":
			# from the side and below on the lower tier: the ramp cutting up through the cliff line, the hero on it
			var foot: Vector3 = pois.pass_foot
			var top: Vector3 = pois.pass_top
			sp = foot.lerp(top, 0.4)
			look = foot.lerp(top, 0.5)
			cam_back = 230.0
			cam_up = 60.0
			cam_side = 170.0
	player.place(sp.x, sp.z)
	if look != Vector3.INF:
		var d := Vector3(look.x - sp.x, 0.0, look.z - sp.z).normalized()
		player.face(d)
		var c: Vector3 = player.position - d * cam_back + Vector3(-d.z, 0.0, d.x) * cam_side
		c.y = maxf(gen.height(c.x, c.z), 0.0) + cam_up + maxf(player.position.y - gen.height(c.x, c.z), 0.0)
		rig.pin(c, look)
	if Shot.cam.size() == 6:
		var cc := Shot.cam
		rig.pin(Vector3(cc[0], maxf(gen.height(cc[0], cc[1]), 0.0) + cc[2], cc[1]), Vector3(cc[3], maxf(gen.height(cc[3], cc[4]), 0.0) + cc[5], cc[4]))
	if Shot.overview:
		# straight down over the middle of the map, orthographic, the whole map in the frame; no fog from up there
		rig.pinned = true
		rig.camera.projection = Camera3D.PROJECTION_ORTHOGONAL
		rig.camera.size = gen.map_size
		rig.camera.far = 20000.0
		rig.camera.global_transform = Transform3D(Basis(Vector3(1.0, 0.0, 0.0), -PI * 0.5), Vector3(0.0, 4000.0, 0.0))
		_env.fog_enabled = false


func _process(dt: float) -> void:
	if not _spawned:
		# while the continent is being made, draw no faster than needed so its threads get the processor
		Engine.max_fps = 30
		if terrain.is_idle():
			Engine.max_fps = 0
			_spawn()
	var cam: Vector3 = rig.camera.global_position
	foliage.focus = cam
	ocean.focus = cam
	grass.focus = Vector3(cam.x, 0.0, cam.z) if rig.fly or rig.pinned else player.position
	_help.visible = not menu.visible and not Shot.active
	if _hud.visible and gen.ready:
		var p: Vector3 = player.position
		var t: int = gen.tier_at(p.x, p.z)
		_hud.text = "%d fps   x %.0f  z %.0f  height %.1f m   %s   slope %.0f deg\n%s" % [Engine.get_frames_per_second(), p.x, p.z, p.y,
			"sea" if t == 255 else str(gen.cfg.tier_names[t]), gen.slope(p.x, p.z), stats_line()]
	Shot.tick(self, dt)
