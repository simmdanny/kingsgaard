extends SceneTree
## REGION SCAN (scripts/tools/region_scan.gd): loads the cached base terrain and scores every 4 x 4 km window (centres every
## 250 m) as a place for a region: the window and a 600 m margin round it all on one tier (highlands or high plateaus - no
## escarpment, sea or mountains in it, so the region's flat floor blends into the island gently), the ground in it as level as
## can be (height spread), and mountains in view 3 - 10 km away. Prints the best ten per tier.
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
	var res := {2: [], 3: []}
	for cz in range(-13000, 13001, 250):
		for cx in range(-13000, 13001, 250):
			var t0: int = gen.tier_at(cx, cz)
			if t0 != 2 and t0 != 3:
				continue
			var bad := false
			var same := 0
			var tot := 0
			var hs := PackedFloat32Array()
			for j in range(-13, 14):
				for i in range(-13, 14):
					var x := cx + i * 200.0
					var z := cz + j * 200.0
					var t: int = gen.tier_at(x, z)
					if t == 255 or t == 0 or t == 4:
						bad = true
						break
					tot += 1
					same += 1 if t == t0 else 0
					if absi(i) <= 10 and absi(j) <= 10:
						hs.append(gen.height(x, z))
				if bad:
					break
			if bad or same < tot * 0.55:
				continue
			hs.sort()
			var spread := hs[hs.size() * 95 / 100] - hs[hs.size() * 5 / 100]
			var mnt := 0
			for a in 36:
				var d := Vector2.from_angle(a * TAU / 36.0)
				for r in range(3000, 10001, 500):
					if gen.tier_at(cx + d.x * r, cz + d.y * r) == 4:
						mnt += 1
						break
			res[t0].append([mnt / 36.0 - spread / 120.0 + float(same) / tot * 2.0, cx, cz, hs[hs.size() / 2], spread, mnt, float(same) / tot])
	for t in [2, 3]:
		var arr: Array = res[t]
		arr.sort_custom(func(a, b): return a[0] > b[0])
		print("tier %d: %d windows" % [t, arr.size()])
		for k in mini(8, arr.size()):
			print("  score %.2f centre %d %d  median %.0f m  spread %.0f m  mountain dirs %d/36  same tier %.2f" % arr[k])
	quit()
