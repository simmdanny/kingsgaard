// THE REGION'S GRASS COLOUR (shaders/region_ground.gdshaderinc): one lush, saturated grass for the plateaus' tops and the
// valley floors, shared by the terrain (terrain3d.gdshader) and the rock's grassed tops and lips (region_wall.gdshader), so the
// carpet runs on over a cliff's lip without a seam. Large soft patches - yellower sunlit meadows, deeper green hollows - over
// some 400 m, smaller ones over 130 m and 30 m, a fine mottle; painted in map coordinates (local + world_offset), so it stays
// put when the floating origin shifts.

uniform vec3 lawn_sun : source_color = vec3(0.55, 0.70, 0.16);
uniform vec3 lawn_mid : source_color = vec3(0.30, 0.54, 0.12);
uniform vec3 lawn_deep : source_color = vec3(0.14, 0.33, 0.09);

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

// the grass at a map point; `fine` 0..1 fades the smallest mottle out far away (no shimmer)
vec3 region_lawn(vec2 wp, float fine) {
	float n0 = rg_noise(wp * 0.0024);
	float n1 = rg_noise(wp * 0.0078 + 13.1);
	float n2 = rg_noise(wp * 0.033 + 7.7);
	float n3 = rg_noise(wp * 0.14 + 3.3);
	// (stretched: the noise sits mostly near its middle)
	float v = clamp((n0 * 0.35 + n1 * 0.35 + n2 * 0.3 - 0.5) * 2.0 + 0.5, 0.0, 1.0);
	vec3 c = mix(lawn_deep, lawn_mid, smoothstep(0.18, 0.5, v));
	c = mix(c, lawn_sun, smoothstep(0.55, 0.85, v));
	return c * (1.0 + (n3 - 0.5) * 0.18 * fine);
}
