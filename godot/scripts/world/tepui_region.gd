extends RefCounted
## THE TEPUI REGION (scripts/world/tepui_region.gd): a 4 x 4 km region of tables - a flat floor, a few big flat-topped
## plateaus standing on it (some with stacked terraces), sheer walls between them, narrow canyons and a wide valley - built on
## the clean base terrain from RegionSettings (region_settings.gd) and a seed.
##
## The terrain is a step function: flat floor -> straight up -> flat top. Every 4 m height sample is either on the floor or on
## a plateau's level, never in between (except in the ways up), so at each plateau's edge the heightmap jumps by the whole wall
## height from one sample to the next. The wall meshes stand just outside that step and cover it; their rock lip reaches back
## over the plateau's edge. Far from the camera Terrain3D draws the terrain with coarser triangles, which would smear each step
## into a slope; the terrain shader moves those vertices onto the edge of their own terrace (the `snap` map below), so the step
## stays a step at every distance.
##
## Steps (layout grid: 8 m cells over the region square; heights: the island's 4 m samples):
##   1. place: highlands / high plateaus all round, no sea or mountains, mountains in view; the layout's axis from the sun so
##      the long walls are lit from the side. The floor: the island's middle height there, flat (gentle swells of a few metres),
##      blending back into the island's ground across the border band.
##   2. plateaus: from the settings' list - each an ellipse in layout coordinates, its outline bent by a domain warp, big bays
##      and headlands and small wiggles; neighbours kept apart along their (power) Voronoi border by a canyon or a wider gap.
##      Stacked terraces: the level below's shape set back by terrace_min .. terrace_max.
##   3. levels: one field per level (A, B, C), pieces smaller than min_plateau_km2 dropped.
##   4. ways up: ravines cut into the plateaus' edges (two per plateau piece and level), their floors climbing at notch_angle
##      from the ground in front to the top, out of the bookmarks' views where possible.
##   5. heights: the floor, or the level's top (floor + level height + the plateau's jitter + gentle hills), or a ravine's ramp.
##   6. snap map: for every sample, the nearest sample at the edge of its own terrace (for the terrain shader).
##   7. walls: separate meshes along every level's edge (marching squares on its field), from the rock lip at the top to below
##      the ground at the foot, with slow curvature, buttresses, vertical grooves and setbacks at rock layers; trimesh collision.
##   8. walk check: every plateau piece reached on foot from the floor (slopes under 35 degrees), every ravine walked.
##   9. the plateau table: each piece's top height, the ground at its walls' feet, its walls' heights, its area.
## Everything stored is in map coordinates (walls relative to the region's centre). Cached in user://terrain.

const BaseGen := preload("res://scripts/world/base_terrain_gen.gd")
const VERSION := 2
## which way the game's sun (main.gd) shines across the ground
const SUN_TRAVEL := Vector2(0.573, -0.820)
## two levels' edges closer than this are one wall (from the lower level's foot up into the upper level)
const LEDGE_CLOSE := 25.0
## neighbouring 4 m samples further apart in height than this are on different terraces (a wall between them)
const STEP := 6.0
## the terrain shader may move a far vertex this far (m) onto the edge of its terrace
const SNAP_REACH := 400.0
const BIG := 1e9

var cfg
var gen
var seed_value := 1
var center := Vector2.ZERO
var half := 2000.0
var n := 500
var gc := 8.0
var axis_u := Vector2(1.0, 0.0)
var axis_v := Vector2(0.0, 1.0)
## the region's 4 m height samples: fn x fn of the island's own sample grid, from sample (fx0, fz0)
var fx0 := 0
var fz0 := 0
var fn := 1000
var fh := PackedFloat32Array()
## per 4 m sample: x, z (m) to the nearest sample at the edge of its own terrace (BIG: none within SNAP_REACH)
var snap := PackedFloat32Array()
## per layout cell: the level (0 the floor, 1 - 3)
var level := PackedByteArray()
var floor_h := 0.0
var walls: Array = []
var notches: Array = []
var objects: Array = []
var bookmarks := {}
var report := {}
var ready := false
var stage := ""
var verbose := false

var _n := {}
## the plateaus from the settings (map seed point, radii, base level, terrace levels)
var _sh: Array = []
## per level 1 - 3: the field (m, positive inside; cut by the ravines), the same before the ravines, the owning plateau + 1,
## the pieces' labels and the pieces
var _d: Array = []
var _du: Array = []
var _own: Array = []
var _lab: Array = []
var _comps: Array = []
## per plateau, per level: its height offset
var _jit: Array = []
## per layout cell: the ravine there + 1
var _nid := PackedInt32Array()
var _views := {}
var _t0 := 0


func _init(config, base_gen) -> void:
	cfg = config
	gen = base_gen
	seed_value = int(cfg.seed_value) * 7919 + int(gen.seed_value) * 104729
	half = cfg.size * 0.5
	gc = cfg.grid_cell
	n = int(round(cfg.size / gc))
	fn = int(round(cfg.size / gen.sp))
	var s := seed_value
	_n.wx = _mk(s + 2, 1.0 / cfg.warp_wavelength, 2)
	_n.wz = _mk(s + 3, 1.0 / cfg.warp_wavelength, 2)
	_n.bay = _mk(s + 4, 1.0 / cfg.bay_wavelength, 2)
	_n.wig = _mk(s + 5, 1.0 / cfg.wiggle_wavelength, 2)
	_n.gap = _mk(s + 6, 1.0 / 600.0, 1)
	_n.terr = _mk(s + 7, 1.0 / 650.0, 2)
	_n.hill = _mk(s + 8, 1.0 / cfg.top_hill_wavelength, 2)
	_n.floor = _mk(s + 9, 1.0 / cfg.floor_wavelength, 2)
	_n.border = _mk(s + 10, 1.0 / 900.0, 2)
	_n.curve = _mk(s + 11, 1.0 / cfg.wall_curve_wavelength, 2)
	_n.wall = _mk(s + 12, 1.0, 1)


static func _mk(s: int, freq: float, octaves: int) -> FastNoiseLite:
	var nz := FastNoiseLite.new()
	nz.seed = s
	nz.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	nz.frequency = freq
	nz.fractal_type = FastNoiseLite.FRACTAL_FBM if octaves > 1 else FastNoiseLite.FRACTAL_NONE
	nz.fractal_octaves = octaves
	return nz


static func _hash01(a: int, b: int, c: int) -> float:
	return float(hash(Vector3i(a, b, c)) & 0xFFFFFF) / 16777215.0


# ---- the whole run -------------------------------------------------------------------------------------------------------

func generate() -> void:
	_t0 = Time.get_ticks_msec()
	report = {"times": {}}
	_step("place", _place)
	_step("plateaus", _plateaus)
	_step("levels", _levels)
	_views_from_settings()
	_step("ways up", _notches)
	_step("heights", _heights)
	_step("snap map", _snap)
	_step("walls", _walls)
	_step("bookmarks", _bookmarks)
	_step("walk check", _walk_check)
	_step("table", _table)
	_step("gaps", _gaps)
	_free()
	report.total_s = (Time.get_ticks_msec() - _t0) / 1000.0
	ready = true


func _step(name: String, fn_: Callable) -> void:
	stage = name
	var t := Time.get_ticks_msec()
	fn_.call()
	report.times[name] = (Time.get_ticks_msec() - t) / 1000.0
	if verbose:
		print("region: %s %.1f s" % [name, report.times[name]])


func _bands(fn_: Callable, rows: int) -> Array:
	var nb := 32
	var out := []
	out.resize(nb)
	var gid := WorkerThreadPool.add_group_task(func(b: int): out[b] = fn_.call(b * rows / nb, (b + 1) * rows / nb), nb, -1, true, "region")
	WorkerThreadPool.wait_for_group_task_completion(gid)
	return out


## map x / z of grid cell i's centre
func _gx(i: int) -> float:
	return center.x - half + (i + 0.5) * gc


func _gz(j: int) -> float:
	return center.y - half + (j + 0.5) * gc


func _gcell(p: Vector2) -> Vector2i:
	return Vector2i(clampi(int(floor((p.x - center.x + half) / gc)), 0, n - 1), clampi(int(floor((p.y - center.y + half) / gc)), 0, n - 1))


## bilinear read of a grid field at a map point
func _gbil(a: PackedFloat32Array, p: Vector2) -> float:
	var fi := clampf((p.x - center.x + half) / gc - 0.5, 0.0, n - 1.001)
	var fj := clampf((p.y - center.y + half) / gc - 0.5, 0.0, n - 1.001)
	var i := int(fi)
	var j := int(fj)
	var u := fi - i
	var v := fj - j
	var q := j * n + i
	return lerpf(lerpf(a[q], a[q + 1], u), lerpf(a[q + n], a[q + n + 1], u), v)


## the final height at a map point (bilinear over the patch's 4 m samples; the island's own ground outside it)
func height_at(p: Vector2) -> float:
	var fi: float = (p.x - gen.origin) / gen.sp - fx0
	var fj: float = (p.y - gen.origin) / gen.sp - fz0
	if fh.is_empty() or fi < 0.0 or fj < 0.0 or fi >= fn - 1 or fj >= fn - 1:
		return gen.height(p.x - gen.offset.x, p.y - gen.offset.y)
	var i := int(fi)
	var j := int(fj)
	var u: float = fi - i
	var v: float = fj - j
	var q := j * fn + i
	return lerpf(lerpf(fh[q], fh[q + 1], u), lerpf(fh[q + fn], fh[q + fn + 1], u), v)


## distance from a map point to the region square's edge (negative outside)
func _edge(p: Vector2) -> float:
	return half - maxf(absf(p.x - center.x), absf(p.y - center.y))


## how far into the region's flat middle a point is, in border widths: 0 at the region's edge (the island's ground), 1 where
## the floor is flat (the band between wanders in and out)
func _core(p: Vector2) -> float:
	var nb: FastNoiseLite = _n.border
	return (_edge(p) - 0.5 * cfg.border_noise * (1.0 + nb.get_noise_2d(p.x, p.y))) / cfg.border


## local layout coordinates: u along the main valley, v across it
func _uv(p: Vector2) -> Vector2:
	var r := p - center
	return Vector2(r.dot(axis_u), r.dot(axis_v))


func _from_uv(uv: Vector2) -> Vector2:
	return center + axis_u * uv.x + axis_v * uv.y


func _base_h(x: float, z: float) -> float:
	return gen.height(x - gen.offset.x, z - gen.offset.y)


## the floor at a point: flat with gentle swells, blending into the island's ground across the border band
func _floor_at(p: Vector2, ground: float) -> float:
	var nf: FastNoiseLite = _n.floor
	var flat: float = floor_h + cfg.floor_amp * nf.get_noise_2d(p.x, p.y)
	return lerpf(ground, flat, smoothstep(0.0, 1.0, clampf(_core(p), 0.0, 1.0)))


## a plateau's top at a point: the floor's height + its level + its own offset + gentle hills
func _top_at(p: Vector2, plateau: int, k: int) -> float:
	var nh: FastNoiseLite = _n.hill
	return floor_h + cfg.level_heights[k - 1] + float(_jit[plateau][k]) + cfg.top_hill_amp * nh.get_noise_2d(p.x, p.y)


# ---- 1. where, and which way ---------------------------------------------------------------------------------------------

func _place() -> void:
	if cfg.center.x != INF:
		center = cfg.center
	else:
		# highlands / high plateaus all round, no sea, coast or mountains in the region or its border band; mountains in view
		var best := -INF
		var span: float = cfg.size * 0.5 + 600.0
		for cz in range(-12000, 12001, 500):
			for cx in range(-12000, 12001, 500):
				var inner := 0
				var good := 0
				var bad := false
				var steps := 13
				for j in range(-steps, steps + 1):
					for i in range(-steps, steps + 1):
						var x: float = cx + i * span / steps
						var z: float = cz + j * span / steps
						var t: int = gen.tier_at(x, z)
						if t == 255 or t == 4 or t == 0:
							bad = true
							break
						if maxi(absi(i), absi(j)) <= 10:
							inner += 1
							good += 1 if (t == 2 or t == 3) else 0
					if bad:
						break
				if bad or good < inner * 0.75:
					continue
				var mnt := 0
				for a in 36:
					var dd := Vector2.from_angle(a * TAU / 36.0)
					for r in range(3000, 10001, 500):
						if gen.tier_at(cx + dd.x * r, cz + dd.y * r) == 4:
							mnt += 1
							break
				var score := float(good) / inner * 2.0 + mnt / 36.0
				if score > best:
					best = score
					center = Vector2(cx, cz)
	# on the 4 m sample grid
	center = Vector2(snappedf(center.x, gen.sp * 2.0), snappedf(center.y, gen.sp * 2.0))
	fx0 = int(round((center.x - half - gen.origin) / gen.sp))
	fz0 = int(round((center.y - half - gen.origin) / gen.sp))
	# the main valley's axis: its long walls lit from the side (about 50 degrees off the sun's direction), turned so the walls
	# the bookmark views look at (the stacked plateau's terraces, the canyon's far side) face the sun
	var ang: float = deg_to_rad(cfg.valley_angle) if cfg.valley_angle != INF else SUN_TRAVEL.angle() + deg_to_rad(90.0 + 50.0 + 180.0)
	axis_u = Vector2.from_angle(ang)
	axis_v = Vector2(-axis_u.y, axis_u.x)
	report.center = [center.x, center.y]
	report.axis_deg = snappedf(rad_to_deg(ang), 0.1)
	var tiers := [0, 0, 0, 0, 0]
	var hs := PackedFloat32Array()
	for j in range(0, 41):
		for i in range(0, 41):
			var x := center.x - half + i * 100.0
			var z := center.y - half + j * 100.0
			var t: int = gen.tier_at(x, z)
			if t < 5:
				tiers[t] += 1
			if absi(i - 20) <= 15 and absi(j - 20) <= 15:
				hs.append(_base_h(x, z))
	report.base_tiers_in_region = "highlands %d%%, high plateaus %d%%, lowlands %d%%" % [tiers[2] * 100 / 1681, tiers[3] * 100 / 1681, tiers[1] * 100 / 1681]
	# the floor: the island's middle height over the region
	hs.sort()
	floor_h = snappedf(hs[hs.size() / 2], 1.0)
	report.floor_height = floor_h


# ---- 2. the plateaus' shapes ---------------------------------------------------------------------------------------------

func _plateaus() -> void:
	_sh = []
	_jit = []
	for k in cfg.plateaus.size():
		var a: PackedFloat32Array = cfg.plateaus[k]
		var tiers := []
		for t in range(5, a.size()):
			tiers.append(int(a[t]))
		_sh.append({"s": _from_uv(Vector2(a[0], a[1])), "ru": a[2], "rv": a[3], "base": int(a[4]), "tiers": tiers,
			"w": pow((a[2] + a[3]) * 0.5, 2.0) * 0.35})
		var jl := [0.0]
		for lv in range(1, 4):
			jl.append(cfg.level_jitter * (2.0 * _hash01(seed_value, k, lv) - 1.0))
		_jit.append(jl)
	var parts := _bands(_plateau_rows, n)
	_d = [PackedFloat32Array()]
	_own = [PackedByteArray()]
	for k in range(1, 4):
		var d := PackedFloat32Array()
		var o := PackedByteArray()
		for p in parts:
			d.append_array(p[0][k - 1])
			o.append_array(p[1][k - 1])
		_d.append(d)
		_own.append(o)


## one band of grid rows: per level, the field (the nearest plateau's, the largest) and which plateau it is
func _plateau_rows(j0: int, j1: int) -> Array:
	var nwx: FastNoiseLite = _n.wx
	var nwz: FastNoiseLite = _n.wz
	var nbay: FastNoiseLite = _n.bay
	var nwig: FastNoiseLite = _n.wig
	var ngap: FastNoiseLite = _n.gap
	var nterr: FastNoiseLite = _n.terr
	var np := _sh.size()
	var canyon := {}
	for pr in cfg.canyon_pairs:
		canyon[Vector2i(mini(pr.x, pr.y), maxi(pr.x, pr.y))] = true
	var cnt := (j1 - j0) * n
	var d1 := PackedFloat32Array()
	var d2 := PackedFloat32Array()
	var d3 := PackedFloat32Array()
	var o1 := PackedByteArray()
	var o2 := PackedByteArray()
	var o3 := PackedByteArray()
	d1.resize(cnt)
	d2.resize(cnt)
	d3.resize(cnt)
	o1.resize(cnt)
	o2.resize(cnt)
	o3.resize(cnt)
	var o := 0
	for j in range(j0, j1):
		var z := _gz(j)
		for i in n:
			var x := _gx(i)
			var p := Vector2(x, z)
			# (the outlines' noise in layout coordinates: the layout turns as a whole with its axis)
			var lp := _uv(p)
			var wv: Vector2 = Vector2(nwx.get_noise_2d(lp.x, lp.y), nwz.get_noise_2d(lp.x + 517.0, lp.y - 211.0)) * cfg.warp_amp
			var q: Vector2 = p + axis_u * wv.x + axis_v * wv.y
			var shape_n: float = cfg.bay_amp * nbay.get_noise_2d(lp.x, lp.y) + cfg.wiggle_amp * nwig.get_noise_2d(lp.x, lp.y)
			var gn := 0.5 + 0.5 * ngap.get_noise_2d(lp.x, lp.y)
			var lim: float = (_core(p) - 1.0) * cfg.border - 40.0
			var best := [-BIG, -BIG, -BIG]
			var who := [0, 0, 0]
			for a in np:
				var sa: Dictionary = _sh[a]
				var r: Vector2 = q - (sa.s as Vector2)
				var e := Vector2(r.dot(axis_u) / float(sa.ru), r.dot(axis_v) / float(sa.rv))
				var rho := e.length()
				var rl := r.length()
				# the ellipse: the distance in to its outline along the ray from its centre, bent by the outline noise
				var d: float = (rl / rho * (1.0 - rho) if rho > 1e-4 else minf(sa.ru, sa.rv)) + shape_n
				# kept off each neighbour: across their (power) Voronoi border, a canyon's or a gap's half width
				for b in np:
					if b == a:
						continue
					var sb: Dictionary = _sh[b]
					var sab: Vector2 = (sb.s as Vector2) - (sa.s as Vector2)
					var pa: float = r.length_squared() - float(sa.w)
					var pb: float = (q - (sb.s as Vector2)).length_squared() - float(sb.w)
					var bis: float = (pb - pa) / (2.0 * sab.length())
					var key := Vector2i(mini(a, b), maxi(a, b))
					var m: float = lerpf(cfg.gap_canyon_min, cfg.gap_canyon_max, gn) if canyon.has(key) else lerpf(cfg.gap_min, cfg.gap_max, gn)
					d = minf(d, bis - m)
				d = minf(d, lim)
				# its levels: the base level and below take its shape, each stacked terrace that shape set back further
				var base: int = sa.base
				var cur := d
				var lv_field := [-BIG, -BIG, -BIG]
				for lv in range(1, base + 1):
					lv_field[lv - 1] = d
				var tiers: Array = sa.tiers
				for ti in tiers.size():
					var tl: int = tiers[ti]
					cur -= lerpf(cfg.terrace_min, cfg.terrace_max, 0.5 + 0.5 * nterr.get_noise_2d(lp.x + 1500.0 * a + 400.0 * ti, lp.y - 700.0 * ti))
					for lv in range(1, tl + 1):
						if float(lv_field[lv - 1]) <= -BIG * 0.5:
							lv_field[lv - 1] = cur
				for k in 3:
					if float(lv_field[k]) > float(best[k]):
						best[k] = lv_field[k]
						who[k] = a + 1
			d1[o] = maxf(float(best[0]), -2000.0)
			d2[o] = maxf(float(best[1]), -2000.0)
			d3[o] = maxf(float(best[2]), -2000.0)
			o1[o] = who[0]
			o2[o] = who[1]
			o3[o] = who[2]
			o += 1
	return [[d1, d2, d3], [o1, o2, o3]]


# ---- 3. the levels -------------------------------------------------------------------------------------------------------

func _levels() -> void:
	var nn := n * n
	var min_cells := int(cfg.min_plateau_km2 * 1e6 / (gc * gc))
	_lab = [PackedInt32Array()]
	_comps = [[]]
	for k in range(1, 4):
		var dk: PackedFloat32Array = _d[k]
		# (never wider than the level below; a stacked terrace at least terrace_min_depth deep all round, measured as a true
		# distance in from the level below's edge)
		if k > 1:
			var dlow: PackedFloat32Array = _d[k - 1]
			var edt := _inside_distance(dlow)
			var ownk: PackedByteArray = _own[k]
			for q in nn:
				dk[q] = minf(dk[q], dlow[q])
				var o := int(ownk[q]) - 1
				if o >= 0 and int((_sh[o] as Dictionary).base) < k:
					dk[q] = minf(dk[q], edt[q] - cfg.terrace_min_depth)
		var mask := PackedByteArray()
		mask.resize(nn)
		for q in nn:
			mask[q] = 1 if dk[q] >= 0.0 else 0
		var lb: Dictionary = BaseGen._label(mask, n)
		var labels: PackedInt32Array = lb.labels
		var ok := PackedInt32Array()
		var keep := []
		var small := {}
		var own: PackedByteArray = _own[k]
		for r in lb.regions:
			if int(r.cells) < min_cells:
				small[int(r.id)] = true
		for q in nn:
			var l := labels[q]
			if l > 0 and small.has(l):
				dk[q] = minf(dk[q], -gc)
				labels[q] = 0
		# each piece: its plateau, and whether it is that plateau's own level there (a B plateau's level 1 is the same shape)
		var seen := {}
		for q in nn:
			var l := labels[q]
			if l > 0 and not seen.has(l):
				seen[l] = {"id": l, "plateau": int(own[q]) - 1, "cells": 0}
			if l > 0:
				seen[l].cells = int(seen[l].cells) + 1
		for l in seen:
			var c: Dictionary = seen[l]
			var sa: Dictionary = _sh[int(c.plateau)]
			c.level = k
			c.own = int(sa.base) == k or (sa.tiers as Array).has(k)
			# the ground in front of it: the floor, or the plateau's level below
			var below := 0
			if int(sa.base) < k:
				below = int(sa.base)
				for tl in sa.tiers:
					if int(tl) < k:
						below = int(tl)
			c.below = below
			keep.append(c)
		_lab.append(labels)
		_comps.append(keep)
	_level_grid()
	var shares := [0, 0, 0, 0]
	var inside := 0
	for j in n:
		for i in n:
			if _core(Vector2(_gx(i), _gz(j))) >= 1.0:
				inside += 1
				shares[level[j * n + i]] += 1
	report.level_shares_floor_1_2_3 = shares.map(func(v): return snappedf(float(v) / maxi(inside, 1), 0.01))
	var per := [0, 0, 0]
	for k in range(1, 4):
		for c in _comps[k]:
			per[k - 1] += 1 if c.own else 0
	report.plateau_pieces_per_level = per


## how far each cell is inside a field's edge (m; 0 outside): a two-pass chamfer distance (8 m steps, diagonals 11.3 m)
func _inside_distance(d: PackedFloat32Array) -> PackedFloat32Array:
	var nn := n * n
	var e := PackedFloat32Array()
	e.resize(nn)
	for q in nn:
		# (from the edge itself, not the cell centre: a cell just inside starts at its own distance in)
		e[q] = BIG if d[q] >= 0.0 else 0.0
	var dg := gc * sqrt(2.0)
	for j in n:
		for i in n:
			var q := j * n + i
			if e[q] == 0.0:
				continue
			var v := e[q]
			if i > 0:
				v = minf(v, e[q - 1] + gc)
			if j > 0:
				v = minf(v, e[q - n] + gc)
				if i > 0:
					v = minf(v, e[q - n - 1] + dg)
				if i < n - 1:
					v = minf(v, e[q - n + 1] + dg)
			e[q] = v
	for jj in n:
		var j := n - 1 - jj
		for ii in n:
			var i := n - 1 - ii
			var q := j * n + i
			if e[q] == 0.0:
				continue
			var v := e[q]
			if i < n - 1:
				v = minf(v, e[q + 1] + gc)
			if j < n - 1:
				v = minf(v, e[q + n] + gc)
				if i < n - 1:
					v = minf(v, e[q + n + 1] + dg)
				if i > 0:
					v = minf(v, e[q + n - 1] + dg)
			e[q] = v
	return e


func _level_grid() -> void:
	level = PackedByteArray()
	level.resize(n * n)
	var d1: PackedFloat32Array = _d[1]
	var d2: PackedFloat32Array = _d[2]
	var d3: PackedFloat32Array = _d[3]
	for q in n * n:
		level[q] = (1 if d1[q] >= 0.0 else 0) + (1 if d2[q] >= 0.0 else 0) + (1 if d3[q] >= 0.0 else 0)


func _lvl(p: Vector2) -> int:
	var c := _gcell(p)
	return level[c.y * n + c.x]


# ---- 4. the ways up ------------------------------------------------------------------------------------------------------

func _views_from_settings() -> void:
	_views = {}
	for name in cfg.bookmark_views:
		var v: PackedFloat32Array = cfg.bookmark_views[name]
		_views[name] = [_from_uv(Vector2(v[0], v[1])), _from_uv(Vector2(v[3], v[4]))]


func _in_view_of(name: String, p: Vector2) -> bool:
	var c: Vector2 = _views[name][0]
	var f: Vector2 = ((_views[name][1] as Vector2) - c).normalized()
	var r := p - c
	return r.length() < 3200.0 and r.normalized().dot(f) > cos(deg_to_rad(40.0))


func _notches() -> void:
	notches = []
	_nid = PackedInt32Array()
	_nid.resize(n * n)
	_du = [PackedFloat32Array(), (_d[1] as PackedFloat32Array).duplicate(), (_d[2] as PackedFloat32Array).duplicate(), (_d[3] as PackedFloat32Array).duplicate()]
	var tan_a := tan(deg_to_rad(cfg.notch_angle))
	var w: float = cfg.notch_width
	var short := []
	for k in range(1, 4):
		var loops := _contours(_d[k])
		for c in _comps[k]:
			if not c.own:
				continue
			var plateau: int = c.plateau
			var below: int = c.below
			var rise: float = cfg.level_heights[k - 1] - (cfg.level_heights[below - 1] if below > 0 else 0.0)
			var length := rise / tan_a
			var picks := []
			# (a second, tighter try for a piece still short of ways up: closer to the level above, nearer its own edge)
			for attempt in 2:
				var tight := attempt == 1
				if picks.size() >= cfg.notches_per_plateau:
					break
				_place_notches(c, k, loops, length, w, tight, picks)
			if picks.size() < cfg.notches_per_plateau:
				short.append("level %d piece %d (plateau %d): %d of %d" % [k, c.id, plateau, picks.size(), cfg.notches_per_plateau])
	_level_grid()
	report.ways_up = notches.size()
	report.pieces_short_of_ways_up = short


## the places for a piece's ravines round its edge, then the best ones picked (spread apart, out of the bookmarks' views)
func _place_notches(c: Dictionary, k: int, loops: Array, length: float, w: float, tight: bool, picks: Array) -> void:
	var labk: PackedInt32Array = _lab[k]
	var plateau: int = c.plateau
	var below: int = c.below
	var cands := []
	for lp in loops:
		for p in _resample(lp, 24.0, true):
			var dk: PackedFloat32Array = _d[k]
			var nrm := _out_normal(dk, p)
			var inside := _gcell(p - nrm * 24.0)
			if labk[inside.y * n + inside.x] != int(c.id):
				continue
			# 100 m of the ground below in front of it, and some to either side
			var side := Vector2(-nrm.y, nrm.x)
			if _lvl(p + nrm * 40.0) != below or _lvl(p + nrm * 100.0) != below or _lvl(p + nrm * 60.0 + side * 50.0) != below or _lvl(p + nrm * 60.0 - side * 50.0) != below:
				continue
			for a in [0.0, 20.0, -20.0, 40.0, -40.0, 60.0, -60.0, 72.0, -72.0]:
				var dir := (-nrm).rotated(deg_to_rad(a))
				var s_in := _mouth_depth(p, dir, w, k)
				if _strip_ok(p, dir, length + s_in, w, k, tight):
					# (out of the views: above all no ravine opening towards a bookmark's camera)
					var view := 0.0
					for name in _views:
						if _in_view_of(name, p) or _in_view_of(name, p + dir * length * 0.5):
							view = maxf(view, 3000.0 if nrm.dot((_views[name][0] as Vector2) - p) > 0.0 else 900.0)
					cands.append({"p": p, "n": nrm, "dir": dir, "start": s_in, "score": -absf(a) * 4.0 - view})
					break
	var spacing := 450.0
	while picks.size() < cfg.notches_per_plateau:
		var best = null
		var bd := -INF
		for cd in cands:
			var md := INF
			for pk in picks:
				md = minf(md, (cd.p as Vector2).distance_to(pk.p))
			if md < spacing:
				continue
			# (still clear of the ravines cut so far)
			if not _strip_ok(cd.p, cd.dir, length + float(cd.start), w, k, tight):
				continue
			var val: float = (minf(md, 1500.0) if picks.size() > 0 else 0.0) + float(cd.score)
			if val > bd:
				bd = val
				best = cd
		if best == null:
			if spacing > 160.0 and not picks.is_empty():
				spacing = 160.0
				continue
			break
		picks.append(best)
		_cut_notch(best, length, w, k, below, plateau)


## how far in along a ravine's direction the piece's edge crosses its mouth at the furthest (m from the mouth point): the ramp
## starts there, so the ground in front meets it level all across (a ravine at an angle to the edge has a skewed mouth)
func _mouth_depth(p: Vector2, dir: Vector2, w: float, k: int) -> float:
	var side := Vector2(-dir.y, dir.x)
	var dk: PackedFloat32Array = _d[k]
	var deepest := 0.0
	var l := -w * 0.5
	while l <= w * 0.5 + 0.1:
		var sv := -40.0
		while sv < 120.0 and _gbil(dk, p + dir * sv + side * l) < 0.0:
			sv += 2.0
		deepest = maxf(deepest, sv)
		l += 6.0
	return deepest


## whether a ravine fits: its strip (and a margin either side) inside the piece all the way, clear of the level above
## (tight: smaller margins)
func _strip_ok(p: Vector2, dir: Vector2, length: float, w: float, k: int, tight := false) -> bool:
	var side := Vector2(-dir.y, dir.x)
	var dk: PackedFloat32Array = _d[k]
	var margin := 4.0 if tight else 14.0
	var clear := 12.0 if tight else 30.0
	var s := 0.0
	while s <= length + 40.0:
		for l in [-w * 0.5 - margin, 0.0, w * 0.5 + margin]:
			var q: Vector2 = p + dir * s + side * float(l)
			if _edge(q) < 50.0:
				return false
			if s >= 40.0 and _gbil(dk, q) < (4.0 if tight else 10.0):
				return false
			if k < 3 and _gbil(_d[k + 1], q) > -clear:
				return false
			var c := _gcell(q)
			if _nid[c.y * n + c.x] > 0:
				return false
		s += 16.0
	return true


## a ravine cut into a plateau piece: out of every level from the ground in front up to the piece's own (a box in the
## ravine's frame: from 60 m in front of the edge to 30 m past where its floor reaches the top, notch_width wide)
func _cut_notch(cd: Dictionary, length: float, w: float, k: int, below: int, plateau: int) -> void:
	var p: Vector2 = cd.p
	var dir: Vector2 = cd.dir
	var nrm: Vector2 = cd.n
	var side := Vector2(-dir.y, dir.x)
	var start: float = cd.start
	var s0 := -60.0
	var s1 := start + length + 30.0
	var idx := notches.size()
	var lo := Vector2(INF, INF)
	var hi := Vector2(-INF, -INF)
	for corner in [Vector2(s0 - 40.0, -w), Vector2(s0 - 40.0, w), Vector2(s1 + 40.0, -w), Vector2(s1 + 40.0, w)]:
		var cw: Vector2 = p + dir * corner.x + side * corner.y
		lo = Vector2(minf(lo.x, cw.x), minf(lo.y, cw.y))
		hi = Vector2(maxf(hi.x, cw.x), maxf(hi.y, cw.y))
	var c0 := _gcell(lo)
	var c1 := _gcell(hi)
	for j in range(c0.y, c1.y + 1):
		for i in range(c0.x, c1.x + 1):
			var rel := Vector2(_gx(i), _gz(j)) - p
			var s := rel.dot(dir)
			var l := absf(rel.dot(side))
			var dx := l - w * 0.5
			var dsv := maxf(s0 - s, s - s1)
			var sd := Vector2(maxf(dx, 0.0), maxf(dsv, 0.0)).length() + minf(maxf(dx, dsv), 0.0)
			var q := j * n + i
			for lv in range(below + 1, k + 1):
				var dl: PackedFloat32Array = _d[lv]
				dl[q] = minf(dl[q], sd)
			if sd < 0.0:
				_nid[q] = idx + 1
	var front := p + nrm * 40.0
	var low := _floor_at(front, _base_h(front.x, front.y)) if below == 0 else _top_at(front, plateau, below)
	var top := _top_at(p + dir * (start + length + 60.0), plateau, k)
	notches.append({"level": k, "from": below, "plateau": plateau, "at": p, "dir": dir, "out": nrm, "length": length,
		"start": start, "width": w, "low": low, "top": top})


# ---- 5. the heights ------------------------------------------------------------------------------------------------------

func _heights() -> void:
	var parts := _bands(_heights_rows, fn)
	fh = PackedFloat32Array()
	for p in parts:
		fh.append_array(p)


func _heights_rows(j0: int, j1: int) -> PackedFloat32Array:
	var out := PackedFloat32Array()
	out.resize((j1 - j0) * fn)
	var sp: float = gen.sp
	var tan_a := tan(deg_to_rad(cfg.notch_angle))
	var o := 0
	for j in range(j0, j1):
		var z: float = gen.origin + (fz0 + j) * sp
		for i in fn:
			var x: float = gen.origin + (fx0 + i) * sp
			var p := Vector2(x, z)
			var h := _floor_at(p, gen._px(fx0 + i, fz0 + j))
			var lc := 0
			var lu := 0
			for k in range(1, 4):
				if _gbil(_d[k], p) >= 0.0:
					lc = k
				if _gbil(_du[k], p) >= 0.0:
					lu = k
			if lc > 0:
				var c := _gcell(p)
				var own: PackedByteArray = _own[lc]
				h = _top_at(p, maxi(int(own[c.y * n + c.x]) - 1, 0), lc)
			if lu > lc:
				# in a ravine: its ramp, from the ground in front to the top
				var c := _gcell(p)
				var id := _nid[c.y * n + c.x]
				if id == 0:
					for dq in [1, -1, n, -n, n + 1, n - 1, -n + 1, -n - 1]:
						var qq: int = c.y * n + c.x + int(dq)
						if qq >= 0 and qq < n * n and _nid[qq] > 0:
							id = _nid[qq]
							break
				if id > 0:
					var nt: Dictionary = notches[id - 1]
					var s: float = (p - (nt.at as Vector2)).dot(nt.dir) - float(nt.start)
					h = clampf(float(nt.low) + maxf(s, 0.0) * tan_a, minf(h, float(nt.low)), float(nt.top))
			out[o] = h
			o += 1
	return out


# ---- 6. the snap map -----------------------------------------------------------------------------------------------------

## for every 4 m sample, the nearest sample at the edge of its own terrace (a sample with a neighbour more than STEP above or
## below it), found over its terrace only (never across a wall) - within SNAP_REACH
func _snap() -> void:
	var nn := fn * fn
	var sp: float = gen.sp
	var src := PackedInt32Array()
	src.resize(nn)
	src.fill(-1)
	var dist := PackedFloat32Array()
	dist.resize(nn)
	dist.fill(BIG)
	var queue := PackedInt32Array()
	var di := [1, -1, 0, 0, 1, 1, -1, -1]
	var dj := [0, 0, 1, -1, 1, -1, 1, -1]
	var edges := 0
	for j in fn:
		for i in fn:
			var q := j * fn + i
			var h := fh[q]
			for k in 8:
				var ni: int = i + int(di[k])
				var nj: int = j + int(dj[k])
				if ni < 0 or nj < 0 or ni >= fn or nj >= fn:
					continue
				if absf(fh[nj * fn + ni] - h) > STEP:
					src[q] = q
					dist[q] = 0.0
					queue.append(q)
					edges += 1
					break
	var head := 0
	var reach := SNAP_REACH / sp
	while head < queue.size():
		var q := queue[head]
		head += 1
		var s := src[q]
		var si := s % fn
		var sj := s / fn
		var i := q % fn
		var j := q / fn
		var h := fh[q]
		for k in 8:
			var ni: int = i + int(di[k])
			var nj: int = j + int(dj[k])
			if ni < 0 or nj < 0 or ni >= fn or nj >= fn:
				continue
			var nq := nj * fn + ni
			if absf(fh[nq] - h) > STEP:
				continue
			var dd := Vector2(ni - si, nj - sj).length()
			if dd < dist[nq] - 0.01 and dd <= reach:
				dist[nq] = dd
				src[nq] = s
				queue.append(nq)
	snap = PackedFloat32Array()
	snap.resize(nn * 2)
	var none := 0
	for q in nn:
		var s := src[q]
		if s < 0:
			snap[q * 2] = BIG
			snap[q * 2 + 1] = BIG
			none += 1
		else:
			snap[q * 2] = (s % fn - q % fn) * sp
			snap[q * 2 + 1] = (s / fn - q / fn) * sp
	report.snap = "%d edge samples, %d samples further than %.0f m from an edge" % [edges, none, SNAP_REACH]


# ---- 7. the walls --------------------------------------------------------------------------------------------------------

## the contour loops of a level's edge (marching squares on its field), as map-point polylines
func _contours(dk: PackedFloat32Array) -> Array:
	var key := func(i: int, j: int, horiz: bool) -> int: return (j * n + i) * 2 + (0 if horiz else 1)
	var pts := {}
	var cross := func(i0: int, j0: int, i1: int, j1: int) -> Vector2:
		var a := dk[j0 * n + i0]
		var b := dk[j1 * n + i1]
		var t := a / (a - b)
		return Vector2(_gx(i0), _gz(j0)).lerp(Vector2(_gx(i1), _gz(j1)), t)
	var links := {}
	for j in n - 1:
		for i in n - 1:
			var v0 := dk[j * n + i] >= 0.0
			var v1 := dk[j * n + i + 1] >= 0.0
			var v2 := dk[(j + 1) * n + i + 1] >= 0.0
			var v3 := dk[(j + 1) * n + i] >= 0.0
			var c := (1 if v0 else 0) | (2 if v1 else 0) | (4 if v2 else 0) | (8 if v3 else 0)
			if c == 0 or c == 15:
				continue
			# edges: 0 top (i,j)-(i+1,j), 1 right (i+1,j)-(i+1,j+1), 2 bottom (i,j+1)-(i+1,j+1), 3 left (i,j)-(i,j+1)
			var e := [key.call(i, j, true), key.call(i + 1, j, false), key.call(i, j + 1, true), key.call(i, j, false)]
			var pairs := []
			match c:
				1, 14:
					pairs = [[3, 0]]
				2, 13:
					pairs = [[0, 1]]
				3, 12:
					pairs = [[3, 1]]
				4, 11:
					pairs = [[1, 2]]
				6, 9:
					pairs = [[0, 2]]
				7, 8:
					pairs = [[3, 2]]
				5:
					pairs = [[3, 0], [1, 2]] if (dk[j * n + i] + dk[j * n + i + 1] + dk[(j + 1) * n + i] + dk[(j + 1) * n + i + 1]) < 0.0 else [[3, 2], [1, 0]]
				10:
					pairs = [[0, 1], [2, 3]] if (dk[j * n + i] + dk[j * n + i + 1] + dk[(j + 1) * n + i] + dk[(j + 1) * n + i + 1]) < 0.0 else [[0, 3], [2, 1]]
			for pr in pairs:
				for ed in pr:
					var eid: int = e[ed]
					if not pts.has(eid):
						match ed:
							0:
								pts[eid] = cross.call(i, j, i + 1, j)
							1:
								pts[eid] = cross.call(i + 1, j, i + 1, j + 1)
							2:
								pts[eid] = cross.call(i, j + 1, i + 1, j + 1)
							3:
								pts[eid] = cross.call(i, j, i, j + 1)
				var a: int = e[pr[0]]
				var b: int = e[pr[1]]
				if not links.has(a):
					links[a] = []
				if not links.has(b):
					links[b] = []
				(links[a] as Array).append(b)
				(links[b] as Array).append(a)
	# walk the links into polylines
	var used := {}
	var loops := []
	for start in links.keys():
		if used.has(start):
			continue
		var line := PackedVector2Array()
		var cur: int = start
		var prev := -1
		while cur >= 0 and not used.has(cur):
			used[cur] = true
			line.append(pts[cur])
			var nxt := -1
			for o in links[cur]:
				var oi: int = o
				if oi != prev and not used.has(oi):
					nxt = oi
					break
			prev = cur
			cur = nxt
		if line.size() >= 8:
			loops.append(line)
	return loops


## a polyline resampled every `step` m and smoothed a little
static func _resample(line: PackedVector2Array, step: float, closed: bool) -> PackedVector2Array:
	var src := line.duplicate()
	if closed:
		src.append(line[0])
	var out := PackedVector2Array([src[0]])
	var carry := 0.0
	for k in range(1, src.size()):
		var a := src[k - 1]
		var b := src[k]
		var seg := a.distance_to(b)
		var t := step - carry
		while t <= seg:
			out.append(a.lerp(b, t / seg))
			t += step
		carry = seg - (t - step)
	for it in 3:
		var sm := out.duplicate()
		for k in out.size():
			var km := k - 1
			var kp := k + 1
			if closed:
				km = posmod(km, out.size())
				kp = posmod(kp, out.size())
			elif km < 0 or kp >= out.size():
				continue
			sm[k] = (out[km] + out[k] * 2.0 + out[kp]) * 0.25
		out = sm
	return out


## a point moved onto a level's edge (two Newton steps down its field)
func _onto_edge(dk: PackedFloat32Array, p: Vector2) -> Vector2:
	for it in 3:
		var g := Vector2(_gbil(dk, p + Vector2(2.0, 0.0)) - _gbil(dk, p - Vector2(2.0, 0.0)), _gbil(dk, p + Vector2(0.0, 2.0)) - _gbil(dk, p - Vector2(0.0, 2.0))) / 4.0
		if g.length_squared() < 1e-6:
			break
		p -= g * _gbil(dk, p) / g.length_squared()
	return p


## outward unit normal of a level's edge at a map point (down its field)
func _out_normal(dk: PackedFloat32Array, p: Vector2) -> Vector2:
	var g := Vector2(_gbil(dk, p + Vector2(gc, 0.0)) - _gbil(dk, p - Vector2(gc, 0.0)), _gbil(dk, p + Vector2(0.0, gc)) - _gbil(dk, p - Vector2(0.0, gc)))
	return -g.normalized() if g.length() > 1e-6 else Vector2(1.0, 0.0)


func _walls() -> void:
	walls = []
	var cols_all := []
	var total_len := 0.0
	var verts := 0
	var tris := 0
	var loop_id := 0
	for k in range(1, 4):
		var dk: PackedFloat32Array = _d[k]
		var dlow: PackedFloat32Array = _d[k - 1] if k > 1 else PackedFloat32Array()
		for lp in _contours(dk):
			loop_id += 1
			var line := _resample(lp, cfg.wall_column, true)
			var m := line.size()
			# per column: where the wall stands, its top and foot heights, whether it gets a wall
			var all := []
			var flag := PackedByteArray()
			flag.resize(m)
			for c in m:
				# (back onto the edge itself: the smoothing pulls the line in at sharp headlands and out in tight bays, and the
				# face must stand a fixed distance out from the terrain's step everywhere)
				var p := _onto_edge(dk, line[c])
				var nrm := _out_normal(dk, p)
				# where the level above's edge is within LEDGE_CLOSE of this one, this wall reaches up into that level (one taller
				# wall) and that level's own wall is left out here
				var kt: int = k
				var reach := 12.0
				while kt < 3:
					var dn := _gbil(_d[kt + 1], p)
					if dn > -LEDGE_CLOSE:
						reach = 12.0 + maxf(-dn, 0.0)
						kt += 1
					else:
						break
				var top := height_at(p - nrm * reach)
				var foot := height_at(p + nrm * 14.0)
				# (a ravine's side: its foot in the ravine or right beside it)
				var fc := _gcell(p + nrm * 14.0)
				var in_notch := false
				for dj in range(-2, 3):
					for di in range(-2, 3):
						var qn := clampi(fc.y + dj, 0, n - 1) * n + clampi(fc.x + di, 0, n - 1)
						in_notch = in_notch or _nid[qn] > 0
				# (and near a ravine's mouth the wall keeps its shapes small, so its corners never close the way in)
				var near_notch := in_notch
				var pc := _gcell(p)
				for dj in range(-4, 5):
					for di in range(-4, 5):
						var qn := clampi(pc.y + dj, 0, n - 1) * n + clampi(pc.x + di, 0, n - 1)
						near_notch = near_notch or _nid[qn] > 0
				var oc := _gcell(p - nrm * reach)
				var own: PackedByteArray = _own[kt]
				all.append({"p": p, "n": nrm, "top": top, "foot": foot, "s": c * cfg.wall_column + loop_id * 10007.0,
					"amp": 0.15 if near_notch else 1.0, "key": "%d:%d" % [maxi(int(own[oc.y * n + oc.x]) - 1, 0), kt], "notch": in_notch})
				var coincide := k > 1 and _gbil(dlow, p) < LEDGE_CLOSE
				flag[c] = 1 if (top - foot >= cfg.wall_min_height and not coincide) else 0
			# a steady on / off pattern round the loop: gaps of up to 2 columns between walls filled, walls shorter than 4 dropped
			for pass_i in 2:
				var want := 0 if pass_i == 0 else 1
				var lim := 2 if pass_i == 0 else 3
				var c0 := 0
				while c0 < m:
					if flag[c0] != want:
						c0 += 1
						continue
					var c1 := c0
					while c1 < c0 + m and flag[c1 % m] == want:
						c1 += 1
					if c1 - c0 <= lim and c1 - c0 < m:
						for c in range(c0, c1):
							flag[c % m] = 1 - want
					c0 = c1
			# the top and foot heights smoothed along the wall (median of five), so its top edge runs clean
			var cols := []
			for c in m:
				if flag[c] == 0:
					cols.append({})
					continue
				var tops := []
				var feet := []
				for o in range(-2, 3):
					var oc2 := posmod(c + o, m)
					if flag[oc2] == 1:
						tops.append(float(all[oc2].top))
						feet.append(float(all[oc2].foot))
				tops.sort()
				feet.sort()
				var col: Dictionary = (all[c] as Dictionary).duplicate()
				col.top = tops[tops.size() / 2]
				col.foot = feet[feet.size() / 2]
				cols.append(col)
				cols_all.append([col.key, float(col.top) - float(col.foot), col.notch, col.p])
			# strips of consecutive wall columns (wrapping round the loop)
			var startc := 0
			for c in m:
				if (cols[c] as Dictionary).is_empty():
					startc = (c + 1) % m
					break
			var run := []
			for kk in m + 1:
				var c := (startc + kk) % m
				var col: Dictionary = cols[c]
				if col.is_empty() or kk == m:
					if kk == m and not col.is_empty() and run.size() == m:
						run.append(run[0])
					if run.size() >= 3:
						for piece in _chunks(run, 48):
							var mesh := _wall_mesh(piece)
							walls.append(mesh)
							verts += (mesh.verts as PackedVector3Array).size()
							tris += (mesh.indices as PackedInt32Array).size() / 3
						total_len += run.size() * cfg.wall_column
					run = []
				else:
					run.append(col)
	# how tall the walls are, measured on their columns (the ravines' sides left out)
	var hts := PackedFloat32Array()
	for cv in cols_all:
		if not cv[2]:
			hts.append(cv[1])
	hts.sort()
	if not hts.is_empty():
		var over := 0
		var under := 0
		for hv in hts:
			over += 1 if hv > 300.0 else 0
			under += 1 if hv < 80.0 else 0
		report.wall_heights = "median %.0f m, 10%% under %.0f m, 90%% under %.0f m, lowest %.0f m, tallest %.0f m; %.1f%% under 80 m, %.1f%% over 300 m" % [hts[hts.size() / 2],
			hts[hts.size() / 10], hts[hts.size() * 9 / 10], hts[0], hts[hts.size() - 1], 100.0 * under / hts.size(), 100.0 * over / hts.size()]
	var low := []
	for cv in cols_all:
		if not cv[2] and float(cv[1]) < 80.0 and low.size() < 12:
			var lp: Vector2 = _uv(cv[3])
			low.append("%s at u %.0f v %.0f: %.0f m" % [cv[0], lp.x, lp.y, cv[1]])
	report.walls_under_80 = low
	report.wall_km = snappedf(total_len / 1000.0, 0.1)
	report.wall_pieces = walls.size()
	report.wall_vertices = verts
	report.wall_triangles = tris
	_cols = cols_all


var _cols: Array = []


static func _chunks(run: Array, size: int) -> Array:
	var out := []
	var k := 0
	while k < run.size() - 1:
		out.append(run.slice(k, mini(k + size + 1, run.size())))
		k += size
	return out


## one wall piece. Per column, from the plateau inwards out and down: the rock's top (a lip from just under the grass, wall_lip
## + 2 m inside the terrain's step, rising over 4 m to its top surface and out to the face's top edge), then the face straight
## down (leaning out by wall_batter, pushed out by the wall's shapes) to wall_sink under the ground at its foot. The face stands
## wall_face_offset out from the step, so the terrain's own steep strip is always behind it.
func _wall_mesh(cols: Array) -> Dictionary:
	var nw: FastNoiseLite = _n.wall
	var nc: FastNoiseLite = _n.curve
	var hmax := 0.0
	for c in cols:
		hmax = maxf(hmax, float(c.top) - float(c.foot))
	var rows := clampi(int(ceil((hmax + cfg.wall_sink) / cfg.wall_row)), 2, 60)
	var bl := rows + 4
	var m := cols.size()
	var pos := PackedVector3Array()
	pos.resize(m * bl)
	var nor := PackedVector3Array()
	nor.resize(m * bl)
	var outs := PackedVector2Array()
	outs.resize(m)
	var bsp: float = cfg.buttress_spacing
	var bw: float = cfg.buttress_width / bsp
	var off0: float = cfg.wall_face_offset
	var mid := 0
	# the edge's normals smoothed along the piece (so the lip's inner edge never folds over at a tight bend)
	var sn := PackedVector2Array()
	sn.resize(m)
	for c in m:
		var acc := Vector2.ZERO
		for o in range(-3, 4):
			acc += (cols[clampi(c + o, 0, m - 1)].n as Vector2) * (4.0 - absf(o))
		sn[c] = acc.normalized()
	for c in m:
		var col: Dictionary = cols[c]
		var p: Vector2 = col.p
		var nrm: Vector2 = sn[c]
		outs[c] = nrm
		var s: float = col.s
		var amp_c: float = col.amp
		var top: float = col.top
		var foot: float = col.foot
		var y0 := top + 0.15
		var y1: float = foot - cfg.wall_sink
		var cc := Vector2(center.x, center.y)
		# the lip: inner edge under the grass, its top surface, out to the face's top edge
		var li: Vector2 = p - nrm * (cfg.wall_lip + 5.0) - cc
		var lm: Vector2 = p - nrm * (cfg.wall_lip + 1.0) - cc
		pos[c * bl + 0] = Vector3(li.x, top - 1.0, li.y)
		pos[c * bl + 1] = Vector3(lm.x, y0, lm.y)
		for r in 3:
			nor[c * bl + r] = Vector3.UP
		# along the wall: slow curvature, buttresses (some missing, each its own size), vertical grooves
		var curve: float = cfg.wall_curve_amp * (0.5 + 0.5 * nc.get_noise_1d(s))
		var bp := s / bsp + 0.35 * nw.get_noise_1d(s * 0.004 + 11.0)
		var bi := int(floor(bp))
		var ph := bp - bi
		var bamp := _hash01(seed_value, bi, 3)
		bamp = 0.0 if bamp < 0.3 else bamp
		var bump := smoothstep(0.5 - bw, 0.5, ph) * (1.0 - smoothstep(0.5, 0.5 + bw, ph)) * bamp
		var groove: float = cfg.groove_depth * (0.5 + 0.5 * sin(TAU * s / cfg.groove_wavelength + 2.5 * nw.get_noise_1d(s * 0.02 + 70.0)))
		# broad flutes: big vertical grooves down the whole face, some deeper than others
		var flute: float = cfg.flute_depth * pow(0.5 + 0.5 * sin(TAU * s / cfg.flute_wavelength + 3.0 * nw.get_noise_1d(s * 0.006 + 300.0)), 2.0) * (0.4 + 0.6 * _hash01(seed_value, int(floor(s / cfg.flute_wavelength)), 5))
		for r in rows + 1:
			var f := float(r) / rows
			var y := lerpf(y0, y1, f)
			# rock layers: the face steps in and out a little at each layer line
			var yy := y + 7.0 * nw.get_noise_1d(s * 0.003 + 130.0)
			var lk := int(floor(yy / cfg.setback_spacing))
			var lf: float = yy / cfg.setback_spacing - lk
			var setback: float = cfg.setback_depth * lerpf(_hash01(seed_value, lk - 1, 9), _hash01(seed_value, lk, 9), smoothstep(0.0, 0.14, lf))
			# (everything pushes the face out; the grooves cut in from a face standing groove_depth further out - so no part of it
			# comes nearer the step than off0)
			var gcut: float = groove * (0.75 + 0.25 * nw.get_noise_1d(y * 0.05 + s * 0.001))
			var dsp: float = curve + cfg.buttress_depth * bump * (0.5 + 0.5 * f) + setback + cfg.groove_depth - gcut + cfg.flute_depth - flute
			var off: float = off0 + (cfg.wall_batter * (y0 - y) + dsp) * amp_c
			var q: Vector2 = p + nrm * off - cc
			pos[c * bl + 3 + r] = Vector3(q.x, y, q.y)
			# (the lip's outer edge is the face's top edge)
			if r == 0:
				pos[c * bl + 2] = Vector3(q.x, y, q.y)
	# the face's normals from the neighbouring vertices (outward)
	for c in m:
		for r in rows + 1:
			var b0 := c * bl + 3
			var a := pos[mini(c + 1, m - 1) * bl + 3 + r] - pos[maxi(c - 1, 0) * bl + 3 + r]
			var b := pos[b0 + mini(r + 1, rows)] - pos[b0 + maxi(r - 1, 0)]
			var nv := b.cross(a).normalized()
			if nv.dot(Vector3(outs[c].x, 0.0, outs[c].y)) < 0.0:
				nv = -nv
			nor[b0 + r] = nv
	var idx := PackedInt32Array()
	for c in m - 1:
		for r in bl - 1:
			if r == 2:
				continue
			var a := c * bl + r
			var b := (c + 1) * bl + r
			# (the lip's two strips facing up whatever way the piece runs)
			if r < 2 and (pos[b] - pos[a]).cross(pos[a + 1] - pos[a]).y > 0.0:
				idx.append_array(PackedInt32Array([a, a + 1, b, b, a + 1, b + 1]))
			else:
				idx.append_array(PackedInt32Array([a, b, a + 1, b, b + 1, a + 1]))
	mid = (m / 2) * bl
	return {"verts": pos, "normals": nor, "indices": idx, "probe": PackedVector3Array([pos[mid + 3], pos[mid + 3 + rows]]),
		"height": float(cols[m / 2].top) - float(cols[m / 2].foot)}


# ---- 8. the bookmarks, the walk check and the table ----------------------------------------------------------------------

## the four views from the settings, on the finished ground: each camera over the highest ground within 20 m of its spot.
## With an eighth number the camera stands exactly that far (m) in from the nearest edge of the plateau it is on; with a
## ninth it also looks along that edge (towards the side of the given target), turned that many degrees in over the plateau
## (negative: out over the drop), at a point 1200 m away the given height above the camera's own ground.
func _bookmarks() -> void:
	bookmarks = {}
	for name in cfg.bookmark_views:
		var v: PackedFloat32Array = cfg.bookmark_views[name]
		var cam := _from_uv(Vector2(v[0], v[1]))
		var tgt := _from_uv(Vector2(v[3], v[4]))
		var look_h := NAN
		if v.size() > 7:
			var e := _edge_near(cam)
			# (only at a rim - the ground beyond the edge lower: at a wall's foot the camera would stand in the rock)
			if not e.is_empty() and height_at((e.at as Vector2) - (e.inward as Vector2) * 12.0) > height_at(e.at) - 20.0:
				report["bookmark_" + name] = "not at a rim: the nearest edge is a wall's foot - placed as given"
				e = {}
			if not e.is_empty():
				var ep: Vector2 = e.at
				var nin: Vector2 = e.inward
				cam = ep + nin * v[7]
				if v.size() > 8:
					var t := Vector2(-nin.y, nin.x)
					if t.dot(tgt - cam) < 0.0:
						t = -t
					var d := (t * cos(deg_to_rad(v[8])) + nin * sin(deg_to_rad(v[8]))).normalized()
					tgt = cam + d * 1200.0
					look_h = height_at(cam) + v[5]
		var g := -INF
		for dz in range(-20, 21, 5):
			for dx in range(-20, 21, 5):
				g = maxf(g, height_at(cam + Vector2(dx, dz)))
		if v.size() > 7:
			g = height_at(cam)
		var th: float = look_h if not is_nan(look_h) else height_at(tgt) + v[5]
		bookmarks[name] = {"pos": Vector3(cam.x, g + v[2], cam.y), "look": Vector3(tgt.x, th, tgt.y), "fov": v[6]}
	report.bookmarks = bookmarks.keys()


## the nearest edge of the terrace a map point stands on: the edge sample (from the snap map) and the edge's inward normal,
## fitted to the edge samples of that terrace within 40 m of it (a line through them)
func _edge_near(p: Vector2) -> Dictionary:
	var i := int(round((p.x - gen.origin) / gen.sp)) - fx0
	var j := int(round((p.y - gen.origin) / gen.sp)) - fz0
	if i < 0 or j < 0 or i >= fn or j >= fn:
		return {}
	var o := Vector2(snap[(j * fn + i) * 2], snap[(j * fn + i) * 2 + 1])
	if o.x > BIG * 0.5:
		return {}
	var e := p + o
	var ei := i + int(round(o.x / gen.sp))
	var ej := j + int(round(o.y / gen.sp))
	var he := fh[ej * fn + ei]
	var pts := PackedVector2Array()
	var r := 10
	for dj in range(-r, r + 1):
		for di in range(-r, r + 1):
			var qi := ei + di
			var qj := ej + dj
			if qi < 0 or qj < 0 or qi >= fn or qj >= fn or di * di + dj * dj > r * r:
				continue
			var q := qj * fn + qi
			if snap[q * 2] == 0.0 and snap[q * 2 + 1] == 0.0 and absf(fh[q] - he) < STEP:
				pts.append(Vector2(di, dj) * gen.sp)
	if pts.size() < 3:
		return {}
	# the line's direction: the main axis of the edge samples (2 x 2 covariance)
	var m := Vector2.ZERO
	for q in pts:
		m += q
	m /= pts.size()
	var sxx := 0.0
	var sxy := 0.0
	var syy := 0.0
	for q in pts:
		var d := q - m
		sxx += d.x * d.x
		sxy += d.x * d.y
		syy += d.y * d.y
	var ang := 0.5 * atan2(2.0 * sxy, sxx - syy)
	var t := Vector2.from_angle(ang)
	var nin := Vector2(-t.y, t.x)
	if nin.dot(-o) < 0.0:
		nin = -nin
	return {"at": e, "inward": nin}


## walkable 8 m cells over the patch: no slope over 35 degrees between their 4 m samples
func _walk_cells() -> Array:
	var lim: float = tan(deg_to_rad(35.0)) * gen.sp
	var cn := fn / 2
	var walk := PackedByteArray()
	walk.resize(cn * cn)
	for j in cn:
		for i in cn:
			var ok := true
			var q0 := (2 * j) * fn + 2 * i
			var a := fh[q0]
			if absf(fh[q0 + 1] - a) > lim or absf(fh[q0 + fn] - a) > lim or absf(fh[q0 + fn + 1] - fh[q0 + 1]) > lim:
				ok = false
			if i < cn - 1 and absf(fh[q0 + 2] - fh[q0 + 1]) > lim:
				ok = false
			if j < cn - 1 and absf(fh[q0 + 2 * fn] - fh[q0 + fn]) > lim:
				ok = false
			walk[j * cn + i] = 1 if ok else 0
	return [walk, cn]


func _cell_pos(i: int, j: int) -> Vector2:
	return Vector2(gen.origin + (fx0 + 2 * i) * gen.sp, gen.origin + (fz0 + 2 * j) * gen.sp)


func _walk_check() -> void:
	var wc := _walk_cells()
	var walk: PackedByteArray = wc[0]
	var cn: int = wc[1]
	var starts := PackedInt32Array()
	for j in cn:
		for i in cn:
			var q := j * cn + i
			if walk[q] == 1 and _lvl(_cell_pos(i, j)) == 0:
				starts.append(q)
	var seen := BaseGen._flood(walk, cn, starts, 1)
	# each ravine on its own: from the ground in front of it up to the top, inside its own corridor
	var working := 0
	for nt in notches:
		nt.ok = _notch_walk(walk, cn, nt)
		working += 1 if nt.ok else 0
	report.ways_up_walkable = "%d of %d" % [working, notches.size()]
	var out := []
	for k in range(1, 4):
		var labk: PackedInt32Array = _lab[k]
		var hit := {}
		for j in cn:
			for i in cn:
				if seen[j * cn + i] == 1:
					var c := _gcell(_cell_pos(i, j))
					if level[c.y * n + c.x] >= k and labk[c.y * n + c.x] > 0:
						hit[labk[c.y * n + c.x]] = true
		var miss := []
		var total := 0
		for c in _comps[k]:
			if not c.own:
				continue
			total += 1
			if not hit.has(int(c.id)):
				miss.append("piece %d of plateau %d" % [c.id, c.plateau])
		var got := total - miss.size()
		out.append("level %d: %d of %d plateau pieces reached on foot%s" % [k, got, total, (" - not: " + ", ".join(miss)) if not miss.is_empty() else ""])
	report.walkable = out


## a ravine walked over walkable 8 m cells: from 40 m out in front of it to past its top, never leaving its corridor
func _notch_walk(walk: PackedByteArray, cn: int, nt: Dictionary) -> bool:
	var to_c := func(p: Vector2) -> Vector2i:
		return Vector2i(clampi(int(round(((p.x - gen.origin) / gen.sp - fx0) / 2.0)), 0, cn - 1), clampi(int(round(((p.y - gen.origin) / gen.sp - fz0) / 2.0)), 0, cn - 1))
	var p0: Vector2 = nt.at
	var dir: Vector2 = nt.dir
	var out: Vector2 = nt.out
	var w: float = nt.width
	var start := p0 + out * 40.0
	var goal := p0 + dir * (float(nt.start) + float(nt.length) + 20.0)
	var a: Vector2i = to_c.call(start)
	var b: Vector2i = to_c.call(goal)
	var seen := {a: true}
	var queue := [a]
	var head := 0
	while head < queue.size():
		var c: Vector2i = queue[head]
		head += 1
		if absi(c.x - b.x) <= 2 and absi(c.y - b.y) <= 2:
			return true
		for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1), Vector2i(1, 1), Vector2i(-1, 1), Vector2i(1, -1), Vector2i(-1, -1)]:
			var nc: Vector2i = c + d
			if nc.x < 0 or nc.y < 0 or nc.x >= cn or nc.y >= cn or seen.has(nc) or walk[nc.y * cn + nc.x] == 0:
				continue
			var p := _cell_pos(nc.x, nc.y)
			if _pt_seg(p, start, p0) > w * 0.5 + 10.0 and _pt_seg(p, p0, goal + dir * 30.0) > w * 0.5 + 10.0:
				continue
			seen[nc] = true
			queue.append(nc)
	return false


static func _pt_seg(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var t := clampf((p - a).dot(ab) / maxf(ab.length_squared(), 1e-6), 0.0, 1.0)
	return p.distance_to(a + ab * t)


## the plateau table: per plateau piece (and level) its top height (mean; 5 % and 95 % of its samples - past its ravines), the ground at its walls' feet,
## its walls' heights (measured on the wall columns), its area and its ways up
func _table() -> void:
	objects = []
	var sums := {}
	for cv in _cols:
		if cv[2]:
			continue
		var key: String = cv[0]
		if not sums.has(key):
			sums[key] = PackedFloat32Array()
		var arr: PackedFloat32Array = sums[key]
		arr.append(cv[1])
		sums[key] = arr
	var names := ["floor", "A", "B", "C"]
	for k in range(1, 4):
		var labk: PackedInt32Array = _lab[k]
		for c in _comps[k]:
			if not c.own:
				continue
			# its top: the 4 m samples on this piece at this level
			var tops := PackedFloat32Array()
			var cen := Vector2.ZERO
			for j in range(0, fn, 4):
				for i in range(0, fn, 4):
					var p := Vector2(gen.origin + (fx0 + i) * gen.sp, gen.origin + (fz0 + j) * gen.sp)
					var g := _gcell(p)
					if labk[g.y * n + g.x] == int(c.id) and level[g.y * n + g.x] == k:
						tops.append(fh[j * fn + i])
						cen += p
			cen /= maxi(tops.size(), 1)
			tops.sort()
			var key := "%d:%d" % [c.plateau, k]
			var wh: PackedFloat32Array = sums.get(key, PackedFloat32Array())
			var wsum := 0.0
			var wmin := INF
			var wmax := -INF
			for v in wh:
				wsum += v
				wmin = minf(wmin, v)
				wmax = maxf(wmax, v)
			var ways := 0
			for nt in notches:
				if int(nt.plateau) == int(c.plateau) and int(nt.level) == k:
					ways += 1
			var top_mean: float = tops[tops.size() / 2] if tops.size() > 0 else 0.0
			# (its own surface only: the samples within 30 m of its middle height - not a ravine's ramp, nor a sample at the foot
			# or top of a neighbouring wall caught by the 8 m layout cells)
			var own_tops := PackedFloat32Array()
			for v in tops:
				if absf(v - top_mean) < 30.0:
					own_tops.append(v)
			tops = own_tops
			var row := {"id": "P%d%s" % [int(c.plateau) + 1, names[k] if int((_sh[int(c.plateau)] as Dictionary).base) != k else ""],
				"plateau": int(c.plateau) + 1, "level": names[k], "on": names[int(c.below)],
				"top": snappedf(top_mean, 1.0), "top_min": snappedf(tops[tops.size() / 20] if tops.size() > 0 else 0.0, 1.0),
				"top_max": snappedf(tops[tops.size() * 19 / 20] if tops.size() > 0 else 0.0, 1.0),
				"wall_min": snappedf(wmin, 1.0) if wh.size() > 0 else 0.0, "wall_avg": snappedf(wsum / maxi(wh.size(), 1), 1.0),
				"wall_max": snappedf(wmax, 1.0) if wh.size() > 0 else 0.0,
				"ground_below": snappedf(top_mean - wsum / maxi(wh.size(), 1), 1.0) if wh.size() > 0 else 0.0,
				"area_km2": snappedf(int(c.cells) * gc * gc / 1e6, 0.01), "ways_up": ways, "x": snappedf(cen.x, 1.0), "z": snappedf(cen.y, 1.0)}
			objects.append(row)
	report.plateau_table = objects


## how far apart neighbouring plateaus are (their level-1 edges, measured edge to edge): for every edge point of one, the
## distance to the nearest edge point of the other, where that is under 700 m - the narrowest, the median and the widest of
## those (a canyon's width along its length)
func _gaps() -> void:
	var by := {}
	var d1: PackedFloat32Array = _d[1]
	var own: PackedByteArray = _own[1]
	for lp in _contours(d1):
		for p in _resample(lp, 16.0, true):
			var c := _gcell(p - _out_normal(d1, p) * 12.0)
			var o := int(own[c.y * n + c.x]) - 1
			if o < 0:
				continue
			if not by.has(o):
				by[o] = PackedVector2Array()
			var arr: PackedVector2Array = by[o]
			arr.append(p)
			by[o] = arr
	var out := []
	var keys := by.keys()
	for ai in keys.size():
		for bi in range(ai + 1, keys.size()):
			var pa: PackedVector2Array = by[keys[ai]]
			var pb: PackedVector2Array = by[keys[bi]]
			var ds := PackedFloat32Array()
			for a in pa:
				var best := INF
				for b in pb:
					best = minf(best, a.distance_squared_to(b))
				if best < 700.0 * 700.0:
					ds.append(sqrt(best))
			if ds.size() < 8:
				continue
			ds.sort()
			out.append("P%d-P%d: %.0f / %.0f / %.0f m along %.0f m" % [int(keys[ai]) + 1, int(keys[bi]) + 1, ds[0], ds[ds.size() / 2], ds[ds.size() - 1], ds.size() * 16.0])
	report.gaps_min_median_max = out
	# how deep each stacked terrace is: from every edge point of the level above, the distance out to the nearest edge point
	# of the level below on the same plateau (the narrowest, the median) - the terraces as shaped, before the ravines cut in
	var terr := []
	for k in range(2, 4):
		var dk: PackedFloat32Array = _du[k]
		var dl: PackedFloat32Array = _du[k - 1]
		var ownk: PackedByteArray = _own[k]
		var lower := {}
		for lp in _contours(dl):
			for p in _resample(lp, 16.0, true):
				var c := _gcell(p - _out_normal(dl, p) * 12.0)
				var o := int((_own[k - 1] as PackedByteArray)[c.y * n + c.x]) - 1
				if not lower.has(o):
					lower[o] = PackedVector2Array()
				var arr: PackedVector2Array = lower[o]
				arr.append(p)
				lower[o] = arr
		var per := {}
		for lp in _contours(dk):
			for p in _resample(lp, 16.0, true):
				var c := _gcell(p - _out_normal(dk, p) * 12.0)
				var o := int(ownk[c.y * n + c.x]) - 1
				if o < 0 or not lower.has(o) or int((_sh[o] as Dictionary).base) >= k:
					continue
				var best := INF
				for b in lower[o]:
					best = minf(best, p.distance_squared_to(b))
				# (a ravine's sides and an edge shared with the level below are not a terrace)
				var fc := _gcell(p + _out_normal(dk, p) * 14.0)
				if _nid[fc.y * n + fc.x] > 0 or sqrt(best) < LEDGE_CLOSE:
					continue
				if not per.has(o):
					per[o] = PackedFloat32Array()
				var arr2: PackedFloat32Array = per[o]
				arr2.append(sqrt(best))
				per[o] = arr2
		for o in per:
			var ds: PackedFloat32Array = per[o]
			ds.sort()
			terr.append("P%d %s on %s: narrowest %.0f m, median %.0f m" % [int(o) + 1, ["", "A", "B", "C"][k], ["floor", "A", "B", "C"][k - 1], ds[0], ds[ds.size() / 2]])
	report.terrace_depths = terr


func _free() -> void:
	_d = []
	_du = []
	_own = []
	_lab = []
	_comps = []
	_nid = PackedInt32Array()
	_cols = []


# ---- onto the island -----------------------------------------------------------------------------------------------------

## write the region into the island: its heights into the base terrain's region images (and the queries' views of them),
## and the planning grid's heights and slopes round it
func apply() -> void:
	var rs: int = gen.region_size
	var per: int = gen.regions_per_side
	var touched := {}
	for j in fn:
		var gj := fz0 + j
		for i in fn:
			var gi := fx0 + i
			touched[(gj / rs) * per + gi / rs] = true
	gen.region_controls = []
	for ri in touched:
		var img: Image = gen.region_heights[ri]
		if img == null:
			continue
		var rx: int = ri % per
		var rz: int = ri / per
		var data := img.get_data()
		for ly in rs:
			var j: int = rz * rs + ly - fz0
			if j < 0 or j >= fn:
				continue
			for lx in rs:
				var i: int = rx * rs + lx - fx0
				if i < 0 or i >= fn:
					continue
				data.encode_float((ly * rs + lx) * 4, fh[j * fn + i])
		img.set_data(rs, rs, false, Image.FORMAT_RF, data)
		gen._hreg[ri] = img.get_data()
	# the planning grid under the region: mean of the samples, then its slopes
	var pres: int = gen.pres
	var ratio: int = gen.res / pres
	var p0 := Vector2i(fx0 / ratio, fz0 / ratio)
	var p1 := Vector2i((fx0 + fn) / ratio, (fz0 + fn) / ratio)
	# (local copies, written back whole: writing gen.c_h[i] directly would copy the whole array each time)
	var ch: PackedFloat32Array = gen.c_h.duplicate()
	var cs: PackedFloat32Array = gen.c_slope.duplicate()
	for pj in range(p0.y, p1.y):
		for pi in range(p0.x, p1.x):
			var s := 0.0
			var c := 0
			for dj in ratio:
				for di in ratio:
					var j := pj * ratio + dj - fz0
					var i := pi * ratio + di - fx0
					if i >= 0 and j >= 0 and i < fn and j < fn:
						s += fh[j * fn + i]
						c += 1
			if c > 0:
				ch[pj * pres + pi] = s / c
	var pcell: float = gen.pc
	for pj in range(maxi(p0.y - 1, 1), mini(p1.y + 1, pres - 1)):
		for pi in range(maxi(p0.x - 1, 1), mini(p1.x + 1, pres - 1)):
			var gx: float = (ch[pj * pres + pi + 1] - ch[pj * pres + pi - 1]) / (2.0 * pcell)
			var gz: float = (ch[(pj + 1) * pres + pi] - ch[(pj - 1) * pres + pi]) / (2.0 * pcell)
			cs[pj * pres + pi] = rad_to_deg(atan(sqrt(gx * gx + gz * gz)))
	gen.c_h = ch
	gen.c_slope = cs
	gen.region = self


## the snap map as a texture for the terrain shader (x, z in m per 4 m sample), and the map position of its first sample
func snap_texture() -> ImageTexture:
	var img := Image.create_from_data(fn, fn, false, Image.FORMAT_RGF, snap.to_byte_array())
	return ImageTexture.create_from_image(img)


func snap_origin() -> Vector2:
	return Vector2(gen.origin + fx0 * gen.sp, gen.origin + fz0 * gen.sp)


## the collision faces of every wall piece (three corners per triangle), ready for ConcavePolygonShape3D
func prepare_faces() -> void:
	for w in walls:
		var v: PackedVector3Array = w.verts
		var idx: PackedInt32Array = w.indices
		var faces := PackedVector3Array()
		faces.resize(idx.size())
		for k in idx.size():
			faces[k] = v[idx[k]]
		w.faces = faces


## heights along a straight line between two map points, every `step` m (for the profile graphs)
func profile(a: Vector2, b: Vector2, step: float) -> PackedFloat32Array:
	var out := PackedFloat32Array()
	var length := a.distance_to(b)
	var t := 0.0
	while t <= length:
		out.append(height_at(a.lerp(b, t / length)))
		t += step
	return out


# ---- queries (local coordinates, like the island's) ----------------------------------------------------------------------

## the plateau level at a point (0 = the floor, 1 - 3; -1 outside the region)
func level_at(x: float, z: float) -> int:
	var p := Vector2(x + gen.offset.x, z + gen.offset.y)
	if level.is_empty() or _edge(p) < 0.0:
		return -1
	var c := _gcell(p)
	return level[c.y * n + c.x]


# ---- the cache -----------------------------------------------------------------------------------------------------------

func save(path: String) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return
	f.store_var({"version": VERSION, "center": center, "axis_u": axis_u, "fx0": fx0, "fz0": fz0, "fn": fn, "n": n,
		"floor_h": floor_h, "notches": notches, "objects": objects, "bookmarks": bookmarks, "report": report, "walls": walls})
	f.store_buffer(fh.to_byte_array())
	f.store_buffer(snap.to_byte_array())
	f.store_buffer(level)
	f.close()


func load_cache(path: String) -> bool:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return false
	var meta = f.get_var()
	if typeof(meta) != TYPE_DICTIONARY or meta.get("version", -1) != VERSION or int(meta.fn) != fn or int(meta.n) != n:
		return false
	center = meta.center
	axis_u = meta.axis_u
	axis_v = Vector2(-axis_u.y, axis_u.x)
	fx0 = meta.fx0
	fz0 = meta.fz0
	floor_h = meta.floor_h
	notches = meta.notches
	objects = meta.objects
	bookmarks = meta.bookmarks
	report = meta.report
	report.cached = true
	walls = meta.walls
	fh = f.get_buffer(fn * fn * 4).to_float32_array()
	snap = f.get_buffer(fn * fn * 8).to_float32_array()
	level = f.get_buffer(n * n)
	f.close()
	if level.size() != n * n or snap.size() != fn * fn * 2:
		return false
	ready = true
	return true
