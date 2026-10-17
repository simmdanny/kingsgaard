extends RefCounted
## THE CONTINENT'S TERRAIN (scripts/world/terrain_gen.gd): generates the heightmap of one large island with big height steps
## between regions, from a seed and the settings in terrain_config.gd - the same seed and settings give the same world.
##
## Planning grid (cres x cres cells, 10 m): the big decisions, on worker threads.
##   1. Region tiers: a very low-frequency, domain-warped field T (rising inland) is cut into five tiers - coast, lowlands,
##      highlands, plateaus, peaks - at levels found from the wanted land shares. One continuous field keeps them nested:
##      every higher tier sits inside the one below, so its edge always borders the tier below.
##   2. Tier edges: across each cut, the height steps from the lower tier's surface to the upper one's over a width taken in
##      metres from the distance to the cut (T's level over its gradient): narrow = a cliff (cliff_angle, most of every
##      edge), wide = a straight walkable ramp (ramp_angle) inside each pass zone. Passes: per region at least min_passes, one
##      per pass_spacing of edge, spread along it (farthest-point picks), kept away from where rivers cross.
##   3. Hills: rolling noise in every tier, amplitude by tier (ridged noise makes the peaks' crests); calmed on passes.
##   Water: river courses from sources high up flow down to the sea through the tiers in order (a cost-weighted flow field
##   that only ever steps down or level in tier, so it meanders and never climbs); each carves a channel whose floor only
##   descends (rivers as stairs: waterfalls where it crosses a cliff) inside a wider valley.
##   Passes are then relaxed to stay walkable, and the walk check runs: slope per cell, a walk from each pass's foot to its
##   top, and which regions the spawn can walk to.
## Full heightmap (res x res, vertex_spacing): the plan upsampled (cubic) plus 4. detail - small bumps and dips from two
## tiling noise tiles, amplitude by tier, quieter on passes. That is the heightmap Terrain3D draws and collides with.
## Also made: a colour map for Terrain3D (r = tier, g = river, b = pass), places worth showing (pois) and a report.
## Queries (height, slope, tier, cover, ...) read the arrays; they are safe from worker threads once `ready`.

const VERSION := 6
const SEA := 255
const DI4 := [1, -1, 0, 0]
const DJ4 := [0, 0, 1, -1]
const DI8 := [1, -1, 0, 0, 1, 1, -1, -1]
const DJ8 := [0, 0, 1, -1, 1, -1, 1, -1]

var cfg
var seed_value := 1
var res := 4096
var sp := 2.5
var cres := 1024
var cs := 10.0
var ratio := 4
var map_size := 10240.0
var world_half := 5120.0
var origin := -5120.0

var heights := PackedFloat32Array()
var c_coast := PackedFloat32Array()
var c_tier := PackedByteArray()
var c_h := PackedFloat32Array()
var c_river := PackedFloat32Array()
var c_pass := PackedFloat32Array()
var c_slope := PackedFloat32Array()
var height_img: Image
var color_img: Image
var cuts := PackedFloat32Array()
var passes: Array = []
var rivers: Array = []
var pois := {}
var report := {}
var ready := false
var stage := ""
var verbose := false

var _n := {}
var _T := PackedFloat32Array()
var _g := PackedFloat32Array()
var _surf: Array = []
var _hill := PackedFloat32Array()
var _ridge := PackedFloat32Array()
var _labels: Array = []
var _regions: Array = []
var _pass_k: Array = []
var _rampw_k: Array = []
var _damp := PackedFloat32Array()
var _t0 := 0


func _init(config) -> void:
	cfg = config
	seed_value = cfg.seed_value
	res = cfg.resolution
	sp = cfg.vertex_spacing
	cres = cfg.coarse_resolution
	ratio = res / cres
	cs = sp * ratio
	map_size = res * sp
	world_half = map_size * 0.5
	origin = -world_half
	var s: int = seed_value * 977
	_n.cwx = _mk(s + 1, 1.0 / (0.9 * world_half), 3)
	_n.cwz = _mk(s + 2, 1.0 / (0.9 * world_half), 3)
	_n.coast = _mk(s + 3, 1.0 / (0.45 * world_half), 4)
	_n.twx = _mk(s + 4, 1.0 / (0.7 * cfg.tier_wavelength), 2)
	_n.twz = _mk(s + 5, 1.0 / (0.7 * cfg.tier_wavelength), 2)
	_n.tier = _mk(s + 6, 1.0 / cfg.tier_wavelength, cfg.tier_octaves)
	_n.surf = _mk(s + 7, 1.0 / cfg.tier_surface_wavelength, 2)
	_n.hill = _mk(s + 8, 1.0 / cfg.hill_wavelength, 3)
	_n.ridge = _mk(s + 9, 1.0 / cfg.ridge_wavelength, 4)
	(_n.ridge as FastNoiseLite).fractal_type = FastNoiseLite.FRACTAL_RIDGED
	_n.cost = _mk(s + 10, 1.0 / 1500.0, 3)
	_n.forest = _mk(s + 11, 1.0 / 1300.0, 3)
	_n.meadow = _mk(s + 12, 1.0 / 650.0, 3)
	_n.kind = _mk(s + 13, 1.0 / 900.0, 2)
	_n.detail = _mk(s + 14, 1.0 / cfg.detail_wavelength, 2)


static func _mk(s: int, freq: float, octaves: int) -> FastNoiseLite:
	var n := FastNoiseLite.new()
	n.seed = s
	n.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	n.frequency = freq
	n.fractal_type = FastNoiseLite.FRACTAL_FBM if octaves > 1 else FastNoiseLite.FRACTAL_NONE
	n.fractal_octaves = octaves
	return n


# ---- the whole run ---------------------------------------------------------------------------------------------------

func generate() -> void:
	_t0 = Time.get_ticks_msec()
	report = {"seed": seed_value, "map_m": map_size, "resolution": res, "vertex_spacing": sp, "times": {}}
	_step("fields", _fields)
	_step("tiers", _tiers)
	_step("regions", _find_regions)
	_step("rivers", _rivers)
	_step("passes", _passes)
	_step("compose", _compose)
	_step("carve", _carve_rivers)
	_step("relax passes", _relax_passes)
	_step("walk check", _walk_check)
	_step("places", _places)
	_step("full heightmap", _full_res)
	_step("colour map", _colour_map)
	report.total_s = (Time.get_ticks_msec() - _t0) / 1000.0
	_free_plan()
	ready = true


func _step(name: String, fn: Callable) -> void:
	stage = name
	var t := Time.get_ticks_msec()
	fn.call()
	report.times[name] = (Time.get_ticks_msec() - t) / 1000.0
	if verbose:
		print("terrain: %s %.1f s" % [name, report.times[name]])


## run fn(row_from, row_to) over all rows of an n-row grid in bands on worker threads; returns the bands' results in order
func _bands(fn: Callable, rows: int) -> Array:
	var nb := 32
	var out := []
	out.resize(nb)
	var gid := WorkerThreadPool.add_group_task(func(b: int): out[b] = fn.call(b * rows / nb, (b + 1) * rows / nb), nb, -1, true, "terrain")
	WorkerThreadPool.wait_for_group_task_completion(gid)
	return out


static func _join(parts: Array, key: String) -> PackedFloat32Array:
	var a := PackedFloat32Array()
	for p in parts:
		a.append_array(p[key])
	return a


## world x (or z) of planning cell i (the centre of the full-res pixels it covers)
func _cx(i: int) -> float:
	return origin + (ratio * i + (ratio - 1) * 0.5) * sp


# ---- 1. the planning fields ------------------------------------------------------------------------------------------

func _fields() -> void:
	var parts := _bands(_fields_rows, cres)
	c_coast = _join(parts, "coast")
	_T = _join(parts, "T")
	_hill = _join(parts, "hill")
	_ridge = _join(parts, "ridge")
	_surf = []
	for k in 5:
		_surf.append(_join(parts, "s%d" % k))


func _fields_rows(j0: int, j1: int) -> Dictionary:
	var n := (j1 - j0) * cres
	var a_coast := PackedFloat32Array()
	a_coast.resize(n)
	var a_T := PackedFloat32Array()
	a_T.resize(n)
	var a_hill := PackedFloat32Array()
	a_hill.resize(n)
	var a_ridge := PackedFloat32Array()
	a_ridge.resize(n)
	var a_s: Array = []
	for k in 5:
		var sk := PackedFloat32Array()
		sk.resize(n)
		a_s.append(sk)
	var cwx: FastNoiseLite = _n.cwx
	var cwz: FastNoiseLite = _n.cwz
	var ncoast: FastNoiseLite = _n.coast
	var twx: FastNoiseLite = _n.twx
	var twz: FastNoiseLite = _n.twz
	var ntier: FastNoiseLite = _n.tier
	var nsurf: FastNoiseLite = _n.surf
	var nhill: FastNoiseLite = _n.hill
	var nridge: FastNoiseLite = _n.ridge
	var half := world_half
	var R: float = cfg.island_radius * half
	var cw: float = cfg.coast_warp * half
	var cn: float = cfg.coast_noise * half
	var tw: float = cfg.tier_warp
	var bias: float = cfg.inland_bias
	var reach: float = cfg.inland_reach
	var sharp: float = cfg.ridge_sharpness
	var q := 0
	for j in range(j0, j1):
		var z := _cx(j)
		for i in cres:
			var x := _cx(i)
			var wx := x + cw * cwx.get_noise_2d(x, z)
			var wz := z + cw * cwz.get_noise_2d(x, z)
			var c := R - sqrt(wx * wx + wz * wz) + cn * ncoast.get_noise_2d(x, z)
			var tx := x + tw * twx.get_noise_2d(x, z)
			var tz := z + tw * twz.get_noise_2d(x, z)
			var t := 0.5 + 0.5 * ntier.get_noise_2d(tx, tz)
			var inland := smoothstep(0.0, reach, c)
			a_coast[q] = c
			a_T[q] = lerpf(t, inland, bias) * sqrt(smoothstep(0.0, 700.0, c))
			for k in 5:
				var sk: PackedFloat32Array = a_s[k]
				sk[q] = clampf(0.5 + 0.6 * nsurf.get_noise_2d(x + 7919.0 * k, z - 5113.0 * k), 0.0, 1.0)
			a_hill[q] = nhill.get_noise_2d(x, z)
			a_ridge[q] = pow(clampf(0.5 + 0.5 * nridge.get_noise_2d(x, z), 0.0, 1.0), sharp)
			q += 1
	var out := {"coast": a_coast, "T": a_T, "hill": a_hill, "ridge": a_ridge}
	for k in 5:
		out["s%d" % k] = a_s[k]
	return out


# ---- the tiers -------------------------------------------------------------------------------------------------------

func _tiers() -> void:
	# cut levels from the wanted land shares (percentiles of T over the land)
	var vals := PackedFloat32Array()
	for q in range(0, cres * cres, 7):
		if c_coast[q] > 0.0:
			vals.append(_T[q])
	vals.sort()
	cuts = PackedFloat32Array()
	var acc := 0.0
	for k in range(1, 5):
		acc += cfg.tier_share[k - 1]
		cuts.append(vals[clampi(int(acc * vals.size()), 0, vals.size() - 1)])
	c_tier = PackedByteArray()
	c_tier.resize(cres * cres)
	_g = PackedFloat32Array()
	_g.resize(cres * cres)
	for j in cres:
		for i in cres:
			var q := j * cres + i
			if c_coast[q] <= 0.0:
				c_tier[q] = SEA
			else:
				var t := _T[q]
				var k := 0
				while k < 4 and t >= cuts[k]:
					k += 1
				c_tier[q] = k
			var gx := (_T[j * cres + mini(i + 1, cres - 1)] - _T[j * cres + maxi(i - 1, 0)]) / (2.0 * cs)
			var gz := (_T[mini(j + 1, cres - 1) * cres + i] - _T[maxi(j - 1, 0) * cres + i]) / (2.0 * cs)
			_g[q] = sqrt(gx * gx + gz * gz)
	var counts := [0, 0, 0, 0, 0]
	var land := 0
	for q in cres * cres:
		if c_tier[q] != SEA:
			counts[c_tier[q]] += 1
			land += 1
	var tiers := []
	for k in 5:
		tiers.append({"name": cfg.tier_names[k], "km2": snappedf(counts[k] * cs * cs / 1e6, 0.01), "share": snappedf(float(counts[k]) / maxi(land, 1), 0.001)})
	report.tiers = tiers
	report.land_km2 = snappedf(land * cs * cs / 1e6, 0.1)


## the gradient direction of T (uphill, into the higher tier) at a planning cell
func _grad_dir(i: int, j: int) -> Vector2:
	var gx := _T[j * cres + mini(i + 2, cres - 1)] - _T[j * cres + maxi(i - 2, 0)]
	var gz := _T[mini(j + 2, cres - 1) * cres + i] - _T[maxi(j - 2, 0) * cres + i]
	var v := Vector2(gx, gz)
	return v.normalized() if v.length() > 1e-9 else Vector2(1, 0)


# ---- regions: the connected areas of each tier and up, and their edges -----------------------------------------------

func _find_regions() -> void:
	_labels = []
	_regions = []
	_labels.resize(5)
	_regions.resize(5)
	var gid := WorkerThreadPool.add_group_task(_label_level, 4, -1, true, "regions")
	WorkerThreadPool.wait_for_group_task_completion(gid)


func _label_level(idx: int) -> void:
	var k := idx + 1
	var lab := PackedInt32Array()
	lab.resize(cres * cres)
	var regs := []
	var queue := PackedInt32Array()
	queue.resize(cres * cres)
	var nlab := 0
	for start in cres * cres:
		if lab[start] != 0 or c_tier[start] == SEA or c_tier[start] < k:
			continue
		nlab += 1
		var head := 0
		var tail := 0
		queue[tail] = start
		tail += 1
		lab[start] = nlab
		var edge := PackedInt32Array()
		var cells := 0
		while head < tail:
			var q := queue[head]
			head += 1
			cells += 1
			var i := q % cres
			var j := q / cres
			var on_edge := false
			for d in 4:
				var ni: int = i + DI4[d]
				var nj: int = j + DJ4[d]
				if ni < 0 or nj < 0 or ni >= cres or nj >= cres:
					continue
				var nq := nj * cres + ni
				var nt := c_tier[nq]
				if nt == SEA or nt < k:
					on_edge = true
				elif lab[nq] == 0:
					lab[nq] = nlab
					queue[tail] = nq
					tail += 1
			if on_edge:
				edge.append(q)
		regs.append({"level": k, "id": nlab, "cells": cells, "edge": edge})
	_labels[k] = lab
	_regions[k] = regs


# ---- water: courses from the high tiers down to the sea ---------------------------------------------------------------

func _rivers() -> void:
	# a flow field on a half-resolution grid: cost-weighted distance to the sea that only spreads into the same tier or a
	# higher one, so following it downhill always steps down (or level) in tier; noise in the cost makes the courses wander
	var hr := cres / 2
	var tier := PackedByteArray()
	tier.resize(hr * hr)
	var cost := PackedInt32Array()
	cost.resize(hr * hr)
	var ncost: FastNoiseLite = _n.cost
	for j in hr:
		for i in hr:
			var q := (j * 2) * cres + i * 2
			tier[j * hr + i] = c_tier[q]
			cost[j * hr + i] = 10 + int(52.0 * clampf(0.5 + 0.7 * ncost.get_noise_2d(_cx(i * 2), _cx(j * 2)), 0.0, 1.0))
	var INF := 1 << 30
	var dist := PackedInt32Array()
	dist.resize(hr * hr)
	dist.fill(INF)
	var nb := 128
	var buckets := []
	for b in nb:
		buckets.append(PackedInt32Array())
	var pending := 0
	for q in hr * hr:
		if tier[q] == SEA:
			dist[q] = 0
			var b0: PackedInt32Array = buckets[0]
			b0.append(q)
			pending += 1
	var cur := 0
	var di := [1, -1, 0, 0, 1, 1, -1, -1]
	var dj := [0, 0, 1, -1, 1, -1, 1, -1]
	while pending > 0:
		var bucket: PackedInt32Array = buckets[cur % nb]
		if bucket.is_empty():
			cur += 1
			continue
		buckets[cur % nb] = PackedInt32Array()
		pending -= bucket.size()
		for q in bucket:
			if dist[q] != cur:
				continue
			var i := q % hr
			var j := q / hr
			var t := tier[q]
			for d in 8:
				var ni: int = i + di[d]
				var nj: int = j + dj[d]
				if ni < 0 or nj < 0 or ni >= hr or nj >= hr:
					continue
				var nq := nj * hr + ni
				var nt := tier[nq]
				if nt == SEA or (t != SEA and nt < t):
					continue
				var step := cost[nq] * (14 if d >= 4 else 10) / 10
				var nd := cur + step
				if nd < dist[nq]:
					dist[nq] = nd
					# (a typed local shares the array; writing through an `as` cast would only change a copy)
					var bk: PackedInt32Array = buckets[nd % nb]
					bk.append(nq)
					pending += 1
		cur += 1
	# sources: the deepest-inland cells of all high ground (highlands and up), greedily spread at least 1.1 km apart
	var keys := PackedInt64Array()
	for q in hr * hr:
		if tier[q] != SEA and tier[q] >= 2 and dist[q] < INF:
			keys.append((int(dist[q]) << 20) | q)
	keys.sort()
	var chosen := []
	var min_gap := int(pow(1100.0 / (2.0 * cs), 2.0))
	for ki in range(keys.size() - 1, -1, -1):
		var q: int = keys[ki] & 0xFFFFF
		if chosen.size() >= cfg.rivers:
			break
		var ok := true
		for o in chosen:
			var dx: int = (int(q) % hr) - (int(o.q) % hr)
			var dz: int = (int(q) / hr) - (int(o.q) / hr)
			if dx * dx + dz * dz < min_gap:
				ok = false
				break
		if ok:
			chosen.append({"q": q, "level": tier[q]})
	# trace each course down the field to the sea (or into a river already traced)
	var taken := {}
	rivers = []
	for c in chosen:
		var q: int = c.q
		var pts := PackedVector2Array()
		var guard := 0
		while guard < hr * 4:
			guard += 1
			var i := q % hr
			var j := q / hr
			pts.append(Vector2(_cx(i * 2), _cx(j * 2)))
			if dist[q] == 0 or taken.has(q):
				break
			taken[q] = true
			var nq := q
			var nd := dist[q]
			for d in 8:
				var ni: int = i + di[d]
				var nj: int = j + dj[d]
				if ni < 0 or nj < 0 or ni >= hr or nj >= hr:
					continue
				var cq := nj * hr + ni
				if dist[cq] < nd:
					nd = dist[cq]
					nq = cq
			if nq == q:
				break
			q = nq
		if pts.size() > 8:
			rivers.append({"points": _meander(pts), "level": c.level})
	report.rivers = rivers.size()


## a traced course (grid steps) smoothed and swung sideways in slow bends; its two ends stay put
func _meander(pts: PackedVector2Array) -> PackedVector2Array:
	# smooth the grid staircase (a few passes of neighbour averaging)
	var p := pts.duplicate()
	for it in 6:
		var q := p.duplicate()
		for i in range(1, p.size() - 1):
			q[i] = (p[i - 1] + p[i] * 2.0 + p[i + 1]) * 0.25
		p = q
	# resample every 20 m and swing sideways
	var out := PackedVector2Array([p[0]])
	var along := 0.0
	var amp: float = cfg.meander_amp
	var wl: float = cfg.meander_wavelength
	var nm: FastNoiseLite = _n.cost
	var total := 0.0
	for i in range(1, p.size()):
		total += p[i - 1].distance_to(p[i])
	for i in range(1, p.size()):
		var a := p[i - 1]
		var b := p[i]
		var seg := a.distance_to(b)
		var steps := maxi(1, int(seg / 20.0))
		var dir := (b - a).normalized()
		var side := Vector2(-dir.y, dir.x)
		for s in steps:
			along += seg / steps
			var m := a.lerp(b, float(s + 1) / steps)
			var fade := smoothstep(0.0, 150.0, along) * smoothstep(0.0, 150.0, total - along)
			var swing := amp * fade * (sin(along / wl * TAU + nm.get_noise_1d(along * 0.002) * 3.0) * 0.7 + nm.get_noise_1d(along * 0.01 + 50.0) * 0.6)
			out.append(m + side * swing)
	return out


# ---- passes: where each tier edge turns into walkable ramps -----------------------------------------------------------

func _passes() -> void:
	passes = []
	_pass_k = [PackedFloat32Array()]
	_rampw_k = [PackedFloat32Array()]
	# river crossings: a mask of cells within 180 m of a course, kept clear of passes
	var near_r := PackedByteArray()
	near_r.resize(cres * cres)
	var rr := int(ceil(180.0 / cs))
	for r in rivers:
		for rp in r.points:
			var c := _cell(rp)
			for j in range(maxi(c.y - rr, 0), mini(c.y + rr + 1, cres)):
				for i in range(maxi(c.x - rr, 0), mini(c.x + rr + 1, cres)):
					if (i - c.x) * (i - c.x) + (j - c.y) * (j - c.y) <= rr * rr:
						near_r[j * cres + i] = 1
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector2i(seed_value, 4242))
	var tan_r := tan(deg_to_rad(cfg.ramp_angle))
	for k in range(1, 5):
		var pk := PackedFloat32Array()
		pk.resize(cres * cres)
		var wk := PackedFloat32Array()
		wk.resize(cres * cres)
		for r in _regions[k]:
			var edge: PackedInt32Array = r.edge
			if edge.size() < 2:
				continue
			# skip edge cells next to the sea (a sea cliff is not an edge to the tier below) and near river crossings
			var cand := PackedInt32Array()
			for q in edge:
				if near_r[q] == 0 and _below_is_land(q, k):
					cand.append(q)
			if cand.size() < 2:
				cand = edge
			var perimeter := edge.size() * cs
			var n: int = clampi(int(round(perimeter / cfg.pass_spacing)), cfg.min_passes, cfg.max_passes) + cfg.spare_passes
			n = mini(n, cand.size())
			var picks := PackedInt32Array([cand[rng.randi() % cand.size()]])
			while picks.size() < n:
				var best := -1
				var bd := -1.0
				for q in cand:
					var p := Vector2(q % cres, q / cres)
					var md := INF
					for o in picks:
						md = minf(md, p.distance_squared_to(Vector2(o % cres, o / cres)))
					if md > bd:
						bd = md
						best = q
				picks.append(best)
			for q in picks:
				_stamp_pass(k, r.id, q, pk, wk, tan_r)
		_pass_k.append(pk)
		_rampw_k.append(wk)
	report.passes = passes.size()


func _below_is_land(q: int, k: int) -> bool:
	var i := q % cres
	var j := q / cres
	for d in 4:
		var ni := clampi(i + 2 * int(DI4[d]), 0, cres - 1)
		var nj := clampi(j + 2 * int(DJ4[d]), 0, cres - 1)
		var t := c_tier[nj * cres + ni]
		if t != SEA and t == k - 1:
			return true
	return false


func _stamp_pass(k: int, region: int, q: int, pk: PackedFloat32Array, wk: PackedFloat32Array, tan_r: float) -> void:
	var i0 := q % cres
	var j0 := q / cres
	var n := _grad_dir(i0, j0)
	var t := Vector2(-n.y, n.x)
	var dh := _surface(k, q) - _surface(k - 1, q)
	var W := dh / tan_r + 40.0
	var half_w: float = cfg.pass_width * 0.5
	var reach := W * 0.5 + 140.0
	var rc := int(ceil(maxf(reach, half_w + 60.0) / cs))
	var p0 := Vector2(_cx(i0), _cx(j0))
	for j in range(maxi(j0 - rc, 0), mini(j0 + rc + 1, cres)):
		for i in range(maxi(i0 - rc, 0), mini(i0 + rc + 1, cres)):
			var v := Vector2(_cx(i), _cx(j)) - p0
			var along := absf(v.dot(t))
			var across := absf(v.dot(n))
			var f := (1.0 - smoothstep(half_w, half_w + 50.0, along)) * (1.0 - smoothstep(W * 0.5 + 20.0, W * 0.5 + 120.0, across))
			var c := j * cres + i
			if f > pk[c]:
				pk[c] = f
				wk[c] = W
	var lo := p0 - n * (W * 0.5 + 40.0)
	var hi := p0 + n * (W * 0.5 + 40.0)
	passes.append({"level": k, "region": region, "q": q, "at": p0, "dir": n, "width": W, "dh": dh, "foot": lo, "top": hi, "ok": false})


## a tier's own surface height at a planning cell (inside its range; the peaks' crests from ridged noise)
func _surface(k: int, q: int) -> float:
	var lo: float = cfg.tier_low[k]
	var hi: float = cfg.tier_high[k]
	var s: float = (_surf[k] as PackedFloat32Array)[q]
	if k == 4:
		return lo + (hi - lo) * (0.25 * s + 0.75 * _ridge[q])
	return lo + (hi - lo) * s


# ---- 2 + 3. the planning heights -------------------------------------------------------------------------------------

func _compose() -> void:
	var parts := _bands(_compose_rows, cres)
	c_h = _join(parts, "h")
	c_pass = _join(parts, "p")
	_damp = _join(parts, "d")


func _compose_rows(j0: int, j1: int) -> Dictionary:
	var n := (j1 - j0) * cres
	var out_h := PackedFloat32Array()
	out_h.resize(n)
	var out_p := PackedFloat32Array()
	out_p.resize(n)
	var out_d := PackedFloat32Array()
	out_d.resize(n)
	var tan_c := tan(deg_to_rad(cfg.cliff_angle))
	var gmin := 1e-6
	var hamp: PackedFloat32Array = cfg.hill_amp
	var damp: PackedFloat32Array = cfg.detail_amp
	var pk: Array = []
	var wk: Array = []
	for k in 5:
		pk.append(_pass_k[k] if k < _pass_k.size() else PackedFloat32Array())
		wk.append(_rampw_k[k] if k < _rampw_k.size() else PackedFloat32Array())
	var p1: PackedFloat32Array = pk[1]
	var p2: PackedFloat32Array = pk[2]
	var p3: PackedFloat32Array = pk[3]
	var p4: PackedFloat32Array = pk[4]
	var w1: PackedFloat32Array = wk[1]
	var w2: PackedFloat32Array = wk[2]
	var w3: PackedFloat32Array = wk[3]
	var w4: PackedFloat32Array = wk[4]
	var o := 0
	for j in range(j0, j1):
		for i in cres:
			var q := j * cres + i
			var c := c_coast[q]
			var dist_sea := maxf(-c, 0.0)
			var sea_h := -1.5 - minf(dist_sea, 2200.0) * 0.016
			var h := _surface(0, q)
			var s_prev := 1.0
			var amp := 0.0
			var dam := 0.0
			var pmax := 0.0
			var g := maxf(_g[q], gmin)
			var sf := [_surface(0, q), _surface(1, q), _surface(2, q), _surface(3, q), _surface(4, q)]
			if p4[q] > 0.0:
				# a pass up into the peaks arrives on a shoulder, not on a crest
				sf[4] = lerpf(sf[4], cfg.tier_low[4] + 0.2 * (cfg.tier_high[4] - cfg.tier_low[4]) * (_surf[4] as PackedFloat32Array)[q], p4[q] * 0.9)
			h = sf[0]
			for k in range(1, 5):
				var d := (_T[q] - cuts[k - 1]) / g
				var dh: float = sf[k] - sf[k - 1]
				var p: float = p1[q] if k == 1 else (p2[q] if k == 2 else (p3[q] if k == 3 else p4[q]))
				var rw: float = w1[q] if k == 1 else (w2[q] if k == 2 else (w3[q] if k == 3 else w4[q]))
				var wc := maxf(dh / tan_c, cs * 0.9)
				var W := lerpf(wc, maxf(rw, wc), p)
				var u := clampf(d / W + 0.5, 0.0, 1.0)
				var s := lerpf(u * u * (3.0 - 2.0 * u), u, p)
				h += dh * s
				amp += (s_prev - s) * hamp[k - 1]
				dam += (s_prev - s) * damp[k - 1]
				s_prev = s
				pmax = maxf(pmax, p)
			amp += s_prev * hamp[4]
			dam += s_prev * damp[4]
			h += amp * _hill[q] * (1.0 - 0.9 * pmax)
			var land := smoothstep(-30.0, 30.0, c)
			out_h[o] = lerpf(sea_h, h, land)
			out_p[o] = pmax
			out_d[o] = dam * (1.0 - 0.6 * pmax) * land
			o += 1
	return {"h": out_h, "p": out_p, "d": out_d}


# ---- rivers carve their channels --------------------------------------------------------------------------------------

func _carve_rivers() -> void:
	c_river = PackedFloat32Array()
	c_river.resize(cres * cres)
	var orig := c_h.duplicate()
	var depth: float = cfg.channel_depth
	var chw: float = cfg.channel_halfwidth
	var vhw: float = cfg.valley_halfwidth
	var vdep: float = cfg.valley_depth
	var total := 0.0
	for r in rivers:
		var pts: PackedVector2Array = r.points
		var floor_h := INF
		for idx in pts.size():
			var a := pts[maxi(idx - 1, 0)]
			var b := pts[idx]
			var seg := a.distance_to(b)
			var steps := maxi(1, int(seg / cs))
			for s in steps:
				var p := a.lerp(b, float(s + 1) / steps)
				total += seg / steps
				var here := _bilinear(orig, p)
				floor_h = minf(floor_h - 0.02, here - depth) if floor_h < INF else here - depth
				_stamp_channel(p, floor_h, orig, chw, vhw, vdep)
	report.river_km = snappedf(total / 1000.0, 0.1)


func _stamp_channel(p: Vector2, floor_h: float, orig: PackedFloat32Array, chw: float, vhw: float, vdep: float) -> void:
	var ci := ((p.x - origin) / sp - (ratio - 1) * 0.5) / ratio
	var cj := ((p.y - origin) / sp - (ratio - 1) * 0.5) / ratio
	var rc := int(ceil(vhw / cs)) + 1
	for j in range(maxi(int(cj) - rc, 0), mini(int(cj) + rc + 2, cres)):
		for i in range(maxi(int(ci) - rc, 0), mini(int(ci) + rc + 2, cres)):
			var q := j * cres + i
			if c_tier[q] == SEA:
				continue
			var d := Vector2(_cx(i), _cx(j)).distance_to(p)
			if d > vhw:
				continue
			var hv := orig[q] - vdep * pow(1.0 - d / vhw, 2.0)
			var target := maxf(floor_h, hv)
			if d < chw:
				target = minf(target, lerpf(floor_h, maxf(hv, floor_h), pow(d / chw, 2.0)))
				c_river[q] = maxf(c_river[q], 1.0 - d / chw)
			if target < c_h[q]:
				c_h[q] = target


func _bilinear(a: PackedFloat32Array, p: Vector2) -> float:
	var fi := clampf(((p.x - origin) / sp - (ratio - 1) * 0.5) / ratio, 0.0, cres - 1.001)
	var fj := clampf(((p.y - origin) / sp - (ratio - 1) * 0.5) / ratio, 0.0, cres - 1.001)
	var i := int(fi)
	var j := int(fj)
	var u := fi - i
	var v := fj - j
	var q := j * cres + i
	return lerpf(lerpf(a[q], a[q + 1], u), lerpf(a[q + cres], a[q + cres + 1], u), v)


# ---- passes stay walkable ---------------------------------------------------------------------------------------------

## inside every pass zone, no step between neighbours may be steeper than the ramp limit: both sides are moved toward
## each other until that holds (a few dozen sweeps settle a ramp of any length)
func _relax_passes() -> void:
	# per neighbour step at most the ramp angle + 2 degrees: with both axes at that, the steepest direction stays near 31 degrees
	var lim := tan(deg_to_rad(cfg.ramp_angle + 2.0)) * cs
	var zone := PackedInt32Array()
	for q in cres * cres:
		if c_pass[q] > 0.2 and c_tier[q] != SEA:
			zone.append(q)
	var di := [1, -1, 0, 0, 1, -1, 1, -1]
	var dj := [0, 0, 1, -1, 1, -1, -1, 1]
	var lims := [lim, lim, lim, lim, lim * 1.4142, lim * 1.4142, lim * 1.4142, lim * 1.4142]
	var active := zone
	var mark := PackedByteArray()
	mark.resize(cres * cres)
	var sweeps := 0
	while not active.is_empty() and sweeps < 160:
		sweeps += 1
		var nxt := PackedInt32Array()
		for q in active:
			mark[q] = 0
		for q in active:
			var i := q % cres
			var j := q / cres
			for d in 8:
				var ni: int = i + di[d]
				var nj: int = j + dj[d]
				if ni < 0 or nj < 0 or ni >= cres or nj >= cres:
					continue
				var nq := nj * cres + ni
				if c_pass[nq] <= 0.2:
					continue
				var diff := c_h[q] - c_h[nq]
				var ex := absf(diff) - float(lims[d])
				if ex > 0.05:
					var m := ex * 0.5 * signf(diff)
					c_h[q] -= m
					c_h[nq] += m
					if mark[q] == 0:
						mark[q] = 1
						nxt.append(q)
					if mark[nq] == 0:
						mark[nq] = 1
						nxt.append(nq)
		active = nxt
	report.relax_sweeps = sweeps


# ---- the walk check ---------------------------------------------------------------------------------------------------

func _walk_check() -> void:
	c_slope = PackedFloat32Array()
	c_slope.resize(cres * cres)
	var land := 0
	var walk := 0
	var cliff := 0
	for j in cres:
		for i in cres:
			var q := j * cres + i
			var gx := (c_h[j * cres + mini(i + 1, cres - 1)] - c_h[j * cres + maxi(i - 1, 0)]) / (2.0 * cs)
			var gz := (c_h[mini(j + 1, cres - 1) * cres + i] - c_h[maxi(j - 1, 0) * cres + i]) / (2.0 * cs)
			var s := rad_to_deg(atan(sqrt(gx * gx + gz * gz)))
			c_slope[q] = s
			if c_tier[q] != SEA:
				land += 1
				if s <= cfg.max_walk_angle:
					walk += 1
				if s >= cfg.cliff_threshold:
					cliff += 1
	report.walkable_share = snappedf(float(walk) / maxi(land, 1), 0.001)
	report.cliff_share = snappedf(float(cliff) / maxi(land, 1), 0.001)
	# each pass: a walk on cells no steeper than the limit (less a margin for the small bumps) from its foot to its top
	var limit: float = cfg.max_walk_angle - 3.0
	for p in passes:
		p.ok = _walkable_route(p.foot, p.top, limit, p.level)
		p.route_check = "foot to 25 m inside the upper tier, cells <= %.0f deg" % limit
		p.slope_max = _route_max_slope(p.foot, p.top)
	# per region: how many working passes
	var per := {}
	for p in passes:
		var key := "%d:%d" % [p.level, p.region]
		if not per.has(key):
			per[key] = 0
		if p.ok:
			per[key] += 1
	var short := 0
	var regions := 0
	for k in range(1, 5):
		for r in _regions[k]:
			if (r.edge as PackedInt32Array).size() < 2:
				continue
			regions += 1
			if per.get("%d:%d" % [k, r.id], 0) < cfg.min_passes:
				short += 1
	report.regions_checked = regions
	report.regions_short_of_routes = short
	report.passes_ok = passes.filter(func(p): return p.ok).size()
	report.reachable = _reachability(limit)


## a walk across the pass: from its foot to its top over cells no steeper than limit, within its zone (A* would be overkill:
## a flood inside the zone's box)
func _walkable_route(foot: Vector2, top: Vector2, limit: float, k: int) -> bool:
	var a := _cell(foot)
	var b := _cell(top)
	for s in 21:
		var c0 := _cell(foot.lerp(top, s / 20.0))
		if c_tier[c0.y * cres + c0.x] != SEA:
			a = c0
			break
	var i0 := mini(a.x, b.x) - 16
	var i1 := maxi(a.x, b.x) + 16
	var j0 := mini(a.y, b.y) - 16
	var j1 := maxi(a.y, b.y) + 16
	var seen := {}
	var queue := [a]
	seen[a] = true
	var head := 0
	while head < queue.size():
		var c: Vector2i = queue[head]
		head += 1
		var cq := c.y * cres + c.x
		if c.distance_squared_to(b) <= 4 or (c_tier[cq] != SEA and c_tier[cq] >= k and (_T[cq] - cuts[k - 1]) / maxf(_g[cq], 1e-6) >= 25.0):
			return true
		for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1), Vector2i(1, 1), Vector2i(-1, 1), Vector2i(1, -1), Vector2i(-1, -1)]:
			var n: Vector2i = c + d
			if n.x < i0 or n.y < j0 or n.x > i1 or n.y > j1 or n.x < 0 or n.y < 0 or n.x >= cres or n.y >= cres or seen.has(n):
				continue
			var nq := n.y * cres + n.x
			if c_tier[nq] == SEA or c_slope[nq] > limit:
				continue
			seen[n] = true
			queue.append(n)
	return false


func _route_max_slope(foot: Vector2, top: Vector2) -> float:
	var m := 0.0
	for s in 41:
		var p := foot.lerp(top, s / 40.0)
		var c := _cell(p)
		m = maxf(m, c_slope[c.y * cres + c.x])
	return snappedf(m, 0.1)


func _cell(p: Vector2) -> Vector2i:
	var fi := ((p.x - origin) / sp - (ratio - 1) * 0.5) / ratio
	var fj := ((p.y - origin) / sp - (ratio - 1) * 0.5) / ratio
	return Vector2i(clampi(int(round(fi)), 0, cres - 1), clampi(int(round(fj)), 0, cres - 1))


## which regions a walker starting in the lowlands can reach (one flood over all walkable land)
func _reachability(limit: float) -> Dictionary:
	var start := -1
	var best := -1.0
	for q in range(0, cres * cres, 97):
		if c_tier[q] == 1 and c_slope[q] < 10.0 and _T[q] > best:
			best = _T[q]
			start = q
	if start < 0:
		return {}
	var seen := PackedByteArray()
	seen.resize(cres * cres)
	var queue := PackedInt32Array()
	queue.resize(cres * cres)
	var head := 0
	var tail := 1
	queue[0] = start
	seen[start] = 1
	while head < tail:
		var q := queue[head]
		head += 1
		var i := q % cres
		var j := q / cres
		for d in 8:
			var ni: int = i + DI8[d]
			var nj: int = j + DJ8[d]
			if ni < 0 or nj < 0 or ni >= cres or nj >= cres:
				continue
			var nq := nj * cres + ni
			if seen[nq] == 1 or c_tier[nq] == SEA or c_slope[nq] > limit:
				continue
			seen[nq] = 1
			queue[tail] = nq
			tail += 1
	var out := {"walkable_cells_reached": tail}
	for k in range(1, 5):
		var lab: PackedInt32Array = _labels[k]
		var regs: Array = _regions[k]
		var hit := PackedByteArray()
		hit.resize(regs.size() + 1)
		for q in cres * cres:
			if seen[q] == 1 and lab[q] > 0:
				hit[lab[q]] = 1
		var reached := 0
		var unreached_km2 := 0.0
		for r in regs:
			if hit[r.id] == 1:
				reached += 1
			else:
				unreached_km2 += r.cells * cs * cs / 1e6
		out[cfg.tier_names[k]] = "%d of %d regions (unreached %.2f km2)" % [reached, regs.size(), unreached_km2]
	return out


# ---- places worth showing ---------------------------------------------------------------------------------------------

func _places() -> void:
	pois = {}
	# a walkable pass up onto a plateau (else the highlands): the highest working one
	var best_pass = null
	for p in passes:
		if p.ok and (best_pass == null or (p.level == 3 and best_pass.level != 3) or (p.level == best_pass.level and p.dh > best_pass.dh)):
			if p.level >= 2:
				best_pass = p
	if best_pass != null:
		pois.pass_foot = _v3(best_pass.foot)
		pois.pass_top = _v3(best_pass.top)
		pois.pass_mid = _v3(best_pass.at)
	# a plateau's cliff edge: from each edge cell (no pass, no river near) step inward to the first flat ground on top - the
	# place to stand - and keep the one with the biggest drop just beyond it
	var edge_best := -1.0
	var edge_q := -1
	var edge_dir := Vector2.ZERO
	var edge_stand := Vector2.ZERO
	var plate: Array = _regions[3]
	for r in plate:
		var edge_cells: PackedInt32Array = r.edge
		for ei in range(0, edge_cells.size(), 2):
			var q: int = edge_cells[ei]
			if c_pass[q] > 0.01 or c_river[q] > 0.0:
				continue
			var i: int = q % cres
			var j: int = q / cres
			var n := _grad_dir(i, j)
			var p0 := Vector2(_cx(i), _cx(j))
			var stand := Vector2.INF
			for s in range(1, 24):
				var w := p0 + n * (s * 5.0)
				var c := _cell(w)
				if c_tier[c.y * cres + c.x] == 3 and c_slope[c.y * cres + c.x] < 12.0:
					stand = w + n * 4.0
					break
			if stand == Vector2.INF:
				continue
			var drop := _bilinear(c_h, stand) - _bilinear(c_h, stand - n * (stand.distance_to(p0) + 110.0))
			if drop > edge_best:
				edge_best = drop
				edge_q = q
				edge_dir = n
				edge_stand = stand
	if edge_q >= 0:
		var p := Vector2(_cx(edge_q % cres), _cx(edge_q / cres))
		pois.edge_stand = _v3(edge_stand)
		pois.edge_look = _v3(p - edge_dir * 150.0)
		pois.edge_drop = snappedf(edge_best, 0.1)
	# lowlands looking up at a plateau: a plateau edge with only a narrow band of highlands in front of it, the viewer well
	# out in the lowlands beyond, looking at the plateau's rim
	var low_best := INF
	var low_p := Vector2.ZERO
	var low_n := Vector2.ZERO
	var low_l := 0.0
	for r in plate:
		var edge_cells: PackedInt32Array = r.edge
		for ei in range(0, edge_cells.size(), 3):
			var q: int = edge_cells[ei]
			if c_pass[q] > 0.01:
				continue
			var n := _grad_dir(q % cres, q / cres)
			var p0 := Vector2(_cx(q % cres), _cx(q / cres))
			for s2 in range(1, 60):
				var w := p0 - n * (s2 * 10.0)
				var c := _cell(w)
				var t := c_tier[c.y * cres + c.x]
				if t == SEA or t == 0:
					break
				if t == 1:
					var l := s2 * 10.0
					if l < low_best and _bilinear(c_h, p0 + n * 30.0) - _bilinear(c_h, w - n * 150.0) > 150.0:
						low_best = l
						low_p = p0
						low_n = n
						low_l = l
					break
	if low_best < INF:
		pois.low_stand = _v3(low_p - low_n * (low_l + 170.0))
		pois.low_look = _v3(low_p + low_n * 25.0)
	elif pois.has("edge_stand"):
		pois.low_stand = _v3(Vector2(pois.edge_stand.x, pois.edge_stand.z) - edge_dir * 700.0)
		pois.low_look = pois.edge_stand
	pois.spawn = pois.get("low_stand", _v3(Vector2.ZERO))


func _v3(p: Vector2) -> Vector3:
	return Vector3(p.x, _bilinear(c_h, p), p.y)


# ---- 4. the full heightmap --------------------------------------------------------------------------------------------

func _full_res() -> void:
	var base := Image.create_from_data(cres, cres, false, Image.FORMAT_RF, c_h.to_byte_array())
	base.resize(res, res, Image.INTERPOLATE_CUBIC)
	var amp := Image.create_from_data(cres, cres, false, Image.FORMAT_RF, _damp.to_byte_array())
	amp.resize(res, res, Image.INTERPOLATE_BILINEAR)
	var bf := base.get_data().to_float32_array()
	var af := amp.get_data().to_float32_array()
	base = null
	amp = null
	# two tiling detail tiles at different scales (so the pattern never visibly repeats)
	var tile_a := _detail_tile(256, cfg.detail_wavelength / sp)
	var tile_b := _detail_tile(128, cfg.detail_wavelength * 0.43 / sp)
	var parts := _bands(func(j0: int, j1: int) -> PackedFloat32Array:
		var out := PackedFloat32Array()
		out.resize((j1 - j0) * res)
		var o := 0
		for j in range(j0, j1):
			var ra := (j % 256) * 256
			var rb := ((j + 37) % 128) * 128
			var row := j * res
			for i in res:
				out[o] = bf[row + i] + af[row + i] * (tile_a[ra + (i % 256)] + 0.45 * tile_b[rb + ((i + 71) % 128)])
				o += 1
		return out, res)
	# built aside and swapped in whole: other threads may be reading heights meanwhile
	var hh := PackedFloat32Array()
	for p in parts:
		hh.append_array(p)
	height_img = Image.create_from_data(res, res, false, Image.FORMAT_RF, hh.to_byte_array())
	heights = hh


## a seamless square of detail noise (n x n samples, about `period` samples per bump), from four shifted copies blended
func _detail_tile(n: int, period: float) -> PackedFloat32Array:
	var nd: FastNoiseLite = _n.detail
	var f := nd.frequency
	nd.frequency = 1.0 / maxf(period, 1.0)
	var t := PackedFloat32Array()
	t.resize(n * n)
	for j in n:
		for i in n:
			var u := float(i) / n
			var v := float(j) / n
			var a := nd.get_noise_2d(i, j)
			var b := nd.get_noise_2d(i - n, j)
			var c := nd.get_noise_2d(i, j - n)
			var d := nd.get_noise_2d(i - n, j - n)
			t[j * n + i] = lerpf(lerpf(a, b, u), lerpf(c, d, u), v) * 1.4
	nd.frequency = f
	return t


## the colour map: r = tier (0, 64, 128, 192, 255; sea 0 with b), g = river channel, b = pass zone, a = sea flag
func _colour_map() -> void:
	var b := PackedByteArray()
	b.resize(cres * cres * 4)
	for q in cres * cres:
		var t := c_tier[q]
		b[q * 4] = 0 if t == SEA else int(t * 63.75)
		b[q * 4 + 1] = int(clampf(c_river[q], 0.0, 1.0) * 255.0)
		b[q * 4 + 2] = int(clampf(c_pass[q], 0.0, 1.0) * 255.0)
		b[q * 4 + 3] = 0 if t == SEA else 255
	color_img = Image.create_from_data(cres, cres, false, Image.FORMAT_RGBA8, b)
	color_img.resize(res, res, Image.INTERPOLATE_BILINEAR)


func _free_plan() -> void:
	_T = PackedFloat32Array()
	_g = PackedFloat32Array()
	_surf = []
	_hill = PackedFloat32Array()
	_ridge = PackedFloat32Array()
	_labels = []
	_regions = []
	_pass_k = []
	_rampw_k = []
	_damp = PackedFloat32Array()


# ---- the cache --------------------------------------------------------------------------------------------------------

func save(path: String) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return
	var meta := {"version": VERSION, "res": res, "cres": cres, "cuts": cuts, "pois": pois, "report": report, "rivers": rivers,
		"passes": passes}
	f.store_var(meta)
	f.store_buffer(heights.to_byte_array())
	f.store_buffer(c_coast.to_byte_array())
	f.store_buffer(c_tier)
	f.store_buffer(c_river.to_byte_array())
	f.store_buffer(c_pass.to_byte_array())
	f.store_buffer(c_slope.to_byte_array())
	f.store_buffer(color_img.get_data())
	f.close()


func load_cache(path: String) -> bool:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return false
	var meta = f.get_var()
	if typeof(meta) != TYPE_DICTIONARY or meta.get("version", -1) != VERSION or meta.res != res or meta.cres != cres:
		return false
	cuts = meta.cuts
	pois = meta.pois
	report = meta.report
	report.cached = true
	rivers = meta.rivers
	passes = meta.passes
	var n := res * res
	var c := cres * cres
	heights = f.get_buffer(n * 4).to_float32_array()
	c_coast = f.get_buffer(c * 4).to_float32_array()
	c_tier = f.get_buffer(c)
	c_river = f.get_buffer(c * 4).to_float32_array()
	c_pass = f.get_buffer(c * 4).to_float32_array()
	c_slope = f.get_buffer(c * 4).to_float32_array()
	color_img = Image.create_from_data(res, res, false, Image.FORMAT_RGBA8, f.get_buffer(n * 4))
	f.close()
	if heights.size() != n:
		return false
	height_img = Image.create_from_data(res, res, false, Image.FORMAT_RF, heights.to_byte_array())
	ready = true
	return true


# ---- queries (safe from worker threads once ready) -----------------------------------------------------------------

## the ground height at a world point, exactly as Terrain3D draws and collides with it (bilinear between samples)
func height(x: float, z: float) -> float:
	if heights.size() != res * res:
		return 0.0
	var fi := (x - origin) / sp
	var fj := (z - origin) / sp
	if fi < 0.0 or fj < 0.0 or fi >= res - 1 or fj >= res - 1:
		return -40.0
	var i := int(fi)
	var j := int(fj)
	var u := fi - i
	var v := fj - j
	var q := j * res + i
	return lerpf(lerpf(heights[q], heights[q + 1], u), lerpf(heights[q + res], heights[q + res + 1], u), v)


func ground_at(x: float, z: float) -> float:
	return height(x, z)


func height_c(x: float, z: float, _c: float) -> float:
	return height(x, z)


## the slope at a world point, degrees
func slope(x: float, z: float) -> float:
	var gx := (height(x + sp, z) - height(x - sp, z)) / (2.0 * sp)
	var gz := (height(x, z + sp) - height(x, z - sp)) / (2.0 * sp)
	return rad_to_deg(atan(sqrt(gx * gx + gz * gz)))


func _cfrac(x: float, z: float) -> Vector2:
	return Vector2(((x - origin) / sp - (ratio - 1) * 0.5) / ratio, ((z - origin) / sp - (ratio - 1) * 0.5) / ratio)


## the tier at a world point (0 coast .. 4 peaks, 255 sea)
func tier_at(x: float, z: float) -> int:
	if c_tier.is_empty():
		return SEA
	var f := _cfrac(x, z)
	var i := clampi(int(round(f.x)), 0, cres - 1)
	var j := clampi(int(round(f.y)), 0, cres - 1)
	return c_tier[j * cres + i]


## metres from the shore (positive on land)
func coast_dist(x: float, z: float) -> float:
	if c_coast.is_empty():
		return 0.0
	var f := _cfrac(x, z)
	if f.x < 0.0 or f.y < 0.0 or f.x >= cres - 1 or f.y >= cres - 1:
		return -2000.0
	return _bilinear(c_coast, Vector2(x, z))


## the ground cover for trees and grass: r forest, g meadow, b sand - none on steep ground, no forest above the tree line
func cover(x: float, z: float, c: float) -> Color:
	var h := height(x, z)
	var s := slope(x, z)
	var t := tier_at(x, z)
	var tf: float = [0.0, 1.0, 1.0, 0.85, 0.45, 0.0][mini(t, 5)] if t != SEA else 0.0
	var steep := 1.0 - smoothstep(24.0, 32.0, s)
	var f := smoothstep(0.02, 0.26, (_n.forest as FastNoiseLite).get_noise_2d(x, z)) * smoothstep(40.0, 200.0, c) * steep * tf \
		* (1.0 - smoothstep(400.0, 470.0, h))
	var m := smoothstep(-0.06, 0.22, (_n.meadow as FastNoiseLite).get_noise_2d(x, z) + (0.12 if t == 3 else 0.0)) * (1.0 - f) * steep
	var sand := (1.0 - smoothstep(2.0, 4.5, h)) if t == 0 or c < 60.0 else 0.0
	return Color(f, m, sand, 0.0)


## height and cover in one go: (height, forest, meadow, sand)
func sample(x: float, z: float) -> Vector4:
	var c := coast_dist(x, z)
	var cv := cover(x, z, c)
	return Vector4(height(x, z), cv.r, cv.g, cv.b)


## how much of a forest is conifers (more of them higher up)
func conifer(x: float, z: float) -> float:
	var k := smoothstep(-0.15, 0.25, (_n.kind as FastNoiseLite).get_noise_2d(x, z))
	return clampf(k + smoothstep(120.0, 320.0, height(x, z)), 0.0, 1.0)


func find_spawn() -> Vector3:
	var p: Vector3 = pois.get("spawn", Vector3.ZERO)
	return Vector3(p.x, height(p.x, p.z), p.z)
