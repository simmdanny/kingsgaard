extends Resource
## BASE TERRAIN SETTINGS (scripts/world/base_terrain_config.gd): every number the clean base terrain uses (base_terrain_gen.gd) -
## one island of vast smooth hills and big raised areas, no cliffs, no rock, no biomes. Change a value and the next start
## regenerates the world (the cache key is made from all of them). Heights and lengths in metres, angles in degrees.

## the seed: same seed + same settings = the same world, every time, on every computer
@export var seed_value := 1

@export_group("Map")
## heightmap samples per side (a multiple of the region size): 8192 at 4 m = a 32.8 km square map, the island inside it
@export var resolution := 8192
## metres between heightmap samples (Terrain3D vertex spacing)
@export var vertex_spacing := 4.0
## samples per Terrain3D region side (64 .. 2048): 1024 at 4 m = 4.096 km regions, also the floating origin's step
@export var region_size := 1024
## cells per side of the planning grid (the heights are composed here, then upsampled): 2048 = 16 m cells
@export var plan_resolution := 2048
## the island's extent (it fits a square this wide), how square its outline is (2 round .. 4 boxy), how much the coast
## wanders: a slow warp (m) and finer bays and headlands (m)
@export var island_size := 30000.0
@export var shape_power := 2.6
@export var coast_warp := 1700.0
@export var coast_noise := 800.0
## the sea floor: it falls to shelf_depth over shelf_width from the shore
@export var shelf_width := 1400.0
@export var shelf_depth := 45.0

@export_group("Tiers")
## the five tiers and their height ranges [low, high]
@export var tier_names := PackedStringArray(["coast", "lowlands", "highlands", "high plateaus", "mountains"])
@export var tier_low := PackedFloat32Array([0.0, 10.0, 150.0, 450.0, 900.0])
@export var tier_high := PackedFloat32Array([10.0, 80.0, 350.0, 700.0, 1500.0])
## the coast tier is a band along the whole shore, this wide (m, varying slowly between the two)
@export var coast_band_min := 450.0
@export var coast_band_max := 1500.0
## how the land inside the coast band is shared by the other four tiers (sums to 1): the tier field's cut levels come from these
@export var tier_share := PackedFloat32Array([0.38, 0.30, 0.18, 0.14])
## the tier field: wavelength of its shapes (m), domain warp (m), octaves - regions come out several km wide with natural outlines
@export var tier_wavelength := 9000.0
@export var tier_warp := 3200.0
@export var tier_octaves := 3
## how much the tier field rises inland (0 none .. 1 all) and over what distance from the coast band (m)
@export var inland_bias := 0.26
@export var inland_reach := 5000.0
## the smallest region a tier may have (km2) - smaller pieces are folded into the tier around them
@export var min_region_km2 := PackedFloat32Array([0.0, 1.0, 2.0, 2.0, 3.0])
## every tier stays at least this far (m) from the tier two steps below it, so each tier rings the next one up with room for
## two slopes
@export var tier_ring := PackedFloat32Array([0.0, 700.0, 450.0, 550.0, 650.0])
## each tier's own broad rise and fall inside its range: wavelength (m), and which part of the range its ground spans (shares of
## the range, low and high end - the rest is room for the hills; the mountains' ground stays low, their peaks rise from it)
@export var surface_wavelength := 5200.0
@export var surface_lo := PackedFloat32Array([0.04, 0.07, 0.18, 0.09, 0.10])
@export var surface_hi := PackedFloat32Array([0.88, 0.78, 0.75, 0.75, 0.32])

@export_group("Hills")
## large rolling hills inside every tier: amplitude per tier (m) and their wavelength (m) - gentle in the lowlands, bigger higher up
@export var hill_amp := PackedFloat32Array([1.0, 8.0, 32.0, 18.0, 28.0])
@export var hill_wavelength := 1300.0
@export var swell_wavelength := 3400.0
## mountain ridges and peaks (mountains only): height above the mountain base (m), wavelength (m), crest sharpness, and how far
## in from the top of the mountain edge (m) they reach full height; the highest peaks are eased under the mountains' top
@export var ridge_amp := 540.0
@export var ridge_wavelength := 3400.0
@export var ridge_sharpness := 1.5
@export var ridge_inset := 800.0

@export_group("Backdrop ranges")
## big mountain ranges in a ring round the tepui region, seen behind its plateaus: the region's centre (map m), from .. to this
## far (m), the ground they rise from (m) and how far above it their crests reach (m), their wavelength (m), and the directions
## (degrees, map angle) they always fill - the ones the region's bookmarks look in; 0 height: none
@export var backdrop_center := Vector2(4000.0, -1496.0)
@export var backdrop_reach := Vector2(5200.0, 11000.0)
@export var backdrop_base := 420.0
@export var backdrop_height := 1350.0
@export var backdrop_wavelength := 4200.0
@export var backdrop_views := PackedFloat32Array([225.0, 56.0])

@export_group("Tier edges")
## the slopes between tiers: escarpment angles vary along each edge between these (degrees) - mostly steeper than a hero can
## climb, gentler in stretches; none is ever a wall (slope_limit caps them all)
@export var edge_angle_min := 30.0
@export var edge_angle_max := 39.5
## how quickly the steepness changes along an edge (m)
@export var edge_angle_wavelength := 2600.0
## the coast band's step up to the lowlands (degrees)
@export var coast_angle := 5.0
## walking routes over each edge: gentle ramps (degrees), one per route_spacing of edge, at least min_routes per edge (+ spares),
## each this wide along the edge (m)
@export var route_angle := 21.0
@export var route_spacing := 5000.0
@export var min_routes := 2
@export var max_routes := 6
@export var spare_routes := 1
@export var route_width := 520.0

@export_group("Valleys")
## broad valleys from the high tiers down to the sea (for rivers later): how many, how far apart their heads start (m)
@export var valleys := 10
@export var valley_spacing := 3600.0
## the valley floor's depth below the land around it, per tier (m); its half-width per tier (m) - wider where it cuts deep, up
## to valley_halfwidth_max (narrower in the mountains); the steepest its floor may climb, per tier (degrees: gentle low down,
## steeper in the mountains)
@export var valley_depth := PackedFloat32Array([2.0, 12.0, 34.0, 40.0, 55.0])
@export var valley_halfwidth := PackedFloat32Array([700.0, 700.0, 650.0, 560.0, 380.0])
@export var valley_halfwidth_max := PackedFloat32Array([850.0, 850.0, 850.0, 780.0, 520.0])
@export var valley_floor_angle := PackedFloat32Array([1.5, 3.0, 7.0, 10.0, 16.0])
## their slow bends: sideways swing (m) and wavelength (m)
@export var valley_meander := 140.0
@export var valley_meander_wavelength := 2200.0

@export_group("Slopes")
## the steepest slope a hero can walk (degrees); routes are checked against walk_check_angle (a margin under it)
@export var max_walk_angle := 35.0
@export var walk_check_angle := 33.0
## the hard limit on the planning grid (degrees): nothing anywhere is steeper (with the grid's directions, about 39 at most)
@export var slope_limit := 37.5
## the steep-edge mask (where cliffs may go later): escarpment ground from this angle up (degrees)
@export var steep_mask_angle := 32.0


## a key for the cache: changes whenever any setting (or the generator version) changes
func cache_key(version: int) -> String:
	var parts := [version]
	for p in get_property_list():
		if p.usage & PROPERTY_USAGE_SCRIPT_VARIABLE:
			parts.append(var_to_str(get(p.name)))
	return "%08x" % hash(str(parts))
