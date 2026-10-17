extends SceneTree
## TERRAIN WALK TEST (scripts/tools/terrain_walk_test.gd): runs the real game and checks the terrain with physics:
##  1. collision: rays straight down at 300 points round the hero hit the collision exactly where the heightmap says
##     (Terrain3D's height and the generator's own) - the largest differences are printed;
##  2. a pass: the hero is put at the foot of a pass and walks up it (W held, facing the top) - it must climb most of it;
##  3. a cliff: the hero is put in front of a cliff edge (no pass near) and walks into it - it must not get up.
##   Godot_console.exe --path . --resolution 1280x720 --script res://scripts/tools/terrain_walk_test.gd

var main
var step := 0
var t := 0.0
var fails := 0
var start := Vector3.ZERO
var goal := Vector3.ZERO
var best_h := -1e9
var route_top := 0.0


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


func _process(dt: float) -> bool:
	t += dt
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
				_collision_check()
				# 2. the pass: from its foot, walk to its top
				var g = main.gen
				start = g.pois.pass_foot
				goal = g.pois.pass_top
				main.player.place(start.x, start.z)
				start = main.player.position
				# the highest ground along the pass (the route may top out before its far end)
				route_top = -1e9
				for s2 in 41:
					var p2: Vector3 = start.lerp(goal, s2 / 40.0)
					route_top = maxf(route_top, g.height(p2.x, p2.z))
				best_h = -1e9
				Input.action_press("move_forward")
				Input.action_press("sprint")
				step = 2
				t = 0.0
		2:
			_walk_toward(goal)
			best_h = maxf(best_h, main.player.position.y)
			if t > 100.0 or Vector2(main.player.position.x - goal.x, main.player.position.z - goal.z).length() < 25.0:
				var climbed: float = (best_h - start.y) / maxf(route_top - start.y, 1.0)
				_check(climbed > 0.9, "walking up a pass (%.0f m long): climbed %.0f of the %.0f m rise (%.0f%%) in %.0f s" % [Vector2(goal.x - start.x, goal.z - start.z).length(), best_h - start.y, route_top - start.y, climbed * 100.0, t])
				# 3. a cliff: from the lowlands, walk straight at the plateau's rim
				var g = main.gen
				var stand: Vector3 = g.pois.edge_stand
				var look: Vector3 = g.pois.edge_look
				var out := Vector3(look.x - stand.x, 0.0, look.z - stand.z).normalized()
				start = stand + out * 150.0
				goal = stand
				main.player.place(start.x, start.z)
				start = main.player.position
				best_h = -1e9
				step = 3
				t = 0.0
		3:
			_walk_toward(goal)
			best_h = maxf(best_h, main.player.position.y)
			if t > 25.0:
				Input.action_release("move_forward")
				Input.action_release("sprint")
				_check(best_h < goal.y - 20.0, "walking into a cliff: got from %.0f m up to %.0f m, the rim is at %.0f m (stopped %.0f m below it)" % [start.y, best_h, goal.y, goal.y - best_h])
				print("TERRAIN WALK: %s (%d failed)" % ["OK" if fails == 0 else "FAILED", fails])
				return true
	return false


func _collision_check() -> void:
	var space: PhysicsDirectSpaceState3D = main.get_world_3d().direct_space_state
	var hero = main.player
	var g = main.gen
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var worst_t3d := 0.0
	var worst_gen := 0.0
	var hits := 0
	for k in 300:
		var x: float = hero.position.x + rng.randf_range(-40.0, 40.0)
		var z: float = hero.position.z + rng.randf_range(-40.0, 40.0)
		var q := PhysicsRayQueryParameters3D.create(Vector3(x, 2000.0, z), Vector3(x, -100.0, z))
		q.exclude = [hero.get_rid()]
		var r := space.intersect_ray(q)
		if r.is_empty():
			continue
		hits += 1
		var hy: float = r.position.y
		worst_t3d = maxf(worst_t3d, absf(hy - main.terrain.terrain.data.get_height(Vector3(x, 0.0, z))))
		worst_gen = maxf(worst_gen, absf(hy - g.height(x, z)))
	_check(hits > 250 and worst_t3d < 0.25 and worst_gen < 0.25, "collision matches the heightmap: %d rays, largest gap %.3f m to Terrain3D's height, %.3f m to the generator's" % [hits, worst_t3d, worst_gen])
