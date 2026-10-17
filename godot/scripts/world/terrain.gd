extends Node3D
## THE GROUND (scripts/world/terrain.gd): the continent's terrain as a quadtree of chunks streamed round the focus (the camera).
## Every chunk is N x N cells whatever its size - 4096 m roots down to 64 m leaves of 2 m cells; a node splits while the focus is
## nearer than K times its size. Chunks are built coarse to fine on worker threads (heights, normals, the ground cover in the vertex
## colour) and a node shows until all four of its children are ready, so the ground never has holes; skirts hide the cracks between
## levels. Positions are local to each chunk (precision far from the origin).

const N := 32
const MAX_DEPTH := 6
const ROOT := 4096.0
const K := 2.3
const MAX_JOBS := 3
const FINISH_PER_FRAME := 4

var gen
var material: Material
var focus := Vector3.ZERO
var stats := {"chunks": 0, "visible": 0, "jobs": 0, "queued": 0}

var _chunks := {}
var _queue: Array = []
var _running := {}
var _done: Array = []
var _frame := 0


class Chunk:
	var key := ""
	var d := 0
	var ix := 0
	var iz := 0
	var x0 := 0.0
	var z0 := 0.0
	var size := 0.0
	var mi: MeshInstance3D = null
	var ready := false
	var requested := false
	var running := false
	var result = null
	var used := 0
	var prio := 0.0


func is_idle() -> bool:
	return _queue.is_empty() and _running.is_empty() and _done.is_empty()


## the art preset's ground material (main.gd apply_preset): every chunk already built takes it at once
func set_material(m: Material) -> void:
	material = m
	for key in _chunks:
		var c: Chunk = _chunks[key]
		if c.mi != null:
			c.mi.material_override = m


func _process(_dt: float) -> void:
	_frame += 1
	var n := int(round(2.0 * gen.world_half / ROOT))
	for iz in n:
		for ix in n:
			_visit(0, ix, iz)
	_pump()
	if _frame % 30 == 0:
		_gc()
	var vis := 0
	for key in _chunks:
		var c: Chunk = _chunks[key]
		if c.mi != null and c.mi.visible:
			vis += 1
	stats.chunks = _chunks.size()
	stats.visible = vis
	stats.jobs = _running.size()
	stats.queued = _queue.size()


func _get_chunk(d: int, ix: int, iz: int) -> Chunk:
	var key := "%d:%d:%d" % [d, ix, iz]
	var c: Chunk = _chunks.get(key)
	if c == null:
		c = Chunk.new()
		c.key = key
		c.d = d
		c.ix = ix
		c.iz = iz
		c.size = ROOT / float(1 << d)
		c.x0 = -gen.world_half + ix * c.size
		c.z0 = -gen.world_half + iz * c.size
		_chunks[key] = c
	return c


func _dist(c: Chunk) -> float:
	var dx := focus.x - clampf(focus.x, c.x0, c.x0 + c.size)
	var dz := focus.z - clampf(focus.z, c.z0, c.z0 + c.size)
	var dy := maxf(0.0, focus.y - 60.0)
	return sqrt(dx * dx + dz * dz + dy * dy)


func _split(c: Chunk) -> bool:
	return c.d < MAX_DEPTH and _dist(c) < c.size * K


## returns whether the chunk is ready (drawn itself or by its children)
func _visit(d: int, ix: int, iz: int) -> bool:
	var c := _get_chunk(d, ix, iz)
	c.used = _frame
	if not c.ready:
		_request(c)
		return false
	if _split(c):
		var all := true
		for k in 4:
			if not _visit(d + 1, ix * 2 + (k & 1), iz * 2 + (k >> 1)):
				all = false
		if all:
			_show(c, false)
			return true
		_show(c, true)
	else:
		_show(c, true)
	for k in 4:
		_hide_tree(d + 1, ix * 2 + (k & 1), iz * 2 + (k >> 1))
	return true


func _hide_tree(d: int, ix: int, iz: int) -> void:
	var c: Chunk = _chunks.get("%d:%d:%d" % [d, ix, iz])
	if c == null:
		return
	_show(c, false)
	if d < MAX_DEPTH:
		for k in 4:
			_hide_tree(d + 1, ix * 2 + (k & 1), iz * 2 + (k >> 1))


func _show(c: Chunk, on: bool) -> void:
	if c.mi != null and c.mi.visible != on:
		c.mi.visible = on


func _request(c: Chunk) -> void:
	if c.requested:
		return
	c.requested = true
	_queue.append(c)


func _pump() -> void:
	for id in _running.keys():
		if WorkerThreadPool.is_task_completed(id):
			WorkerThreadPool.wait_for_task_completion(id)
			var c: Chunk = _running[id]
			_running.erase(id)
			c.running = false
			_done.append(c)
	var fin := 0
	while fin < FINISH_PER_FRAME and not _done.is_empty():
		_finish(_done.pop_front())
		fin += 1
	if _queue.is_empty() or _running.size() >= MAX_JOBS:
		return
	for c in _queue:
		c.prio = _dist(c) / c.size + c.d * 0.25
	_queue.sort_custom(func(a, b): return a.prio < b.prio)
	while _running.size() < MAX_JOBS and not _queue.is_empty():
		var c: Chunk = _queue.pop_front()
		if c.used < _frame - 2 or _chunks.get(c.key) != c:
			c.requested = false
			continue
		c.running = true
		var id := WorkerThreadPool.add_task(_job.bind(c), false, "terrain chunk")
		_running[id] = c


func _job(c: Chunk) -> void:
	var g = gen
	var n1 := N + 1
	var w := N + 3
	var s := c.size / N
	var hs := PackedFloat32Array()
	hs.resize(w * w)
	var col := PackedColorArray()
	col.resize(n1 * n1)
	for j in w:
		var z := c.z0 + (j - 1) * s
		for i in w:
			var x := c.x0 + (i - 1) * s
			if i >= 1 and i <= n1 and j >= 1 and j <= n1:
				var v: Vector4 = g.sample(x, z)
				hs[j * w + i] = v.x
				col[(j - 1) * n1 + (i - 1)] = Color(v.y, v.z, v.w, 1.0)
			else:
				hs[j * w + i] = g.height(x, z)
	var nv := n1 * n1 + 4 * n1
	var verts := PackedVector3Array()
	verts.resize(nv)
	var norms := PackedVector3Array()
	norms.resize(nv)
	var cols := PackedColorArray()
	cols.resize(nv)
	for j in n1:
		for i in n1:
			var q := (j + 1) * w + (i + 1)
			var nrm := Vector3(hs[q - 1] - hs[q + 1], 2.0 * s, hs[q - w] - hs[q + w]).normalized()
			var idx := j * n1 + i
			verts[idx] = Vector3(i * s, hs[q], j * s)
			norms[idx] = nrm
			cols[idx] = col[idx]
	# the skirts: the border's vertices again, lower, all round (z = 0 row, x = N column, z = N row, x = 0 column)
	var drop := 2.0 + s * 1.5
	var border := PackedInt32Array()
	for i in n1:
		border.append(i)
	for j in range(1, n1):
		border.append(j * n1 + N)
	for i in range(N - 1, -1, -1):
		border.append(N * n1 + i)
	for j in range(N - 1, 0, -1):
		border.append(j * n1)
	var base := n1 * n1
	for k in border.size():
		var b := border[k]
		verts[base + k] = verts[b] - Vector3(0.0, drop, 0.0)
		norms[base + k] = norms[b]
		cols[base + k] = cols[b]
	var idxs := PackedInt32Array()
	idxs.resize(N * N * 6 + border.size() * 6)
	var t := 0
	for j in N:
		for i in N:
			var a := j * n1 + i
			var b2 := a + 1
			var cc := a + n1
			var dd := cc + 1
			idxs[t] = a
			idxs[t + 1] = b2
			idxs[t + 2] = dd
			idxs[t + 3] = a
			idxs[t + 4] = dd
			idxs[t + 5] = cc
			t += 6
	var nb := border.size()
	for k in nb:
		var k2 := (k + 1) % nb
		var top0 := border[k]
		var top1 := border[k2]
		var bot0 := base + k
		var bot1 := base + k2
		idxs[t] = top0
		idxs[t + 1] = bot0
		idxs[t + 2] = top1
		idxs[t + 3] = top1
		idxs[t + 4] = bot0
		idxs[t + 5] = bot1
		t += 6
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_NORMAL] = norms
	arrays[Mesh.ARRAY_COLOR] = cols
	arrays[Mesh.ARRAY_INDEX] = idxs
	c.result = arrays


func _finish(c: Chunk) -> void:
	if c.result == null or _chunks.get(c.key) != c:
		c.requested = false
		return
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, c.result)
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = material
	mi.position = Vector3(c.x0, 0.0, c.z0)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if c.size <= 256.0 else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.visible = false
	add_child(mi)
	c.mi = mi
	c.result = null
	c.ready = true


func _gc() -> void:
	var drop := []
	for key in _chunks:
		var c: Chunk = _chunks[key]
		if c.used < _frame - 90 and not c.running and (c.mi == null or not c.mi.visible):
			drop.append(key)
	for key in drop:
		var c: Chunk = _chunks[key]
		if c.mi != null:
			c.mi.queue_free()
			c.mi = null
		_chunks.erase(key)
