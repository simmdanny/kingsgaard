extends Node3D
## THE CAMERA (scripts/player/camera_rig.gd): third person round the hero - drag with a mouse button to turn it, the wheel zooms -
## kept above the ground. F switches to flying (W/A/S/D along the view, Space up, Ctrl down, Shift x5, Alt x25) to look over the
## continent; F again lands the hero under the camera. The screenshot tool can pin it to a fixed view (pin()).

var gen
var target: Node3D
var camera: Camera3D
var yaw := 0.0
var pitch := -0.3
var dist := 6.5
var fly := false
var pinned := false
var sensitivity := 1.0  ## the Mouse sensitivity setting

var _drag := false
var _fly_pos := Vector3.ZERO


func _ready() -> void:
	camera = Camera3D.new()
	camera.near = 0.15
	camera.far = 16000.0
	camera.fov = 65.0
	add_child(camera)
	camera.current = true


## the floating origin moved the world back by d: the camera moves with it
func shift_origin(d: Vector3) -> void:
	_fly_pos -= d
	camera.global_position -= d


func pin(pos: Vector3, look: Vector3) -> void:
	pinned = true
	camera.look_at_from_position(pos, look)


func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventMouseButton:
		var mb := e as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT or mb.button_index == MOUSE_BUTTON_RIGHT:
			_drag = mb.pressed
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_UP:
			dist = maxf(2.0, dist * 0.9)
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			dist = minf(40.0, dist * 1.1)
	elif e is InputEventMouseMotion and _drag:
		var mm := e as InputEventMouseMotion
		yaw -= mm.relative.x * 0.005 * sensitivity
		pitch = clampf(pitch - mm.relative.y * 0.004 * sensitivity, -1.45, 0.6 if fly else 0.35)
	elif e.is_action_pressed("fly"):
		_toggle_fly()


func _toggle_fly() -> void:
	fly = not fly
	if fly:
		_fly_pos = camera.global_position + Vector3(0.0, 2.0, 0.0)
	else:
		var p := camera.global_position
		if gen.height(p.x, p.z) > -0.5:
			target.place(p.x, p.z)


func _process(dt: float) -> void:
	if pinned:
		return
	dt = minf(dt, 0.1)
	var b := Basis.from_euler(Vector3(pitch, yaw, 0.0))
	if fly:
		var input := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
		var up := 0.0
		if Input.is_action_pressed("jump"):
			up += 1.0
		if Input.is_action_pressed("down"):
			up -= 1.0
		var speed := 40.0
		if Input.is_action_pressed("sprint"):
			speed *= 25.0
		elif Input.is_action_pressed("run"):
			speed *= 5.0
		_fly_pos += (b * Vector3(input.x, 0.0, input.y) + Vector3(0.0, up, 0.0)) * speed * dt
		_fly_pos.y = maxf(_fly_pos.y, maxf(gen.height(_fly_pos.x, _fly_pos.z), 0.0) + 1.5)
		camera.global_transform = Transform3D(b, _fly_pos)
		return
	var head := target.position + (Shot.look if Shot.look.x != INF else Vector3(0.0, 1.55, 0.0))
	var pos := head + b * Vector3(0.0, 0.0, dist)
	pos.y = maxf(pos.y, gen.ground_at(pos.x, pos.z) + 0.4)
	camera.look_at_from_position(pos, head)
