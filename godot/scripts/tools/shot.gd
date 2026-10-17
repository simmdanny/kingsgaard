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
## Prints one line: SHOT <file> fps=... ms=... worst=<slowest frame, ms> plus the world's counters.

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
			"look":
				var l := val.split(",")
				look = Vector3(float(l[0]), float(l[1]), float(l[2]))
	active = path != ""
	if active:
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
		Engine.max_fps = 0


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
