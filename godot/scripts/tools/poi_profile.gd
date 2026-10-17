extends SceneTree
## POI PROFILE (scripts/tools/poi_profile.gd): loads the cached world and prints the ground along each screenshot place's
## line of sight (height, tier, slope every few metres) - to check the places the generator picked.

const TerrainConfig := preload("res://scripts/world/terrain_config.gd")
const TerrainGen := preload("res://scripts/world/terrain_gen.gd")


func _initialize() -> void:
	var cfg = TerrainConfig.new()
	var gen = TerrainGen.new(cfg)
	var path := "user://terrain/world_%d_%s.bin" % [cfg.seed_value, cfg.cache_key(TerrainGen.VERSION)]
	if not gen.load_cache(path):
		print("no cache ", path)
		quit()
		return
	for pair in [["edge_stand", "edge_look"], ["low_stand", "low_look"], ["pass_foot", "pass_top"]]:
		var a: Vector3 = gen.pois[pair[0]]
		var b: Vector3 = gen.pois[pair[1]]
		var line := "%s -> %s (%.0f m):" % [pair[0], pair[1], Vector2(a.x, a.z).distance_to(Vector2(b.x, b.z))]
		for s in 13:
			var p := a.lerp(b, s / 12.0)
			line += " %.0f/t%d/%.0f" % [gen.height(p.x, p.z), gen.tier_at(p.x, p.z), gen.slope(p.x, p.z)]
		print(line)
	quit()
