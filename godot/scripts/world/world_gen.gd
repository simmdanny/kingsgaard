extends RefCounted
## THE CONTINENT (scripts/world/world_gen.gd): one large island, a pure function of (seed, x, z) - heights in metres, the sea at 0.
## No nodes here: the terrain, tree and grass builders call it from worker threads (FastNoiseLite reads are const).
## - The coast: the distance to a warped circle of island_radius, bent into bays and peninsulas by km-scale noise (coast_dist,
##   metres, positive on land). Grows later by raising island_radius / adding lobes.
## - The land: a beach climbing out of the water, then rolling plains - broad swells and low hills that rise slowly inland.
## - The ground cover: forests (patches 1-3 km), meadows (smaller patches between them), plain grassland everywhere else,
##   sand on the beaches (cover(): r forest, g meadow, b sand).

const SEA_LEVEL := 0.0

var seed_value := 1
var island_radius := 11000.0
var world_half := 16384.0

var _warp: FastNoiseLite
var _coast: FastNoiseLite
var _swell: FastNoiseLite
var _hills: FastNoiseLite
var _detail: FastNoiseLite
var _forest: FastNoiseLite
var _meadow: FastNoiseLite
var _kind: FastNoiseLite


func _init(p_seed: int = 1) -> void:
	seed_value = p_seed
	_warp = _mk(p_seed * 101 + 1, 1.0 / 5200.0, 3)
	_coast = _mk(p_seed * 101 + 2, 1.0 / 2600.0, 4)
	_swell = _mk(p_seed * 101 + 3, 1.0 / 7000.0, 2)
	_hills = _mk(p_seed * 101 + 4, 1.0 / 1500.0, 4)
	_detail = _mk(p_seed * 101 + 5, 1.0 / 180.0, 2)
	_forest = _mk(p_seed * 101 + 6, 1.0 / 1300.0, 3)
	_meadow = _mk(p_seed * 101 + 7, 1.0 / 650.0, 3)
	_kind = _mk(p_seed * 101 + 8, 1.0 / 900.0, 2)


static func _mk(s: int, freq: float, octaves: int) -> FastNoiseLite:
	var n := FastNoiseLite.new()
	n.seed = s
	n.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	n.frequency = freq
	if octaves > 1:
		n.fractal_type = FastNoiseLite.FRACTAL_FBM
		n.fractal_octaves = octaves
		n.fractal_lacunarity = 2.0
		n.fractal_gain = 0.5
	else:
		n.fractal_type = FastNoiseLite.FRACTAL_NONE
	return n


## metres from the coast at (x, z): positive on land, negative at sea
func coast_dist(x: float, z: float) -> float:
	var wx := x + 2400.0 * _warp.get_noise_2d(x, z)
	var wz := z + 2400.0 * _warp.get_noise_2d(x + 7919.0, z - 3571.0)
	return island_radius - sqrt(wx * wx + wz * wz) + 1500.0 * _coast.get_noise_2d(x, z)


func height(x: float, z: float) -> float:
	return height_c(x, z, coast_dist(x, z))


## the height given the coast distance c (callers that already have it skip the warp noise)
func height_c(x: float, z: float, c: float) -> float:
	var sea_h := -1.5 - minf(maxf(-c, 0.0), 2200.0) * 0.016
	if c < -30.0:
		return sea_h
	var inland := smoothstep(0.0, 3500.0, c)
	var swell := _swell.get_noise_2d(x, z) * 0.5 + 0.5
	var hills := _hills.get_noise_2d(x, z) * 0.5 + 0.5
	var land_h := 1.2 + 2.2 * smoothstep(0.0, 140.0, c) + inland * (20.0 * swell + 55.0 * pow(hills, 1.7)) \
		+ 1.3 * _detail.get_noise_2d(x, z) * smoothstep(0.0, 90.0, c)
	return lerpf(sea_h, land_h, smoothstep(-30.0, 30.0, c))


## the ground cover at (x, z) given its coast distance: r forest, g meadow, b sand (the rest is plain grassland)
func cover(x: float, z: float, c: float) -> Color:
	var f := smoothstep(0.02, 0.26, _forest.get_noise_2d(x, z)) * smoothstep(70.0, 280.0, c)
	var m := smoothstep(-0.06, 0.22, _meadow.get_noise_2d(x, z)) * (1.0 - f)
	var s := 1.0 - smoothstep(20.0, 75.0, c)
	return Color(f, m, s, 0.0)


## height and cover in one go: (height, forest, meadow, sand)
func sample(x: float, z: float) -> Vector4:
	var c := coast_dist(x, z)
	var cv := cover(x, z, c)
	return Vector4(height_c(x, z, c), cv.r, cv.g, cv.b)


## how much of a forest is conifers there (0 broadleaf .. 1 conifers)
func conifer(x: float, z: float) -> float:
	return smoothstep(-0.15, 0.25, _kind.get_noise_2d(x, z))


## the ground under a point exactly as the finest terrain chunks draw it: 2 m cells, each split along its (0,0)-(1,1) diagonal
func ground_at(x: float, z: float) -> float:
	var gx := floorf(x * 0.5)
	var gz := floorf(z * 0.5)
	var fx := x * 0.5 - gx
	var fz := z * 0.5 - gz
	var x0 := gx * 2.0
	var z0 := gz * 2.0
	var h00 := height(x0, z0)
	var h11 := height(x0 + 2.0, z0 + 2.0)
	if fx >= fz:
		var h10 := height(x0 + 2.0, z0)
		return h00 + (h10 - h00) * fx + (h11 - h10) * fz
	var h01 := height(x0, z0 + 2.0)
	return h00 + (h11 - h01) * fx + (h01 - h00) * fz


## a dry, open spot near the middle of the island to start on
func find_spawn() -> Vector3:
	var best := Vector3(0.0, height(0.0, 0.0), 0.0)
	var r := 0.0
	var a := 0.0
	for i in 600:
		var x := cos(a) * r
		var z := sin(a) * r
		var v := sample(x, z)
		var slope := absf(height(x + 3.0, z) - height(x - 3.0, z)) + absf(height(x, z + 3.0) - height(x, z - 3.0))
		if coast_dist(x, z) > 1200.0 and v.y < 0.15 and slope < 0.6:
			return Vector3(x, v.x, z)
		r += 9.0
		a += 0.61
	return best
