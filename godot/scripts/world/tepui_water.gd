extends RefCounted
## THE TEPUI REGION'S WATER (scripts/world/tepui_water.gd): rivers on the plateaus' tops, the waterfalls where they reach an
## edge, lakes at the cliffs' feet (pillars standing in some), a pool at the bottom of every waterfall and of every sinkhole,
## and mist in the deep canyons. tepui_region.gd runs it in three steps:
##   plan()             before the heights - every river's course and water levels, the lakes, pools and falls;
##   heights(p, h)      for every height sample - the river beds with their banks, the lake and pool bowls;
##   build()            after the walls and the carving - the meshes (water surfaces, waterfall sheets, splash, spray, mist).
## The walls ask wall_lip(p) / wall_fade(p): at a waterfall's lip the wall's top comes down under the water, and the wall's
## face stays plain (no lean, no bulge, no rubble) for the water to fall clear of it.
## Rivers are stairs, never ramps: flat treads with the water level, and risers where the ground steps down - short rapids
## (the water sloped over a few tens of metres, fast, foaming) for small drops, a waterfall only at a real edge. One mesh per
## river system (a tributary is part of its river's mesh: the junction is merged), its banks wherever the carved bed meets the
## water. Every surface carries per vertex: the water's depth there, its flow (direction and speed), its kind (flat, rapids,
## lake), the distance to a pillar standing in it (its foam ring).

var r  # the region
var cfg
var rivers := []
var lakes := []
var falls := []
var sinks := []
var meshes := []
var report := {}
## per river: a coarse grid of the segments near each cell (for the beds), key = cell
var _seg_grid := []
const SEG_CELL := 32.0
const BANK := 12.0
const G := 9.81


func _init(region) -> void:
	r = region
	cfg = region.cfg


# ---- the plan ------------------------------------------------------------------------------------------------------------

## the ground of level k at a point as the heights will have it (k 0: the floor)
func _ground(p: Vector2, k: int) -> float:
	if k <= 0:
		return r._ground_at(p, r._base_h(p.x, p.y))
	return r._level_top(p, k) - r._rim_dip(p, k)


## whether a point is a good place for a river on level k: on that level, clear of its edge, of the level above, of carved
## features, sinkholes and the ways up
func _clearance(p: Vector2, k: int) -> float:
	var c: float = r._gbil(r._d[k], p) if k > 0 else r._gbil(r._sink_neg(), p)
	if k < 3:
		c = minf(c, -r._gbil(r._d[k + 1], p) - 15.0)
	c = minf(c, r._gbil(r._ndist, p) - 30.0)
	for fe in r.features:
		var l: Vector2 = r._flocal(p, fe)
		var dd := maxf(absf(l.x) - float(fe.A), absf(l.y) - float(fe.B))
		if str(fe.type) == "sinkhole":
			dd = l.length() - float(fe.rf) * 1.45 - 25.0
		c = minf(c, dd - 20.0)
	return c


## the nearest point to p on level k with at least `need` m of clearance (or the clearest point within 500 m)
func _find_inside(p: Vector2, k: int, need: float) -> Vector2:
	if _clearance(p, k) >= need:
		return p
	var best := p
	var bc := -INF
	var rad := 8.0
	while rad <= 500.0:
		var steps := int(TAU * rad / 8.0)
		for s2 in steps:
			var q: Vector2 = p + Vector2.from_angle(TAU * s2 / steps) * rad
			var c := _clearance(q, k)
			if c >= need:
				return q
			if c > bc:
				bc = c
				best = q
		rad += 8.0
	return best


## the nearest real cliff edge of a level field to a guess: a crossing of the field's zero between grid cells within 400 m,
## the ground 40 m outside it at least 40 m lower, clear of carved features and of the ways up; then onto the edge itself
func _find_edge(dk: PackedFloat32Array, guess: Vector2, k: int) -> Vector2:
	var best := Vector2.INF
	var bd := INF
	var st := 8.0
	var nn := int(400.0 / st)
	for j in range(-nn, nn + 1):
		for i in range(-nn, nn + 1):
			var q := guess + Vector2(i, j) * st
			var dq: float = r._gbil(dk, q)
			if dq < 0.0 or dq > st * 1.5:
				continue
			var nq: Vector2 = r._out_normal(dk, q)
			var e: Vector2 = q - nq * dq
			if e.distance_to(guess) >= bd:
				continue
			if k > 0 and _ground(e - nq * 20.0, k) - _ground_below(e + nq * 40.0, k) < 40.0:
				continue
			var clear := true
			for fe in r.features:
				# (only what stands in a wall - an arch, a support, an overhang; a pillar or a sinkhole near the lip is fine)
				if not fe.walls:
					continue
				var l: Vector2 = r._flocal(e, fe)
				if maxf(absf(l.x) - float(fe.A), absf(l.y) - float(fe.B)) < 70.0:
					clear = false
					break
			if not clear or r._gbil(r._ndist, e) < 60.0:
				continue
			bd = e.distance_to(guess)
			best = e
	if best == Vector2.INF:
		return r._onto_edge(dk, guess)
	return r._onto_edge(dk, best)


func plan() -> void:
	rivers = []
	lakes = []
	falls = []
	sinks = []
	var rng := RandomNumberGenerator.new()
	rng.seed = r.seed_value + 777
	# lakes first (rivers fall into them)
	for lk in cfg.lakes:
		var c: Vector2 = r._from_uv(Vector2(lk[0], lk[1]))
		var ang := deg_to_rad(float(lk[4]))
		var ax: Vector2 = (r.axis_u as Vector2).rotated(ang)
		var level := _ground(c, 0) - float(lk[6])
		lakes.append({"c": c, "ax": ax, "t": Vector2(-ax.y, ax.x), "ra": float(lk[2]), "rb": float(lk[3]), "depth": float(lk[5]),
			"level": level, "salt": lakes.size() * 17 + 3, "pool": false})
	# each river, then its falls (where it leaves its level: its lip, its drop, the pool it lands in - a lake, or its own
	# plunge pool, where the next river down may start)
	for i in cfg.rivers.size():
		var rv: PackedFloat32Array = cfg.rivers[i]
		var river := _plan_river(i, rv, rng)
		rivers.append(river)
		_plan_falls(river, rng)
	# the sinkholes' pools
	for fe in r.features:
		if str(fe.type) == "sinkhole":
			sinks.append({"fe": fe, "level": float(fe.pit) + float(cfg.sinkhole_pool_level), "depth": float(cfg.sinkhole_pool_depth)})
	# the segment grids for the beds
	_seg_grid = []
	for river in rivers:
		_seg_grid.append(_grid_segments(river))
	var lines := []
	for river in rivers:
		var nr := 0
		for kk in (river.kind as PackedByteArray):
			nr += 1 if kk == 1 else 0
		lines.append("%s: level %d, %.0f m long, %.0f - %.0f m wide, water from %.1f down to %.1f m (%d m of rapids)%s" % [river.name, river.level,
			float(river.length), (river.hw as PackedFloat32Array)[0] * 2.0, (river.hw as PackedFloat32Array)[(river.hw as PackedFloat32Array).size() - 1] * 2.0,
			(river.w as PackedFloat32Array)[0], (river.w as PackedFloat32Array)[(river.w as PackedFloat32Array).size() - 1], nr * 4,
			"" if int(river.join) < 0 else (", splits off %s for a fall of its own" if river.get("split", false) else ", joins %s") % rivers[int(river.join)].name])
	report.rivers = lines


## one river's course on its level: from its source (or the pool of the waterfall feeding it) meandering to a point inside its
## mouth, then straight out over the edge; its width, its water level (stairs) and where its rapids are
func _plan_river(idx: int, rv: PackedFloat32Array, rng: RandomNumberGenerator) -> Dictionary:
	var k := int(rv[0])
	var dk: PackedFloat32Array = r._d[k] if k > 0 else r._sink_neg()
	var src: Vector2 = r._from_uv(Vector2(rv[1], rv[2]))
	var join := int(rv[8]) if rv.size() > 8 else -1
	var from := int(rv[9]) if rv.size() > 9 else -1
	var feed := {}
	if from >= 0:
		# (it starts at the pool of the waterfall of river `from`, on that pool's rim toward this river's mouth)
		var fr: Dictionary = rivers[from]
		feed = falls[int((fr.falls as Array)[0])]
		var pool: Dictionary = lakes[int(feed.into)]
		var pc: Vector2 = pool.c
		var mg: Vector2 = r._from_uv(Vector2(rv[3], rv[4]))
		src = pc + (mg - pc).normalized() * minf(float(pool.ra), float(pool.rb)) * 0.8
	var hw_m: float = rv[5] * 0.5
	if feed.is_empty():
		src = _find_inside(src, k, hw_m + 30.0)
	var mouth := Vector2.INF
	var nrm := Vector2.ZERO
	var target: Vector2
	if join >= 0:
		# (a tributary: it ends on the river it joins, at the point there nearest its given mouth)
		var main: Dictionary = rivers[join]
		var want: Vector2 = r._from_uv(Vector2(rv[3], rv[4]))
		var pts_m: PackedVector2Array = main.pts
		var best := 0
		for q in pts_m.size():
			if pts_m[q].distance_to(want) < pts_m[best].distance_to(want):
				best = q
		target = pts_m[best]
	else:
		var m0: Vector2 = r._from_uv(Vector2(rv[3], rv[4]))
		mouth = _find_edge(dk, m0, k)
		nrm = r._out_normal(dk, mouth)
		target = mouth - nrm * 70.0
	# the meander: a sum of sines across the straight line, zero at both ends, then kept clear of edges and features
	var base := target - src
	var L := base.length()
	var dir := base / L
	var side := Vector2(-dir.y, dir.x)
	var amp: float = rv[6] * L
	var f1 := rng.randf_range(1.3, 2.2)
	var f2 := rng.randf_range(2.8, 4.2)
	var p1 := rng.randf() * TAU
	var p2 := rng.randf() * TAU
	var nseg := int(L / 8.0) + 1
	# (only sideways: every point keeps its place along the straight line, so no loop or zig-zag can form)
	var off := PackedFloat32Array()
	off.resize(nseg + 1)
	for q in nseg + 1:
		var t := float(q) / nseg
		off[q] = amp * (0.75 * sin(TAU * f1 * t + p1) + 0.25 * sin(TAU * f2 * t + p2)) * pow(sin(PI * t), 0.6)
	var need := hw_m + 25.0
	# (round an obstacle as a whole: every blocked stretch looks up to 300 m to both sides for where it clears, and goes the way
	# that needs the smaller shift - pushed one small step at a time it got caught between a sinkhole and a ravine)
	for it in 60:
		var bad := PackedByteArray()
		bad.resize(nseg + 1)
		var any := false
		for q in range(1, nseg):
			var p0: Vector2 = src + dir * (L * float(q) / nseg)
			if _clearance(p0 + side * off[q], k) < need:
				bad[q] = 1
				any = true
		if not any:
			break
		var q := 1
		while q < nseg:
			if bad[q] == 0:
				q += 1
				continue
			var q1 := q
			while q1 + 1 < nseg and bad[q1 + 1] == 1:
				q1 += 1
			var best_sign := 1.0
			var best_cost := INF
			var shifts := {}
			for sg in [1.0, -1.0]:
				var cost := 0.0
				var sh := PackedFloat32Array()
				for qq in range(q, q1 + 1):
					var p0: Vector2 = src + dir * (L * float(qq) / nseg)
					var dd := 300.0
					var d := 10.0
					while d <= 300.0:
						if _clearance(p0 + side * (off[qq] + float(sg) * d), k) >= need:
							dd = d
							break
						d += 10.0
					sh.append(dd)
					cost += dd
				shifts[sg] = sh
				if cost < best_cost:
					best_cost = cost
					best_sign = sg
			var shb: PackedFloat32Array = shifts[best_sign]
			for qq in range(q, q1 + 1):
				off[qq] += best_sign * minf(10.0, shb[qq - q])
			q = q1 + 1
		var sm := off.duplicate()
		for qq in range(1, nseg):
			sm[qq] = lerpf(off[qq], (off[qq - 1] + off[qq + 1]) * 0.5, 0.2)
		off = sm
	var pts := PackedVector2Array()
	for q in nseg + 1:
		pts.append(src + dir * (L * float(q) / nseg) + side * off[q])
	# smooth curves: Chaikin twice, then 4 m steps
	for it in 2:
		var ch := PackedVector2Array([pts[0]])
		for q in pts.size() - 1:
			ch.append(pts[q].lerp(pts[q + 1], 0.25))
			ch.append(pts[q].lerp(pts[q + 1], 0.75))
		ch.append(pts[pts.size() - 1])
		pts = ch
	if mouth != Vector2.INF:
		# (then straight out to the edge and 10 m past it, over the wall's lip to its face's top)
		var q0 := pts[pts.size() - 1]
		var tail := int(q0.distance_to(mouth + nrm * 11.0) / 4.0)
		for q in range(1, tail + 1):
			pts.append(q0.lerp(mouth + nrm * 11.0, float(q) / tail))
	pts = _resample(pts, 4.0)
	var n := pts.size()
	# width: narrow at the source, full at the mouth, a little uneven
	var nw: FastNoiseLite = r._n.rock
	var hw := PackedFloat32Array()
	hw.resize(n)
	for q in n:
		var t := float(q) / (n - 1)
		hw[q] = hw_m * (0.55 + 0.45 * t) * (1.0 + 0.14 * nw.get_noise_1d(q * 3.1 + idx * 97.0))
	# the ground along it (the lowest across its bed and banks), the water's envelope under it, then stairs
	var g := PackedFloat32Array()
	g.resize(n)
	var inside := PackedByteArray()
	inside.resize(n)
	for q in n:
		var p := pts[q]
		var tq := (pts[mini(q + 1, n - 1)] - pts[maxi(q - 1, 0)]).normalized()
		var sq := Vector2(-tq.y, tq.x)
		var m := INF
		for o in [-(hw[q] + 8.0), -hw[q] * 0.5, 0.0, hw[q] * 0.5, hw[q] + 8.0]:
			var pp: Vector2 = p + sq * float(o)
			if r._gbil(dk, pp) > -2.0:
				m = minf(m, _ground(pp, k))
		inside[q] = 1 if r._gbil(dk, p) > -1.0 else 0
		g[q] = m if m < INF else (g[q - 1] if q > 0 else _ground(p, k))
	var fb: float = cfg.river_freeboard
	var e := PackedFloat32Array()
	e.resize(n)
	var run := INF
	for q in n:
		if inside[q] == 1:
			run = minf(run, g[q] - fb)
		e[q] = run
	# (before its first point on the level - a pool's rim at a wall's foot - the level of that first point)
	var first := INF
	for q in n:
		if e[q] < INF:
			first = e[q]
			break
	for q in n:
		if e[q] == INF:
			e[q] = first
	var w := PackedFloat32Array()
	w.resize(n)
	var kind := PackedByteArray()
	kind.resize(n)
	var cur := e[0]
	var q := 0
	while q < n:
		if e[q] < cur - 0.8:
			# a riser: rapids over a few tens of metres down to the next tread (the lowest the envelope gets over them)
			var steps := int(clampf((cur - e[q]) * 5.0, 8.0, 28.0) / 4.0) + 1
			var q1 := mini(q + steps, n - 1)
			var nl := e[q1]
			for qq in range(q, q1 + 1):
				var t := float(qq - q) / maxf(q1 - q, 1)
				w[qq] = lerpf(cur, nl, smoothstep(0.0, 1.0, t))
				kind[qq] = 1
			cur = nl
			q = q1 + 1
			continue
		w[q] = cur
		kind[q] = 0
		q += 1
	var length := 0.0
	for qq in range(1, n):
		length += pts[qq].distance_to(pts[qq - 1])
	if not feed.is_empty():
		# (the pool it starts from lies at its first tread's level; the waterfall above lands on it)
		var pool2: Dictionary = lakes[int(feed.into)]
		pool2.level = w[0]
		feed.bottom = w[0]
	var river := {"name": "river%d" % (idx + 1), "level": k, "pts": pts, "w": w, "hw": hw, "kind": kind, "join": join, "from": from,
		"mouth": mouth, "nrm": nrm, "nfalls": int(rv[7]), "into": int(rv[10]) if rv.size() > 10 else -1, "length": length,
		"depth": float(cfg.river_depth)}
	var lo := Vector2(INF, INF)
	var hi := -lo
	for p in pts:
		lo = lo.min(p)
		hi = hi.max(p)
	river.lo = lo - Vector2.ONE * (hw_m + BANK + 8.0)
	river.hi = hi + Vector2.ONE * (hw_m + BANK + 8.0)
	if join >= 0:
		# (the junction's water at the main river's level there: the tributary steps down into it, never sits below it)
		var main: Dictionary = rivers[join]
		var wm: PackedFloat32Array = main.w
		var pm: PackedVector2Array = main.pts
		var bj := 0
		for qq in pm.size():
			if pm[qq].distance_to(pts[n - 1]) < pm[bj].distance_to(pts[n - 1]):
				bj = qq
		var lj := wm[bj]
		for qq in n:
			w[qq] = maxf(w[qq], lj)
		river.w = w
	return river


static func _resample(pts: PackedVector2Array, step: float) -> PackedVector2Array:
	var out := PackedVector2Array([pts[0]])
	var acc := 0.0
	for q in range(1, pts.size()):
		var a := pts[q - 1]
		var b := pts[q]
		var d := a.distance_to(b)
		var t := step - acc
		while t <= d:
			out.append(a.lerp(b, t / d))
			t += step
		acc = d - (t - step)
	if out[out.size() - 1].distance_to(pts[pts.size() - 1]) > step * 0.3:
		out.append(pts[pts.size() - 1])
	return out


## a river's falls at its mouth: one, or several side by side (the river splits for its last stretch), each with its lip on
## the edge, its drop to the water it lands in (a lake there, or its own plunge pool on the ground below)
func _plan_falls(river: Dictionary, rng: RandomNumberGenerator) -> void:
	if (river.mouth as Vector2) == Vector2.INF:
		return
	var k: int = river.level
	var dk: PackedFloat32Array = r._d[k] if k > 0 else r._sink_neg()
	var mouth: Vector2 = river.mouth
	var nrm: Vector2 = river.nrm
	var tan_e := Vector2(-nrm.y, nrm.x)
	var w_end: float = (river.w as PackedFloat32Array)[(river.w as PackedFloat32Array).size() - 1]
	var hw_end: float = (river.hw as PackedFloat32Array)[(river.hw as PackedFloat32Array).size() - 1]
	var nf: int = maxi(int(river.nfalls), 1)
	var gap := maxf(hw_end * 1.25, 24.0)
	river.falls = []
	for fi in nf:
		var off := (fi - (nf - 1) * 0.5) * gap
		var lip: Vector2 = r._onto_edge(dk, mouth + tan_e * off)
		var ln: Vector2 = r._out_normal(dk, lip)
		var width := (hw_end * 2.0 * 0.8) if nf == 1 else hw_end * 0.9
		width *= rng.randf_range(0.85, 1.1)
		# the ground below: in front of the wall, past its foot
		var land := lip + ln * (float(cfg.wall_face_offset) + 28.0)
		var into := -1
		for li in lakes.size():
			if _in_lake(land, lakes[li], 0.0):
				into = li
		var level_below: float
		if into >= 0:
			level_below = float(lakes[into].level)
		else:
			# (its own plunge pool on the ground below)
			var gb := _ground_below(land, k)
			var pool_c := lip + ln * (float(cfg.wall_face_offset) + float(cfg.plunge_pool_radius) * 0.75)
			lakes.append({"c": pool_c, "ax": ln, "t": tan_e, "ra": float(cfg.plunge_pool_radius) * 0.85, "rb": float(cfg.plunge_pool_radius) * (1.0 + 0.5 * (nf - 1)),
				"depth": 8.0, "level": gb - 0.8, "salt": lakes.size() * 17 + 3, "pool": true})
			into = lakes.size() - 1
			level_below = gb - 0.8
		var fall := {"lip": lip, "nrm": ln, "top": w_end, "bottom": level_below, "width": width, "into": into, "river": river.name,
			"v0": rng.randf_range(2.4, 3.6), "sway": rng.randf_range(-0.025, 0.025), "name": "%s fall %d" % [river.name, fi + 1]}
		falls.append(fall)
		river.falls.append(falls.size() - 1)
		if absf(off) > 1.0:
			_split_channel(river, lip, ln, width)


## a side channel for one of several falls side by side: from the river some 70 m before its mouth, curving out to that fall's
## lip and over it (part of the river's mesh; its water from the river's level there down to the lip's)
func _split_channel(river: Dictionary, lip: Vector2, ln: Vector2, width: float) -> void:
	var pts: PackedVector2Array = river.pts
	var w: PackedFloat32Array = river.w
	var n := pts.size()
	var qs := maxi(n - 1 - 20, 0)
	var a := pts[qs]
	var b := lip - ln * 22.0
	var ctl := a.lerp(b, 0.5) + (pts[mini(qs + 4, n - 1)] - a).normalized() * 18.0
	var raw := PackedVector2Array()
	for q in 13:
		var t := float(q) / 12.0
		raw.append(a.lerp(ctl, t).lerp(ctl.lerp(b, t), t))
	for q in range(1, 9):
		raw.append(b.lerp(lip + ln * 11.0, float(q) / 8.0))
	var cp := _resample(raw, 4.0)
	var m := cp.size()
	var cw := PackedFloat32Array()
	var ch := PackedFloat32Array()
	var ck := PackedByteArray()
	cw.resize(m)
	ch.resize(m)
	ck.resize(m)
	for q in m:
		var t := float(q) / (m - 1)
		cw[q] = lerpf(w[qs], w[n - 1], smoothstep(0.0, 1.0, t))
		ch[q] = lerpf((river.hw as PackedFloat32Array)[qs] * 0.6, width * 0.55, t)
		ck[q] = 1 if w[qs] - w[n - 1] > 0.8 else 0
	var lo := Vector2(INF, INF)
	var hi := -lo
	for p in cp:
		lo = lo.min(p)
		hi = hi.max(p)
	rivers.append({"name": "%s side %d" % [river.name, rivers.size()], "level": river.level, "pts": cp, "w": cw, "hw": ch, "kind": ck,
		"join": rivers.find(river), "from": -1, "mouth": Vector2.INF, "nrm": ln, "nfalls": 0, "into": -1, "length": float(m) * 4.0,
		"depth": river.depth, "split": true, "lo": lo - Vector2.ONE * (width + BANK + 8.0), "hi": hi + Vector2.ONE * (width + BANK + 8.0)})


## the ground just past a wall's foot (the level below this one, or the floor)
func _ground_below(p: Vector2, k: int) -> float:
	var lb := 0
	for kk in range(k - 1, 0, -1):
		if r._gbil(r._d[kk], p) >= 0.0:
			lb = kk
			break
	return _ground(p, lb)


## whether a lake's or pool's water is at a point (inside its outline, its bowl low enough)
func _in_lake_water(p: Vector2) -> bool:
	for lk in lakes:
		if _lake_rho(p, lk) < 0.98 and r.height_at(p) < float(lk.level) + 1.0:
			return true
	return false


func _in_lake(p: Vector2, lk: Dictionary, margin: float) -> bool:
	return _lake_rho(p, lk) < 1.0 + margin


## a lake's normalized radius at a point (1 on its outline): an ellipse, its outline bent by noise
func _lake_rho(p: Vector2, lk: Dictionary) -> float:
	var rel: Vector2 = p - (lk.c as Vector2)
	var a := rel.dot(lk.ax) / float(lk.ra)
	var b := rel.dot(lk.t) / float(lk.rb)
	var th := atan2(b, a)
	var nw: FastNoiseLite = r._n.rock
	var bend := 1.0 + 0.16 * nw.get_noise_2d(cos(th) * 1.7 + float(lk.salt), sin(th) * 1.7) + 0.06 * nw.get_noise_2d(cos(th) * 5.0 - float(lk.salt), sin(th) * 5.0)
	return sqrt(a * a + b * b) / bend


func _grid_segments(river: Dictionary) -> Dictionary:
	var gd := {}
	var pts: PackedVector2Array = river.pts
	var hw: PackedFloat32Array = river.hw
	for q in pts.size() - 1:
		var reach: float = maxf(hw[q], hw[q + 1]) + BANK + 2.0
		var lo := pts[q].min(pts[q + 1]) - Vector2.ONE * reach
		var hi := pts[q].max(pts[q + 1]) + Vector2.ONE * reach
		for cj in range(int(floor(lo.y / SEG_CELL)), int(floor(hi.y / SEG_CELL)) + 1):
			for ci in range(int(floor(lo.x / SEG_CELL)), int(floor(hi.x / SEG_CELL)) + 1):
				var key := Vector2i(ci, cj)
				var arr: PackedInt32Array = gd.get(key, PackedInt32Array())
				arr.append(q)
				gd[key] = arr
	return gd


## the nearest point of a river to p: [distance, index (fractional), water level, half width], or [] when none near
func _near(ri: int, p: Vector2) -> Array:
	var gd: Dictionary = _seg_grid[ri]
	var key := Vector2i(int(floor(p.x / SEG_CELL)), int(floor(p.y / SEG_CELL)))
	if not gd.has(key):
		return []
	var river: Dictionary = rivers[ri]
	var pts: PackedVector2Array = river.pts
	var best := INF
	var bq := 0
	var bt := 0.0
	for q in (gd[key] as PackedInt32Array):
		var a := pts[q]
		var ab := pts[q + 1] - a
		var t := clampf((p - a).dot(ab) / maxf(ab.length_squared(), 1e-6), 0.0, 1.0)
		var d := p.distance_to(a + ab * t)
		if d < best:
			best = d
			bq = q
			bt = t
	var w: PackedFloat32Array = river.w
	var hw: PackedFloat32Array = river.hw
	return [best, bq + bt, lerpf(w[bq], w[bq + 1], bt), lerpf(hw[bq], hw[bq + 1], bt)]


# ---- the heights ---------------------------------------------------------------------------------------------------------

## a height sample with the water's ground carved in: river beds and their banks, lake and pool bowls, the sinkholes' pools
func heights(p: Vector2, h: float) -> float:
	for ri in rivers.size():
		var river: Dictionary = rivers[ri]
		var lo: Vector2 = river.lo
		var hi: Vector2 = river.hi
		if p.x < lo.x or p.y < lo.y or p.x > hi.x or p.y > hi.y:
			continue
		var nr := _near(ri, p)
		if nr.is_empty():
			continue
		var d: float = nr[0]
		var w: float = nr[2]
		var hwq: float = nr[3]
		if d > hwq + BANK:
			continue
		var depth: float = float(river.depth) * (0.7 + 0.3 * clampf(float(nr[1]) / (river.pts as PackedVector2Array).size(), 0.0, 1.0))
		var bed: float
		if d < hwq:
			bed = w - 0.3 - depth * (1.0 - pow(d / hwq, 2.0))
		else:
			bed = lerpf(w - 0.3, h, smoothstep(0.0, 1.0, (d - hwq) / BANK))
		# (the bed only on the level the river runs on: never carved into the wall's step outside it)
		var kr: int = river.level
		if r._gbil(r._d[kr] if kr > 0 else r._sink_neg(), p) < -6.0:
			continue
		h = minf(h, bed)
	for lk in lakes:
		# (a quick reject first: the outline's noise bends it by at most about a quarter)
		if p.distance_squared_to(lk.c) > pow(maxf(float(lk.ra), float(lk.rb)) * 1.3, 2.0):
			continue
		var rho := _lake_rho(p, lk)
		if rho >= 1.0:
			continue
		# (only the low ground: a lake fills the floor round it, it never cuts into a plateau or a terrace)
		if h > float(lk.level) + 3.0:
			continue
		var dist_in := (1.0 - rho) * minf(float(lk.ra), float(lk.rb))
		var bed: float = float(lk.level) + 0.4 - (float(lk.depth) + 0.4) * smoothstep(0.0, 1.0, dist_in / maxf(minf(float(lk.ra), float(lk.rb)) * 0.45, 12.0))
		h = minf(h, bed)
	for sk in sinks:
		var fe: Dictionary = sk.fe
		var rel: Vector2 = p - (fe.c as Vector2)
		if rel.length_squared() > pow(float(fe.rf) * 1.5 + 10.0, 2.0):
			continue
		var rr: float = r._sink_r(fe, atan2(rel.y, rel.x))
		var rl := rel.length()
		if rl < rr + 4.0 and h <= float(fe.pit) + 0.5:
			h = minf(h, float(fe.pit) - float(sk.depth) * smoothstep(0.0, 1.0, (rr + 4.0 - rl) / maxf(rr * 0.6, 8.0)))
	return h


# ---- the walls -----------------------------------------------------------------------------------------------------------

## a wall column's top at a waterfall's lip: down under the water there (else INF)
func wall_lip(p: Vector2, k: int) -> float:
	var best := INF
	for f in falls:
		var river: Dictionary = _river_named(str(f.river))
		if int(river.level) != k:
			continue
		var rel: Vector2 = p - (f.lip as Vector2)
		var along := absf(rel.dot(Vector2(-(f.nrm as Vector2).y, (f.nrm as Vector2).x)))
		if along < float(f.width) * 0.5 + 6.0 and absf(rel.dot(f.nrm)) < 20.0:
			best = minf(best, float(f.top) - float(river.depth) - 0.4 + 2.0 * smoothstep(float(f.width) * 0.5 - 2.0, float(f.width) * 0.5 + 6.0, along))
	return best


## how much of its shapes a wall keeps near a waterfall: none within its width + 25 m, all from 80 m on (the run's ramp)
func wall_fade(p: Vector2) -> float:
	var f0 := 1.0
	for f in falls:
		var d: float = p.distance_to(f.lip) - float(f.width) * 0.5 - 25.0
		f0 = minf(f0, clampf(d / 20.0, 0.0, 1.0))
	return f0


func _river_named(nm: String) -> Dictionary:
	for river in rivers:
		if str(river.name) == nm:
			return river
	return {}


# ---- the meshes ----------------------------------------------------------------------------------------------------------

func build() -> void:
	meshes = []
	var lines := []
	for ri in rivers.size():
		if int(rivers[ri].join) >= 0:
			continue
		meshes.append(_river_mesh(ri))
	for li in lakes.size():
		meshes.append(_lake_mesh(li))
	for sk in sinks:
		meshes.append(_sink_mesh(sk))
	for fi in falls.size():
		meshes.append(_fall_mesh(fi))
		meshes.append(_splash_mesh(fi))
		meshes.append(_spray_mesh(fi))
		var f: Dictionary = falls[fi]
		lines.append("%s: %.0f m (from %.0f down to %.0f m), %.0f m wide, into %s" % [f.name, float(f.top) - float(f.bottom), f.top, f.bottom,
			f.width, "its plunge pool" if bool(lakes[int(f.into)].pool) else "lake %d" % (int(f.into) + 1)])
	for m in _mist_meshes():
		meshes.append(m)
	report.falls = lines
	var ll := []
	for li in lakes.size():
		var lk: Dictionary = lakes[li]
		ll.append("%s %d: level %.1f m, %.0f x %.0f m, %.0f m deep" % ["pool" if bool(lk.pool) else "lake", li + 1, lk.level, float(lk.ra) * 2.0, float(lk.rb) * 2.0, lk.depth])
	report.lakes = ll
	var tris := 0
	for m in meshes:
		tris += (m.indices as PackedInt32Array).size() / 3
	report.triangles = tris


func _surface(kind: String) -> Dictionary:
	return {"kind": kind, "verts": PackedVector3Array(), "normals": PackedVector3Array(), "indices": PackedInt32Array(),
		"colors": PackedColorArray(), "uv": PackedVector2Array(), "uv2": PackedVector2Array()}


## a river system's surface (the river and every tributary joining it): a 2 m grid over its course, every vertex at the water
## level of the nearest river point, kept where the water is (and a little under the banks); kind and flow per vertex
func _river_mesh(ri: int) -> Dictionary:
	var ids := [ri]
	for rj in rivers.size():
		if int(rivers[rj].join) == ri:
			ids.append(rj)
	var lo := Vector2(INF, INF)
	var hi := -lo
	for id in ids:
		lo = lo.min(rivers[id].lo)
		hi = hi.max(rivers[id].hi)
	var gs := 2.0
	var na := int((hi.x - lo.x) / gs) + 2
	var nb := int((hi.y - lo.y) / gs) + 2
	var vid := PackedInt32Array()
	vid.resize(na * nb)
	vid.fill(-1)
	var m := _surface("river")
	var cc := Vector2(r.center.x, r.center.y)
	var vs: PackedVector3Array = m.verts
	var cs: PackedColorArray = m.colors
	var uv: PackedVector2Array = m.uv
	var uv2: PackedVector2Array = m.uv2
	for j in nb:
		for i in na:
			var p := lo + Vector2(i, j) * gs
			var best: Array = []
			var bid := -1
			for id in ids:
				var lo2: Vector2 = rivers[id].lo
				var hi2: Vector2 = rivers[id].hi
				if p.x < lo2.x or p.y < lo2.y or p.x > hi2.x or p.y > hi2.y:
					continue
				var nr := _near(id, p)
				if nr.is_empty():
					continue
				if best.is_empty() or float(nr[0]) - float(nr[3]) < float(best[0]) - float(best[3]):
					best = nr
					bid = id
			if best.is_empty() or float(best[0]) > float(best[3]) + 3.0:
				continue
			# (not where a lake or pool is: its own surface is there, at the same level)
			if _in_lake_water(p):
				continue
			var river: Dictionary = rivers[bid]
			var pts: PackedVector2Array = river.pts
			var q := int(best[1])
			var tq := (pts[mini(q + 1, pts.size() - 1)] - pts[q]).normalized()
			var kd: PackedByteArray = river.kind
			var rapid := kd[q] == 1 or kd[mini(q + 1, kd.size() - 1)] == 1
			var wl: float = best[2]
			var ground: float = r.height_at(p)
			vid[j * na + i] = vs.size()
			vs.append(Vector3(p.x - cc.x, wl, p.y - cc.y))
			# (kind: 0 flat, 0.5 rapids; speed; flow direction; depth and the distance in from the bank)
			cs.append(Color(0.5 if rapid else 0.0, 2.6 if rapid else 0.5, 0.0, 1.0))
			uv.append(tq)
			uv2.append(Vector2(wl - ground, float(best[3]) - float(best[0])))
	m.verts = vs
	m.colors = cs
	m.uv = uv
	m.uv2 = uv2
	_grid_tris(m, vid, na, nb)
	return m


## the triangles of a grid of kept vertices (two per cell whose four corners are all kept), facing up, and the normals
func _grid_tris(m: Dictionary, vid: PackedInt32Array, na: int, nb: int) -> void:
	var idx := PackedInt32Array()
	for j in nb - 1:
		for i in na - 1:
			var a := vid[j * na + i]
			var b := vid[j * na + i + 1]
			var c := vid[(j + 1) * na + i]
			var d := vid[(j + 1) * na + i + 1]
			if a < 0 or b < 0 or c < 0 or d < 0:
				continue
			# (Godot's front faces wind clockwise seen from above: a, b, c then b, d, c)
			idx.append_array(PackedInt32Array([a, b, c, b, d, c]))
	m.indices = idx
	var vs: PackedVector3Array = m.verts
	var ns := PackedVector3Array()
	ns.resize(vs.size())
	for t in range(0, idx.size(), 3):
		var fn := (vs[idx[t + 2]] - vs[idx[t]]).cross(vs[idx[t + 1]] - vs[idx[t]])
		for k in 3:
			ns[idx[t + k]] += fn
	for i in ns.size():
		ns[i] = ns[i].normalized() if ns[i].length_squared() > 1e-10 else Vector3.UP
		if ns[i].y < 0.0:
			ns[i] = -ns[i]
	m.normals = ns


## a lake's (or plunge pool's) surface: a grid over it, kept where its bowl is under the water (and a little past the shore);
## the depth per vertex, and the distance to the rock of a pillar standing in it
func _lake_mesh(li: int) -> Dictionary:
	var lk: Dictionary = lakes[li]
	var level: float = lk.level
	var ext := maxf(float(lk.ra), float(lk.rb)) * 1.3 + 10.0
	var c: Vector2 = lk.c
	var gs := 4.0 if not bool(lk.pool) else 2.0
	var lo := c - Vector2.ONE * ext
	var na := int(ext * 2.0 / gs) + 2
	var vid := PackedInt32Array()
	vid.resize(na * na)
	vid.fill(-1)
	var m := _surface("pool" if bool(lk.pool) else "lake")
	var cc := Vector2(r.center.x, r.center.y)
	var rings := _pillar_rings(level, c, ext)
	var vs: PackedVector3Array = m.verts
	var cs: PackedColorArray = m.colors
	var uv: PackedVector2Array = m.uv
	var uv2: PackedVector2Array = m.uv2
	for j in na:
		for i in na:
			var p := lo + Vector2(i, j) * gs
			if _lake_rho(p, lk) > 1.08:
				continue
			var ground: float = r.height_at(p)
			if ground > level + 1.5:
				continue
			vid[j * na + i] = vs.size()
			vs.append(Vector3(p.x - cc.x, level, p.y - cc.y))
			var ring := 99.0
			for sg in range(0, rings.size(), 2):
				ring = minf(ring, _pt_seg(p, rings[sg], rings[sg + 1]))
			cs.append(Color(0.0, 0.25, 1.0, 1.0))
			uv.append(Vector2.ZERO)
			uv2.append(Vector2(level - ground, ring))
	m.verts = vs
	m.colors = cs
	m.uv = uv
	m.uv2 = uv2
	_grid_tris(m, vid, na, na)
	return m


static func _pt_seg(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var t := clampf((p - a).dot(ab) / maxf(ab.length_squared(), 1e-6), 0.0, 1.0)
	return p.distance_to(a + ab * t)


## where carved rock meets the water level near a point: the segments of every carved mesh's triangles crossing that height
func _pillar_rings(level: float, c: Vector2, ext: float) -> PackedVector2Array:
	var segs := PackedVector2Array()
	var cc := Vector2(r.center.x, r.center.y)
	for w in r.walls:
		if not w.get("arch", false):
			continue
		var vs: PackedVector3Array = w.verts
		if vs.is_empty():
			continue
		var ids: PackedInt32Array = w.indices
		# (a carved mesh's box first, once: none near the water, none crossing its height - next)
		if not w.has("box"):
			var lo3 := vs[0]
			var hi3 := vs[0]
			for v in vs:
				lo3 = lo3.min(v)
				hi3 = hi3.max(v)
			w.box = [lo3, hi3]
		var bx: Array = w.box
		var blo: Vector3 = bx[0]
		var bhi: Vector3 = bx[1]
		if level < blo.y or level > bhi.y or c.x - cc.x + ext < blo.x or c.x - cc.x - ext > bhi.x or c.y - cc.y + ext < blo.z or c.y - cc.y - ext > bhi.z:
			continue
		for t in range(0, ids.size(), 3):
			var a := vs[ids[t]]
			var b := vs[ids[t + 1]]
			var d := vs[ids[t + 2]]
			var above := int(a.y > level) + int(b.y > level) + int(d.y > level)
			if above == 0 or above == 3:
				continue
			var pts := PackedVector2Array()
			for e in [[a, b], [b, d], [d, a]]:
				var p0: Vector3 = e[0]
				var p1: Vector3 = e[1]
				if (p0.y > level) != (p1.y > level):
					var tt := (level - p0.y) / (p1.y - p0.y)
					var pp := p0.lerp(p1, tt)
					pts.append(Vector2(pp.x + cc.x, pp.z + cc.y))
			if pts.size() == 2 and pts[0].distance_to(c) < ext + 20.0:
				segs.append(pts[0])
				segs.append(pts[1])
	return segs


## a sinkhole's pool: its floor under water out to the hole's wall
func _sink_mesh(sk: Dictionary) -> Dictionary:
	var fe: Dictionary = sk.fe
	var level: float = sk.level
	var c: Vector2 = fe.c
	var ext: float = float(fe.rf) * 1.5 + 8.0
	var gs := 2.0
	var lo := c - Vector2.ONE * ext
	var na := int(ext * 2.0 / gs) + 2
	var vid := PackedInt32Array()
	vid.resize(na * na)
	vid.fill(-1)
	var m := _surface("pool")
	var cc := Vector2(r.center.x, r.center.y)
	var rings := _pillar_rings(level, c, ext)
	var vs: PackedVector3Array = m.verts
	var cs: PackedColorArray = m.colors
	var uv: PackedVector2Array = m.uv
	var uv2: PackedVector2Array = m.uv2
	for j in na:
		for i in na:
			var p := lo + Vector2(i, j) * gs
			var rel := p - c
			if rel.length() > r._sink_r(fe, atan2(rel.y, rel.x)) + 2.0:
				continue
			var ground: float = r.height_at(p)
			vid[j * na + i] = vs.size()
			vs.append(Vector3(p.x - cc.x, level, p.y - cc.y))
			var ring := 99.0
			for sg in range(0, rings.size(), 2):
				ring = minf(ring, _pt_seg(p, rings[sg], rings[sg + 1]))
			cs.append(Color(0.0, 0.15, 1.0, 1.0))
			uv.append(Vector2.ZERO)
			uv2.append(Vector2(level - ground, ring))
	m.verts = vs
	m.colors = cs
	m.uv = uv
	m.uv2 = uv2
	_grid_tris(m, vid, na, na)
	return m


## a waterfall's sheet: from its lip, leaving the edge level and bending down (a projectile's curve, slowed by the air), out
## clear of the wall's face and down into the water below; a little wider and curved across as it falls. uv: across 0..1,
## down 0..1; uv2: metres fallen, the whole drop
func _fall_mesh(fi: int) -> Dictionary:
	var f: Dictionary = falls[fi]
	var m := _surface("fall")
	var lip: Vector2 = f.lip
	var nrm: Vector2 = f.nrm
	var tng := Vector2(-nrm.y, nrm.x)
	var top: float = f.top
	var drop: float = float(f.top) - float(f.bottom) + 3.0
	var T := sqrt(2.0 * drop / G)
	var v0: float = f.v0
	var off0: float = float(cfg.wall_face_offset) + 0.5
	var rows := 48
	var cols := 9
	var cc := Vector2(r.center.x, r.center.y)
	var vs := PackedVector3Array()
	var uvs := PackedVector2Array()
	var uv2s := PackedVector2Array()
	var cs := PackedColorArray()
	for k in rows + 1:
		var tt := T * pow(float(k) / rows, 1.6)
		var fall := 0.5 * G * tt * tt
		var y := top - minf(fall, drop)
		var out := v0 * tt * (1.0 - 0.25 * tt / T)
		var fr := minf(fall / drop, 1.0)
		var wid: float = float(f.width) * (1.0 + 0.35 * fr)
		var ctr := lip + nrm * (off0 + out) + tng * (float(f.sway) * fall)
		for c in cols:
			var u := float(c) / (cols - 1)
			var x := (u - 0.5) * wid
			# (curved across: the middle a little further out)
			var bulge := 0.08 * wid * (1.0 - pow(2.0 * u - 1.0, 2.0))
			var p := ctr + tng * x + nrm * bulge
			vs.append(Vector3(p.x - cc.x, y, p.y - cc.y))
			uvs.append(Vector2(u, fr))
			uv2s.append(Vector2(minf(fall, drop), drop))
			cs.append(Color(float(fi) * 0.137, 0.0, 0.0, 1.0))
	var idx := PackedInt32Array()
	for k in rows:
		for c in cols - 1:
			var a := k * cols + c
			var b := a + 1
			var d := a + cols
			var e := d + 1
			idx.append_array(PackedInt32Array([a, b, d, b, e, d]))
	var ns := PackedVector3Array()
	ns.resize(vs.size())
	for t in range(0, idx.size(), 3):
		var fnm := (vs[idx[t + 2]] - vs[idx[t]]).cross(vs[idx[t + 1]] - vs[idx[t]])
		for kk in 3:
			ns[idx[t + kk]] += fnm
	var outw := Vector3(nrm.x, 0.0, nrm.y)
	for i in ns.size():
		ns[i] = ns[i].normalized() if ns[i].length_squared() > 1e-10 else outw
		if ns[i].dot(outw) < 0.0:
			ns[i] = -ns[i]
	m.verts = vs
	m.normals = ns
	m.indices = idx
	m.uv = uvs
	m.uv2 = uv2s
	m.colors = cs
	m.at = [lip, nrm, top, float(f.bottom)]
	return m


## the splash where a fall meets its pool: chunky white blobs heaped round the impact, each with its own phase (they swell and
## bob); colour r = phase, g = size
func _splash_mesh(fi: int) -> Dictionary:
	var f: Dictionary = falls[fi]
	var m := _surface("splash")
	var rng := RandomNumberGenerator.new()
	rng.seed = r.seed_value + 9100 + fi
	var nrm: Vector2 = f.nrm
	var tng := Vector2(-nrm.y, nrm.x)
	var drop: float = float(f.top) - float(f.bottom)
	var T := sqrt(2.0 * drop / G)
	var out: float = float(f.v0) * T * 0.75
	var hit: Vector2 = (f.lip as Vector2) + nrm * (float(cfg.wall_face_offset) + 0.5 + out)
	var base_y: float = f.bottom
	var wid: float = float(f.width) * 1.35
	var cc := Vector2(r.center.x, r.center.y)
	var ico := _icosphere()
	var vs := PackedVector3Array()
	var ns := PackedVector3Array()
	var cs := PackedColorArray()
	var idx := PackedInt32Array()
	var nb := 16 + int(wid / 6.0)
	for b in nb:
		var ring := b >= 5
		var ang := rng.randf() * TAU
		var dist := rng.randf_range(0.2, 0.75) * wid if ring else rng.randf_range(0.0, 0.25) * wid
		var c2 := hit + tng * cos(ang) * dist + nrm * sin(ang) * dist * 0.7
		var rad := rng.randf_range(2.5, 5.0) if ring else rng.randf_range(5.0, 8.5)
		rad *= clampf(wid / 14.0, 0.7, 1.6)
		var cy := base_y + rad * (0.15 if ring else 0.45)
		var o := vs.size()
		var ph := rng.randf()
		for v in ico[0]:
			var vv: Vector3 = v
			vs.append(Vector3(c2.x - cc.x, cy, c2.y - cc.y) + vv * Vector3(rad, rad * 0.8, rad))
			ns.append(vv)
			cs.append(Color(ph, rad / 10.0, 0.0, 1.0))
		for t in (ico[1] as PackedInt32Array):
			idx.append(o + t)
	m.verts = vs
	m.normals = ns
	m.colors = cs
	m.indices = idx
	var uv := PackedVector2Array()
	uv.resize(vs.size())
	m.uv = uv
	m.uv2 = uv.duplicate()
	return m


## a low icosphere (one subdivision): [vertices on the unit sphere, triangles wound for Godot]
static func _icosphere() -> Array:
	var t := (1.0 + sqrt(5.0)) * 0.5
	var v := [Vector3(-1, t, 0), Vector3(1, t, 0), Vector3(-1, -t, 0), Vector3(1, -t, 0), Vector3(0, -1, t), Vector3(0, 1, t),
		Vector3(0, -1, -t), Vector3(0, 1, -t), Vector3(t, 0, -1), Vector3(t, 0, 1), Vector3(-t, 0, -1), Vector3(-t, 0, 1)]
	var f := [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2,
		3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1]
	var verts := PackedVector3Array()
	for p in v:
		verts.append((p as Vector3).normalized())
	var mid := {}
	var tris := PackedInt32Array()
	for i in range(0, f.size(), 3):
		var a: int = f[i]
		var b: int = f[i + 1]
		var c: int = f[i + 2]
		var ab := _mid(verts, mid, a, b)
		var bc := _mid(verts, mid, b, c)
		var ca := _mid(verts, mid, c, a)
		tris.append_array(PackedInt32Array([a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca]))
	# (wound clockwise seen from outside, as Godot draws front faces)
	for i in range(0, tris.size(), 3):
		var p0 := verts[tris[i]]
		var n0 := (verts[tris[i + 1]] - p0).cross(verts[tris[i + 2]] - p0)
		if n0.dot(p0) > 0.0:
			var sw := tris[i + 1]
			tris[i + 1] = tris[i + 2]
			tris[i + 2] = sw
	return [verts, tris]


static func _mid(verts: PackedVector3Array, mid: Dictionary, a: int, b: int) -> int:
	var key := Vector2i(mini(a, b), maxi(a, b))
	if mid.has(key):
		return mid[key]
	verts.append(((verts[a] + verts[b]) * 0.5).normalized())
	mid[key] = verts.size() - 1
	return verts.size() - 1


## the spray at a fall's foot: big soft billboards round it rising slowly and fading (every corner at its quad's centre; uv the
## corner, colour r = phase, g = size, b = rise)
func _spray_mesh(fi: int) -> Dictionary:
	var f: Dictionary = falls[fi]
	var m := _surface("spray")
	var rng := RandomNumberGenerator.new()
	rng.seed = r.seed_value + 9500 + fi
	var nrm: Vector2 = f.nrm
	var tng := Vector2(-nrm.y, nrm.x)
	var drop: float = float(f.top) - float(f.bottom)
	var T := sqrt(2.0 * drop / G)
	var hit: Vector2 = (f.lip as Vector2) + nrm * (float(cfg.wall_face_offset) + 0.5 + float(f.v0) * T * 0.75)
	var wid: float = float(f.width) * 1.35
	var cc := Vector2(r.center.x, r.center.y)
	var vs := PackedVector3Array()
	var uv := PackedVector2Array()
	var cs := PackedColorArray()
	var idx := PackedInt32Array()
	for q in 10:
		var ang := rng.randf() * TAU
		var dist := rng.randf_range(0.0, 1.0) * wid
		var c2 := hit + tng * cos(ang) * dist + nrm * (absf(sin(ang)) * dist * 0.8 + 6.0)
		var size := rng.randf_range(0.9, 1.8) * clampf(wid * 1.6, 22.0, 60.0)
		var y: float = float(f.bottom) + rng.randf_range(2.0, 0.15 * drop + 6.0)
		var o := vs.size()
		for cr in [Vector2(-1, -1), Vector2(1, -1), Vector2(1, 1), Vector2(-1, 1)]:
			vs.append(Vector3(c2.x - cc.x, y, c2.y - cc.y))
			uv.append(cr)
			cs.append(Color(rng.randf(), size / 100.0, rng.randf_range(0.10, 0.25) * drop / 100.0, 1.0))
		idx.append_array(PackedInt32Array([o, o + 1, o + 2, o, o + 2, o + 3]))
	m.verts = vs
	m.uv = uv
	m.uv2 = uv.duplicate()
	m.colors = cs
	m.indices = idx
	var ns := PackedVector3Array()
	ns.resize(vs.size())
	ns.fill(Vector3.UP)
	m.normals = ns
	return m


## mist lying in the deep canyons below the plateaus' tops: two sheets at different heights over every stretch of low ground
## with cliffs close on both sides (and over the sunk canyon), thinning out toward the cliffs; per vertex the mist's thickness
func _mist_meshes() -> Array:
	var out := []
	var gc: float = 16.0
	var half: float = r.half
	var nn := int(2.0 * half / gc)
	var c0 := Vector2(r.center.x - half, r.center.y - half)
	var low := PackedByteArray()
	low.resize(nn * nn)
	var hgt := PackedFloat32Array()
	hgt.resize(nn * nn)
	var floor_h: float = r.floor_h
	for j in nn:
		for i in nn:
			var p := c0 + Vector2(i + 0.5, j + 0.5) * gc
			var h: float = r.height_at(p)
			hgt[j * nn + i] = h
			low[j * nn + i] = 1 if h < floor_h + 25.0 else 0
	# canyon: low ground with higher ground within reach on both sides (along one of four directions)
	var reach := int(float(cfg.mist_canyon_width) * 0.5 / gc)
	var mask := PackedFloat32Array()
	mask.resize(nn * nn)
	var dirs := [Vector2i(1, 0), Vector2i(0, 1), Vector2i(1, 1), Vector2i(1, -1)]
	for j in nn:
		for i in nn:
			if low[j * nn + i] == 0:
				continue
			var hit := false
			for dv in dirs:
				var dd: Vector2i = dv
				var a := false
				var b := false
				for s in range(1, reach + 1):
					var ia := i + dd.x * s
					var ja := j + dd.y * s
					if not a and ia >= 0 and ja >= 0 and ia < nn and ja < nn and hgt[ja * nn + ia] > floor_h + 80.0:
						a = true
					var ib := i - dd.x * s
					var jb := j - dd.y * s
					if not b and ib >= 0 and jb >= 0 and ib < nn and jb < nn and hgt[jb * nn + ib] > floor_h + 80.0:
						b = true
				if a and b:
					hit = true
					break
			# (and the sunk canyon, all of it)
			if hit or hgt[j * nn + i] < floor_h - 40.0:
				mask[j * nn + i] = 1.0
	# thickness: blurred so it thins out toward the mask's edge
	for it in 4:
		var bl := mask.duplicate()
		for j in range(1, nn - 1):
			for i in range(1, nn - 1):
				var s := 0.0
				for dj in range(-1, 2):
					for di in range(-1, 2):
						s += mask[(j + dj) * nn + i + di]
				bl[j * nn + i] = minf(s / 9.0, mask[j * nn + i] * 1.0 + 0.0) if it < 2 else s / 9.0
		mask = bl
	var cc := Vector2(r.center.x, r.center.y)
	var layers: PackedFloat32Array = cfg.mist_layers
	for li in layers.size():
		var m := _surface("mist")
		var vid := PackedInt32Array()
		vid.resize(nn * nn)
		vid.fill(-1)
		var vs: PackedVector3Array = m.verts
		var cs: PackedColorArray = m.colors
		var uv: PackedVector2Array = m.uv
		for j in nn:
			for i in nn:
				var th := mask[j * nn + i]
				if th < 0.03:
					continue
				var p := c0 + Vector2(i + 0.5, j + 0.5) * gc
				var base_h := floor_h if hgt[j * nn + i] > floor_h - 40.0 else floor_h - 86.0
				var y := base_h + layers[li]
				# (never above the ground's own top there: no mist sheet through a plateau)
				if hgt[j * nn + i] > y - 8.0:
					continue
				vid[j * nn + i] = vs.size()
				vs.append(Vector3(p.x - cc.x, y, p.y - cc.y))
				cs.append(Color(smoothstep(0.0, 0.8, th), float(li), 0.0, 1.0))
				uv.append(Vector2(p.x, p.y))
		m.verts = vs
		m.colors = cs
		m.uv = uv
		var uv2 := PackedVector2Array()
		uv2.resize(vs.size())
		m.uv2 = uv2
		_grid_tris(m, vid, nn, nn)
		out.append(m)
	return out


# ---- checks --------------------------------------------------------------------------------------------------------------

## every fall checked with rays: horizontal rays through its sheet every metre down (toward the wall) must all hit it - no gap
## from the lip to the water - and its foot must reach under the water's surface; returns a line per fall
func check_falls() -> Array:
	var lines := []
	for fi in falls.size():
		var f: Dictionary = falls[fi]
		var m: Dictionary
		for mm in meshes:
			if str(mm.kind) == "fall" and (mm.at as Array)[0] == f.lip:
				m = mm
		if m.is_empty():
			continue
		var vs: PackedVector3Array = m.verts
		var ids: PackedInt32Array = m.indices
		var nrm: Vector2 = f.nrm
		var tng := Vector2(-nrm.y, nrm.x)
		var cc := Vector2(r.center.x, r.center.y)
		var lip: Vector2 = f.lip
		var miss := 0
		var miss_at := []
		var rays := 0
		var y := float(f.top) - 0.5
		var lowest := INF
		for v in vs:
			lowest = minf(lowest, v.y)
		# (the sheet's middle column: 9 vertices a row, the 5th)
		var rows := vs.size() / 9
		while y > float(f.bottom) + 0.5:
			rays += 1
			# (a ray from 120 m out toward the wall, through the sheet's middle at that height)
			var mid := Vector3(lip.x - cc.x, y, lip.y - cc.y)
			for rr in rows - 1:
				var a := vs[rr * 9 + 4]
				var b := vs[(rr + 1) * 9 + 4]
				if y <= a.y and y >= b.y:
					mid = a.lerp(b, (a.y - y) / maxf(a.y - b.y, 1e-4))
					break
			var orig := Vector3(mid.x + nrm.x * 120.0, y, mid.z + nrm.y * 120.0)
			var dir := Vector3(-nrm.x, 0.0, -nrm.y)
			var hit := false
			for t in range(0, ids.size(), 3):
				if _ray_tri(orig, dir, vs[ids[t]], vs[ids[t + 1]], vs[ids[t + 2]]):
					hit = true
					break
			if not hit:
				miss += 1
				if miss_at.size() < 4:
					miss_at.append("%.0f m down" % (float(f.top) - y))
			y -= 1.0
		var under := float(f.bottom) - lowest
		lines.append("%s: %.0f m tall, %d rays down its middle, %d through a gap%s; its foot %.1f m under the water%s" % [f.name,
			float(f.top) - float(f.bottom), rays, miss, "" if miss_at.is_empty() else " (%s)" % ", ".join(miss_at), under,
			"" if miss == 0 and under > 0.0 else "  FLAG"])
	return lines


static func _ray_tri(o: Vector3, d: Vector3, a: Vector3, b: Vector3, c: Vector3) -> bool:
	var e1 := b - a
	var e2 := c - a
	var pv := d.cross(e2)
	var det := e1.dot(pv)
	if absf(det) < 1e-9:
		return false
	var tv := o - a
	var u := tv.dot(pv) / det
	# (a hair of tolerance: a ray exactly along the edge two triangles share must not slip between them)
	if u < -1e-4 or u > 1.0001:
		return false
	var qv := tv.cross(e1)
	var v := d.dot(qv) / det
	if v < -1e-4 or u + v > 1.0001:
		return false
	return e2.dot(qv) / det > 0.0
