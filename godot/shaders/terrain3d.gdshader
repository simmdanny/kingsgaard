// THE TERRAIN'S LOOK (shaders/terrain3d.gdshader): Terrain3D's minimum shader (addons/terrain_3d/extras/shaders) - its vertex
// stage, region lookups and smooth normals unchanged - with the game's own colouring instead of textures:
//  - the clean base terrain (biomes off, the default): one grass everywhere - the game's grass colour (the same uniform the grass
//    blades use), broken up a little by soft world-space noise, and shaded subtly by slope: the steeper the ground, the deeper
//    and warmer its green; darker under the water.
//  - the old continent's look (biomes on, kept for terrain_gen.gd): grass, meadows and forest floor on gentle ground, warm
//    painted stone on steep ground (the boulders' feel), dirt between, sand on the coast tier, snow high on the peaks.
//  - debug views (debug_view): 1 height (blue sea, green lowlands, yellow highlands, brown plateaus, grey-white mountains, a thin
//    contour every 50 m and a stronger one every 250 m), 2 tiers (one colour each, the slopes between them shaded, valleys in
//    blue), 3 slope (green walkable, red too steep, dark red over 40 degrees), 4 the steep-edge mask (red; data for cliffs later).
// The colour map is read raw (no source_color). Base terrain: r = (tier + 1) / 5 (0 = sea), g = valley, b = steep-edge mask,
// a = escarpment. Old continent: r = tier / 4, g = river, b = pass, a = land.
// Ground noise is painted in map coordinates (local + world_offset), so it stays put when the floating origin shifts.
// Base: Copyright © 2023-2026 Cory Petkovsek, Roope Palmroos, and Contributors (MIT).

shader_type spatial;
render_mode blend_mix,depth_draw_opaque,cull_back,diffuse_burley,specular_schlick_ggx,skip_vertex_transform;

// Defined Constants
#define SKIP_PASS 0
#define VERTEX_PASS 1
#define FRAGMENT_PASS 2

#if CURRENT_RENDERER == RENDERER_COMPATIBILITY
    #define fma(a, b, c) ((a) * (b) + (c))
    #define dFdxCoarse(a) dFdx(a)
    #define dFdyCoarse(a) dFdy(a)
#endif

// Private uniforms
// Commented uniforms aren't needed for this shader, but are available for your own needs.
uniform vec3 _camera_pos = vec3(0.f);
uniform float _mesh_size = 48.f;
uniform uint _background_mode = 1u; // NONE = 0, FLAT = 1, NOISE = 2
uniform uint _mouse_layer = 0x80000000u; // Layer 32
uniform float _vertex_spacing = 1.0;
uniform float _vertex_density = 1.0; // = 1/_vertex_spacing
uniform float _region_size = 1024.0;
uniform float _region_texel_size = 0.0009765625; // = 1/1024
uniform int _region_map_size = 32;
uniform int _region_map[1024];
//uniform vec2 _region_locations[1024];
//uniform float _texture_uv_scale_array[32];
//uniform float _texture_detile_array[32];
//uniform vec4 _texture_color_array[32];
uniform highp sampler2DArray _height_maps : repeat_disable;
uniform highp sampler2DArray _control_maps : repeat_disable;
uniform highp sampler2DArray _color_maps : repeat_disable;
//uniform highp sampler2DArray _texture_array_albedo : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
//uniform highp sampler2DArray _texture_array_normal : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;

// Public Uniforms
uniform bool flat_terrain_normals = false;
uniform int debug_view = 0;
uniform vec3 grass_col : source_color = vec3(0.37, 0.55, 0.21);
uniform vec3 meadow_col : source_color = vec3(0.52, 0.62, 0.25);
uniform vec3 forest_col : source_color = vec3(0.23, 0.34, 0.15);
uniform vec3 stone_light : source_color = vec3(0.70, 0.60, 0.47);
uniform vec3 stone_dark : source_color = vec3(0.44, 0.35, 0.26);
uniform vec3 dirt_col : source_color = vec3(0.47, 0.38, 0.25);
uniform vec3 sand_col : source_color = vec3(0.86, 0.79, 0.58);
uniform vec3 snow_col : source_color = vec3(0.94, 0.95, 0.97);
uniform float walk_angle = 35.0;
uniform float cliff_angle = 50.0;
uniform float snow_line = 470.0;
// the old continent's stone, dirt, sand and snow (and its colour map's layout); off for the clean base terrain
uniform bool biomes = true;
// where the local origin is on the map (scripts/world/floating_origin.gd)
global uniform vec2 world_offset;

// Varyings & Types
// Some are required for editor functions
varying float v_vertex_xz_dist;
varying vec3 v_vertex;

////////////////////////
// Vertex
////////////////////////

// Takes in world space XZ (UV) coordinates & search depth (only applicable for background mode none)
// Returns ivec3 with:
// XY: (0 to _region_size - 1) coordinates within a region
// Z: layer index used for texturearrays, -1 if not in a region
ivec3 get_index_coord(const vec2 uv, const int search) {
	vec2 r_uv = round(uv);
	vec2 o_uv = mod(r_uv,_region_size);
	ivec2 pos;
	int bounds, layer_index = -1;
	for (int i = -1; i < clamp(search, SKIP_PASS, FRAGMENT_PASS); i++) {
		if ((layer_index == -1 && _background_mode == 0u ) || i < 0) {
			r_uv -= i == -1 ? vec2(0.0) : vec2(float(o_uv.x <= o_uv.y), float(o_uv.y <= o_uv.x));
			pos = ivec2(floor((r_uv) * _region_texel_size)) + (_region_map_size / 2);
			bounds = int(uint(pos.x | pos.y) < uint(_region_map_size));
			layer_index = (_region_map[ pos.y * _region_map_size + pos.x ] * bounds - 1);
		}
	}
	return ivec3(ivec2(mod(r_uv,_region_size)), layer_index);
}

void vertex() {
	// Get vertex of flat plane in world coordinates and set world UV
	v_vertex = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;

	// Camera distance to vertex on flat plane
	v_vertex_xz_dist = length(v_vertex.xz - _camera_pos.xz);

	// Geomorph vertex, set end and start for linear height interpolate
	float scale = MODEL_MATRIX[0][0];
	float vertex_lerp = smoothstep(0.55, 0.95, (v_vertex_xz_dist / scale - _mesh_size - 4.0) / (_mesh_size - 2.0));
	vec2 v_fract = fract(VERTEX.xz * 0.5) * 2.0;
	// For LOD0 morph from a regular grid to an alternating grid to align with LOD1+
	vec2 shift = (scale < _vertex_spacing + 1e-6) ? // LOD0 or not
		// Shift from regular to symetric
		mix(v_fract, vec2(v_fract.x, -v_fract.y),
			round(fract(round(mod(v_vertex.z * _vertex_density, 4.0)) *
			round(mod(v_vertex.x * _vertex_density, 4.0)) * 0.25))
			) :
		// Symetric shift
		v_fract * round((fract(v_vertex.xz * 0.25 / scale) - 0.5) * 4.0);
	vec2 start_pos = v_vertex.xz * _vertex_density;
	vec2 end_pos = (v_vertex.xz - shift * scale) * _vertex_density;
	v_vertex.xz -= shift * scale * vertex_lerp;

	// UV coordinates in world space. Values are 0 to _region_size within regions
	UV = v_vertex.xz * _vertex_density;

	// UV coordinates in region space + texel offset. Values are 0 to 1 within regions
	UV2 = fma(UV, vec2(_region_texel_size), vec2(0.5 * _region_texel_size));

	// Discard vertices for Holes. 1 lookup
	ivec3 v_region = get_index_coord(start_pos, VERTEX_PASS);
	uint control = floatBitsToUint(texelFetch(_control_maps, v_region, 0)).r;
	bool hole = bool(control >>2u & 0x1u);

	// Show holes to all cameras except mouse camera (on exactly 1 layer)
	if ( !(CAMERA_VISIBLE_LAYERS == _mouse_layer) &&
			(hole || (_background_mode == 0u && v_region.z < 0))) {
		v_vertex.x = 0. / 0.;
	} else {
		// Interpolate Geomorph Start & End, set height. 2 Lookups.
		ivec3 uv_a = get_index_coord(start_pos, VERTEX_PASS);
		ivec3 uv_b = get_index_coord(end_pos, VERTEX_PASS);
		float h = mix(texelFetch(_height_maps, uv_a, 0).r, texelFetch(_height_maps, uv_b, 0).r, vertex_lerp);
		v_vertex.y = h;
	}

	// Convert model space to view space w/ skip_vertex_transform render mode
	VERTEX = (VIEW_MATRIX * vec4(v_vertex, 1.0)).xyz;
	NORMAL = normalize((MODELVIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);
	BINORMAL = normalize((MODELVIEW_MATRIX * vec4(BINORMAL, 0.0)).xyz);
	TANGENT = normalize((MODELVIEW_MATRIX * vec4(TANGENT, 0.0)).xyz);
}


// an integer hash: exact at any distance from the origin (a fract-of-a-product hash runs out of float precision kilometres out)
float hash2(vec2 p) {
	uvec2 q = uvec2(ivec2(floor(p)) + ivec2(1 << 20));
	q *= uvec2(1597334673u, 3812015801u);
	uint n = (q.x ^ q.y) * 1597334673u;
	return float(n >> 8u) * (1.0 / 16777216.0);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}

vec3 height_ramp(float h) {
	if (h < 0.0) return mix(vec3(0.05, 0.16, 0.42), vec3(0.20, 0.48, 0.78), clamp(1.0 + h / 30.0, 0.0, 1.0));
	vec3 c = mix(vec3(0.20, 0.48, 0.78), vec3(0.30, 0.62, 0.30), smoothstep(0.0, 10.0, h));
	c = mix(c, vec3(0.55, 0.75, 0.30), smoothstep(10.0, 80.0, h));
	c = mix(c, vec3(0.88, 0.82, 0.30), smoothstep(80.0, 150.0, h));
	c = mix(c, vec3(0.80, 0.52, 0.22), smoothstep(150.0, 350.0, h));
	c = mix(c, vec3(0.62, 0.40, 0.22), smoothstep(350.0, 450.0, h));
	c = mix(c, vec3(0.50, 0.36, 0.30), smoothstep(450.0, 700.0, h));
	c = mix(c, vec3(0.62, 0.58, 0.58), smoothstep(700.0, 900.0, h));
	c = mix(c, vec3(1.0), smoothstep(900.0, 1500.0, h));
	return c;
}

// a contour line of a height every `step` metres: 0 on the line, 1 away from it (a pixel or so wide at any distance)
float contour(float h, float step) {
	return smoothstep(0.6, 1.6, abs(fract(h / step + 0.5) - 0.5) * step / max(fwidth(h), 0.001));
}

vec3 tier_colour(float t) {
	if (t < 0.5) return vec3(0.90, 0.80, 0.45);
	if (t < 1.5) return vec3(0.35, 0.68, 0.28);
	if (t < 2.5) return vec3(0.86, 0.62, 0.22);
	if (t < 3.5) return vec3(0.58, 0.36, 0.62);
	return vec3(0.95, 0.95, 0.97);
}

////////////////////////
// Fragment
////////////////////////

void fragment() {
	// Recover UVs
	vec2 uv = UV;
	//vec2 uv2 = UV2;

	// Lookup offsets, ID and blend weight
	const vec3 offsets = vec3(0, 1, 2);
	vec2 index_id = floor(uv);
	vec2 weight = fract(uv);
	vec2 invert = 1.0 - weight;
	vec4 weights = vec4(
		invert.x * weight.y, // 0
		weight.x * weight.y, // 1
		weight.x * invert.y, // 2
		invert.x * invert.y  // 3
	);

	vec3 base_ddx = dFdxCoarse(v_vertex);
	vec3 base_ddy = dFdyCoarse(v_vertex);
	//vec4 base_derivatives = vec4(base_ddx.xz, base_ddy.xz);
	// Calculate the effective mipmap for regionspace, and if less than 0,
	// skip all extra lookups required for bilinear blend.
	float region_mip = log2(max(length(base_ddx.xz), length(base_ddy.xz)) * _vertex_density);
	bool bilerp = region_mip < 0.0;

	ivec3 index[4];
	// control map lookups, used for some normal lookups as well
	index[0] = get_index_coord(index_id + offsets.xy, FRAGMENT_PASS);
	index[1] = get_index_coord(index_id + offsets.yy, FRAGMENT_PASS);
	index[2] = get_index_coord(index_id + offsets.yx, FRAGMENT_PASS);
	index[3] = get_index_coord(index_id + offsets.xx, FRAGMENT_PASS);

	// Terrain normals
	vec3 index_normal[4];
	float h[4];
	// allows additional derivatives, eg world noise, brush previews etc
	float u = 0.0;
	float v = 0.0;

	// Re-use index[] for the first lookups, skipping some math. 3 lookups
	h[3] = texelFetch(_height_maps, index[3], 0).r; // 0 (0,0)
	h[2] = texelFetch(_height_maps, index[2], 0).r; // 1 (1,0)
	h[0] = texelFetch(_height_maps, index[0], 0).r; // 2 (0,1)
	index_normal[3] = normalize(vec3(h[3] - h[2] + u, _vertex_spacing, h[3] - h[0] + v));

	// Set flat world normal - overriden if bilerp is true
	vec3 w_normal = index_normal[3];

	// Branching smooth normals must be done seperatley for correct normals at all 4 index ids
	if (bilerp) {
		// 5 lookups
		// Fetch the additional required height values for smooth normals
		h[1] = texelFetch(_height_maps, index[1], 0).r; // 3 (1,1)
		float h_4 = texelFetch(_height_maps, get_index_coord(index_id + offsets.yz, FRAGMENT_PASS), 0).r; // 4 (1,2)
		float h_5 = texelFetch(_height_maps, get_index_coord(index_id + offsets.zy, FRAGMENT_PASS), 0).r; // 5 (2,1)
		float h_6 = texelFetch(_height_maps, get_index_coord(index_id + offsets.zx, FRAGMENT_PASS), 0).r; // 6 (2,0)
		float h_7 = texelFetch(_height_maps, get_index_coord(index_id + offsets.xz, FRAGMENT_PASS), 0).r; // 7 (0,2)

		// Calculate the normal for the remaining index ids.
		index_normal[0] = normalize(vec3(h[0] - h[1] + u, _vertex_spacing, h[0] - h_7 + v));
		index_normal[1] = normalize(vec3(h[1] - h_5 + u, _vertex_spacing, h[1] - h_4 + v));
		index_normal[2] = normalize(vec3(h[2] - h_6 + u, _vertex_spacing, h[2] - h[1] + v));

		// Set interpolated world normal
		w_normal =
			index_normal[0] * weights[0] +
			index_normal[1] * weights[1] +
			index_normal[2] * weights[2] +
			index_normal[3] * weights[3] ;
	}

	// Apply terrain normals
	vec3 w_tangent = normalize(cross(w_normal, vec3(0.0, 0.0, 1.0)));
	vec3 w_binormal = normalize(cross(w_normal, w_tangent));
	NORMAL = mat3(VIEW_MATRIX) * w_normal;
	TANGENT = mat3(VIEW_MATRIX) * w_tangent;
	BINORMAL = mat3(VIEW_MATRIX) * w_binormal;

	if (flat_terrain_normals) {
		NORMAL = normalize(cross(dFdyCoarse(VERTEX),dFdxCoarse(VERTEX)));
		TANGENT = normalize(cross(NORMAL, VIEW_MATRIX[2].xyz));
		BINORMAL = normalize(cross(NORMAL, TANGENT));
	}

	// The colour map (bilinear over the four samples round the pixel)
	vec4 cm = texelFetch(_color_maps, index[3], 0) * weights[3] + texelFetch(_color_maps, index[2], 0) * weights[2]
		+ texelFetch(_color_maps, index[0], 0) * weights[0] + texelFetch(_color_maps, index[1], 0) * weights[1];
	float tier = biomes ? cm.r * 4.0 : cm.r * 5.0 - 1.0;
	bool land = biomes ? cm.a >= 0.5 : cm.r >= 0.1;
	float slope = degrees(acos(clamp(w_normal.y, 0.0, 1.0)));
	float wh = v_vertex.y;
	vec2 wp = v_vertex.xz + world_offset;

	vec3 col;
	if (debug_view > 0) {
		// the maps read the height of the heightmap itself under the pixel (not the coarser mesh far away)
		float h1 = bilerp ? h[1] : texelFetch(_height_maps, index[1], 0).r;
		wh = h[3] * weights[3] + h[2] * weights[2] + h[0] * weights[0] + h1 * weights[1];
	}
	if (debug_view == 1) {
		col = height_ramp(wh) * mix(0.72, 1.0, contour(wh, 50.0)) * mix(0.45, 1.0, contour(wh, 250.0));
	} else if (debug_view == 2) {
		col = land ? tier_colour(round(tier)) : vec3(0.12, 0.30, 0.60);
		if (biomes) {
			col = mix(col, vec3(0.10, 0.90, 0.95), smoothstep(0.25, 0.5, cm.b) * 0.75);
		} else if (land) {
			// the slopes between tiers, shaded
			col = mix(col, col * 0.62, smoothstep(0.25, 0.75, cm.a));
		}
		col = mix(col, vec3(0.10, 0.28, 0.90), smoothstep(0.25, 0.55, cm.g) * (land ? 0.8 : 0.0));
	} else if (debug_view == 3) {
		col = slope <= walk_angle ? vec3(0.20, 0.72, 0.28) : (slope <= (biomes ? cliff_angle : 40.0) ? vec3(0.92, 0.24, 0.16) : vec3(0.45, 0.04, 0.04));
		if (!land && wh < 0.0) col = vec3(0.12, 0.30, 0.60);
	} else if (debug_view == 4) {
		col = land ? mix(vec3(0.80, 0.82, 0.78) * (0.75 + 0.25 * w_normal.y), vec3(0.88, 0.10, 0.10), biomes ? 0.0 : cm.b) : vec3(0.12, 0.30, 0.60);
	} else if (!biomes) {
		// the clean base terrain: one grass, a little uneven, and shaded by slope (the steeper, the deeper and warmer its green)
		float n1 = vnoise(wp * 0.035);
		float n3 = vnoise(wp * 0.004);
		col = grass_col * (0.90 + 0.14 * n1 + 0.08 * n3);
		col = mix(col, col * vec3(0.84, 0.86, 0.66), smoothstep(10.0, 38.0, slope) * 0.6);
		col = mix(col, col * vec3(0.55, 0.62, 0.58), 1.0 - smoothstep(-3.0, 0.3, wh));
	} else {
		float n1 = vnoise(wp * 0.035);
		float n2 = vnoise(wp * 0.21);
		float n3 = vnoise(wp * 0.004);
		// gentle ground: grass, meadows high on the plateaus, a darker forest floor patch by patch
		vec3 grass = grass_col * (0.86 + 0.22 * n1 + 0.1 * n3);
		grass = mix(grass, meadow_col * (0.92 + 0.14 * n2), smoothstep(0.55, 0.75, n3 + 0.15 * step(2.5, tier)) * 0.7);
		grass = mix(grass, forest_col * (0.9 + 0.2 * n1), smoothstep(0.62, 0.8, vnoise(wp * 0.0019 + 7.0)) * 0.6);
		grass = mix(grass, grass_col * vec3(0.78, 0.92, 0.8), smoothstep(0.1, 0.6, cm.g));
		// steep ground: warm stone in soft tone steps (by height bands and a slow noise), warmer in the folds, never black
		float band = floor(wh * 0.18 + n1 * 2.0 + vnoise(wp * 0.02) * 1.5);
		float tone = hash2(vec2(band, floor(n3 * 3.0))) * 0.75 + n2 * 0.25;
		vec3 stone = mix(stone_dark, stone_light, smoothstep(0.15, 0.85, tone));
		stone = mix(stone, stone * vec3(1.06, 0.95, 0.84), (1.0 - w_normal.y) * 0.4);
		float rock = smoothstep(29.0, 40.0, slope + (n2 - 0.5) * 6.0);
		float dirt = smoothstep(24.0, 31.0, slope + (n1 - 0.5) * 5.0) * (1.0 - rock);
		col = mix(grass, dirt_col * (0.9 + 0.2 * n2), dirt * 0.8);
		col = mix(col, stone, rock);
		// sand on the coast tier at the water, snow high on the gentler peak ground
		float sand = (1.0 - smoothstep(2.2, 4.6, wh + (n2 - 0.5) * 1.2)) * step(tier, 0.6) * (1.0 - rock);
		col = mix(col, sand_col * (0.95 + 0.1 * n2), sand);
		col = mix(col, sand_col * 0.72, (1.0 - smoothstep(-0.5, 0.8, wh)) * step(tier, 0.6));
		float snow = smoothstep(snow_line - 30.0, snow_line + 40.0, wh + n1 * 40.0) * (1.0 - smoothstep(32.0, 44.0, slope));
		col = mix(col, snow_col, snow);
	}

	if (debug_view > 0) {
		// the maps show their own colours (lit only a little, for relief); written as sRGB, so into linear first
		vec3 lin = pow(col, vec3(2.2));
		ALBEDO = lin * 0.25;
		EMISSION = lin * 0.8;
	} else {
		ALBEDO = col;
		// stone keeps its warmth in the shade (a little of its own colour, as the boulders do): never cold grey
		EMISSION = biomes ? pow(col, vec3(2.2)) * 0.10 * smoothstep(29.0, 40.0, slope) : vec3(0.0);
	}
	ROUGHNESS = 0.92;
	SPECULAR = 0.2;
}
