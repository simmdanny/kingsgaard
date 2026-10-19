extends SceneTree
## REGION TEST (scripts/tools/region_test.gd): loads the cached base terrain, builds the tepui region on it (no rendering),
## prints its report (with the plateau table) and the ways up, writes the game's region cache, and into the given folder:
## region_map.png (heights in colour, a contour every 50 m, the ways up cyan, the profile lines dashed white, the bookmarks as
## camera marks with their view lines), region_data.json (the plateau table, the two profile lines with their heights every
## 4 m, the map's frame).
##   Godot_console.exe --headless --path . --script res://scripts/tools/region_test.gd -- [out_folder]

const Config := preload("res://scripts/world/base_terrain_config.gd")
const Gen := preload("res://scripts/world/base_terrain_gen.gd")
const RegionSettings := preload("res://scripts/world/region_settings.gd")
const Region := preload("res://scripts/world/tepui_region.gd")
## the two profile lines across the region (layout coordinates u, v from its centre): along v across P3, the valley and the
## stacked plateau P1; along u across P1, the canyon and P2
const LINES := [[Vector2(-700.0, -1700.0), Vector2(-700.0, 1700.0)], [Vector2(-1700.0, 780.0), Vector2(1700.0, 780.0)]]


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
	region.serial_bake = true
	region.generate()
	var rep: Dictionary = region.report.duplicate()
	rep.erase("plateau_table")
	print(JSON.stringify(rep, "  "))
	print("plateau table:")
	for row in region.objects:
		print("  %-5s level %s on %-5s top %4.0f m (%4.0f - %4.0f)  ground below %4.0f m  walls min %3.0f avg %3.0f max %3.0f m  area %.2f km2  ways up %d" % [
			row.id, row.level, row.on, row.top, row.top_min, row.top_max, row.ground_below, row.wall_min, row.wall_avg, row.wall_max, row.area_km2, row.ways_up])
	for nt in region.notches:
		var at: Vector2 = nt.at
		print("way up: level %d from %d, plateau %d at (%.0f, %.0f) length %.0f m rise %.0f m  %s" % [nt.level, nt.from, int(nt.plateau) + 1, at.x, at.y, nt.length, float(nt.top) - float(nt.low), "ok" if nt.get("ok", false) else "NOT WALKABLE"])
	print("bookmarks: ", region.bookmarks)
	for f in DirAccess.get_files_at("user://terrain"):
		if f.begins_with("region_") and f.ends_with(".bin"):
			DirAccess.remove_absolute(ProjectSettings.globalize_path("user://terrain/" + f))
	region.save("user://terrain/region_%d_%s.bin" % [cfg.seed_value, rcfg.cache_key(Region.VERSION, key)])
	if out != "":
		_map(region, out)
		var lines := []
		for ln in _best_lines(region):
			var a: Vector2 = region._from_uv(ln[0])
			var b: Vector2 = region._from_uv(ln[1])
			lines.append({"a": [a.x, a.y], "b": [b.x, b.y], "uv": [ln[0].x, ln[0].y, ln[1].x, ln[1].y], "step": 4.0, "h": Array(region.profile(a, b, 4.0))})
		var bms := {}
		for name in region.bookmarks:
			var b: Dictionary = region.bookmarks[name]
			var pos: Vector3 = b.pos
			var look: Vector3 = b.look
			bms[name] = [pos.x, pos.y, pos.z, look.x, look.y, look.z, b.fov]
		# the carved features' views, as the screenshot tool's --cam wants them (map x, z, height above the ground there)
		var avs := []
		for fe in region.features:
			var vw := {}
			for vk in fe.views:
				var pv: Vector3 = fe.views[vk][0]
				var lv: Vector3 = fe.views[vk][1]
				vw[vk] = [pv.x, pv.z, pv.y - region.height_at(Vector2(pv.x, pv.z)), lv.x, lv.z, lv.y - region.height_at(Vector2(lv.x, lv.z))]
			avs.append({"name": fe.name, "type": fe.type, "views": vw, "wo": fe.get("wo", 0.0), "ho": fe.get("ho", 0.0), "bake_s": fe.bake_s,
				"tris": fe.tris, "top": fe.top, "ground": fe.ground, "c": [(fe.c as Vector2).x, (fe.c as Vector2).y]})
		var data := {"features": avs, "feature_lines": region.report.get("features", []), "table": region.objects, "lines": lines, "center": [region.center.x, region.center.y], "half": region.half,
			"floor": region.floor_h, "levels": Array(rcfg.level_heights), "bookmarks": bms, "axis": [region.axis_u.x, region.axis_u.y]}
		# the heights (4 m samples) and the level grid (8 m cells) as raw files, for planning cameras outside the game
		data["fh"] = {"fx0": region.fx0, "fz0": region.fz0, "fn": region.fn, "origin": gen.origin, "sp": gen.sp, "n": region.n, "gc": region.gc}
		var fhf := FileAccess.open(out + "/region_h.bin", FileAccess.WRITE)
		fhf.store_buffer(region.fh.to_byte_array())
		fhf.close()
		var lvf := FileAccess.open(out + "/region_lv.bin", FileAccess.WRITE)
		lvf.store_buffer(region.level)
		lvf.close()
		var f := FileAccess.open(out + "/region_data.json", FileAccess.WRITE)
		f.store_string(JSON.stringify(data))
		f.close()
	quit()


## the two profile lines (LINES, chosen by hand: they cross the most steps)
func _best_lines(_region) -> Array:
	return LINES


func _map(region, out: String) -> void:
	var fn: int = region.fn
	var n := fn / 2
	var img := Image.create_empty(n, n, false, Image.FORMAT_RGB8)
	var fh: PackedFloat32Array = region.fh
	var f0: float = region.floor_h
	for j in n:
		for i in n:
			var q := (2 * j) * fn + 2 * i
			var h := fh[q]
			var c := _hcol(h - f0)
			var hn := fh[q + 2] if i < n - 1 else h
			var hs := fh[q + 2 * fn] if j < n - 1 else h
			if floor(h / 50.0) != floor(hn / 50.0) or floor(h / 50.0) != floor(hs / 50.0):
				c = c.darkened(0.3)
			img.set_pixel(i, j, c)
	var to_px := func(p: Vector2) -> Vector2i:
		return Vector2i(int((p.x - region.center.x + region.half) / 8.0), int((p.y - region.center.y + region.half) / 8.0))
	for nt in region.notches:
		var p0: Vector2 = nt.at
		var d: Vector2 = nt.dir
		for s in range(-40, int(nt.length) + 30, 4):
			var c: Vector2i = to_px.call(p0 + d * s)
			for o in [Vector2i(0, 0), Vector2i(1, 0), Vector2i(0, 1)]:
				var cc: Vector2i = c + o
				if cc.x >= 0 and cc.y >= 0 and cc.x < n and cc.y < n:
					img.set_pixel(cc.x, cc.y, Color(0.1, 1.0, 1.0))
	for ln in _best_lines(region):
		var a: Vector2 = region._from_uv(ln[0])
		var b: Vector2 = region._from_uv(ln[1])
		var length := a.distance_to(b)
		for s in range(0, int(length), 6):
			var c: Vector2i = to_px.call(a.lerp(b, s / length))
			if c.x >= 0 and c.y >= 0 and c.x < n and c.y < n and (s / 24) % 2 == 0:
				img.set_pixel(c.x, c.y, Color(1, 1, 1))
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
				img.set_pixel(c.x, c.y, cols.get(name, Color(0.1, 0.9, 0.9)))
		for dy in range(-5, 6):
			for dx in range(-5, 6):
				var cc := c0 + Vector2i(dx, dy)
				if cc.x >= 0 and cc.y >= 0 and cc.x < n and cc.y < n and dx * dx + dy * dy <= 25:
					img.set_pixel(cc.x, cc.y, cols.get(name, Color(0.1, 0.9, 0.9)))
	img.save_png(out + "/region_map.png")


## colours by height above the region's floor: the floor green, A yellow, B orange, C brown
static func _hcol(h: float) -> Color:
	var stops := [[-100.0, Color(0.30, 0.55, 0.30)], [0.0, Color(0.45, 0.70, 0.35)], [20.0, Color(0.55, 0.75, 0.38)], [150.0, Color(0.93, 0.85, 0.35)],
		[280.0, Color(0.88, 0.55, 0.22)], [430.0, Color(0.58, 0.36, 0.24)], [700.0, Color(0.9, 0.9, 0.9)]]
	if h <= float(stops[0][0]):
		return stops[0][1]
	for k in range(1, stops.size()):
		if h <= float(stops[k][0]):
			return (stops[k - 1][1] as Color).lerp(stops[k][1], (h - float(stops[k - 1][0])) / (float(stops[k][0]) - float(stops[k - 1][0])))
	return Color(0.9, 0.9, 0.9)
