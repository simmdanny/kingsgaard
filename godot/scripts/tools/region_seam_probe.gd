extends SceneTree
## REGION SEAM PROBE (scripts/tools/region_seam_probe.gd): loads the cached region and, for every carved feature's mesh, counts
## the up-facing vertices standing above the terrain's heightmap (where the rock's top would show through the grass instead of
## staying under it), with how far out from the feature's centre they are - to find visible rings and slabs of rock top.
##   Godot_console.exe --headless --path . --script res://scripts/tools/region_seam_probe.gd

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
		print("no region cache")
		quit()
		return
	var c: Vector2 = region.center
	var meshes := []
	for w in region.walls:
		if w.get("arch", false):
			meshes.append(w)
	# (the carved meshes are the last ones in the walls' list, in the features' order)
	var off: int = meshes.size() - region.features.size()
	for fi in region.features.size():
		var fe: Dictionary = region.features[fi]
		var m: Dictionary = meshes[off + fi]
		var vs: PackedVector3Array = m.verts
		var ns: PackedVector3Array = m.normals
		var up := 0
		var over := 0
		var worst := 0.0
		var rs := PackedFloat32Array()
		for i in vs.size():
			if ns[i].y < 0.9:
				continue
			up += 1
			var p := Vector2(vs[i].x + c.x, vs[i].z + c.y)
			var h: float = region.height_at(p)
			if vs[i].y > h + 0.05:
				over += 1
				worst = maxf(worst, vs[i].y - h)
				rs.append(p.distance_to(fe.c))
		rs.sort()
		# (every vertex, whatever its normal, out past the round features' rims: what stands above the grass there)
		var outer := 0
		var oworst := 0.0
		if str(fe.type) == "sinkhole":
			for i in vs.size():
				var p := Vector2(vs[i].x + c.x, vs[i].z + c.y)
				if p.distance_to(fe.c) > float(fe.rt) + 6.0:
					var hh: float = region.height_at(p)
					if vs[i].y > hh + 0.05:
						outer += 1
						oworst = maxf(oworst, vs[i].y - hh)
			print("  %s: %d vertices more than rt + 6 m out stand above the grass (worst %.2f m)" % [fe.name, outer, oworst])
		print("%-10s up-facing %6d, above the terrain %6d (worst %.1f m); their distance from the centre: %s" % [fe.name, up, over, worst,
			"-" if rs.is_empty() else "%.0f / %.0f / %.0f m (10%% / median / 90%%)" % [rs[rs.size() / 10], rs[rs.size() / 2], rs[rs.size() * 9 / 10]]])
	# the hand-overs: every wall vertex in the band where a carving overlaps the walls (the box's edge to 8 m past it) should
	# have carved rock within a few metres - else a wall's open end shows the ground through a crack
	var grid := {}
	for fi in region.features.size():
		var vs2: PackedVector3Array = (meshes[off + fi] as Dictionary).verts
		for v in vs2:
			grid[Vector3i(floori(v.x / 3.0), floori(v.y / 3.0), floori(v.z / 3.0))] = true
	# (each wall piece's two end columns: a piece ends where a carving's box took the rest of its wall away; its face there must
	# have carved rock right behind it. A column is bl vertices: lip inside, lip, face top, then the face down to the foot.)
	var ends := {}
	var tipcount := {}
	for w in region.walls:
		if w.get("arch", false) or int(w.get("cols", 0)) == 0:
			continue
		var wv0: PackedVector3Array = w.verts
		var m0: int = int(w.cols)
		var bl0 := 0
		for k in range(5, mini(80, wv0.size())):
			if absf(wv0[k].y - wv0[0].y) < 3.0 and Vector2(wv0[k].x - wv0[0].x, wv0[k].z - wv0[0].z).length() < 9.0:
				bl0 = k
				break
		for cc in [0, m0 - 1]:
			var tk := Vector3i((wv0[cc * bl0 + 3] * 10.0).round())
			tipcount[tk] = int(tipcount.get(tk, 0)) + 1
	for w in region.walls:
		if w.get("arch", false):
			continue
		var wv: PackedVector3Array = w.verts
		var bl := 0
		for k in range(5, mini(80, wv.size())):
			if absf(wv[k].y - wv[0].y) < 3.0 and Vector2(wv[k].x - wv[0].x, wv[k].z - wv[0].z).length() < 9.0:
				bl = k
				break
		if bl == 0:
			continue
		var m: int = int(w.get("cols", wv.size() / bl))
		for cc in [0, m - 1]:
			var face := PackedVector3Array()
			for r in range(3, bl):
				face.append(wv[cc * bl + r])
			var p := Vector2(face[0].x + c.x, face[0].z + c.y)
			# (a column two pieces share is not an end: the wall goes on)
			if int(tipcount.get(Vector3i((face[0] * 10.0).round()), 0)) > 1:
				continue
			for fe in region.features:
				if not fe.walls:
					continue
				var l: Vector2 = region._flocal(p, fe)
				if maxf(absf(l.x) - float(fe.A), absf(l.y) - float(fe.B)) > 12.0:
					continue
				var miss := 0
				for v in face:
					if v.y < float(fe.ground) - 2.0:
						continue
					var k0 := Vector3i(floori(v.x / 3.0), floori(v.y / 3.0), floori(v.z / 3.0))
					var near := false
					for dz in range(-1, 2):
						for dy in range(-1, 2):
							for dx in range(-1, 2):
								if grid.has(k0 + Vector3i(dx, dy, dz)):
									near = true
					miss += 0 if near else 1
				if miss > 2 and OS.get_cmdline_user_args().has("--detail"):
					var fm: PackedVector3Array = (meshes[off + region.features.find(fe)] as Dictionary).verts
					var lines := ""
					for v in face:
						var bd := INF
						for q in fm:
							bd = minf(bd, q.distance_to(v))
						var lv: Vector2 = region._flocal(Vector2(v.x + c.x, v.z + c.y), fe)
						lines += " [a %.0f b %.0f h %.0f: %.1f m]" % [lv.x, lv.y, v.y - region.floor_h, bd]
					print("  %s crack column (A %.0f B %.0f top %.0f ground %.0f) - its piece: %d columns, this is column %d, %d extra (cap) vertices, piece starts at u,v %s ends at %s:%s" % [fe.name, fe.A, fe.B, float(fe.top) - region.floor_h, float(fe.ground) - region.floor_h, m, cc, wv.size() - m * bl, str(region._uv(Vector2(wv[3].x + c.x, wv[3].z + c.y)).round()), str(region._uv(Vector2(wv[(m - 1) * bl + 3].x + c.x, wv[(m - 1) * bl + 3].z + c.y)).round()), lines.substr(0, 120)])
				# (an end closed by its cap - the extra vertices after the columns - shows rock, not a crack)
				var capped := false
				for k in range(m * bl, wv.size()):
					capped = capped or wv[k].distance_to(face[1]) < 0.01
				if capped:
					miss = 0
				var e: Array = ends.get(fe.name, [0, 0, []])
				e[0] += 1
				if miss > 2:
					e[1] += 1
					if (e[2] as Array).size() < 3:
						var uvp: Vector2 = region._uv(p)
						(e[2] as Array).append("u %.0f v %.0f (%d of %d face points uncovered)" % [uvp.x, uvp.y, miss, face.size()])
				ends[fe.name] = e
	for nm in ends:
		print("hand-over %-10s wall ends at its box %3d, with a crack behind %3d  %s" % [nm, ends[nm][0], ends[nm][1], str(ends[nm][2])])
	# wedges anywhere: two wall pieces' end columns (their face's top) that nearly meet but do not coincide
	var tips := []
	for w in region.walls:
		if w.get("arch", false):
			continue
		var wv: PackedVector3Array = w.verts
		var m: int = int(w.get("cols", 0))
		if m == 0:
			continue
		var bl: int = (wv.size() - (wv.size() % m)) / m if wv.size() % m == 0 else 0
		for k in range(5, mini(80, wv.size())):
			if absf(wv[k].y - wv[0].y) < 3.0 and Vector2(wv[k].x - wv[0].x, wv[k].z - wv[0].z).length() < 9.0:
				bl = k
				break
		tips.append(wv[3])
		tips.append(wv[(m - 1) * bl + 3])
	var wedges := 0
	var wl := []
	for a in tips.size():
		for b in range(a + 1, tips.size()):
			var dd: float = (tips[a] as Vector3).distance_to(tips[b])
			if dd > 0.5 and dd < 8.0:
				wedges += 1
				if wl.size() < 6:
					var t3: Vector3 = tips[a]
					wl.append("%s %.1f m" % [str(region._uv(Vector2(t3.x + c.x, t3.z + c.y)).round()), dd])
	print("wedges between wall pieces (ends 0.5 - 8 m apart): %d %s" % [wedges, str(wl)])
	quit()
