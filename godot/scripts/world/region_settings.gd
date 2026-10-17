extends Resource
## REGION SETTINGS (scripts/world/region_settings.gd): every number the tepui / plateau region uses (tepui_region.gd), in one
## place. Change a value and the next start rebuilds the region (its cache key is made from all of them). Lengths in metres,
## angles in degrees. The region sits on the base terrain: the base ground stays its floor (valleys and canyons), the
## plateaus are built on top of it with sheer walls, so its border blends into the island by itself.

@export var enabled := true
## the region's own seed (mixed with the island's): same seeds + settings = the same region
@export var seed_value := 1

@export_group("Place")
## the region's centre on the map (m); INF = chosen automatically: highlands / high plateaus all round, no sea or mountains
## in it, mountains in view beyond it
@export var center := Vector2(INF, INF)
## the region is a square this wide
@export var size := 4000.0
## no plateau comes nearer the region's edge than this: the region ends on the island's own ground; the line plateaus keep
## behind is a rounded square, wandering in and out by border_noise (m)
@export var border := 380.0
@export var border_noise := 260.0
## the layout's main direction (degrees, the main valley runs along it); INF = chosen from the sun so the long walls are lit
## from the side
@export var valley_angle := INF
## cell size of the region's layout grid (m)
@export var grid_cell := 8.0
## the region's floor: the island's ground pulled towards the region's middle height (0 = left as it is, 1 = dead flat) and
## back to the island's own ground at the region's edge; valley and canyon floors sink this much more (m)
@export var floor_flatten := 0.6
@export var floor_drop := 30.0

@export_group("Plateaus")
## the plateau levels: heights above the ground under each plateau (m)
@export var level_heights := PackedFloat32Array([150.0, 300.0, 450.0])
## how much of the region each level and up covers (shares of the region inside its border)
@export var level_shares := PackedFloat32Array([0.58, 0.36, 0.15])
## each plateau's own height offset, up to this much either way (m) - so walls range from about 100 to 300 m
@export var level_jitter := 22.0
## the layout: on one side of the main valley the ground climbs in terraces away from it (each level a band, the top one this
## far from the valley, m); the other side is one high block (its height in the field, 0 .. 1) cut by canyons into separate
## plateaus; noise_weight is how much the natural noise bends all that (0 none .. 1 noise only)
@export var terrace_depth := 1300.0
@export var block_height := 0.72
@export var noise_weight := 0.3
## the plateau outlines' noise: wavelength of their shapes (m), domain warp (m), octaves
@export var mesa_wavelength := 1250.0
@export var mesa_warp := 800.0
@export var mesa_octaves := 5
## plateau pieces smaller than this are dropped (km2)
@export var min_plateau_km2 := 0.15
## a ledge between two levels thinner than this is closed up: the walls above and below it become one wall (m)
@export var ledge_min := 45.0
## the highest level always keeps a ledge this wide round it (so no wall is taller than two levels)
@export var top_ledge := 60.0
## the plateau tops' gentle rolling hills: amplitude (m) and wavelength (m)
@export var top_hill_amp := 4.0
@export var top_hill_wavelength := 420.0

@export_group("Valley and canyons")
## the main valley: width range (m) and how far it swings sideways (m)
@export var valley_width_min := 650.0
@export var valley_width_max := 1050.0
@export var valley_meander := 180.0
## narrow canyons cutting through the plateaus: how many, width range (m), length (m), sideways swing (m)
@export var canyons := 3
@export var canyon_width_min := 110.0
@export var canyon_width_max := 300.0
@export var canyon_length := 2800.0
@export var canyon_meander := 140.0

@export_group("Walls")
## wall mesh spacing: columns along the edge and rows down the face (m)
@export var wall_column := 8.0
@export var wall_row := 10.0
## where a wall meets the ground: its top edge this far in on the plateau, its foot this far out (m) - both past the strip of
## terrain cut away (holes) under the wall
@export var wall_rim_inset := 11.0
@export var wall_foot_outset := 12.0
## an edge lower than this gets no wall (m)
@export var wall_min_height := 8.0
## under the walls: false = steep terrain shaped to stay just behind every wall's face (holds at every distance); true = the
## terrain cut away (Terrain3D holes: exact up close, but Terrain3D's coarser far rings cut wider gaps than the walls cover)
@export var cut_holes := false
## large-scale shape: slow curvature (amplitude m, wavelength m), buttresses (spacing m, width m, how far out m), vertical
## grooves (wavelength m, depth m), setbacks at rock layers (layer spacing m, step m)
@export var wall_curve_amp := 9.0
@export var wall_curve_wavelength := 320.0
@export var buttress_spacing := 130.0
@export var buttress_width := 42.0
@export var buttress_depth := 16.0
@export var groove_wavelength := 15.0
@export var groove_depth := 2.6
@export var setback_spacing := 55.0
@export var setback_depth := 5.0

@export_group("Walking routes")
## walking routes up each plateau (per plateau piece and level): rock spurs leaning on the wall, their grassy crest climbing at
## ramp_angle (degrees) to the top, ramp_width wide (m), with sheer sides
@export var ramps_per_plateau := 2
@export var ramp_angle := 25.0
@export var ramp_width := 52.0

@export_group("Bookmarks")
## the four camera views after the reference pictures (ref1 stacked terraces, ref2 over the plateaus across a valley, ref3
## down a canyon, ref4 the aerial view): name -> [x, z, height above the ground, look-at x, z, its height above the ground,
## vertical field of view] in map coordinates, framed by hand for this seed and layout; a view not listed here is found
## automatically (tepui_region.gd _bookmarks)
@export var bookmark_views := {
	"ref1": PackedFloat32Array([2475.0, -950.0, 45.0, 2530.0, -2200.0, 20.0, 66.0]),
	"ref2": PackedFloat32Array([4900.0, -700.0, 260.0, 3600.0, -1250.0, -40.0, 66.0]),
	"ref3": PackedFloat32Array([2930.0, -1320.0, 40.0, 3900.0, -1300.0, -40.0, 66.0]),
	"ref4": PackedFloat32Array([4150.0, -3450.0, 700.0, 4100.0, -2100.0, 0.0, 66.0]),
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
