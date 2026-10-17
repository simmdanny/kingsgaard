extends RefCounted
## THE FEMALE HERO (scripts/player/feminize.gd): turns alicewithalex's male model into a woman in code, at load.
## His body and shorts are split 1 -> 4 triangles (same shape, more points to move), then reshaped in their bind pose by the
## same field (so the shorts still fit): a bust, a narrower waist, wider hips and a fuller seat, slimmer arms and neck, a softer
## jaw. The hair is drawn longer at the sides and back, a ponytail is added on the head bone, and a crop top is cut from her own
## chest surface between two heights (clean edges, the same skinning, a few mm proud). Faces stay flat-shaded (low-poly).
## Mesh space here: +Y up, +Z front, +X her left, units of the model file (about 0.27 m; she is about 6.8 tall).
##   Feminize.new().apply(model_root)

const TOP_COL := Color(0.16, 0.42, 0.50)

var _hair_mat: Material


func apply(model: Node3D) -> void:
	var body: MeshInstance3D = null
	var hair: MeshInstance3D = null
	var shorts: MeshInstance3D = null
	for mi in model.find_children("*", "MeshInstance3D", true, false):
		var name: String = (mi as MeshInstance3D).mesh.surface_get_material(0).resource_name
		if name == "Material.001":
			body = mi
		elif name == "Hair_Color":
			hair = mi
		elif name == "Material.002":
			shorts = mi
	if body == null:
		return
	var sub := _remesh(body, _reshape, 2)
	if shorts != null:
		_remesh(shorts, _reshape)
	if hair != null:
		_remesh(hair, _reshape_hair)
	# the crop top: her chest between two heights, lifted along the smooth normals
	var top := MeshInstance3D.new()
	top.name = "CropTop"
	var tm := StandardMaterial3D.new()
	tm.albedo_color = TOP_COL
	tm.roughness = 0.9
	top.mesh = _flat_mesh(_band(sub, 4.47, 5.2, 0.62), PackedInt32Array(), 0.016, tm, true)
	top.skin = body.skin
	body.get_parent().add_child(top)
	top.skeleton = body.skeleton
	# the ponytail, on the head bone
	if hair != null:
		_hair_mat = hair.mesh.surface_get_material(0)
		var head := -1
		for b in body.skin.get_bind_count():
			if body.skin.get_bind_name(b) == "Head_06":
				head = b
		if head >= 0:
			var pt := MeshInstance3D.new()
			pt.name = "Ponytail"
			pt.mesh = _ponytail(head)
			pt.skin = body.skin
			body.get_parent().add_child(pt)
			pt.skeleton = body.skeleton


## split a mesh instance's mesh 1 -> 4 (levels times), move every point by fn, put it back flat-shaded; returns the reshaped
## indexed data. The splits keep the shape exactly (flat parts stay flat); they only give the reshaping points to move.
static func _remesh(mi: MeshInstance3D, fn: Callable, levels := 1) -> Dictionary:
	var d := _subdivide(mi.mesh.surface_get_arrays(0))
	for k in levels - 1:
		var a := []
		a.resize(Mesh.ARRAY_MAX)
		a[Mesh.ARRAY_VERTEX] = d.v
		a[Mesh.ARRAY_TEX_UV] = d.uv if (d.uv as PackedVector2Array).size() > 0 else null
		a[Mesh.ARRAY_BONES] = d.bo
		a[Mesh.ARRAY_WEIGHTS] = d.we
		a[Mesh.ARRAY_INDEX] = d.i
		d = _subdivide(a)
	var vv: PackedVector3Array = d.v
	for i in vv.size():
		vv[i] = fn.call(vv[i])
	d.v = vv
	mi.mesh = _flat_mesh(d, PackedInt32Array(), 0.0, mi.mesh.surface_get_material(0))
	return d


## the hair longer and fuller at the sides and back: its lower rim drawn down towards the jaw and nape, a little outwards
static func _reshape_hair(p: Vector3) -> Vector3:
	var q := p
	var low := smoothstep(6.5, 6.15, p.y) * smoothstep(0.35, 0.05, p.z)
	q.y -= 0.22 * low
	q.x *= 1.0 + 0.07 * low
	q.z -= 0.04 * low
	return q


## the shape changes, as smooth offsets of the bind-pose position
static func _reshape(p: Vector3) -> Vector3:
	var q := p
	var torso := 1.0 - smoothstep(0.6, 0.74, absf(p.x))
	# the bust: two rounded domes (no peak) on the front of the chest, turned slightly outwards - a long gentle slope up into
	# the upper chest, a fuller, rounder underside that curves back in at the fold; about 5 cm at most
	for s in [1.0, -1.0]:
		var dx: float = (p.x - 0.27 * s) / 0.30
		var dy := p.y - 4.86
		var ry := 0.40 if dy > 0.0 else 0.27
		var r2 := dx * dx + (dy / ry) * (dy / ry)
		if r2 < 1.0:
			var f := pow(1.0 - r2, lerpf(0.8, 2.0, smoothstep(-0.05, 0.1, dy))) * smoothstep(0.02, 0.28, p.z) * torso
			q.z += 0.20 * f
			q.x += 0.03 * f * s
	# the waist in, the belly flatter
	var w := exp(-pow((p.y - 4.2) / 0.36, 2.0)) * torso
	q.x *= 1.0 - 0.13 * w
	q.z = lerpf(q.z, q.z * 0.93, w)
	# the hips out, a fuller seat
	var h := exp(-pow((p.y - 3.55) / 0.4, 2.0))
	q.x *= 1.0 + 0.10 * h
	q.z -= 0.08 * h * smoothstep(-0.05, -0.3, p.z)
	# slimmer arms (T-pose, along x): pull towards the arm's line
	if absf(p.x) > 0.62 and p.y > 4.5:
		var k := 0.86 if absf(p.x) < 2.8 else 0.92
		var ay := lerpf(5.26, 5.09, clampf((absf(p.x) - 0.78) / 2.0, 0.0, 1.0))
		var az := lerpf(-0.12, 0.2, clampf((absf(p.x) - 1.8) / 1.0, 0.0, 1.0))
		var arm := smoothstep(0.62, 0.9, absf(p.x))
		q.y = lerpf(q.y, ay + (q.y - ay) * k, arm)
		q.z = lerpf(q.z, az + (q.z - az) * k, arm)
	# a slimmer neck
	var n := exp(-pow((p.y - 5.6) / 0.22, 2.0)) * (1.0 - smoothstep(0.3, 0.45, absf(p.x)))
	q.x *= 1.0 - 0.15 * n
	q.z = lerpf(q.z, -0.03 + (q.z + 0.03) * 0.85, n)
	# a softer, narrower jaw and chin
	var j := exp(-pow((p.y - 5.88) / 0.17, 2.0)) * smoothstep(-0.1, 0.2, p.z)
	q.x *= 1.0 - 0.10 * j
	q.z -= 0.03 * j
	return q


## 1 -> 4 split of every triangle; midpoints shared per edge (no cracks), their skin weights merged
static func _subdivide(a: Array) -> Dictionary:
	var v: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
	var uv: PackedVector2Array = a[Mesh.ARRAY_TEX_UV] if a[Mesh.ARRAY_TEX_UV] != null else PackedVector2Array()
	var bo: PackedInt32Array = a[Mesh.ARRAY_BONES]
	var we: PackedFloat32Array = a[Mesh.ARRAY_WEIGHTS]
	var idx: PackedInt32Array = a[Mesh.ARRAY_INDEX]
	# plain Arrays while growing (the lambda below shares them by reference)
	var nv := Array(v)
	var nuv := Array(uv)
	var nbo := Array(bo)
	var nwe := Array(we)
	var ni := []
	var mids := {}
	var mid := func(x: int, y: int) -> int:
		var key := Vector2i(mini(x, y), maxi(x, y))
		if mids.has(key):
			return mids[key]
		var n: int = nv.size()
		nv.append((v[x] + v[y]) * 0.5)
		if uv.size() > 0:
			nuv.append((uv[x] + uv[y]) * 0.5)
		var acc := {}
		for s in [x, y]:
			for k in 4:
				var b := bo[s * 4 + k]
				acc[b] = acc.get(b, 0.0) + we[s * 4 + k] * 0.5
		var pairs := []
		for b in acc:
			pairs.append([acc[b], b])
		pairs.sort_custom(func(p, q): return p[0] > q[0] or (p[0] == q[0] and p[1] < q[1]))
		var tot := 0.0
		for k in mini(4, pairs.size()):
			tot += pairs[k][0]
		for k in 4:
			if k < pairs.size():
				nbo.append(pairs[k][1])
				nwe.append(pairs[k][0] / tot)
			else:
				nbo.append(0)
				nwe.append(0.0)
		mids[key] = n
		return n
	for t in range(0, idx.size(), 3):
		var i0 := idx[t]
		var i1 := idx[t + 1]
		var i2 := idx[t + 2]
		var m01: int = mid.call(i0, i1)
		var m12: int = mid.call(i1, i2)
		var m20: int = mid.call(i2, i0)
		ni.append_array([i0, m01, m20, m01, i1, m12, m20, m12, i2, m01, m12, m20])
	return {"v": PackedVector3Array(nv), "uv": PackedVector2Array(nuv), "bo": PackedInt32Array(nbo), "we": PackedFloat32Array(nwe),
		"i": PackedInt32Array(ni)}


## the part of d between heights lo and hi and within xmax of the centre line, clipped exactly on those planes; new points
## get interpolated positions, uvs, smooth normals (welded across the model's split seams, kept as d.n for lifting and
## shading) and merged skin weights
static func _band(d: Dictionary, lo: float, hi: float, xmax: float) -> Dictionary:
	var v: PackedVector3Array = d.v
	var idx: PackedInt32Array = d.i
	var vn := _welded_normals(v, idx)
	var has_uv: bool = (d.uv as PackedVector2Array).size() == v.size()
	var ov := PackedVector3Array()
	var on := PackedVector3Array()
	var ouv := PackedVector2Array()
	var ob := PackedInt32Array()
	var ow := PackedFloat32Array()
	var oi := PackedInt32Array()
	for t in range(0, idx.size(), 3):
		var poly := []
		for k in 3:
			var i := idx[t + k]
			var w := {}
			for q in 4:
				w[d.bo[i * 4 + q]] = w.get(d.bo[i * 4 + q], 0.0) + d.we[i * 4 + q]
			poly.append({"p": v[i], "n": vn[i], "uv": d.uv[i] if has_uv else Vector2.ZERO, "w": w})
		poly = _clip(_clip(_clip(_clip(poly, 1, lo, 1.0), 1, hi, -1.0), 0, -xmax, 1.0), 0, xmax, -1.0)
		if poly.size() < 3:
			continue
		var base := ov.size()
		for pv in poly:
			ov.append(pv.p)
			on.append((pv.n as Vector3).normalized())
			ouv.append(pv.uv)
			var pairs := []
			for b in pv.w:
				pairs.append([pv.w[b], b])
			pairs.sort_custom(func(x, y): return x[0] > y[0] or (x[0] == y[0] and x[1] < y[1]))
			var tot := 0.0
			for k in mini(4, pairs.size()):
				tot += pairs[k][0]
			for k in 4:
				ob.append(pairs[k][1] if k < pairs.size() else 0)
				ow.append(pairs[k][0] / tot if k < pairs.size() else 0.0)
		for k in range(1, poly.size() - 1):
			oi.append_array(PackedInt32Array([base, base + k, base + k + 1]))
	return {"v": ov, "n": on, "uv": ouv if has_uv else PackedVector2Array(), "bo": ob, "we": ow, "i": oi}


## Sutherland-Hodgman against an axis plane (axis 0 = x, 1 = y): keeps the part where side * (p[axis] - c) >= 0
static func _clip(poly: Array, axis: int, c: float, side: float) -> Array:
	var out := []
	for k in poly.size():
		var a: Dictionary = poly[k]
		var b: Dictionary = poly[(k + 1) % poly.size()]
		var da: float = side * ((a.p as Vector3)[axis] - c)
		var db: float = side * ((b.p as Vector3)[axis] - c)
		if da >= 0.0:
			out.append(a)
		if (da >= 0.0) != (db >= 0.0):
			var t := da / (da - db)
			var w := {}
			for bo in a.w:
				w[bo] = w.get(bo, 0.0) + a.w[bo] * (1.0 - t)
			for bo in b.w:
				w[bo] = w.get(bo, 0.0) + b.w[bo] * t
			out.append({"p": (a.p as Vector3).lerp(b.p, t), "n": (a.n as Vector3).lerp(b.n, t), "uv": (a.uv as Vector2).lerp(b.uv, t), "w": w})
	return out


## smooth normals shared by every vertex at the same spot (the model splits vertices along its uv / hard-edge seams; without
## welding, the two sides of a seam would get different normals and a lifted copy would crack open along it)
static func _welded_normals(v: PackedVector3Array, idx: PackedInt32Array) -> PackedVector3Array:
	var acc := {}
	for t in range(0, idx.size(), 3):
		var fn := (v[idx[t + 2]] - v[idx[t]]).cross(v[idx[t + 1]] - v[idx[t]])
		for k in 3:
			var key := Vector3i((v[idx[t + k]] * 10000.0).round())
			acc[key] = acc.get(key, Vector3.ZERO) + fn
	var vn := PackedVector3Array()
	vn.resize(v.size())
	for i in v.size():
		vn[i] = (acc.get(Vector3i((v[i] * 10000.0).round()), Vector3.UP) as Vector3).normalized()
	return vn


static func _smooth_normals(v: PackedVector3Array, idx: PackedInt32Array) -> PackedVector3Array:
	var vn := PackedVector3Array()
	vn.resize(v.size())
	for t in range(0, idx.size(), 3):
		var fn := (v[idx[t + 2]] - v[idx[t]]).cross(v[idx[t + 1]] - v[idx[t]])
		for k in 3:
			vn[idx[t + k]] += fn
	for i in vn.size():
		vn[i] = vn[i].normalized()
	return vn


## a flat-shaded skinned mesh from the indexed data: all triangles, or only those starting at the indices in keep, pushed
## out by lift along the smooth (averaged) normals
static func _flat_mesh(d: Dictionary, keep: PackedInt32Array, lift: float, mat: Material, smooth := false) -> ArrayMesh:
	var v: PackedVector3Array = d.v
	var idx: PackedInt32Array = d.i
	var vn := PackedVector3Array()
	if lift != 0.0 or smooth:
		vn = d.n if d.has("n") else _welded_normals(v, idx)
	var tris := keep
	if tris.is_empty():
		for t in range(0, idx.size(), 3):
			tris.append(t)
	var pv := PackedVector3Array()
	var pn := PackedVector3Array()
	var puv := PackedVector2Array()
	var pb := PackedInt32Array()
	var pw := PackedFloat32Array()
	var has_uv: bool = (d.uv as PackedVector2Array).size() == v.size()
	for t in tris:
		var c := [idx[t], idx[t + 1], idx[t + 2]]
		var p := []
		for k in 3:
			p.append(v[c[k]] + (vn[c[k]] * lift if lift != 0.0 else Vector3.ZERO))
		var n: Vector3 = ((p[2] - p[0]) as Vector3).cross(p[1] - p[0]).normalized()
		for k in 3:
			pv.append(p[k])
			pn.append(vn[c[k]] if smooth else n)
			if has_uv:
				puv.append(d.uv[c[k]])
			for q in 4:
				pb.append(d.bo[c[k] * 4 + q])
				pw.append(d.we[c[k] * 4 + q])
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = pv
	arrays[Mesh.ARRAY_NORMAL] = pn
	if has_uv:
		arrays[Mesh.ARRAY_TEX_UV] = puv
	arrays[Mesh.ARRAY_BONES] = pb
	arrays[Mesh.ARRAY_WEIGHTS] = pw
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	m.surface_set_material(0, mat)
	return m


## a six-sided tapering ponytail from the back of the head down between the shoulder blades, tied near the top
func _ponytail(head_bind: int) -> ArrayMesh:
	var pts := [Vector3(0.0, 6.36, -0.20), Vector3(0.0, 6.22, -0.36), Vector3(0.0, 6.12, -0.42), Vector3(0.0, 5.86, -0.50),
		Vector3(0.0, 5.52, -0.49), Vector3(0.0, 5.22, -0.44)]
	var rad := [0.13, 0.085, 0.10, 0.135, 0.11, 0.06]
	var tip := Vector3(0.0, 5.04, -0.41)
	var rings := []
	for r in pts.size():
		var dir: Vector3 = (pts[mini(r + 1, pts.size() - 1)] - pts[maxi(r - 1, 0)]).normalized()
		var u := Vector3(1.0, 0.0, 0.0)
		var w := dir.cross(u).normalized()
		var ring := PackedVector3Array()
		for k in 6:
			var ang := TAU * k / 6.0
			ring.append(pts[r] + (u * cos(ang) + w * sin(ang)) * rad[r])
		rings.append(ring)
	var v := PackedVector3Array()
	var idx := PackedInt32Array()
	for ring in rings:
		v.append_array(ring)
	v.append(tip)
	for r in rings.size() - 1:
		for k in 6:
			var a0 := r * 6 + k
			var a1 := r * 6 + (k + 1) % 6
			idx.append_array(PackedInt32Array([a0, a1 + 6, a1, a0, a0 + 6, a1 + 6]))
	var last := (rings.size() - 1) * 6
	for k in 6:
		idx.append_array(PackedInt32Array([last + k, v.size() - 1, last + (k + 1) % 6]))
	var bo := PackedInt32Array()
	var we := PackedFloat32Array()
	for i in v.size():
		bo.append_array(PackedInt32Array([head_bind, 0, 0, 0]))
		we.append_array(PackedFloat32Array([1.0, 0.0, 0.0, 0.0]))
	# wind each face outward (clockwise seen from outside, Godot's front)
	for t in range(0, idx.size(), 3):
		var c: Vector3 = (v[idx[t]] + v[idx[t + 1]] + v[idx[t + 2]]) / 3.0
		var axis_pt := _nearest_on(pts, c)
		var fn := (v[idx[t + 1]] - v[idx[t]]).cross(v[idx[t + 2]] - v[idx[t]])
		if fn.dot(c - axis_pt) > 0.0:
			var tmp := idx[t + 1]
			idx[t + 1] = idx[t + 2]
			idx[t + 2] = tmp
	return _flat_mesh({"v": v, "uv": PackedVector2Array(), "bo": bo, "we": we, "i": idx}, PackedInt32Array(), 0.0, _hair_mat)


static func _nearest_on(pts: Array, c: Vector3) -> Vector3:
	var best: Vector3 = pts[0]
	var bd := INF
	for r in pts.size() - 1:
		var a: Vector3 = pts[r]
		var b: Vector3 = pts[r + 1]
		var t := clampf((c - a).dot(b - a) / (b - a).length_squared(), 0.0, 1.0)
		var p := a + (b - a) * t
		if p.distance_to(c) < bd:
			bd = p.distance_to(c)
			best = p
	return best
