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


# ---------------------------------------------------------------------------------------------------------------------------------
# STYLIZED TREES (art preset B_stylized, see ART_STYLE.md): the same sizes and shapes of tree as above (so placement, scale and the
# shader's per-tree crown reshape all still fit), but crowns are clumps of rounded masses with smooth normals bent toward the
# crown's middle, so a crown shades as one soft mass; colours run in gradients (darker low and inside, lighter on top); COLOR.a
# carries baked ambient occlusion (inside the crown, the foot of the trunk) and UV.x marks leaves (1) and bark (0) for
# shaders/b/tree_b.gdshader. Indexed meshes with shared vertices (smooth shading). Winding as above: clockwise from outside.

const B_BARK_LO := Color(0.22, 0.16, 0.11)
const B_BARK_HI := Color(0.33, 0.25, 0.18)
const B_LEAF_LO := Color(0.09, 0.27, 0.15)
const B_LEAF_MID := Color(0.22, 0.47, 0.15)
const B_LEAF_HI := Color(0.45, 0.66, 0.20)
const B_NEEDLE_LO := Color(0.08, 0.25, 0.20)
const B_NEEDLE_HI := Color(0.30, 0.52, 0.27)

static var _sph := {}  ## subdivided icospheres by frequency: [verts (unit), faces (Vector3i, clockwise from outside)]


## a unit icosphere of 20 * 4^f faces, vertices shared
static func _sphere(f: int) -> Array:
	if _sph.has(f):
		return _sph[f]
	_ico()
	var verts: Array[Vector3] = _ico_v.duplicate()
	var faces: Array[Vector3i] = _ico_f.duplicate()
	for _i in f:
		var mid := {}
		var nf: Array[Vector3i] = []
		var midpoint := func(a: int, b: int) -> int:
			var k := Vector2i(mini(a, b), maxi(a, b))
			if mid.has(k):
				return mid[k]
			verts.append((verts[a] + verts[b]).normalized())
			mid[k] = verts.size() - 1
			return mid[k]
		for t in faces:
			var ab: int = midpoint.call(t.x, t.y)
			var bc: int = midpoint.call(t.y, t.z)
			var ca: int = midpoint.call(t.z, t.x)
			nf.append_array([Vector3i(t.x, ab, ca), Vector3i(t.y, bc, ab), Vector3i(t.z, ca, bc), Vector3i(ab, bc, ca)])
		faces = nf
	for i in faces.size():
		var t := faces[i]
		var a := verts[t.x]
		if (verts[t.y] - a).cross(verts[t.z] - a).dot(a) > 0.0:
			faces[i] = Vector3i(t.x, t.z, t.y)
	_sph[f] = [verts, faces]
	return _sph[f]


## an indexed smooth mesh being built: positions, normals, colours (a = AO), uv (x: 1 leaf, 0 bark)
class SmoothBuilder:
	var p := PackedVector3Array()
	var n := PackedVector3Array()
	var c := PackedColorArray()
	var uv := PackedVector2Array()
	var idx := PackedInt32Array()

	func vert(pos: Vector3, nrm: Vector3, col: Color, leaf: float) -> int:
		p.append(pos)
		n.append(nrm.normalized())
		c.append(col)
		uv.append(Vector2(leaf, 0.0))
		return p.size() - 1

	## a triangle wound clockwise as seen from outside (out: a direction pointing out of the surface there)
	func tri(a: int, b: int, d: int, out: Vector3) -> void:
		if (p[b] - p[a]).cross(p[d] - p[a]).dot(out) > 0.0:
			idx.append_array([a, d, b])
		else:
			idx.append_array([a, b, d])

	func commit() -> ArrayMesh:
		var arrays := []
		arrays.resize(Mesh.ARRAY_MAX)
		arrays[Mesh.ARRAY_VERTEX] = p
		arrays[Mesh.ARRAY_NORMAL] = n
		arrays[Mesh.ARRAY_COLOR] = c
		arrays[Mesh.ARRAY_TEX_UV] = uv
		arrays[Mesh.ARRAY_INDEX] = idx
		var m := ArrayMesh.new()
		m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
		return m


static func _smoothstep(a: float, b: float, x: float) -> float:
	var t := clampf((x - a) / (b - a), 0.0, 1.0)
	return t * t * (3.0 - 2.0 * t)


## one rounded leaf mass of a crown: an icosphere of frequency f, lumped a little by seeded bumps, its underside flattened, normals
## bent toward the crown's centre cc (crown radii cr) by `bend`, coloured by its height in the crown, AO from how deep inside it sits
static func _mass(sb: SmoothBuilder, c: Vector3, r: Vector3, f: int, cc: Vector3, cr: Vector3, lo: Color, mid: Color, hi: Color,
		bend: float, rng: RandomNumberGenerator) -> void:
	var s: Array = _sphere(f)
	var verts: Array[Vector3] = s[0]
	var faces: Array[Vector3i] = s[1]
	var bumps := []
	for _k in 5:
		bumps.append([Vector3(rng.randf() * 2.0 - 1.0, rng.randf() * 1.6 - 0.6, rng.randf() * 2.0 - 1.0).normalized(), 0.05 + 0.08 * rng.randf()])
	var base := sb.p.size()
	for d in verts:
		var k := 1.0
		for b in bumps:
			k += b[1] * maxf(d.dot(b[0]), 0.0) * maxf(d.dot(b[0]), 0.0)
		var q := c + Vector3(d.x * r.x, d.y * r.y, d.z * r.z) * k
		var floor_y := c.y - r.y * 0.62
		if q.y < floor_y:
			q.y = floor_y - (floor_y - q.y) * 0.5
		var own := Vector3(d.x / r.x, d.y / r.y, d.z / r.z).normalized()
		var rel := Vector3((q.x - cc.x) / cr.x, (q.y - cc.y) / cr.y, (q.z - cc.z) / cr.z)
		var nrm := own.lerp(rel.normalized(), bend)
		var h := clampf(rel.y * 0.5 + 0.5, 0.0, 1.0)
		var col := lo.lerp(mid, _smoothstep(0.0, 0.55, h)).lerp(hi, _smoothstep(0.5, 1.05, h) * 0.85)
		var ao := (0.35 + 0.65 * _smoothstep(0.2, 0.95, rel.length())) * (0.75 + 0.25 * _smoothstep(-0.8, 0.4, rel.y))
		col.a = ao
		sb.vert(q, nrm, col, 1.0)
	for t in faces:
		sb.tri(base + t.x, base + t.y, base + t.z, verts[t.x] + verts[t.y] + verts[t.z])


## a smooth tapered trunk with a flared foot: `sides` round, rings along a gentle bend up to (top, r1)
static func _smooth_trunk(sb: SmoothBuilder, sides: int, r0: float, r1: float, top: Vector3, rng: RandomNumberGenerator) -> void:
	var rings := 6
	var bend := Vector3(rng.randf() - 0.5, 0.0, rng.randf() - 0.5) * 0.35
	var base := sb.p.size()
	for j in rings + 1:
		var t := float(j) / rings
		var ctr := Vector3(0.0, -0.3, 0.0).lerp(top, t) + bend * sin(t * PI)
		var r := lerpf(r0, r1, t) * (1.0 + 0.7 * pow(1.0 - _smoothstep(0.0, 0.18, t), 2.0))
		var col := B_BARK_LO.lerp(B_BARK_HI, _smoothstep(0.0, 0.45, t))
		col.a = (0.5 + 0.5 * _smoothstep(0.0, 0.2, t)) * (1.0 - 0.45 * _smoothstep(0.6, 1.0, t))
		for i in sides + 1:
			var a := TAU * i / sides
			var d := Vector3(cos(a), 0.0, sin(a))
			sb.vert(ctr + d * r, d + Vector3(0.0, 0.15, 0.0), col, 0.0)
	for j in rings:
		for i in sides:
			var a := base + j * (sides + 1) + i
			var b := a + sides + 1
			var out := sb.p[a] - (Vector3(0.0, -0.3, 0.0).lerp(top, float(j) / rings) + bend * sin(float(j) / rings * PI))
			sb.tri(a, a + 1, b, out)
			sb.tri(a + 1, b + 1, b, out)


## a broadleaf crown of masses round (cc, cr): a big middle one and `n` round it (detail: frequency f)
static func _broad_crown(sb: SmoothBuilder, n: int, f: int, rng: RandomNumberGenerator) -> void:
	var cc := Vector3(0.0, 4.15, 0.0)
	var cr := Vector3(2.2, 1.95, 2.2)
	_mass(sb, cc + Vector3(0.0, 0.15, 0.0), cr * Vector3(0.66, 0.7, 0.66), f, cc, cr, B_LEAF_LO, B_LEAF_MID, B_LEAF_HI, 0.5, rng)
	for i in n:
		var a := TAU * i / n + rng.randf() * 0.6
		var e := -0.4 + 0.65 * rng.randf()
		var rr := (0.36 + 0.12 * rng.randf()) * cr.x
		var c := cc + Vector3(cos(a) * cr.x * 0.5, e * cr.y, sin(a) * cr.z * 0.5)
		_mass(sb, c, Vector3(rr, rr * (0.82 + 0.12 * rng.randf()), rr), f, cc, cr, B_LEAF_LO, B_LEAF_MID, B_LEAF_HI, 0.5, rng)


## the stylized broadleaf, three distance levels: 0 near (seven 80-face masses and an 8-sided trunk, about 650 triangles),
## 1 mid (four 20-face masses, about 150), 2 far (one, about 30) - smooth normals make even the coarse ones read as round
static func broadleaf_b(level: int) -> ArrayMesh:
	var rng := RandomNumberGenerator.new()
	rng.seed = 11
	var sb := SmoothBuilder.new()
	match level:
		0:
			_smooth_trunk(sb, 8, 0.24, 0.13, Vector3(0.0, 3.6, 0.0), rng)
			_broad_crown(sb, 6, 1, rng)
		1:
			_smooth_trunk(sb, 6, 0.24, 0.14, Vector3(0.0, 3.5, 0.0), rng)
			_broad_crown(sb, 3, 0, rng)
		_:
			_smooth_trunk(sb, 4, 0.3, 0.2, Vector3(0.0, 3.4, 0.0), rng)
			var cc := Vector3(0.0, 4.4, 0.0)
			_mass(sb, cc, Vector3(2.4, 2.0, 2.4), 0, cc, Vector3(2.4, 2.0, 2.4), B_LEAF_LO, B_LEAF_MID, B_LEAF_HI, 0.3, rng)
	return sb.commit()


## one tier of a stylized conifer: a skirt from radius r at y0 up to a soft rounded top at y1, its side bulging a little, its rim
## drooping; smooth normals leaning up so the tier shades as one soft cone; a dark underside
static func _tier(sb: SmoothBuilder, sides: int, y0: float, y1: float, r: float, lo: Color, hi: Color, rng: RandomNumberGenerator) -> void:
	var rows := 4
	var base := sb.p.size()
	var ph := rng.randf() * TAU
	for j in rows + 1:
		var t := float(j) / rows
		var rr := r * (1.0 - t) * (1.0 + 0.22 * sin(t * PI)) + r * 0.06 * (1.0 - t)
		var y := lerpf(y0, y1, t) - 0.25 * (1.0 - t) * (1.0 - t)
		var col := lo.lerp(hi, _smoothstep(0.0, 1.0, t * 0.8 + 0.2))
		col.a = 0.55 + 0.45 * _smoothstep(0.0, 0.7, t)
		for i in sides + 1:
			var a := TAU * i / sides
			var wob := 1.0 + 0.07 * sin(a * 3.0 + ph)
			var d := Vector3(cos(a), 0.0, sin(a))
			var nrm := d * (1.0 - t * 0.6) + Vector3(0.0, 0.75 + t, 0.0)
			sb.vert(Vector3(0.0, y, 0.0) + d * rr * wob, nrm, col, 1.0)
	var apex := sb.vert(Vector3(0.0, y1 + 0.12, 0.0), Vector3.UP, hi, 1.0)
	for j in rows:
		for i in sides:
			var a := base + j * (sides + 1) + i
			var b := a + sides + 1
			var out := Vector3(sb.p[a].x, 0.3, sb.p[a].z)
			sb.tri(a, a + 1, b, out)
			sb.tri(a + 1, b + 1, b, out)
	var top := base + rows * (sides + 1)
	for i in sides:
		sb.tri(top + i, top + i + 1, apex, Vector3.UP)
	var under := lo * 0.75
	under.a = 0.35
	var uc := sb.vert(Vector3(0.0, y0 + 0.05, 0.0), Vector3.DOWN, under, 1.0)
	var ring := sb.p.size()
	for i in sides + 1:
		sb.vert(sb.p[base + i], Vector3.DOWN, under, 1.0)
	for i in sides:
		sb.tri(ring + i, ring + i + 1, uc, Vector3.DOWN)


## the stylized conifer, three distance levels: 0 near (three tiers, 14 round), 1 mid (two, 8), 2 far (one, 6)
static func conifer_b(level: int) -> ArrayMesh:
	var rng := RandomNumberGenerator.new()
	rng.seed = 23
	var sb := SmoothBuilder.new()
	match level:
		0:
			_smooth_trunk(sb, 7, 0.21, 0.1, Vector3(0.0, 2.2, 0.0), rng)
			_tier(sb, 14, 1.3, 4.7, 2.0, B_NEEDLE_LO, B_NEEDLE_HI.lerp(B_NEEDLE_LO, 0.25), rng)
			_tier(sb, 14, 3.2, 6.5, 1.5, B_NEEDLE_LO.lerp(B_NEEDLE_HI, 0.15), B_NEEDLE_HI.lerp(B_NEEDLE_LO, 0.1), rng)
			_tier(sb, 12, 5.0, 8.2, 1.05, B_NEEDLE_LO.lerp(B_NEEDLE_HI, 0.3), B_NEEDLE_HI, rng)
		1:
			_smooth_trunk(sb, 5, 0.21, 0.12, Vector3(0.0, 1.8, 0.0), rng)
			_tier(sb, 8, 1.3, 5.4, 1.95, B_NEEDLE_LO, B_NEEDLE_HI.lerp(B_NEEDLE_LO, 0.2), rng)
			_tier(sb, 8, 4.2, 8.1, 1.25, B_NEEDLE_LO.lerp(B_NEEDLE_HI, 0.25), B_NEEDLE_HI, rng)
		_:
			_tier(sb, 6, 0.6, 8.0, 2.0, B_NEEDLE_LO, B_NEEDLE_HI, rng)
	return sb.commit()


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
