extends SceneTree
## DECK PROBE (scripts/tools/deck_probe.gd): along an arch's axis, the highest up-facing point of its carved mesh within 10 m of
## the axis against the terrain's height, every 5 m - to find steps in a bridge's walkable top.
##   Godot_console.exe --headless --path . --script res://scripts/tools/deck_probe.gd -- arch1

const Config := preload("res://scripts/world/base_terrain_config.gd")
const Gen := preload("res://scripts/world/base_terrain_gen.gd")
const RegionSettings := preload("res://scripts/world/region_settings.gd")
const Region := preload("res://scripts/world/tepui_region.gd")


func _initialize() -> void:
	var cfg = Config.new()
	var gen = Gen.new(cfg)
	var key: String = cfg.cache_key(Gen.VERSION)
	gen.load_cache("user://terrain/base_%d_%s.bin" % [cfg.seed_value, key])
	var rcfg = RegionSettings.new()
	var region = Region.new(rcfg, gen)
	if not region.load_cache("user://terrain/region_%d_%s.bin" % [cfg.seed_value, rcfg.cache_key(Region.VERSION, key)]):
		print("no region cache")
		quit()
		return
	var want: String = OS.get_cmdline_user_args()[0] if OS.get_cmdline_user_args().size() > 0 else "arch1"
	var meshes := []
	for w in region.walls:
		if w.get("arch", false):
			meshes.append(w)
	var off: int = meshes.size() - region.features.size()
	var c0: Vector2 = region.center
	for fi in region.features.size():
		var fe: Dictionary = region.features[fi]
		if str(fe.name) != want:
			continue
		var vs: PackedVector3Array = (meshes[off + fi] as Dictionary).verts
		var ns: PackedVector3Array = (meshes[off + fi] as Dictionary).normals
		var best := {}
		for i in vs.size():
			if ns[i].y < 0.5:
				continue
			var l: Vector2 = region._flocal(Vector2(vs[i].x + c0.x, vs[i].z + c0.y), fe)
			if absf(l.y) > 10.0:
				continue
			var k := int(round(l.x / 5.0))
			best[k] = maxf(float(best.get(k, -INF)), vs[i].y)
		var line := ""
		for k in range(int(-float(fe.A) / 5.0), int(float(fe.A) / 5.0) + 1):
			var p: Vector2 = (fe.c as Vector2) + (fe.axis as Vector2) * k * 5.0
			var th: float = region.height_at(p)
			line += " %d:%s/%.0f" % [k * 5, "-" if not best.has(k) else "%.0f" % (float(best[k]) - region.floor_h), th - region.floor_h]
		print("%s strip %.0f top %.0f  a:rock/terrain%s" % [fe.name, fe.strip, float(fe.top) - region.floor_h, line])
		# every vertex near the trench's middle
		for i in vs.size():
			var l2: Vector2 = region._flocal(Vector2(vs[i].x + c0.x, vs[i].z + c0.y), fe)
			if absf(l2.x + 98.0) < 3.0 and absf(l2.y - 1.0) < 3.0:
				print("  v a %.1f b %.1f y %.1f n %s" % [l2.x, l2.y, vs[i].y - region.floor_h, str(ns[i].snapped(Vector3(0.01, 0.01, 0.01)))])
		# a grid round the strip's near end: the highest walkable surface (rock or terrain) per 2.5 m cell, relative to the fin's top
		var grid := {}
		for i in vs.size():
			if ns[i].y < 0.3:
				continue
			var l: Vector2 = region._flocal(Vector2(vs[i].x + c0.x, vs[i].z + c0.y), fe)
			var gk := Vector2i(int(round(l.x / 2.5)), int(round(l.y / 2.5)))
			grid[gk] = maxf(float(grid.get(gk, -INF)), vs[i].y)
		var a0 := -float(fe.strip) - 14.0
		for bi in range(-10, 11):
			var row := "b %5.1f:" % (bi * 2.5)
			for ai in range(int(a0 / 2.5), int((a0 + 30.0) / 2.5)):
				var p: Vector2 = (fe.c as Vector2) + (fe.axis as Vector2) * ai * 2.5 + (fe.t as Vector2) * bi * 2.5
				var th: float = region.height_at(p) - region.floor_h
				var rk: float = float(grid.get(Vector2i(ai, bi), -INF)) - region.floor_h
				row += " %4.0f" % maxf(th, rk)
			print(row)
	quit()
