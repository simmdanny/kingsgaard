extends RefCounted
## THE TEPUI REGION (scripts/world/tepui_region.gd): a 4 x 4 km region of flat-topped plateaus with sheer walls, stacked
## terraces, deep canyons and a wide valley, built on the clean base terrain from RegionSettings (region_settings.gd) and a seed.
##
## How it sits on the island: the base terrain stays the region's floor (the valleys and canyons), the plateaus are built on
## top of it - each plateau's top a fixed height above the ground under it (levels +150 / +300 / +450 m by default), flat
## with gentle rolling hills - and they stay a border's width inside the region, so its edge blends into the island by itself.
##
## Steps (layout grid: 8 m cells over the region square; heights: the island's 4 m samples):
##   1. place: highlands / high plateaus all round, no sea or mountains, mountains in view; the layout's axis from the sun so
##      the long walls are lit from the side.
##   2. paths: a wide main valley across the region and narrow canyons (one long one between high plateaus).
##   3. plateau field: domain-warped noise, higher on one side of the valley, carved by the valley and canyons, held off the
##      border; cut into three nested levels by area shares; small pieces dropped; each level's edge as a smooth signed
##      distance. Ledges thinner than ledge_min are closed (one taller wall); the top level always keeps a ledge.
##   4. heights: inside a level its top (the plateau's own base height + the level + its jitter + hills), else the island's
##      ground. Bookmarks (4 camera views after the reference pictures) are chosen on this shape.
##   5. ramps: per plateau piece and level, ramp_angle grassy ramps (a cone leaning on the wall: walkable on its crest, steep
##      sides) where there is room, away from the bookmark views; most edges stay sheer.
##   6. holes: every 4 m sample next to a near-vertical step is cut out of the terrain (Terrain3D holes: no mesh, no collision).
##   7. walls: separate meshes along every level's edge (marching squares on its distance field), from just inside the plateau's
##      top (wall_rim_inset) down to just outside the foot (wall_foot_outset, buried) - so they cover the cut strip with no gap
##      or z-fighting - shaped by slow curvature, buttresses, vertical grooves and setbacks at rock layers; trimesh collision.
##   8. walk check: which plateaus a walker from the valley floor reaches (slopes under 35 degrees, never through a hole).
## Everything stored is in map coordinates (walls relative to the region's centre). Cached in user://terrain.

const BaseGen := preload("res://scripts/world/base_terrain_gen.gd")
const VERSION := 1
## which way the game's sun (main.gd) shines across the ground
const SUN_TRAVEL := Vector2(0.573, -0.820)
## a step between neighbouring 4 m samples taller than this is a wall: the samples beside it become holes
const HOLE_STEP := 8.0
## two levels' edges closer than this are one wall (from the lower level's foot up into the upper level)
const LEDGE_CLOSE := 25.0
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

# the full-res patch: the island's 4 m samples over the region square
var fx0 := 0
var fz0 := 0
var fn := 1000
var fh := PackedFloat32Array()
var fhole := PackedByteArray()
# the layout grid
var level := PackedByteArray()
var walls: Array = []
var ramps: Array = []
var bookmarks := {}
var paths := {}
var report := {}
var ready := false
var stage := ""
var verbose := false
## (debug: the cut-away samples no wall covered, filled back in)
var dbg_uncovered := PackedByteArray()

var _n := {}
var _T := PackedFloat32Array()
var _d: Array = []
var _lab: Array = []
var _comps: Array = []
var _top: Array = []
var _base := PackedFloat32Array()
var _carve := PackedFloat32Array()
var _h0 := 0.0
var _ref := {}
var _why := {}
var _path_map := PackedByteArray()
var _last_reach := ""
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
	_n.mesa = _mk(s + 1, 1.0 / cfg.mesa_wavelength, cfg.mesa_octaves)
	_n.wx = _mk(s + 2, 1.0 / (cfg.mesa_wavelength * 1.3), 2)
	_n.wz = _mk(s + 3, 1.0 / (cfg.mesa_wavelength * 1.3), 2)
	_n.hill = _mk(s + 4, 1.0 / cfg.top_hill_wavelength, 2)
	_n.path = _mk(s + 5, 1.0, 1)
	_n.curve = _mk(s + 6, 1.0 / cfg.wall_curve_wavelength, 2)
	_n.wall = _mk(s + 7, 1.0, 1)


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
	_step("paths", _paths)
	_step("plateau field", _field)
	_step("levels", _levels)
	_step("tops", _tops)
	_step("heights", _heights)
	_holes()
	_step("bookmarks", _bookmarks)
	_step("ramps", _ramps)
	_step("holes", _holes)
	_step("walls", _walls)
	_framed_bookmarks()
	_step("walk check", _walk_check)
	_free()
	report.total_s = (Time.get_ticks_msec() - _t0) / 1000.0
	ready = true


func _step(name: String, fn: Callable) -> void:
	stage = name
	var t := Time.get_ticks_msec()
	fn.call()
	report.times[name] = (Time.get_ticks_msec() - t) / 1000.0
	if verbose:
		print("region: %s %.1f s" % [name, report.times[name]])


func _bands(fn: Callable, rows: int) -> Array:
	var nb := 32
	var out := []
	out.resize(nb)
	var gid := WorkerThreadPool.add_group_task(func(b: int): out[b] = fn.call(b * rows / nb, (b + 1) * rows / nb), nb, -1, true, "region")
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


## local layout coordinates: u along the main valley, v across it
func _uv(p: Vector2) -> Vector2:
	var r := p - center
	return Vector2(r.dot(axis_u), r.dot(axis_v))


func _from_uv(uv: Vector2) -> Vector2:
	return center + axis_u * uv.x + axis_v * uv.y


func _base_h(x: float, z: float) -> float:
	return gen.height(x - gen.offset.x, z - gen.offset.y)


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
	# the main valley's axis: its long walls lit from the side (about 50 degrees off the sun's direction)
	var ang: float = deg_to_rad(cfg.valley_angle) if cfg.valley_angle != INF else SUN_TRAVEL.angle() + deg_to_rad(90.0 + 50.0)
	axis_u = Vector2.from_angle(ang)
	axis_v = Vector2(-axis_u.y, axis_u.x)
	report.center = [center.x, center.y]
	report.axis_deg = snappedf(rad_to_deg(ang), 0.1)
	var tiers := [0, 0, 0, 0, 0]
	for j in range(0, 41):
		for i in range(0, 41):
			var t: int = gen.tier_at(center.x - half + i * 100.0, center.y - half + j * 100.0)
			if t < 5:
				tiers[t] += 1
	report.base_tiers_in_region = "highlands %d%%, high plateaus %d%%, lowlands %d%%" % [tiers[2] * 100 / 1681, tiers[3] * 100 / 1681, tiers[1] * 100 / 1681]


# ---- 2. the main valley and the canyons ----------------------------------------------------------------------------------

func _paths() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value + 11
	var np: FastNoiseLite = _n.path
	paths = {"valley": [], "canyons": []}
	# the main valley: across the whole region along u, swinging sideways, its width varying
	var v0 := rng.randf_range(-260.0, 160.0)
	var pts := PackedVector2Array()
	var wid := PackedFloat32Array()
	var u := -half - 400.0
	while u <= half + 400.0:
		var v: float = v0 + cfg.valley_meander * np.get_noise_1d(u * 0.0011 + 3.0)
		pts.append(_from_uv(Vector2(u, v)))
		wid.append(lerpf(cfg.valley_width_min, cfg.valley_width_max, 0.5 + 0.5 * np.get_noise_1d(u * 0.0009 + 40.0)))
		u += 30.0
	paths.valley = [{"points": pts, "width": wid, "kind": "valley"}]
	report.valley_v = snappedf(v0, 1.0)
	# canyon 0: the long one, on the valley's low side, roughly along it, between high plateaus (its flanks are raised)
	var specs := []
	var vc := v0 - rng.randf_range(720.0, 900.0)
	specs.append({"start": Vector2(half + 300.0, vc), "dir": PI + rng.randf_range(-0.18, 0.18), "len": cfg.canyon_length, "long": true})
	# more canyons: across the block from the valley (it splits the block into separate plateaus), then into the terraces
	for k in range(1, cfg.canyons):
		var side := -1.0 if k % 2 == 1 else 1.0
		var su := rng.randf_range(-half * 0.35, half * 0.35)
		var a := PI * 0.5 * side + rng.randf_range(-0.35, 0.35)
		var length := rng.randf_range(1500.0, 2100.0) if side < 0.0 else rng.randf_range(900.0, 1400.0)
		specs.append({"start": Vector2(su, v0 + side * 250.0), "dir": a, "len": length, "long": false})
	for k in specs.size():
		var sp: Dictionary = specs[k]
		var cp := PackedVector2Array()
		var cw := PackedFloat32Array()
		var dir: float = sp.dir
		var at: Vector2 = sp.start
		var length: float = sp.len
		var t := 0.0
		while t <= length:
			var fwd := Vector2.from_angle(dir)
			var side_v := Vector2(-fwd.y, fwd.x)
			var off: float = cfg.canyon_meander * np.get_noise_1d(t * 0.0016 + 100.0 * k + 7.0)
			cp.append(_from_uv(at + fwd * t + side_v * off))
			var grow := smoothstep(0.0, length, t) if sp.long else 1.0 - smoothstep(0.0, length, t) * 0.5
			cw.append(lerpf(cfg.canyon_width_min, cfg.canyon_width_max, clampf(0.25 + 0.6 * grow + 0.25 * np.get_noise_1d(t * 0.002 + 50.0 * k), 0.0, 1.0)))
			t += 25.0
		paths.canyons.append({"points": cp, "width": cw, "kind": "canyon", "long": sp.long})


# ---- 3. the plateau field and its levels ---------------------------------------------------------------------------------

func _field() -> void:
	# every path point onto the grid, then each cell's nearest path point (its distance and half-width)
	var seeds := PackedVector2Array()
	var hw := PackedFloat32Array()
	var longc := PackedByteArray()
	for group in [paths.valley, paths.canyons]:
		for pth in group:
			var pp: PackedVector2Array = pth.points
			var ww: PackedFloat32Array = pth.width
			for s in pp.size():
				seeds.append(pp[s])
				hw.append(ww[s] * 0.5)
				longc.append(1 if pth.get("long", false) else 0)
	var dist := PackedFloat32Array()
	dist.resize(n * n)
	dist.fill(BIG)
	var idx := PackedInt32Array()
	idx.resize(n * n)
	idx.fill(-1)
	for si in seeds.size():
		var c := _gcell(seeds[si])
		var q := c.y * n + c.x
		var dd := seeds[si].distance_to(Vector2(_gx(c.x), _gz(c.y)))
		if dd < dist[q]:
			dist[q] = dd
			idx[q] = si
	_nearest(dist, idx, seeds)
	var parts := _bands(_field_rows.bind(dist, idx, hw, longc), n)
	_T = PackedFloat32Array()
	_carve = PackedFloat32Array()
	for p in parts:
		_T.append_array(p[0])
		_carve.append_array(p[1])


func _field_rows(j0: int, j1: int, dist: PackedFloat32Array, idx: PackedInt32Array, hw: PackedFloat32Array, longc: PackedByteArray) -> Array:
	var out := PackedFloat32Array()
	out.resize((j1 - j0) * n)
	var carve := PackedFloat32Array()
	carve.resize((j1 - j0) * n)
	var nm: FastNoiseLite = _n.mesa
	var nwx: FastNoiseLite = _n.wx
	var nwz: FastNoiseLite = _n.wz
	var warp: float = cfg.mesa_warp
	var nw: float = cfg.noise_weight
	var depth: float = cfg.terrace_depth
	var block: float = cfg.block_height
	var border: float = cfg.border
	var v0: float = report.valley_v
	var o := 0
	for j in range(j0, j1):
		for i in n:
			var p := Vector2(_gx(i), _gz(j))
			var uv := _uv(p)
			var wx := uv.x + warp * nwx.get_noise_2d(uv.x, uv.y)
			var wz := uv.y + warp * nwz.get_noise_2d(uv.x, uv.y)
			var noise := 0.5 + 0.5 * nm.get_noise_2d(wx, wz)
			# the terraced side climbs away from the valley; the block side is high right from the valley's edge
			var dv := uv.y - v0 + 140.0 * nwz.get_noise_2d(uv.x * 0.6, 77.0)
			var structure := smoothstep(0.0, depth, dv) if dv > 0.0 else block * smoothstep(0.0, 260.0, -dv)
			var t := structure * (1.0 - nw) + noise * nw
			var q := j * n + i
			var si := idx[q]
			if si >= 0:
				var h := hw[si]
				var dd := dist[q]
				var cv := 1.0 - smoothstep(h - 40.0, h + 40.0, dd)
				t -= 3.0 * cv
				carve[o] = 1.0 - smoothstep(h * 0.6, h + 120.0, dd)
				if longc[si] == 1:
					# high plateaus along both sides of the long canyon
					t += 0.4 * smoothstep(h, h + 60.0, dd) * (1.0 - smoothstep(h + 250.0, h + 650.0, dd))
			t -= 3.0 * (1.0 - smoothstep(-80.0, 260.0, _inner(p)))
			out[o] = t
			o += 1
	return [out, carve]


## how far a map point is inside the line plateaus keep behind (a rounded square border's width in from the region's edge,
## wandering in and out); negative outside it
func _inner(p: Vector2) -> float:
	var r: Vector2 = (p - center) / (half - cfg.border)
	var q := pow(pow(absf(r.x), 4.0) + pow(absf(r.y), 4.0), 0.25)
	var nw: FastNoiseLite = _n.wx
	return (half - cfg.border) * (1.0 - q) + cfg.border_noise * nw.get_noise_2d(p.x * 0.7 + 900.0, p.y * 0.7 - 300.0)


## nearest-seed propagation: every cell takes its neighbour's seed when that seed is nearer to it (two raster passes)
func _nearest(dist: PackedFloat32Array, idx: PackedInt32Array, seeds: PackedVector2Array) -> void:
	var odi := [-1, -1, 0, 1]
	var odj := [0, -1, -1, -1]
	for pass_i in 2:
		var s := 1 if pass_i == 0 else -1
		for jj in n:
			var j := jj if pass_i == 0 else n - 1 - jj
			var z := _gz(j)
			for ii in n:
				var i := ii if pass_i == 0 else n - 1 - ii
				var q := j * n + i
				var x := _gx(i)
				var best := dist[q]
				var bi := idx[q]
				for k in 4:
					var ni: int = i + s * int(odi[k])
					var nj: int = j + s * int(odj[k])
					if ni < 0 or nj < 0 or ni >= n or nj >= n:
						continue
					var o := idx[nj * n + ni]
					if o < 0 or o == bi:
						continue
					var dd := seeds[o].distance_to(Vector2(x, z))
					if dd < best:
						best = dd
						bi = o
				dist[q] = best
				idx[q] = bi


func _blur(a: PackedFloat32Array) -> PackedFloat32Array:
	var b := PackedFloat32Array()
	b.resize(n * n)
	for j in n:
		for i in n:
			b[j * n + i] = (a[j * n + maxi(i - 1, 0)] + 2.0 * a[j * n + i] + a[j * n + mini(i + 1, n - 1)]) * 0.25
	var c := PackedFloat32Array()
	c.resize(n * n)
	for j in n:
		for i in n:
			c[j * n + i] = (b[maxi(j - 1, 0) * n + i] + 2.0 * b[j * n + i] + b[mini(j + 1, n - 1) * n + i]) * 0.25
	return c


## the signed distance (m) to a mask's edge, smooth: softened mask, sub-cell edge points, true distance to the nearest one
func _sdf(mask: PackedByteArray) -> PackedFloat32Array:
	var nn := n * n
	var m := PackedFloat32Array()
	m.resize(nn)
	for q in nn:
		m[q] = float(mask[q])
	m = _blur(_blur(m))
	var seeds := PackedVector2Array()
	var dist := PackedFloat32Array()
	dist.resize(nn)
	dist.fill(BIG)
	var idx := PackedInt32Array()
	idx.resize(nn)
	idx.fill(-1)
	for j in n:
		for i in n:
			var q := j * n + i
			var a := m[q] - 0.5
			for k in 2:
				var ni := i + (1 if k == 0 else 0)
				var nj := j + (0 if k == 0 else 1)
				if ni >= n or nj >= n:
					continue
				var nq := nj * n + ni
				var b := m[nq] - 0.5
				if (a >= 0.0) == (b >= 0.0):
					continue
				var p := Vector2(_gx(i), _gz(j)).lerp(Vector2(_gx(ni), _gz(nj)), a / (a - b))
				var si := seeds.size()
				seeds.append(p)
				var d0 := p.distance_to(Vector2(_gx(i), _gz(j)))
				if d0 < dist[q]:
					dist[q] = d0
					idx[q] = si
				var d1 := p.distance_to(Vector2(_gx(ni), _gz(nj)))
				if d1 < dist[nq]:
					dist[nq] = d1
					idx[nq] = si
	if not seeds.is_empty():
		_nearest(dist, idx, seeds)
	for q in nn:
		if m[q] < 0.5:
			dist[q] = -dist[q]
	return dist


func _levels() -> void:
	var nn := n * n
	# cut levels from the wanted shares over the region inside its border
	var vals := PackedFloat32Array()
	for j in range(0, n, 2):
		for i in range(0, n, 2):
			if _inner(Vector2(_gx(i), _gz(j))) > 0.0:
				vals.append(_T[j * n + i])
	vals.sort()
	var cuts := []
	for k in 3:
		cuts.append(vals[clampi(int((1.0 - cfg.level_shares[k]) * vals.size()), 0, vals.size() - 1)])
	var min_cells := int(cfg.min_plateau_km2 * 1e6 / (gc * gc))
	var none := PackedFloat32Array()
	none.resize(nn)
	none.fill(1.0)
	var raw: Array = [PackedFloat32Array()]
	for k in 3:
		var mask := PackedByteArray()
		mask.resize(nn)
		for q in nn:
			mask[q] = 1 if _T[q] >= cuts[k] else 0
		BaseGen._cleanup(mask, n, min_cells, none)
		raw.append(_sdf(mask))
	# ledges: a ledge of level 1 thinner than ledge_min round level 2 is closed (one wall from the ground to level 2); level 3
	# always keeps a ledge of top_ledge on level 2; the levels stay nested
	var d1: PackedFloat32Array = raw[1]
	var d2: PackedFloat32Array = raw[2]
	var d3: PackedFloat32Array = raw[3]
	var lm: float = cfg.ledge_min
	# (all or nothing: two edges are either one (a single taller wall) or at least ledge_min apart - never a sliver of ledge)
	for q in nn:
		if d1[q] - d2[q] < lm:
			d2[q] = d1[q]
		d2[q] = minf(d2[q], d1[q])
		d3[q] = minf(d3[q], d2[q] - cfg.top_ledge)
	_d = [PackedFloat32Array(), d1, d2, d3]
	# pieces each level (on the final edges), the small ones dropped
	_lab = [PackedInt32Array()]
	_comps = [[]]
	for k in range(1, 4):
		var dk: PackedFloat32Array = _d[k]
		var mask := PackedByteArray()
		mask.resize(nn)
		for q in nn:
			mask[q] = 1 if dk[q] >= 0.0 else 0
		var lb: Dictionary = BaseGen._label(mask, n)
		var labels: PackedInt32Array = lb.labels
		var keep := []
		var small := {}
		for r in lb.regions:
			if int(r.cells) < min_cells:
				small[int(r.id)] = true
			else:
				keep.append(r)
		if not small.is_empty():
			for q in nn:
				if labels[q] > 0 and small.has(labels[q]):
					dk[q] = minf(dk[q], -gc)
					labels[q] = 0
		_lab.append(labels)
		_comps.append(keep)
	level = PackedByteArray()
	level.resize(nn)
	for q in nn:
		level[q] = (1 if d1[q] >= 0.0 else 0) + (1 if d2[q] >= 0.0 else 0) + (1 if d3[q] >= 0.0 else 0)
	var shares := []
	var inside := 0
	var counts := [0, 0, 0, 0]
	for j in n:
		for i in n:
			if _inner(Vector2(_gx(i), _gz(j))) > 0.0:
				inside += 1
				counts[level[j * n + i]] += 1
	for k in 4:
		shares.append(snappedf(float(counts[k]) / maxi(inside, 1), 0.01))
	report.level_shares_floor_1_2_3 = shares
	report.plateaus_per_level = [(_comps[1] as Array).size(), (_comps[2] as Array).size(), (_comps[3] as Array).size()]


# ---- 4. the plateau tops and the heights ---------------------------------------------------------------------------------

func _tops() -> void:
	var nn := n * n
	# the region's floor under every cell (the island's ground flattened towards the region's middle height), and from it the
	# plateaus' base heights
	var hs0 := PackedFloat32Array()
	for j in range(0, n, 4):
		for i in range(0, n, 4):
			if _inner(Vector2(_gx(i), _gz(j))) > 0.0:
				hs0.append(_base_h(_gx(i), _gz(j)))
	hs0.sort()
	_h0 = hs0[hs0.size() / 2]
	report.floor_height = snappedf(_h0, 1.0)
	_base = PackedFloat32Array()
	_base.resize(nn)
	for j in n:
		for i in n:
			var p := Vector2(_gx(i), _gz(j))
			_base[j * n + i] = _floor(p, _base_h(p.x, p.y), _carve[j * n + i])
	# each level-1 plateau's base height: the ground under it, 70th percentile (so most of its walls are near full height)
	var lab1: PackedInt32Array = _lab[1]
	var hs := {}
	for q in range(0, nn, 3):
		var l := lab1[q]
		if l > 0:
			if not hs.has(l):
				hs[l] = PackedFloat32Array()
			var arr: PackedFloat32Array = hs[l]
			arr.append(_base[q])
			hs[l] = arr
	_ref = {}
	for l in hs:
		var arr: PackedFloat32Array = hs[l]
		arr.sort()
		_ref[l] = arr[int(arr.size() * 0.7)]
	var nh: FastNoiseLite = _n.hill
	var amp: float = cfg.top_hill_amp
	_top = [PackedFloat32Array()]
	for k in range(1, 4):
		var t := PackedFloat32Array()
		t.resize(nn)
		t.fill(NAN)
		var labk: PackedInt32Array = _lab[k]
		var dk: PackedFloat32Array = _d[k]
		for q in nn:
			if labk[q] == 0 or dk[q] < -gc * 3.0:
				continue
			var l1 := lab1[q]
			if l1 == 0:
				continue
			var jit: float = cfg.level_jitter * (2.0 * _hash01(seed_value, k, labk[q]) - 1.0)
			t[q] = float(_ref[l1]) + cfg.level_heights[k - 1] + jit + amp * nh.get_noise_2d(_gx(q % n), _gz(q / n))
		# carried a few cells past the edge (for smooth reads right at it)
		for it in 5:
			var t2 := t.duplicate()
			for j in n:
				for i in n:
					var q := j * n + i
					if not is_nan(t[q]):
						continue
					var s := 0.0
					var c := 0
					for o in [q - 1, q + 1, q - n, q + n]:
						var oq: int = o
						if oq >= 0 and oq < nn and not is_nan(t[oq]):
							s += t[oq]
							c += 1
					if c > 0:
						t2[q] = s / c
			t = t2
		for q in nn:
			if is_nan(t[q]):
				t[q] = -BIG
		_top.append(t)
	report.plateau_base_heights = _ref.values().map(func(v): return snappedf(v, 1.0))


## the region's floor at a point, from the island's ground there: pulled towards the middle height inside, back to the ground
## itself at the region's edge; valley and canyon floors a little lower
func _floor(p: Vector2, ground: float, carve: float) -> float:
	var w := smoothstep(0.0, cfg.border * 1.2, _edge(p))
	var flat: float = _h0 + (ground - _h0) * (1.0 - cfg.floor_flatten) - cfg.floor_drop * carve
	return lerpf(ground, flat, w)


func _heights() -> void:
	var parts := _bands(_heights_rows, fn)
	fh = PackedFloat32Array()
	for p in parts:
		fh.append_array(p)


func _heights_rows(j0: int, j1: int) -> PackedFloat32Array:
	var out := PackedFloat32Array()
	out.resize((j1 - j0) * fn)
	var d1: PackedFloat32Array = _d[1]
	var d2: PackedFloat32Array = _d[2]
	var d3: PackedFloat32Array = _d[3]
	var t1: PackedFloat32Array = _top[1]
	var t2: PackedFloat32Array = _top[2]
	var t3: PackedFloat32Array = _top[3]
	var sp: float = gen.sp
	var o := 0
	for j in range(j0, j1):
		var z: float = gen.origin + (fz0 + j) * sp
		for i in fn:
			var x: float = gen.origin + (fx0 + i) * sp
			var p := Vector2(x, z)
			var h: float = _floor(p, gen._px(fx0 + i, fz0 + j), _gbil(_carve, p))
			if _gbil(d3, p) >= 0.0:
				h = _gbil(t3, p)
			elif _gbil(d2, p) >= 0.0:
				h = _gbil(t2, p)
			elif _gbil(d1, p) >= 0.0:
				h = _gbil(t1, p)
			out[o] = h
			o += 1
	return out


# ---- 5. ramps up the plateaus --------------------------------------------------------------------------------------------

## the contour loops of a level's edge (marching squares on its distance field), as map-point polylines
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


## outward unit normal of a level's edge at a map point (down its distance field)
func _out_normal(dk: PackedFloat32Array, p: Vector2) -> Vector2:
	var g := Vector2(_gbil(dk, p + Vector2(gc, 0.0)) - _gbil(dk, p - Vector2(gc, 0.0)), _gbil(dk, p + Vector2(0.0, gc)) - _gbil(dk, p - Vector2(0.0, gc)))
	return -g.normalized() if g.length() > 1e-6 else Vector2(1.0, 0.0)


func _in_view(p: Vector2) -> bool:
	for name in bookmarks:
		var b: Dictionary = bookmarks[name]
		var pos: Vector3 = b.pos
		var look: Vector3 = b.look
		var c := Vector2(pos.x, pos.z)
		var f := Vector2(look.x - pos.x, look.z - pos.z).normalized()
		var r := p - c
		if r.length() < 3200.0 and r.normalized().dot(f) > cos(deg_to_rad(42.0)):
			return true
	return false


## the shortest distance between two segments
static func _seg_dist(a: Vector2, b: Vector2, c: Vector2, d: Vector2) -> float:
	var ab := b - a
	var cd := d - c
	var den := ab.cross(cd)
	if absf(den) > 1e-6:
		var t := (c - a).cross(cd) / den
		var u := (c - a).cross(ab) / den
		if t >= 0.0 and t <= 1.0 and u >= 0.0 and u <= 1.0:
			return 0.0
	var m := minf(_pt_seg(a, c, d), _pt_seg(b, c, d))
	return minf(m, minf(_pt_seg(c, a, b), _pt_seg(d, a, b)))


static func _pt_seg(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var t := clampf((p - a).dot(ab) / maxf(ab.length_squared(), 1e-6), 0.0, 1.0)
	return p.distance_to(a + ab * t)


func _lvl(p: Vector2) -> int:
	var c := _gcell(p)
	return level[c.y * n + c.x]


func _ramps() -> void:
	ramps = []
	_path_map = PackedByteArray()
	_path_map.resize(n * n)
	var tan_r := tan(deg_to_rad(cfg.ramp_angle))
	var hwid: float = cfg.ramp_width * 0.5
	var footprints := []
	var lower := []
	var why := {}
	_why = why
	# level by level: what a walker reaches from the floor so far (with the ramps placed so far), and ramps only where they land
	# on reached ground
	for k in range(1, 4):
		_holes()
		var wc := _walk_cells()
		var walk: PackedByteArray = wc[0]
		var cn: int = wc[1]
		var seen := _flood_floor(walk, cn)
		var dk: PackedFloat32Array = _d[k]
		var labk: PackedInt32Array = _lab[k]
		var cands := {}
		footprints = []
		for lp in _contours(dk):
			for p in _resample(lp, 24.0, true):
				var nrm := _out_normal(dk, p)
				var inside := _gcell(p - nrm * 24.0)
				var comp := labk[inside.y * n + inside.x]
				if comp == 0:
					continue
				var wk := "%d:%d" % [k, comp]
				if not why.has(wk):
					why[wk] = {"behind": 0, "drop": 0, "edge": 0, "landing": 0, "side": 0, "long": 0, "unreached": 0, "ok": 0, "failed": 0}
				var wd: Dictionary = why[wk]
				# the plateau goes on at least 60 m behind the ramp's top
				if _lvl(p - nrm * 60.0) < k or _lvl(p - nrm * 30.0) < k:
					wd.behind += 1
					continue
				# the spur: from the top down at ramp_angle until it lands on flat ground below - burying any narrower ledge on
				# the way, never running into another plateau - with room beside it all the way
				# (its crest starts at the highest of the plateau across its width, so it meets the top with no step)
				var top := height_at(p - nrm * 20.0)
				var tsv := Vector2(-nrm.y, nrm.x)
				for lo2 in [-hwid, -hwid * 0.5, hwid * 0.5, hwid]:
					top = maxf(top, height_at(p - nrm * 20.0 + tsv * lo2))
				top += 0.5
				if top - height_at(p + nrm * 40.0) < 40.0:
					wd.drop += 1
					continue
				var ok := true
				var reason := "long"
				var L := -1.0
				var t := 16.0
				while t <= 900.0:
					var q := p + nrm * t
					var crest := top - t * tan_r
					if _edge(q) < 24.0:
						ok = false
						reason = "edge"
						break
					var g := height_at(q)
					if g >= crest - 1.0:
						var slope := Vector2(height_at(q + Vector2(8.0, 0.0)) - height_at(q - Vector2(8.0, 0.0)), height_at(q + Vector2(0.0, 8.0)) - height_at(q - Vector2(0.0, 8.0))).length() / 16.0
						if _lvl(q) >= k or slope > 0.5 or absf(height_at(q + nrm * 20.0) - g) > 8.0 or absf(height_at(q + nrm * 40.0) - g) > 14.0:
							ok = false
							reason = "landing"
						elif not _reached(seen, cn, q + nrm * 12.0):
							ok = false
							reason = "unreached"
						L = t
						break
					for sd in [-1.0, 1.0]:
						var qs: Vector2 = q + Vector2(-nrm.y, nrm.x) * sd * (hwid + 10.0)
						if height_at(qs) > crest + 4.0:
							ok = false
							reason = "side"
					if not ok:
						break
					t += 8.0
				if not ok or L < 0.0:
					wd[reason] = int(wd[reason]) + 1
					continue
				wd.ok += 1
				var score := -L - (2000.0 if _in_view(p) else 0.0)
				if not cands.has(comp):
					cands[comp] = []
				(cands[comp] as Array).append({"p": p, "n": nrm, "top": top, "low": height_at(p + nrm * L), "L": L, "score": score})
		var placed := []
		for comp in cands:
			var cl: Array = cands[comp]
			var picks := []
			var spacing := 250.0
			while picks.size() < cfg.ramps_per_plateau:
				var best = null
				var bd := -INF
				for c in cl:
					var md := INF
					for pk in picks:
						md = minf(md, (c.p as Vector2).distance_to(pk.p))
					if md < spacing:
						continue
					# no two spurs of this level side by side (each a capsule along its crest), nor over a lower level's spur
					var ca: Vector2 = c.p
					var cb: Vector2 = (c.p as Vector2) + (c.n as Vector2) * float(c.L)
					var clash := false
					for fp in footprints + lower:
						if _seg_dist(ca, cb, fp[0], fp[1]) < 2.0 * hwid + 30.0:
							clash = true
							break
					if clash:
						continue
					var val: float = (minf(md, 1500.0) if picks.size() > 0 else 0.0) + float(c.score) * 0.3
					if val > bd:
						bd = val
						best = c
				if best == null:
					# (a small plateau: a second ramp closer to the first rather than none)
					if spacing > 130.0 and not picks.is_empty():
						spacing = 120.0
						continue
					break
				# laid, then walked along its crest and onto the plateau: kept only if all of that is walkable
				var r := {"level": k, "plateau": comp, "at": best.p, "dir": best.n, "top": best.top, "low": best.low, "length": best.L}
				var undo := _apply_ramp(r, tan_r, hwid)
				if not _spur_ok(r):
					for ui in range(undo.size() / 2 - 1, -1, -1):
						fh[int(undo[ui * 2])] = undo[ui * 2 + 1]
					cl.erase(best)
					why["%d:%d" % [k, comp]]["failed"] = int(why["%d:%d" % [k, comp]].get("failed", 0)) + 1
					continue
				picks.append(best)
				footprints.append([best.p, (best.p as Vector2) + (best.n as Vector2) * float(best.L)])
				ramps.append(r)
				placed.append(r)
		# (lower levels' spurs stay in the heights the next level's candidates are judged on, and no later spur crosses them)
		for r in placed:
			lower.append([r.at, (r.at as Vector2) + (r.dir as Vector2) * float(r.length)])
	var per := {}
	for r in ramps:
		var key := "%d:%d" % [r.level, r.plateau]
		per[key] = int(per.get(key, 0)) + 1
	var short := []
	for k in range(1, 4):
		for c in _comps[k]:
			var got := int(per.get("%d:%d" % [k, c.id], 0))
			if got < cfg.ramps_per_plateau:
				short.append("level %d plateau %d (%.2f km2): %d  candidates %s" % [k, c.id, int(c.cells) * gc * gc / 1e6, got, str(why.get("%d:%d" % [k, c.id], {}))])
	report.ramps = ramps.size()
	report.plateaus_short_of_ramps = short


## a spur into the heights: a wedge of rock leaning on the wall, its crest (ramp_width wide, level across) climbing at
## ramp_angle to the plateau's top; its sides are sheer (side walls, built with the walls)
func _apply_ramp(r: Dictionary, tan_r: float, hwid: float) -> PackedFloat32Array:
	var undo := PackedFloat32Array()
	var p0: Vector2 = r.at
	var nrm: Vector2 = r.dir
	var side := Vector2(-nrm.y, nrm.x)
	var top: float = r.top
	var L: float = r.length
	var lo := Vector2(INF, INF)
	var hi := Vector2(-INF, -INF)
	for corner in [Vector2(-30.0, -hwid), Vector2(-30.0, hwid), Vector2(L + 8.0, -hwid), Vector2(L + 8.0, hwid)]:
		var cw: Vector2 = p0 + nrm * corner.x + side * corner.y
		lo = Vector2(minf(lo.x, cw.x), minf(lo.y, cw.y))
		hi = Vector2(maxf(hi.x, cw.x), maxf(hi.y, cw.y))
	var i0 := maxi(int((lo.x - gen.origin) / gen.sp) - fx0, 0)
	var i1 := mini(int((hi.x - gen.origin) / gen.sp) - fx0 + 1, fn - 1)
	var j0 := maxi(int((lo.y - gen.origin) / gen.sp) - fz0, 0)
	var j1 := mini(int((hi.y - gen.origin) / gen.sp) - fz0 + 1, fn - 1)
	for j in range(j0, j1 + 1):
		var z: float = gen.origin + (fz0 + j) * gen.sp
		for i in range(i0, i1 + 1):
			var x: float = gen.origin + (fx0 + i) * gen.sp
			var rel := Vector2(x, z) - p0
			var along := rel.dot(nrm)
			if along < -30.0 or along > L + 8.0 or absf(rel.dot(side)) > hwid:
				continue
			var crest := top - maxf(along, 0.0) * tan_r
			var q := j * fn + i
			if crest > fh[q]:
				undo.append(q)
				undo.append(fh[q])
				fh[q] = crest
			var gcl := _gcell(Vector2(x, z))
			_path_map[gcl.y * n + gcl.x] = 1
	return undo


## a spur walked: along its crest's middle from its foot up and 16 m on in onto the plateau - each 2 m step, and the crest 6 m to
## either side, under 33 degrees
func _spur_ok(r: Dictionary) -> bool:
	var p0: Vector2 = r.at
	var nrm: Vector2 = r.dir
	var sv := Vector2(-nrm.y, nrm.x)
	var lim := tan(deg_to_rad(33.0))
	var prev := INF
	var a: float = float(r.length) - 4.0
	while a >= -16.0:
		var q := p0 + nrm * a
		var h := height_at(q)
		if prev != INF and absf(h - prev) > lim * 2.0 + 0.3:
			return false
		for sd in [-6.0, 6.0]:
			if absf(height_at(q + sv * sd) - h) > lim * 6.0:
				return false
		prev = h
		a -= 2.0
	return true


## walkable 8 m cells over the patch: no slope over 35 degrees between their 4 m samples, no hole among them
func _walk_cells() -> Array:
	var lim: float = tan(deg_to_rad(35.0)) * gen.sp
	var cn := fn / 2
	var walk := PackedByteArray()
	walk.resize(cn * cn)
	for j in cn:
		for i in cn:
			var ok := true
			var q0 := (2 * j) * fn + 2 * i
			if fhole[q0] == 1 or fhole[q0 + 1] == 1 or fhole[q0 + fn] == 1 or fhole[q0 + fn + 1] == 1:
				ok = false
			if ok:
				var a := fh[q0]
				if absf(fh[q0 + 1] - a) > lim or absf(fh[q0 + fn] - a) > lim or absf(fh[q0 + fn + 1] - fh[q0 + 1]) > lim:
					ok = false
				if i < cn - 1 and absf(fh[q0 + 2] - fh[q0 + 1]) > lim:
					ok = false
				if j < cn - 1 and absf(fh[q0 + 2 * fn] - fh[q0 + fn]) > lim:
					ok = false
			walk[j * cn + i] = 1 if ok else 0
	return [walk, cn]


## from all the floor (the island's own ground, reachable by its own routes) over walkable cells
func _flood_floor(walk: PackedByteArray, cn: int) -> PackedByteArray:
	var starts := PackedInt32Array()
	for j in cn:
		for i in cn:
			var q := j * cn + i
			if walk[q] == 1 and _lvl(_cell_pos(i, j)) == 0:
				starts.append(q)
	return BaseGen._flood(walk, cn, starts, 1)


func _cell_pos(i: int, j: int) -> Vector2:
	return Vector2(gen.origin + (fx0 + 2 * i) * gen.sp, gen.origin + (fz0 + 2 * j) * gen.sp)


func _reached(seen: PackedByteArray, cn: int, p: Vector2) -> bool:
	var ci := int(round(((p.x - gen.origin) / gen.sp - fx0) / 2.0))
	var cj := int(round(((p.y - gen.origin) / gen.sp - fz0) / 2.0))
	for dj in range(-2, 3):
		for di in range(-2, 3):
			var i := ci + di
			var j := cj + dj
			if i >= 0 and j >= 0 and i < cn and j < cn and seen[j * cn + i] == 1:
				return true
	return false


# ---- 6. holes under the walls --------------------------------------------------------------------------------------------

func _holes() -> void:
	fhole = PackedByteArray()
	fhole.resize(fn * fn)
	var count := 0
	for j in fn:
		for i in fn:
			var q := j * fn + i
			var h := fh[q]
			for dj in range(-1, 2):
				var nj := j + dj
				if nj < 0 or nj >= fn:
					continue
				for di in range(-1, 2):
					var ni := i + di
					if ni < 0 or ni >= fn or (di == 0 and dj == 0):
						continue
					if absf(fh[nj * fn + ni] - h) > HOLE_STEP:
						fhole[q] = 1
						break
				if fhole[q] == 1:
					break
			count += fhole[q]
	report.hole_samples = count


# ---- 7. the walls --------------------------------------------------------------------------------------------------------

func _walls() -> void:
	walls = []
	var covered := []
	var band := PackedFloat32Array()
	band.resize(fn * fn)
	var bandset := PackedByteArray()
	bandset.resize(fn * fn)
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
				var p := line[c]
				var nrm := _out_normal(dk, p)
				# where the level above's edge is within LEDGE_CLOSE of this one, this wall reaches up into that level (its top edge
				# past the narrow ledge, which it buries) and that level's own wall is left out here
				var inset: float = cfg.wall_rim_inset
				var kt: int = k
				while kt < 3:
					var dn := _gbil(_d[kt + 1], p)
					if dn > -LEDGE_CLOSE:
						inset = cfg.wall_rim_inset + maxf(-dn, 0.0)
						kt += 1
					else:
						break
				var top := height_at(p - nrm * inset)
				var foot := height_at(p + nrm * cfg.wall_foot_outset)
				var fc := _gcell(p + nrm * cfg.wall_foot_outset)
				var on_spur := _path_map[fc.y * n + fc.x] == 1
				var amp := 0.3 if on_spur else 1.0
				all.append({"p": p, "n": nrm, "top": top, "foot": foot, "s": c * cfg.wall_column + loop_id * 10007.0, "inset": inset, "amp": amp})
				var coincide := k > 1 and _gbil(dlow, p) < LEDGE_CLOSE
				# (no wall across a spur's root: its crest meets the top there)
				var root := on_spur and top - foot < 30.0
				flag[c] = 1 if (top - foot >= cfg.wall_min_height and not coincide and not root) else 0
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
					var oc := posmod(c + o, m)
					if flag[oc] == 1:
						tops.append(float(all[oc].top))
						feet.append(float(all[oc].foot))
				tops.sort()
				feet.sort()
				var col: Dictionary = (all[c] as Dictionary).duplicate()
				col.top = tops[tops.size() / 2]
				col.foot = feet[feet.size() / 2]
				cols.append(col)
				covered.append([col.p, col.n, col.inset, float(col.top) - float(col.foot)])
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
	# each spur's two sheer sides: from its crest's edge down to the ground beside it (their tops flush with the crest)
	var tan_r := tan(deg_to_rad(cfg.ramp_angle))
	var hwid: float = cfg.ramp_width * 0.5
	for r in ramps:
		var p0: Vector2 = r.at
		var nrm: Vector2 = r.dir
		var sv := Vector2(-nrm.y, nrm.x)
		for sd in [-1.0, 1.0]:
			loop_id += 1
			var n_out: Vector2 = sv * sd
			var run := []
			var a := 0.0
			while a <= float(r.length) + 8.0:
				var col := {}
				var p: Vector2 = p0 + nrm * a + n_out * hwid
				var crest: float = float(r.top) - a * tan_r
				var foot := height_at(p + n_out * cfg.wall_foot_outset)
				if crest - foot >= cfg.wall_min_height:
					col = {"p": p, "n": n_out, "top": crest, "foot": foot, "s": a + loop_id * 10007.0, "inset": 7.0,
						"amp": clampf((crest - foot) / 200.0, 0.15, 0.5), "lip": 0.05}
				if col.is_empty():
					if run.size() >= 3:
						for piece in _chunks(run, 48):
							var mesh := _wall_mesh(piece)
							walls.append(mesh)
							verts += (mesh.verts as PackedVector3Array).size()
							tris += (mesh.indices as PackedInt32Array).size() / 3
						for cc in run:
							covered.append([cc.p, cc.n, cc.inset])
					run = []
				else:
					run.append(col)
				a += 8.0
			if run.size() >= 3:
				for piece in _chunks(run, 48):
					var mesh := _wall_mesh(piece)
					walls.append(mesh)
					verts += (mesh.verts as PackedVector3Array).size()
					tris += (mesh.indices as PackedInt32Array).size() / 3
				for cc in run:
					covered.append([cc.p, cc.n, cc.inset])
	# under every wall column the terrain is shaped to stay behind its face: from the wall's top edge down to its foot along a
	# curve that drops steeply first (the face goes out from the top edge in a straight slant, plus its bulges)
	if not cfg.cut_holes:
		for cv in covered:
			var cp: Vector2 = cv[0]
			var cnv: Vector2 = cv[1]
			var ins: float = cv[2]
			var ctv := Vector2(-cnv.y, cnv.x)
			var tp: float = height_at(cp - cnv * ins)
			var ft: float = height_at(cp + cnv * cfg.wall_foot_outset)
			var span: float = ins + cfg.wall_foot_outset
			var x := -ins
			while x <= cfg.wall_foot_outset:
				var hh: float = tp - (tp - ft) * sqrt((x + ins) / span)
				var tt: float = -cfg.wall_column * 0.5 - 1.0
				while tt <= cfg.wall_column * 0.5 + 1.0:
					var q: Vector2 = cp + cnv * x + ctv * tt
					var i := int(round((q.x - gen.origin) / gen.sp)) - fx0
					var j := int(round((q.y - gen.origin) / gen.sp)) - fz0
					if i >= 0 and j >= 0 and i < fn and j < fn:
						band[j * fn + i] = hh
						bandset[j * fn + i] = 1
					tt += 2.0
				x += 2.0
		for q in fn * fn:
			if bandset[q] == 1:
				fh[q] = band[q]
		fhole.fill(0)
	# holes only where a wall covers them (else the terrain stays, steep, rather than showing a gap)
	var cov := PackedByteArray()
	cov.resize(fn * fn)
	var hw: float = cfg.wall_column * 0.5 + 1.0
	for cv in covered:
		var cp: Vector2 = cv[0]
		var cn: Vector2 = cv[1]
		var ct := Vector2(-cn.y, cn.x)
		var o: float = -float(cv[2]) - 1.0
		while o <= cfg.wall_foot_outset + 1.0:
			var t := -hw
			while t <= hw:
				var q: Vector2 = cp + cn * o + ct * t
				var i := int(round((q.x - gen.origin) / gen.sp)) - fx0
				var j := int(round((q.y - gen.origin) / gen.sp)) - fz0
				if i >= 0 and j >= 0 and i < fn and j < fn:
					cov[j * fn + i] = 1
				t += 2.0
			o += 2.0
	var uncovered := 0
	dbg_uncovered = PackedByteArray()
	dbg_uncovered.resize(fn * fn)
	for q in fn * fn:
		if fhole[q] == 1 and cov[q] == 0:
			fhole[q] = 0
			dbg_uncovered[q] = 1
			uncovered += 1
	report.holes_left_without_wall_filled = uncovered
	var dump := []
	var stepq := 97
	for q in range(0, fn * fn, stepq):
		if dbg_uncovered[q] == 0 or dump.size() >= 25:
			continue
		var i := q % fn
		var j := q / fn
		var p := Vector2(gen.origin + (fx0 + i) * gen.sp, gen.origin + (fz0 + j) * gen.sp)
		var mx := 0.0
		for o in [q - 1, q + 1, q - fn, q + fn]:
			var oq: int = o
			if oq >= 0 and oq < fn * fn:
				mx = maxf(mx, absf(fh[oq] - fh[q]))
		var rd := INF
		for r in ramps:
			rd = minf(rd, _pt_seg(p, r.at, (r.at as Vector2) + (r.dir as Vector2) * float(r.length)))
		dump.append("lvl%d d1 %.0f d2 %.0f d3 %.0f h %.0f step %.0f ramp %.0f" % [level[_gcell(p).y * n + _gcell(p).x], _gbil(_d[1], p), _gbil(_d[2], p), _gbil(_d[3], p), fh[q], mx, rd])
	report.dbg_uncovered = dump
	# how tall the edges' walls are (their columns, the spurs' sides left out)
	var hts := PackedFloat32Array()
	for cv in covered:
		if cv.size() > 3:
			hts.append(cv[3])
	hts.sort()
	if not hts.is_empty():
		var over := 0
		var under := 0
		for hv in hts:
			over += 1 if hv > 300.0 else 0
			under += 1 if hv < 80.0 else 0
		report.wall_heights = "median %.0f m, 10%% under %.0f m, 90%% under %.0f m, tallest %.0f m; %.0f%% under 80 m, %.0f%% over 300 m" % [hts[hts.size() / 2],
			hts[hts.size() / 10], hts[hts.size() * 9 / 10], hts[hts.size() - 1], 100.0 * under / hts.size(), 100.0 * over / hts.size()]
	report.wall_km = snappedf(total_len / 1000.0, 0.1)
	report.wall_pieces = walls.size()
	report.wall_vertices = verts
	report.wall_triangles = tris


static func _chunks(run: Array, size: int) -> Array:
	var out := []
	var k := 0
	while k < run.size() - 1:
		out.append(run.slice(k, mini(k + size + 1, run.size())))
		k += size
	return out


## one wall piece: columns down the face from just inside the top to just past the foot, pushed out by the wall's shapes
func _wall_mesh(cols: Array) -> Dictionary:
	var nw: FastNoiseLite = _n.wall
	var nc: FastNoiseLite = _n.curve
	var foot_out: float = cfg.wall_foot_outset
	var hmax := 0.0
	for c in cols:
		hmax = maxf(hmax, float(c.top) - float(c.foot))
	var rows := clampi(int(ceil((hmax + 4.4) / cfg.wall_row)), 4, 60)
	var m := cols.size()
	var pos := PackedVector3Array()
	pos.resize(m * (rows + 1))
	var outs := PackedVector2Array()
	outs.resize(m)
	var bsp: float = cfg.buttress_spacing
	var bw: float = cfg.buttress_width / bsp
	for c in m:
		var col: Dictionary = cols[c]
		var p: Vector2 = col.p
		var nrm: Vector2 = col.n
		outs[c] = nrm
		var s: float = col.s
		var rim: float = col.get("inset", cfg.wall_rim_inset)
		var amp_c: float = col.get("amp", 1.0)
		var y0: float = float(col.top) + float(col.get("lip", 0.4))
		var y1: float = float(col.foot) - 4.0
		# along the wall: slow curvature, buttresses (some missing, each its own size), vertical grooves
		var curve: float = cfg.wall_curve_amp * (0.5 + 0.5 * nc.get_noise_1d(s))
		var bp := s / bsp + 0.35 * nw.get_noise_1d(s * 0.004 + 11.0)
		var bi := int(floor(bp))
		var ph := bp - bi
		var bamp := _hash01(seed_value, bi, 3)
		bamp = 0.0 if bamp < 0.3 else bamp
		var bump := smoothstep(0.5 - bw, 0.5, ph) * (1.0 - smoothstep(0.5, 0.5 + bw, ph)) * bamp
		var groove: float = cfg.groove_depth * (0.5 + 0.5 * sin(TAU * s / cfg.groove_wavelength + 2.5 * nw.get_noise_1d(s * 0.02 + 70.0)))
		for r in rows + 1:
			var f := float(r) / rows
			var y := lerpf(y0, y1, f)
			# rock layers: the face steps in and out a little at each layer line
			var yy := y + 7.0 * nw.get_noise_1d(s * 0.003 + 130.0)
			var lk := int(floor(yy / cfg.setback_spacing))
			var lf: float = yy / cfg.setback_spacing - lk
			var setback: float = cfg.setback_depth * lerpf(_hash01(seed_value, lk - 1, 9), _hash01(seed_value, lk, 9), smoothstep(0.0, 0.14, lf))
			var dsp: float = curve + cfg.buttress_depth * bump * (0.35 + 0.65 * f) + groove * (0.75 + 0.25 * nw.get_noise_1d(y * 0.05 + s * 0.001)) + setback
			var taper := smoothstep(0.0, 0.07, f) * (1.0 - smoothstep(0.93, 1.0, f))
			var off := -rim + (rim + foot_out) * f + dsp * taper * amp_c
			var q := p + nrm * off
			pos[c * (rows + 1) + r] = Vector3(q.x - center.x, y, q.y - center.y)
	# normals from the neighbouring vertices (outward)
	var nor := PackedVector3Array()
	nor.resize(pos.size())
	for c in m:
		for r in rows + 1:
			var a := pos[mini(c + 1, m - 1) * (rows + 1) + r] - pos[maxi(c - 1, 0) * (rows + 1) + r]
			var b := pos[c * (rows + 1) + mini(r + 1, rows)] - pos[c * (rows + 1) + maxi(r - 1, 0)]
			var nv := b.cross(a).normalized()
			if nv.dot(Vector3(outs[c].x, 0.0, outs[c].y)) < 0.0:
				nv = -nv
			nor[c * (rows + 1) + r] = nv
	var idx := PackedInt32Array()
	for c in m - 1:
		for r in rows:
			var a := c * (rows + 1) + r
			var b := (c + 1) * (rows + 1) + r
			idx.append_array(PackedInt32Array([a, b, a + 1, b, b + 1, a + 1]))
	return {"verts": pos, "normals": nor, "indices": idx}


# ---- 8. the walk check and the bookmarks ---------------------------------------------------------------------------------

func _walk_check() -> void:
	var wc := _walk_cells()
	var walk: PackedByteArray = wc[0]
	var cn: int = wc[1]
	var seen := _flood_floor(walk, cn)
	# each ramp on its own: from its foot to its top, inside its own strip
	var working := 0
	for r in ramps:
		var foot: Vector2 = (r.at as Vector2) + (r.dir as Vector2) * (float(r.length) - 6.0)
		var top: Vector2 = (r.at as Vector2) - (r.dir as Vector2) * 16.0
		_last_reach = ""
		r.ok = _strip_walk(walk, cn, foot, top, (r.dir as Vector2))
		if not r.ok:
			r.reach = _last_reach
		working += 1 if r.ok else 0
	report.ramps_walkable = "%d of %d" % [working, ramps.size()]
	var out := []
	for k in range(1, 4):
		var labk: PackedInt32Array = _lab[k]
		var hit := {}
		for j in cn:
			for i in cn:
				if seen[j * cn + i] == 1:
					var c := _gcell(_cell_pos(i, j))
					if level[c.y * n + c.x] >= k:
						var l := labk[c.y * n + c.x]
						if l > 0:
							hit[l] = true
		var miss := []
		for c in _comps[k]:
			if not hit.has(int(c.id)):
				var nr := 0
				for r in ramps:
					if int(r.level) == k and int(r.plateau) == int(c.id):
						nr += 1
				miss.append("plateau %d (%.2f km2, %d ramps)" % [c.id, int(c.cells) * gc * gc / 1e6, nr])
		out.append("level %d: %d of %d plateaus reached on foot%s" % [k, hit.size(), (_comps[k] as Array).size(), (" - not: " + ", ".join(miss)) if not miss.is_empty() else ""])
	report.walkable = out


## a walk inside a spur's strip (its crest, 60 m wide round its middle) from foot to top over walkable 8 m cells
func _strip_walk(walk: PackedByteArray, cn: int, foot: Vector2, top: Vector2, dir: Vector2) -> bool:
	var to_c := func(p: Vector2) -> Vector2i:
		return Vector2i(clampi(int(round(((p.x - gen.origin) / gen.sp - fx0) / 2.0)), 0, cn - 1), clampi(int(round(((p.y - gen.origin) / gen.sp - fz0) / 2.0)), 0, cn - 1))
	var a: Vector2i = to_c.call(foot)
	var b: Vector2i = to_c.call(top)
	var side := Vector2(-dir.y, dir.x)
	var seen := {a: true}
	var queue := [a]
	var head := 0
	var best_up := 0.0
	while head < queue.size():
		var c: Vector2i = queue[head]
		head += 1
		if absi(c.x - b.x) <= 2 and absi(c.y - b.y) <= 2:
			return true
		best_up = maxf(best_up, (_cell_pos(c.x, c.y) - foot).dot(-dir))
		_last_reach = "%.0f of %.0f m (foot cell walkable %d)" % [best_up, foot.distance_to(top), walk[a.y * cn + a.x]]
		for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1), Vector2i(1, 1), Vector2i(-1, 1), Vector2i(1, -1), Vector2i(-1, -1)]:
			var nc: Vector2i = c + d
			if nc.x < 0 or nc.y < 0 or nc.x >= cn or nc.y >= cn or seen.has(nc) or walk[nc.y * cn + nc.x] == 0:
				continue
			var p := _cell_pos(nc.x, nc.y)
			var rel := p - foot
			if absf(rel.dot(side)) > 30.0 or rel.dot(-dir) < -40.0 or rel.dot(-dir) > foot.distance_to(top) + 60.0:
				continue
			seen[nc] = true
			queue.append(nc)
	return false


## whether a spot is clear of walls: no cut-away terrain (where walls stand) within r metres
func _clear(p: Vector2, r: float) -> bool:
	var ci := int(round((p.x - gen.origin) / gen.sp)) - fx0
	var cj := int(round((p.y - gen.origin) / gen.sp)) - fz0
	var ri := int(ceil(r / gen.sp))
	for dj in range(-ri, ri + 1, 2):
		for di in range(-ri, ri + 1, 2):
			var i := ci + di
			var j := cj + dj
			if i < 0 or j < 0 or i >= fn or j >= fn or fhole[j * fn + i] == 1:
				return false
	return true


func _bookmarks() -> void:
	bookmarks = {}
	var v0: float = report.valley_v
	# ref 1, stacked terraces: on the terraced side, a stretch of level 1 or 2's edge facing the valley with the level above set
	# back 80 - 320 m behind it and a big drop below; on that ledge, looking along it - the higher terraces on the right, the
	# drop on the left
	var best1 := {}
	var best_run := 0
	for k in [1, 2]:
		var dk: PackedFloat32Array = _d[k]
		var dup: PackedFloat32Array = _d[k + 1]
		for lp in _contours(dk):
			var line := _resample(lp, 24.0, true)
			var run := 0
			for c in line.size() * 2:
				var p := line[c % line.size()]
				var nrm := _out_normal(dk, p)
				var ledge := -_gbil(dup, p)
				var drop := height_at(p - nrm * 20.0) - height_at(p + nrm * 50.0)
				if _uv(p).y > v0 and nrm.dot(-axis_v) > 0.4 and ledge > 80.0 and ledge < 320.0 and drop > 110.0:
					run += 1
					if run > best_run and run >= 8:
						var q := line[(c - run + 2 + line.size() * 2) % line.size()]
						var e := line[c % line.size()]
						best_run = run
						best1 = {"start": q, "end": e, "ledge": ledge, "dk": k}
				else:
					run = 0
	if not best1.is_empty():
		# from one end of the stretch looking along it to the other: the higher terraces (inside) on the right
		var a: Vector2 = best1.start
		var e: Vector2 = best1.end
		var dk1: PackedFloat32Array = _d[int(best1.dk)]
		var t := (e - a).normalized()
		var nrm := _out_normal(dk1, a)
		if Vector2(-t.y, t.x).dot(-nrm) < 0.0:
			var sw := a
			a = e
			e = sw
			t = -t
			nrm = _out_normal(dk1, a)
		var cam := a - nrm * minf(float(best1.ledge) * 0.35, 50.0)
		for k2 in 6:
			if _clear(cam, 22.0):
				break
			cam += t * 30.0
		var ch := height_at(cam) + 5.0
		var ahead := e - _out_normal(dk1, e) * 60.0
		bookmarks.ref1 = {"pos": Vector3(cam.x, ch, cam.y), "look": Vector3(ahead.x, height_at(ahead) + 60.0, ahead.y), "fov": 64.0}
	# ref 2, across the valley: high over the block's edge facing the valley, looking down across the valley at the terraces'
	# walls on the far side
	var best2 := {}
	var b2 := -INF
	for k in [2, 1]:
		var dk: PackedFloat32Array = _d[k]
		for lp in _contours(dk):
			for p in _resample(lp, 40.0, true):
				var nrm := _out_normal(dk, p)
				if _uv(p).y > v0 or nrm.dot(axis_v) < 0.55 or _edge(p) < 700.0:
					continue
				var top := height_at(p - nrm * 20.0)
				var far := -1.0
				for sd in range(300, 2400, 50):
					var q := p + nrm * sd
					if _edge(q) < 100.0:
						break
					if _lvl(q) >= 1 and height_at(q) > top - 40.0:
						far = sd
						break
				if far < 0.0:
					continue
				var score := -absf(far - 1100.0) + nrm.dot(axis_v) * 300.0 + (200.0 if k == 2 else 0.0)
				if score > b2:
					b2 = score
					best2 = {"p": p, "n": nrm, "far": far, "top": top}
	if not best2.is_empty():
		var p: Vector2 = best2.p
		var nrm: Vector2 = best2.n
		var side := Vector2(-nrm.y, nrm.x)
		var cam := p - nrm * 170.0 + side * 150.0
		var tgt := p + nrm * (float(best2.far) + 150.0) - side * 120.0
		bookmarks.ref2 = {"pos": Vector3(cam.x, float(best2.top) + 230.0, cam.y), "look": Vector3(tgt.x, height_at(tgt) - 60.0, tgt.y), "fov": 64.0}
	# ref 3, down the long canyon: on the plateau beside it, near its rim, looking down the canyon
	for pth in paths.canyons:
		if not pth.get("long", false):
			continue
		var pp: PackedVector2Array = pth.points
		var ww: PackedFloat32Array = pth.width
		var best3 := {}
		var b3 := -INF
		for s3 in range(0, pp.size() - 70, 2):
			var fw := (pp[s3 + 6] - pp[s3]).normalized()
			var sv := Vector2(-fw.y, fw.x)
			for sd in [1.0, -1.0]:
				var cam: Vector2 = pp[s3] + sv * sd * (ww[s3] * 0.5 + 55.0)
				if _lvl(cam) < 1 or not _clear(cam, 20.0) or _edge(cam) < 300.0:
					continue
				# the canyon lined by plateau on both sides for the next 1.5 km
				var lined := 0
				for a2 in range(10, 61, 10):
					var q := pp[mini(s3 + a2, pp.size() - 1)]
					var ff := (pp[mini(s3 + a2 + 2, pp.size() - 1)] - q).normalized()
					var ss := Vector2(-ff.y, ff.x)
					var off := ww[mini(s3 + a2, pp.size() - 1)] * 0.5 + 80.0
					lined += (1 if _lvl(q + ss * off) >= 1 else 0) + (1 if _lvl(q - ss * off) >= 1 else 0)
				var score := lined * 100.0 + height_at(cam) * 0.2 - s3
				if score > b3:
					b3 = score
					best3 = {"cam": cam, "s": s3}
		if not best3.is_empty():
			var cam: Vector2 = best3.cam
			var tgt := pp[mini(int(best3.s) + 70, pp.size() - 1)]
			var ch := height_at(cam)
			bookmarks.ref3 = {"pos": Vector3(cam.x, ch + 4.0, cam.y), "look": Vector3(tgt.x, ch - 160.0, tgt.y), "fov": 64.0}
	# ref 4, the aerial view: high over the valley near one end, looking along and down it, the terraces on the right
	var vp: PackedVector2Array = (paths.valley[0] as Dictionary).points
	var a4 := Vector2.INF
	for s4 in vp.size():
		if _edge(vp[s4]) > 450.0:
			a4 = vp[s4]
			break
	if a4 != Vector2.INF:
		var cam := a4 - axis_v * 260.0
		var floor_h := height_at(a4)
		var tgt := a4 + axis_u * 1250.0 + axis_v * 380.0
		bookmarks.ref4 = {"pos": Vector3(cam.x, floor_h + 640.0, cam.y), "look": Vector3(tgt.x, height_at(tgt) + 40.0, tgt.y), "fov": 64.0}
	report.bookmarks = bookmarks.keys()


## the views framed by hand in the settings (they take precedence), on the finished ground: each camera over the highest ground
## within 20 m of its spot (never inside the rock under a wall's face)
func _framed_bookmarks() -> void:
	for name in cfg.bookmark_views:
		var v: PackedFloat32Array = cfg.bookmark_views[name]
		var cam := Vector2(v[0], v[1])
		var tgt := Vector2(v[3], v[4])
		var g := -INF
		for dz in range(-20, 21, 5):
			for dx in range(-20, 21, 5):
				g = maxf(g, height_at(cam + Vector2(dx, dz)))
		bookmarks[name] = {"pos": Vector3(cam.x, maxf(g, 0.0) + v[2], cam.y), "look": Vector3(tgt.x, maxf(height_at(tgt), 0.0) + v[5], tgt.y), "fov": v[6]}


func _free() -> void:
	_T = PackedFloat32Array()
	_d = []
	_lab = []
	_comps = []
	_top = []
	_base = PackedFloat32Array()
	_carve = PackedFloat32Array()


# ---- onto the island -----------------------------------------------------------------------------------------------------

## write the region into the island: its heights into the base terrain's region images (and the queries' views of them),
## the holes into Terrain3D control maps, and the planning grid's heights and slopes round it
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
	gen.region_controls.resize(per * per)
	for ri in touched:
		var img: Image = gen.region_heights[ri]
		if img == null:
			continue
		var rx: int = ri % per
		var rz: int = ri / per
		var data := img.get_data()
		var ctrl := PackedByteArray()
		ctrl.resize(rs * rs * 4)
		var holes := 0
		for ly in rs:
			var j: int = rz * rs + ly - fz0
			if j < 0 or j >= fn:
				continue
			for lx in rs:
				var i: int = rx * rs + lx - fx0
				if i < 0 or i >= fn:
					continue
				var q := j * fn + i
				data.encode_float((ly * rs + lx) * 4, fh[q])
				if fhole[q] == 1:
					ctrl.encode_u32((ly * rs + lx) * 4, 4)
					holes += 1
		img.set_data(rs, rs, false, Image.FORMAT_RF, data)
		gen._hreg[ri] = img.get_data()
		if holes > 0:
			gen.region_controls[ri] = Image.create_from_data(rs, rs, false, Image.FORMAT_RF, ctrl)
	# the planning grid under the region: mean of the solid samples, then its slopes
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
					if i >= 0 and j >= 0 and i < fn and j < fn and fhole[j * fn + i] == 0:
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


# ---- queries (local coordinates, like the island's) ----------------------------------------------------------------------

## the plateau level at a point (0 = the floor, 1 - 3; -1 outside the region)
func level_at(x: float, z: float) -> int:
	var p := Vector2(x + gen.offset.x, z + gen.offset.y)
	if level.is_empty() or _edge(p) < 0.0:
		return -1
	var c := _gcell(p)
	return level[c.y * n + c.x]


## whether the terrain is cut away (under a wall) at a point
func hole_at(x: float, z: float) -> bool:
	var i := int(round((x + gen.offset.x - gen.origin) / gen.sp)) - fx0
	var j := int(round((z + gen.offset.y - gen.origin) / gen.sp)) - fz0
	if fhole.is_empty() or i < 0 or j < 0 or i >= fn or j >= fn:
		return false
	return fhole[j * fn + i] == 1


# ---- the cache -----------------------------------------------------------------------------------------------------------

func save(path: String) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return
	f.store_var({"version": VERSION, "center": center, "axis_u": axis_u, "fx0": fx0, "fz0": fz0, "fn": fn, "n": n,
		"ramps": ramps, "bookmarks": bookmarks, "paths": paths, "report": report, "walls": walls})
	f.store_buffer(fh.to_byte_array())
	f.store_buffer(fhole)
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
	ramps = meta.ramps
	bookmarks = meta.bookmarks
	paths = meta.paths
	report = meta.report
	report.cached = true
	walls = meta.walls
	fh = f.get_buffer(fn * fn * 4).to_float32_array()
	fhole = f.get_buffer(fn * fn)
	level = f.get_buffer(n * n)
	f.close()
	if level.size() != n * n:
		return false
	ready = true
	return true
