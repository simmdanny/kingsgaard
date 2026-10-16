extends RefCounted
## THE MALE HERO'S BODY (scripts/player/male_body.gd): a faceted low-poly man built in code after the user's reference sheet (a
## grey base body: broad shoulders, chest and arms with clear planes, boot-like feet, an angular head with short swept hair).
## Every part is a loft of rings (10-point profiles for the torso and head, 8-point rings for the limbs) with flat-shaded faces,
## skinned to a skeleton that uses the girl's Blender "metarig" bone names, axes and A-pose - so rig_anim.gd animates both alike.
## Skeleton frame: metres, +Z up, -Y forward, +X his left (the parent node turns it into Godot's Y-up, facing +Z).
##   var root: Node3D = MaleBody.new().build()

const BODY_COL := Color(0.54, 0.54, 0.56)
const HAIR_COL := Color(0.24, 0.23, 0.22)
const EYE_COL := Color(0.16, 0.16, 0.17)
const ARM_DIR := Vector3(0.766, 0.0, -0.643)  # the rest A-pose: arms 40 degrees below horizontal

var _st: SurfaceTool
var _bi := {}
var _pos := {}


## bone name, parent, position (left side only; the right side is mirrored)
func _bones() -> Array:
	var sh := Vector3(0.20, 0.02, 1.465)
	var el := sh + ARM_DIR * 0.30
	var wr := el + ARM_DIR * 0.27
	var list := [
		["spine", "", Vector3(0.0, 0.0, 0.98)],
		["spine.001", "spine", Vector3(0.0, 0.0, 1.08)],
		["spine.002", "spine.001", Vector3(0.0, 0.0, 1.20)],
		["spine.003", "spine.002", Vector3(0.0, 0.0, 1.32)],
		["spine.004", "spine.003", Vector3(0.0, 0.005, 1.51)],
		["spine.005", "spine.004", Vector3(0.0, 0.0, 1.61)],
	]
	var side := [
		["upper_arm", "spine.003", sh],
		["forearm", "upper_arm", el],
		["hand", "forearm", wr],
		["thigh", "spine", Vector3(0.10, 0.0, 0.94)],
		["shin", "thigh", Vector3(0.105, -0.005, 0.51)],
		["foot", "shin", Vector3(0.11, 0.01, 0.09)],
	]
	for s in side:
		for lr in [".L", ".R"]:
			var p: Vector3 = s[2]
			var parent: String = s[1] if s[1].begins_with("spine") else s[1] + lr
			list.append([s[0] + lr, parent, p if lr == ".L" else Vector3(-p.x, p.y, p.z)])
	return list


func build() -> Node3D:
	var root := Node3D.new()
	root.name = "Male"
	var rig := Node3D.new()
	rig.name = "metarig"
	rig.rotation_degrees = Vector3(-90.0, 0.0, 0.0)
	root.add_child(rig)
	var sk := Skeleton3D.new()
	sk.name = "Skeleton3D"
	rig.add_child(sk)
	for e in _bones():
		var i := sk.get_bone_count()
		sk.add_bone(e[0])
		_bi[e[0]] = i
		_pos[e[0]] = e[2]
		if e[1] != "":
			sk.set_bone_parent(i, _bi[e[1]])
			sk.set_bone_rest(i, Transform3D(Basis(), e[2] - _pos[e[1]]))
		else:
			sk.set_bone_rest(i, Transform3D(Basis(), e[2]))
	sk.reset_bone_poses()
	_st = SurfaceTool.new()
	_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	_torso()
	_head()
	for left in [true, false]:
		_arm(left)
		_leg(left)
	var mesh := _st.commit()
	var skin := Skin.new()
	for name in _bi:
		skin.add_bind(_bi[name], Transform3D(Basis(), -_pos[name]))
	var mi := MeshInstance3D.new()
	mi.name = "Body"
	mi.mesh = mesh
	mi.skin = skin
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.vertex_color_is_srgb = true
	mat.roughness = 0.85
	mi.material_override = mat
	sk.add_child(mi)
	mi.skeleton = NodePath("..")
	return root


# ---- geometry helpers ------------------------------------------------------------------------------------------------

## one flat-shaded triangle wound clockwise from outside (inside = a point within the solid); w = per-corner [bone, bone, t]
func _tri(p: Array, w: Array, col: Color, inside: Vector3) -> void:
	var a: Vector3 = p[0]
	var b: Vector3 = p[1]
	var c: Vector3 = p[2]
	var wa: Array = w[0]
	var wb: Array = w[1]
	var wc: Array = w[2]
	var n := (b - a).cross(c - a)
	if n.length_squared() < 1e-14:
		return
	if n.dot((a + b + c) / 3.0 - inside) > 0.0:
		var t := b
		b = c
		c = t
		var tw := wb
		wb = wc
		wc = tw
		n = -n
	var nn := -n.normalized()
	for k in 3:
		var v: Vector3 = [a, b, c][k]
		var ww: Array = [wa, wb, wc][k]
		_st.set_normal(nn)
		_st.set_color(col)
		_st.set_bones(PackedInt32Array([_bi[ww[0]], _bi[ww[1]], 0, 0]))
		_st.set_weights(PackedFloat32Array([1.0 - ww[2], ww[2], 0.0, 0.0]))
		_st.add_vertex(v)


static func _center(r: PackedVector3Array) -> Vector3:
	var c := Vector3.ZERO
	for p in r:
		c += p
	return c / r.size()


## faces between consecutive rings (same point count), optional fans closing the first / last ring to a point
func _loft(rings: Array, ws: Array, col: Color, start_cap = null, end_cap = null) -> void:
	for r in rings.size() - 1:
		var a: PackedVector3Array = rings[r]
		var b: PackedVector3Array = rings[r + 1]
		var inside := (_center(a) + _center(b)) * 0.5
		var n := a.size()
		for k in n:
			var k2 := (k + 1) % n
			_tri([a[k], a[k2], b[k2]], [ws[r], ws[r], ws[r + 1]], col, inside)
			_tri([a[k], b[k2], b[k]], [ws[r], ws[r + 1], ws[r + 1]], col, inside)
	if start_cap != null:
		_fan(rings[0], start_cap, ws[0], col, _center(rings[1]))
	if end_cap != null:
		_fan(rings[rings.size() - 1], end_cap, ws[ws.size() - 1], col, _center(rings[rings.size() - 2]))


func _fan(ring: PackedVector3Array, tip: Vector3, w: Array, col: Color, inside_hint: Vector3) -> void:
	var inside := (_center(ring) + inside_hint) * 0.5
	var n := ring.size()
	for k in n:
		_tri([ring[k], ring[(k + 1) % n], tip], [w, w, w], col, inside)


## a 10-point horizontal profile at height z: half-width w, front depth df (towards -Y), back depth db, centred at y = cy;
## fp pushes the two front-side points forward (over 1 = pecs standing proud of the breastbone)
static func _hring(z: float, w: float, df: float, db: float, cy := 0.0, fp := 0.92) -> PackedVector3Array:
	var pts := [Vector2(0.0, -df), Vector2(0.5 * w, -fp * df), Vector2(0.92 * w, -0.45 * df), Vector2(w, 0.1 * db),
		Vector2(0.75 * w, 0.85 * db), Vector2(0.0, db), Vector2(-0.75 * w, 0.85 * db), Vector2(-w, 0.1 * db),
		Vector2(-0.92 * w, -0.45 * df), Vector2(-0.5 * w, -fp * df)]
	var out := PackedVector3Array()
	for p in pts:
		out.append(Vector3(p.x, cy + p.y, z))
	return out


## an n-point ring round a limb axis: radius ru along u, rv along v (u, v perpendicular to the axis), centre c
static func _lring(c: Vector3, u: Vector3, v: Vector3, ru: float, rv: float, n := 8) -> PackedVector3Array:
	var out := PackedVector3Array()
	for k in n:
		var a := TAU * (k + 0.5) / n
		out.append(c + u * (cos(a) * ru) + v * (sin(a) * rv))
	return out


static func _mx(p: Vector3, left: bool) -> Vector3:
	return p if left else Vector3(-p.x, p.y, p.z)


static func _mring(r: PackedVector3Array, left: bool) -> PackedVector3Array:
	if left:
		return r
	var out := PackedVector3Array()
	for p in r:
		out.append(Vector3(-p.x, p.y, p.z))
	return out


# ---- the parts -------------------------------------------------------------------------------------------------------

func _torso() -> void:
	var rings := [
		_hring(0.86, 0.13, 0.085, 0.095),
		_hring(0.95, 0.163, 0.105, 0.125),
		_hring(1.08, 0.137, 0.097, 0.09),
		_hring(1.22, 0.172, 0.118, 0.105, 0.0, 1.0),
		_hring(1.33, 0.203, 0.136, 0.115, 0.0, 1.07),
		_hring(1.43, 0.215, 0.115, 0.105),
		_hring(1.50, 0.15, 0.078, 0.08),
		_hring(1.535, 0.072, 0.064, 0.06),
	]
	var ws := [["spine", "spine", 0.0], ["spine", "spine", 0.0], ["spine.001", "spine.001", 0.0], ["spine.002", "spine.002", 0.0],
		["spine.003", "spine.003", 0.0], ["spine.003", "spine.003", 0.0], ["spine.003", "spine.004", 0.3], ["spine.004", "spine.004", 0.0]]
	_loft(rings, ws, BODY_COL, Vector3(0.0, 0.0, 0.84), null)
	# the neck, up into the head
	var u := Vector3(1.0, 0.0, 0.0)
	var v := Vector3(0.0, 1.0, 0.0)
	_loft([_lring(Vector3(0.0, 0.005, 1.50), u, v, 0.072, 0.066), _lring(Vector3(0.0, 0.002, 1.57), u, v, 0.064, 0.06),
		_lring(Vector3(0.0, 0.0, 1.645), u, v, 0.058, 0.055)],
		[["spine.004", "spine.004", 0.0], ["spine.004", "spine.005", 0.5], ["spine.005", "spine.005", 0.0]], BODY_COL)


func _head() -> void:
	var cy := -0.012
	var w := ["spine.005", "spine.005", 0.0]
	var rings := [
		_hring(1.600, 0.066, 0.096, 0.035, cy),
		_hring(1.640, 0.079, 0.104, 0.075, cy),
		_hring(1.690, 0.082, 0.106, 0.095, cy),
		_hring(1.740, 0.085, 0.100, 0.102, cy),
		_hring(1.790, 0.079, 0.088, 0.098, cy),
		_hring(1.830, 0.055, 0.060, 0.070, cy),
	]
	_loft(rings, [w, w, w, w, w, w], BODY_COL, Vector3(0.0, cy - 0.02, 1.585), Vector3(0.0, cy + 0.005, 1.848))
	# the nose: a wedge on the face
	var top := Vector3(0.0, cy - 0.104, 1.728)
	var tip := Vector3(0.0, cy - 0.132, 1.676)
	var bl := Vector3(0.017, cy - 0.104, 1.668)
	var br := Vector3(-0.017, cy - 0.104, 1.668)
	var ins := Vector3(0.0, cy - 0.085, 1.69)
	_tri([tip, top, bl], [w, w, w], BODY_COL, ins)
	_tri([tip, br, top], [w, w, w], BODY_COL, ins)
	_tri([tip, bl, br], [w, w, w], BODY_COL, ins)
	# the brow: a low ridge over the eyes
	for s in [1.0, -1.0]:
		var a := Vector3(0.012 * s, cy - 0.103, 1.752)
		var b := Vector3(0.062 * s, cy - 0.086, 1.756)
		var c := Vector3(0.040 * s, cy - 0.104, 1.738)
		_tri([a, b, c], [w, w, w], BODY_COL, Vector3(0.035 * s, cy - 0.07, 1.75))
	# the eyes: dark slits just proud of the face, under the brow
	for s in [1.0, -1.0]:
		var e := []
		for q in [Vector2(0.016, 1.738), Vector2(0.041, 1.739), Vector2(0.040, 1.727), Vector2(0.018, 1.725)]:
			e.append(Vector3(q.x * s, cy - 0.103 + 0.19 * q.x, q.y))
		var ei := Vector3(0.03 * s, cy - 0.05, 1.732)
		_tri([e[0], e[1], e[2]], [w, w, w], EYE_COL, ei)
		_tri([e[0], e[2], e[3]], [w, w, w], EYE_COL, ei)
	# the hair: a shell over the top and back, its lower edge sloping from the hairline down to the nape, a quiff at the front
	var bottom := _hring(1.75, 0.091, 0.097, 0.111, cy)
	for k in bottom.size():
		var p := bottom[k]
		p.z = lerpf(1.800, 1.700, (p.y - (cy - 0.097)) / (0.097 + 0.111))
		bottom[k] = p
	var hair := [bottom, _hring(1.825, 0.091, 0.108, 0.109, cy), _hring(1.868, 0.076, 0.110, 0.094, cy - 0.008),
		_hring(1.895, 0.048, 0.090, 0.056, cy - 0.022)]
	_loft(hair, [w, w, w, w], HAIR_COL, null, Vector3(0.0, cy - 0.03, 1.906))
	# the inside of the hair's rim seen from below: close it with a band tucked against the head
	var inner := PackedVector3Array()
	for p in bottom:
		var q := p - Vector3(p.x, p.y - cy, 0.0) * 0.08
		inner.append(q + Vector3(0.0, 0.0, 0.012))
	_loft([inner, bottom], [w, w], HAIR_COL)


func _arm(left: bool) -> void:
	var s := ".L" if left else ".R"
	var d := ARM_DIR if left else Vector3(-ARM_DIR.x, ARM_DIR.y, ARM_DIR.z)
	var sh: Vector3 = _pos["upper_arm" + s]
	var el: Vector3 = _pos["forearm" + s]
	var wr: Vector3 = _pos["hand" + s]
	var u := Vector3(0.0, 1.0, 0.0)
	var v := d.cross(u).normalized()
	var ua := "upper_arm" + s
	var fa := "forearm" + s
	var ha := "hand" + s
	var ring := func(c: Vector3, ru: float, rv: float) -> PackedVector3Array: return _lring(c, u, v, ru, rv)
	_loft([ring.call(sh - d * 0.035, 0.064, 0.062), ring.call(sh + d * 0.03, 0.078, 0.076), ring.call(sh + d * 0.12, 0.064, 0.068),
		ring.call(sh + d * 0.21, 0.058, 0.062), ring.call(el - d * 0.03, 0.047, 0.048), ring.call(el, 0.045, 0.045),
		ring.call(el + d * 0.07, 0.054, 0.051), ring.call(el + d * 0.17, 0.043, 0.038), ring.call(wr, 0.034, 0.027)],
		[["spine.003", ua, 0.85], [ua, ua, 0.0], [ua, ua, 0.0], [ua, ua, 0.0], [ua, fa, 0.3], [ua, fa, 0.5], [fa, fa, 0.0], [fa, fa, 0.0],
		[fa, ha, 0.5]], BODY_COL, sh - d * 0.075)
	# the hand: palm towards the thigh, fingers together and a little curled, the thumb in front
	var curl := -v * 0.012
	var wh := [ha, ha, 0.0]
	_loft([ring.call(wr + d * 0.005, 0.033, 0.024), ring.call(wr + d * 0.06, 0.047, 0.024), ring.call(wr + d * 0.11, 0.046, 0.02),
		ring.call(wr + d * 0.165 + curl, 0.041, 0.015)], [wh, wh, wh, wh], BODY_COL, null, wr + d * 0.19 + curl * 1.6)
	var tb := wr + d * 0.035 - u * 0.033 - v * 0.006
	var tdir := (d * 0.6 - u * 0.55 - v * 0.35).normalized()
	_loft([_lring(tb, tdir.cross(v).normalized(), v, 0.015, 0.013, 6), _lring(tb + tdir * 0.045, tdir.cross(v).normalized(), v, 0.011, 0.01, 6)],
		[wh, wh], BODY_COL, null, tb + tdir * 0.065)


func _leg(left: bool) -> void:
	var s := ".L" if left else ".R"
	var hip: Vector3 = _pos["thigh" + s]
	var kn: Vector3 = _pos["shin" + s]
	var an: Vector3 = _pos["foot" + s]
	var th := "thigh" + s
	var sn := "shin" + s
	var ft := "foot" + s
	var u := Vector3(1.0, 0.0, 0.0)
	var v := Vector3(0.0, 1.0, 0.0)
	var a1 := (kn - hip)
	var a2 := (an - kn)
	var ring := func(c: Vector3, ru: float, rv: float) -> PackedVector3Array: return _lring(c, u, v, ru, rv)
	var back := Vector3(0.0, 0.012, 0.0)
	_loft([ring.call(hip - a1 * 0.08, 0.1, 0.105), ring.call(hip + a1 * 0.08, 0.1, 0.104), ring.call(hip + a1 * 0.45, 0.093, 0.098),
		ring.call(hip + a1 * 0.85, 0.068, 0.07), ring.call(kn, 0.057, 0.06), ring.call(kn + a2 * 0.12, 0.056, 0.061),
		ring.call(kn + a2 * 0.3 + back, 0.064, 0.072), ring.call(kn + a2 * 0.7, 0.047, 0.049), ring.call(kn + a2 * 0.92, 0.039, 0.041)],
		[["spine", th, 0.6], [th, th, 0.0], [th, th, 0.0], [th, th, 0.0], [th, sn, 0.5], [sn, sn, 0.0], [sn, sn, 0.0], [sn, sn, 0.0],
		[sn, ft, 0.5]], BODY_COL)
	# the foot: a boot-like block from the heel to the toe, flat on the ground
	var x := an.x
	var fu := Vector3(1.0, 0.0, 0.0)
	var fv := Vector3(0.0, 0.0, 1.0)
	var wf := [ft, ft, 0.0]
	var fr := func(y: float, z: float, rx: float, rz: float) -> PackedVector3Array: return _lring(Vector3(x, y, z), fu, fv, rx, rz)
	_loft([fr.call(0.055, 0.048, 0.044, 0.046), fr.call(0.01, 0.062, 0.05, 0.061), fr.call(-0.07, 0.045, 0.052, 0.044),
		fr.call(-0.15, 0.03, 0.048, 0.029), fr.call(-0.185, 0.026, 0.036, 0.022)], [wf, wf, wf, wf, wf], BODY_COL,
		Vector3(x, 0.075, 0.045), Vector3(x, -0.2, 0.022))
