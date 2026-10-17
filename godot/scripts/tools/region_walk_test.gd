extends SceneTree
## REGION WALK TEST (scripts/tools/region_walk_test.gd): runs the real game and checks the tepui region with physics:
##  1. a way up: the hero is put on the ground in front of the ravine with the biggest rise and walks up its floor - it must
##     climb nearly all of it and come out on the plateau's top;
##  2. a wall: the hero walks straight at the tallest wall piece's face for 25 s - it must neither climb it nor get through it
##     (the wall's trimesh collision; the terrain's own step is behind the face);
##  3. the biggest arch: the hero walks through its opening on the ground, from one side of the fin to the other;
##  4. and across its top, over the opening, without falling (the carved mesh's collision carries it).
##   Godot_console.exe --path . --resolution 1280x720 --script res://scripts/tools/region_walk_test.gd

var main
var step := 0
var t := 0.0
var fails := 0
var start := Vector3.ZERO
var goal := Vector3.ZERO
var best_h := -1e9
var top_h := 0.0
var wall_foot := Vector2.ZERO
var wall_out := Vector2.ZERO
var wall_top := 0.0
var deepest := 1e9
var path_pts: Array = []
var path_i := 0
var low_h := 1e9


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


func _local(p: Vector2) -> Vector3:
	main.origin.recenter(main.origin.to_local_pos(Vector3(p.x, 0.0, p.y)))
	var l: Vector3 = main.origin.to_local_pos(Vector3(p.x, 0.0, p.y))
	return Vector3(l.x, main.gen.height(l.x, l.z), l.z)


func _big_arch(region) -> Dictionary:
	var best: Dictionary = region.arches[0]
	for ar in region.arches:
		if float(ar.ho) > float(best.ho):
			best = ar
	return best


func _process(dt: float) -> bool:
	t += dt
	var region = main.terrain.region
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
				var pick = null
				for nt in region.notches:
					if nt.get("ok", false) and (pick == null or float(nt.top) - float(nt.low) > float(pick.top) - float(pick.low)):
						pick = nt
				var at: Vector2 = pick.at
				var dir: Vector2 = pick.dir
				var out: Vector2 = pick.out
				# from 30 m out in front of the ravine to its mouth, then up its middle to 40 m past its top
				var ln: float = float(pick.length) + float(pick.get("start", 0.0))
				path_pts = [at + out * 4.0, at + dir * (ln * 0.5), at + dir * (ln + 40.0)]
				print("  ravine: mouth (%.0f, %.0f) dir (%.2f, %.2f) out (%.2f, %.2f) length %.0f low %.0f top %.0f" % [at.x, at.y, dir.x, dir.y, out.x, out.y, pick.length, pick.low, pick.top])
				path_i = 0
				start = _local(at + out * 30.0)
				top_h = float(pick.top)
				main.player.place(start.x, start.z)
				start = main.player.position
				best_h = -1e9
				Input.action_press("move_forward")
				Input.action_press("sprint")
				step = 2
				t = 0.0
		2:
			var tp: Vector2 = path_pts[path_i]
			var tl: Vector3 = main.origin.to_local_pos(Vector3(tp.x, 0.0, tp.y))
			_walk_toward(tl)
			if Vector2(main.player.position.x - tl.x, main.player.position.z - tl.z).length() < 8.0 and path_i < path_pts.size() - 1:
				path_i += 1
				tp = path_pts[path_i]
				tl = main.origin.to_local_pos(Vector3(tp.x, 0.0, tp.y))
			best_h = maxf(best_h, main.player.position.y)
			if int(t / 5.0) != int((t - dt) / 5.0):
				var mp: Vector3 = main.origin.to_map_pos(main.player.position)
				var hero2: CharacterBody3D = main.player
				var col := hero2.get_last_slide_collision()
				var what := "none"
				if col != null:
					what = "%s normal %s at %s" % [str((col.get_collider() as Node).name) if col.get_collider() is Node else "?", str(col.get_normal()), str(main.origin.to_map_pos(col.get_position()))]
				print("  t %3.0f  hero (%.0f, %.0f) h %.0f  going to point %d (%.0f, %.0f)  wall %s floor %s vel %s  hit %s" % [t, mp.x, mp.z, mp.y, path_i, tp.x, tp.y, hero2.is_on_wall(), hero2.is_on_floor(), str(hero2.velocity), what])
			if t > 150.0 or (path_i == path_pts.size() - 1 and Vector2(main.player.position.x - tl.x, main.player.position.z - tl.z).length() < 10.0):
				var climbed: float = (best_h - start.y) / maxf(top_h - start.y, 1.0)
				_check(climbed > 0.95, "walking up a ravine onto a plateau: climbed %.0f of its %.0f m (%.0f%%) in %.0f s" % [best_h - start.y, top_h - start.y, climbed * 100.0, t])
				# 2. a wall: the tallest wall piece, its middle column; from 60 m out, straight at its foot
				var best_w = null
				for w in region.walls:
					if best_w == null or float(w.height) > float(best_w.height):
						best_w = w
				var probe: PackedVector3Array = best_w.probe
				var c: Vector2 = region.center
				var top2 := Vector2(probe[0].x, probe[0].z) + c
				var foot2 := Vector2(probe[1].x, probe[1].z) + c
				var p2 := Vector2(probe[0].x, probe[0].z)
				# (the face's outward direction: from the plateau's top, sampled a little inside the top edge)
				wall_out = (foot2 - top2).normalized()
				if wall_out.length() < 0.5:
					wall_out = (p2 - Vector2(probe[0].x, probe[0].z)).normalized()
				wall_foot = foot2
				wall_top = probe[0].y
				var s2 := _local(foot2 + wall_out * 60.0)
				main.player.place(s2.x, s2.z)
				start = main.player.position
				var gl: Vector3 = main.origin.to_local_pos(Vector3(foot2.x - wall_out.x * 30.0, 0.0, foot2.y - wall_out.y * 30.0))
				goal = gl
				best_h = -1e9
				deepest = 1e9
				step = 3
				t = 0.0
		3:
			_walk_toward(goal)
			var hero = main.player
			best_h = maxf(best_h, hero.position.y)
			var m: Vector3 = main.origin.to_map_pos(hero.position)
			deepest = minf(deepest, (Vector2(m.x, m.z) - wall_foot).dot(wall_out))
			if t > 25.0:
				Input.action_release("move_forward")
				Input.action_release("sprint")
				_check(best_h < start.y + 20.0 and deepest > -4.0, "walking into a sheer wall (%.0f m tall): got from %.0f m up to %.0f m, at most %.1f m past its foot line" % [wall_top - start.y, start.y, best_h, -deepest])
				if region.arches.is_empty():
					print("REGION WALK: %s (%d failed)" % ["OK" if fails == 0 else "FAILED", fails])
					return true
				# 3. through the biggest arch's opening, on the ground
				var ar: Dictionary = _big_arch(region)
				var c: Vector2 = ar.c
				var tv: Vector2 = ar.t
				var s3 := _local(c + tv * (float(ar.B) + 25.0))
				main.player.place(s3.x, s3.z)
				start = main.player.position
				var g3: Vector2 = c - tv * (float(ar.B) + 25.0)
				goal = main.origin.to_local_pos(Vector3(g3.x, 0.0, g3.y))
				best_h = -1e9
				Input.action_press("move_forward")
				Input.action_press("sprint")
				step = 4
				t = 0.0
		4:
			_walk_toward(goal)
			best_h = maxf(best_h, main.player.position.y)
			var ar4: Dictionary = _big_arch(main.terrain.region)
			var gd := Vector2(main.player.position.x - goal.x, main.player.position.z - goal.z).length()
			if t > 40.0 or gd < 10.0:
				_check(gd < 10.0 and best_h < float(ar4.ground) + 12.0, "walking through the big arch's opening (%.0f m tall): %s, highest %.0f m above the ground there" % [ar4.ho, "came out the other side" if gd < 10.0 else "stopped %.0f m short" % gd, best_h - float(ar4.ground)])
				# 4. across its top, over the opening
				var c4: Vector2 = ar4.c
				var ax: Vector2 = ar4.axis
				var s4 := _local(c4 - ax * (float(ar4.strip) + 30.0))
				main.player.place(s4.x, s4.z)
				start = main.player.position
				var g4: Vector2 = c4 + ax * (float(ar4.strip) + 12.0)
				goal = main.origin.to_local_pos(Vector3(g4.x, 0.0, g4.y))
				low_h = 1e9
				step = 5
				t = 0.0
		5:
			_walk_toward(goal)
			if t > 1.0:
				low_h = minf(low_h, main.player.position.y)
			var ar5: Dictionary = _big_arch(main.terrain.region)
			var gd5 := Vector2(main.player.position.x - goal.x, main.player.position.z - goal.z).length()
			if t > 40.0 or gd5 < 8.0:
				Input.action_release("move_forward")
				Input.action_release("sprint")
				_check(gd5 < 8.0 and low_h > float(ar5.top) - 4.0, "walking across the big arch's top (%.0f m above the ground): %s, lowest %.1f m below its top" % [float(ar5.top) - float(ar5.ground), "crossed" if gd5 < 8.0 else "stopped %.0f m short" % gd5, float(ar5.top) - low_h])
				print("REGION WALK: %s (%d failed)" % ["OK" if fails == 0 else "FAILED", fails])
				return true
	return false
