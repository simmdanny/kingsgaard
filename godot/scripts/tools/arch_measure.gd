extends SceneTree
## ARCH MEASURE (scripts/tools/arch_measure.gd): loads the cached region - the final baked meshes, exactly as the game draws them -
## and measures every arch's opening with horizontal rays straight through the fin (across the opening), one every metre along
## the fin and up its height. A ray is blocked by any triangle of the carved mesh or of the walls round it (each triangle's
## projection onto the arch's face plane: a ray at that point crosses it), or by the ground under it. The clear cells joined to
## the opening's middle are the clear opening: its width (the widest row), its height (the tallest column), the rock left above
## it in that column, against the arch's target (its settings: width at the narrowest, height); off by more than 15% = FLAG.
## Writes arch_<name>.png per arch (1 px = 1 m; the opening blue, rock grey, ground green, sky white, the target in red) and
## arch_measure.json.
##   Godot_console.exe --headless --path . --script res://scripts/tools/arch_measure.gd -- out_folder [tag]

const Config := preload("res://scripts/world/base_terrain_config.gd")
const Gen := preload("res://scripts/world/base_terrain_gen.gd")
const RegionSettings := preload("res://scripts/world/region_settings.gd")
const Region := preload("res://scripts/world/tepui_region.gd")


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out := args[0] if args.size() > 0 else ProjectSettings.globalize_path("user://")
	var tag := args[1] if args.size() > 1 else ""
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
	var res := []
	for fe in region.features:
		if str(fe.type) == "arch":
			res.append(_measure(region, fe, out, tag))
	var f := FileAccess.open(out + "/arch_measure%s.json" % tag, FileAccess.WRITE)
	f.store_string(JSON.stringify(res, "  "))
	f.close()
	quit()


func _measure(region, fe: Dictionary, out: String, tag: String) -> Dictionary:
	var t0 := Time.get_ticks_msec()
	var rc: Vector2 = region.center
	var c: Vector2 = fe.c
	var ax: Vector2 = fe.axis
	var tv: Vector2 = fe.t
	var G: float = fe.ground
	var top: float = fe.top
	var tall := top - G
	var A: float = float(fe.A) + 18.0
	# (only what stands over the fin's own foot: a neighbour's wall inside the box is not part of this opening)
	var foot: float = float(fe.hw) + 9.0 + 0.2 * tall + 12.0
	var y0 := floorf(G - 6.0)
	var na := int(2.0 * A) + 1
	var ny := int(top + 12.0 - y0) + 1
	# triangles projected onto the face plane (along the fin, up), binned by 1 m cell
	var bins := []
	bins.resize(na * ny)
	for i in bins.size():
		bins[i] = PackedInt32Array()
	var P := PackedVector2Array()
	var ntri := 0
	for w in region.walls:
		var vs: PackedVector3Array = w.verts
		var ids: PackedInt32Array = w.indices
		if vs.is_empty():
			continue
		# (a quick reject on the piece's first vertex: pieces are at most a few hundred metres long)
		var p0 := Vector2(vs[0].x + rc.x, vs[0].z + rc.y) - c
		if p0.length() > A + foot + 700.0:
			continue
		var la := PackedFloat32Array()
		var lb := PackedFloat32Array()
		la.resize(vs.size())
		lb.resize(vs.size())
		for i in vs.size():
			var rel := Vector2(vs[i].x + rc.x, vs[i].z + rc.y) - c
			la[i] = rel.dot(ax)
			lb[i] = rel.dot(tv)
		for t in range(0, ids.size(), 3):
			var i0 := ids[t]
			var i1 := ids[t + 1]
			var i2 := ids[t + 2]
			if absf(lb[i0]) > foot and absf(lb[i1]) > foot and absf(lb[i2]) > foot:
				continue
			var amin := minf(la[i0], minf(la[i1], la[i2]))
			var amax := maxf(la[i0], maxf(la[i1], la[i2]))
			if amax < -A or amin > A:
				continue
			var ymin := minf(vs[i0].y, minf(vs[i1].y, vs[i2].y))
			var ymax := maxf(vs[i0].y, maxf(vs[i1].y, vs[i2].y))
			if ymax < y0 or ymin > y0 + ny:
				continue
			var k := P.size()
			P.append(Vector2(la[i0], vs[i0].y))
			P.append(Vector2(la[i1], vs[i1].y))
			P.append(Vector2(la[i2], vs[i2].y))
			ntri += 1
			for iy in range(maxi(int(floor(ymin - y0)), 0), mini(int(floor(ymax - y0)), ny - 1) + 1):
				for ia in range(maxi(int(floor(amin + A)), 0), mini(int(floor(amax + A)), na - 1) + 1):
					var b: PackedInt32Array = bins[iy * na + ia]
					b.append(k)
					bins[iy * na + ia] = b
	# the ground's highest point along each ray (over the fin's foot)
	var gmax := PackedFloat32Array()
	gmax.resize(na)
	for ia in na:
		var aq := -A + ia + 0.5
		var m := -INF
		var bq := -foot
		while bq <= foot:
			m = maxf(m, region.height_at(c + ax * aq + tv * bq))
			bq += 2.0
		gmax[ia] = m
	# 0 rock, 1 ground, 2 clear
	var M := PackedByteArray()
	M.resize(na * ny)
	for iy in ny:
		var y := y0 + iy + 0.5
		for ia in na:
			var q := Vector2(-A + ia + 0.5, y)
			var v := 2
			if y < gmax[ia]:
				v = 1
			else:
				var b: PackedInt32Array = bins[iy * na + ia]
				for k in b:
					if _in_tri(q, P[k], P[k + 1], P[k + 2]):
						v = 0
						break
			M[iy * na + ia] = v
	# the opening: the clear cells joined to its middle (searched for up the middle column, then out to the sides)
	var seed := -1
	var mid := na / 2
	var ho: float = fe.ho
	for dy in range(0, int(ho)):
		for s in [0, 1, -1, 2, -2, 4, -4, 8, -8, 16, -16, 24, -24]:
			var ia: int = mid + s
			var iy := int(G + 0.34 * ho - y0) + (dy / 2 if dy % 2 == 0 else -(dy + 1) / 2)
			if ia >= 0 and ia < na and iy >= 0 and iy < ny and M[iy * na + ia] == 2:
				seed = iy * na + ia
				break
		if seed >= 0:
			break
	var comp := PackedByteArray()
	comp.resize(na * ny)
	var to_sky := false
	var to_side := false
	if seed >= 0:
		var stack := PackedInt32Array([seed])
		comp[seed] = 1
		while not stack.is_empty():
			var cur := stack[stack.size() - 1]
			stack.resize(stack.size() - 1)
			var cx := cur % na
			var cy := cur / na
			if cy >= ny - 2:
				to_sky = true
			if cx == 0 or cx == na - 1:
				to_side = true
			for nb in [[1, 0], [-1, 0], [0, 1], [0, -1]]:
				var xx: int = cx + int(nb[0])
				var yy: int = cy + int(nb[1])
				if xx < 0 or yy < 0 or xx >= na or yy >= ny:
					continue
				var j := yy * na + xx
				if comp[j] == 0 and M[j] == 2:
					comp[j] = 1
					stack.append(j)
	# its size: the widest row, the tallest column, and the rock above it there
	var width := 0
	var w_at := 0.0
	var height := 0
	var h_col := mid
	var bot := 0
	if seed >= 0 and not to_sky:
		for iy in ny:
			var cnt := 0
			for ia in na:
				cnt += comp[iy * na + ia]
			if cnt > width:
				width = cnt
				w_at = iy + 0.5 + y0 - G
		for ia in na:
			var cnt := 0
			var lo := ny
			for iy in ny:
				if comp[iy * na + ia] == 1:
					cnt += 1
					lo = mini(lo, iy)
			if cnt > height:
				height = cnt
				h_col = ia
				bot = lo
	var span := 0.0
	var span_top := 0.0
	if height > 0:
		var otop := bot + height
		var iy := otop
		while iy < ny and M[iy * na + h_col] == 0:
			iy += 1
		span = iy - otop
		span_top = y0 + iy
	var tw: float = fe.wo
	var th: float = ho
	var dw := absf(width - tw) / tw
	var dh := absf(height - th) / th
	var flag := seed < 0 or to_sky or dw > 0.15 or dh > 0.15
	var rec := {"name": fe.name, "target_w": tw, "target_h": th, "clear_w": width, "clear_h": height, "widest_at": w_at,
		"span": span, "span_share": span / maxf(span_top - G, 1.0), "arch_h": span_top - G, "off_w": dw, "off_h": dh,
		"open_to_sky": to_sky, "open_to_side": to_side, "closed": seed < 0, "flag": flag, "triangles": ntri}
	print("ARCH %s: clear opening %d m wide (widest %.0f m up) x %d m tall, target %.0f x %.0f (off %.0f%% / %.0f%%); rock above it %.0f m = %.0f%% of %.0f m%s%s  [%d triangles, %.1f s]" % [
		fe.name, width, w_at, height, tw, th, dw * 100.0, dh * 100.0, span, 100.0 * float(rec.span_share), float(rec.arch_h),
		"  FLAG" if flag else "  ok", " (no opening)" if seed < 0 else (" (open to the sky)" if to_sky else ""), ntri,
		(Time.get_ticks_msec() - t0) / 1000.0])
	# the picture, ground at the bottom
	var img := Image.create(na, ny, false, Image.FORMAT_RGB8)
	for iy in ny:
		for ia in na:
			var m := M[iy * na + ia]
			var col := Color(0.55, 0.55, 0.57) if m == 0 else (Color(0.33, 0.45, 0.28) if m == 1 else Color(0.97, 0.97, 0.97))
			if comp[iy * na + ia] == 1:
				col = Color(0.42, 0.66, 0.92)
			img.set_pixel(ia, ny - 1 - iy, col)
	# the target: its height over the middle, its width at the widest row
	var red := Color(0.9, 0.1, 0.1)
	var ty := ny - 1 - int(G + th - y0)
	var wy := ny - 1 - int(G + 0.34 * th - y0)
	for ia in range(maxi(mid - int(tw * 0.5), 0), mini(mid + int(tw * 0.5), na - 1) + 1):
		if wy >= 0 and wy < ny:
			img.set_pixel(ia, wy, red)
	for iy in range(maxi(ty, 0), mini(ny - 1 - int(G - y0), ny - 1) + 1):
		img.set_pixel(mid, iy, red)
	img.save_png(out + "/arch_%s%s.png" % [fe.name, tag])
	return rec


static func _in_tri(q: Vector2, a: Vector2, b: Vector2, c: Vector2) -> bool:
	var d1 := (q - b).cross(a - b)
	var d2 := (q - c).cross(b - c)
	var d3 := (q - a).cross(c - a)
	var neg := d1 < 0.0 or d2 < 0.0 or d3 < 0.0
	var pos := d1 > 0.0 or d2 > 0.0 or d3 > 0.0
	return not (neg and pos)
