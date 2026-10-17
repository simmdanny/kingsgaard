extends Node3D
## KINGSGAARD - THE CONTINENT (scripts/main.gd): builds the scene in code - the sky, the sun, the ground, the trees, the grass, the
## sea, the hero and his camera - and wires them together each frame (everything streams round the camera; the grass round the
## hero). Also the input map, the HUD (F1), the menus (scripts/ui/menu.gd) and applying the player's settings (Settings).
## Phase 1 of the Godot rebuild: plains, meadows and forests only.
## The look - sky, light, fog, the ground's, trees', grass's and water's materials - comes from an art preset (art/*.tres,
## scripts/world/art_preset.gd): F9 switches between A_current and B_stylized in game (see ART_STYLE.md).

const WorldGen := preload("res://scripts/world/world_gen.gd")
const Terrain := preload("res://scripts/world/terrain.gd")
const Foliage := preload("res://scripts/world/foliage.gd")
const Grass := preload("res://scripts/world/grass.gd")
const Ocean := preload("res://scripts/world/ocean.gd")
const Boulders := preload("res://scripts/world/boulders.gd")
const Player := preload("res://scripts/player/player.gd")
const CameraRig := preload("res://scripts/player/camera_rig.gd")
const Menu := preload("res://scripts/ui/menu.gd")

## the art presets F9 cycles through (each: art/<name>.tres with its Environment and materials in art/<name>/)
const PRESETS := ["res://art/A_current.tres", "res://art/B_stylized.tres"]

var gen
var terrain
var foliage
var grass
var ocean
var boulders
var player
var rig

var menu
var _hud: Label
var _help: Label
var _toast: Label
var _toast_t := 0.0
var _sun: DirectionalLight3D
var _world_env: WorldEnvironment
var preset_index := 0
var preset: Resource  ## the art preset in use (scripts/world/art_preset.gd)


func _ready() -> void:
	_input_map()
	gen = WorldGen.new(Shot.seed_value)
	_environment()
	terrain = Terrain.new()
	terrain.name = "Terrain"
	terrain.gen = gen
	add_child(terrain)
	foliage = Foliage.new()
	foliage.name = "Trees"
	foliage.gen = gen
	add_child(foliage)
	grass = Grass.new()
	grass.name = "Grass"
	grass.gen = gen
	add_child(grass)
	ocean = Ocean.new()
	ocean.name = "Sea"
	add_child(ocean)
	boulders = Boulders.new()
	boulders.name = "Boulders"
	boulders.gen = gen
	add_child(boulders)
	apply_preset(maxi(PRESETS.find("res://art/%s.tres" % Shot.preset), 0))
	player = Player.new()
	player.name = "Hero"
	player.gen = gen
	add_child(player)
	if Shot.spawn.x != INF:
		player.place(Shot.spawn.x, Shot.spawn.y)
	else:
		var sp: Vector3 = gen.find_spawn()
		player.place(sp.x, sp.z)
	rig = CameraRig.new()
	rig.name = "Camera"
	rig.gen = gen
	rig.target = player
	add_child(rig)
	player.rig = rig
	if Shot.orbit != Vector2.ZERO:
		rig.dist = Shot.orbit.x
		rig.pitch = deg_to_rad(-Shot.orbit.y)
		rig.yaw = deg_to_rad(Shot.orbit_yaw)
	if Shot.cam.size() == 6:
		var c := Shot.cam
		rig.pin(Vector3(c[0], maxf(gen.height(c[0], c[1]), 0.0) + c[2], c[1]), Vector3(c[3], maxf(gen.height(c[3], c[4]), 0.0) + c[5], c[4]))
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


## the world's environment and sun nodes; their settings come from the art preset (apply_preset)
func _environment() -> void:
	_world_env = WorldEnvironment.new()
	add_child(_world_env)
	var sun := DirectionalLight3D.new()
	sun.name = "Sun"
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	add_child(sun)
	_sun = sun


## puts art preset i (PRESETS) on the world: the environment, the sun, and the materials (and tree meshes) of everything already
## built - the terrain, trees, grass and sea swap in place; nothing is regenerated but the two kinds of tree mesh
func apply_preset(i: int) -> void:
	preset_index = posmod(i, PRESETS.size())
	preset = load(PRESETS[preset_index])
	var p = preset
	_world_env.environment = p.environment
	_sun.rotation_degrees = p.sun_rotation_degrees
	_sun.light_color = p.sun_color
	_sun.light_energy = p.sun_energy
	_sun.light_angular_distance = p.sun_angular_distance
	_sun.shadow_blur = p.sun_shadow_blur
	_sun.shadow_bias = p.sun_shadow_bias
	_sun.shadow_normal_bias = p.sun_shadow_normal_bias
	_sun.directional_shadow_max_distance = p.sun_shadow_max_distance
	terrain.set_material(p.terrain_material)
	foliage.set_style(p.tree_meshes, p.tree_material)
	grass.set_material(p.grass_material)
	ocean.material_override = p.water_material
	boulders.set_material(p.rock_material)
	if p.rock_material is ShaderMaterial:
		p.rock_material.set_shader_parameter("sun_dir", _sun.basis.z)


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
	_bind("art_preset", [KEY_F9])


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
	_help.text = "W A S D move   Shift run   Alt sprint   Space jump   drag mouse to look   wheel zoom   F fly   Esc menu"
	layer.add_child(_help)
	_toast = Label.new()
	_toast.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.7))
	_toast.add_theme_constant_override("shadow_offset_x", 1)
	_toast.add_theme_constant_override("shadow_offset_y", 1)
	_toast.add_theme_font_size_override("font_size", 22)
	_toast.anchor_left = 1.0
	_toast.anchor_right = 1.0
	_toast.offset_left = -360.0
	_toast.offset_right = -16.0
	_toast.offset_top = 12.0
	_toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_toast.visible = false
	layer.add_child(_toast)


func world_idle() -> bool:
	return terrain.is_idle() and foliage.is_idle() and grass.is_idle() and boulders.is_idle()


func stats_line() -> String:
	var t: Dictionary = terrain.stats
	return "chunks=%d/%d trees=%d blades=%d boulders=%d/%d draws=%d prims=%d" % [t.visible, t.chunks, foliage.stats.trees, grass.stats.blades,
		boulders.stats.drawn, boulders.stats.boulders,
		RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME),
		RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)]


func _unhandled_input(e: InputEvent) -> void:
	if e.is_action_pressed("hud"):
		_hud.visible = not _hud.visible
	elif e.is_action_pressed("art_preset"):
		apply_preset(preset_index + 1)
		_toast.text = "Art preset: %s   (F9)" % preset.title
		_toast.visible = true
		_toast_t = 2.5


func _process(dt: float) -> void:
	var cam: Vector3 = rig.camera.global_position
	terrain.focus = cam
	foliage.focus = cam
	ocean.focus = cam
	boulders.focus = cam
	grass.focus = Vector3(cam.x, 0.0, cam.z) if rig.fly or rig.pinned else player.position
	_help.visible = not menu.visible and not Shot.active
	if _toast_t > 0.0:
		_toast_t -= dt
		_toast.visible = _toast_t > 0.0
	if _hud.visible:
		var p: Vector3 = player.position
		_hud.text = "%d fps   x %.0f  z %.0f  height %.1f m   coast %.0f m   art %s (F9)\n%s" % [Engine.get_frames_per_second(), p.x,
			p.z, p.y, gen.coast_dist(p.x, p.z), preset.title, stats_line()]
	Shot.tick(self, dt)
