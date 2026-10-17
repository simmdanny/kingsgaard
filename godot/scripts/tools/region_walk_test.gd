extends SceneTree
## REGION WALK TEST (scripts/tools/region_walk_test.gd): runs the real game and checks the tepui region with physics:
##  1. a spur: the hero is put at the foot of the walkable spur with the biggest rise and walks up its crest - it must climb
##     nearly all of it;
##  2. a wall: the hero walks straight at a sheer wall's foot for 25 s - it must neither climb it nor get through it (the
##     wall's trimesh collision).
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
				for r in region.ramps:
					if r.get("ok", false) and (pick == null or float(r.top) - float(r.low) > float(pick.top) - float(pick.low)):
						pick = r
				var at: Vector2 = pick.at
				var dir: Vector2 = pick.dir
				start = _local(at + dir * (float(pick.length) - 12.0))
				var tl: Vector3 = main.origin.to_local_pos(Vector3((at - dir * 20.0).x, 0.0, (at - dir * 20.0).y))
				goal = Vector3(tl.x, main.gen.height(tl.x, tl.z), tl.z)
				top_h = float(pick.top)
				main.player.place(start.x, start.z)
				start = main.player.position
				best_h = -1e9
				Input.action_press("move_forward")
				Input.action_press("sprint")
				step = 2
				t = 0.0
		2:
			_walk_toward(goal)
			best_h = maxf(best_h, main.player.position.y)
			if t > 150.0 or Vector2(main.player.position.x - goal.x, main.player.position.z - goal.z).length() < 10.0:
				var climbed: float = (best_h - start.y) / maxf(top_h - start.y, 1.0)
				_check(climbed > 0.9, "walking up a rock spur onto a plateau: climbed %.0f of its %.0f m (%.0f%%) in %.0f s" % [best_h - start.y, top_h - start.y, climbed * 100.0, t])
				# 2. a wall: one of the tallest wall pieces, its middle column; from 60 m out, straight at its foot
				var best_w = null
				var best_hgt := 0.0
				for w in region.walls:
					var v: PackedVector3Array = w.verts
					var rows := 0
					while rows + 1 < v.size() and is_equal_approx(v[rows + 1].x, v[rows + 1].x) and Vector2(v[rows + 1].x, v[rows + 1].z).distance_to(Vector2(v[0].x, v[0].z)) < 60.0 and v[rows + 1].y < v[rows].y:
						rows += 1
					var hgt: float = v[0].y - v[rows].y
					if hgt > best_hgt and v.size() > (rows + 1) * 12:
						best_hgt = hgt
						best_w = [w, rows]
				var wv: PackedVector3Array = best_w[0].verts
				var rws: int = best_w[1]
				var col: int = (wv.size() / (rws + 1)) / 2
				var vt := wv[col * (rws + 1)]
				var vb := wv[col * (rws + 1) + rws]
				var c: Vector2 = region.center
				var top2 := Vector2(vt.x, vt.z) + c
				var foot2 := Vector2(vb.x, vb.z) + c
				wall_out = (foot2 - top2).normalized()
				wall_foot = foot2
				wall_top = vt.y
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
				_check(best_h < start.y + 30.0 and deepest > -14.0, "walking into a sheer wall (%.0f m tall): got from %.0f m up to %.0f m, at most %.0f m past its foot line (its face slants in by 23 m from foot to top)" % [wall_top - start.y, start.y, best_h, -deepest])
				print("REGION WALK: %s (%d failed)" % ["OK" if fails == 0 else "FAILED", fails])
				return true
	return false
