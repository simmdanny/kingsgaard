extends SceneTree
## BAKE THE BOULDERS (scripts/tools/bake_stones.gd): tools/stones/stones.json (made by tools/stones/make_stones.py, the browser
## game's stone generator) -> art/stones/stones.res, a MeshLibrary of indexed smooth meshes, item shape * 3 + level (0 near, 1, 2 far).
## Per vertex COLOR = (edge, occ, rel, 1) and UV = (seam, 0) for shaders/stone.gdshader; each item's mesh keeps the shape's
## ymin, ymax and rx (half width) as metadata for placing (scripts/world/boulders.gd).
##   godot --headless --path godot --script res://scripts/tools/bake_stones.gd


func _init() -> void:
	var f := FileAccess.open("res://tools/stones/stones.json", FileAccess.READ)
	var data: Dictionary = JSON.parse_string(f.get_as_text())
	var lib := MeshLibrary.new()
	var shapes: Array = data.shapes
	for si in shapes.size():
		for lv in 3:
			var s: Dictionary = shapes[si][lv]
			var n: int = s.p.size() / 3
			var pos := PackedVector3Array()
			var nrm := PackedVector3Array()
			var col := PackedColorArray()
			var uv := PackedVector2Array()
			pos.resize(n)
			nrm.resize(n)
			col.resize(n)
			uv.resize(n)
			for i in n:
				pos[i] = Vector3(s.p[i * 3], s.p[i * 3 + 1], s.p[i * 3 + 2])
				nrm[i] = Vector3(s.n[i * 3], s.n[i * 3 + 1], s.n[i * 3 + 2])
				col[i] = Color(s.edge[i], s.occ[i], s.rel[i], 1.0)
				uv[i] = Vector2(s.seam[i], 0.0)
			var arrays := []
			arrays.resize(Mesh.ARRAY_MAX)
			arrays[Mesh.ARRAY_VERTEX] = pos
			arrays[Mesh.ARRAY_NORMAL] = nrm
			arrays[Mesh.ARRAY_COLOR] = col
			arrays[Mesh.ARRAY_TEX_UV] = uv
			arrays[Mesh.ARRAY_INDEX] = PackedInt32Array(s.i)
			var mesh := ArrayMesh.new()
			mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
			mesh.set_meta("ymin", s.ymin)
			mesh.set_meta("ymax", s.ymax)
			mesh.set_meta("rx", s.rx)
			var id := si * 3 + lv
			lib.create_item(id)
			lib.set_item_name(id, "stone_%02d_l%d" % [si, lv])
			lib.set_item_mesh(id, mesh)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://art/stones"))
	var err := ResourceSaver.save(lib, "res://art/stones/stones.res")
	print("BAKED %d stones x 3 levels -> art/stones/stones.res (%s)" % [shapes.size(), error_string(err)])
	quit()
