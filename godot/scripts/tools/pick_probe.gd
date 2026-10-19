extends SceneTree
## PICK PROBE (scripts/tools/pick_probe.gd): which region mesh a screenshot's pixel shows. Loads the cached region, casts the ray
## of a --cam camera (x,z,h,tx,tz,th as shot.gd takes it, 75 degree vertical field of view) through pixel px,py of a WxH frame
## against every wall piece and carved mesh, and prints the nearest hit: the piece, whether it is carved, the point, and the
## piece's vertex range round it.
##   Godot_console.exe --headless --path . --script res://scripts/tools/pick_probe.gd -- x,z,h,tx,tz,th px,py [WxH]

const Config := preload("res://scripts/world/base_terrain_config.gd")
const Gen := preload("res://scripts/world/base_terrain_gen.gd")
const RegionSettings := preload("res://scripts/world/region_settings.gd")
const Region := preload("res://scripts/world/tepui_region.gd")


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	# ("abs:" before the numbers: the heights are absolute, as a bookmark has them)
	var absolute := args[0].begins_with("abs:")
	var cam := Array(args[0].trim_prefix("abs:").split(",")).map(func(s): return float(s))
	var pxs := args[1].split(",")
	var res := (args[2] if args.size() > 2 else "1280x720").split("x")
	var W := float(res[0])
	var H := float(res[1])
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
	var rc: Vector2 = region.center
	var p0 := Vector2(cam[0], cam[1])
	var p1 := Vector2(cam[3], cam[4])
	var eye := Vector3(p0.x, (0.0 if absolute else region.height_at(p0)) + float(cam[2]), p0.y)
	var at := Vector3(p1.x, (0.0 if absolute else region.height_at(p1)) + float(cam[5]), p1.y)
	var fwd := (at - eye).normalized()
	var right := fwd.cross(Vector3.UP).normalized()
	var up := right.cross(fwd)
	var th := tan(deg_to_rad(37.5))
	var u := (float(pxs[0]) / W * 2.0 - 1.0) * th * W / H
	var v := (1.0 - float(pxs[1]) / H * 2.0) * th
	var dir := (fwd + right * u + up * v).normalized()
	print("eye ", eye, " dir ", dir)
	# (where the ray first goes under the terrain's heights, marching every metre)
	var tt0 := 1.0
	while tt0 < 3000.0:
		var q := eye + dir * tt0
		if q.y < region.height_at(Vector2(q.x, q.z)):
			print("under the terrain's heights at %.0f m: %s (height there %.1f, level %d)" % [tt0, q, region.height_at(Vector2(q.x, q.z)), region._lvl(Vector2(q.x, q.z))])
			break
		tt0 += 1.0
	var best := INF
	var bw := -1
	var bt := -1
	var lod := int(args[3]) if args.size() > 3 else 0
	for wi in region.walls.size():
		var w: Dictionary = region.walls[wi]
		if lod > 0:
			if not w.has("lods"):
				continue
			w = w.lods[lod - 1]
		var vs: PackedVector3Array = w.verts
		var ids: PackedInt32Array = w.indices
		var o := eye - Vector3(rc.x, 0.0, rc.y)
		for t in range(0, ids.size(), 3):
			var a := vs[ids[t]]
			var e1 := vs[ids[t + 1]] - a
			var e2 := vs[ids[t + 2]] - a
			var pv := dir.cross(e2)
			var det := e1.dot(pv)
			if absf(det) < 1e-9:
				continue
			var tv := o - a
			var uu := tv.dot(pv) / det
			if uu < 0.0 or uu > 1.0:
				continue
			var qv := tv.cross(e1)
			var vv := dir.dot(qv) / det
			if vv < 0.0 or uu + vv > 1.0:
				continue
			var tt := e2.dot(qv) / det
			if tt > 0.0 and tt < best:
				best = tt
				bw = wi
				bt = t
	if bw < 0:
		print("no hit")
		quit()
		return
	var hit := eye + dir * best
	var w2: Dictionary = region.walls[bw] if lod == 0 else region.walls[bw].lods[lod - 1]
	print("(LOD%d)" % lod)
	print("hit piece %d (carved %s, %d verts) at %s, %.0f m away, triangle %d (vertex %d)" % [bw, w2.get("arch", lod > 0), (w2.verts as PackedVector3Array).size(), hit, best, bt / 3, (w2.indices as PackedInt32Array)[bt]])
	var vs2: PackedVector3Array = w2.verts
	var lo := Vector3(INF, INF, INF)
	var hi := -lo
	for p in vs2:
		lo = lo.min(p + Vector3(rc.x, 0.0, rc.y))
		hi = hi.max(p + Vector3(rc.x, 0.0, rc.y))
	print("piece bounds ", lo, " .. ", hi)
	var ids2: PackedInt32Array = w2.indices
	var ns2: PackedVector3Array = w2.normals
	for k in 3:
		var vi := ids2[bt + k]
		var vp: Vector3 = vs2[vi] + Vector3(rc.x, 0.0, rc.y)
		print("  vertex %d at %s normal %s, %.2f m over the terrain's heights" % [vi, vp, ns2[vi], vp.y - region.height_at(Vector2(vp.x, vp.z))])
	var tri_n := (vs2[ids2[bt + 1]] - vs2[ids2[bt]]).cross(vs2[ids2[bt + 2]] - vs2[ids2[bt]]).normalized()
	print("  triangle's own normal %s (seen from its %s)" % [tri_n, "front" if tri_n.dot(-dir) < 0.0 else "back"])
	for fe in region.features:
		var l: Vector2 = Vector2((Vector2(hit.x, hit.z) - (fe.c as Vector2)).dot(fe.axis), (Vector2(hit.x, hit.z) - (fe.c as Vector2)).dot(fe.t))
		if absf(l.x) < float(fe.A) + 200.0 and absf(l.y) < float(fe.B) + 200.0:
			print("  near %s: local (%.0f, %.0f), box %.0f x %.0f" % [fe.name, l.x, l.y, fe.A, fe.B])
	print("terrain there %.1f, level %d" % [region.height_at(Vector2(hit.x, hit.z)), region.level_at(hit.x - rc.x, hit.z - rc.y) if false else 0])
	quit()
