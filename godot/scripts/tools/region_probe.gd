extends SceneTree
## REGION PROBE (scripts/tools/region_probe.gd): loads the cached base terrain and region and prints, for layout points
## (u,v from the region's centre), the level and height there and the nearest edge of that terrace: how far, which way
## (inward normal, in u,v), and whether it is a rim (the ground beyond it lower) or a wall's foot (higher). For placing the
## bookmark cameras.
##   Godot_console.exe --headless --path . --script res://scripts/tools/region_probe.gd -- u,v u,v ...
##   (or -- line u0,v0 u1,v1 step: every step m along a line)

const Config := preload("res://scripts/world/base_terrain_config.gd")
const Gen := preload("res://scripts/world/base_terrain_gen.gd")
const RegionSettings := preload("res://scripts/world/region_settings.gd")
const Region := preload("res://scripts/world/tepui_region.gd")


func _initialize() -> void:
	var cfg = Config.new()
	var gen = Gen.new(cfg)
	var key: String = cfg.cache_key(Gen.VERSION)
	if not gen.load_cache("user://terrain/base_%d_%s.bin" % [cfg.seed_value, key]):
		print("no base cache")
		quit()
		return
	var rcfg = RegionSettings.new()
	var region = Region.new(rcfg, gen)
	if not region.load_cache("user://terrain/region_%d_%s.bin" % [cfg.seed_value, rcfg.cache_key(Region.VERSION, key)]):
		print("no region cache (run region_test.gd first)")
		quit()
		return
	var args := OS.get_cmdline_user_args()
	var pts := []
	if args.size() >= 4 and args[0] == "mapline":
		# (a line in map coordinates: heights every step m, no edge lookups)
		var a0 := _uv(args[1])
		var b0 := _uv(args[2])
		var st0 := float(args[3])
		var t0 := 0.0
		while t0 <= a0.distance_to(b0):
			var q: Vector2 = a0.lerp(b0, t0 / a0.distance_to(b0))
			print("map %.0f %.0f  along %4.0f  height %6.1f" % [q.x, q.y, t0, region.height_at(q) - region.floor_h])
			t0 += st0
		quit()
		return
	if args.size() >= 4 and args[0] == "line":
		var a := _uv(args[1])
		var b := _uv(args[2])
		var st := float(args[3])
		var t := 0.0
		while t <= a.distance_to(b):
			pts.append(a.lerp(b, t / a.distance_to(b)))
			t += st
	else:
		for a in args:
			pts.append(_uv(a))
	for uv in pts:
		var p: Vector2 = region._from_uv(uv)
		var lv: int = region.level_at(p.x - gen.offset.x, p.y - gen.offset.y)
		var h: float = region.height_at(p)
		var e: Dictionary = region._edge_near(p)
		var line := "u %6.0f v %6.0f  level %d  height %5.0f" % [uv.x, uv.y, lv, h - region.floor_h]
		if not e.is_empty():
			var ep: Vector2 = e.at
			var nin: Vector2 = e.inward
			var beyond: float = region.height_at(ep - nin * 12.0)
			var nuv := Vector2(nin.dot(region.axis_u), nin.dot(region.axis_v))
			line += "  edge %4.0f m away, inward (%5.2f, %5.2f), %s (beyond: %4.0f)" % [ep.distance_to(p), nuv.x, nuv.y, "RIM" if beyond < h - 20.0 else "foot", beyond - region.floor_h]
		print(line)
	quit()


static func _uv(s: String) -> Vector2:
	var a := s.split(",")
	return Vector2(float(a[0]), float(a[1]))
