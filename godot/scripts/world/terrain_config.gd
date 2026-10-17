extends Resource
## TERRAIN SETTINGS (scripts/world/terrain_config.gd): every number the terrain generator uses, in one place. Change a value and
## the next start regenerates the world (the cache key is made from all of them). Heights in metres, lengths in metres.

## the seed: same seed + same settings = the same world, every time, on every computer
@export var seed_value := 1

@export_group("Map")
## heightmap samples per side (a multiple of the region size); 4096 at 2.5 m = a 10.24 km square map
@export var resolution := 4096
## metres between heightmap samples (Terrain3D vertex spacing)
@export var vertex_spacing := 2.5
## samples per Terrain3D region side (64 .. 2048)
@export var region_size := 1024
## cells per side of the planning grid (tiers, edges, hills, rivers, the walk check); 1024 over 10.24 km = 10 m cells
@export var coarse_resolution := 1024
## the continent: its radius as a share of the half map, how much the coast wanders (share of the half map)
@export var island_radius := 0.86
@export var coast_warp := 0.30
@export var coast_noise := 0.17

@export_group("Tiers")
## the five tiers: coast, lowlands, highlands, plateaus, peaks - each a height range [low, high]
@export var tier_names := PackedStringArray(["coast", "lowlands", "highlands", "plateaus", "peaks"])
@export var tier_low := PackedFloat32Array([0.0, 5.0, 60.0, 180.0, 350.0])
@export var tier_high := PackedFloat32Array([5.0, 40.0, 150.0, 300.0, 600.0])
## how much of the land each tier covers (shares of the land, summing to 1): the tier field's cut levels are found from these
@export var tier_share := PackedFloat32Array([0.07, 0.33, 0.30, 0.20, 0.10])
## the tier field: wavelength of its broad shapes (m), how strongly it is domain-warped (m) so shapes look natural, octaves
@export var tier_wavelength := 3000.0
@export var tier_warp := 1500.0
@export var tier_octaves := 4
## how much the tier field rises inland (0 none .. 1 all), and over what distance from the shore (m)
@export var inland_bias := 0.30
@export var inland_reach := 2600.0
## each tier's own broad height variation inside its range: wavelength (m)
@export var tier_surface_wavelength := 2200.0

@export_group("Tier edges")
## cliff faces: how steep (degrees) - most of every edge
@export var cliff_angle := 70.0
## walkable ramps / passes: their slope (degrees) - kept well under the walkable limit
@export var ramp_angle := 22.0
## passes per edge: one per this much edge length (m), at least min_passes per region
@export var pass_spacing := 2200.0
@export var min_passes := 2
@export var max_passes := 6
## extra passes placed per region beyond the minimum, so the minimum still holds if one comes out too steep
@export var spare_passes := 1
## a pass's width along the edge (m)
@export var pass_width := 110.0

@export_group("Hills")
## medium rolling hills inside every tier: wavelength (m) and amplitude per tier (m)
@export var hill_wavelength := 520.0
@export var hill_amp := PackedFloat32Array([0.6, 4.5, 12.0, 9.0, 18.0])
## ridges in the peaks: ridged noise wavelength (m) and how sharp the crests are
@export var ridge_wavelength := 1300.0
@export var ridge_sharpness := 1.6

@export_group("Detail")
## small bumps and dips: wavelength (m) and amplitude per tier (m)
@export var detail_wavelength := 22.0
@export var detail_amp := PackedFloat32Array([0.15, 0.35, 0.5, 0.45, 0.8])

@export_group("Water")
## river channels from the high tiers down to the sea: how many sources, channel depth (m) and half-width (m), valley width (m)
@export var rivers := 9
@export var channel_depth := 5.0
@export var channel_halfwidth := 16.0
@export var valley_halfwidth := 110.0
@export var valley_depth := 7.0
## river meanders: sideways swing (m) and its wavelength along the course (m)
@export var meander_amp := 45.0
@export var meander_wavelength := 320.0

@export_group("Walking")
## the steepest slope a hero can walk (degrees); steeper than cliff_threshold is where cliffs will spawn
@export var max_walk_angle := 35.0
@export var cliff_threshold := 50.0


## a key for the cache: changes whenever any setting (or the generator version) changes
func cache_key(version: int) -> String:
	var parts := [version]
	for p in get_property_list():
		if p.usage & PROPERTY_USAGE_SCRIPT_VARIABLE:
			parts.append(var_to_str(get(p.name)))
	return "%08x" % hash(str(parts))
