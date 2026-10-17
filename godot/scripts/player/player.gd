extends CharacterBody3D
## THE HERO (scripts/player/player.gd): walks the continent. W/A/S/D move relative to the camera, Shift runs, Alt sprints, Space
## jumps. A physics body (a capsule) on the terrain's own collision: it walks up slopes to MAX_WALK_ANGLE (35 degrees) and no
## steeper - cliffs and steep mountain sides stop it and it slides back down them; the sea stops it at the waterline. While
## the camera flies or a screenshot pins it far away (no collision is built there) the body waits.
## Looks (set_hero), all animated in code by rig_anim.gd: "male" = alicewithalex's Low Poly Male Character
## (assets/characters/male01, CC-BY-4.0 - credit in SOURCE.md), "female" = the same model made feminine in code (feminize.gd);
## also "male-built" = the faceted man built in code after the user's reference sheet (male_body.gd), "stand-in" = a capsule.

const WALK := 2.4
const RUN := 5.5
const SPRINT := 9.0
const GRAVITY := 22.0
const JUMP := 6.5
const MAX_WALK_ANGLE := 35.0
const RigAnim := preload("res://scripts/player/rig_anim.gd")
const MaleBody := preload("res://scripts/player/male_body.gd")
const Feminize := preload("res://scripts/player/feminize.gd")
const MAN := "res://assets/characters/male01/scene.gltf"
const MAN_HEIGHT := 1.85
## his rig's bones under the metarig names rig_anim.gd speaks
const MAN_BONES := {
	"spine": "Base_02", "spine.001": "Spine_03", "spine.003": "Chest_04", "spine.004": "Neck_05", "spine.005": "Head_06",
	"upper_arm.L": "UpArm.L_08", "forearm.L": "LowArm.L_09", "hand.L": "Palm.L_010",
	"upper_arm.R": "UpArm.R_022", "forearm.R": "LowArm.R_023", "hand.R": "Palm.R_024",
	"thigh.L": "UpLeg.L_036", "shin.L": "LowLeg.L_037", "foot.L": "Foot.L_038",
	"thigh.R": "UpLeg.R_040", "shin.R": "LowLeg.R_041", "foot.R": "Foot.R_042",
	"thumb.01.L": "f0.1.l_019", "thumb.02.L": "f0.2.l_020", "f_index.01.L": "f1.1.l_017", "f_index.02.L": "f1.2.l_018",
	"f_middle.01.L": "f2.1.l_011", "f_middle.02.L": "f2.2.l_012", "f_ring.01.L": "f3.1.l_013", "f_ring.02.L": "f3.2.l_014",
	"f_pinky.01.L": "f4.1.l_015", "f_pinky.02.L": "f4.2.l_016",
	"thumb.01.R": "f0.1.r_033", "thumb.02.R": "f0.2.r_034", "f_index.01.R": "f1.1.r_031", "f_index.02.R": "f1.2.r_032",
	"f_middle.01.R": "f2.1.r_025", "f_middle.02.R": "f2.2.r_026", "f_ring.01.R": "f3.1.r_027", "f_ring.02.R": "f3.2.r_028",
	"f_pinky.01.R": "f4.1.r_029", "f_pinky.02.R": "f4.2.r_030",
}

var gen
var rig
var vel := Vector3.ZERO
var on_ground := true
var frozen := true
var _hold := 0
var hero := ""
var _body: Node3D
var _anim = null


func _ready() -> void:
	var shape := CapsuleShape3D.new()
	shape.radius = 0.3
	shape.height = 1.76
	var col := CollisionShape3D.new()
	col.shape = shape
	col.position = Vector3(0.0, 0.88, 0.0)
	add_child(col)
	floor_max_angle = deg_to_rad(MAX_WALK_ANGLE)
	floor_snap_length = 0.7
	floor_stop_on_slope = true
	floor_constant_speed = true
	floor_block_on_wall = false
	_body = Node3D.new()
	add_child(_body)
	if hero == "":
		set_hero("female")


## switch the look: "female", "male", "male-built" or "stand-in" ("female-b", her old test name, is "female")
func set_hero(kind: String) -> void:
	if kind == "female-b":
		kind = "female"
	hero = kind
	if _body == null:
		return
	for ch in _body.get_children():
		ch.queue_free()
	_anim = null
	if kind == "male" or kind == "female":
		var man: Node3D = (load(MAN) as PackedScene).instantiate()
		_body.add_child(man)
		var sk: Skeleton3D = man.find_children("*", "Skeleton3D", true, false)[0]
		var height := MAN_HEIGHT
		if kind == "female":
			Feminize.new().apply(man)
			height = 1.70
		# the file's units are arbitrary: scale to the height by the top of the head (Head_end) in the skeleton
		var k := _chain_scale(sk, man)
		var top := sk.get_bone_global_rest(sk.find_bone("Head_end_050")).origin.z * 1.02
		man.scale = Vector3.ONE * (height / (top * k))
		_anim = RigAnim.new()
		_anim.setup(sk, height / top, MAN_BONES, true)
	elif kind == "male-built":
		var man: Node3D = MaleBody.new().build()
		_body.add_child(man)
		_anim = RigAnim.new()
		_anim.setup(man.find_children("*", "Skeleton3D", true, false)[0], 1.0)
	else:
		_stand_in()


## how much bigger one unit of node n is than one unit of its ancestor top (the product of the scales in between)
static func _chain_scale(n: Node3D, top: Node3D) -> float:
	var k := 1.0
	var p: Node = n
	while p != null and p != top:
		if p is Node3D:
			k *= (p as Node3D).scale.x
		p = p.get_parent()
	return k


func _stand_in() -> void:
	var cloth := _mat(Color(0.20, 0.36, 0.62))
	var skin := _mat(Color(0.93, 0.74, 0.60))
	var leather := _mat(Color(0.36, 0.23, 0.14))
	var torso := CapsuleMesh.new()
	torso.radius = 0.27
	torso.height = 1.22
	_part(torso, cloth, Vector3(0.0, 0.78, 0.0))
	var belt := CylinderMesh.new()
	belt.top_radius = 0.285
	belt.bottom_radius = 0.285
	belt.height = 0.1
	_part(belt, leather, Vector3(0.0, 0.82, 0.0))
	var head := SphereMesh.new()
	head.radius = 0.19
	head.height = 0.38
	_part(head, skin, Vector3(0.0, 1.58, 0.0))
	var nose := BoxMesh.new()
	nose.size = Vector3(0.06, 0.06, 0.1)
	_part(nose, skin, Vector3(0.0, 1.57, 0.2))


func _mat(c: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 0.85
	return m


func _part(mesh: Mesh, mat: Material, at: Vector3) -> void:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = at
	_body.add_child(mi)


func _physics_process(dt: float) -> void:
	if _hold > 0:
		_hold -= 1
	frozen = gen == null or not gen.ready or _hold > 0 or (rig != null and (rig.fly or rig.pinned))
	if frozen:
		velocity = Vector3.ZERO
		vel = Vector3.ZERO
		return
	var input := Vector2.ZERO
	# (in a screenshot run only the tool's scripted walk moves the hero, not keys pressed while its window has focus)
	if not Shot.active or Shot.walk > 0.0:
		input = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var speed := WALK
	if Input.is_action_pressed("sprint"):
		speed = SPRINT
	elif Input.is_action_pressed("run"):
		speed = RUN
	var yaw: float = rig.yaw if rig != null else 0.0
	var dir := Vector3(input.x, 0.0, input.y).rotated(Vector3.UP, yaw)
	var want := dir * speed
	var k := 1.0 - exp(-(10.0 if is_on_floor() else 1.5) * dt)
	velocity.x = lerpf(velocity.x, want.x, k)
	velocity.z = lerpf(velocity.z, want.z, k)
	# the sea: no walking into deep water
	if gen.height(position.x + velocity.x * dt * 4.0, position.z + velocity.z * dt * 4.0) < -0.9:
		velocity.x = 0.0
		velocity.z = 0.0
	if is_on_floor():
		if Input.is_action_just_pressed("jump"):
			velocity.y = JUMP
	else:
		velocity.y -= GRAVITY * dt
	move_and_slide()
	# a safety net: never below the ground (e.g. before the collision round a new spot is built)
	var g: float = gen.height(position.x, position.z)
	if position.y < g - 1.5:
		position.y = g + 0.05
		velocity.y = 0.0
	on_ground = is_on_floor()
	vel = velocity
	if dir.length() > 0.1:
		_body.rotation.y = lerp_angle(_body.rotation.y, atan2(dir.x, dir.z), 1.0 - exp(-12.0 * dt))


func _process(dt: float) -> void:
	if _anim != null:
		_anim.update(minf(dt, 0.1), vel, on_ground or frozen)


## turn the hero to face a direction (on the ground plane)
func face(d: Vector3) -> void:
	_body.rotation.y = atan2(d.x, d.z)


## the floating origin moved the world back by d: the hero moves with it (and waits two physics steps, while Terrain3D builds
## the collision round the camera's new position)
func shift_origin(d: Vector3) -> void:
	position -= d
	_hold = 3


## put the hero on the ground at (x, z)
func place(x: float, z: float) -> void:
	position = Vector3(x, gen.height(x, z) + 0.05, z)
	velocity = Vector3.ZERO
	vel = Vector3.ZERO
	on_ground = true
