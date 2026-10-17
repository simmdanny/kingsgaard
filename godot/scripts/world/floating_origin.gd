extends Node
## THE FLOATING ORIGIN (scripts/world/floating_origin.gd): keeps the camera near (0, 0, 0) wherever it is on the 30 km island, so
## nothing jitters. Godot is built with 32-bit floats: 15 km out a position can only move in 1 mm steps, enough to make the hero,
## the camera and the ground shimmer. So whenever the camera is more than SHIFT_AT from the origin along x or z, the whole world
## moves back by a whole number of Terrain3D regions (4.096 km): the terrain's regions are re-filed under new locations (no
## heightmap is copied or re-uploaded - only Terrain3D's 32 x 32 region map changes), and the hero, camera, grass and anything
## else listening to `shifted` move by the same amount. The camera then stays within about 3 km of the origin - 0.25 mm steps.
## `offset` is where the local origin is on the map: map = local + offset. The generator's queries take local coordinates.
## Shaders that paint by world position (ground noise, water, wind) add the global shader uniform `world_offset`, so their
## patterns stay put across a shift.

signal about_to_shift
signal shifted(d: Vector3)

## how far the camera may get from the origin (along x or z) before the world moves back, m
const SHIFT_AT := 3072.0

var enabled := true
var offset := Vector2.ZERO
var step := 4096.0
var shifts := 0
var terrain
var gen


func to_local_pos(p: Vector3) -> Vector3:
	return Vector3(p.x - offset.x, p.y, p.z - offset.y)


func to_map_pos(p: Vector3) -> Vector3:
	return Vector3(p.x + offset.x, p.y, p.z + offset.y)


## called each frame with the camera's position
func update(focus: Vector3) -> void:
	if enabled and (absf(focus.x) > SHIFT_AT or absf(focus.z) > SHIFT_AT):
		recenter(focus)


## move the world so that `focus` (local) ends up within half a region of the origin
func recenter(focus: Vector3) -> void:
	if not enabled:
		return
	var k := Vector2i(roundi(focus.x / step), roundi(focus.z / step))
	if k == Vector2i.ZERO:
		return
	about_to_shift.emit()
	var d := Vector3(k.x * step, 0.0, k.y * step)
	offset += Vector2(d.x, d.z)
	gen.offset = offset
	terrain.shift_regions(-k)
	RenderingServer.global_shader_parameter_set("world_offset", offset)
	shifts += 1
	shifted.emit(d)
