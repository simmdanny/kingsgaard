// THE REGION'S GRASS COLOUR (shaders/region_ground.gdshaderinc): one lush, saturated grass for the plateaus' tops and the
// valley floors, shared by the terrain (terrain3d.gdshader) and the rock's grassed tops and lips (region_wall.gdshader), so the
// carpet runs on over a cliff's lip without a seam. One green, tinted only softly and over large distances - slightly
// yellower on the plateaus' tops and on slopes turned to the sun, slightly deeper green on the valley floors, on slopes turned
// away and near water, and a slow drift over some 1.6 km - within about +-6% of its brightness, from smooth inputs only
// (height, the ground's normal, a blurred map of the water, gradient noise), so nothing has a shape or an edge; a faint grain
// near the camera. Painted in map coordinates (local + world_offset), so it stays put when the floating origin shifts.

uniform vec3 lawn_sun : source_color = vec3(0.55, 0.70, 0.16);
uniform vec3 lawn_mid : source_color = vec3(0.35, 0.59, 0.13);
// the region's floor (m): the valleys at it, the plateaus' tops 150 - 430 m above
uniform float lawn_floor = 408.0;
// toward the sun (world)
uniform vec3 lawn_light = vec3(0.45, 0.52, 0.72);
// near water (0..1) over a square of the map (terrain_world.gd _wet_map): its corner and size (m)
uniform sampler2D lawn_wet : filter_linear, repeat_disable;
uniform vec2 lawn_wet_origin = vec2(0.0);
uniform float lawn_wet_size = 1.0;
uniform bool lawn_wet_on = false;

float rg_hash(vec2 p) {
	uvec2 q = uvec2(ivec2(floor(p)) + ivec2(1 << 20));
	q *= uvec2(1597334673u, 3812015801u);
	uint n = (q.x ^ q.y) * 1597334673u;
	return float(n >> 8u) * (1.0 / 16777216.0);
}

float rg_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(rg_hash(i), rg_hash(i + vec2(1.0, 0.0)), u.x), mix(rg_hash(i + vec2(0.0, 1.0)), rg_hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// smooth gradient noise (-1..1): no grid in it, unlike the value noise above (its corners read as squares from above)
vec2 rg_grad(vec2 i) {
	float a = rg_hash(i) * 6.2831853;
	return vec2(cos(a), sin(a));
}

float rg_gnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
	float a = dot(rg_grad(i), f);
	float b = dot(rg_grad(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
	float c = dot(rg_grad(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
	float d = dot(rg_grad(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
	return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.414;
}

// the grass at a map point (height h, ground normal n, world): one green, tinted softly - toward a sunnier yellow (about +5%
// brighter) or a deeper green (about -6%) and no further; `fine` 0..1 lets a faint grain in near the camera
vec3 region_lawn(vec2 wp, float h, vec3 n, float fine) {
	vec3 c = mix(lawn_mid, lawn_sun, 0.3);
	float top = smoothstep(lawn_floor + 30.0, lawn_floor + 300.0, h);
	vec3 L = normalize(lawn_light);
	float face = clamp((dot(n, L) - L.y) * 2.5, -1.0, 1.0);
	float wet = 0.0;
	if (lawn_wet_on) {
		vec2 uv = (wp - lawn_wet_origin) / lawn_wet_size;
		if (uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0) {
			wet = texture(lawn_wet, uv).r;
		}
	}
	float drift = rg_gnoise(wp / 1600.0 + 11.3) * 0.6 + rg_gnoise(wp / 600.0 - 4.7) * 0.4;
	float k = clamp(top * 0.75 - 0.3 + face * 0.5 - wet * 0.9 + drift * 0.35, -1.0, 1.0);
	c *= mix(vec3(1.0), k > 0.0 ? vec3(1.16, 1.035, 0.82) : vec3(0.84, 0.962, 0.98), abs(k));
	if (fine > 0.0) {
		c *= 1.0 + rg_gnoise(wp / 3.5) * 0.025 * fine;
	}
	return c;
}
