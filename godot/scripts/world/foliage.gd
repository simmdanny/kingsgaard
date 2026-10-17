extends Node3D
## THE TREES (scripts/world/foliage.gd): forests, groves and lone trees, per 256 m cell round the focus, instanced (MultiMesh).
## Placement is a pure function of the cell and the seed: a fully jittered 5 m grid, each point kept by the ground cover's chance
## there (forest 0.45, meadow 0.015, grassland 0.004 - well under one, so no rows show), none on sand or below the waterline;
## conifers where the forest's kind leans to them. Each tree gets its own size, a few degrees of lean and its own crown (shader).
## Three meshes a kind, switched by the cell's distance: detailed (casts shadows), simple, and far - the far one draws every other
## tree a little larger (forest canopies merge at that range). Built on worker threads; a job only fills its own result array.

const ProcMeshes := preload("res://scripts/world/proc_meshes.gd")
const CELL := 256.0
const RADIUS := 2300.0
const STEP := 5.0
const LOD_END := [320.0, 850.0, 2400.0]
const MAX_JOBS := 2

var gen
var material: Material
var focus := Vector3.ZERO
var stats := {"cells": 0, "trees": 0, "jobs": 0}
var reach := 1.0  ## the Tree distance setting: scales the radius and the three distance levels (set_reach)

var _meshes := {}
var _cells := {}
var _queue: Array = []
var _running := {}
var _last := Vector2(INF, INF)


func _ready() -> void:
	_meshes = {
		"broad": [ProcMeshes.broadleaf(true), ProcMeshes.broadleaf(false), ProcMeshes.broadleaf_far()],
		"conif": [ProcMeshes.conifer(true), ProcMeshes.conifer(false), ProcMeshes.conifer_far()],
	}


func is_idle() -> bool:
	return _queue.is_empty() and _running.is_empty()


## how far trees reach (1 = full): moves the distance levels of the trees already placed, then cells come and go to match
func set_reach(k: float) -> void:
	if is_equal_approx(k, reach):
		return
	reach = k
	for key in _cells:
		for n in _cells[key].nodes:
			_range(n)
	_last = Vector2(INF, INF)


func _range(mmi: MultiMeshInstance3D) -> void:
	var lod: int = mmi.get_meta("lod")
	mmi.visibility_range_begin = 0.0 if lod == 0 else LOD_END[lod - 1] * reach
	mmi.visibility_range_end = LOD_END[lod] * reach


## the floating origin moved the world back: every cell is dropped and rebuilt round the focus (seeded by its place on the map,
## so the same trees come back)
func shift_origin(_d: Vector3) -> void:
	for id in _running.keys():
		WorkerThreadPool.wait_for_task_completion(id)
	_running.clear()
	for key in _cells:
		for n in _cells[key].nodes:
			n.queue_free()
	_cells.clear()
	_queue.clear()
	stats.trees = 0
	_last = Vector2(INF, INF)


func _process(_dt: float) -> void:
	if gen == null or not gen.ready:
		return
	var f2 := Vector2(focus.x, focus.z)
	if f2.distance_to(_last) > 24.0:
		_last = f2
		_refresh()
	_pump()
	stats.cells = _cells.size()
	stats.jobs = _running.size()


func _refresh() -> void:
	var radius := RADIUS * reach
	var r := int(ceil(radius / CELL))
	var cx := int(floor(_last.x / CELL))
	var cz := int(floor(_last.y / CELL))
	var want := {}
	for dz in range(-r, r + 1):
		for dx in range(-r, r + 1):
			var ix := cx + dx
			var iz := cz + dz
			var x0 := ix * CELL
			var z0 := iz * CELL
			var nx := clampf(_last.x, x0, x0 + CELL) - _last.x
			var nz := clampf(_last.y, z0, z0 + CELL) - _last.y
			var d := sqrt(nx * nx + nz * nz)
			if d > radius or absf(x0 + gen.offset.x) > gen.world_half or absf(z0 + gen.offset.y) > gen.world_half:
				continue
			var key := Vector2i(ix, iz)
			want[key] = true
			if not _cells.has(key):
				var cell := {"key": key, "x0": x0, "z0": z0, "nodes": [], "count": 0, "busy": false, "d": d}
				_cells[key] = cell
				_queue.append(cell)
			else:
				_cells[key].d = d
	for key in _cells.keys():
		var cell: Dictionary = _cells[key]
		if not want.has(key) and not cell.busy:
			for n in cell.nodes:
				n.queue_free()
			stats.trees -= cell.count
			_cells.erase(key)
	_queue = _queue.filter(func(c): return is_same(_cells.get(c.key), c))
	_queue.sort_custom(func(a, b): return a.d < b.d)


func _pump() -> void:
	for id in _running.keys():
		if WorkerThreadPool.is_task_completed(id):
			WorkerThreadPool.wait_for_task_completion(id)
			var job: Array = _running[id]
			_running.erase(id)
			var cell: Dictionary = job[0]
			cell.busy = false
			if is_same(_cells.get(cell.key), cell):
				_place(cell, job[1])
	while _running.size() < MAX_JOBS and not _queue.is_empty():
		var cell: Dictionary = _queue.pop_front()
		var res := []
		cell.busy = true
		var map_key: Vector2i = cell.key + Vector2i(int(gen.offset.x / CELL), int(gen.offset.y / CELL))
		var id := WorkerThreadPool.add_task(_job.bind(map_key, cell.x0, cell.z0, res), false, "trees")
		_running[id] = [cell, res]


## the trees of one cell: per kind a buffer of 3x4 transforms (row-major, MultiMesh's own layout), local to the cell
func _job(key: Vector2i, x0: float, z0: float, res: Array) -> void:
	var g = gen
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector3i(g.seed_value, key.x, key.y))
	var n := int(CELL / STEP)
	var bufs := {"broad": PackedFloat32Array(), "conif": PackedFloat32Array()}
	for j in n:
		for i in n:
			var x := x0 + (i + rng.randf()) * STEP
			var z := z0 + (j + rng.randf()) * STEP
			var r1 := rng.randf()
			var r2 := rng.randf()
			var r3 := rng.randf()
			var r4 := rng.randf()
			var r5 := rng.randf()
			var c: float = g.coast_dist(x, z)
			if c < 20.0:
				continue
			var cv: Color = g.cover(x, z, c)
			var p := (0.45 * cv.r + 0.015 * cv.g + 0.004 * maxf(0.0, 1.0 - cv.r - cv.g)) * (1.0 - cv.b)
			if r1 >= p:
				continue
			var h: float = g.height_c(x, z, c)
			if h < 0.9 or g.slope(x, z) > 30.0:
				continue
			var kind := "conif" if cv.r > 0.3 and r4 < g.conifer(x, z) else "broad"
			var s := (0.7 + 0.7 * r3) * (1.0 if cv.r > 0.3 else 1.15)
			var lean := Basis(Vector3(cos(r5 * 40.0), 0.0, sin(r5 * 40.0)), (r4 - 0.5) * 0.12)
			var b := lean * Basis(Vector3.UP, r2 * TAU) * Basis.from_scale(Vector3(s, s * (0.88 + 0.26 * r5), s))
			var buf: PackedFloat32Array = bufs[kind]
			buf.append_array(PackedFloat32Array([b.x.x, b.y.x, b.z.x, x - x0, b.x.y, b.y.y, b.z.y, h - 0.2, b.x.z, b.y.z, b.z.z, z - z0]))
			bufs[kind] = buf
	res.append(bufs)


func _place(cell: Dictionary, res: Array) -> void:
	var bufs: Dictionary = res[0]
	for kind in bufs:
		var buf: PackedFloat32Array = bufs[kind]
		var count := buf.size() / 12
		if count == 0:
			continue
		cell.count += count
		for lod in 3:
			var b := buf
			if lod == 2:
				b = _thin(buf, 1.2)
			var mm := MultiMesh.new()
			mm.transform_format = MultiMesh.TRANSFORM_3D
			mm.mesh = _meshes[kind][lod]
			mm.instance_count = b.size() / 12
			mm.buffer = b
			var mmi := MultiMeshInstance3D.new()
			mmi.multimesh = mm
			mmi.material_override = material
			mmi.position = Vector3(cell.x0, 0.0, cell.z0)
			mmi.custom_aabb = AABB(Vector3(-10.0, -60.0, -10.0), Vector3(CELL + 20.0, 260.0, CELL + 20.0))
			mmi.set_meta("lod", lod)
			_range(mmi)
			mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if lod == 0 else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_child(mmi)
			cell.nodes.append(mmi)
	stats.trees += cell.count


## every other tree, scaled up by k round its own foot
static func _thin(buf: PackedFloat32Array, k: float) -> PackedFloat32Array:
	var out := PackedFloat32Array()
	var n := buf.size() / 12
	out.resize(((n + 1) / 2) * 12)
	var o := 0
	for t in range(0, n, 2):
		for q in 12:
			var v := buf[t * 12 + q]
			out[o + q] = v if q == 3 or q == 7 or q == 11 else v * k
		o += 12
	return out
