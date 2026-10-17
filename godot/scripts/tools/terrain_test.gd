extends SceneTree
## TERRAIN GENERATOR TEST (scripts/tools/terrain_test.gd): runs the generator alone (no rendering), prints its report (times,
## tier areas, passes and walk checks, reachability) and writes quick maps of the planning grid to the given folder:
## tiers, heights and slopes, with passes and river courses marked.
##   Godot_console.exe --headless --path . --script res://scripts/tools/terrain_test.gd -- [seed] [out_folder]

const TerrainConfig := preload("res://scripts/world/terrain_config.gd")
const TerrainGen := preload("res://scripts/world/terrain_gen.gd")


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var cfg = TerrainConfig.new()
	if args.size() > 0:
		cfg.seed_value = int(args[0])
	var out := args[1] if args.size() > 1 else ""
	var gen = TerrainGen.new(cfg)
	gen.verbose = true
	gen.generate()
	print(JSON.stringify(gen.report, "  "))
	var bad := []
	for p in gen.passes:
		if not p.ok:
			bad.append("level %d region %d slope %.1f width %.0f dh %.0f" % [p.level, p.region, p.slope_max, p.width, p.dh])
	print("passes not walkable: ", bad.size(), " ", bad)
	print("pois: ", gen.pois)
	if out != "":
		_maps(gen, out)
	quit()


func _maps(gen, out: String) -> void:
	var n: int = gen.cres
	var tier_cols := [Color(0.86, 0.79, 0.50), Color(0.40, 0.70, 0.30), Color(0.78, 0.66, 0.30), Color(0.62, 0.42, 0.62), Color(0.93, 0.93, 0.95)]
	var ti := Image.create_empty(n, n, false, Image.FORMAT_RGB8)
	var hi := Image.create_empty(n, n, false, Image.FORMAT_RGB8)
	var si := Image.create_empty(n, n, false, Image.FORMAT_RGB8)
	for j in n:
		for i in n:
			var q := j * n + i
			var t: int = gen.c_tier[q]
			var h: float = gen.c_h[q]
			var s: float = gen.c_slope[q]
			if t == 255:
				ti.set_pixel(i, j, Color(0.15, 0.35, 0.65))
				si.set_pixel(i, j, Color(0.15, 0.35, 0.65))
			else:
				var tc: Color = tier_cols[t]
				if gen.c_pass[q] > 0.3:
					tc = tc.lerp(Color(0.1, 0.9, 0.95), 0.7)
				if gen.c_river[q] > 0.3:
					tc = Color(0.1, 0.3, 0.9)
				ti.set_pixel(i, j, tc)
				si.set_pixel(i, j, Color(0.25, 0.75, 0.3) if s <= 35.0 else (Color(0.95, 0.55, 0.15) if s < 50.0 else Color(0.85, 0.12, 0.1)))
			hi.set_pixel(i, j, _hcol(h))
	ti.save_png(out + "/tiers.png")
	hi.save_png(out + "/height.png")
	si.save_png(out + "/slope.png")


static func _hcol(h: float) -> Color:
	if h < 0.0:
		return Color(0.1, 0.25, 0.55).lerp(Color(0.25, 0.55, 0.8), clampf(1.0 + h / 30.0, 0.0, 1.0))
	var stops := [[0.0, Color(0.25, 0.55, 0.8)], [20.0, Color(0.3, 0.65, 0.3)], [120.0, Color(0.85, 0.82, 0.35)], [280.0, Color(0.55, 0.38, 0.22)], [600.0, Color(1, 1, 1)]]
	for k in range(1, stops.size()):
		if h <= stops[k][0]:
			return (stops[k - 1][1] as Color).lerp(stops[k][1], (h - stops[k - 1][0]) / (stops[k][0] - stops[k - 1][0]))
	return Color(1, 1, 1)
