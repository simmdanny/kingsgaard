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
@export var center := Vector2(INF, INF)
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
## a stacked terrace's setback inside the level below: between these two along its edge (in the outline's own units - its
## warp shrinks them in places), and never less than terrace_min_depth (m, measured)
@export var terrace_min := 160.0
@export var terrace_max := 290.0
@export var terrace_min_depth := 105.0
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
	PackedFloat32Array([1.0, -1000.0, -460.0, -1000.0, -145.0, 40.0, 1.0, 2.0, 0.778, 80.0, 0.30]),
	PackedFloat32Array([1.0, 650.0, 560.0, 650.0, 200.0, 28.0, 1.0, 1.0, 0.728, 115.0, 0.30]),
	PackedFloat32Array([1.0, 880.0, -60.0, 600.0, -60.0, 24.0, 1.0, 1.0, 0.571, 130.0, 0.32]),
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
	PackedFloat32Array([-848.0, 666.0, 3.0, 160.0, 24.0, 22.0, 6.0]),
	PackedFloat32Array([168.0, 818.0, 1.0, 260.0, 18.0, 18.0, 6.0]),
	PackedFloat32Array([1085.0, 438.0, 1.0, 200.0, 14.0, 16.0, 5.0]),
]

@export_group("Pillars")
## freestanding rock columns like elephants' legs: thick and flared at the foot, lumpy, narrowing to a flat grassy top. Each:
## [u, v, height (m; negative: up to that level's height), radius at the base and at the top (m)]
@export var pillars: Array[PackedFloat32Array] = [
	PackedFloat32Array([130.0, 574.0, -1.0, 40.0, 28.0]),
	PackedFloat32Array([-400.0, -16.0, 190.0, 46.0, 31.0]),
	PackedFloat32Array([738.0, -617.0, 140.0, 38.0, 27.0]),
	PackedFloat32Array([118.0, 31.0, 230.0, 50.0, 34.0]),
]

@export_group("Sinkholes")
## round holes carved down from the plateaus' tops, sheer inside, flat at the bottom. Each: [u, v, diameter (m), depth (m)]
@export var sinkholes: Array[PackedFloat32Array] = [
	PackedFloat32Array([983.0, 1132.0, 110.0, 100.0]),
	PackedFloat32Array([-750.0, -508.0, 80.0, 140.0]),
	PackedFloat32Array([1425.0, -1118.0, 50.0, 90.0]),
]

@export_group("Bookmarks")
## the four camera views after the reference pictures (ref1 high on a plateau's edge looking along its cliff line, ref2 high
## over a plateau's edge down to the valley floor, ref3 on a canyon's rim looking down it, ref4 the aerial view): name -> [u,
## v, height above the ground, look-at u, v, its height above the ground, vertical field of view] in layout coordinates (u
## along the main valley, v across it, from the region's centre), framed by hand for this layout; an 8th number puts the
## camera at the visible rim nearest the spot (that far in from it), a 9th makes it look along the rim, turned that many
## degrees in (negative: out over the drop) - see tepui_region.gd _bookmarks
@export var bookmark_views := {
	"ref1": PackedFloat32Array([-955.0, 689.0, 14.0, 10.0, -25.0, 310.0, 75.0]),
	"ref2": PackedFloat32Array([1635.0, -95.0, 380.0, 179.0, 699.0, 60.0, 75.0]),
	"ref3": PackedFloat32Array([-60.0, 1200.0, 40.0, -60.0, -500.0, -300.0, 75.0, 4.0, -22.0]),
	"ref4": PackedFloat32Array([-1700.0, 600.0, 700.0, -124.0, -631.0, 0.0, 75.0]),
}

@export_group("Look")
## greybox: flat colours only (terrain and walls), grass hidden - while the landforms are being judged
@export var greybox := true


## a key for the cache: changes whenever any setting (or the generator version) changes
func cache_key(version: int, base_key: String) -> String:
	var parts := [version, base_key]
	for p in get_property_list():
		if p.usage & PROPERTY_USAGE_SCRIPT_VARIABLE:
			parts.append(var_to_str(get(p.name)))
	return "%08x" % hash(str(parts))
