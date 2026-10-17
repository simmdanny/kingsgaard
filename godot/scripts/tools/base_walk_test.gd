extends SceneTree
## BASE TERRAIN WALK TEST (scripts/tools/base_walk_test.gd): runs the real game on the base terrain and checks it with physics:
##  1. collision: rays straight down at 300 points round the hero land where the heightmap says (Terrain3D's and the generator's)
##  2. a route: the hero is put at the foot of the ramp route with the biggest rise and walks up it along its walkable path
##     (route_path: waypoints over cells under the walk check's angle) - it must climb nearly all of it
##  3. an escarpment: the hero walks straight at the steepest stretch of an edge (the steep-edge mask) - it must not get up
##  4. the floating origin: the hero is sent 9 km away (the world shifts by whole regions) - the collision there must match the
##     heightmap and the hero must stand on the ground; then it walks across a shift boundary - no jump, no fall
##   Godot_console.exe --path . --resolution 1280x720 --script res://scripts/tools/base_walk_test.gd

var main
var step := 0
var t := 0.0
var fails := 0
var start := Vector3.ZERO
var goal := Vector3.ZERO
var best_h := -1e9
var top_h := 0.0
var last_map := Vector3.ZERO
var worst_jump := 0.0
var worst_float := 0.0
var shifts0 := 0
var path := PackedVector2Array()
var wp := 0


func _initialize() -> void:
	main = (load("res://scenes/main.tscn") as PackedScene).instantiate()
	root.add_child(main)
	current_scene = main


func _check(ok: bool, what: String) -> void:
	print(("PASS  " if ok else "FAIL  ") + what)
	if not ok:
		fails += 1


func _walk_toward(p: Vector3) -> void:
	var hero = main.player
	var d := Vector3(p.x - hero.position.x, 0.0, p.z - hero.position.z).normalized()
	main.rig.yaw = atan2(-d.x, -d.z)


## a map point as a local one on the ground (moving the floating origin there first)
func _go(p: Vector3) -> Vector3:
	main.origin.recenter(main.origin.to_local_pos(p))
	var l: Vector3 = main.origin.to_local_pos(p)
	return Vector3(l.x, main.gen.height(l.x, l.z), l.z)


func _process(dt: float) -> bool:
	t += dt
	var g = main.gen
	match step:
		0:
			if main._spawned and t > 3.0:
				main.menu.visible = false
				main.menu.in_game = true
				main.player.set_hero("male")
				step = 1
				t = 0.0
		1:
			if t > 2.0:
				_collision_check("at the spawn")
				# 2. the walkable ramp route with the biggest rise, walked from its foot to its top
				var pick = null
				for r in g.routes:
					if r.kind == "ramp" and r.ok and (pick == null or float(r.dh) > float(pick.dh)):
						pick = r
				path = g.route_path(pick)
				wp = 1
				start = _go(Vector3(path[0].x, 0.0, path[0].y))
				var tm: Vector3 = main.origin.to_local_pos(Vector3(path[path.size() - 1].x, 0.0, path[path.size() - 1].y))
				goal = Vector3(tm.x, g.height(tm.x, tm.z), tm.z)
				main.player.place(start.x, start.z)
				start = main.player.position
				top_h = goal.y
				best_h = -1e9
				Input.action_press("move_forward")
				Input.action_press("sprint")
				step = 2
				t = 0.0
		2:
			# from waypoint to waypoint (map points, made local each frame: the world may shift on the way)
			var target: Vector3 = main.origin.to_local_pos(Vector3(path[wp].x, 0.0, path[wp].y))
			if Vector2(main.player.position.x - target.x, main.player.position.z - target.z).length() < 12.0 and wp < path.size() - 1:
				wp += 1
			_walk_toward(target)
			best_h = maxf(best_h, main.player.position.y)
			goal = main.origin.to_local_pos(Vector3(path[path.size() - 1].x, top_h, path[path.size() - 1].y))
			if t > 300.0 or Vector2(main.player.position.x - goal.x, main.player.position.z - goal.z).length() < 12.0:
				var climbed: float = (best_h - start.y) / maxf(top_h - start.y, 1.0)
				_check(climbed > 0.9, "walking up a route ramp along its path (%d waypoints, %.0f m as the crow flies): climbed %.0f of its %.0f m (%.0f%%) in %.0f s" % [path.size(),
					path[0].distance_to(path[path.size() - 1]), best_h - start.y, top_h - start.y, climbed * 100.0, t])
				# 3. the steepest stretch of an edge: from 200 m below it, straight at it
				var bq := -1
				var bm := 0
				for q in range(0, g.c_steep.size(), 3):
					if g.c_steep[q] > bm and g.c_tier[q] >= 2 and g.c_tier[q] != 255:
						bm = g.c_steep[q]
						bq = q
				var pres: int = g.pres
				var sp2 := Vector2(g._gx(bq % pres, pres), g._gx(bq / pres, pres))
				var here := _go(Vector3(sp2.x, 0.0, sp2.y))
				# downhill from it
				var down := Vector2(g.height(here.x + 8.0, here.z) - g.height(here.x - 8.0, here.z), g.height(here.x, here.z + 8.0) - g.height(here.x, here.z - 8.0)).normalized() * -1.0
				start = Vector3(here.x + down.x * 200.0, 0.0, here.z + down.y * 200.0)
				goal = here
				top_h = g.height(here.x - down.x * 60.0, here.z - down.y * 60.0)
				main.player.place(start.x, start.z)
				start = main.player.position
				best_h = -1e9
				step = 3
				t = 0.0
		3:
			_walk_toward(goal)
			best_h = maxf(best_h, main.player.position.y)
			if t > 30.0:
				_check(best_h < goal.y - 15.0, "walking into an escarpment's steepest stretch (%.0f deg there): got from %.0f m up to %.0f m, its middle is at %.0f m" % [g.slope(goal.x, goal.z), start.y, best_h, goal.y])
				Input.action_release("move_forward")
				Input.action_release("sprint")
				# 4. the floating origin: 9 km away
				shifts0 = main.origin.shifts
				var m: Vector3 = main.origin.to_map_pos(main.player.position)
				var far := Vector3(m.x + 9000.0, 0.0, m.z)
				if absf(far.x) > 13000.0:
					far.x = m.x - 9000.0
				# (land there, not sea)
				for k in 40:
					if g.tier_at(far.x - main.origin.offset.x, far.z - main.origin.offset.y) != 255:
						break
					far.z += 200.0 * (1.0 if m.z < 0.0 else -1.0)
				var l: Vector3 = main.origin.to_local_pos(far)
				main.player.place(l.x, l.z)
				step = 4
				t = 0.0
		4:
			if t > 3.0:
				var hero = main.player
				var m: Vector3 = main.origin.to_map_pos(hero.position)
				_check(main.origin.shifts > shifts0 and absf(hero.position.x) < 3100.0 and absf(hero.position.z) < 3100.0,
					"the world shifted under the camera: %d shift(s), origin now at %+.1f %+.1f km, the hero at local %.0f %.0f (map %.0f %.0f)" % [main.origin.shifts - shifts0,
					main.origin.offset.x / 1000.0, main.origin.offset.y / 1000.0, hero.position.x, hero.position.z, m.x, m.z])
				_collision_check("9 km away, after the shift")
				var gh: float = g.height(hero.position.x, hero.position.z)
				_check(absf(hero.position.y - gh) < 0.3, "the hero stands on the ground there: %.2f m above the heightmap" % (hero.position.y - gh))
				# walk across a shift boundary: put the hero 40 m short of it, walking on along x
				var dir := 1.0 if hero.position.x >= 0.0 else -1.0
				var bx: float = main.origin.SHIFT_AT * dir - 40.0 * dir
				var bz: float = hero.position.z
				for k in 30:
					if g.tier_at(bx, bz) != 255 and g.slope(bx, bz) < 15.0 and g.slope(bx + 60.0 * dir, bz) < 15.0:
						break
					bz += 120.0
				main.player.place(bx, bz)
				goal = Vector3(bx + dir * 10000.0, 0.0, bz)
				shifts0 = main.origin.shifts
				last_map = main.origin.to_map_pos(main.player.position)
				worst_jump = 0.0
				worst_float = 0.0
				Input.action_press("move_forward")
				Input.action_press("sprint")
				step = 5
				t = 0.0
		5:
			# (only the walk's direction matters, so the goal can stay where it is when the world shifts)
			var hero = main.player
			var dirx := signf(goal.x - hero.position.x)
			main.rig.yaw = atan2(-dirx, 0.0)
			var m: Vector3 = main.origin.to_map_pos(hero.position)
			if t > 0.5:
				worst_jump = maxf(worst_jump, Vector2(m.x - last_map.x, m.z - last_map.z).length())
				worst_float = maxf(worst_float, absf(hero.position.y - g.height(hero.position.x, hero.position.z)))
			last_map = m
			if t > 12.0:
				Input.action_release("move_forward")
				Input.action_release("sprint")
				_check(main.origin.shifts > shifts0 and worst_jump < 1.0 and worst_float < 1.0,
					"walking across a shift boundary: %d shift(s) on the way, largest step between frames %.2f m, largest gap to the ground %.2f m" % [main.origin.shifts - shifts0,
					worst_jump, worst_float])
				print("BASE WALK: %s (%d failed)" % ["OK" if fails == 0 else "FAILED", fails])
				return true
	return false


func _collision_check(where: String) -> void:
	var space: PhysicsDirectSpaceState3D = main.get_world_3d().direct_space_state
	var hero = main.player
	var g = main.gen
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var worst_t3d := 0.0
	var worst_gen := 0.0
	var hits := 0
	for k in 300:
		var x: float = hero.position.x + rng.randf_range(-60.0, 60.0)
		var z: float = hero.position.z + rng.randf_range(-60.0, 60.0)
		var q := PhysicsRayQueryParameters3D.create(Vector3(x, 3000.0, z), Vector3(x, -100.0, z))
		q.exclude = [hero.get_rid()]
		var r := space.intersect_ray(q)
		if r.is_empty():
			continue
		hits += 1
		var hy: float = r.position.y
		worst_t3d = maxf(worst_t3d, absf(hy - main.terrain.terrain.data.get_height(Vector3(x, 0.0, z))))
		worst_gen = maxf(worst_gen, absf(hy - g.height(x, z)))
	_check(hits > 250 and worst_t3d < 0.25 and worst_gen < 0.25, "collision matches the heightmap %s: %d rays, largest gap %.3f m to Terrain3D's height, %.3f m to the generator's" % [where, hits, worst_t3d, worst_gen])
