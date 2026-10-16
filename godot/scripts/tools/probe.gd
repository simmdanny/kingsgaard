extends SceneTree
## WORLD PROBE (scripts/tools/probe.gd): prints places worth a screenshot - the spawn, the coast in eight directions, the nearest
## forest edge and meadow - for the shot tool's --cam/--spawn.
##   Godot_console.exe --headless --path <project> --script res://scripts/tools/probe.gd

const WorldGen := preload("res://scripts/world/world_gen.gd")


func _init() -> void:
	var g = WorldGen.new(1)
	var sp: Vector3 = g.find_spawn()
	print("spawn %.0f %.0f h=%.1f" % [sp.x, sp.z, sp.y])
	for k in 8:
		var a := TAU * k / 8.0
		var d := Vector2(cos(a), sin(a))
		var r := 0.0
		while r < 16000.0 and g.coast_dist(d.x * r, d.y * r) > 0.0:
			r += 20.0
		print("coast dir %d: %.0f %.0f (r %.0f)" % [k, d.x * r, d.y * r, r])
	var best_f := Vector2.ZERO
	var best_m := Vector2.ZERO
	var df := INF
	var dm := INF
	for j in range(-60, 61):
		for i in range(-60, 61):
			var x := sp.x + i * 60.0
			var z := sp.z + j * 60.0
			var v: Vector4 = g.sample(x, z)
			var dd := Vector2(i, j).length()
			if v.y > 0.9 and dd < df:
				df = dd
				best_f = Vector2(x, z)
			if v.z > 0.9 and dd < dm:
				dm = dd
				best_m = Vector2(x, z)
	print("forest %.0f %.0f" % [best_f.x, best_f.y])
	print("meadow %.0f %.0f" % [best_m.x, best_m.y])
	quit()
