extends SceneTree
## MODEL PROBE (scripts/tools/model_probe.gd): prints an imported model's node tree, its skeleton (bones, parents, rest positions
## in model space), meshes (surfaces, materials, AABB) and animations - to wire a new character up.
##   Godot_console.exe --headless --path <project> --script res://scripts/tools/model_probe.gd -- res://path/model.fbx


func _init() -> void:
	var path := "res://assets/characters/male01/scene.gltf"
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		path = args[0]
	var ps: PackedScene = load(path)
	var root := ps.instantiate()
	_walk(root, 0)
	quit()


func _walk(n: Node, depth: int) -> void:
	var line := "  ".repeat(depth) + "%s (%s)" % [n.name, n.get_class()]
	if n is Node3D:
		var t := (n as Node3D).transform
		line += " pos=%s rot=%s scale=%s" % [t.origin, (n as Node3D).rotation_degrees, (n as Node3D).scale]
	print(line)
	if n is Skeleton3D:
		var sk := n as Skeleton3D
		for b in sk.get_bone_count():
			var g := sk.get_bone_global_rest(b)
			print("    bone %d %s parent=%d global_rest_origin=%s" % [b, sk.get_bone_name(b), sk.get_bone_parent(b), g.origin])
	if n is MeshInstance3D:
		var mi := n as MeshInstance3D
		var m := mi.mesh
		if m != null:
			print("    mesh surfaces=%d aabb=%s skin=%s" % [m.get_surface_count(), m.get_aabb(), mi.skin != null])
			for s in m.get_surface_count():
				var mat := m.surface_get_material(s)
				var arr := m.surface_get_arrays(s)
				print("    surface %d verts=%d mat=%s" % [s, (arr[Mesh.ARRAY_VERTEX] as PackedVector3Array).size(), mat])
	if n is AnimationPlayer:
		var ap := n as AnimationPlayer
		for a in ap.get_animation_list():
			print("    anim %s length=%.2f" % [a, ap.get_animation(a).length])
	for c in n.get_children():
		_walk(c, depth + 1)
