extends SceneTree
## REGION SCAN (scripts/tools/region_scan.gd): loads the cached base terrain and scores every 4 x 4 km window (centres every
## 500 m) as a place for a region: share of highlands / high plateaus inside, no mountains or sea in it or its blend band, how
## level the ground round its border is (so it blends in), mountains in view 3 - 10 km away. Prints the best ten.
##   Godot_console.exe --headless --path . --script res://scripts/tools/region_scan.gd

const Config := preload("res://scripts/world/base_terrain_config.gd")
const Gen := preload("res://scripts/world/base_terrain_gen.gd")


func _initialize() -> void:
	var cfg = Config.new()
	var gen = Gen.new(cfg)
	if not gen.load_cache("user://terrain/base_%d_%s.bin" % [cfg.seed_value, cfg.cache_key(Gen.VERSION)]):
		print("no cache")
		quit()
		return
	var res := []
	for cz in range(-12000, 12001, 500):
		for cx in range(-12000, 12001, 500):
			var inner := 0
			var good := 0
			var bad := false
			var ring := PackedFloat32Array()
			for j in range(-26, 27):
				for i in range(-26, 27):
					var x := cx + i * 100.0
					var z := cz + j * 100.0
					var t: int = gen.tier_at(x, z)
					var edge := maxi(absi(i), absi(j))
					if t == 255 or t == 4 or t == 0:
						bad = true
						break
					if edge <= 20:
						inner += 1
						if t == 2 or t == 3:
							good += 1
					elif edge >= 21 and edge <= 25:
						ring.append(gen.height(x, z))
				if bad:
					break
			if bad:
				continue
			var share := float(good) / inner
			if share < 0.75:
				continue
			var mean := 0.0
			for h in ring:
				mean += h
			mean /= ring.size()
			var sd := 0.0
			for h in ring:
				sd += (h - mean) * (h - mean)
			sd = sqrt(sd / ring.size())
			var mnt := 0
			for a in 36:
				var d := Vector2.from_angle(a * TAU / 36.0)
				for r in range(3000, 10001, 500):
					if gen.tier_at(cx + d.x * r, cz + d.y * r) == 4:
						mnt += 1
						break
			var score := share * 2.0 - sd / 60.0 + mnt / 36.0
			res.append([score, cx, cz, share, mean, sd, mnt])
	res.sort_custom(func(a, b): return a[0] > b[0])
	for k in mini(10, res.size()):
		var r: Array = res[k]
		print("score %.2f centre %d %d  high share %.2f  border mean %.0f sd %.0f  mountain dirs %d/36" % r)
	quit()
