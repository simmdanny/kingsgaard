extends SceneTree
## POI PROFILE (scripts/tools/poi_profile.gd): loads the cached base terrain and prints the ground along each screenshot place's
## line of sight (height / tier / slope at 13 points) - to check the places the generator picked.
##   Godot_console.exe --headless --path . --script res://scripts/tools/poi_profile.gd

const Config := preload("res://scripts/world/base_terrain_config.gd")
const Gen := preload("res://scripts/world/base_terrain_gen.gd")


func _initialize() -> void:
	var cfg = Config.new()
	var gen = Gen.new(cfg)
	var path := "user://terrain/base_%d_%s.bin" % [cfg.seed_value, cfg.cache_key(Gen.VERSION)]
	if not gen.load_cache(path):
		print("no cache ", path)
		quit()
		return
	print("pois: ", gen.pois)
	for pair in [["low_stand", "low_look"], ["edge_stand", "edge_look"], ["mount_stand", "mount_look"]]:
		if not gen.pois.has(pair[0]):
			continue
		var a: Vector3 = gen.pois[pair[0]]
		var b: Vector3 = gen.pois[pair[1]]
		var line := "%s -> %s (%.0f m):" % [pair[0], pair[1], Vector2(a.x, a.z).distance_to(Vector2(b.x, b.z))]
		for s in 13:
			var p := a.lerp(b, s / 12.0)
			line += " %.0f/t%d/%.0f" % [gen.height(p.x, p.z), gen.tier_at(p.x, p.z), gen.slope(p.x, p.z)]
		print(line)
	quit()
