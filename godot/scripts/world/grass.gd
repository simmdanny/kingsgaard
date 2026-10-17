extends Node3D
## THE GRASS (scripts/world/grass.gd): blades round the hero, per 16 m cell within RADIUS, instanced (MultiMesh with custom data).
## Each cell first samples the ground at the finest terrain chunks' own 2 m points (so every blade stands exactly on the drawn
## ground) and the cover there; blades are kept by the cover - thick on grassland, taller on meadows, sparse under forest, none on
## sand - and meadows get flowers. Custom data per blade: (meadow, random, flower kind, forest) for the shader's colours.
## The shader shrinks blades away towards RADIUS, so the edge of the grass never shows.

const ProcMeshes := preload("res://scripts/world/proc_meshes.gd")
const CELL := 16.0
const RADIUS := 64.0
const DENSITY := 7.0
const MAX_JOBS := 2

var gen
var material: Material
var focus := Vector3.ZERO
var stats := {"cells": 0, "blades": 0}
var density_k := 1.0  ## the Grass setting: 0 off, 0.5 low, 1 high (set_density)

var _mesh: Mesh
var _cells := {}
var _queue: Array = []
var _running := {}
var _last := Vector2(INF, INF)


func _ready() -> void:
	_mesh = ProcMeshes.blade()


func is_idle() -> bool:
	return _queue.is_empty() and _running.is_empty()


## the art preset's grass material (main.gd apply_preset): every cell already placed takes it at once
func set_material(m: Material) -> void:
	material = m
	for key in _cells:
		if _cells[key].node != null:
			_cells[key].node.material_override = m


## change the density (0 hides the grass): drops every cell, they rebuild round the hero at the new density
func set_density(k: float) -> void:
	if is_equal_approx(k, density_k):
		return
	density_k = k
	visible = k > 0.0
	for key in _cells:
		if _cells[key].node != null:
			_cells[key].node.queue_free()
	_cells.clear()
	_queue.clear()
	stats.blades = 0
	_last = Vector2(INF, INF)


func _process(_dt: float) -> void:
	if density_k <= 0.0:
		return
	var f2 := Vector2(focus.x, focus.z)
	if f2.distance_to(_last) > 3.0:
		_last = f2
		_refresh()
	_pump()
	stats.cells = _cells.size()


func _refresh() -> void:
	var r := int(ceil(RADIUS / CELL))
	var cx := int(floor(_last.x / CELL))
	var cz := int(floor(_last.y / CELL))
	var want := {}
	for dz in range(-r, r + 1):
		for dx in range(-r, r + 1):
			var key := Vector2i(cx + dx, cz + dz)
			var x0 := key.x * CELL
			var z0 := key.y * CELL
			var nx := clampf(_last.x, x0, x0 + CELL) - _last.x
			var nz := clampf(_last.y, z0, z0 + CELL) - _last.y
			var d := sqrt(nx * nx + nz * nz)
			if d > RADIUS:
				continue
			want[key] = true
			if not _cells.has(key):
				var cell := {"key": key, "x0": x0, "z0": z0, "node": null, "count": 0, "busy": false, "d": d}
				_cells[key] = cell
				_queue.append(cell)
			else:
				_cells[key].d = d
	for key in _cells.keys():
		var cell: Dictionary = _cells[key]
		if not want.has(key) and not cell.busy:
			if cell.node != null:
				cell.node.queue_free()
			stats.blades -= cell.count
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
		var id := WorkerThreadPool.add_task(_job.bind(cell.key, cell.x0, cell.z0, density_k, res), false, "grass")
		_running[id] = [cell, res]


func _job(key: Vector2i, x0: float, z0: float, dens: float, res: Array) -> void:
	var g = gen
	# the cell's ground: 9 x 9 points 2 m apart, as the leaf terrain chunks draw it, and the cover at them
	var hs := PackedFloat32Array()
	var cf := PackedFloat32Array()
	var cm := PackedFloat32Array()
	var cs := PackedFloat32Array()
	for j in 9:
		for i in 9:
			var v: Vector4 = g.sample(x0 + i * 2.0, z0 + j * 2.0)
			hs.append(v.x)
			cf.append(v.y)
			cm.append(v.z)
			cs.append(v.w)
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector3i(g.seed_value + 7, key.x, key.y))
	var n := int(CELL * CELL * DENSITY * dens)
	var buf := PackedFloat32Array()
	buf.resize(n * 16)
	var count := 0
	for k in n:
		var lx := rng.randf() * CELL
		var lz := rng.randf() * CELL
		var r1 := rng.randf()
		var r2 := rng.randf()
		var r3 := rng.randf()
		var r4 := rng.randf()
		var ci := mini(int(lx * 0.5), 7)
		var cj := mini(int(lz * 0.5), 7)
		var fx := lx * 0.5 - ci
		var fz := lz * 0.5 - cj
		var q := cj * 9 + ci
		var forest := lerpf(lerpf(cf[q], cf[q + 1], fx), lerpf(cf[q + 9], cf[q + 10], fx), fz)
		var meadow := lerpf(lerpf(cm[q], cm[q + 1], fx), lerpf(cm[q + 9], cm[q + 10], fx), fz)
		var sand := lerpf(lerpf(cs[q], cs[q + 1], fx), lerpf(cs[q + 9], cs[q + 10], fx), fz)
		if r1 > (1.0 - 0.8 * forest) * (1.0 - smoothstep(0.25, 0.6, sand)):
			continue
		var h: float
		if fx >= fz:
			h = hs[q] + (hs[q + 1] - hs[q]) * fx + (hs[q + 10] - hs[q + 1]) * fz
		else:
			h = hs[q] + (hs[q + 10] - hs[q + 9]) * fx + (hs[q + 9] - hs[q]) * fz
		if h < 0.4:
			continue
		var flower := 0.0
		if meadow > 0.35 and r4 < 0.07 * meadow:
			flower = 0.25 + 0.25 * float(int(r2 * 3.0))
		var tall := (0.34 + 0.4 * r2) * (1.0 + 0.7 * meadow) * (1.0 - 0.35 * forest) * (1.0 - 0.5 * sand)
		if flower > 0.0:
			tall *= 1.25
		var wide := 0.8 + 0.6 * r3
		var a := r3 * 53.0
		var c := cos(a)
		var sn := sin(a)
		var o := count * 16
		buf[o] = c * wide
		buf[o + 1] = 0.0
		buf[o + 2] = sn * wide
		buf[o + 3] = lx
		buf[o + 4] = 0.0
		buf[o + 5] = tall
		buf[o + 6] = 0.0
		buf[o + 7] = h - 0.03
		buf[o + 8] = -sn * wide
		buf[o + 9] = 0.0
		buf[o + 10] = c * wide
		buf[o + 11] = lz
		buf[o + 12] = meadow
		buf[o + 13] = r4
		buf[o + 14] = flower
		buf[o + 15] = forest
		count += 1
	buf.resize(count * 16)
	res.append(buf)


func _place(cell: Dictionary, res: Array) -> void:
	var buf: PackedFloat32Array = res[0]
	var count := buf.size() / 16
	if count == 0:
		return
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_custom_data = true
	mm.mesh = _mesh
	mm.instance_count = count
	mm.buffer = buf
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.material_override = material
	mmi.position = Vector3(cell.x0, 0.0, cell.z0)
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mmi)
	cell.node = mmi
	cell.count = count
	stats.blades += count
