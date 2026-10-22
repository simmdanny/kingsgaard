// THE REGION'S WATERFALLS (shaders/region_waterfall.gdshader): a fall's curved sheet (scripts/world/tepui_water.gd). UV.x
// across the sheet 0..1, UV.y down it 0..1, UV2.x metres fallen, UV2.y the whole drop, COLOR.g the sheet's width there / 100 m.
// Glossy and clear at the lip, then streaks racing down (as many as its width holds), whitening as it falls until it is all
// white foam near the bottom; a wide sheet breaks into curtains lower down; its edges soft and torn.
// debug_tint: red.
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, specular_schlick_ggx, shadows_disabled;

uniform vec3 water_col : source_color = vec3(0.62, 0.88, 0.90);
uniform vec3 glossy_col : source_color = vec3(0.16, 0.52, 0.56);
uniform vec3 foam_col : source_color = vec3(0.96, 0.98, 0.98);
uniform int debug_tint = 0;

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

void fragment() {
	float u = UV.x;
	float v = UV.y;
	float fallen = UV2.x;
	// (across in metres: a streak every few metres whatever the sheet's width)
	float um = u * max(COLOR.g * 100.0, 4.0);
	// (streaks: stretched down the sheet, racing down faster the further it has fallen)
	float sp = 6.0 + sqrt(fallen) * 1.6;
	float s1 = vnoise(vec2(um * 0.42, fallen * 0.045 - TIME * sp * 0.045));
	float s2 = vnoise(vec2(um * 1.2 + 7.0, fallen * 0.11 - TIME * sp * 0.11));
	float streak = s1 * 0.6 + s2 * 0.4;
	// (white by a fifth of the way down - a tall fall is all foam soon after its lip - with darker water showing between the
	// streaks higher up)
	float white = smoothstep(0.0, 0.22, v);
	float lip = 1.0 - smoothstep(0.0, 0.045, v);
	float sk = smoothstep(0.35, 0.75, streak);
	vec3 col = mix(water_col, foam_col, clamp(0.35 + white * 0.55 + sk * 0.5, 0.0, 1.0));
	col *= 0.9 + 0.1 * s2;
	col = mix(col, glossy_col, lip * 0.8);
	ALBEDO = col;
	ROUGHNESS = mix(0.7, 0.05, lip);
	SPECULAR = mix(0.2, 0.85, lip);
	float ew = clamp(7.0 / max(COLOR.g * 100.0, 4.0), 0.06, 0.2);
	float edge = smoothstep(0.0, ew + 0.1 * s2, u) * smoothstep(1.0, 1.0 - ew - 0.1 * s1, u);
	// (a wide sheet parts into curtains on its way down: slow gaps across it, opening below a third of the drop)
	float cur = vnoise(vec2(um * 0.07 + COLOR.r * 31.0, fallen * 0.012 - TIME * 0.35));
	edge *= 1.0 - smoothstep(0.3, 0.8, v) * smoothstep(0.62, 0.8, cur) * 0.55;
	ALPHA = clamp(edge * (0.82 + 0.18 * sk + 0.15 * white), 0.0, 1.0);
	if (debug_tint == 1) {
		ALBEDO = vec3(0.92, 0.12, 0.10);
		ALPHA = edge;
	}
}
