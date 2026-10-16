extends Node3D
## THE HERO (scripts/player/player.gd): walks the continent. W/A/S/D move relative to the camera, Shift runs, Alt sprints, Space
## jumps. Stands on the ground exactly as the terrain draws it (WorldGen.ground_at); the sea stops the hero at the waterline.
## Looks (set_hero), all animated in code by rig_anim.gd: "female" = DBlob_UA's Low_poly_Girl_01v1 (assets/characters/girl01),
## "male" = alicewithalex's Low Poly Male Character (assets/characters/male01, CC-BY-4.0 - credit in SOURCE.md),
## "female-b" = a test: the male model made feminine in code (feminize.gd), "male-built" = the faceted man built in code after
## the user's reference sheet (male_body.gd), "stand-in" = the old capsule.

const WALK := 2.4
const RUN := 5.5
const SPRINT := 9.0
const GRAVITY := 22.0
const JUMP := 6.5
const RigAnim := preload("res://scripts/player/rig_anim.gd")
const GIRL := "res://assets/characters/girl01/Low_poly_Girl_01v1.fbx"
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
var hero := ""
var _body: Node3D
var _anim = null


func _ready() -> void:
	_body = Node3D.new()
	add_child(_body)
	if hero == "":
		set_hero("female")


## switch the look: "female", "male", "female-b", "male-built" or "stand-in"
func set_hero(kind: String) -> void:
	# the female model is not in the public repo (no license): until her files are added, Female plays as Female B
	if kind == "female" and not ResourceLoader.exists(GIRL):
		kind = "female-b"
	hero = kind
	if _body == null:
		return
	for ch in _body.get_children():
		ch.queue_free()
	_anim = null
	if kind == "female":
		var girl: Node3D = (load(GIRL) as PackedScene).instantiate()
		_body.add_child(girl)
		var sk: Skeleton3D = girl.find_children("*", "Skeleton3D", true, false)[0]
		# her palette's skin swatch is pale cream: tone the whole material down a touch for the bright sun
		for mi in girl.find_children("*", "MeshInstance3D", true, false):
			var m: StandardMaterial3D = (mi as MeshInstance3D).mesh.surface_get_material(0).duplicate()
			m.albedo_color = Color(0.86, 0.85, 0.84)
			m.roughness = 0.9
			(mi as MeshInstance3D).material_override = m
		_anim = RigAnim.new()
		_anim.setup(sk, 100.0)
	elif kind == "male" or kind == "female-b":
		var man: Node3D = (load(MAN) as PackedScene).instantiate()
		_body.add_child(man)
		var sk: Skeleton3D = man.find_children("*", "Skeleton3D", true, false)[0]
		var height := MAN_HEIGHT
		if kind == "female-b":
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


func _process(dt: float) -> void:
	dt = minf(dt, 0.1)
	var input := Vector2.ZERO
	# (in a screenshot run only the tool's scripted walk moves the hero, not keys pressed while its window has focus)
	if (rig == null or not rig.fly) and (not Shot.active or Shot.walk > 0.0):
		input = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var speed := WALK
	if Input.is_action_pressed("sprint"):
		speed = SPRINT
	elif Input.is_action_pressed("run"):
		speed = RUN
	var yaw: float = rig.yaw if rig != null else 0.0
	var dir := Vector3(input.x, 0.0, input.y).rotated(Vector3.UP, yaw)
	var want := dir * speed
	var k := 1.0 - exp(-(10.0 if on_ground else 1.5) * dt)
	vel.x = lerpf(vel.x, want.x, k)
	vel.z = lerpf(vel.z, want.z, k)
	var nx := position.x + vel.x * dt
	var nz := position.z + vel.z * dt
	if gen.height(nx, nz) < -0.9:
		vel.x = 0.0
		vel.z = 0.0
	else:
		position.x = nx
		position.z = nz
	var g: float = gen.ground_at(position.x, position.z)
	if on_ground and Input.is_action_just_pressed("jump") and (rig == null or not rig.fly):
		vel.y = JUMP
		on_ground = false
	if on_ground:
		if position.y - g < 0.35:
			position.y = g
			vel.y = 0.0
		else:
			on_ground = false
	if not on_ground:
		vel.y -= GRAVITY * dt
		position.y += vel.y * dt
		if position.y <= g:
			position.y = g
			vel.y = 0.0
			on_ground = true
	if dir.length() > 0.1:
		_body.rotation.y = lerp_angle(_body.rotation.y, atan2(dir.x, dir.z), 1.0 - exp(-12.0 * dt))
	if _anim != null:
		_anim.update(dt, vel, on_ground)


## put him on the ground at (x, z)
func place(x: float, z: float) -> void:
	position = Vector3(x, gen.ground_at(x, z), z)
	vel = Vector3.ZERO
	on_ground = true
