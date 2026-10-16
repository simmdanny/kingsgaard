extends SceneTree
## BODY PROBE (scripts/tools/body_probe.gd): measures a skinned model's body mesh in its bind space - per height band the
## torso's width and depth - plus its surfaces' array formats and the skin's binds, to plan mesh reshaping.

func _init() -> void:
	var root := (load("res://assets/characters/male01/scene.gltf") as PackedScene).instantiate()
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		var m: Mesh = mi.mesh
		var a := m.surface_get_arrays(0)
		var v: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
		var bones = a[Mesh.ARRAY_BONES]
		print("%s mat=%s verts=%d idx=%d bones/vert=%s uv=%s format=%d" % [mi.name, m.surface_get_material(0).resource_name, v.size(),
			(a[Mesh.ARRAY_INDEX] as PackedInt32Array).size(), (bones.size() / v.size()) if bones != null else "none", a[Mesh.ARRAY_TEX_UV] != null, m.surface_get_format(0)])
	var body: MeshInstance3D = root.find_children("Object_70", "MeshInstance3D", true, false)[0]
	var skin: Skin = body.skin
	var s := ""
	for i in skin.get_bind_count():
		s += "%d:%s/%d " % [i, skin.get_bind_name(i), skin.get_bind_bone(i)]
	print("binds ", s)
	var v: PackedVector3Array = body.mesh.surface_get_arrays(0)[Mesh.ARRAY_VERTEX]
	for b in range(0, 70):
		var y0 := b * 0.1
		var xs := []
		var mnx := 9.0
		var mxx := -9.0
		var mnz := 9.0
		var mxz := -9.0
		var n := 0
		for p in v:
			if p.y >= y0 and p.y < y0 + 0.1 and absf(p.x) < 0.72:
				mnx = minf(mnx, p.x)
				mxx = maxf(mxx, p.x)
				mnz = minf(mnz, p.z)
				mxz = maxf(mxz, p.z)
				n += 1
		if n > 0 and b % 2 == 0:
			print("y %.1f: x %.2f..%.2f z %.2f..%.2f (%d)" % [y0, mnx, mxx, mnz, mxz, n])
	root.free()
	quit()
