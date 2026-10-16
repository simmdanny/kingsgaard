extends RefCounted
## LOW-POLY MESHES (scripts/world/proc_meshes.gd): the trees and the grass blade, built in code - flat-shaded faces, colours in the
## vertex colours (sRGB; the shaders square them into linear), a slightly different shade per face for the painted low-poly look.
## Winding: Godot draws clockwise faces (seen from outside) as the front; every face here is wound so.

const TRUNK := Color(0.40, 0.28, 0.18)
const LEAF := Color(0.27, 0.50, 0.18)
const NEEDLE := Color(0.16, 0.36, 0.20)

static var _ico_v: Array[Vector3] = []
static var _ico_f: Array[Vector3i] = []


static func _ico() -> void:
	if not _ico_v.is_empty():
		return
	var t := (1.0 + sqrt(5.0)) / 2.0
	var vs := [Vector3(-1, t, 0), Vector3(1, t, 0), Vector3(-1, -t, 0), Vector3(1, -t, 0), Vector3(0, -1, t), Vector3(0, 1, t),
		Vector3(0, -1, -t), Vector3(0, 1, -t), Vector3(t, 0, -1), Vector3(t, 0, 1), Vector3(-t, 0, -1), Vector3(-t, 0, 1)]
	for v in vs:
		_ico_v.append((v as Vector3).normalized())
	var fs := [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
		[3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
	for f in fs:
		_ico_f.append(Vector3i(f[0], f[1], f[2]))


## one flat-shaded triangle, wound clockwise as seen from the side its normal points to (out = a point inside the solid)
static func _tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, col: Color, inside: Vector3) -> void:
	var n := (b - a).cross(c - a)
	if n.dot(a - inside) > 0.0:
		var tmp := b
		b = c
		c = tmp
		n = -n
	var nn := -n.normalized()
	st.set_normal(nn)
	st.set_color(col)
	st.add_vertex(a)
	st.set_normal(nn)
	st.set_color(col)
	st.add_vertex(b)
	st.set_normal(nn)
	st.set_color(col)
	st.add_vertex(c)


static func _shade(col: Color, rng: RandomNumberGenerator, amt: float) -> Color:
	var k := 1.0 + (rng.randf() - 0.5) * amt
	return Color(col.r * k, col.g * k, col.b * k)


static func _blob(st: SurfaceTool, c: Vector3, r: Vector3, col: Color, rng: RandomNumberGenerator) -> void:
	_ico()
	for f in _ico_f:
		var a := c + _ico_v[f.x] * r
		var b := c + _ico_v[f.y] * r
		var d := c + _ico_v[f.z] * r
		var top := (_ico_v[f.x].y + _ico_v[f.y].y + _ico_v[f.z].y) / 3.0
		var shade := _shade(col, rng, 0.16) * (0.86 + 0.22 * (top * 0.5 + 0.5))
		_tri(st, a, b, d, shade, c)


## a prism trunk: sides faces round, from radius r0 at the ground to r1 at height h
static func _trunk(st: SurfaceTool, sides: int, r0: float, r1: float, h: float, rng: RandomNumberGenerator) -> void:
	var inside := Vector3(0.0, h * 0.5, 0.0)
	for i in sides:
		var a0 := TAU * i / sides
		var a1 := TAU * (i + 1) / sides
		var p0 := Vector3(cos(a0) * r0, -0.3, sin(a0) * r0)
		var p1 := Vector3(cos(a1) * r0, -0.3, sin(a1) * r0)
		var q0 := Vector3(cos(a0) * r1, h, sin(a0) * r1)
		var q1 := Vector3(cos(a1) * r1, h, sin(a1) * r1)
		var col := _shade(TRUNK, rng, 0.2)
		_tri(st, p0, p1, q1, col, inside)
		_tri(st, p0, q1, q0, col, inside)


static func _cone(st: SurfaceTool, sides: int, y0: float, y1: float, r: float, col: Color, rng: RandomNumberGenerator, cap: bool) -> void:
	var apex := Vector3(0.0, y1, 0.0)
	var inside := Vector3(0.0, y0 + (y1 - y0) * 0.25, 0.0)
	for i in sides:
		var a0 := TAU * i / sides
		var a1 := TAU * (i + 1) / sides
		var p0 := Vector3(cos(a0) * r, y0, sin(a0) * r)
		var p1 := Vector3(cos(a1) * r, y0, sin(a1) * r)
		_tri(st, p0, p1, apex, _shade(col, rng, 0.18), inside)
		if cap:
			_tri(st, p0, Vector3(0.0, y0, 0.0), p1, col * 0.7, inside + Vector3(0.0, 0.5, 0.0))


static func _finish(st: SurfaceTool) -> ArrayMesh:
	st.index()
	return st.commit()


## a broadleaf tree about 6 m tall: a five-sided trunk and four leafy blobs (detail), or a four-sided trunk and one blob (simple)
static func broadleaf(detail: bool) -> ArrayMesh:
	var rng := RandomNumberGenerator.new()
	rng.seed = 11
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	if detail:
		_trunk(st, 5, 0.22, 0.13, 3.2, rng)
		_blob(st, Vector3(0.0, 4.4, 0.0), Vector3(1.9, 1.6, 1.9), LEAF, rng)
		_blob(st, Vector3(0.9, 3.6, 0.5), Vector3(1.3, 1.1, 1.3), LEAF * 0.95, rng)
		_blob(st, Vector3(-0.8, 3.8, -0.6), Vector3(1.4, 1.2, 1.4), LEAF * 1.04, rng)
		_blob(st, Vector3(0.1, 5.4, -0.2), Vector3(1.2, 1.0, 1.2), LEAF * 1.1, rng)
	else:
		_trunk(st, 4, 0.22, 0.14, 3.0, rng)
		_blob(st, Vector3(0.0, 4.3, 0.0), Vector3(2.2, 1.9, 2.2), LEAF, rng)
	return _finish(st)


## a conifer about 8 m tall: three stacked cones (detail) or one (simple)
static func conifer(detail: bool) -> ArrayMesh:
	var rng := RandomNumberGenerator.new()
	rng.seed = 23
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	if detail:
		_trunk(st, 5, 0.2, 0.1, 2.0, rng)
		_cone(st, 8, 1.2, 4.6, 1.9, NEEDLE, rng, true)
		_cone(st, 8, 3.0, 6.4, 1.45, NEEDLE * 1.05, rng, true)
		_cone(st, 7, 4.8, 8.2, 1.0, NEEDLE * 1.12, rng, true)
	else:
		_trunk(st, 4, 0.2, 0.12, 1.6, rng)
		_cone(st, 6, 1.2, 8.0, 1.9, NEEDLE, rng, true)
	return _finish(st)


## the far broadleaf (seen from 800 m on): a three-sided trunk and an eight-faced canopy
static func broadleaf_far() -> ArrayMesh:
	var rng := RandomNumberGenerator.new()
	rng.seed = 31
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	_trunk(st, 3, 0.3, 0.2, 3.0, rng)
	var c := Vector3(0.0, 4.4, 0.0)
	var r := Vector3(2.4, 2.0, 2.4)
	var ring := [Vector3(1, 0, 0), Vector3(0, 0, 1), Vector3(-1, 0, 0), Vector3(0, 0, -1)]
	for i in 4:
		var a: Vector3 = c + ring[i] * r
		var b: Vector3 = c + ring[(i + 1) % 4] * r
		_tri(st, a, b, c + Vector3(0.0, r.y, 0.0), LEAF * 1.05, c)
		_tri(st, a, b, c - Vector3(0.0, r.y, 0.0), LEAF * 0.85, c)
	return _finish(st)


## the far conifer: one four-sided spire, no trunk
static func conifer_far() -> ArrayMesh:
	var rng := RandomNumberGenerator.new()
	rng.seed = 37
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	_cone(st, 4, 0.6, 8.0, 2.0, NEEDLE, rng, false)
	return _finish(st)


## a grass blade 1 m tall (scaled per instance): two quads and a tip, UV.y the height along it (0 root, 1 tip)
static func blade() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var w0 := 0.042
	var w1 := 0.028
	var pts := [Vector3(-w0, 0.0, 0.0), Vector3(w0, 0.0, 0.0), Vector3(-w1, 0.5, 0.02), Vector3(w1, 0.5, 0.02), Vector3(0.0, 1.0, 0.12)]
	var uvs := [0.0, 0.0, 0.5, 0.5, 1.0]
	var tris := [[0, 2, 1], [1, 2, 3], [2, 4, 3]]
	for t in tris:
		for k in t:
			st.set_normal(Vector3(0.0, 0.0, -1.0))
			st.set_uv(Vector2(0.0, uvs[k]))
			st.add_vertex(pts[k])
	return st.commit()
