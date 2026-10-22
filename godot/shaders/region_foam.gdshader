// THE WATERFALLS' FOAM (shaders/region_foam.gdshader): the white water spreading over a pool or lake round a fall's foot
// (scripts/world/tepui_water.gd builds the disc). UV: across the fall, out from the wall, the disc's rim at length 1; COLOR.r
// the fall's own seed, COLOR.g its reach out / 100 m, COLOR.b the fall's width at its foot / 100 m. Solid churning white at the
// foot, breaking up outward into lacy patches and rings that drift away from it and thin out toward the rim.
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, diffuse_lambert_wrap, specular_disabled, shadows_disabled;

uniform vec3 foam_col : source_color = vec3(0.96, 0.98, 0.98);
uniform vec3 shade_col : source_color = vec3(0.72, 0.87, 0.89);
uniform int debug_tint = 0;
global uniform vec2 world_offset;

varying vec3 v_wp;
varying vec2 v_uv;
varying float v_seed;

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

void vertex() {
	v_wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_uv = UV;
	v_seed = COLOR.r;
	// (the same pull toward the camera far off as the water's own surface - see region_water.gdshader - and a hair more, so it
	// stays on top of the water it lies on)
	vec3 to_cam = CAMERA_POSITION_WORLD - v_wp;
	float d = max(length(to_cam), 1.0);
	float sin_a = clamp(abs(to_cam.y) / d, 0.04, 1.0);
	float dh = clamp((d - 200.0) * 0.002, 0.0, 6.0) + 0.05;
	VERTEX += to_cam / d * min(dh / sin_a, d * 0.08);
}

void fragment() {
	float rr = length(v_uv);
	vec2 dir = rr > 0.001 ? v_uv / rr : vec2(1.0, 0.0);
	vec2 mp = v_wp.xz + world_offset;
	// (patterns carried outward from the foot: two phases of the pattern, each pushed out a short way and cross-faded with the
	// other - pushed on forever it would be smeared into streaks along the rays)
	vec2 s0 = vec2(v_seed * 37.0, v_seed * 11.0);
	float t0 = fract(TIME * 0.12);
	float t1 = fract(TIME * 0.12 + 0.5);
	float wgt = abs(t0 * 2.0 - 1.0);
	float n1 = mix(vnoise(v_uv * 4.0 - dir * t0 * 1.6 + s0), vnoise(v_uv * 4.0 - dir * t1 * 1.6 + s0 + 9.1), wgt);
	float n2 = mix(vnoise(v_uv * 9.0 - dir * t0 * 2.6 + s0 * 1.7 + 5.0), vnoise(v_uv * 9.0 - dir * t1 * 2.6 + s0 * 1.7 + 2.3), wgt);
	float fine = vnoise(mp * 0.45 + vec2(TIME * 0.3, -TIME * 0.2));
	// (rings riding out on it)
	float rings = smoothstep(0.55, 1.0, sin(rr * 19.0 - TIME * 1.3 + n1 * 4.0));
	float dense = 1.0 - smoothstep(0.12, 0.42, rr + (n1 - 0.5) * 0.18);
	float lace = smoothstep(0.42, 0.72, n1 * 0.55 + n2 * 0.35 + fine * 0.25 + rings * 0.25 - rr * 0.3);
	float a = max(dense * (0.8 + 0.2 * fine), lace * (1.0 - smoothstep(0.5, 0.98, rr)));
	a *= 1.0 - smoothstep(0.82, 1.0, rr);
	ALBEDO = mix(shade_col, foam_col, clamp(0.55 + 0.45 * fine + dense * 0.3, 0.0, 1.0));
	ROUGHNESS = 0.9;
	ALPHA = clamp(a * 0.95, 0.0, 1.0);
	if (debug_tint == 1) {
		ALPHA = 0.0;
	}
}
