extends RefCounted
## THE CLEAN BASE TERRAIN (scripts/world/base_terrain_gen.gd): one 30 x 30 km island of vast smooth hills and large raised
## areas - no cliffs, no rock formations, no biomes: the canvas regions will be designed on later. Made from a seed and the
## settings in base_terrain_config.gd; the same seed and settings give the same world on every computer.
##
## Grids, all over the same 32.8 km map square (cell centres line up, so fields move between them with Image.resize):
##   broad  512 x 512 (64 m): the slow fields - coast outline, tier field, each tier's own rise and fall, edge steepness
##   check 1024 x 1024 (32 m): distances, regions, routes, the hills' noise
##   plan  2048 x 2048 (16 m): the heights are composed, carved, limited and checked here
##   full  8192 x 8192 (4 m):  the plan upsampled (cubic) - what Terrain3D draws and collides with, in 4.096 km regions
## Steps:
##   1. coast: a rounded-square outline (superellipse, domain-warped, with bays and headlands), the main island only, and the
##      signed distance to the shore. The coast tier is a band along the whole shore (450 - 1500 m wide).
##   2. tiers: a very low-frequency, domain-warped field rising inland, cut into lowlands / highlands / high plateaus /
##      mountains by land share; level by level each tier is kept a ring's width (tier_ring) from the tier two below it, small
##      pieces are folded in, and its signed distance (m) to its edge is measured.
##   3. valleys: courses from heads deep in the high tiers down to the sea, stepping down the tiers in order (a cost-weighted
##      flow field with noise, so they wander), smoothed and bent in slow meanders.
##   4. routes: on every tier edge, gentle ramps spread along it (at least min_routes + spares per edge, more on long edges).
##   5. compose: each tier has its own ground inside its height range; across each edge the height ramps up over a width set by
##      the edge's angle (24 - 37 degrees, varying along it; route_angle on routes) - an escarpment with a rounded top and toe,
##      centred on the edge. Large rolling hills scaled by tier (calmed on escarpments and routes); ridges and peaks only inside
##      the mountains.
##   6. carve: a valley's floor only ever descends towards the sea and climbs at most valley_floor_angle - so where it crosses an
##      escarpment it cuts a broad gentle notch back into the higher tier (a natural route); its sides widen with its depth.
##   7. limit: no slope anywhere steeper than slope_limit (a Lipschitz cap that only lowers), then a light smoothing.
##   8. check: slope per cell; every route walked from its foot to its top on cells under walk_check_angle (failing ones are
##      relaxed and walked again); routes counted per edge; the regions a walker from the spawn can reach; the steep-edge mask.
## Also made: places worth showing (pois), the valleys' courses with their floor heights (for rivers later) and a report.
## Queries (height, slope, tier, ...) take LOCAL coordinates: map = local + offset (the floating origin, floating_origin.gd);
## they are safe from worker threads once `ready`. Everything stored (pois, valleys, routes) is in map coordinates.

const VERSION := 9
const SEA := 255
const BIG := 1e9
## which way the game's sun (main.gd) shines across the ground: the lowland view looks across it, so the slopes ahead are lit
## from the side (their shapes show)
const SUN_TRAVEL := Vector2(0.573, -0.820)

var cfg
var seed_value := 1
var res := 8192
var sp := 4.0
var pres := 2048
var pc := 16.0
var hres := 1024
var hc := 32.0
var ares := 512
var map_size := 32768.0
var world_half := 16384.0
var origin := -16384.0
var region_size := 1024
var regions_per_side := 8
var region_m := 4096.0
## the floating origin: the map coordinates of the local origin (queries take local coordinates)
var offset := Vector2.ZERO
## a Terrain3D region for every square of the map, open sea included (else only where the land or its shelf reaches)
var full_map := true

# results, on the plan grid
var c_h := PackedFloat32Array()
var c_tier := PackedByteArray()
var c_coast := PackedFloat32Array()
var c_slope := PackedFloat32Array()
var c_steep := PackedByteArray()
var c_valley := PackedByteArray()
var c_esc := PackedByteArray()
var cuts := PackedFloat32Array()
var valleys: Array = []
var routes: Array = []
var pois := {}
var report := {}
var ready := false
var stage := ""
var verbose := false
## the full heightmap cut into Terrain3D regions (index rz * regions_per_side + rx; null = open sea, no region)
var region_heights: Array = []
var region_colors: Array = []
## Terrain3D control maps with holes (cut under a region's walls), per region; null = none
var region_controls: Array = []
## the region built on this terrain (tepui_region.gd), once applied
var region = null

var _hreg: Array = []
var _sea_floor := -45.0
var _n := {}
var _f := {}
var _d: Array = []
var _hd: Array = []
var _hcoast := PackedFloat32Array()
var _htier := PackedByteArray()
var _labels: Array = []
var _regions: Array = []
var _rho := PackedFloat32Array()
var _esc := PackedFloat32Array()
var _vw := PackedFloat32Array()
var _t0 := 0


func _init(config) -> void:
	cfg = config
	seed_value = cfg.seed_value
	res = cfg.resolution
	sp = cfg.vertex_spacing
	pres = cfg.plan_resolution
	pc = sp * res / pres
	hres = pres / 2
	hc = pc * 2.0
	ares = pres / 4
	map_size = res * sp
	world_half = map_size * 0.5
	origin = -world_half
	region_size = cfg.region_size
	regions_per_side = res / region_size
	region_m = region_size * sp
	_sea_floor = -cfg.shelf_depth - 1.2
	var s: int = seed_value * 1543
	_n.cwx = _mk(s + 1, 1.0 / 9000.0, 3)
	_n.cwz = _mk(s + 2, 1.0 / 9000.0, 3)
	_n.coast = _mk(s + 3, 1.0 / 3200.0, 4)
	_n.twx = _mk(s + 4, 1.0 / (0.8 * cfg.tier_wavelength), 2)
	_n.twz = _mk(s + 5, 1.0 / (0.8 * cfg.tier_wavelength), 2)
	_n.tier = _mk(s + 6, 1.0 / cfg.tier_wavelength, cfg.tier_octaves)
	_n.surf = _mk(s + 7, 1.0 / cfg.surface_wavelength, 2)
	_n.band = _mk(s + 8, 1.0 / 4500.0, 2)
	_n.angle = _mk(s + 9, 1.0 / cfg.edge_angle_wavelength, 2)
	_n.hill = _mk(s + 10, 1.0 / cfg.hill_wavelength, 3)
	_n.swell = _mk(s + 11, 1.0 / cfg.swell_wavelength, 2)
	_n.ridge = _mk(s + 12, 1.0 / cfg.ridge_wavelength, 4)
	(_n.ridge as FastNoiseLite).fractal_type = FastNoiseLite.FRACTAL_RIDGED
	_n.cost = _mk(s + 13, 1.0 / 2500.0, 3)


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
	report = {"seed": seed_value, "map_km": map_size / 1000.0, "full_res": res, "vertex_spacing_m": sp, "plan_cell_m": pc,
		"times": {}}
	_step("broad fields", _broad_fields)
	_step("hill fields", _hill_fields)
	_step("coast", _coast)
	_step("tiers", _tiers)
	_step("valley courses", _valley_courses)
	_step("routes", _routes)
	_step("compose", _compose)
	_step("carve valleys", _carve)
	_step("slope limit", _limit)
	_step("walk check", _walk_check)
	_step("places", _places)
	_step("masks", _masks)
	_step("backdrop ranges", _backdrop)
	_free_plan()
	_step("full heightmap", _full_res)
	_step("full-res slopes", _full_check)
	report.total_s = (Time.get_ticks_msec() - _t0) / 1000.0
	ready = true


func _step(name: String, fn: Callable) -> void:
	stage = name
	var t := Time.get_ticks_msec()
	fn.call()
	report.times[name] = (Time.get_ticks_msec() - t) / 1000.0
	if verbose:
		print("terrain: %s %.1f s" % [name, report.times[name]])


## run fn(row_from, row_to) over all rows of a grid in bands on worker threads; returns the bands' results in order
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


static func _joinb(parts: Array, key: String) -> PackedByteArray:
	var a := PackedByteArray()
	for p in parts:
		a.append_array(p[key])
	return a


## map x (or z) of the centre of cell i on an n x n grid over the map (lines up with Image.resize between grids)
func _gx(i: int, n: int) -> float:
	return origin + ((i + 0.5) * res / n - 0.5) * sp


## the fractional cell coordinate of map x on an n x n grid
func _gf(x: float, n: int) -> float:
	return ((x - origin) / sp + 0.5) * n / res - 0.5


func _cell(p: Vector2, n: int) -> Vector2i:
	return Vector2i(clampi(int(round(_gf(p.x, n))), 0, n - 1), clampi(int(round(_gf(p.y, n))), 0, n - 1))


## a field resized from n x n to m x m cells (native: bilinear, or cubic)
static func _resize(a: PackedFloat32Array, n: int, m: int, cubic := false) -> PackedFloat32Array:
	var img := Image.create_from_data(n, n, false, Image.FORMAT_RF, a.to_byte_array())
	img.resize(m, m, Image.INTERPOLATE_CUBIC if cubic else Image.INTERPOLATE_BILINEAR)
	return img.get_data().to_float32_array()


## bilinear read of an n x n field at a map point
func _bil(a: PackedFloat32Array, n: int, p: Vector2) -> float:
	var fi := clampf(_gf(p.x, n), 0.0, n - 1.001)
	var fj := clampf(_gf(p.y, n), 0.0, n - 1.001)
	var i := int(fi)
	var j := int(fj)
	var u := fi - i
	var v := fj - j
	var q := j * n + i
	return lerpf(lerpf(a[q], a[q + 1], u), lerpf(a[q + n], a[q + n + 1], u), v)


## the direction a signed distance field rises at a cell (into the tier), unit length
static func _grad_dir(d: PackedFloat32Array, n: int, i: int, j: int) -> Vector2:
	var gx := d[j * n + mini(i + 2, n - 1)] - d[j * n + maxi(i - 2, 0)]
	var gz := d[mini(j + 2, n - 1) * n + i] - d[maxi(j - 2, 0) * n + i]
	var v := Vector2(gx, gz)
	return v.normalized() if v.length() > 1e-6 else Vector2(1.0, 0.0)


# ---- 1. the broad fields and the hills' noise --------------------------------------------------------------------------

func _broad_fields() -> void:
	_f.R = _fit_island()
	var parts := _bands(_broad_rows, ares)
	for key in ["cp", "T", "n1", "n2", "n3", "n4", "band", "angle"]:
		_f["a_" + key] = _join(parts, key)


func _broad_rows(j0: int, j1: int) -> Dictionary:
	var n := (j1 - j0) * ares
	var a_cp := PackedFloat32Array()
	a_cp.resize(n)
	var a_t := PackedFloat32Array()
	a_t.resize(n)
	var a_n1 := PackedFloat32Array()
	a_n1.resize(n)
	var a_n2 := PackedFloat32Array()
	a_n2.resize(n)
	var a_n3 := PackedFloat32Array()
	a_n3.resize(n)
	var a_n4 := PackedFloat32Array()
	a_n4.resize(n)
	var a_band := PackedFloat32Array()
	a_band.resize(n)
	var a_ang := PackedFloat32Array()
	a_ang.resize(n)
	var cwx: FastNoiseLite = _n.cwx
	var cwz: FastNoiseLite = _n.cwz
	var ncoast: FastNoiseLite = _n.coast
	var twx: FastNoiseLite = _n.twx
	var twz: FastNoiseLite = _n.twz
	var ntier: FastNoiseLite = _n.tier
	var nsurf: FastNoiseLite = _n.surf
	var nband: FastNoiseLite = _n.band
	var nang: FastNoiseLite = _n.angle
	var half: float = cfg.island_size * 0.5
	var cw: float = cfg.coast_warp
	var cn: float = cfg.coast_noise
	var R: Vector2 = _f.R
	var rm := sqrt(R.x * R.y)
	var pw: float = cfg.shape_power
	var tw: float = cfg.tier_warp
	var q := 0
	for j in range(j0, j1):
		var z := _gx(j, ares)
		for i in ares:
			var x := _gx(i, ares)
			var wx := x + cw * cwx.get_noise_2d(x, z)
			var wz := z + cw * cwz.get_noise_2d(x, z)
			var qn := pow(pow(absf(wx) / R.x, pw) + pow(absf(wz) / R.y, pw), 1.0 / pw)
			var c := rm * (1.0 - qn) + cn * ncoast.get_noise_2d(x, z)
			a_cp[q] = minf(c, minf(half - 50.0 - absf(x), half - 50.0 - absf(z)))
			var tx := x + tw * twx.get_noise_2d(x, z)
			var tz := z + tw * twz.get_noise_2d(x, z)
			a_t[q] = 0.5 + 0.5 * ntier.get_noise_2d(tx, tz)
			a_n1[q] = clampf(0.5 + 0.62 * nsurf.get_noise_2d(x + 7919.0, z - 5113.0), 0.0, 1.0)
			a_n2[q] = clampf(0.5 + 0.62 * nsurf.get_noise_2d(x + 15838.0, z - 10226.0), 0.0, 1.0)
			a_n3[q] = clampf(0.5 + 0.62 * nsurf.get_noise_2d(x + 23757.0, z - 15339.0), 0.0, 1.0)
			a_n4[q] = clampf(0.5 + 0.62 * nsurf.get_noise_2d(x + 31676.0, z - 20452.0), 0.0, 1.0)
			a_band[q] = clampf(0.5 + 0.7 * nband.get_noise_2d(x, z), 0.0, 1.0)
			a_ang[q] = clampf(0.5 + 0.75 * nang.get_noise_2d(x, z), 0.0, 1.0)
			q += 1
	return {"cp": a_cp, "T": a_t, "n1": a_n1, "n2": a_n2, "n3": a_n3, "n4": a_n4, "band": a_band, "angle": a_ang}


## the outline's radii (x, z) that make the island island_size across both ways (less a little, so the square's edge never
## clips it): measured on a coarse grid, scaled, measured again
func _fit_island() -> Vector2:
	var half: float = cfg.island_size * 0.5
	var cw: float = cfg.coast_warp
	var cn: float = cfg.coast_noise
	var pw: float = cfg.shape_power
	var target: float = cfg.island_size * 0.994
	var cwx: FastNoiseLite = _n.cwx
	var cwz: FastNoiseLite = _n.cwz
	var ncoast: FastNoiseLite = _n.coast
	var n := 256
	var R := Vector2(half - 0.6 * cw - 0.4 * cn, half - 0.6 * cw - 0.4 * cn)
	for it in 5:
		var rm := sqrt(R.x * R.y)
		var x0 := INF
		var x1 := -INF
		var z0 := INF
		var z1 := -INF
		for j in n:
			var z := _gx(j, n)
			for i in n:
				var x := _gx(i, n)
				var wx := x + cw * cwx.get_noise_2d(x, z)
				var wz := z + cw * cwz.get_noise_2d(x, z)
				var qn := pow(pow(absf(wx) / R.x, pw) + pow(absf(wz) / R.y, pw), 1.0 / pw)
				if rm * (1.0 - qn) + cn * ncoast.get_noise_2d(x, z) > 0.0:
					x0 = minf(x0, x)
					x1 = maxf(x1, x)
					z0 = minf(z0, z)
					z1 = maxf(z1, z)
		var cell := map_size / n
		R.x *= target / (x1 - x0 + cell)
		R.y *= target / (z1 - z0 + cell)
	return R


func _hill_fields() -> void:
	var parts := _bands(_hill_rows, hres)
	_f.hill = _resize(_join(parts, "hill"), hres, pres, true)
	_f.swell = _resize(_join(parts, "swell"), hres, pres, true)
	_f.ridge = _resize(_join(parts, "ridge"), hres, pres, true)


func _hill_rows(j0: int, j1: int) -> Dictionary:
	var n := (j1 - j0) * hres
	var a_hill := PackedFloat32Array()
	a_hill.resize(n)
	var a_swell := PackedFloat32Array()
	a_swell.resize(n)
	var a_ridge := PackedFloat32Array()
	a_ridge.resize(n)
	var nhill: FastNoiseLite = _n.hill
	var nswell: FastNoiseLite = _n.swell
	var nridge: FastNoiseLite = _n.ridge
	var sharp: float = cfg.ridge_sharpness
	var q := 0
	for j in range(j0, j1):
		var z := _gx(j, hres)
		for i in hres:
			var x := _gx(i, hres)
			a_hill[q] = nhill.get_noise_2d(x, z)
			a_swell[q] = nswell.get_noise_2d(x, z)
			a_ridge[q] = pow(clampf(0.5 + 0.5 * nridge.get_noise_2d(x, z), 0.0, 1.0), sharp)
			q += 1
	return {"hill": a_hill, "swell": a_swell, "ridge": a_ridge}


# ---- grid tools: floods, labels, distances ----------------------------------------------------------------------------

## cells whose 4-neighbours include one of the other kind (both sides of every edge)
static func _boundary(mask: PackedByteArray, n: int) -> PackedByteArray:
	var b := PackedByteArray()
	b.resize(n * n)
	for j in n:
		for i in n:
			var q := j * n + i
			var m := mask[q]
			if (i > 0 and mask[q - 1] != m) or (i < n - 1 and mask[q + 1] != m) or (j > 0 and mask[q - n] != m) or (j < n - 1 and mask[q + n] != m):
				b[q] = 1
	return b


## distance (m) from every cell to the nearest seed cell: a 3 x 3 chamfer in two raster passes (within about 5 %)
static func _edt(seed: PackedByteArray, n: int, cell: float) -> PackedFloat32Array:
	var d := PackedFloat32Array()
	d.resize(n * n)
	for q in n * n:
		d[q] = 0.0 if seed[q] == 1 else BIG
	var a := cell * 0.95509
	var b := cell * 1.3693
	for j in n:
		for i in n:
			var q := j * n + i
			var v := d[q]
			if v == 0.0:
				continue
			var t: float
			if i > 0:
				t = d[q - 1] + a
				if t < v:
					v = t
			if j > 0:
				var u := q - n
				t = d[u] + a
				if t < v:
					v = t
				if i > 0:
					t = d[u - 1] + b
					if t < v:
						v = t
				if i < n - 1:
					t = d[u + 1] + b
					if t < v:
						v = t
			d[q] = v
	for j in range(n - 1, -1, -1):
		for i in range(n - 1, -1, -1):
			var q := j * n + i
			var v := d[q]
			if v == 0.0:
				continue
			var t: float
			if i < n - 1:
				t = d[q + 1] + a
				if t < v:
					v = t
			if j < n - 1:
				var u := q + n
				t = d[u] + a
				if t < v:
					v = t
				if i < n - 1:
					t = d[u + 1] + b
					if t < v:
						v = t
				if i > 0:
					t = d[u - 1] + b
					if t < v:
						v = t
			d[q] = v
	return d


## signed distance (m) to the edge of a mask: + inside, - outside (the edge lies half a cell between the two sides)
static func _sdf(mask: PackedByteArray, n: int, cell: float) -> PackedFloat32Array:
	var e := _edt(_boundary(mask, n), n, cell)
	for q in n * n:
		e[q] = (e[q] + cell * 0.5) * (1.0 if mask[q] == 1 else -1.0)
	return e


## the signed distance (m) to a mask's edge, smooth: the mask is softened (its 32 m staircase rounded off), the edge is found
## between cells where the softened mask crosses one half, and every cell's true distance to the nearest point of that edge is
## carried in two raster passes. (A chamfer distance has kinks wherever the nearest edge cell changes; heights built on it show
## them as flutes running down every slope.)
func _sdf_smooth(mask: PackedByteArray, n: int) -> PackedFloat32Array:
	var nn := n * n
	var m := PackedFloat32Array()
	m.resize(nn)
	for q in nn:
		m[q] = float(mask[q])
	m = _blur(_blur(_blur(_blur(m, true, n), false, n), true, n), false, n)
	var seeds := PackedVector2Array()
	var dist := PackedFloat32Array()
	dist.resize(nn)
	dist.fill(BIG)
	var idx := PackedInt32Array()
	idx.resize(nn)
	idx.fill(-1)
	for j in n:
		var z := _gx(j, n)
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
				var p := Vector2(_gx(i, n), z).lerp(Vector2(_gx(ni, n), _gx(nj, n)), a / (a - b))
				var si := seeds.size()
				seeds.append(p)
				var d0 := p.distance_to(Vector2(_gx(i, n), z))
				if d0 < dist[q]:
					dist[q] = d0
					idx[q] = si
				var d1 := p.distance_to(Vector2(_gx(ni, n), _gx(nj, n)))
				if d1 < dist[nq]:
					dist[nq] = d1
					idx[nq] = si
	_nearest(dist, idx, seeds, n)
	for q in nn:
		if m[q] < 0.5:
			dist[q] = -dist[q]
	return dist


## the connected pieces (4-neighbour) of a mask: labels per cell (0 = outside) and per piece its size and edge cells
static func _label(mask: PackedByteArray, n: int) -> Dictionary:
	var lab := PackedInt32Array()
	lab.resize(n * n)
	var queue := PackedInt32Array()
	queue.resize(n * n)
	var regs := []
	var nl := 0
	for s in n * n:
		if mask[s] != 1 or lab[s] != 0:
			continue
		nl += 1
		var head := 0
		var tail := 1
		queue[0] = s
		lab[s] = nl
		var edge := PackedInt32Array()
		while head < tail:
			var q := queue[head]
			head += 1
			var i := q % n
			var j := q / n
			var on_edge := false
			for k in 4:
				var ni := i + (1 if k == 0 else (-1 if k == 1 else 0))
				var nj := j + (1 if k == 2 else (-1 if k == 3 else 0))
				if ni < 0 or nj < 0 or ni >= n or nj >= n:
					continue
				var nq := nj * n + ni
				if mask[nq] != 1:
					on_edge = true
				elif lab[nq] == 0:
					lab[nq] = nl
					queue[tail] = nq
					tail += 1
			if on_edge:
				edge.append(q)
		regs.append({"id": nl, "cells": tail, "edge": edge})
	return {"labels": lab, "regions": regs}


## pieces of the mask smaller than min_cells are taken out; holes in it smaller than that (not touching the map's border,
## all inside `inside` > 0) are filled
static func _cleanup(mask: PackedByteArray, n: int, min_cells: int, inside: PackedFloat32Array) -> int:
	var lab := PackedByteArray()
	var queue := PackedInt32Array()
	queue.resize(n * n)
	var changed := 0
	for want in [1, 0]:
		lab.resize(0)
		lab.resize(n * n)
		for s in n * n:
			if mask[s] != want or lab[s] != 0:
				continue
			var head := 0
			var tail := 1
			queue[0] = s
			lab[s] = 1
			var border := false
			var all_in := true
			while head < tail and tail <= min_cells:
				var q := queue[head]
				head += 1
				var i := q % n
				var j := q / n
				if i == 0 or j == 0 or i == n - 1 or j == n - 1:
					border = true
				if inside[q] <= 0.0:
					all_in = false
				for k in 4:
					var ni := i + (1 if k == 0 else (-1 if k == 1 else 0))
					var nj := j + (1 if k == 2 else (-1 if k == 3 else 0))
					if ni < 0 or nj < 0 or ni >= n or nj >= n:
						continue
					var nq := nj * n + ni
					if mask[nq] == want and lab[nq] == 0:
						lab[nq] = 1
						queue[tail] = nq
						tail += 1
			if tail > min_cells:
				# a big piece: mark the rest of it as seen without looking further
				while head < tail:
					var q := queue[head]
					head += 1
					var i := q % n
					var j := q / n
					for k in 4:
						var ni := i + (1 if k == 0 else (-1 if k == 1 else 0))
						var nj := j + (1 if k == 2 else (-1 if k == 3 else 0))
						if ni < 0 or nj < 0 or ni >= n or nj >= n:
							continue
						var nq := nj * n + ni
						if mask[nq] == want and lab[nq] == 0:
							lab[nq] = 1
							queue[tail] = nq
							tail += 1
				continue
			if want == 1 or (not border and all_in):
				for t in tail:
					mask[queue[t]] = 1 - want
				changed += tail
	return changed


# ---- 1. the coast -------------------------------------------------------------------------------------------------------

func _coast() -> void:
	var n := hres
	var nn := n * n
	var cp := _resize(_f.a_cp, ares, hres)
	var land := PackedByteArray()
	land.resize(nn)
	var best := 0
	for q in nn:
		if cp[q] > 0.0:
			land[q] = 1
			if cp[q] > cp[best]:
				best = q
	# the main island only (the land joined to its heart), and no sea pockets inside it (sea not joined to the map's border)
	var island := _flood(land, n, PackedInt32Array([best]), 1)
	for q in nn:
		land[q] = island[q]
	var border := PackedInt32Array()
	for i in n:
		border.append_array(PackedInt32Array([i, (n - 1) * n + i, i * n, i * n + n - 1]))
	var ocean := _flood(land, n, border, 0)
	for q in nn:
		land[q] = 0 if ocean[q] == 1 else 1
	_hcoast = _sdf_smooth(land, n)
	_f.coast = _resize(_hcoast, hres, pres)
	c_coast = _f.coast
	# the island's size
	var x0 := INF
	var x1 := -INF
	var z0 := INF
	var z1 := -INF
	var count := 0
	for j in n:
		for i in n:
			if land[j * n + i] == 1:
				count += 1
				x0 = minf(x0, _gx(i, n))
				x1 = maxf(x1, _gx(i, n))
				z0 = minf(z0, _gx(j, n))
				z1 = maxf(z1, _gx(j, n))
	report.island_km = "%.1f x %.1f" % [(x1 - x0 + hc) / 1000.0, (z1 - z0 + hc) / 1000.0]
	report.land_km2 = snappedf(count * hc * hc / 1e6, 0.1)


## flood from the start cells over cells where mask == want (4-neighbour); 1 where reached
static func _flood(mask: PackedByteArray, n: int, starts: PackedInt32Array, want: int) -> PackedByteArray:
	var seen := PackedByteArray()
	seen.resize(n * n)
	var queue := PackedInt32Array()
	queue.resize(n * n)
	var head := 0
	var tail := 0
	for s in starts:
		if mask[s] == want and seen[s] == 0:
			seen[s] = 1
			queue[tail] = s
			tail += 1
	while head < tail:
		var q := queue[head]
		head += 1
		var i := q % n
		var j := q / n
		if i > 0 and seen[q - 1] == 0 and mask[q - 1] == want:
			seen[q - 1] = 1
			queue[tail] = q - 1
			tail += 1
		if i < n - 1 and seen[q + 1] == 0 and mask[q + 1] == want:
			seen[q + 1] = 1
			queue[tail] = q + 1
			tail += 1
		if j > 0 and seen[q - n] == 0 and mask[q - n] == want:
			seen[q - n] = 1
			queue[tail] = q - n
			tail += 1
		if j < n - 1 and seen[q + n] == 0 and mask[q + n] == want:
			seen[q + n] = 1
			queue[tail] = q + n
			tail += 1
	return seen


# ---- 2. the tiers -------------------------------------------------------------------------------------------------------

func _tiers() -> void:
	var n := hres
	var nn := n * n
	var cd := _hcoast
	var band := _resize(_f.a_band, ares, hres)
	var T := _resize(_f.a_T, ares, hres)
	var bmin: float = cfg.coast_band_min
	var bmax: float = cfg.coast_band_max
	var bias: float = cfg.inland_bias
	var reach: float = cfg.inland_reach
	# level 1 (lowlands and up): everything inland of the coast band
	var d1 := PackedFloat32Array()
	d1.resize(nn)
	var tt := PackedFloat32Array()
	tt.resize(nn)
	for q in nn:
		var d := cd[q] - lerpf(bmin, bmax, band[q])
		d1[q] = d
		tt[q] = lerpf(T[q], smoothstep(0.0, reach, d), bias) * sqrt(smoothstep(0.0, 1800.0, d))
	# cut levels from the wanted shares (percentiles of the field over the land inland of the coast band)
	var vals := PackedFloat32Array()
	for q in range(0, nn, 5):
		if d1[q] > 0.0:
			vals.append(tt[q])
	vals.sort()
	cuts = PackedFloat32Array([0.0])
	var acc := 0.0
	for k in range(2, 5):
		acc += cfg.tier_share[k - 2]
		cuts.append(vals[clampi(int(acc * vals.size()), 0, vals.size() - 1)])
	_hd = [PackedFloat32Array(), d1]
	_labels = [PackedInt32Array(), PackedInt32Array()]
	_regions = [[], []]
	var prev := d1
	var folded := 0
	for k in range(2, 5):
		var ring: float = cfg.tier_ring[k]
		var cut := cuts[k - 1]
		var mask := PackedByteArray()
		mask.resize(nn)
		for q in nn:
			if tt[q] >= cut and prev[q] >= ring:
				mask[q] = 1
		folded += _cleanup(mask, n, int(cfg.min_region_km2[k] * 1e6 / (hc * hc)), prev)
		var lab := _label(mask, n)
		_labels.append(lab.labels)
		_regions.append(lab.regions)
		var d := _sdf_smooth(mask, n)
		_hd.append(d)
		prev = d
	report.cells_folded = folded
	_htier = PackedByteArray()
	_htier.resize(nn)
	var h2: PackedFloat32Array = _hd[2]
	var h3: PackedFloat32Array = _hd[3]
	var h4: PackedFloat32Array = _hd[4]
	for q in nn:
		if cd[q] <= 0.0:
			_htier[q] = SEA
		else:
			_htier[q] = (1 if d1[q] > 0.0 else 0) + (1 if h2[q] > 0.0 else 0) + (1 if h3[q] > 0.0 else 0) + (1 if h4[q] > 0.0 else 0)
	_d = [PackedFloat32Array()]
	for k in range(1, 5):
		_d.append(_resize(_hd[k], hres, pres))
	var nreg := {}
	for k in range(2, 5):
		nreg[cfg.tier_names[k]] = (_regions[k] as Array).size()
	report.regions = nreg


# ---- 3. the valleys' courses --------------------------------------------------------------------------------------------

func _valley_courses() -> void:
	valleys = []
	if cfg.valleys <= 0:
		return
	# a flow field on the broad grid: cost-weighted distance to the sea that only spreads into the same tier or a higher one, so
	# following it downhill always steps down (or level) in tier; noise in the cost makes the courses wander
	var n := ares
	var nn := n * n
	var tier := PackedByteArray()
	tier.resize(nn)
	var cost := PackedInt32Array()
	cost.resize(nn)
	var ncost: FastNoiseLite = _n.cost
	for j in n:
		for i in n:
			var q := j * n + i
			tier[q] = _htier[(2 * j + 1) * hres + 2 * i + 1]
			cost[q] = 10 + int(52.0 * clampf(0.5 + 0.7 * ncost.get_noise_2d(_gx(i, n), _gx(j, n)), 0.0, 1.0))
	var INF_D := 1 << 30
	var dist := PackedInt32Array()
	dist.resize(nn)
	dist.fill(INF_D)
	var nb := 128
	var buckets := []
	for b in nb:
		buckets.append(PackedInt32Array())
	var pending := 0
	for q in nn:
		if tier[q] == SEA:
			dist[q] = 0
			var b0: PackedInt32Array = buckets[0]
			b0.append(q)
			pending += 1
	var di := [1, -1, 0, 0, 1, 1, -1, -1]
	var dj := [0, 0, 1, -1, 1, -1, 1, -1]
	var cur := 0
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
			var i := q % n
			var j := q / n
			var t := tier[q]
			for d in 8:
				var ni: int = i + di[d]
				var nj: int = j + dj[d]
				if ni < 0 or nj < 0 or ni >= n or nj >= n:
					continue
				var nq := nj * n + ni
				var nt := tier[nq]
				if nt == SEA or (t != SEA and nt < t):
					continue
				var nd := cur + cost[nq] * (14 if d >= 4 else 10) / 10
				if nd < dist[nq]:
					dist[nq] = nd
					# (a typed local shares the array; writing through an `as` cast would only change a copy)
					var bk: PackedInt32Array = buckets[nd % nb]
					bk.append(nq)
					pending += 1
		cur += 1
	# heads: first the deepest cell of each mountain and plateau region (biggest first), then the deepest high ground left,
	# always at least valley_spacing apart
	var heads := []
	var gap2 := pow(cfg.valley_spacing / (pc * 4.0), 2.0)
	for k in [4, 3]:
		var regs: Array = (_regions[k] as Array).duplicate()
		regs.sort_custom(func(a, b): return a.cells > b.cells)
		var lab: PackedInt32Array = _labels[k]
		var deepest := {}
		for q in nn:
			var l := lab[(2 * (q / n) + 1) * hres + 2 * (q % n) + 1]
			if l > 0 and dist[q] < INF_D and (not deepest.has(l) or dist[q] > dist[deepest[l]]):
				deepest[l] = q
		for r in regs:
			if heads.size() >= cfg.valleys:
				break
			if deepest.has(r.id):
				_try_head(heads, int(deepest[r.id]), n, gap2, k)
	var keys := PackedInt64Array()
	for q in nn:
		if tier[q] != SEA and tier[q] >= 2 and dist[q] < INF_D:
			keys.append((int(dist[q]) << 20) | q)
	keys.sort()
	for ki in range(keys.size() - 1, -1, -1):
		if heads.size() >= cfg.valleys:
			break
		var q: int = keys[ki] & 0xFFFFF
		_try_head(heads, q, n, gap2, tier[q])
	# each course followed down the field to the sea, or into a valley already traced
	var taken := {}
	for h in heads:
		var q: int = h.q
		var pts := PackedVector2Array()
		var joins := -1
		var guard := 0
		while guard < nn:
			guard += 1
			var i := q % n
			var j := q / n
			pts.append(Vector2(_gx(i, n), _gx(j, n)))
			if dist[q] == 0:
				break
			if taken.has(q):
				joins = taken[q]
				break
			taken[q] = valleys.size()
			var nq := q
			var nd := dist[q]
			for d in 8:
				var ni: int = i + di[d]
				var nj: int = j + dj[d]
				if ni < 0 or nj < 0 or ni >= n or nj >= n:
					continue
				var cq := nj * n + ni
				if dist[cq] < nd:
					nd = dist[cq]
					nq = cq
			if nq == q:
				break
			q = nq
		if pts.size() > 12:
			valleys.append({"points": _meander(pts), "level": h.level, "joins": joins})
	var km := 0.0
	for v in valleys:
		var p: PackedVector2Array = v.points
		km += (p.size() - 1) * pc / 1000.0
	report.valleys = valleys.size()
	report.valley_km = snappedf(km, 0.1)


func _try_head(heads: Array, q: int, n: int, gap2: float, level: int) -> void:
	for o in heads:
		var dx: int = (q % n) - (int(o.q) % n)
		var dz: int = (q / n) - (int(o.q) / n)
		if dx * dx + dz * dz < gap2:
			return
	heads.append({"q": q, "level": level})


## a traced course (grid steps) smoothed, bent in slow wide meanders and resampled every plan cell; its two ends stay put
func _meander(pts: PackedVector2Array) -> PackedVector2Array:
	var p := pts.duplicate()
	for it in 10:
		var q := p.duplicate()
		for i in range(1, p.size() - 1):
			q[i] = (p[i - 1] + p[i] * 2.0 + p[i + 1]) * 0.25
		p = q
	var total := 0.0
	for i in range(1, p.size()):
		total += p[i - 1].distance_to(p[i])
	var amp: float = cfg.valley_meander
	var wl: float = cfg.valley_meander_wavelength
	var nm: FastNoiseLite = _n.cost
	var out := PackedVector2Array([p[0]])
	var along := 0.0
	for i in range(1, p.size()):
		var a := p[i - 1]
		var b := p[i]
		var seg := a.distance_to(b)
		var steps := maxi(1, int(seg / pc))
		var dir := (b - a).normalized()
		var side := Vector2(-dir.y, dir.x)
		for s in steps:
			along += seg / steps
			var m := a.lerp(b, float(s + 1) / steps)
			var fade := smoothstep(0.0, 500.0, along) * smoothstep(0.0, 500.0, total - along)
			var swing := amp * fade * (sin(along / wl * TAU + nm.get_noise_1d(along * 0.0007) * 3.0) * 0.75 + nm.get_noise_1d(along * 0.004 + 50.0) * 0.4)
			out.append(m + side * swing)
	return out


# ---- 4. routes over the tier edges --------------------------------------------------------------------------------------

func _routes() -> void:
	routes = []
	_rho = PackedFloat32Array()
	_rho.resize(pres * pres)
	_f.n1 = _resize(_f.a_n1, ares, pres)
	_f.n2 = _resize(_f.a_n2, ares, pres)
	_f.n3 = _resize(_f.a_n3, ares, pres)
	_f.n4 = _resize(_f.a_n4, ares, pres)
	_f.band = _resize(_f.a_band, ares, pres)
	_f.angle = _resize(_f.a_angle, ares, pres)
	# valley crossings: check cells within 1 km of a course are kept clear of ramps (the valleys make their own routes)
	var n := hres
	var near_v := PackedByteArray()
	near_v.resize(n * n)
	var rr := int(ceil(1000.0 / hc))
	for v in valleys:
		var pts: PackedVector2Array = v.points
		for s in range(0, pts.size(), 8):
			var c := _cell(pts[s], n)
			for j in range(maxi(c.y - rr, 0), mini(c.y + rr + 1, n)):
				for i in range(maxi(c.x - rr, 0), mini(c.x + rr + 1, n)):
					if (i - c.x) * (i - c.x) + (j - c.y) * (j - c.y) <= rr * rr:
						near_v[j * n + i] = 1
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector2i(seed_value, 777))
	for k in range(2, 5):
		for r in _regions[k]:
			var edge: PackedInt32Array = r.edge
			if edge.size() < 4:
				continue
			var cand := PackedInt32Array()
			for q in edge:
				if near_v[q] == 0:
					cand.append(q)
			if cand.size() < 2:
				cand = edge
			var want: int = clampi(int(round(edge.size() * hc / cfg.route_spacing)), cfg.min_routes, cfg.max_routes) + cfg.spare_routes
			want = mini(want, cand.size())
			var picks := PackedInt32Array([cand[rng.randi() % cand.size()]])
			while picks.size() < want:
				var best := -1
				var bd := -1.0
				for q in cand:
					var md := INF
					for o in picks:
						var dx := (q % n) - (o % n)
						var dz := (q / n) - (o / n)
						md = minf(md, dx * dx + dz * dz)
					if md > bd:
						bd = md
						best = q
				picks.append(best)
			for q in picks:
				_stamp_route(k, r.id, q)


## tier k's own ground at a plan cell (no hills): its broad rise and fall inside its range
func _surface(k: int, q: int) -> float:
	var lo: float = cfg.tier_low[k]
	var span: float = cfg.tier_high[k] - lo
	var a: float = cfg.surface_lo[k]
	var b: float = cfg.surface_hi[k]
	match k:
		0:
			var c: float = (_f.coast as PackedFloat32Array)[q]
			var w := lerpf(cfg.coast_band_min, cfg.coast_band_max, (_f.band as PackedFloat32Array)[q])
			return lo + span * (a + (b - a) * smoothstep(0.0, w, c))
		1:
			return lo + span * (a + (b - a) * (_f.n1 as PackedFloat32Array)[q] * smoothstep(0.0, 3000.0, (_d[1] as PackedFloat32Array)[q]))
		2:
			return lo + span * (a + (b - a) * (_f.n2 as PackedFloat32Array)[q])
		3:
			return lo + span * (a + (b - a) * (_f.n3 as PackedFloat32Array)[q])
	return lo + span * (a + (b - a) * (_f.n4 as PackedFloat32Array)[q])


func _stamp_route(k: int, region: int, q: int) -> void:
	var i0 := q % hres
	var j0 := q / hres
	var p0 := Vector2(_gx(i0, hres), _gx(j0, hres))
	var nrm := _grad_dir(_hd[k], hres, i0, j0)
	var t := Vector2(-nrm.y, nrm.x)
	var pq := _cell(p0, pres)
	var dh := _surface(k, pq.y * pres + pq.x) - _surface(k - 1, pq.y * pres + pq.x)
	var W := dh / (0.75 * tan(deg_to_rad(cfg.route_angle)))
	var hw: float = cfg.route_width * 0.5
	var along_end := hw + 380.0
	var across_end := W * 0.5 + 450.0
	var rc := int(ceil(maxf(along_end, across_end) / pc))
	for j in range(maxi(pq.y - rc, 0), mini(pq.y + rc + 1, pres)):
		var z := _gx(j, pres)
		for i in range(maxi(pq.x - rc, 0), mini(pq.x + rc + 1, pres)):
			var v := Vector2(_gx(i, pres), z) - p0
			var f := (1.0 - smoothstep(hw, along_end, absf(v.dot(t)))) * (1.0 - smoothstep(W * 0.5 + 150.0, across_end, absf(v.dot(nrm))))
			var cq := j * pres + i
			if f > _rho[cq]:
				_rho[cq] = f
	routes.append({"level": k, "region": region, "kind": "ramp", "at": p0, "dir": nrm, "width": W, "dh": dh,
		"foot": p0 - nrm * (W * 0.5 + 220.0), "top": p0 + nrm * (W * 0.5 + 220.0), "inner": W * 0.5 + 40.0, "ok": false})


# ---- 5. the heights -------------------------------------------------------------------------------------------------------

func _compose() -> void:
	var parts := _bands(_compose_rows, pres)
	c_h = _join(parts, "h")
	_esc = _join(parts, "e")
	c_tier = _joinb(parts, "t")


func _compose_rows(j0: int, j1: int) -> Dictionary:
	var n := (j1 - j0) * pres
	var out_h := PackedFloat32Array()
	out_h.resize(n)
	var out_e := PackedFloat32Array()
	out_e.resize(n)
	var out_t := PackedByteArray()
	out_t.resize(n)
	var cd: PackedFloat32Array = _f.coast
	var bw: PackedFloat32Array = _f.band
	var d1: PackedFloat32Array = _d[1]
	var d2: PackedFloat32Array = _d[2]
	var d3: PackedFloat32Array = _d[3]
	var d4: PackedFloat32Array = _d[4]
	var n1: PackedFloat32Array = _f.n1
	var n2: PackedFloat32Array = _f.n2
	var n3: PackedFloat32Array = _f.n3
	var n4: PackedFloat32Array = _f.n4
	var an: PackedFloat32Array = _f.angle
	var hill: PackedFloat32Array = _f.hill
	var swell: PackedFloat32Array = _f.swell
	var ridge: PackedFloat32Array = _f.ridge
	var rho := _rho
	var lo: PackedFloat32Array = cfg.tier_low
	var hi: PackedFloat32Array = cfg.tier_high
	var sa: PackedFloat32Array = cfg.surface_lo
	var sb: PackedFloat32Array = cfg.surface_hi
	var ha: PackedFloat32Array = cfg.hill_amp
	var bmin: float = cfg.coast_band_min
	var bmax: float = cfg.coast_band_max
	var amin: float = cfg.edge_angle_min
	var amax: float = cfg.edge_angle_max
	var aroute: float = cfg.route_angle
	var tc := 0.75 * tan(deg_to_rad(cfg.coast_angle))
	var ramp_min := 2.0 * pc
	var r_amp: float = cfg.ridge_amp
	var inset: float = cfg.ridge_inset
	var shelf_w: float = cfg.shelf_width
	var shelf_d: float = cfg.shelf_depth
	var top: float = hi[4]
	var ease_from := top - 120.0
	var sk := PackedFloat32Array()
	sk.resize(5)
	var dk := PackedFloat32Array()
	dk.resize(5)
	var o := 0
	for j in range(j0, j1):
		for i in pres:
			var q := j * pres + i
			var c := cd[q]
			dk[1] = d1[q]
			dk[2] = d2[q]
			dk[3] = d3[q]
			dk[4] = d4[q]
			sk[0] = lo[0] + (hi[0] - lo[0]) * (sa[0] + (sb[0] - sa[0]) * smoothstep(0.0, lerpf(bmin, bmax, bw[q]), c))
			sk[1] = lo[1] + (hi[1] - lo[1]) * (sa[1] + (sb[1] - sa[1]) * n1[q] * smoothstep(0.0, 3000.0, dk[1]))
			sk[2] = lo[2] + (hi[2] - lo[2]) * (sa[2] + (sb[2] - sa[2]) * n2[q])
			sk[3] = lo[3] + (hi[3] - lo[3]) * (sa[3] + (sb[3] - sa[3]) * n3[q])
			sk[4] = lo[4] + (hi[4] - lo[4]) * (sa[4] + (sb[4] - sa[4]) * n4[q])
			var r := rho[q]
			var tn := 0.75 * tan(deg_to_rad(lerpf(lerpf(amin, amax, an[q]), aroute, r)))
			var h := sk[0]
			var amp := ha[0]
			var esc := 0.0
			var w4 := 0.0
			for k in range(1, 5):
				var dh := sk[k] - sk[k - 1]
				var W := maxf(dh / (tc if k == 1 else tn), ramp_min)
				var u := clampf(dk[k] / W + 0.5, 0.0, 1.0)
				var s: float
				if u < 0.25:
					s = u * u * 2.6666667
				elif u > 0.75:
					s = 1.0 - (1.0 - u) * (1.0 - u) * 2.6666667
				else:
					s = (u - 0.125) * 1.3333333
				h += dh * s
				amp += (ha[k] - ha[k - 1]) * s
				if k >= 2:
					esc = maxf(esc, 1.0 - smoothstep(W * 0.5, W * 0.5 + 250.0, absf(dk[k])))
				if k == 4:
					w4 = W
			h += amp * (0.62 * hill[q] + 0.38 * swell[q]) * (1.0 - 0.85 * esc) * (1.0 - 0.75 * r)
			h += r_amp * ridge[q] * smoothstep(w4 * 0.5, w4 * 0.5 + inset, dk[4]) * (1.0 - r)
			if h > ease_from:
				# the highest crests eased in under the top of the mountains' range
				h = ease_from + 120.0 * tanh((h - ease_from) / 120.0)
			var sea := -1.2 - minf(maxf(-c, 0.0), shelf_w) / shelf_w * shelf_d
			out_h[o] = lerpf(sea, h, smoothstep(-60.0, 40.0, c))
			out_e[o] = esc
			if c <= 0.0:
				out_t[o] = SEA
			else:
				out_t[o] = (1 if dk[1] > 0.0 else 0) + (1 if dk[2] > 0.0 else 0) + (1 if dk[3] > 0.0 else 0) + (1 if dk[4] > 0.0 else 0)
			o += 1
	return {"h": out_h, "e": out_e, "t": out_t}


# ---- 6. the valleys carve their beds ------------------------------------------------------------------------------------

func _carve() -> void:
	_vw = PackedFloat32Array()
	_vw.resize(pres * pres)
	if valleys.is_empty():
		return
	var tanf := PackedFloat32Array()
	for a in cfg.valley_floor_angle:
		tanf.append(tan(deg_to_rad(a)))
	var vd: PackedFloat32Array = cfg.valley_depth
	var seed_pos := PackedVector2Array()
	var seed_floor := PackedFloat32Array()
	var seed_hw := PackedFloat32Array()
	for vi in valleys.size():
		var v: Dictionary = valleys[vi]
		var pts: PackedVector2Array = v.points
		var m := pts.size()
		var hh := PackedFloat32Array()
		hh.resize(m)
		var depth := PackedFloat32Array()
		depth.resize(m)
		var climb := PackedFloat32Array()
		climb.resize(m)
		var tw := PackedInt32Array()
		tw.resize(m)
		for s in m:
			hh[s] = _bil(c_h, pres, pts[s])
			var t := c_tier[_cell(pts[s], pres).y * pres + _cell(pts[s], pres).x]
			depth[s] = vd[0] if t == SEA else vd[t]
			climb[s] = tanf[0] if t == SEA else tanf[t]
			tw[s] = 0 if t == SEA else t
		depth = _smooth1d(depth, 20)
		# down the course it never climbs (a running minimum of the ground less the depth)
		var fl := PackedFloat32Array()
		fl.resize(m)
		var run := INF
		for s in m:
			run = minf(run, hh[s] - depth[s])
			fl[s] = run
		# its mouth: just under the sea, or the floor of the valley it joins
		var end_floor := -1.5
		if int(v.joins) >= 0:
			var trunk: Dictionary = valleys[int(v.joins)]
			var tp: PackedVector2Array = trunk.points
			var tf: PackedFloat32Array = trunk.floor
			var bi := 0
			for s in tp.size():
				if tp[s].distance_squared_to(pts[m - 1]) < tp[bi].distance_squared_to(pts[m - 1]):
					bi = s
			end_floor = tf[bi]
		fl[m - 1] = minf(fl[m - 1], end_floor)
		# up the course it climbs at most valley_floor_angle (that tier's): across an escarpment that cuts a notch back into the
		# higher ground
		for s in range(m - 2, -1, -1):
			fl[s] = minf(fl[s], fl[s + 1] + climb[s] * pts[s].distance_to(pts[s + 1]))
		v.floor = fl
		# broad, and wider where the notch is deep, so its sides stay walkable
		var hw := PackedFloat32Array()
		hw.resize(m)
		for s in m:
			hw[s] = clampf(2.9 * (hh[s] - fl[s]), cfg.valley_halfwidth[tw[s]], cfg.valley_halfwidth_max[tw[s]])
		hw = _smooth1d(_runmax1d(hw, 30), 30)
		v.halfwidth = hw
		seed_pos.append_array(pts)
		seed_floor.append_array(fl)
		seed_hw.append_array(hw)
	# the nearest valley point of every check cell (distance carried in two raster passes)
	var n := hres
	var dist := PackedFloat32Array()
	dist.resize(n * n)
	dist.fill(BIG)
	var idx := PackedInt32Array()
	idx.resize(n * n)
	idx.fill(-1)
	for si in seed_pos.size():
		var c := _cell(seed_pos[si], n)
		var cq := c.y * n + c.x
		var dd := seed_pos[si].distance_to(Vector2(_gx(c.x, n), _gx(c.y, n)))
		if dd < dist[cq]:
			dist[cq] = dd
			idx[cq] = si
	_nearest(dist, idx, seed_pos, n)
	var parts := _bands(_carve_rows.bind(idx, seed_pos, seed_floor, seed_hw), pres)
	c_h = _join(parts, "h")
	_vw = _join(parts, "w")


## nearest-seed propagation: every cell takes its neighbour's seed when that seed is nearer to it (two raster passes)
func _nearest(dist: PackedFloat32Array, idx: PackedInt32Array, seed_pos: PackedVector2Array, n: int) -> void:
	# the neighbours already visited in a forward raster pass (left, up-left, up, up-right); the backward pass mirrors them
	var odi := [-1, -1, 0, 1]
	var odj := [0, -1, -1, -1]
	for pass_i in 2:
		var s := 1 if pass_i == 0 else -1
		for jj in n:
			var j := jj if pass_i == 0 else n - 1 - jj
			var z := _gx(j, n)
			for ii in n:
				var i := ii if pass_i == 0 else n - 1 - ii
				var q := j * n + i
				var x := _gx(i, n)
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
					var d := seed_pos[o].distance_to(Vector2(x, z))
					if d < best:
						best = d
						bi = o
				dist[q] = best
				idx[q] = bi


func _carve_rows(j0: int, j1: int, idx: PackedInt32Array, seed_pos: PackedVector2Array, seed_floor: PackedFloat32Array, seed_hw: PackedFloat32Array) -> Dictionary:
	var n := (j1 - j0) * pres
	var out_h := PackedFloat32Array()
	out_h.resize(n)
	var out_w := PackedFloat32Array()
	out_w.resize(n)
	var o := 0
	for j in range(j0, j1):
		var z := _gx(j, pres)
		for i in pres:
			var q := j * pres + i
			var h := c_h[q]
			var si := idx[(j / 2) * hres + i / 2]
			if si >= 0:
				var hw := seed_hw[si]
				var d := seed_pos[si].distance_to(Vector2(_gx(i, pres), z))
				if d < hw:
					var f := smoothstep(0.18, 1.0, d / hw)
					var fl := seed_floor[si]
					if h > fl:
						h = minf(h, fl + (h - fl) * f)
					out_w[o] = 1.0 - f
			out_h[o] = h
			o += 1
	return {"h": out_h, "w": out_w}


static func _smooth1d(a: PackedFloat32Array, r: int) -> PackedFloat32Array:
	var n := a.size()
	var acc := PackedFloat32Array()
	acc.resize(n + 1)
	for i in n:
		acc[i + 1] = acc[i] + a[i]
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var i0 := maxi(i - r, 0)
		var i1 := mini(i + r + 1, n)
		out[i] = (acc[i1] - acc[i0]) / (i1 - i0)
	return out


static func _runmax1d(a: PackedFloat32Array, r: int) -> PackedFloat32Array:
	var n := a.size()
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var m := a[i]
		for k in range(maxi(i - r, 0), mini(i + r + 1, n)):
			m = maxf(m, a[k])
		out[i] = m
	return out


# ---- 7. nothing steeper than the limit ----------------------------------------------------------------------------------

## the Lipschitz cap: no step between neighbouring cells may climb more than slope_limit (two raster passes, it only ever
## lowers); then one binomial smoothing pass, which can only make slopes gentler
func _limit() -> void:
	var n := pres
	var h := c_h
	var before := h.duplicate()
	var la := tan(deg_to_rad(cfg.slope_limit)) * pc
	var ld := la * sqrt(2.0)
	for j in n:
		for i in n:
			var q := j * n + i
			var v := h[q]
			var t: float
			if i > 0:
				t = h[q - 1] + la
				if t < v:
					v = t
			if j > 0:
				var u := q - n
				t = h[u] + la
				if t < v:
					v = t
				if i > 0:
					t = h[u - 1] + ld
					if t < v:
						v = t
				if i < n - 1:
					t = h[u + 1] + ld
					if t < v:
						v = t
			h[q] = v
	for j in range(n - 1, -1, -1):
		for i in range(n - 1, -1, -1):
			var q := j * n + i
			var v := h[q]
			var t: float
			if i < n - 1:
				t = h[q + 1] + la
				if t < v:
					v = t
			if j < n - 1:
				var u := q + n
				t = h[u] + la
				if t < v:
					v = t
				if i < n - 1:
					t = h[u + 1] + ld
					if t < v:
						v = t
				if i > 0:
					t = h[u - 1] + ld
					if t < v:
						v = t
			h[q] = v
	var lowered := 0
	var most := 0.0
	for q in n * n:
		var dd := before[q] - h[q]
		if dd > 0.05:
			lowered += 1
			most = maxf(most, dd)
	report.limit_lowered_km2 = snappedf(lowered * pc * pc / 1e6, 0.01)
	report.limit_most_m = snappedf(most, 0.1)
	c_h = _blur(_blur(_blur(_blur(h, true), false), true), false)


func _blur(a: PackedFloat32Array, horizontal: bool, size := -1) -> PackedFloat32Array:
	var n := pres if size < 0 else size
	var parts := _bands(func(j0: int, j1: int) -> PackedFloat32Array:
		var out := PackedFloat32Array()
		out.resize((j1 - j0) * n)
		var o := 0
		for j in range(j0, j1):
			for i in n:
				var q := j * n + i
				if horizontal:
					out[o] = (a[j * n + maxi(i - 1, 0)] + 2.0 * a[q] + a[j * n + mini(i + 1, n - 1)]) * 0.25
				else:
					out[o] = (a[maxi(j - 1, 0) * n + i] + 2.0 * a[q] + a[mini(j + 1, n - 1) * n + i]) * 0.25
				o += 1
		return out, n)
	var r := PackedFloat32Array()
	for p in parts:
		r.append_array(p)
	return r


# ---- 8. the walk check ----------------------------------------------------------------------------------------------------

func _slopes() -> void:
	var n := pres
	var parts := _bands(func(j0: int, j1: int) -> PackedFloat32Array:
		var out := PackedFloat32Array()
		out.resize((j1 - j0) * n)
		var o := 0
		for j in range(j0, j1):
			for i in n:
				var gx := (c_h[j * n + mini(i + 1, n - 1)] - c_h[j * n + maxi(i - 1, 0)]) / (2.0 * pc)
				var gz := (c_h[mini(j + 1, n - 1) * n + i] - c_h[maxi(j - 1, 0) * n + i]) / (2.0 * pc)
				out[o] = rad_to_deg(atan(sqrt(gx * gx + gz * gz)))
				o += 1
		return out, n)
	c_slope = PackedFloat32Array()
	for p in parts:
		c_slope.append_array(p)


func _walk_check() -> void:
	_slopes()
	_valley_routes()
	var lim: float = cfg.walk_check_angle
	var relaxed := false
	for r in routes:
		r.ok = _route_walk(r, lim)
		if not r.ok:
			_relax_route(r)
			r.relaxed = true
			relaxed = true
	if relaxed:
		# a relaxed zone has a seam at its border: the cap and smoothing once more, then every route walked again
		_limit()
		_slopes()
		for r in routes:
			r.ok = _route_walk(r, lim)
	var per := {}
	for r in routes:
		var key := "%d:%d" % [r.level, r.region]
		per[key] = int(per.get(key, 0)) + (1 if r.ok else 0)
	var short := []
	var edges := 0
	for k in range(2, 5):
		for reg in _regions[k]:
			if (reg.edge as PackedInt32Array).size() < 4:
				continue
			edges += 1
			var got: int = per.get("%d:%d" % [k, reg.id], 0)
			if got < cfg.min_routes:
				short.append("%s region %d: %d" % [cfg.tier_names[k], reg.id, got])
	report.edges_checked = edges
	report.edges_short_of_routes = short
	report.routes = {"ramps": routes.filter(func(r): return r.kind == "ramp").size(),
		"valley crossings": routes.filter(func(r): return r.kind == "valley").size(),
		"walkable": routes.filter(func(r): return r.ok).size(),
		"relaxed": routes.filter(func(r): return r.get("relaxed", false)).size()}
	# slope statistics over the land
	var land := 0
	var walk := 0
	var over35 := 0
	var over40 := 0
	var steepest := 0.0
	for q in pres * pres:
		if c_tier[q] == SEA:
			continue
		land += 1
		var s := c_slope[q]
		steepest = maxf(steepest, s)
		if s <= cfg.max_walk_angle:
			walk += 1
		else:
			over35 += 1
		if s > 40.0:
			over40 += 1
	report.plan_slopes = {"walkable_share": snappedf(float(walk) / maxi(land, 1), 0.001),
		"over_35_share": snappedf(float(over35) / maxi(land, 1), 0.0001), "over_40_share": snappedf(float(over40) / maxi(land, 1), 0.0001),
		"steepest_deg": snappedf(steepest, 0.1)}
	report.reachable = _reachability(lim)


## the valleys as routes: where a course crosses a tier edge, from well below the edge to well inside the tier above
func _valley_routes() -> void:
	for vi in valleys.size():
		var v: Dictionary = valleys[vi]
		var pts: PackedVector2Array = v.points
		var m := pts.size()
		for k in range(2, 5):
			var dk: PackedFloat32Array = _d[k]
			for s in range(1, m):
				# the course runs downhill: a crossing is where it leaves tier k for the tier below
				if _bil(dk, pres, pts[s - 1]) > 0.0 and _bil(dk, pres, pts[s]) <= 0.0:
					var a := s
					while a < m - 1 and _bil(dk, pres, pts[a]) > -300.0:
						a += 1
					var b := s - 1
					while b > 0 and _bil(dk, pres, pts[b]) < 300.0 and pts[b].distance_to(pts[s]) < 6000.0:
						b -= 1
					var hc_cell := _cell(pts[b], hres)
					var region: int = (_labels[k] as PackedInt32Array)[hc_cell.y * hres + hc_cell.x]
					routes.append({"level": k, "region": region, "kind": "valley", "valley": vi, "at": pts[s],
						"dir": (pts[b] - pts[a]).normalized(), "foot": pts[a], "top": pts[b], "inner": 280.0, "ok": false})


## walk a route: from its foot (the first walkable land on the way up) over cells no steeper than lim to its top, or anywhere
## well inside the tier above - a flood inside a box round the route
func _route_walk(r: Dictionary, lim: float) -> bool:
	var k: int = r.level
	var foot: Vector2 = r.foot
	var top: Vector2 = r.top
	var inner: float = r.inner
	var dk: PackedFloat32Array = _d[k]
	var a := _cell(foot, pres)
	for s in 31:
		var c0 := _cell(foot.lerp(top, s / 60.0), pres)
		var q0 := c0.y * pres + c0.x
		if c_tier[q0] != SEA and c_slope[q0] <= lim:
			a = c0
			break
	var b := _cell(top, pres)
	var i0 := maxi(mini(a.x, b.x) - 48, 0)
	var i1 := mini(maxi(a.x, b.x) + 48, pres - 1)
	var j0 := maxi(mini(a.y, b.y) - 48, 0)
	var j1 := mini(maxi(a.y, b.y) + 48, pres - 1)
	var bw := i1 - i0 + 1
	var seen := PackedByteArray()
	seen.resize(bw * (j1 - j0 + 1))
	var queue := PackedInt32Array([a.y * pres + a.x])
	seen[(a.y - j0) * bw + a.x - i0] = 1
	var head := 0
	while head < queue.size():
		var q := queue[head]
		head += 1
		var i := q % pres
		var j := q / pres
		if (absi(i - b.x) <= 3 and absi(j - b.y) <= 3) or (c_tier[q] != SEA and c_tier[q] >= k and dk[q] >= inner):
			return true
		for d in 8:
			var ni := i + (1 if d == 0 or d == 4 or d == 5 else (-1 if d == 1 or d == 6 or d == 7 else 0))
			var nj := j + (1 if d == 2 or d == 4 or d == 6 else (-1 if d == 3 or d == 5 or d == 7 else 0))
			if ni < i0 or nj < j0 or ni > i1 or nj > j1:
				continue
			var sq := (nj - j0) * bw + ni - i0
			if seen[sq] == 1:
				continue
			var nq := nj * pres + ni
			if c_tier[nq] == SEA or c_slope[nq] > lim:
				continue
			seen[sq] = 1
			queue.append(nq)
	return false


## a route that does not walk: inside its zone no step between neighbours may be steeper than route_angle + 6 degrees - both
## sides are moved towards each other until that holds; then the zone's slopes are measured again
func _relax_route(r: Dictionary) -> void:
	var lim := tan(deg_to_rad(cfg.route_angle + 6.0)) * pc
	var foot: Vector2 = r.foot
	var top: Vector2 = r.top
	var a := _cell(foot, pres)
	var b := _cell(top, pres)
	var i0 := maxi(mini(a.x, b.x) - 40, 1)
	var i1 := mini(maxi(a.x, b.x) + 40, pres - 2)
	var j0 := maxi(mini(a.y, b.y) - 40, 1)
	var j1 := mini(maxi(a.y, b.y) + 40, pres - 2)
	var mid := (foot + top) * 0.5
	var reach := foot.distance_to(top) * 0.5 + 200.0
	var dir := (top - foot).normalized()
	var side := Vector2(-dir.y, dir.x)
	var zone := PackedInt32Array()
	for j in range(j0, j1 + 1):
		for i in range(i0, i1 + 1):
			var v := Vector2(_gx(i, pres), _gx(j, pres)) - mid
			if absf(v.dot(dir)) <= reach and absf(v.dot(side)) <= 260.0 and c_tier[j * pres + i] != SEA:
				zone.append(j * pres + i)
	var inz := PackedByteArray()
	inz.resize(pres * pres)
	for q in zone:
		inz[q] = 1
	var lims := [lim, lim, lim, lim, lim * 1.4142, lim * 1.4142, lim * 1.4142, lim * 1.4142]
	var active := zone
	var mark := PackedByteArray()
	mark.resize(pres * pres)
	var sweeps := 0
	while not active.is_empty() and sweeps < 200:
		sweeps += 1
		var nxt := PackedInt32Array()
		for q in active:
			mark[q] = 0
		for q in active:
			for d in 8:
				var nq: int = q + (1 if d == 0 or d == 4 or d == 5 else (-1 if d == 1 or d == 6 or d == 7 else 0)) \
					+ pres * (1 if d == 2 or d == 4 or d == 6 else (-1 if d == 3 or d == 5 or d == 7 else 0))
				if inz[nq] == 0:
					continue
				var diff := c_h[q] - c_h[nq]
				var ex := absf(diff) - float(lims[d])
				if ex > 0.05:
					var mv := ex * 0.5 * signf(diff)
					c_h[q] -= mv
					c_h[nq] += mv
					if mark[q] == 0:
						mark[q] = 1
						nxt.append(q)
					if mark[nq] == 0:
						mark[nq] = 1
						nxt.append(nq)
		active = nxt
	for j in range(j0, j1 + 1):
		for i in range(i0, i1 + 1):
			var gx := (c_h[j * pres + i + 1] - c_h[j * pres + i - 1]) / (2.0 * pc)
			var gz := (c_h[(j + 1) * pres + i] - c_h[(j - 1) * pres + i]) / (2.0 * pc)
			c_slope[j * pres + i] = rad_to_deg(atan(sqrt(gx * gx + gz * gz)))


## which regions a walker from the lowlands can reach: one flood over walkable land (check grid, each cell as steep as the
## steepest of its four plan cells)
func _reachability(lim: float) -> Dictionary:
	var n := hres
	var walk := PackedByteArray()
	walk.resize(n * n)
	var start := -1
	var best := INF
	for j in n:
		for i in n:
			var q := j * n + i
			if _htier[q] == SEA:
				continue
			var p0 := (2 * j) * pres + 2 * i
			var s := maxf(maxf(c_slope[p0], c_slope[p0 + 1]), maxf(c_slope[p0 + pres], c_slope[p0 + pres + 1]))
			if s <= lim:
				walk[q] = 1
				if _htier[q] == 1 and s < 6.0:
					var dc := Vector2(_gx(i, n), _gx(j, n)).length()
					if dc < best:
						best = dc
						start = q
	if start < 0:
		return {}
	var seen := _flood(walk, n, PackedInt32Array([start]), 1)
	var out := {}
	var land := 0
	var got := 0
	for q in n * n:
		if _htier[q] != SEA:
			land += 1
			got += seen[q]
	out["land_reached_share"] = snappedf(float(got) / maxi(land, 1), 0.001)
	for k in range(2, 5):
		var lab: PackedInt32Array = _labels[k]
		var regs: Array = _regions[k]
		var hit := PackedByteArray()
		hit.resize(regs.size() + 1)
		for q in n * n:
			if seen[q] == 1 and lab[q] > 0:
				hit[lab[q]] = 1
		var reached := 0
		for r in regs:
			reached += hit[r.id]
		out[cfg.tier_names[k]] = "%d of %d regions" % [reached, regs.size()]
	return out


# ---- places worth showing ---------------------------------------------------------------------------------------------------

func _places() -> void:
	pois = {}
	# a high plateau's edge over the lowlands: from plateau edge cells (away from routes and valleys) find the brink - the highest
	# ground on the way in, within 900 m - and the lowlands on the way out, within 3 km; keep the edge with the biggest drop for
	# its distance whose view out is open (nothing on the way out as high as the brink)
	var d3: PackedFloat32Array = _hd[3]
	var best := {}
	var best_score := -INF
	var best_low := {}
	var best_low_score := -INF
	for r in _regions[3]:
		var edge: PackedInt32Array = r.edge
		for ei in range(0, edge.size(), 2):
			var q: int = edge[ei]
			var i := q % hres
			var j := q / hres
			var p0 := Vector2(_gx(i, hres), _gx(j, hres))
			var pq := _cell(p0, pres)
			if _rho[pq.y * pres + pq.x] > 0.02 or _vw[pq.y * pres + pq.x] > 0.02:
				continue
			var nrm := _grad_dir(d3, hres, i, j)
			# the brink: going in, the first gentle ground after the steep slope (on the plateau itself, not up into the mountains)
			var brink := Vector2.INF
			var steep := false
			var top: float = cfg.tier_high[3] + 30.0
			for s in range(1, 76):
				var w := p0 + nrm * (s * 12.0)
				if _tier_plan(w) >= 4 or _bil(c_h, pres, w) > top:
					break
				var sl := _slope_plan(w)
				if sl > 22.0:
					steep = true
				elif steep and sl < 9.0:
					brink = w
					break
			if brink == Vector2.INF:
				continue
			var bh := _bil(c_h, pres, brink)
			var low := Vector2.INF
			var hmax := -INF
			for s in range(1, 121):
				var w := p0 - nrm * (s * 25.0)
				var t := _tier_plan(w)
				if t == SEA or t == 0:
					break
				hmax = maxf(hmax, _bil(c_h, pres, w))
				if t == 1 and _slope_plan(w) < 6.0:
					low = w
					break
			if low == Vector2.INF or hmax > bh - 25.0:
				continue
			var lh := _bil(c_h, pres, low)
			var drop := bh - lh
			if drop < 300.0:
				continue
			# a bay rather than a straight edge: high ground also off to both sides of the view, so the slopes frame the lowlands
			var enclosed := 0.0
			for ang in [-0.95, -0.65, 0.65, 0.95]:
				var side := (-nrm).rotated(ang)
				enclosed += clampf((_bil(c_h, pres, brink + side * 2200.0) - lh) / drop, 0.0, 1.0) * 0.25
			var score := drop / brink.distance_to(low) + drop * 0.0004
			var here := {"brink": brink, "low": low, "n": nrm, "drop": drop}
			if score + 0.9 * enclosed > best_score:
				best_score = score + 0.9 * enclosed
				best = here
			# (from below, looking up at it: the slopes lit from the side)
			var lit := score + 0.35 * (1.0 - absf(nrm.dot(SUN_TRAVEL)))
			if lit > best_low_score:
				best_low_score = lit
				best_low = here
	if not best_low.is_empty():
		var brink: Vector2 = best_low.brink
		var low: Vector2 = best_low.low
		var nrm: Vector2 = best_low.n
		# down in the lowlands, a few hundred metres out from the foot of the slopes (the farthest flat lowland within 400 m,
		# before the ground rises again), looking up at the brink
		var lh := _bil(c_h, pres, low)
		var stand := low
		for s in range(1, 9):
			var w := low - nrm * (s * 50.0)
			if _tier_plan(w) != 1 or _bil(c_h, pres, w) > lh + 30.0:
				break
			if _slope_plan(w) < 6.0:
				stand = w
		pois.low_stand = _v3(stand)
		pois.low_look = _v3(brink)
		pois.low_rise = snappedf(best_low.drop, 0.1)
	if not best.is_empty():
		var brink: Vector2 = best.brink
		var low: Vector2 = best.low
		var nrm: Vector2 = best.n
		# on the brink, looking out and down over the lowlands
		pois.edge_stand = _v3(brink - nrm * 4.0)
		pois.edge_look = _v3(low - nrm * 700.0)
		pois.edge_drop = snappedf(best.drop, 0.1)
	# the mountains: the highest ground that is not too steep to stand on, looking the way with the most island in front of it
	var bq := -1
	var bh := -INF
	for j in range(0, pres, 2):
		for i in range(0, pres, 2):
			var q := j * pres + i
			if c_tier[q] == 4 and c_slope[q] < 18.0 and c_h[q] > bh:
				bh = c_h[q]
				bq = q
	if bq >= 0:
		var pk := Vector2(_gx(bq % pres, pres), _gx(bq / pres, pres))
		var dir := Vector2(1.0, 0.0)
		var longest := 0.0
		for a in 24:
			var d := Vector2.from_angle(a * TAU / 24.0)
			var run := 0.0
			while run < 30000.0 and _tier_plan(pk + d * (run + 200.0)) != SEA:
				run += 200.0
			if run > longest:
				longest = run
				dir = d
		pois.mount_stand = _v3(pk)
		pois.mount_look = _v3(pk + dir * minf(longest * 0.45, 9000.0))
		pois.mount_height = snappedf(bh, 0.1)
		pois.mount_view_km = snappedf(longest / 1000.0, 0.1)
	pois.spawn = pois.get("low_stand", _v3(Vector2.ZERO))


func _v3(p: Vector2) -> Vector3:
	return Vector3(p.x, _bil(c_h, pres, p), p.y)


func _tier_plan(p: Vector2) -> int:
	var c := _cell(p, pres)
	return c_tier[c.y * pres + c.x]


func _slope_plan(p: Vector2) -> float:
	var c := _cell(p, pres)
	return c_slope[c.y * pres + c.x]


func _d_plan(k: int, p: Vector2) -> float:
	return _bil(_d[k], pres, p)


# ---- the masks: steep edges (for cliffs later) and valleys --------------------------------------------------------------

func _masks() -> void:
	var nn := pres * pres
	c_steep = PackedByteArray()
	c_steep.resize(nn)
	c_valley = PackedByteArray()
	c_valley.resize(nn)
	c_esc = PackedByteArray()
	c_esc.resize(nn)
	var a0: float = cfg.steep_mask_angle
	var a1: float = cfg.slope_limit + 2.0
	var km := 0
	for q in nn:
		var vw := _vw[q]
		c_valley[q] = int(clampf(vw, 0.0, 1.0) * 255.0)
		if c_tier[q] == SEA:
			continue
		c_esc[q] = int(clampf(_esc[q], 0.0, 1.0) * 255.0)
		var m := _esc[q] * smoothstep(a0, a1, c_slope[q]) * (1.0 - vw) * (1.0 - _rho[q])
		c_steep[q] = int(clampf(m, 0.0, 1.0) * 255.0)
		if m > 0.5:
			km += 1
	report.steep_mask_km2 = snappedf(km * pc * pc / 1e6, 0.01)
	# the tiers: area and heights (min / mean / max) on the plan grid
	var tiers := []
	for k in 5:
		tiers.append({"name": cfg.tier_names[k], "cells": 0, "lo": INF, "hi": -INF, "sum": 0.0, "in_range": 0, "core": 0, "core_in": 0})
	for q in nn:
		var t := c_tier[q]
		if t == SEA:
			continue
		var e: Dictionary = tiers[t]
		var h := c_h[q]
		e.cells += 1
		e.lo = minf(e.lo, h)
		e.hi = maxf(e.hi, h)
		e.sum += h
		var inside: bool = h >= cfg.tier_low[t] - 0.5 and h <= cfg.tier_high[t] + 0.5
		if inside:
			e.in_range += 1
		if _esc[q] < 0.3 and _vw[q] < 0.2:
			e.core += 1
			if inside:
				e.core_in += 1
	var out := []
	for e in tiers:
		var cnt: int = e.cells
		out.append("%s: %.0f km2, %.0f-%.0f m (mean %.0f), %.0f%% inside its range (%.0f%% away from edges and valleys)" % [e.name,
			cnt * pc * pc / 1e6, e.lo, e.hi, e.sum / maxi(cnt, 1), 100.0 * e.in_range / maxi(cnt, 1), 100.0 * e.core_in / maxi(int(e.core), 1)])
	report.tiers = out


func _free_plan() -> void:
	_f = {}
	_d = []
	_hd = []
	_hcoast = PackedFloat32Array()
	_htier = PackedByteArray()
	_labels = []
	_regions = []
	_rho = PackedFloat32Array()
	_esc = PackedFloat32Array()
	_vw = PackedFloat32Array()


# ---- the full heightmap, in Terrain3D regions -------------------------------------------------------------------------

## big mountain ranges in a ring round the tepui region (backdrop_*): ridged massifs whose crests reach backdrop_base +
## backdrop_height, gaps between them except in the directions the region's bookmarks look in; only on land, easing out toward
## the coast, never lowering ground that is already higher. Scenery: nothing walks up them.
func _backdrop() -> void:
	if cfg.backdrop_height <= 0.0:
		return
	var nr := _mk(seed_value + 91, 1.0 / cfg.backdrop_wavelength, 3)
	nr.fractal_type = FastNoiseLite.FRACTAL_RIDGED
	var ns := _mk(seed_value + 94, 1.5 / cfg.backdrop_wavelength, 2)
	var na := _mk(seed_value + 92, 1.0 / 7000.0, 1)
	var nwb := _mk(seed_value + 93, 1.0 / 1500.0, 2)
	var c: Vector2 = cfg.backdrop_center
	var r0: float = cfg.backdrop_reach.x
	var r1: float = cfg.backdrop_reach.y
	var views := []
	for a in cfg.backdrop_views:
		views.append(Vector2.from_angle(deg_to_rad(a)))
	var raised := 0
	var top := 0.0
	for j in pres:
		for i in pres:
			var q := j * pres + i
			var h := c_h[q]
			if h < 40.0:
				continue
			var p := Vector2(_gx(i, pres), _gx(j, pres))
			var rel := p - c
			var d := rel.length() + 600.0 * nwb.get_noise_2d(p.x, p.y)
			var band := smoothstep(r0, r0 + 1600.0, d) * (1.0 - smoothstep(r1 - 1800.0, r1, d))
			if band <= 0.0:
				continue
			var arc := smoothstep(-0.25, 0.25, na.get_noise_2d(p.x, p.y))
			var dir := rel.normalized()
			for v in views:
				arc = maxf(arc, smoothstep(cos(deg_to_rad(55.0)), cos(deg_to_rad(25.0)), dir.dot(v)))
			var coast := smoothstep(60.0, 260.0, h)
			# (broad massifs: ridges blended with rounded swells, not a row of spikes)
			var rid := clampf(0.6 * (0.5 + 0.5 * nr.get_noise_2d(p.x, p.y)) + 0.4 * (0.5 + 0.6 * ns.get_noise_2d(p.x, p.y)), 0.0, 1.0)
			var target: float = cfg.backdrop_base + cfg.backdrop_height * band * arc * coast * pow(rid, 1.3)
			if target > h:
				c_h[q] = target
				raised += 1
				top = maxf(top, target)
	report.backdrop = "%d plan cells raised, highest %.0f m" % [raised, top]


func _full_res() -> void:
	var img := Image.create_from_data(pres, pres, false, Image.FORMAT_RF, c_h.to_byte_array())
	img.resize(res, res, Image.INTERPOLATE_CUBIC)
	var col := _colour_plan()
	col.resize(res, res, Image.INTERPOLATE_BILINEAR)
	region_heights = []
	region_colors = []
	var hreg := []
	var rs := region_size
	var per := regions_per_side
	var cells := rs * pres / res
	var count := 0
	for rz in per:
		for rx in per:
			# a region wherever the land or its shelf reaches into it, or everywhere (full_map): the island fills this map, so all 64
			# are made and the sea floor is continuous (a smaller island on a bigger map would leave open-sea regions out)
			var has := full_map
			for j in range(maxi(rz * cells - 2, 0), mini((rz + 1) * cells + 2, pres)):
				if has:
					break
				for i in range(maxi(rx * cells - 2, 0), mini((rx + 1) * cells + 2, pres)):
					if c_h[j * pres + i] > _sea_floor + 0.5:
						has = true
						break
			if not has:
				region_heights.append(null)
				region_colors.append(null)
				hreg.append(PackedByteArray())
				continue
			var hi := img.get_region(Rect2i(rx * rs, rz * rs, rs, rs))
			region_heights.append(hi)
			region_colors.append(col.get_region(Rect2i(rx * rs, rz * rs, rs, rs)))
			hreg.append(hi.get_data())
			count += 1
	_hreg = hreg
	report.terrain3d_regions = "%d of %d (%d x %d samples, %.3f km)" % [count, per * per, rs, rs, rs * sp / 1000.0]


## the colour map Terrain3D carries for the shader: r = tier ((tier + 1) * 51, sea 0), g = valley, b = steep-edge mask,
## a = escarpment (the slopes between tiers)
func _colour_plan() -> Image:
	var parts := _bands(func(j0: int, j1: int) -> PackedByteArray:
		var b := PackedByteArray()
		b.resize((j1 - j0) * pres * 4)
		var o := 0
		for q in range(j0 * pres, j1 * pres):
			var t := c_tier[q]
			b[o] = 0 if t == SEA else (t + 1) * 51
			b[o + 1] = c_valley[q]
			b[o + 2] = c_steep[q]
			b[o + 3] = c_esc[q]
			o += 4
		return b, pres)
	var all := PackedByteArray()
	for p in parts:
		all.append_array(p)
	return Image.create_from_data(pres, pres, false, Image.FORMAT_RGBA8, all)


## the slopes at full resolution, the ground the hero walks on: each 4 m triangle's own slope (every other sample each way)
func _full_check() -> void:
	var idxs := []
	for ri in _hreg.size():
		if not (_hreg[ri] as PackedByteArray).is_empty():
			idxs.append(ri)
	var out := []
	out.resize(idxs.size())
	var rs := region_size
	var gid := WorkerThreadPool.add_group_task(func(t: int):
		var h: PackedFloat32Array = (_hreg[idxs[t]] as PackedByteArray).to_float32_array()
		var land := 0
		var o35 := 0
		var o40 := 0
		var mx := 0.0
		for j in range(0, rs - 1, 2):
			for i in range(0, rs - 1, 2):
				var q := j * rs + i
				if h[q] < 0.5:
					continue
				var gx := (h[q + 1] - h[q]) / sp
				var gz := (h[q + rs] - h[q]) / sp
				var s := rad_to_deg(atan(sqrt(gx * gx + gz * gz)))
				land += 1
				mx = maxf(mx, s)
				if s > 35.0:
					o35 += 1
				if s > 40.0:
					o40 += 1
		out[t] = [land, o35, o40, mx], idxs.size(), -1, true, "terrain check")
	WorkerThreadPool.wait_for_group_task_completion(gid)
	var land := 0
	var o35 := 0
	var o40 := 0
	var mx := 0.0
	for r in out:
		land += int(r[0])
		o35 += int(r[1])
		o40 += int(r[2])
		mx = maxf(mx, float(r[3]))
	report.full_res_slopes = {"steepest_deg": snappedf(mx, 0.1), "over_35_share": snappedf(float(o35) / maxi(land, 1), 0.0001),
		"over_40_share": snappedf(float(o40) / maxi(land, 1), 0.00001)}


# ---- the cache ------------------------------------------------------------------------------------------------------------

func save(path: String) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return
	var vs := []
	for v in valleys:
		vs.append({"points": v.points, "floor": v.get("floor", PackedFloat32Array()), "halfwidth": v.get("halfwidth", PackedFloat32Array()),
			"level": v.level, "joins": v.joins})
	f.store_var({"version": VERSION, "res": res, "pres": pres, "cuts": cuts, "pois": pois, "report": report, "valleys": vs,
		"routes": routes})
	f.store_buffer(c_h.to_byte_array())
	f.store_buffer(c_coast.to_byte_array())
	f.store_buffer(c_tier)
	f.store_buffer(c_slope.to_byte_array())
	f.store_buffer(c_steep)
	f.store_buffer(c_valley)
	f.store_buffer(c_esc)
	f.close()


func load_cache(path: String) -> bool:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return false
	var meta = f.get_var()
	if typeof(meta) != TYPE_DICTIONARY or meta.get("version", -1) != VERSION or meta.res != res or meta.pres != pres:
		return false
	var nn := pres * pres
	cuts = meta.cuts
	pois = meta.pois
	report = meta.report
	valleys = meta.valleys
	routes = meta.routes
	c_h = f.get_buffer(nn * 4).to_float32_array()
	c_coast = f.get_buffer(nn * 4).to_float32_array()
	c_tier = f.get_buffer(nn)
	c_slope = f.get_buffer(nn * 4).to_float32_array()
	c_steep = f.get_buffer(nn)
	c_valley = f.get_buffer(nn)
	c_esc = f.get_buffer(nn)
	f.close()
	if c_esc.size() != nn:
		return false
	var t := Time.get_ticks_msec()
	_full_res()
	report.cached = true
	report.load_s = (Time.get_ticks_msec() - t) / 1000.0
	ready = true
	return true


# ---- queries (local coordinates; safe from worker threads once ready) -------------------------------------------------

## the ground height at a point, as Terrain3D draws it (bilinear between the 4 m samples)
func height(x: float, z: float) -> float:
	if _hreg.is_empty():
		return 0.0
	var fi := (x + offset.x - origin) / sp
	var fj := (z + offset.y - origin) / sp
	if fi < 0.0 or fj < 0.0 or fi >= res - 1 or fj >= res - 1:
		return _sea_floor
	var i := int(fi)
	var j := int(fj)
	var u := fi - i
	var v := fj - j
	return lerpf(lerpf(_px(i, j), _px(i + 1, j), u), lerpf(_px(i, j + 1), _px(i + 1, j + 1), u), v)


func _px(i: int, j: int) -> float:
	var b: PackedByteArray = _hreg[(j / region_size) * regions_per_side + i / region_size]
	if b.is_empty():
		return _sea_floor
	return b.decode_float(((j % region_size) * region_size + i % region_size) * 4)


func ground_at(x: float, z: float) -> float:
	return height(x, z)


func height_c(x: float, z: float, _c: float) -> float:
	return height(x, z)


## the slope at a point, degrees
func slope(x: float, z: float) -> float:
	var gx := (height(x + sp, z) - height(x - sp, z)) / (2.0 * sp)
	var gz := (height(x, z + sp) - height(x, z - sp)) / (2.0 * sp)
	return rad_to_deg(atan(sqrt(gx * gx + gz * gz)))


func _plan_q(x: float, z: float) -> int:
	if c_tier.is_empty():
		return -1
	var i := clampi(int(round(_gf(x + offset.x, pres))), 0, pres - 1)
	var j := clampi(int(round(_gf(z + offset.y, pres))), 0, pres - 1)
	return j * pres + i


## the tier at a point (0 coast .. 4 mountains, 255 sea)
func tier_at(x: float, z: float) -> int:
	var q := _plan_q(x, z)
	return SEA if q < 0 else c_tier[q]


## metres from the shore (positive on land)
func coast_dist(x: float, z: float) -> float:
	if c_coast.is_empty():
		return 0.0
	return _bil(c_coast, pres, Vector2(x + offset.x, z + offset.y))


## a walkable way over a route (map coordinates, every ~50 m): the shortest path from its foot to its top over planning cells
## no steeper than walk_check_angle (a flood with back-links inside a box round the route); ends at the reachable cell nearest
## the top. For paths or roads over the edges later, and the walk test.
func route_path(r: Dictionary) -> PackedVector2Array:
	var foot: Vector2 = r.foot
	var top: Vector2 = r.top
	var lim: float = cfg.walk_check_angle
	var a := _cell(foot, pres)
	for s in 31:
		var c0 := _cell(foot.lerp(top, s / 60.0), pres)
		var q0 := c0.y * pres + c0.x
		if c_tier[q0] != SEA and c_slope[q0] <= lim:
			a = c0
			break
	var b := _cell(top, pres)
	var i0 := maxi(mini(a.x, b.x) - 48, 0)
	var i1 := mini(maxi(a.x, b.x) + 48, pres - 1)
	var j0 := maxi(mini(a.y, b.y) - 48, 0)
	var j1 := mini(maxi(a.y, b.y) + 48, pres - 1)
	var bw := i1 - i0 + 1
	var back := PackedInt32Array()
	back.resize(bw * (j1 - j0 + 1))
	back.fill(-2)
	var aq := a.y * pres + a.x
	back[(a.y - j0) * bw + a.x - i0] = -1
	var queue := PackedInt32Array([aq])
	var head := 0
	var best := aq
	var bd := INF
	while head < queue.size():
		var q := queue[head]
		head += 1
		var i := q % pres
		var j := q / pres
		var d := Vector2i(i, j).distance_squared_to(b)
		if d < bd:
			bd = d
			best = q
			if d <= 2:
				break
		for k in 8:
			var ni := i + (1 if k == 0 or k == 4 or k == 5 else (-1 if k == 1 or k == 6 or k == 7 else 0))
			var nj := j + (1 if k == 2 or k == 4 or k == 6 else (-1 if k == 3 or k == 5 or k == 7 else 0))
			if ni < i0 or nj < j0 or ni > i1 or nj > j1:
				continue
			var sq := (nj - j0) * bw + ni - i0
			if back[sq] != -2:
				continue
			var nq := nj * pres + ni
			if c_tier[nq] == SEA or c_slope[nq] > lim:
				continue
			back[sq] = q
			queue.append(nq)
	var cells := PackedInt32Array()
	var q := best
	while q >= 0:
		cells.append(q)
		q = back[(q / pres - j0) * bw + q % pres - i0]
	cells.reverse()
	var out := PackedVector2Array()
	for k in range(0, cells.size(), 3):
		out.append(Vector2(_gx(cells[k] % pres, pres), _gx(cells[k] / pres, pres)))
	out.append(Vector2(_gx(best % pres, pres), _gx(best / pres, pres)))
	return out


## the steep-edge mask (0 .. 1): escarpment ground steep enough for cliffs later - data only, nothing shows it
func steep_at(x: float, z: float) -> float:
	var q := _plan_q(x, z)
	return 0.0 if q < 0 else c_steep[q] / 255.0


## how far into a valley floor a point is (0 .. 1)
func valley_at(x: float, z: float) -> float:
	var q := _plan_q(x, z)
	return 0.0 if q < 0 else c_valley[q] / 255.0


## the ground cover for grass and trees: one clean grass everywhere - no forests, meadows or sand (no biomes yet)
func cover(_x: float, _z: float, _c: float) -> Color:
	return Color(0.0, 0.0, 0.0, 0.0)


## height and cover in one go: (height, forest, meadow, sand)
func sample(x: float, z: float) -> Vector4:
	return Vector4(height(x, z), 0.0, 0.0, 0.0)


func conifer(_x: float, _z: float) -> float:
	return 0.0


## a place of interest (stored in map coordinates) as a local point on the ground
func poi(name: String) -> Vector3:
	var p: Vector3 = pois.get(name, Vector3.ZERO)
	var x := p.x - offset.x
	var z := p.z - offset.y
	return Vector3(x, height(x, z), z)


func find_spawn() -> Vector3:
	return poi("spawn")
