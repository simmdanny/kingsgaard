extends SceneTree
## SHAPE PROBE (scripts/tools/shape_probe.gd): where the arm and leg joints are in the body mesh's bind space, and the torso's,
## the hips' and the thighs' widths per height band (vertices by their skin weights), to plan the female hero's proportions.
##   Godot_console.exe --path . --headless --script res://scripts/tools/shape_probe.gd [-- --fem]   (--fem: after feminize.gd)

func _init() -> void:
	var root := (load("res://assets/characters/male01/scene.gltf") as PackedScene).instantiate()
	if "--fem" in OS.get_cmdline_user_args():
		(load("res://scripts/player/feminize.gd")).new().apply(root)
	var sk: Skeleton3D = root.find_children("*", "Skeleton3D", true, false)[0]
	var body: MeshInstance3D = null
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		if (mi as MeshInstance3D).mesh.surface_get_material(0).resource_name == "Material.001":
			body = mi
	var skin: Skin = body.skin
	var bindname := {}
	for b in skin.get_bind_count():
		bindname[b] = skin.get_bind_name(b)
	for n in ["Base_02", "Spine_03", "Chest_04", "Neck_05", "UpArm.L_08", "LowArm.L_09", "UpArm.R_022", "UpLeg.L_036", "LowLeg.L_037", "UpLeg.R_040"]:
		var bi := sk.find_bone(n)
		var g := sk.get_bone_global_rest(bi)
		var par := sk.get_bone_parent(bi)
		var head := Vector3.INF
		var mm := Transform3D()
		for b in skin.get_bind_count():
			if skin.get_bind_name(b) == n:
				head = skin.get_bind_pose(b).affine_inverse().origin
				mm = g * skin.get_bind_pose(b)
		print("%-12s parent=%-12s skel=%s mesh_head=%s  M.basis.x=%s M.origin=%s" % [n, sk.get_bone_name(par) if par >= 0 else "-", g.origin, head, mm.basis.x, mm.origin])
	var a := body.mesh.surface_get_arrays(0)
	var v: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
	var bo: PackedInt32Array = a[Mesh.ARRAY_BONES]
	var we: PackedFloat32Array = a[Mesh.ARRAY_WEIGHTS]
	var part := func(i: int, pre: Array) -> float:
		var s := 0.0
		for k in 4:
			var nm: String = bindname.get(bo[i * 4 + k], "")
			for p in pre:
				if nm.begins_with(p):
					s += we[i * 4 + k]
		return s
	print("-- torso (arm weight < .5): y band, x range, z range; arms (>= .5) nearest x")
	for b in range(20, 66, 1):
		var y0 := b * 0.1
		var tx := Vector2(9, -9)
		var tz := Vector2(9, -9)
		var ax := 9.0
		for i in v.size():
			var p := v[i]
			if p.y < y0 or p.y >= y0 + 0.1:
				continue
			var arm: float = part.call(i, ["UpArm", "LowArm", "Palm", "f"])
			if arm < 0.5 and p.x > -1.5 and p.x < 1.5:
				tx = Vector2(minf(tx.x, p.x), maxf(tx.y, p.x))
				tz = Vector2(minf(tz.x, p.z), maxf(tz.y, p.z))
			elif arm >= 0.5:
				ax = minf(ax, absf(p.x))
		print("y %.1f  x %.2f..%.2f  z %.2f..%.2f  arm_in %.2f" % [y0, tx.x, tx.y, tz.x, tz.y, ax])
	print("-- left thigh/leg (x > 0, leg weight >= .5): y band, x range, z range")
	for b in range(4, 40, 2):
		var y0 := b * 0.1
		var lx := Vector2(9, -9)
		var lz := Vector2(9, -9)
		for i in v.size():
			var p := v[i]
			if p.y < y0 or p.y >= y0 + 0.2 or p.x <= 0.0:
				continue
			if part.call(i, ["UpLeg", "LowLeg", "Foot"]) >= 0.5:
				lx = Vector2(minf(lx.x, p.x), maxf(lx.y, p.x))
				lz = Vector2(minf(lz.x, p.z), maxf(lz.y, p.z))
		print("y %.1f  x %.2f..%.2f  z %.2f..%.2f" % [y0, lx.x, lx.y, lz.x, lz.y])
	root.free()
	quit()
