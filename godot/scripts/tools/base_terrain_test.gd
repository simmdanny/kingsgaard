extends SceneTree
## BASE TERRAIN TEST (scripts/tools/base_terrain_test.gd): runs the clean base terrain generator alone (no rendering), prints its
## report (times, island size, tiers with their heights, routes per edge, slopes, reachability, regions) and writes quick maps of
## the planning grid (every other cell, 1024 x 1024) to the given folder: heights (50 m contours), tiers (valleys blue, routes
## cyan), slopes (green walkable / red too steep) and the steep-edge mask. Also writes the game's terrain cache for that seed.
##   Godot_console.exe --headless --path . --script res://scripts/tools/base_terrain_test.gd -- [seed] [out_folder]

const Config := preload("res://scripts/world/base_terrain_config.gd")
const Gen := preload("res://scripts/world/base_terrain_gen.gd")


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var cfg = Config.new()
	if args.size() > 0:
		cfg.seed_value = int(args[0])
	var out := args[1] if args.size() > 1 else ""
	var gen = Gen.new(cfg)
	gen.verbose = true
	gen.generate()
	print(JSON.stringify(gen.report, "  "))
	var bad := []
	for r in gen.routes:
		if not r.ok:
			bad.append("%s level %d region %d at %s" % [r.kind, r.level, r.region, str(r.at)])
	print("routes not walkable: ", bad.size(), " ", bad)
	print("pois: ", gen.pois)
	# the game's own cache, so the next start loads this island instead of making it again
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("user://terrain"))
	for f in DirAccess.get_files_at("user://terrain"):
		if f.begins_with("base_") and f.ends_with(".bin"):
			DirAccess.remove_absolute(ProjectSettings.globalize_path("user://terrain/" + f))
	gen.save("user://terrain/base_%d_%s.bin" % [cfg.seed_value, cfg.cache_key(Gen.VERSION)])
	if out != "":
		_maps(gen, out)
	quit()


func _maps(gen, out: String) -> void:
	var pn: int = gen.pres
	var n := pn / 2
	var tier_cols := [Color(0.90, 0.80, 0.45), Color(0.35, 0.68, 0.28), Color(0.86, 0.62, 0.22), Color(0.58, 0.36, 0.62), Color(0.95, 0.95, 0.97)]
	var sea := Color(0.12, 0.30, 0.60)
	var hb := PackedByteArray()
	hb.resize(n * n * 3)
	var tb := hb.duplicate()
	var sb := hb.duplicate()
	var mb := hb.duplicate()
	for j in n:
		for i in n:
			var q := (2 * j) * pn + 2 * i
			var t: int = gen.c_tier[q]
			var h: float = gen.c_h[q]
			var s: float = gen.c_slope[q]
			var hc := _hcol(h)
			# a darker line every 50 m
			var hn: float = gen.c_h[q + 2] if i < n - 1 else h
			var hs: float = gen.c_h[q + 2 * pn] if j < n - 1 else h
			if h > 0.0 and (floor(h / 50.0) != floor(hn / 50.0) or floor(h / 50.0) != floor(hs / 50.0)):
				hc = hc.darkened(0.35)
			var tc: Color = sea if t == 255 else tier_cols[t]
			if t != 255 and gen.c_valley[q] > 90:
				tc = tc.lerp(Color(0.10, 0.28, 0.90), 0.75)
			var sc: Color = sea if t == 255 else (Color(0.20, 0.72, 0.28) if s <= 35.0 else (Color(0.92, 0.24, 0.16) if s <= 40.0 else Color(0.45, 0.0, 0.0)))
			var m: float = gen.c_steep[q] / 255.0
			var mc: Color = sea if t == 255 else Color(0.82, 0.84, 0.80).lerp(Color(0.85, 0.10, 0.10), m)
			var o := (j * n + i) * 3
			for c in 3:
				hb[o + c] = int(hc[c] * 255.0)
				tb[o + c] = int(tc[c] * 255.0)
				sb[o + c] = int(sc[c] * 255.0)
				mb[o + c] = int(mc[c] * 255.0)
	var ti := Image.create_from_data(n, n, false, Image.FORMAT_RGB8, tb)
	for r in gen.routes:
		var at: Vector2 = r.at
		var c := Vector2i(int(gen._gf(at.x, n)), int(gen._gf(at.y, n)))
		var col := Color(0.1, 0.95, 0.95) if r.ok else Color(1.0, 0.0, 0.0)
		for dj in range(-4, 5):
			for di in range(-4, 5):
				if di * di + dj * dj <= 16 and c.x + di >= 0 and c.y + dj >= 0 and c.x + di < n and c.y + dj < n:
					ti.set_pixel(c.x + di, c.y + dj, col)
	for key in ["low_stand", "edge_stand", "mount_stand"]:
		if gen.pois.has(key):
			var p: Vector3 = gen.pois[key]
			var c := Vector2i(int(gen._gf(p.x, n)), int(gen._gf(p.z, n)))
			for dj in range(-6, 7):
				for di in range(-6, 7):
					if absi(di) == absi(dj) and c.x + di >= 0 and c.y + dj >= 0 and c.x + di < n and c.y + dj < n:
						ti.set_pixel(c.x + di, c.y + dj, Color(0, 0, 0))
	ti.save_png(out + "/tiers.png")
	Image.create_from_data(n, n, false, Image.FORMAT_RGB8, hb).save_png(out + "/height.png")
	Image.create_from_data(n, n, false, Image.FORMAT_RGB8, sb).save_png(out + "/slope.png")
	Image.create_from_data(n, n, false, Image.FORMAT_RGB8, mb).save_png(out + "/steep_mask.png")


static func _hcol(h: float) -> Color:
	if h < 0.0:
		return Color(0.05, 0.16, 0.42).lerp(Color(0.20, 0.48, 0.78), clampf(1.0 + h / 30.0, 0.0, 1.0))
	var stops := [[0.0, Color(0.20, 0.48, 0.78)], [10.0, Color(0.30, 0.62, 0.30)], [80.0, Color(0.55, 0.75, 0.30)], [150.0, Color(0.88, 0.82, 0.30)],
		[350.0, Color(0.80, 0.52, 0.22)], [450.0, Color(0.62, 0.40, 0.22)], [700.0, Color(0.50, 0.36, 0.30)], [900.0, Color(0.62, 0.58, 0.58)],
		[1500.0, Color(1, 1, 1)]]
	for k in range(1, stops.size()):
		if h <= stops[k][0]:
			return (stops[k - 1][1] as Color).lerp(stops[k][1], (h - stops[k - 1][0]) / (stops[k][0] - stops[k - 1][0]))
	return Color(1, 1, 1)
