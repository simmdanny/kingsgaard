extends SceneTree
## SURROUND PROBE (scripts/tools/surround_probe.gd): the base terrain round the tepui region - per direction (every 20 degrees),
## the highest ground and its tier at 2 - 14 km from the region's centre. For placing the background mountains.
##   Godot_console.exe --headless --path . --script res://scripts/tools/surround_probe.gd

const Config := preload("res://scripts/world/base_terrain_config.gd")
const Gen := preload("res://scripts/world/base_terrain_gen.gd")


func _initialize() -> void:
	var cfg = Config.new()
	var gen = Gen.new(cfg)
	if not gen.load_cache("user://terrain/base_%d_%s.bin" % [cfg.seed_value, cfg.cache_key(Gen.VERSION)]):
		print("no base cache")
		quit()
		return
	var c := Vector2(4000.0, -1496.0)
	print("map size %.0f, origin %.0f, sp %.1f" % [gen.map_size, gen.origin, gen.sp])
	for a in range(0, 360, 20):
		var d := Vector2.from_angle(deg_to_rad(a))
		var line := ""
		for r in range(2000, 14001, 1000):
			var p := c + d * r
			var h: float = gen.height(p.x - gen.offset.x, p.y - gen.offset.y)
			var t: int = gen.tier_at(p.x, p.y)
			line += " %2dk:%4.0f/%d" % [r / 1000, h, t]
		print("%3d deg:%s" % [a, line])
	quit()
