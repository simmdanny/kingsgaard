extends Node3D
## THE BOULDERS (scripts/world/boulders.gd): the browser game's random rocks (src/world/wboulder.js, world look 2 / rock look v59),
## brought over: the same fourteen chunky stones (art/stones/stones.res, baked from tools/stones/make_stones.py - the browser game's
## generator, seeds 1000 + 37 i) in the same stone material (shaders/stone.gdshader), placed by the same rules per 128 m tile:
## six tries a tile, kept with a chance of 0.12 that grows on steep ground (talus: up to 0.97), a size of 0.22-2.1 (mostly small),
## aligned to the slope, turned at random and sunk 25 % (big) to 45 % (small) of its height; two in five of the big ones get one to
## three small companions; never in the water nor where the ground rises steeply within 4 m. Placement is a pure function of the tile
## and the seed (the same boulders on every visit). Like the browser game: three levels by distance (the icosphere of detail 5 within
## 32 m, 4 within 110 m - both casting shadows - 3 beyond, out to 420 m; small ones only to 260 m), one MultiMesh per shape and level,
## refilled when the focus has moved 12 m; a soft contact ring under each one within 176 m.
## The hero walks through them for now, as through the trees (no collision in the Godot rebuild yet).

const TILE := 128.0
const RADIUS := 420.0
const L5 := 32.0
const NEAR := 110.0
const SMALL_END := 260.0
const N_SHAPES := 14
const TILES_PER_FRAME := 3

var gen
var material: Material
var focus := Vector3.ZERO
var stats := {"tiles": 0, "boulders": 0, "drawn": 0}

var _lib: MeshLibrary
var _shape := []  ## per shape: {ymin, ymax, rx}
var _tiles := {}  ## Vector2i -> Array of boulders {si, xf: Transform3D, d: Vector4 (bright, ground h, seed, 0), x, z, h, n: Vector3, rw, sc}
var _queue: Array = []
var _mm := {}  ## "si|lv" -> MultiMeshInstance3D
var _ring: MultiMeshInstance3D
var _last := Vector2(INF, INF)
var _drawn_at := Vector2(INF, INF)
var _dirty := true


func _ready() -> void:
	_lib = load("res://art/stones/stones.res")
	for si in N_SHAPES:
		var m: Mesh = _lib.get_item_mesh(si * 3)
		_shape.append({"ymin": float(m.get_meta("ymin")), "ymax": float(m.get_meta("ymax")), "rx": float(m.get_meta("rx"))})
	var q := QuadMesh.new()
	q.size = Vector2(2.0, 2.0)
	q.orientation = PlaneMesh.FACE_Y
	var rm := MultiMesh.new()
	rm.transform_format = MultiMesh.TRANSFORM_3D
	rm.mesh = q
	_ring = MultiMeshInstance3D.new()
	_ring.multimesh = rm
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/stone_ring.gdshader")
	_ring.material_override = mat
	_ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_ring.custom_aabb = AABB(Vector3(-1e5, -1e3, -1e5), Vector3(2e5, 2e3, 2e5))
	add_child(_ring)


func is_idle() -> bool:
	return _queue.is_empty()


## the art preset's rock material (main.gd apply_preset)
func set_material(m: Material) -> void:
	material = m
	for k in _mm:
		_mm[k].material_override = m


func _process(_dt: float) -> void:
	var f2 := Vector2(focus.x, focus.z)
	if f2.distance_to(_last) > 24.0:
		_last = f2
		_refresh()
	var n := 0
	while not _queue.is_empty() and n < TILES_PER_FRAME:
		var key: Vector2i = _queue.pop_front()
		if _tiles.has(key) and _tiles[key] == null:
			_tiles[key] = _place(key)
			_dirty = true
		n += 1
	if _dirty or f2.distance_to(_drawn_at) > 12.0:
		_draw(f2)


func _refresh() -> void:
	var r := int(ceil(RADIUS / TILE)) + 1
	var cx := int(floor(_last.x / TILE))
	var cz := int(floor(_last.y / TILE))
	var want := {}
	for dz in range(-r, r + 1):
		for dx in range(-r, r + 1):
			var key := Vector2i(cx + dx, cz + dz)
			var x0 := key.x * TILE
			var z0 := key.y * TILE
			var nx := clampf(_last.x, x0, x0 + TILE) - _last.x
			var nz := clampf(_last.y, z0, z0 + TILE) - _last.y
			if sqrt(nx * nx + nz * nz) > RADIUS + 60.0:
				continue
			want[key] = true
			if not _tiles.has(key):
				_tiles[key] = null
				_queue.append(key)
	for key in _tiles.keys():
		if not want.has(key):
			_tiles.erase(key)
			_dirty = true
	_queue = _queue.filter(func(k): return _tiles.has(k))
	_queue.sort_custom(func(a, b): return Vector2(a).distance_squared_to(_last / TILE) < Vector2(b).distance_squared_to(_last / TILE))
	stats.tiles = _tiles.size()


## the boulders of one tile, by the browser game's rules (wbldPlace), from the tile's own seeded stream
func _place(key: Vector2i) -> Array:
	var g = gen
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector3i(g.seed_value + 701, key.x, key.y))
	var x0 := key.x * TILE
	var z0 := key.y * TILE
	var out := []
	for _q in 6:
		var x := x0 + rng.randf() * TILE
		var z := z0 + rng.randf() * TILE
		var pk := rng.randf()
		var sd := rng.randi()
		var e := 1.5
		var sl := Vector2(g.height(x + e, z) - g.height(x - e, z), g.height(x, z + e) - g.height(x, z - e)).length() / (2.0 * e)
		var talus := smoothstep(0.3, 0.75, sl)
		if pk > 0.12 + talus * 0.85:
			continue
		_put(out, x, z, sd, 0.0, x0, z0)
	return out


func _put(out: Array, x: float, z: float, seed: int, fixed: float, x0: float, z0: float) -> void:
	var g = gen
	if x < x0 or z < z0 or x >= x0 + TILE or z >= z0 + TILE:
		return
	var h: float = g.height(x, z)
	if h < 0.3:
		return
	# within reach of a steep rise (a cliff: the ground climbing more than 1 in 1 within 4 m, any way)
	for a in 8:
		var ca := cos(a * 0.7854)
		var sa := sin(a * 0.7854)
		var hp := h
		var dp := 0.0
		for d in [1.2, 2.5, 4.0]:
			var hd: float = g.height(x + ca * d, z + sa * d)
			if (hd - hp) / (d - dp) > 1.05:
				return
			hp = hd
			dp = d
	var e := 0.6
	var gx: float = (g.height(x + e, z) - g.height(x - e, z)) / (2.0 * e)
	var gz: float = (g.height(x, z + e) - g.height(x, z - e)) / (2.0 * e)
	var r := RandomNumberGenerator.new()
	r.seed = seed
	var si := int(floor(r.randf() * N_SHAPES))
	var sh: Dictionary = _shape[si]
	var u := r.randf()
	var sc := fixed if fixed > 0.0 else 0.22 + 1.9 * pow(u, 2.4)
	var hg: float = (sh.ymax - sh.ymin) * sc
	var f := 0.45 - 0.20 * clampf((sc - 0.3) / 1.6, 0.0, 1.0)
	var nrm := Vector3(-gx, 1.0, -gz).normalized()
	var tilt := Quaternion(Vector3.UP, nrm)
	var turn := Quaternion(Vector3.UP, r.randf() * TAU)
	var basis := Basis(tilt * turn).scaled(Vector3(sc, sc, sc))
	var gh: float = g.ground_at(x, z)
	var xf := Transform3D(basis, Vector3(x, gh - f * hg - sh.ymin * sc, z))
	out.append({"si": si, "xf": xf, "d": Color(r.randf(), gh, r.randf(), 0.0), "x": x, "z": z, "h": gh, "n": nrm, "rw": sh.rx * sc, "sc": sc})
	if fixed <= 0.0 and sc > 0.6 and r.randf() < 0.4:
		var k := 1 + int(floor(r.randf() * 3.0))
		for j in k:
			var a := r.randf() * TAU
			var d: float = sc * sh.rx * (1.3 + r.randf())
			var cs := sc * (0.22 + 0.3 * r.randf())
			_put(out, x + cos(a) * d, z + sin(a) * d, seed * 7 + j * 13 + 1, cs, x0, z0)


## per shape and level one MultiMesh, filled from the tiles' lists for where the focus is (and the contact rings)
func _draw(f2: Vector2) -> void:
	_dirty = false
	_drawn_at = f2
	var per := {}
	var rings := []
	var total := 0
	for key in _tiles:
		var list = _tiles[key]
		if list == null:
			continue
		for b in list:
			total += 1
			var d := Vector2(b.x, b.z).distance_to(f2)
			if d > RADIUS or (b.sc < 0.5 and d > SMALL_END):
				continue
			var lv := 0 if d < L5 else (1 if d < NEAR else 2)
			var k := "%d|%d" % [b.si, lv]
			if not per.has(k):
				per[k] = []
			per[k].append(b)
			if d < NEAR * 1.6:
				rings.append(b)
	var drawn := 0
	for k in per.keys():
		var mmi := _fit(k)
		var list: Array = per[k]
		var mm := mmi.multimesh
		if mm.instance_count < list.size():
			mm.instance_count = maxi(list.size(), mm.instance_count * 2)
		mm.visible_instance_count = list.size()
		for j in list.size():
			mm.set_instance_transform(j, list[j].xf)
			mm.set_instance_custom_data(j, list[j].d)
		drawn += list.size()
	for k in _mm:
		if not per.has(k):
			_mm[k].multimesh.visible_instance_count = 0
	var rm := _ring.multimesh
	if rm.instance_count < rings.size():
		rm.instance_count = maxi(rings.size(), rm.instance_count * 2)
	rm.visible_instance_count = rings.size()
	for j in rings.size():
		var b: Dictionary = rings[j]
		var s: float = b.rw * 1.35
		rm.set_instance_transform(j, Transform3D(Basis(Quaternion(Vector3.UP, b.n)).scaled(Vector3(s, 1.0, s)), Vector3(b.x, b.h + 0.04, b.z)))
	stats.boulders = total
	stats.drawn = drawn


func _fit(k: String) -> MultiMeshInstance3D:
	if _mm.has(k):
		return _mm[k]
	var p := k.split("|")
	var si := int(p[0])
	var lv := int(p[1])
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_custom_data = true
	mm.mesh = _lib.get_item_mesh(si * 3 + lv)
	mm.instance_count = 16
	mm.visible_instance_count = 0
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.material_override = material
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if lv < 2 else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mmi.custom_aabb = AABB(Vector3(-1e5, -1e3, -1e5), Vector3(2e5, 2e3, 2e5))
	add_child(mmi)
	_mm[k] = mmi
	return mmi
