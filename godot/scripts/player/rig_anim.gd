extends RefCounted
## THE HERO'S MOTION (scripts/player/rig_anim.gd): procedural animation for a Blender "metarig" skeleton (spine..spine.006,
## upper_arm/forearm/hand, thigh/shin/foot, .L/.R) - no animation clips needed. Each frame it poses the bones from the hero's
## speed and state: idle (breathing, arms down from the rest A-pose), a walk / run / sprint gait blended by speed (phase advanced
## by the distance walked, so steps keep pace with the ground), forward lean, hip twist and bob, and a tucked pose in the air.
##
## Rotations are written in the skeleton's rest frame (Blender axes: +Z up, -Y forward, +X the character's left) about each
## bone's own head, for the left side; the right side gets the mirror image. _rot() turns that into the bone's local pose.
## Other rigs with the same axes work through a name map (metarig name -> the rig's bone; missing bones are skipped), and
## the arms come down by however far their rest pose is from hanging (A-pose or T-pose alike).
##
## Hands (setup with hands = true, for rigs with finger bones): a relaxed curl that grows from index to little finger, slow
## idle fidgets per finger, a looser fist the faster the run, fingers opening and fanning in the air, and a wrist that trails
## the arm's swing (the hand flops behind it) and breathes a little when standing. The palm's axes come from the rest pose:
## its normal from the knuckle line and the hand's length, each finger's curl axis across its own direction and that normal.

const MOVE_BONES := ["spine", "spine.001", "spine.002", "spine.003", "spine.004", "spine.005", "upper_arm.L", "forearm.L", "hand.L",
	"upper_arm.R", "forearm.R", "hand.R", "thigh.L", "shin.L", "foot.L", "thigh.R", "shin.R", "foot.R"]
const X := Vector3(1.0, 0.0, 0.0)
const Y := Vector3(0.0, 1.0, 0.0)
const Z := Vector3(0.0, 0.0, 1.0)

const FINGERS := ["f_index", "f_middle", "f_ring", "f_pinky"]
const ARMS_HANG := 76.0  ## how far below horizontal the arms hang at rest, degrees

var skel: Skeleton3D
var arm_down := 36.0  ## degrees the arms come down from the rest pose (set from the rig in setup)

var _bones := {}
var _hinge := Vector3.ZERO
var _elbow_rest := 0.0  # how far the rest pose already bends the elbow (degrees) - straightened out first
var _hip := 0
var _hip_rest := Vector3.ZERO
var _hip_frame := Basis()
var _names := {}
var _unit := 0.01
var _phase := 0.0
var _spd := 0.0
var _air := 0.0
var _t := 0.0
var _hands := false
var _hn := Vector3.ZERO  # the palm's normal (out of the palm), rest frame, left hand
var _hw := Vector3.ZERO  # the wrist's flex axis (bends the hand towards the palm)
var _hax := {}  # finger (and "thumb") -> its curl axis
var _prev_swing := [0.0, 0.0]
var _lag := [0.0, 0.0]


## metres_per_unit: how many metres one skeleton unit is in the game; names: metarig name -> this rig's bone name;
## hands: animate the wrists and fingers too
func setup(sk: Skeleton3D, metres_per_unit: float, names := {}, hands := false) -> void:
	skel = sk
	_unit = 1.0 / metres_per_unit
	_names = names
	var all := MOVE_BONES.duplicate()
	if hands:
		for f in FINGERS + ["thumb"]:
			for seg in [".01", ".02"]:
				all.append(f + seg + ".L")
				all.append(f + seg + ".R")
	for n in all:
		var i := sk.find_bone(_names.get(n, n))
		if i < 0:
			continue
		_bones[n] = [i, sk.get_bone_rest(i).basis.get_rotation_quaternion(), sk.get_bone_global_rest(i).basis.get_rotation_quaternion()]
	_hip = _idx("spine")
	_hip_rest = sk.get_bone_rest(_hip).origin
	var hp := sk.get_bone_parent(_hip)
	if hp >= 0:
		_hip_frame = sk.get_bone_global_rest(hp).basis.inverse()
	# the elbow's hinge: across the forearm (as it lies in the rest pose) and the forward axis
	var ua := _idx("upper_arm.L")
	var fa := _idx("forearm.L")
	var ha := _idx("hand.L")
	if fa >= 0 and ha >= 0:
		var d := sk.get_bone_global_rest(ha).origin - sk.get_bone_global_rest(fa).origin
		_hinge = Vector3(0.0, -1.0, 0.0).cross(d).normalized()
		if ua >= 0:
			var u := sk.get_bone_global_rest(fa).origin - sk.get_bone_global_rest(ua).origin
			_elbow_rest = rad_to_deg(u.angle_to(d))
	# the arms come down from wherever they rest to hanging
	if ua >= 0 and fa >= 0:
		var a := sk.get_bone_global_rest(fa).origin - sk.get_bone_global_rest(ua).origin
		arm_down = ARMS_HANG - rad_to_deg(atan2(-a.z, Vector2(a.x, a.y).length()))
	if hands and ha >= 0 and _idx("f_index.01.L") >= 0 and _idx("f_middle.01.L") >= 0 and _idx("f_pinky.01.L") >= 0:
		_hands = true
		var palm := _rest_at("hand.L")
		var l := (_rest_at("f_middle.01.L") - palm).normalized()
		var w := _rest_at("f_pinky.01.L") - _rest_at("f_index.01.L")
		_hn = w.cross(l).normalized()
		_hw = l.cross(_hn).normalized()
		for f in FINGERS + ["thumb"]:
			var d := (_rest_at(f + ".02.L") - _rest_at(f + ".01.L")).normalized()
			_hax[f] = d.cross(_hn).normalized()


func _rest_at(n: String) -> Vector3:
	return skel.get_bone_global_rest(_idx(n)).origin if _idx(n) >= 0 else Vector3.ZERO


func _idx(n: String) -> int:
	return _bones[n][0] if _bones.has(n) else -1


static func _q(axis: Vector3, deg: float) -> Quaternion:
	return Quaternion(axis, deg_to_rad(deg))


## the mirror image (across the character's middle plane, x -> -x) of a rotation
static func _mir(q: Quaternion) -> Quaternion:
	return Quaternion(q.x, -q.y, -q.z, q.w)


## pose a bone by a rotation r given in the skeleton's rest frame, about the bone's head
func _rot(bone: String, r: Quaternion) -> void:
	var b = _bones.get(bone)
	if b == null:
		return
	var g: Quaternion = b[2]
	skel.set_bone_pose_rotation(b[0], b[1] * (g.inverse() * r * g))


func _side(left: bool, bone: String, r: Quaternion) -> void:
	_rot(bone + (".L" if left else ".R"), r if left else _mir(r))


## dt, the hero's velocity (m/s) and whether he stands on the ground
func update(dt: float, vel: Vector3, on_ground: bool) -> void:
	if skel == null:
		return
	_t += dt
	var hs := Vector2(vel.x, vel.z).length()
	_spd = lerpf(_spd, hs, 1.0 - exp(-8.0 * dt))
	_air = move_toward(_air, 0.0 if on_ground else 1.0, dt * (4.0 if on_ground else 6.0))
	if on_ground:
		_phase = fposmod(_phase + hs * dt / (1.25 + 0.3 * _spd), 1.0)
	var mv := smoothstep(0.05, 1.2, _spd)
	var kr := smoothstep(2.8, 5.5, _spd)
	var ks := smoothstep(5.5, 9.0, _spd)
	var thigh_a := lerpf(lerpf(26.0, 38.0, kr), 48.0, ks) * mv
	var knee_a := lerpf(lerpf(40.0, 78.0, kr), 105.0, ks) * mv
	var knee_st := lerpf(lerpf(4.0, 16.0, kr), 22.0, ks) * mv
	var arm_a := lerpf(lerpf(20.0, 36.0, kr), 52.0, ks) * mv
	var elbow := 10.0 + lerpf(lerpf(8.0, 60.0, kr), 85.0, ks) * mv
	var lean := lerpf(lerpf(4.0, 13.0, kr), 21.0, ks) * mv
	var bob := lerpf(lerpf(0.025, 0.04, kr), 0.05, ks) * mv
	var twist := lerpf(lerpf(5.0, 8.0, kr), 10.0, ks) * mv
	var breath := sin(_t * 1.6) * (1.0 - mv)
	var fist := lerpf(lerpf(0.05, 0.35, kr), 0.65, ks) * mv
	var t := _phase * TAU
	for side in 2:
		var left := side == 0
		var ph := t + (0.0 if left else PI)
		var s := sin(ph)
		var c := cos(ph)
		# the leg: thigh forward/back, knee bent most in mid-swing (thigh moving forward), foot kept near flat
		var thigh := thigh_a * s
		var knee := knee_st + knee_a * pow(maxf(0.0, c), 1.4)
		var foot := clampf(0.8 * (thigh - knee), -60.0, 30.0)
		# in the air: one knee up, the other trailing
		var a_th := 34.0 if left else -6.0
		var a_kn := 72.0 if left else 28.0
		thigh = lerpf(thigh, a_th, _air)
		knee = lerpf(knee, a_kn, _air)
		foot = lerpf(foot, -20.0, _air)
		_side(left, "thigh", _q(X, -thigh))
		_side(left, "shin", _q(X, knee))
		_side(left, "foot", _q(X, foot))
		# the arm: swings against the same side's leg, the elbow bends more the faster she goes
		var swing := lerpf(-arm_a * s, -18.0 if left else 22.0, _air)
		var down := arm_down - 10.0 * _air + 1.5 * breath
		_side(left, "upper_arm", _q(X, -swing) * _q(Y, down))
		_side(left, "forearm", _q(_hinge, _elbow_rest - lerpf(elbow, 40.0, _air)))
		if _hands:
			_hand_pose(left, side, dt, swing, mv, fist)
		else:
			_side(left, "hand", _q(X, -6.0))
	# the body: hips twist with the legs and bob twice a cycle, the chest counter-twists, the spine leans in with speed,
	# the neck keeps the head level
	var hip_yaw := twist * sin(t)
	_rot("spine", _q(Z, hip_yaw) * _q(Y, 2.0 * cos(t) * mv))
	_rot("spine.001", _q(X, lean * 0.35) * _q(Z, -hip_yaw * 0.5))
	_rot("spine.002", _q(X, lean * 0.3 + breath * 0.6))
	_rot("spine.003", _q(X, lean * 0.35 + breath) * _q(Z, -hip_yaw * 0.7))
	_rot("spine.004", _q(X, -lean * 0.4))
	_rot("spine.005", _q(X, -lean * 0.2))
	var up := bob * (absf(cos(t)) - 0.6) - 0.04 * mv * kr - 0.06 * _air
	skel.set_bone_pose_position(_hip, _hip_rest + _hip_frame * Vector3(0.0, 0.0, up * _unit))


## one hand: the wrist trails the arm's swing (sideways, the way a hanging hand flops) and breathes when idle; the fingers
## curl from relaxed to a loose fist with speed, fidget a little, and open and fan out in the air
func _hand_pose(left: bool, side: int, dt: float, swing: float, mv: float, fist: float) -> void:
	var sv: float = (swing - _prev_swing[side]) / maxf(dt, 0.0001)
	_prev_swing[side] = swing
	_lag[side] = lerpf(_lag[side], clampf(-0.035 * sv, -18.0, 18.0), 1.0 - exp(-10.0 * dt))
	var idle := 1.0 - mv
	var sd := float(side)
	var flex := 10.0 + 4.0 * sin(_t * 0.7 + sd * 1.9) * idle - 14.0 * _air + 8.0 * fist
	var dev: float = _lag[side] + 3.0 * sin(_t * 0.45 + sd * 2.6) * idle
	_side(left, "hand", _q(_hn, dev) * _q(_hw, flex))
	for i in 4:
		var f: String = FINGERS[i]
		var fid := (3.0 + 2.0 * idle) * sin(_t * (0.8 + 0.27 * i + 0.13 * sd) + 1.7 * i + 2.3 * sd)
		var c1: float = [24.0, 30.0, 36.0, 42.0][i] + 50.0 * fist + fid - 18.0 * _air
		var c2: float = [28.0, 32.0, 36.0, 40.0][i] + 55.0 * fist + 0.8 * fid - 18.0 * _air
		var spread := (1.5 - i) * (3.0 + 7.0 * _air - 2.5 * fist)
		_side(left, f + ".01", _q(_hn, spread) * _q(_hax[f], c1))
		_side(left, f + ".02", _q(_hax[f], c2))
	var tf := 2.5 * sin(_t * 0.9 + 0.5 + 2.3 * sd)
	_side(left, "thumb.01", _q(_hn, -(14.0 + 18.0 * fist)) * _q(_hax["thumb"], 14.0 + 18.0 * fist + tf))
	_side(left, "thumb.02", _q(_hax["thumb"], 22.0 + 25.0 * fist + tf))
