extends Node
## AUTOMATED SCREENSHOTS (scripts/tools/shot.gd, autoload "Shot"): run the game with user arguments after "--" and it waits for
## the world to finish streaming, lets it settle, times a run of frames (vsync off), saves the frame and quits:
##   Godot_console.exe --path <project> --resolution 1280x720 -- --shot=C:/out.png [--cam=x,z,h,tx,tz,th] [--spawn=x,z]
##       [--seed=1] [--settle=30] [--measure=150] [--walk=20] [--move=forward] [--gait=sprint] [--orbit=dist,pitch]
##       [--burst=6] [--hero=female|male] [--menu]
## --cam puts the camera at (x, ground+h, z) looking at (tx, ground+th, tz); without it the normal third-person view is used.
## (--orbit=dist,pitch,yaw also turns the camera round the hero by yaw degrees: 90 = from his left side.)
## --walk=S moves the hero for S seconds while timing (the streaming test) instead of standing still: --move picks the direction
## (forward/back/left/right, relative to the camera), --gait walk/run/sprint. --orbit sets the third-person camera's distance (m)
## and pitch (degrees). --burst=K saves K frames 0.1 s apart (NAME_0.png ...) instead of one - to look at a walk cycle.
## --ui=title|heroes|settings|controls|credits|loading|pause shows that menu screen instead of skipping the menus (--menu = title).
## --view=height|tiers|slope|steep shows a terrain debug map; --overview looks straight down on the whole map (orthographic;
## use a square --resolution); --poi=low|edge|mount puts the hero and camera at a place the terrain generator found (lowlands
## looking up at a high plateau, a plateau's rim looking down over the lowlands, a mountain top looking across the island;
## pass = a walkable pass, old continent only). --cam and --spawn take map coordinates. --overview=region looks straight down
## on the region instead; --bookmark=ref1|ref2|ref3|ref4 shows one of the region's four bookmark views (after the reference
## pictures; use a portrait --resolution like 585x1040, as they are).
## --set=key:value,... applies settings for the run (keys as in scripts/ui/settings.gd, e.g. --set=render_scale:0,grass:0). --look=x,y,z (with --orbit) aims the camera at that
## point relative to the hero's feet instead of the head - for close-ups of the hands.
## --camfile=C:/cams.txt takes many --cam shots in one run: one per line, "C:/out.png x,z,h,tx,tz,th" (the hero and the floating
## origin moved under each camera, the world streamed in round it before each frame is saved).
## --perf=N (after each shot) times N frames of the GPU's work (the viewport's measured render time) with everything drawn, then
## with the carved features hidden, the region's walls hidden, the terrain hidden, and all three hidden: the differences are each
## group's share; then the sea hidden, and a few cheaper set-ups (MSAA off, render scale 75 / 67% with FSR, the sea off, smaller
## shadow maps). Prints PERF <file> <config> gpu=ms cpu=ms frame=ms prims=... draws=... size=<window> per config.
## --hide=carved|lods|walls|terrain|water|shadows (comma-separated; lods = the carved features' coarser meshes). --waterdebug
## tints the water by kind (green flat, yellow rapids, red falls). hides those parts of the world (or the sun's shadows) in the saved
## frames, to tell them apart.
## Prints one line per frame: SHOT <file> fps=... ms=... worst=<slowest frame, ms> plus the world's counters.

var active := false
var path := ""
var cam := PackedFloat32Array()
var spawn := Vector2(INF, INF)
var seed_value := 1
var settle := 30
var measure := 150
var max_wait := 300.0
var walk := 0.0
var move := "forward"
var gait := "sprint"
var orbit := Vector2.ZERO
var orbit_yaw := 0.0
var burst := 0
var hero := "female"
var ui := ""
var view := ""
var overview := false
var overview_target := ""
var poi := ""
var bookmark := ""
var fov := 0.0
var settings := {}
var look := Vector3(INF, INF, INF)
var perf := 0
var hide := PackedStringArray()
var water_debug := false
## --perfwater: the water's cost alone, measured on / off / on / off ... (four pairs, so the laptop's drifting clocks average out)
var perf_water := false
## --perfpairs: each part's cost measured against the whole drawn just before and just after it (all, no water, all, no
## terrain, all, ...), so the laptop's drifting clocks cancel out; then the cheapest settings
var perf_pairs := false
## the rest of a --camfile's shots: [path, cam]
var queue := []

var _state := 0
var _t := 0.0
var _n := 0
var _acc := 0.0
var _idle := 0
var _worst := 0.0


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		var val := kv[1] if kv.size() > 1 else ""
		match kv[0]:
			"shot":
				path = val
			"cam":
				cam = PackedFloat32Array(Array(val.split(",")).map(func(s): return float(s)))
			"spawn":
				var p := val.split(",")
				spawn = Vector2(float(p[0]), float(p[1]))
			"seed":
				seed_value = int(val)
			"settle":
				settle = int(val)
			"measure":
				measure = int(val)
			"walk":
				walk = float(val)
			"move":
				move = val
			"gait":
				gait = val
			"orbit":
				var o := val.split(",")
				orbit = Vector2(float(o[0]), float(o[1]))
				if o.size() > 2:
					orbit_yaw = float(o[2])
			"burst":
				burst = int(val)
			"hero":
				hero = val
			"menu":
				ui = "title"
			"view":
				view = val
			"overview":
				overview = true
				overview_target = val
			"bookmark":
				bookmark = val
			"fov":
				fov = float(val)
			"poi":
				poi = val
			"ui":
				ui = val
			"set":
				for kv2 in val.split(","):
					var pr := kv2.split(":")
					settings[pr[0]] = float(pr[1]) if pr[1].contains(".") else int(pr[1])
			"perf":
				perf = int(val)
			"hide":
				hide = val.split(",")
			"waterdebug":
				water_debug = true
			"perfwater":
				perf_water = true
			"perfpairs":
				perf_pairs = true
			"look":
				var l := val.split(",")
				look = Vector3(float(l[0]), float(l[1]), float(l[2]))
			"camfile":
				for line in FileAccess.get_file_as_string(val).split("
", false):
					var parts := line.strip_edges().split(" ", false)
					if parts.size() >= 2:
						queue.append([parts[0], PackedFloat32Array(Array(parts[1].split(",")).map(func(s): return float(s)))])
				if not queue.is_empty():
					var first: Array = queue.pop_front()
					path = first[0]
					cam = first[1]
	active = path != ""
	if active:
		# (a screenshot run stays out of the way: no focus taken from what the user is doing - the scripts start it off-screen
		# with --position 3000,0, never fullscreen)
		DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_NO_FOCUS, true)
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
		Engine.max_fps = 0
		RenderingServer.viewport_set_measure_render_time(get_viewport().get_viewport_rid(), true)


func tick(main: Node, dt: float) -> void:
	if not active:
		return
	_t += dt
	match _state:
		0:
			_idle = _idle + 1 if main.world_idle() else 0
			if (_idle > 15 and _t > 3.0) or _t > max_wait:
				_state = 1
				_n = 0
		1:
			_n += 1
			if _n >= settle:
				_state = 2
				_n = 0
				_acc = 0.0
				if walk > 0.0:
					Input.action_press("move_" + move)
					if gait != "walk":
						Input.action_press(gait)
		2:
			_acc += dt
			_n += 1
			_worst = maxf(_worst, dt)
			if (walk > 0.0 and _acc >= walk) or (walk <= 0.0 and _n >= measure):
				_state = 3
				_capture(main)


func _capture(main: Node) -> void:
	if water_debug and main.terrain.walls.has_meta("water_materials"):
		for wm in main.terrain.walls.get_meta("water_materials"):
			(wm as ShaderMaterial).set_shader_parameter("debug_tint", 1)
		await RenderingServer.frame_post_draw
	if not hide.is_empty():
		for ch in main.terrain.walls.get_children():
			if (ch.has_meta("carved") and hide.has("carved")) or (ch.has_meta("wall") and hide.has("walls")) or (int(ch.get_meta("carved", 0)) > 0 and hide.has("lods")) or (ch.has_meta("water") and hide.has("water")):
				ch.visible = false
			# (without the LODs the full mesh is drawn at every distance)
			if hide.has("lods") and ch.has_meta("carved") and int(ch.get_meta("carved")) == 0:
				(ch as GeometryInstance3D).visibility_range_end = 0.0
		if hide.has("terrain"):
			main.terrain.terrain.visible = false
		if hide.has("shadows"):
			main._sun.shadow_enabled = false
		for k in 3:
			await RenderingServer.frame_post_draw
	for k in maxi(burst, 1):
		await RenderingServer.frame_post_draw
		var img := get_viewport().get_texture().get_image()
		var out := path if burst <= 1 else path.get_basename() + "_%d." % k + path.get_extension()
		if out.ends_with(".jpg"):
			img.save_jpg(out, 0.9)
		else:
			img.save_png(out)
		if k < burst - 1:
			await get_tree().create_timer(0.1).timeout
	Input.action_release("move_" + move)
	if gait != "walk":
		Input.action_release(gait)
	print("SHOT %s fps=%.1f ms=%.2f worst=%.1f waited=%.1fs %s" % [path, _n / _acc, 1000.0 * _acc / _n, 1000.0 * _worst, _t,
		main.stats_line()])
	if perf > 0:
		await _perf(main)
	if not queue.is_empty():
		# the next camera of a --camfile: wait for the world round it again
		var nx: Array = queue.pop_front()
		path = nx[0]
		cam = nx[1]
		main.shot_cam(cam)
		_state = 0
		_t = 0.0
		_idle = 0
		_n = 0
		_worst = 0.0
		return
	get_tree().quit()


## the GPU's time per frame with each group of the world hidden in turn (see --perf)
func _perf(main: Node) -> void:
	var tw = main.terrain
	var carved := []
	var walls := []
	for ch in tw.walls.get_children():
		if ch.has_meta("carved"):
			carved.append(ch)
		elif ch.has_meta("wall"):
			walls.append(ch)
	var water := []
	for ch in tw.walls.get_children():
		if ch.has_meta("water"):
			water.append(ch)
	var groups := {"carved": carved, "walls": walls, "terrain": [tw.terrain], "water": water}
	var configs := [["all", []], ["no_water", ["water"]], ["no_carved", ["carved"]], ["no_walls", ["walls"]], ["no_terrain", ["terrain"]],
		["none", ["carved", "walls", "terrain", "water"]], ["all_no_msaa", ["-msaa"]], ["all_no_shadows", ["-shadows"]],
		["all_no_sea", ["-sea"]], ["none_no_sea", ["carved", "walls", "terrain", "water", "-sea"]],
		["none_no_sea_sky", ["carved", "walls", "terrain", "water", "-sea", "-sky"]],
		["cut_msaa_scale75", ["-msaa", "-scale75"]], ["cut_msaa_scale67", ["-msaa", "-scale67"]],
		["cut_msaa_scale67_sea", ["-msaa", "-scale67", "-sea"]], ["cut_msaa_scale67_sea_shlow", ["-msaa", "-scale67", "-sea", "-shadowlow"]]]
	if perf_pairs:
		configs = [["all", []]]
		for x in [["no_water", ["water"]], ["no_terrain", ["terrain"]], ["no_walls", ["walls"]], ["no_carved", ["carved"]],
				["all_no_msaa", ["-msaa"]], ["all_no_shadows", ["-shadows"]], ["all_no_sea", ["-sea"]],
				["none_no_sea", ["carved", "walls", "terrain", "water", "-sea"]]]:
			configs.append(x)
			configs.append(["all", []])
		configs.append(["cut_msaa_scale67_sea_shlow", ["-msaa", "-scale67", "-sea", "-shadowlow"]])
	if perf_water:
		configs = []
		for k in 4:
			configs.append(["water_on", []])
			configs.append(["water_off", ["water"]])
	var env: Environment = main._env
	var msaa := get_viewport().msaa_3d
	var shadows: bool = main._sun.shadow_enabled
	var bg := env.background_mode
	var sea_on: bool = main.ocean.visible
	var sc_mode := get_viewport().scaling_3d_mode
	var sc_scale := get_viewport().scaling_3d_scale
	var vp := get_viewport().get_viewport_rid()
	var keep := {}
	for g in groups:
		for nd in groups[g]:
			keep[nd] = nd.visible
	for cf in configs:
		var off: Array = cf[1]
		for g in groups:
			for nd in groups[g]:
				nd.visible = keep[nd] and not off.has(g)
		get_viewport().msaa_3d = Viewport.MSAA_DISABLED if off.has("-msaa") else msaa
		main._sun.shadow_enabled = shadows and not off.has("-shadows")
		env.background_mode = Environment.BG_COLOR if off.has("-sky") else bg
		main.ocean.visible = sea_on and not off.has("-sea")
		if off.has("-scale75") or off.has("-scale67"):
			get_viewport().scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR
			get_viewport().scaling_3d_scale = 0.75 if off.has("-scale75") else 0.667
		else:
			get_viewport().scaling_3d_mode = sc_mode
			get_viewport().scaling_3d_scale = sc_scale
		RenderingServer.directional_shadow_atlas_set_size(1024 if off.has("-shadowlow") else 2048, true)
		for k in 20:
			await get_tree().process_frame
		var gpu := 0.0
		var cpu := 0.0
		var t0 := Time.get_ticks_usec()
		for k in perf:
			await get_tree().process_frame
			gpu += RenderingServer.viewport_get_measured_render_time_gpu(vp)
			cpu += RenderingServer.viewport_get_measured_render_time_cpu(vp)
		var frame := (Time.get_ticks_usec() - t0) / 1000.0 / perf
		var vsz := DisplayServer.window_get_size()
		print("PERF %s %s gpu=%.2f cpu=%.2f frame=%.2f prims=%d draws=%d size=%dx%d" % [path.get_file(), cf[0], gpu / perf, cpu / perf, frame,
			RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME),
			RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME), vsz.x, vsz.y])
	for nd in keep:
		nd.visible = keep[nd]
	get_viewport().msaa_3d = msaa
	main._sun.shadow_enabled = shadows
	env.background_mode = bg
	main.ocean.visible = sea_on
	get_viewport().scaling_3d_mode = sc_mode
	get_viewport().scaling_3d_scale = sc_scale
