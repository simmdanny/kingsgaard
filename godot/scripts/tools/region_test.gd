extends SceneTree
## REGION TEST (scripts/tools/region_test.gd): loads the cached base terrain, builds the tepui region on it (no rendering),
## prints its report and writes an annotated map of the region to the given folder (region_map.png): heights in colour with a
## contour every 50 m, holes (where walls stand) dark, ramps cyan, the valley and canyon centre lines blue, the bookmarks as
## camera marks with their view direction. Also writes the game's region cache.
##   Godot_console.exe --headless --path . --script res://scripts/tools/region_test.gd -- [out_folder]

const Config := preload("res://scripts/world/base_terrain_config.gd")
const Gen := preload("res://scripts/world/base_terrain_gen.gd")
const RegionSettings := preload("res://scripts/world/region_settings.gd")
const Region := preload("res://scripts/world/tepui_region.gd")


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out := args[0] if args.size() > 0 else ""
	var cfg = Config.new()
	var gen = Gen.new(cfg)
	var key: String = cfg.cache_key(Gen.VERSION)
	if not gen.load_cache("user://terrain/base_%d_%s.bin" % [cfg.seed_value, key]):
		print("no base cache")
		quit()
		return
	var rcfg = RegionSettings.new()
	var region = Region.new(rcfg, gen)
	region.verbose = true
	region.generate()
	print(JSON.stringify(region.report, "  "))
	for r in region.ramps:
		print("ramp level %d plateau %d at %s length %.0f m rise %.0f m  %s" % [r.level, r.plateau, str(r.at), r.length, float(r.top) - float(r.low), "ok" if r.get("ok", false) else "NOT WALKABLE"])
		if not r.get("ok", false):
			var p0r: Vector2 = r.at
			var dr: Vector2 = r.dir
			var sr := Vector2(-dr.y, dr.x)
			for a2 in range(-20, 40, 6):
				var row := "     along %3d:" % a2
				for l2 in range(-30, 31, 6):
					row += " %6.1f" % region.height_at(p0r + dr * a2 + sr * l2)
				print(row)
			var line := "   reached " + str(r.get("reach", "?")) + "   profile (along, height, hole):"
			var p0: Vector2 = r.at
			var d: Vector2 = r.dir
			for s in range(-40, int(r.length) + 20, 16):
				var q := p0 + d * s
				line += " %d:%.0f%s" % [s, region.height_at(q), "H" if region.hole_at(q.x - region.gen.offset.x, q.y - region.gen.offset.y) else ""]
			print(line)
	print("bookmarks: ", region.bookmarks)
	for ci in region.paths.canyons.size():
		var pth: Dictionary = region.paths.canyons[ci]
		var pp: PackedVector2Array = pth.points
		var ww: PackedFloat32Array = pth.width
		var line := "canyon %d%s:" % [ci, " (long)" if pth.get("long", false) else ""]
		for k in range(0, pp.size(), 8):
			line += " (%.0f,%.0f w%.0f L%d h%.0f)" % [pp[k].x, pp[k].y, ww[k], region.level_at(pp[k].x - region.gen.offset.x, pp[k].y - region.gen.offset.y), region.height_at(pp[k])]
		print(line)
	for f in DirAccess.get_files_at("user://terrain"):
		if f.begins_with("region_") and f.ends_with(".bin"):
			DirAccess.remove_absolute(ProjectSettings.globalize_path("user://terrain/" + f))
	region.save("user://terrain/region_%d_%s.bin" % [cfg.seed_value, rcfg.cache_key(Region.VERSION, key)])
	if out != "":
		_map(region, out)
	quit()


func _map(region, out: String) -> void:
	var fn: int = region.fn
	var n := fn / 2
	var img := Image.create_empty(n, n, false, Image.FORMAT_RGB8)
	var fh: PackedFloat32Array = region.fh
	var fhole: PackedByteArray = region.fhole
	for j in n:
		for i in n:
			var q := (2 * j) * fn + 2 * i
			var h := fh[q]
			var c := _hcol(h)
			var hn := fh[q + 2] if i < n - 1 else h
			var hs := fh[q + 2 * fn] if j < n - 1 else h
			if floor(h / 50.0) != floor(hn / 50.0) or floor(h / 50.0) != floor(hs / 50.0):
				c = c.darkened(0.3)
			if fhole[q] == 1:
				c = Color(0.08, 0.08, 0.1)
			var un: PackedByteArray = region.dbg_uncovered
			if not un.is_empty() and (un[q] == 1 or un[q + 1] == 1 or un[q + fn] == 1 or un[q + fn + 1] == 1):
				c = Color(1.0, 0.0, 0.0)
			img.set_pixel(i, j, c)
	var to_px := func(p: Vector2) -> Vector2i:
		return Vector2i(int((p.x - region.center.x + region.half) / 8.0), int((p.y - region.center.y + region.half) / 8.0))
	for group in [region.paths.valley, region.paths.canyons]:
		for pth in group:
			for p in pth.points:
				var c: Vector2i = to_px.call(p)
				if c.x >= 0 and c.y >= 0 and c.x < n and c.y < n:
					img.set_pixel(c.x, c.y, Color(0.2, 0.4, 1.0))
	for r in region.ramps:
		var p0: Vector2 = r.at
		var d: Vector2 = r.dir
		for s in range(0, int(r.length), 4):
			var c: Vector2i = to_px.call(p0 + d * s)
			for o in [Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)]:
				var cc: Vector2i = c + o
				if cc.x >= 0 and cc.y >= 0 and cc.x < n and cc.y < n:
					img.set_pixel(cc.x, cc.y, Color(0.1, 1.0, 1.0))
	var cols := {"ref1": Color(1, 0.2, 0.2), "ref2": Color(1, 0.6, 0.1), "ref3": Color(1, 1, 0.2), "ref4": Color(1, 0.3, 1)}
	for name in region.bookmarks:
		var b: Dictionary = region.bookmarks[name]
		var pos: Vector3 = b.pos
		var look: Vector3 = b.look
		var c0: Vector2i = to_px.call(Vector2(pos.x, pos.z))
		var dir := Vector2(look.x - pos.x, look.z - pos.z).normalized()
		for s in 90:
			var c: Vector2i = to_px.call(Vector2(pos.x, pos.z) + dir * s * 8.0)
			if c.x >= 0 and c.y >= 0 and c.x < n and c.y < n:
				img.set_pixel(c.x, c.y, cols[name])
		for dy in range(-5, 6):
			for dx in range(-5, 6):
				var cc := c0 + Vector2i(dx, dy)
				if cc.x >= 0 and cc.y >= 0 and cc.x < n and cc.y < n and dx * dx + dy * dy <= 25:
					img.set_pixel(cc.x, cc.y, cols[name])
	img.save_png(out + "/region_map.png")


static func _hcol(h: float) -> Color:
	var stops := [[0.0, Color(0.20, 0.48, 0.78)], [10.0, Color(0.30, 0.62, 0.30)], [80.0, Color(0.55, 0.75, 0.30)], [150.0, Color(0.88, 0.82, 0.30)],
		[350.0, Color(0.80, 0.52, 0.22)], [450.0, Color(0.62, 0.40, 0.22)], [700.0, Color(0.50, 0.36, 0.30)], [900.0, Color(0.62, 0.58, 0.58)],
		[1500.0, Color(1, 1, 1)]]
	for k in range(1, stops.size()):
		if h <= stops[k][0]:
			return (stops[k - 1][1] as Color).lerp(stops[k][1], (h - stops[k - 1][0]) / (stops[k][0] - stops[k - 1][0]))
	return Color(1, 1, 1)
