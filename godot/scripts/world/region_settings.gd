extends Resource
## REGION SETTINGS (scripts/world/region_settings.gd): every number the tepui / plateau region uses (tepui_region.gd), in one
## place. Change a value and the next start rebuilds the region (its cache key is made from all of them). Lengths in metres,
## angles in degrees. The region is a set of tables: a flat floor, a few big flat-topped plateaus standing on it, sheer walls
## between - the terrain itself steps straight up at every wall (and the wall meshes stand on that step).

@export var enabled := true
## the region's own seed (mixed with the island's): same seeds + settings = the same region
@export var seed_value := 1

@export_group("Place")
## the region's centre on the map (m); INF = chosen automatically: highlands / high plateaus all round, no sea or mountains
## in it, mountains in view beyond it
@export var center := Vector2(4000.0, -1496.0)
## the region is a square this wide
@export var size := 4000.0
## the floor blends back into the island's own ground across a band this wide inside the region's edge (wandering in and out
## by border_noise); no plateau comes into that band
@export var border := 280.0
@export var border_noise := 120.0
## the layout's main direction (degrees: the main valley runs along it); INF = chosen from the sun so the long walls are lit
## from the side
@export var valley_angle := INF
## cell size of the region's layout grid (m)
@export var grid_cell := 8.0
## the floor: flat at the island's middle height in the region, with gentle swells of this amplitude (m) and wavelength (m)
@export var floor_amp := 3.0
@export var floor_wavelength := 1400.0

@export_group("Plateaus")
## the plateau levels: heights above the floor (m) - A, B, C
@export var level_heights := PackedFloat32Array([150.0, 280.0, 430.0])
## the plateaus, in layout coordinates (u along the main valley, v across it, from the region's centre): each
## [u, v, radius along u, radius along v, base level (1 = A, 2 = B), then the levels of its stacked terraces, if any (each
## higher one set back inside the one below)]. Neighbouring plateaus are kept apart by at least two gap_min (a canyon or more).
@export var plateaus: Array[PackedFloat32Array] = [
	PackedFloat32Array([-680.0, 960.0, 900.0, 700.0, 1.0, 2.0, 3.0]),
	PackedFloat32Array([820.0, 960.0, 800.0, 680.0, 1.0]),
	PackedFloat32Array([-1000.0, -960.0, 640.0, 640.0, 2.0]),
	PackedFloat32Array([150.0, -960.0, 680.0, 650.0, 2.0, 3.0]),
	PackedFloat32Array([1200.0, -980.0, 420.0, 590.0, 1.0]),
	PackedFloat32Array([1250.0, -60.0, 270.0, 230.0, 1.0]),
]
## pairs of plateaus (indices into plateaus) split only by a narrow canyon: half its width there, gap_canyon_min..max (m);
## any other neighbours keep at least gap_min..gap_max apart (half the gap, m)
@export var canyon_pairs: Array[Vector2i] = [Vector2i(0, 1), Vector2i(2, 3)]
@export var gap_canyon_min := 60.0
@export var gap_canyon_max := 125.0
@export var gap_min := 110.0
@export var gap_max := 220.0
## the borders between neighbours bend gently (amplitude m, wavelength m): no long straight canyon side; the plateaus' trim
## at the region's border band wanders by edge_bend_amp (m) the same way
@export var canyon_bend_amp := 45.0
@export var canyon_bend_wavelength := 380.0
@export var edge_bend_amp := 30.0
## one canyon's floor sunk below the region's floor (an index into canyon_pairs; -1 none): this deep (m), over the floor
## within sunk_reach (m) of both its plateaus; a wall steps down into it where it opens on the valley
@export var sunk_canyon := 0
@export var sunk_depth := 85.0
@export var sunk_reach := 190.0
## the outlines: domain warp (m, wavelength m), big bays and headlands (amplitude m, wavelength m), small wiggles (m, m)
@export var warp_amp := 130.0
@export var warp_wavelength := 1100.0
@export var bay_amp := 200.0
@export var bay_wavelength := 760.0
@export var wiggle_amp := 70.0
@export var wiggle_wavelength := 320.0
## and eroded at smaller scales: notches and small headlands twice (amplitude m, wavelength m), narrow inlets where a noise's
## crest crosses an edge (depth m, wavelength m); every corner where two shapes meet rounded over about this much (m)
@export var outline_mid_amp := 22.0
@export var outline_mid_wavelength := 140.0
@export var outline_fine_amp := 9.0
@export var outline_fine_wavelength := 55.0
@export var inlet_depth := 28.0
@export var inlet_wavelength := 110.0
@export var corner_round := 40.0
## a stacked terrace's setback inside the level below: between these two along its edge (in the outline's own units - its
## warp shrinks them in places), and never less than terrace_min_depth (m, measured)
@export var terrace_min := 160.0
@export var terrace_max := 290.0
@export var terrace_min_depth := 112.0
## plateau pieces smaller than this are dropped (km2)
@export var min_plateau_km2 := 0.1
## each plateau's own height offset, up to this much either way (m), and the tops' gentle rolling hills (amplitude m,
## wavelength m) - so no wall is taller than about 295 m
@export var level_jitter := 6.0
@export var top_hill_amp := 3.0
@export var top_hill_wavelength := 500.0

@export_group("Walls")
## wall mesh spacing: columns along the edge and rows down the face (m)
@export var wall_column := 6.0
@export var wall_row := 10.0
## the face stands this far out from the terrain's step (m), so the step (a near-vertical 4 m strip of terrain) is always
## behind it; it leans out by wall_batter of its height towards its foot; its foot goes this far into the ground (m)
@export var wall_face_offset := 9.0
@export var wall_batter := 0.03
@export var wall_sink := 4.0
## the rock's top: a lip from the face's top edge back over the plateau's edge, its inner edge this far inside the step (m)
## and just under the grass, so the edge of the plateau is the edge of the rock
@export var wall_lip := 7.0
## an edge lower than this gets no wall (m)
@export var wall_min_height := 2.0
## large-scale shape: slow curvature (amplitude m, wavelength m), buttresses (spacing m, width m, how far out m), broad
## flutes down the face (wavelength m, depth m), fine vertical grooves (wavelength m, depth m), setbacks at rock layers
## (layer spacing m, step m)
@export var wall_curve_amp := 18.0
@export var wall_curve_wavelength := 260.0
@export var buttress_spacing := 110.0
@export var buttress_width := 50.0
@export var buttress_depth := 24.0
@export var flute_wavelength := 46.0
@export var flute_depth := 6.0
@export var groove_wavelength := 24.0
@export var groove_depth := 2.6
@export var setback_spacing := 45.0
@export var setback_depth := 8.0

@export_group("Erosion")
## the rim: the plateau's top sinks toward its edge by this much at the edge (m, from .. to, varying along it), easing out over
## this far in (m, from .. to) - a rounded, crumbled rim whose height wanders along the wall
@export var rim_dip := Vector2(5.0, 20.0)
@export var rim_reach := Vector2(30.0, 75.0)
## the face: leaning back from vertical by this many degrees (from .. to, varying along the wall over the wavelength, m;
## negative: overhanging a little), a bulge (up to m, wavelength m), ledges at some rock layers (how deep m, the share of
## layer and stretch that has one, the stretch's length m), and the rim's rounded shoulder (m back from the face)
@export var wall_lean := Vector2(-3.0, 12.0)
@export var wall_lean_wavelength := 260.0
@export var wall_bulge := 16.0
@export var wall_bulge_wavelength := 180.0
@export var ledge_depth := 14.0
@export var ledge_share := 0.45
@export var ledge_segment := 150.0
@export var wall_shoulder := 6.0
## talus at the foot of every wall and carved rock: rubble as high as this share of the wall (from .. to, varying along it),
## its slope (degrees), never reaching across more than talus_room of the free ground in front
@export var talus_share := Vector2(0.10, 0.25)
@export var talus_angle := 33.0
@export var talus_room := 0.35

@export_group("Walking routes")
## the ways up: ravines cut into a plateau's edge, their floor climbing at notch_angle (degrees) from the ground in front to
## the top, notch_width wide (m) between sheer sides; this many per plateau piece and level
@export var notches_per_plateau := 2
@export var notch_angle := 30.0
@export var notch_width := 90.0

@export_group("Arches")
## rock fins and necks, carved. Each: [kind (0 a neck: a rock bridge between two plateau parts, with an opening; 1 a fin: a
## ridge sticking out from a wall, with an opening - a natural bridge on two legs; 2 a support: a fin whose outer part is
## hollowed out under a slab standing on two elephant legs), u0, v0, u1, v1 (layout coordinates: the neck's two ends inside
## the plateaus, or the fin's root inside the plateau and its tip out over the ground), width (m), the lowest and highest
## level it fills (1 - 3), where along it the opening is (0 .. 1; a support: where its slab begins), the opening's width at
## its narrowest (m; a support: its legs' radius), the rock left above the opening as a share of the arch's height (0 .. 1;
## a support: the slab's thickness, the same way)]
@export var arches: Array[PackedFloat32Array] = [
	PackedFloat32Array([1.0, -1000.0, -460.0, -1000.0, 20.0, 44.0, 1.0, 2.0, 0.6875, 150.0, 0.30]),
	PackedFloat32Array([1.0, 650.0, 560.0, 650.0, 200.0, 28.0, 1.0, 1.0, 0.728, 115.0, 0.30]),
	PackedFloat32Array([1.0, 880.0, -60.0, 600.0, -60.0, 30.0, 1.0, 1.0, 0.571, 112.0, 0.30]),
	PackedFloat32Array([2.0, 1220.0, -860.0, 1220.0, -470.0, 80.0, 1.0, 1.0, 0.49, 28.0, 0.3]),
	PackedFloat32Array([2.0, -50.0, -560.0, -50.0, -250.0, 90.0, 1.0, 2.0, 0.42, 33.0, 0.28]),
]
## the carving: voxel size of the bake (m), how much an opening widens towards its mouths (0 .. 1)
@export var arch_voxel := 2.5
@export var arch_flare := 0.25

@export_group("Overhangs")
## stretches of the plateaus' edges whose top juts out over an undercut wall, drips hanging under the lip. Each: [u, v (near
## the edge, layout coordinates), level (1 - 3), length along the edge (m), how far the lip juts out past the wall (m), the
## lip's thickness (m), how deep the wall under it is undercut (m)]
@export var overhangs: Array[PackedFloat32Array] = [
	PackedFloat32Array([-991.0, 389.0, 2.0, 220.0, 28.0, 24.0, 8.0]),
	PackedFloat32Array([168.0, 818.0, 1.0, 260.0, 18.0, 18.0, 6.0]),
	PackedFloat32Array([1085.0, 438.0, 1.0, 200.0, 14.0, 16.0, 5.0]),
]

@export_group("Pillars")
## freestanding rock columns like elephants' legs: thick and flared at the foot, lumpy, narrowing to a flat grassy top. Each:
## [u, v, height (m; negative: up to that level's height), radius at the base and at the top (m), a cap of plateau on top
## this many times the column's top radius (0: none)]
@export var pillars: Array[PackedFloat32Array] = [
	PackedFloat32Array([130.0, 574.0, -1.0, 40.0, 28.0, 0.0]),
	PackedFloat32Array([-400.0, -16.0, 190.0, 46.0, 31.0, 1.55]),
	PackedFloat32Array([738.0, -617.0, 140.0, 38.0, 27.0, 0.0]),
	PackedFloat32Array([118.0, 31.0, 230.0, 50.0, 34.0, 1.45]),
]

@export_group("Sinkholes")
## round holes carved down from the plateaus' tops, sheer inside, flat at the bottom. Each: [u, v, diameter (m), depth (m)]
@export var sinkholes: Array[PackedFloat32Array] = [
	PackedFloat32Array([983.0, 1132.0, 110.0, 100.0]),
	PackedFloat32Array([-750.0, -508.0, 80.0, 140.0]),
	PackedFloat32Array([1425.0, -1118.0, 50.0, 90.0]),
]

@export_group("Water")
## rivers on the plateaus' tops (phase 3), falling off the edges as waterfalls, and on the valley floor from a waterfall's pool
## to a lake. Each: [level it runs on (0: the valley floor), source u, v, mouth u, v (the edge it falls off; for a tributary the
## point it joins its river; for a river into a lake the shore point it reaches the lake at), its mean width (m; it varies
## along the river within river_width_min - max), meander (share of its length), falls at its mouth (0 none, 1, or several side
## by side), the river it joins (-1 none), the river whose waterfall's pool it starts from (-1 none), the lake it flows into
## (-1 none; 100 + a river's number: that river's waterfall's pool)]
@export var rivers: Array[PackedFloat32Array] = [
	PackedFloat32Array([1.0, 1384.0, 1427.0, 254.0, 575.0, 48.0, 0.10, 1.0, -1.0, -1.0]),
	PackedFloat32Array([1.0, 705.0, 1719.0, 195.0, 1021.0, 40.0, 0.08, 2.0, -1.0, -1.0]),
	PackedFloat32Array([2.0, -333.0, 974.0, -382.0, 388.0, 34.0, 0.12, 1.0, -1.0, -1.0]),
	PackedFloat32Array([1.0, 0.0, 0.0, -390.0, 252.0, 40.0, 0.05, 1.0, -1.0, 2.0]),
	PackedFloat32Array([2.0, -1024.0, -1094.0, -1318.0, -36.0, 58.0, 0.12, 3.0, -1.0, -1.0]),
	PackedFloat32Array([0.0, 150.0, 330.0, 145.0, 386.0, 40.0, 0.0, 2.0, -1.0, -1.0]),
	PackedFloat32Array([2.0, -205.0, -1273.0, -214.0, -596.0, 56.0, 0.10, 3.0, -1.0, -1.0]),
	PackedFloat32Array([0.0, 0.0, 0.0, -542.0, 42.0, 36.0, 0.06, 0.0, -1.0, 4.0, 2.0]),
	PackedFloat32Array([0.0, 0.0, 0.0, -338.0, -110.0, 32.0, 0.05, 0.0, -1.0, 6.0, 2.0]),
	PackedFloat32Array([3.0, 1.0, -1104.0, -22.0, -725.0, 36.0, 0.08, 2.0, -1.0, -1.0]),
	PackedFloat32Array([2.0, 0.0, 0.0, -206.0, -691.0, 30.0, 0.04, 0.0, 6.0, 9.0]),
]
## how wide a river gets anywhere along it (m): wide on its long calm treads, narrow over its rapids, uneven between
@export var river_width_min := 25.0
@export var river_width_max := 60.0
## lakes at the cliffs' feet on the low ground: [u, v, radius along u, radius along v (m), turn (degrees), depth (m), how far
## the water lies below the floor round it (m)]; their outlines are warped (lake_warp: how far, in shares of the smaller radius)
@export var lakes: Array[PackedFloat32Array] = [
	PackedFloat32Array([132.0, 754.0, 130.0, 420.0, 0.0, 10.0, 1.2]),
	PackedFloat32Array([130.0, 162.0, 180.0, 270.0, 0.0, 9.0, 1.2]),
	PackedFloat32Array([-384.0, 76.0, 165.0, 225.0, 0.0, 9.0, 1.2]),
]
@export var lake_warp := 0.5
## a river bed's depth (m; deeper for the wider rivers) and how far the water lies below the banks' lowest point (m)
@export var river_depth := 2.5
@export var river_freeboard := 1.2
## a waterfall's width (m; from its river's width, several side by side share it)
@export var fall_width_min := 15.0
@export var fall_width_max := 60.0
## a waterfall's own plunge pool (when it does not land in a lake): its size across (m), growing with the drop between these
@export var plunge_pool_min := 60.0
@export var plunge_pool_max := 150.0
## a sinkhole's pool: its water above the hole's floor, and how much deeper its middle is (m)
@export var sinkhole_pool_level := 6.0
@export var sinkhole_pool_depth := 10.0
## mist in the deep (sunk) canyon: its clouds' lowest centres above the canyon's floor, and how much higher the highest ones
## (in its middle) float (m)
@export var mist_deck := PackedFloat32Array([18.0, 52.0])

@export_group("Bookmarks")
## the four camera views after the reference pictures (ref1 high on a plateau's edge looking along its cliff line, ref2 high
## over a plateau's edge down to the valley floor, ref3 on a canyon's rim looking down it, ref4 the aerial view): name -> [u,
## v, height above the ground, look-at u, v, its height above the ground, vertical field of view] in layout coordinates (u
## along the main valley, v across it, from the region's centre), framed by hand for this layout; an 8th number puts the
## camera at the visible rim nearest the spot (that far in from it), a 9th makes it look along the rim, turned that many
## degrees in (negative: out over the drop) - see tepui_region.gd _bookmarks
@export var bookmark_views := {
	"ref1": PackedFloat32Array([-1167.0, 503.0, 14.0, -280.0, -304.0, 225.0, 75.0]),
	"ref2": PackedFloat32Array([1635.0, -95.0, 380.0, 179.0, 699.0, 60.0, 75.0]),
	"ref3": PackedFloat32Array([-60.0, 1200.0, 40.0, -60.0, -500.0, -300.0, 75.0, 4.0, -22.0]),
	"ref4": PackedFloat32Array([-1700.0, 600.0, 700.0, -124.0, -631.0, 0.0, 75.0]),
}

@export_group("Look")
## greybox: flat colours only (terrain and walls), grass hidden - while the landforms are being judged; off: the region's look
## (phase 4A: limestone rock, lush grass, the sky with its clouds, the blue haze, the warm low sun)
@export var greybox := false
## the grass blades (phase 4B, later): off for now, whatever the game's grass setting
@export var vegetation := false
## the sun's shadows reach this far from the camera (m) with four cascades (the plateaus' own shadows across the valley); the
## game's default (90 m, two cascades) when 0
@export var shadow_reach := 0.0


## a key for the cache: changes whenever any setting (or the generator version) changes
func cache_key(version: int, base_key: String) -> String:
	var parts := [version, base_key]
	for p in get_property_list():
		if p.usage & PROPERTY_USAGE_SCRIPT_VARIABLE:
			parts.append(var_to_str(get(p.name)))
	return "%08x" % hash(str(parts))
