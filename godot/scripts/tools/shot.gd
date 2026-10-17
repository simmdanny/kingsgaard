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
## --set=key:value,... applies settings for the run (keys as in scripts/ui/settings.gd, e.g. --set=render_scale:0,grass:0). --look=x,y,z (with --orbit) aims the camera at that
## point relative to the hero's feet instead of the head - for close-ups of the hands.
## --preset=A_current|B_stylized picks the art preset (art/<name>.tres) for the run.
## --compare=DIR renders the art preset comparison instead: three views (wide landscape, mid view, close to the ground with the
## hero), each in every preset of main.gd PRESETS, saved as DIR/<view>_<preset>.png and side by side as DIR/<view>_A_vs_B.png:
##   Godot_console.exe --path <project> --resolution 1280x720 -- --compare=C:/out
## Prints one line: SHOT <file> fps=... ms=... worst=<slowest frame, ms> plus the world's counters.

var active := false
var path := ""
var cam := PackedFloat32Array()
var spawn := Vector2(INF, INF)
var seed_value := 1
var settle := 30
var measure := 150
var max_wait := 120.0
var walk := 0.0
var move := "forward"
var gait := "sprint"
var orbit := Vector2.ZERO
var orbit_yaw := 0.0
var burst := 0
var hero := "female"
var ui := ""
var settings := {}
var look := Vector3(INF, INF, INF)
var preset := ""
var compare := ""

## the comparison views: [name, camera (x, z, height over the ground, target x, z, target height) or [] for the hero's own
## camera, hero spot (x, z), orbit (distance, pitch down, yaw) degrees]; "rocks": the camera 9 m from the biggest boulder near the
## hero's spot, looking at it, the hero beside it
const VIEWS := [
	["1_wide", [-160.0, -140.0, 38.0, -7.0, 330.0, 4.0], Vector2(-7.0, 26.0), Vector3.ZERO],
	["2_mid", [-40.0, 75.0, 5.0, -5.0, 150.0, 5.0], Vector2(-7.0, 26.0), Vector3.ZERO],
	["3_close", [], Vector2(-20.0, 112.0), Vector3(4.2, 6.0, 200.0)],
	["4_rocks", ["rocks"], Vector2(-7.0, 26.0), Vector3.ZERO],
]

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
			"ui":
				ui = val
			"set":
				for kv2 in val.split(","):
					var pr := kv2.split(":")
					settings[pr[0]] = float(pr[1]) if pr[1].contains(".") else int(pr[1])
			"preset":
				preset = val
			"compare":
				compare = val
			"look":
				var l := val.split(",")
				look = Vector3(float(l[0]), float(l[1]), float(l[2]))
	active = path != "" or compare != ""
	if active:
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
		Engine.max_fps = 0


func tick(main: Node, dt: float) -> void:
	if not active:
		return
	if compare != "":
		if _state == 0:
			_state = 9
			_compare(main)
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
	get_tree().quit()


## the art preset comparison (--compare): every view in every preset, one image each and one side by side per view
func _compare(main: Node) -> void:
	DirAccess.make_dir_recursive_absolute(compare)
	var t0 := Time.get_ticks_msec()
	for v in VIEWS:
		var spot: Vector2 = v[2]
		main.player.place(spot.x, spot.y)
		var c: Array = v[1]
		if not c.is_empty() and c[0] is String:
			c = await _rock_view(main, spot)
		if c.is_empty():
			main.rig.pinned = false
			var o: Vector3 = v[3]
			main.rig.dist = o.x
			main.rig.pitch = deg_to_rad(-o.y)
			main.rig.yaw = deg_to_rad(o.z)
		else:
			var g = main.gen
			main.rig.pin(Vector3(c[0], maxf(g.height(c[0], c[1]), 0.0) + c[2], c[1]), Vector3(c[3], maxf(g.height(c[3], c[4]), 0.0) + c[5], c[4]))
		var imgs := []
		for i in main.PRESETS.size():
			main.apply_preset(i)
			var idle := 0
			var waited := 0.0
			while idle < 15 and waited < max_wait:
				await get_tree().process_frame
				waited += get_process_delta_time()
				idle = idle + 1 if main.world_idle() else 0
			for k in maxi(settle, 2):
				await get_tree().process_frame
			await RenderingServer.frame_post_draw
			var img := get_viewport().get_texture().get_image()
			img.save_png(compare.path_join("%s_%s.png" % [v[0], main.preset.title]))
			imgs.append(img)
			print("COMPARE %s %s at %.0fs  %s" % [v[0], main.preset.title, (Time.get_ticks_msec() - t0) / 1000.0, main.stats_line()])
		var w: int = imgs[0].get_width()
		var h: int = imgs[0].get_height()
		var gap := 8
		var side := Image.create(w * imgs.size() + gap * (imgs.size() - 1), h, false, imgs[0].get_format())
		side.fill(Color(0.05, 0.05, 0.06))
		for i in imgs.size():
			side.blit_rect(imgs[i], Rect2i(0, 0, w, h), Vector2i(i * (w + gap), 0))
		side.save_png(compare.path_join("%s_A_vs_B.png" % v[0]))
	print("COMPARE done in %.0fs" % ((Time.get_ticks_msec() - t0) / 1000.0))
	get_tree().quit()


## a camera for the "rocks" view: waits for the boulders round spot, takes the biggest within 160 m, and looks at it from 9 m off
## (on the side the sun lights), the hero standing beside it
func _rock_view(main: Node, spot: Vector2) -> Array:
	main.rig.pin(Vector3(spot.x, main.gen.height(spot.x, spot.y) + 3.0, spot.y), Vector3(spot.x + 10.0, main.gen.height(spot.x + 10.0, spot.y), spot.y))
	for _i in 60:
		await get_tree().process_frame
		if main.boulders.is_idle():
			break
	var best = null
	for key in main.boulders._tiles:
		var list = main.boulders._tiles[key]
		if list == null:
			continue
		for b in list:
			if Vector2(b.x, b.z).distance_to(spot) < 160.0 and (best == null or b.sc > best.sc):
				best = b
	if best == null:
		return [spot.x - 9.0, spot.y, 2.5, spot.x, spot.y, 0.6]
	var sd: Vector3 = main._sun.basis.z
	var away: Vector2 = Vector2(sd.x, sd.z).normalized().rotated(0.7) * (3.2 + 2.2 * best.sc)
	main.player.place(best.x - away.y * 0.25 + away.x * 0.35, best.z + away.x * 0.25 + away.y * 0.35)
	return [best.x + away.x, best.z + away.y, 1.3 + 0.5 * best.sc, best.x, best.z, 0.25 * best.sc]
