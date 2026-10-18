extends SceneTree
## REGION HEIGHT PROBE (scripts/tools/region_height_probe.gd): runs the game and compares, along a line out from a carved
## feature's centre, the height Terrain3D holds with the region's own heightmap (they must agree: the carved rock's top is
## tuned against the region's heights).
##   Godot_console.exe --path . --script res://scripts/tools/region_height_probe.gd -- sinkhole1

var main
var t := 0.0
var done := false


func _initialize() -> void:
	main = (load("res://scenes/main.tscn") as PackedScene).instantiate()
	root.add_child(main)
	current_scene = main


func _process(dt: float) -> bool:
	t += dt
	if done or not main._spawned or t < 4.0:
		return done
	done = true
	var region = main.terrain.region
	var args := OS.get_cmdline_user_args()
	var want: String = args[0] if args.size() > 0 else "sinkhole1"
	for fe in region.features:
		if str(fe.name) != want:
			continue
		var c: Vector2 = fe.c
		print("%s: centre (%.0f, %.0f), rt %.0f m, top %.1f m" % [fe.name, c.x, c.y, float(fe.get("rt", 0.0)), float(fe.top)])
		for dir in [Vector2(1, 0), Vector2(0, 1), Vector2(-0.7071, 0.7071)]:
			var line := ""
			for r in range(40, 104, 4):
				var p: Vector2 = c + (dir as Vector2) * float(r)
				var l: Vector3 = main.origin.to_local_pos(Vector3(p.x, 0.0, p.y))
				var ht: float = main.terrain.terrain.data.get_height(l)
				var hr: float = region.height_at(p)
				line += " %d:%+.1f" % [r, ht - hr]
			print("  dir %s  Terrain3D minus region (m) by distance:%s" % [str(dir), line])
	print("HEIGHT PROBE done")
	return true
