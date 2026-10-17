extends SceneTree
## TERRAIN3D PROBE (scripts/tools/t3d_probe.gd): prints the Terrain3D classes' properties and methods in this Godot.

func _init() -> void:
	for cls in ["Terrain3D", "Terrain3DData", "Terrain3DCollision", "Terrain3DMaterial", "Terrain3DMesher"]:
		if not ClassDB.class_exists(cls):
			print("MISSING ", cls)
			continue
		var props := []
		for p in ClassDB.class_get_property_list(cls, true):
			if p.usage & PROPERTY_USAGE_EDITOR or p.usage & PROPERTY_USAGE_STORAGE:
				props.append("%s:%d" % [p.name, p.type])
		var meths := []
		for m in ClassDB.class_get_method_list(cls, true):
			var args := []
			for a in m.args:
				args.append(a.name)
			meths.append("%s(%s)" % [m.name, ", ".join(args)])
		print("== %s\nPROPS %s\nMETHODS %s" % [cls, ", ".join(props), ", ".join(meths)])
		for e in ClassDB.class_get_enum_list(cls, true):
			print("ENUM %s: %s" % [e, ClassDB.class_get_enum_constants(cls, e, true)])
	quit()
