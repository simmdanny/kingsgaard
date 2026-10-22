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
## the place in rivers of each river of the settings (side channels for falls side by side are added to rivers as they come)
var _by_cfg := PackedInt32Array()
## the lakes' outlines: a smooth noise (frequency 1, in units of a lake's smaller radius) warping them
var _wn: FastNoiseLite
const SEG_CELL := 32.0
const BANK := 12.0
## a lake's shore: the ground round it eased down to its rim over this many metres
const SHORE := 10.0
const G := 9.81


func _init(region) -> void:
	r = region
	cfg = region.cfg
	_wn = FastNoiseLite.new()
	_wn.seed = int(region.seed_value) + 4242
	_wn.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	_wn.fractal_type = FastNoiseLite.FRACTAL_NONE
	_wn.frequency = 1.0


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
		elif k == 0 and str(fe.type) == "arch" and absf(l.x) < float(fe.wo) * 0.5:
			# (a river on the floor may run under an arch: only its legs are in the way, 10 m kept from their inner faces)
			dd = float(fe.wo) * 0.5 - absf(l.x) + 10.0
		c = minf(c, dd - 20.0)
	return c


## a river's clearance at a point - none needed in or right by the lake it flows into (whatever stands in that lake)
func _room(p: Vector2, k: int, lake_in: Dictionary) -> float:
	if not lake_in.is_empty() and _in_lake(p, lake_in, 0.25):
		return INF
	return _clearance(p, k)


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
		lakes.append(_lake(c, ax, float(lk[2]), float(lk[3]), float(lk[5]), level, false))
	# each river, then its falls (where it leaves its level: its lip, its drop, the pool it lands in - a lake, or its own
	# plunge pool, where the next river down may start)
	_by_cfg = PackedInt32Array()
	for i in cfg.rivers.size():
		var rv: PackedFloat32Array = cfg.rivers[i]
		var river := _plan_river(i, rv, rng)
		_by_cfg.append(rivers.size())
		rivers.append(river)
		_plan_falls(river, rng)
	# (a river flowing into a lake may have brought its level down: every fall lands on its lake's or pool's final level)
	for f in falls:
		f.bottom = float(lakes[int(f.into)].level)
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
		var hwa: PackedFloat32Array = river.hw
		var wmin := INF
		var wmax := 0.0
		for v in hwa:
			wmin = minf(wmin, v * 2.0)
			wmax = maxf(wmax, v * 2.0)
		var tail := ""
		if int(river.join) >= 0:
			tail = (", splits off %s for a fall of its own" if river.get("split", false) else ", joins %s") % rivers[int(river.join)].name
		elif int(river.into) >= 0:
			tail = ", flows into %s %d" % ["pool" if bool(lakes[int(river.into)].pool) else "lake", int(river.into) + 1]
		lines.append("%s: level %d, %.0f m long, %.0f - %.0f m wide (%.0f at its end), water from %.1f down to %.1f m (%d m of rapids)%s" % [river.name,
			river.level, float(river.length), wmin, wmax, hwa[hwa.size() - 1] * 2.0, (river.w as PackedFloat32Array)[0],
			(river.w as PackedFloat32Array)[(river.w as PackedFloat32Array).size() - 1], nr * 4, tail])
	report.rivers = lines


## a lake or pool: its outline an ellipse warped by noise (bays and points), its bowl, its water level; ext = how far from its
## centre its outline (and shore) can reach
func _lake(c: Vector2, ax: Vector2, ra: float, rb: float, depth: float, level: float, pool: bool) -> Dictionary:
	var lk := {"c": c, "ax": ax, "t": Vector2(-ax.y, ax.x), "ra": ra, "rb": rb, "depth": depth, "level": level, "salt": lakes.size() * 17.3 + 3.1,
		"pool": pool}
	lk.ext = (maxf(ra, rb) + float(cfg.lake_warp) * 0.75 * minf(ra, rb)) / 0.86 + SHORE + 4.0
	return lk


## one river's course on its level: from its source (or the pool of the waterfall feeding it) meandering to a point inside its
## mouth, then straight out over the edge (or on into the lake it flows into); its width - wide on the long calm treads, narrow
## over the rapids, uneven, narrower where its level is - its water level (stairs) and where its rapids are
func _plan_river(idx: int, rv: PackedFloat32Array, rng: RandomNumberGenerator) -> Dictionary:
	var k := int(rv[0])
	var dk: PackedFloat32Array = r._d[k] if k > 0 else r._sink_neg()
	var src: Vector2 = r._from_uv(Vector2(rv[1], rv[2]))
	# (the settings number rivers in their own order: their places in rivers)
	var join := _by_cfg[int(rv[8])] if rv.size() > 8 and rv[8] >= 0.0 else -1
	var from := _by_cfg[int(rv[9])] if rv.size() > 9 and rv[9] >= 0.0 else -1
	var into := -1
	if rv.size() > 10 and rv[10] >= 0.0:
		# (a lake by its number, or 100 + a river's number: the pool that river's waterfall lands in)
		if rv[10] < 100.0:
			into = int(rv[10])
		else:
			var fr2: Dictionary = rivers[_by_cfg[int(rv[10]) - 100]]
			into = int((falls[int((fr2.falls as Array)[0])] as Dictionary).into)
	var feed := {}
	if from >= 0:
		# (it starts at the pool of the waterfall of river `from`, inside that pool's rim toward this river's mouth)
		var fr: Dictionary = rivers[from]
		feed = falls[int((fr.falls as Array)[0])]
		var pool: Dictionary = lakes[int(feed.into)]
		var pc: Vector2 = pool.c
		var mg: Vector2 = r._from_uv(Vector2(rv[3], rv[4]))
		src = pc + (mg - pc).normalized() * minf(float(pool.ra), float(pool.rb)) * 0.7
	var hw_m: float = rv[5] * 0.5
	var hw_lo := float(cfg.river_width_min) * 0.5
	var hw_hi := float(cfg.river_width_max) * 0.5
	# (the room kept round its course is for its narrower stretches: where its level is narrow, so is the river)
	var need := maxf(hw_m * 0.8, hw_lo) + 25.0
	if feed.is_empty():
		src = _find_inside(src, k, need + 5.0)
	var mouth := Vector2.INF
	var nrm := Vector2.ZERO
	var target: Vector2
	var lake_in: Dictionary = lakes[into] if into >= 0 and join < 0 else {}
	if into >= 0 and join < 0:
		# (into a lake: from its given shore point on some 30 m into the water)
		var lk: Dictionary = lakes[into]
		var m1: Vector2 = r._from_uv(Vector2(rv[3], rv[4]))
		target = m1 + ((lk.c as Vector2) - m1).normalized() * 30.0
	elif join >= 0:
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
	# (round an obstacle as a whole: every blocked stretch looks up to 300 m to both sides for where it clears, and goes the way
	# that needs the smaller shift - pushed one small step at a time it got caught between a sinkhole and a ravine)
	for it in 60:
		var bad := PackedByteArray()
		bad.resize(nseg + 1)
		var any := false
		for q in range(1, nseg):
			var p0: Vector2 = src + dir * (L * float(q) / nseg)
			if _room(p0 + side * off[q], k, lake_in) < need:
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
						if _room(p0 + side * (off[qq] + float(sg) * d), k, lake_in) >= need:
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
	var sq_len := PackedFloat32Array()
	sq_len.resize(n)
	for q in range(1, n):
		sq_len[q] = sq_len[q - 1] + pts[q].distance_to(pts[q - 1])
	var length := sq_len[n - 1]
	# width: a little narrower near the source, uneven along it (wide reaches, narrows), and no wider than its level leaves room
	# for (its banks inside the level, clear of the level above and the features) - except over its last stretch, which is the
	# falls' or the junction's
	var hw := PackedFloat32Array()
	hw.resize(n)
	var room := PackedFloat32Array()
	room.resize(n)
	for q in n:
		var t := sq_len[q] / maxf(length, 1.0)
		var nz := 0.24 * _wn.get_noise_1d(sq_len[q] / 170.0 + idx * 13.7) + 0.08 * _wn.get_noise_1d(sq_len[q] / 45.0 - idx * 5.3)
		hw[q] = hw_m * (0.8 + 0.3 * t) * (1.0 + nz)
		room[q] = INF
		if length - sq_len[q] > (95.0 if mouth != Vector2.INF else 40.0) and sq_len[q] > (25.0 if not feed.is_empty() else 0.0):
			room[q] = maxf(_clearance(pts[q], k) - 14.0, hw_lo)
		hw[q] = clampf(minf(hw[q], room[q]), hw_lo, hw_hi)
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
		# (as wide as it may get on a calm tread)
		var hs := hw[q] * 1.22
		for o in [-(hs + 8.0), -hs * 0.5, 0.0, hs * 0.5, hs + 8.0]:
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
		# (into a lake: down to the lake's level where it reaches the water)
		if not lake_in.is_empty() and _lake_rho(pts[q], lake_in) < 1.0:
			run = minf(run, float(lake_in.level))
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
	# wider on the long calm treads, narrower over the rapids (eased over some 40 m)
	var fk := PackedFloat32Array()
	fk.resize(n)
	q = 0
	while q < n:
		var q1 := q
		while q1 + 1 < n and kind[q1 + 1] == kind[q]:
			q1 += 1
		var f := 0.68 if kind[q] == 1 else 1.0 + 0.22 * smoothstep(60.0, 260.0, (q1 - q + 1) * 4.0)
		for qq in range(q, q1 + 1):
			fk[qq] = f
		q = q1 + 1
	for it in 2:
		var sm := fk.duplicate()
		for qq in n:
			var acc := 0.0
			for d in range(-5, 6):
				acc += fk[clampi(qq + d, 0, n - 1)]
			sm[qq] = acc / 11.0
		fk = sm
	for qq in n:
		hw[qq] = clampf(minf(hw[qq] * fk[qq], room[qq]), hw_lo, hw_hi)
		# (at least its mean width over its last 90 m before an edge: its falls are as wide as the river is, not as a narrow
		# reach happens to be there)
		if mouth != Vector2.INF and length - sq_len[qq] < 90.0:
			hw[qq] = clampf(maxf(hw[qq], hw_m * lerpf(0.85, 1.05, smoothstep(90.0, 30.0, length - sq_len[qq]))), hw_lo, hw_hi)
	if not lake_in.is_empty() and w[n - 1] < float(lake_in.level):
		# (the lake lies at the level the river reaches it with: its water never stands above the river's)
		lake_in.level = w[n - 1]
	if not feed.is_empty():
		# (the pool it starts from lies at its first tread's level; the waterfall above lands on it)
		var pool2: Dictionary = lakes[int(feed.into)]
		pool2.level = w[0]
		feed.bottom = w[0]
	var river := {"name": "river%d" % (idx + 1), "level": k, "pts": pts, "w": w, "hw": hw, "kind": kind, "join": join, "from": from,
		"mouth": mouth, "nrm": nrm, "nfalls": int(rv[7]), "into": into if join < 0 else -1, "length": length,
		"depth": float(cfg.river_depth)}
	var lo := Vector2(INF, INF)
	var hi := -lo
	for p in pts:
		lo = lo.min(p)
		hi = hi.max(p)
	river.lo = lo - Vector2.ONE * (hw_hi + BANK + 8.0)
	river.hi = hi + Vector2.ONE * (hw_hi + BANK + 8.0)
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


## a river's falls at its mouth: one about as wide as the river, or several side by side - each its own width, ribs of rock
## of different widths between them, the side ones a little lower at their lips, and a pair close together fanning out until
## they merge partway down - each with its lip on the edge and its drop to the water it lands in: a lake there, or one plunge
## pool for them all on the ground below, sized by the drop
func _plan_falls(river: Dictionary, rng: RandomNumberGenerator) -> void:
	if (river.mouth as Vector2) == Vector2.INF:
		return
	var k: int = river.level
	var dk: PackedFloat32Array = r._d[k] if k > 0 else r._sink_neg()
	var mouth: Vector2 = river.mouth
	var nrm: Vector2 = river.nrm
	var tan_e := Vector2(-nrm.y, nrm.x)
	var wa: PackedFloat32Array = river.w
	var hwa: PackedFloat32Array = river.hw
	var n := hwa.size()
	var w_end: float = wa[n - 1]
	var hw_end: float = hwa[n - 1]
	var nf: int = maxi(int(river.nfalls), 1)
	var wmin := float(cfg.fall_width_min)
	var wmax := float(cfg.fall_width_max)
	var off0 := float(cfg.wall_face_offset)
	# their widths and places along the edge (the river's own fall, k0, at its mouth; the others fed by side channels)
	var widths := PackedFloat32Array()
	var pos := PackedFloat32Array()
	var gaps := PackedFloat32Array()
	if nf == 1:
		widths.append(clampf(hw_end * 2.0 * 0.92, wmin, wmax))
		pos.append(0.0)
	else:
		var total := hw_end * 2.0 * rng.randf_range(1.35, 1.75)
		var wts := PackedFloat32Array()
		var sw := 0.0
		for fi in nf:
			wts.append(rng.randf_range(0.55, 1.45))
			sw += wts[fi]
		for fi in nf:
			widths.append(clampf(total * wts[fi] / sw, wmin, wmax))
		pos.append(0.0)
		for fi in range(1, nf):
			gaps.append(rng.randf_range(7.0, 22.0))
			pos.append(pos[fi - 1] + widths[fi - 1] * 0.5 + gaps[fi - 1] + widths[fi] * 0.5)
	var k0 := rng.randi_range(0, nf - 1) if nf > 1 else 0
	var shift := pos[k0]
	if nf > 1:
		# (the river narrows to its own fall's width over its last 60 m)
		for q in range(maxi(n - 16, 0), n):
			var t := float(q - (n - 16)) / 15.0
			hwa[q] = lerpf(hwa[q], widths[k0] * 0.55, smoothstep(0.0, 1.0, t))
		river.hw = hwa
	# each fall's lip, its top (the side ones 0 - 4.5 m lower), how it spreads as it falls; close pairs merge partway down
	var lips := []
	var tops := PackedFloat32Array()
	var spreads := PackedFloat32Array()
	var sways := PackedFloat32Array()
	for fi in nf:
		var lip: Vector2 = r._onto_edge(dk, mouth + tan_e * (pos[fi] - shift))
		lips.append(lip)
		tops.append(w_end if fi == k0 else w_end - (0.0 if rng.randf() < 0.25 else rng.randf_range(0.8, 4.5)))
		spreads.append(rng.randf_range(0.3, 0.5))
		sways.append(rng.randf_range(-0.02, 0.02))
	var merges := []
	for fi in nf - 1:
		if gaps[fi] < 16.0 and rng.randf() < 0.7:
			var fm := rng.randf_range(0.35, 0.65)
			var need_sp := 2.2 * gaps[fi] / ((widths[fi] + widths[fi + 1]) * fm)
			spreads[fi] = clampf(maxf(spreads[fi], need_sp), 0.3, 2.6)
			spreads[fi + 1] = clampf(maxf(spreads[fi + 1], need_sp), 0.3, 2.6)
			sways[fi] = 0.025
			sways[fi + 1] = -0.025
			merges.append("%d+%d at %.0f%%" % [fi + 1, fi + 2, fm * 100.0])
	river.merges = merges
	# where they land: a lake there, or one plunge pool for them all (bigger the further they fall, wide enough for all of them)
	var land0: Vector2 = (lips[k0] as Vector2) + r._out_normal(dk, lips[k0]) * (off0 + 28.0)
	var into := _lake_below(land0, k, w_end)
	if into < 0:
		var gb := _ground_below(land0, k)
		var drop := w_end - gb
		var dia := clampf(30.0 + 0.42 * drop, float(cfg.plunge_pool_min), float(cfg.plunge_pool_max))
		var span := pos[nf - 1] - pos[0] + (widths[0] + widths[nf - 1]) * 0.5
		var mid := Vector2.ZERO
		for lp in lips:
			mid += lp
		mid /= nf
		var ra := dia * 0.5 * 0.8
		var rb := maxf(dia * 0.5, span * 0.5 + dia * 0.2)
		var pool := _lake(mid + nrm * (off0 + ra * 0.7), nrm, ra, rb, 8.0 + drop * 0.02, gb - 0.8, true)
		lakes.append(pool)
		into = lakes.size() - 1
	river.falls = []
	for fi in nf:
		var lip: Vector2 = lips[fi]
		var ln: Vector2 = r._out_normal(dk, lip)
		var land := lip + ln * (off0 + 28.0)
		var fin := _lake_below(land, k, tops[fi])
		if fin < 0:
			fin = into
		var fall := {"lip": lip, "nrm": ln, "top": tops[fi], "bottom": float(lakes[fin].level), "width": widths[fi], "into": fin,
			"river": river.name, "v0": rng.randf_range(2.6, 3.8), "sway": sways[fi], "spread": spreads[fi],
			"name": "%s fall %d" % [river.name, fi + 1]}
		falls.append(fall)
		river.falls.append(falls.size() - 1)
		if fi != k0:
			_split_channel(river, lip, ln, widths[fi], tops[fi], rng)


## the lake a fall from level k lands in at a point: one whose outline holds it, lying on the ground below there (not one
## on a terrace above, nor one whose warped outline reaches out over a lower canyon), well below the lip; -1 for none
func _lake_below(land: Vector2, k: int, top: float) -> int:
	var gb := _ground_below(land, k)
	var found := -1
	for li in lakes.size():
		var lk: Dictionary = lakes[li]
		if _in_lake(land, lk, 0.0) and absf(float(lk.level) - gb) < 8.0 and float(lk.level) < top - 20.0:
			found = li
	return found


## a side channel for one of several falls side by side: from the river some 60 - 100 m before its mouth, curving out to that
## fall's lip and over it (part of the river's mesh; its water from the river's level there down to the lip's)
func _split_channel(river: Dictionary, lip: Vector2, ln: Vector2, width: float, top: float, rng: RandomNumberGenerator) -> void:
	var pts: PackedVector2Array = river.pts
	var w: PackedFloat32Array = river.w
	var n := pts.size()
	var qs := maxi(n - 1 - rng.randi_range(15, 25), 0)
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
		cw[q] = lerpf(w[qs], top, smoothstep(0.0, 1.0, t))
		ch[q] = lerpf((river.hw as PackedFloat32Array)[qs] * 0.6, width * 0.55, t)
		ck[q] = 1 if w[qs] - top > 0.8 else 0
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
		if p.distance_squared_to(lk.c) > float(lk.ext) * float(lk.ext):
			continue
		if _lake_rho(p, lk) < 0.98 and not _off_floor_edge(p, lk):
			var gh: float = r.height_at(p)
			if gh < float(lk.level) + 1.0 and gh > float(lk.level) - float(lk.depth) - 3.0:
				return true
	return false


## whether a point is too near the sunk canyon's edge for a lake on the valley floor (the canyon's own lake: never)
func _off_floor_edge(p: Vector2, lk: Dictionary) -> bool:
	return float(lk.level) > float(r.floor_h) - 40.0 and r._gbil(r._sink_neg(), p) < 18.0


func _in_lake(p: Vector2, lk: Dictionary, margin: float) -> bool:
	if p.distance_squared_to(lk.c) > float(lk.ext) * float(lk.ext):
		return false
	return _lake_rho(p, lk) < 1.0 + margin


## a lake's normalized radius at a point (1 on its outline): an ellipse seen through a domain warp - the point pushed about by
## two octaves of smooth noise (in units of the lake's smaller radius, so a long lake gets more bays along its length) - and its
## radius rippled by a finer one: bays and points, never a clean oval. A pool's warp is gentler (a fall must land in it).
func _lake_rho(p: Vector2, lk: Dictionary) -> float:
	var rel: Vector2 = p - (lk.c as Vector2)
	var rm := minf(float(lk.ra), float(lk.rb))
	var q := rel / rm
	var sl: float = lk.salt
	var amp := float(cfg.lake_warp) * (0.6 if bool(lk.pool) else 1.0) * rm
	var wx := _wn.get_noise_2d(q.x * 0.9 + sl, q.y * 0.9) * 0.55 + _wn.get_noise_2d(q.x * 2.3 - sl, q.y * 2.3 + 7.0) * 0.2
	var wy := _wn.get_noise_2d(q.x * 0.9 + sl + 31.0, q.y * 0.9 - 17.0) * 0.55 + _wn.get_noise_2d(q.x * 2.3 + 5.0, q.y * 2.3 - sl) * 0.2
	var r2 := rel + Vector2(wx, wy) * amp
	var a := r2.dot(lk.ax) / float(lk.ra)
	var b := r2.dot(lk.t) / float(lk.rb)
	return sqrt(a * a + b * b) * (1.0 + 0.1 * _wn.get_noise_2d(q.x * 3.6 + sl * 2.0, q.y * 3.6 - sl))


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
		# (deeper the wider it is, and a little deeper downstream)
		var depth: float = float(river.depth) * clampf(hwq / 18.0, 0.8, 1.5) * (0.85 + 0.15 * clampf(float(nr[1]) / (river.pts as PackedVector2Array).size(), 0.0, 1.0))
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
		# (a quick reject first: how far its warped outline and its shore can reach)
		if p.distance_squared_to(lk.c) > float(lk.ext) * float(lk.ext):
			continue
		var lvl: float = lk.level
		# (only the low ground: a lake fills the floor round it, it never cuts into a plateau or a terrace)
		if h > lvl + 6.0:
			continue
		# (and on the valley floor never within 18 m of the sunk canyon's edge: the ground there keeps the water's edge hidden)
		if _off_floor_edge(p, lk):
			continue
		var rho := _lake_rho(p, lk)
		var rm := minf(float(lk.ra), float(lk.rb))
		if rho >= 1.0:
			# (its shore: the ground round it eased down to the rim, so a lake lying lower than its floor has no step)
			var d_out := (rho - 1.0) * rm
			if d_out < SHORE and h > lvl + 0.4:
				h = minf(h, lerpf(lvl + 0.4, h, smoothstep(0.0, 1.0, d_out / SHORE)))
			continue
		if h > lvl + 3.0:
			continue
		var dist_in := (1.0 - rho) * rm
		var bed: float = lvl + 0.4 - (float(lk.depth) + 0.4) * smoothstep(0.0, 1.0, dist_in / maxf(rm * 0.45, 12.0))
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
		meshes.append(_foam_mesh(fi))
		meshes.append(_spray_mesh(fi))
		meshes.append(_drops_mesh(fi))
		var f: Dictionary = falls[fi]
		var lk: Dictionary = lakes[int(f.into)]
		var into_s := "lake %d" % (int(f.into) + 1)
		if bool(lk.pool):
			into_s = "its plunge pool (%d, %.0f x %.0f m)" % [int(f.into) + 1, float(lk.ra) * 2.0, float(lk.rb) * 2.0]
		lines.append("%s: %.0f m (from %.0f down to %.0f m), %.0f m wide (%.0f m at its foot), into %s" % [f.name, float(f.top) - float(f.bottom),
			f.top, f.bottom, f.width, float(f.width) * (1.0 + float(f.spread)), into_s])
	for river in rivers:
		if not (river.get("merges", []) as Array).is_empty():
			lines.append("%s: falls %s merge on their way down" % [river.name, ", ".join(river.merges)])
	for m in _mist_meshes():
		meshes.append(m)
	report.falls = lines
	var ll := []
	for li in lakes.size():
		var lk: Dictionary = lakes[li]
		ll.append("%s %d: level %.1f m, %.0f x %.0f m before its outline is warped, %.0f m deep" % ["pool" if bool(lk.pool) else "lake", li + 1, lk.level,
			float(lk.ra) * 2.0, float(lk.rb) * 2.0, lk.depth])
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
	var ext: float = lk.ext
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
			if ground > level + 1.5 or ground < level - float(lk.depth) - 3.0:
				continue
			if _off_floor_edge(p, lk):
				continue
			vid[j * na + i] = vs.size()
			vs.append(Vector3(p.x - cc.x, level, p.y - cc.y))
			var ring := 99.0
			for sg in range(0, rings.size(), 2):
				ring = minf(ring, _pt_seg(p, rings[sg], rings[sg + 1]))
			# (alpha: fading out over the last 12 m before it stops short of the sunk canyon's edge - the rim dips below the
			# water there, so no shore hides where the surface ends)
			var fade := 1.0
			if level > float(r.floor_h) - 40.0:
				fade = smoothstep(18.0, 30.0, r._gbil(r._sink_neg(), p))
			cs.append(Color(0.0, 0.25, 1.0, fade))
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
			# (the depth the shader colours by: the true depth near the shore, then as shallow as that over the floor, deepening
			# only over the bowl in the middle - turquoise round a dark heart)
			var dw := level - ground
			uv2.append(Vector2(dw if dw < 1.0 else 1.0 + maxf(dw - float(cfg.sinkhole_pool_level), 0.0) * 0.6, ring))
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
		var wid: float = float(f.width) * (1.0 + float(f.spread) * pow(fr, 1.2))
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
			cs.append(Color(float(fi) * 0.137, wid / 100.0, 0.0, 1.0))
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


## where a fall meets the water: a sheet of white foam on the surface round its foot, spreading outward (a disc stretched along
## the fall's width, pushed out from the wall; uv: across, out, the rim at 1; colour r = its own seed, g = its reach out / 100 m,
## b = the fall's width at its foot / 100 m), for the foam shader
func _foam_mesh(fi: int) -> Dictionary:
	var f: Dictionary = falls[fi]
	var m := _surface("foam")
	var nrm: Vector2 = f.nrm
	var tng := Vector2(-nrm.y, nrm.x)
	var drop: float = float(f.top) - float(f.bottom)
	var hit := _fall_hit(f)
	var wb: float = float(f.width) * (1.0 + float(f.spread))
	var r0 := 14.0 + drop * 0.12
	var ra := wb * 0.5 + r0
	var c2 := hit + nrm * r0 * 0.3
	var y: float = float(f.bottom) + 0.12
	var cc := Vector2(r.center.x, r.center.y)
	var rings := 12
	var segs := 48
	var vs := PackedVector3Array()
	var uv := PackedVector2Array()
	var cs := PackedColorArray()
	for j in rings + 1:
		var sr := float(j) / rings
		for i in segs:
			var a := TAU * i / segs
			var p := c2 + tng * cos(a) * ra * sr + nrm * sin(a) * r0 * 1.15 * sr
			vs.append(Vector3(p.x - cc.x, y, p.y - cc.y))
			uv.append(Vector2(cos(a), sin(a)) * sr)
			cs.append(Color(float(fi) * 0.173, r0 / 100.0, wb / 100.0, 1.0))
	var idx := PackedInt32Array()
	for j in rings:
		for i in segs:
			var a0 := j * segs + i
			var b0 := j * segs + (i + 1) % segs
			idx.append_array(PackedInt32Array([a0, b0, a0 + segs, b0, b0 + segs, a0 + segs]))
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


## where a fall's sheet reaches its pool (its middle, as the sheet's curve has it there)
func _fall_hit(f: Dictionary) -> Vector2:
	var drop: float = float(f.top) - float(f.bottom)
	var T := sqrt(2.0 * maxf(drop, 1.0) / G)
	return (f.lip as Vector2) + (f.nrm as Vector2) * (float(cfg.wall_face_offset) + 0.5 + float(f.v0) * T * 0.75)


## the spray at a fall's foot: billowing clouds of mist - big soft puffs low on the water rolling outward from it, and a plume
## rising up the fall's lower part - every corner of a quad at its centre; uv the corner, uv2 how far it drifts (m, x / z),
## colour r = phase, g = size / 100 m, b = rise / 100 m, a = its pace
func _spray_mesh(fi: int) -> Dictionary:
	var f: Dictionary = falls[fi]
	var m := _surface("spray")
	var rng := RandomNumberGenerator.new()
	rng.seed = r.seed_value + 9500 + fi
	var nrm: Vector2 = f.nrm
	var tng := Vector2(-nrm.y, nrm.x)
	var drop: float = float(f.top) - float(f.bottom)
	var hit := _fall_hit(f)
	var wb: float = float(f.width) * (1.0 + float(f.spread))
	var r0 := 14.0 + drop * 0.12
	var bottom: float = f.bottom
	var cc := Vector2(r.center.x, r.center.y)
	var vs := PackedVector3Array()
	var uv := PackedVector2Array()
	var uv2 := PackedVector2Array()
	var cs := PackedColorArray()
	var idx := PackedInt32Array()
	var nb := 12 + int(wb / 8.0)
	var np := 6 + int(drop / 40.0)
	for q in nb + np:
		var base := q < nb
		var x := rng.randf_range(-0.5, 0.5) * wb
		var fwd := rng.randf_range(0.0, 0.45) * r0 if base else rng.randf_range(-3.0, 8.0)
		var c2 := hit + tng * x + nrm * fwd
		var size: float
		var y: float
		var rise: float
		var drift := Vector2.ZERO
		if base:
			size = rng.randf_range(0.35, 0.65) * (r0 + wb * 0.35)
			y = bottom + size * 0.3
			rise = rng.randf_range(0.02, 0.06) * drop + 4.0
			var outd := (tng * x / maxf(wb * 0.5, 1.0) + nrm * rng.randf_range(0.6, 1.0)).normalized()
			drift = outd * rng.randf_range(0.5, 1.1) * r0
		else:
			size = rng.randf_range(0.5, 0.85) * (wb * 0.45 + 10.0 + drop * 0.05)
			y = bottom + rng.randf_range(0.05, 0.22) * drop
			rise = rng.randf_range(0.12, 0.28) * drop
			drift = nrm * rng.randf_range(4.0, 14.0)
		var ph := rng.randf()
		var pace := rng.randf_range(0.7, 1.3)
		var o := vs.size()
		for cr in [Vector2(-1, -1), Vector2(1, -1), Vector2(1, 1), Vector2(-1, 1)]:
			vs.append(Vector3(c2.x - cc.x, y, c2.y - cc.y))
			uv.append(cr)
			uv2.append(drift)
			cs.append(Color(ph, size / 100.0, rise / 100.0, pace))
		idx.append_array(PackedInt32Array([o, o + 1, o + 2, o, o + 2, o + 3]))
	m.verts = vs
	m.uv = uv
	m.uv2 = uv2
	m.colors = cs
	m.indices = idx
	var ns := PackedVector3Array()
	ns.resize(vs.size())
	ns.fill(Vector3.UP)
	m.normals = ns
	return m


## fine spray at a fall's foot: many small drops thrown out of the impact in arcs and falling back (each a tiny billboard: its
## launch point; uv the corner, uv2 its horizontal speed (m/s, x / z), colour r = phase, g = size / 10 m, b = upward speed / 50
## m/s, a = its pace)
func _drops_mesh(fi: int) -> Dictionary:
	var f: Dictionary = falls[fi]
	var m := _surface("drops")
	var rng := RandomNumberGenerator.new()
	rng.seed = r.seed_value + 9900 + fi
	var nrm: Vector2 = f.nrm
	var tng := Vector2(-nrm.y, nrm.x)
	var drop: float = float(f.top) - float(f.bottom)
	var hit := _fall_hit(f)
	var wb: float = float(f.width) * (1.0 + float(f.spread))
	var cc := Vector2(r.center.x, r.center.y)
	var vs := PackedVector3Array()
	var uv := PackedVector2Array()
	var uv2 := PackedVector2Array()
	var cs := PackedColorArray()
	var idx := PackedInt32Array()
	var nd := mini(50 + int(wb * 1.5), 140)
	for q in nd:
		var x := rng.randf_range(-0.5, 0.5) * wb
		var c2 := hit + tng * x + nrm * rng.randf_range(-2.0, 4.0)
		var dir := (nrm * rng.randf_range(0.3, 1.0) + tng * rng.randf_range(-0.8, 0.8)).normalized()
		var vh := rng.randf_range(3.0, 9.0) + drop * 0.03
		var vv := rng.randf_range(6.0, 13.0) + drop * 0.035
		var size := rng.randf_range(0.5, 1.5) + drop * 0.004
		var ph := rng.randf()
		var pace := rng.randf_range(0.8, 1.3)
		var o := vs.size()
		for cr in [Vector2(-1, -1), Vector2(1, -1), Vector2(1, 1), Vector2(-1, 1)]:
			vs.append(Vector3(c2.x - cc.x, float(f.bottom) + 0.5, c2.y - cc.y))
			uv.append(cr)
			uv2.append(dir * vh)
			cs.append(Color(ph, size / 10.0, vv / 50.0, pace))
		idx.append_array(PackedInt32Array([o, o + 1, o + 2, o, o + 2, o + 3]))
	m.verts = vs
	m.uv = uv
	m.uv2 = uv2
	m.colors = cs
	m.indices = idx
	var ns := PackedVector3Array()
	ns.resize(vs.size())
	ns.fill(Vector3.UP)
	m.normals = ns
	return m


## mist lying in the deep canyon below the plateaus' tops: soft clouds over the sunk canyon - thick in its middle, thinning out
## toward its walls, their tops uneven, swaying slowly; the pillars and walls stand up through them
func _mist_meshes() -> Array:
	var out := []
	var gc: float = 16.0
	var half: float = r.half
	var nn := int(2.0 * half / gc)
	var c0 := Vector2(r.center.x - half, r.center.y - half)
	var hgt := PackedFloat32Array()
	hgt.resize(nn * nn)
	var floor_h: float = r.floor_h
	for j in nn:
		for i in nn:
			var p := c0 + Vector2(i + 0.5, j + 0.5) * gc
			var h: float = r.height_at(p)
			hgt[j * nn + i] = h
	# the deep canyon: all of the sunk canyon's floor (in the valleys a low deck lay like snow at the walls' feet)
	var mask := PackedFloat32Array()
	mask.resize(nn * nn)
	for j in nn:
		for i in nn:
			if hgt[j * nn + i] < floor_h - 40.0:
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
	# the clouds: big soft puffs on a jittered 34 m grid over the mask - one where it is thin, two where it is thick, higher
	# and bigger and denser toward the canyon's middle (so the deck's top is uneven), none inside a pillar or a wall; each
	# swaying slowly along the canyon (every corner of a quad at its centre; uv the corner, uv2 how far it sways (m, x / z),
	# colour r = phase, g = size / 100 m, b = its opacity, a = its pace)
	var deck: PackedFloat32Array = cfg.mist_deck
	var m := _surface("cloud")
	var rng := RandomNumberGenerator.new()
	rng.seed = r.seed_value + 7300
	var cc := Vector2(r.center.x, r.center.y)
	var vs := PackedVector3Array()
	var uv := PackedVector2Array()
	var uv2 := PackedVector2Array()
	var cs := PackedColorArray()
	var idx := PackedInt32Array()
	var sp := 34.0
	var ns := int(2.0 * half / sp)
	var wind := Vector2(1.0, 0.3).normalized()
	for j in ns:
		for i in ns:
			var p := c0 + (Vector2(i, j) + Vector2(rng.randf(), rng.randf())) * sp
			var fx := clampf((p.x - c0.x) / gc - 0.5, 0.0, nn - 1.001)
			var fz := clampf((p.y - c0.y) / gc - 0.5, 0.0, nn - 1.001)
			var i0 := int(fx)
			var j0 := int(fz)
			var ux := fx - i0
			var uz := fz - j0
			var th := lerpf(lerpf(mask[j0 * nn + i0], mask[j0 * nn + i0 + 1], ux), lerpf(mask[(j0 + 1) * nn + i0], mask[(j0 + 1) * nn + i0 + 1], ux), uz)
			if th < 0.08:
				continue
			var cnt := 2 if th > 0.55 and rng.randf() < 0.7 else 1
			for c in cnt:
				var q := p + Vector2(rng.randf_range(-10.0, 10.0), rng.randf_range(-10.0, 10.0))
				var y := floor_h - 86.0 + deck[0] + th * rng.randf_range(0.15, 1.0) * deck[1]
				var gh: float = r.height_at(q)
				if gh > y - 6.0:
					continue
				var size := (0.55 + 0.55 * th) * rng.randf_range(30.0, 52.0)
				var drift := wind.rotated(rng.randf_range(-0.4, 0.4)) * rng.randf_range(12.0, 30.0)
				var ph := rng.randf()
				var pace := rng.randf_range(0.7, 1.3)
				var o := vs.size()
				for cr in [Vector2(-1, -1), Vector2(1, -1), Vector2(1, 1), Vector2(-1, 1)]:
					vs.append(Vector3(q.x - cc.x, y, q.y - cc.y))
					uv.append(cr)
					uv2.append(drift)
					cs.append(Color(ph, size / 100.0, 0.3 + 0.55 * th, pace))
				idx.append_array(PackedInt32Array([o, o + 1, o + 2, o, o + 2, o + 3]))
	m.verts = vs
	m.uv = uv
	m.uv2 = uv2
	m.colors = cs
	m.indices = idx
	var nrm := PackedVector3Array()
	nrm.resize(vs.size())
	nrm.fill(Vector3.UP)
	m.normals = nrm
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
