// THE REGION'S STILL AND RUNNING WATER (shaders/region_water.gdshader): rivers, lakes and pools of the tepui region
// (scripts/world/tepui_water.gd builds the meshes). Everything it needs is in the vertices - no depth texture (no depth copy
// each frame): COLOR.r how white it runs (0 calm .. 0.5 rapids: from the surface's slope, so it comes in as the water tilts),
// COLOR.g the flow's speed (m/s), COLOR.b 1 on lakes and pools; UV the flow's direction; UV2.x the water's depth there, UV2.y
// the distance to a pillar's rock standing in it (its foam ring); on a river CUSTOM0 its own coordinates (metres along the
// course, metres across it); COLOR.a fades a lake out where its surface stops short of a drop.
// Clear turquoise in the shallows to teal in the deep, foam along the shores, long streaks of foam down the rapids along the
// flow, a ring round the pillars, small ripples moving with it. All of it smooth gradient noise in the flow's own coordinates
// (no grid, nothing that tiles), carried downstream in two phases cross-faded - a pattern simply pushed along would be
// sheared apart where the water runs faster. debug_tint: green flat water, yellow rapids (red is the waterfalls' own shader).
// Far off it is drawn a little nearer the camera than it is - moved along the line of sight, so it stays where it is on the
// screen: Terrain3D's coarse far rings, their vertices on a river's banks, would otherwise cover a river in dashes.
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, specular_schlick_ggx, shadows_disabled;

uniform vec3 shallow_col : source_color = vec3(0.30, 0.86, 0.80);
uniform vec3 deep_col : source_color = vec3(0.04, 0.36, 0.44);
uniform vec3 foam_col : source_color = vec3(0.95, 0.98, 0.97);
uniform int debug_tint = 0;
// the graphics preset: 0 low (one layer of ripples, the rapids' foam without its streaks), 1 / 2 the full water
uniform int water_quality = 2;
global uniform vec2 world_offset;

varying vec3 v_wp;
varying float v_kind;
varying float v_speed;
varying float v_lake;
varying vec2 v_flow;
varying float v_depth;
varying float v_ring;
varying float v_fade;
varying vec2 v_sc;

void vertex() {
	v_wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_kind = COLOR.r;
	v_speed = COLOR.g;
	v_lake = COLOR.b;
	v_flow = UV;
	v_depth = UV2.x;
	v_ring = UV2.y;
	v_fade = COLOR.a;
	v_sc = CUSTOM0.xy;
	// (as far toward the camera as covers a few metres of height error - up to 6 m, from 200 m out - at this viewing angle;
	// the meshes under the walls' node are only ever moved, so model space is world space turned by nothing)
	vec3 to_cam = CAMERA_POSITION_WORLD - v_wp;
	float d = max(length(to_cam), 1.0);
	float sin_a = clamp(abs(to_cam.y) / d, 0.04, 1.0);
	float dh = clamp((d - 200.0) * 0.002, 0.0, 6.0);
	VERTEX += to_cam / d * min(dh / sin_a, d * 0.08);
}

float hash2(vec2 p) {
	uvec2 q = uvec2(ivec2(floor(p)) + ivec2(1 << 20));
	q *= uvec2(1597334673u, 3812015801u);
	uint n = (q.x ^ q.y) * 1597334673u;
	return float(n >> 8u) * (1.0 / 16777216.0);
}

// smooth gradient noise (-1..1): no grid in it, unlike value noise (whose cells read as small squares on the water)
float gnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
	float a0 = hash2(i) * 6.2831853;
	float a1 = hash2(i + vec2(1.0, 0.0)) * 6.2831853;
	float a2 = hash2(i + vec2(0.0, 1.0)) * 6.2831853;
	float a3 = hash2(i + vec2(1.0, 1.0)) * 6.2831853;
	float a = dot(vec2(cos(a0), sin(a0)), f);
	float b = dot(vec2(cos(a1), sin(a1)), f - vec2(1.0, 0.0));
	float c = dot(vec2(cos(a2), sin(a2)), f - vec2(0.0, 1.0));
	float d = dot(vec2(cos(a3), sin(a3)), f - vec2(1.0, 1.0));
	return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.414;
}

// the water's small waves at a point in flow coordinates (x along, y across): rounder on calm water, drawn out along the flow
// over the rapids
float ripple(vec2 q, float sc, float stretch, bool fine) {
	vec2 r = vec2(q.y, q.x * stretch) * sc;
	float h = gnoise(r);
	if (fine) {
		h += 0.5 * gnoise(r * 2.7 + 13.0);
	}
	return h;
}

// streaks of foam down the flow (x along, y across), 0..1: long and thin, wandering a little across so none runs straight
float streaks(vec2 q, float seed, bool fine) {
	float c = q.y + gnoise(vec2(q.x * 0.035, q.y * 0.08) + seed) * 1.8;
	float n = gnoise(vec2(c * 0.7, q.x * 0.05) + seed * 3.1);
	if (fine) {
		n = n * 0.65 + gnoise(vec2(c * 1.6, q.x * 0.12) + seed * 1.7 + 5.0) * 0.35;
	}
	return n * 0.5 + 0.5;
}

void fragment() {
	vec2 mp = v_wp.xz + world_offset;
	vec2 fl = length(v_flow) > 0.01 ? normalize(v_flow) : vec2(1.0, 0.0);
	vec2 sd = vec2(-fl.y, fl.x);
	float spd = max(v_speed, 0.05);
	bool river = v_lake < 0.5;
	bool fine = water_quality >= 1;
	float rapid = smoothstep(0.0, 1.0, v_kind * 2.0);
	float depth = max(v_depth, 0.0);
	vec3 col = mix(shallow_col, deep_col, smoothstep(0.4, 7.0, depth));
	// (two phases of every pattern, each carried downstream a short way and cross-faded with the other)
	float t0 = fract(TIME / 2.5);
	float t1 = fract(TIME / 2.5 + 0.5);
	float wgt = abs(t0 * 2.0 - 1.0);
	// (on a river its own coordinates; on a lake the map's, drifting slowly)
	vec2 q0 = river ? v_sc - vec2(spd * 2.5 * t0, 0.0) : mp + vec2(TIME * 0.35, TIME * 0.2);
	vec2 q1 = river ? v_sc - vec2(spd * 2.5 * t1, 0.0) + vec2(23.7, 5.1) : q0;
	// ripples, as a normal (on a river worked out along and across the flow, then turned onto the map)
	float sc = mix(0.12, 0.22, rapid);
	float stretch = mix(1.0, 0.45, rapid);
	float e = 0.6;
	float h0 = ripple(q0, sc, stretch, fine);
	float ha = ripple(q0 + vec2(e, 0.0), sc, stretch, fine);
	float hc = ripple(q0 + vec2(0.0, e), sc, stretch, fine);
	if (river) {
		float g0 = ripple(q1, sc, stretch, fine);
		h0 = mix(h0, g0, wgt);
		ha = mix(ha, ripple(q1 + vec2(e, 0.0), sc, stretch, fine), wgt);
		hc = mix(hc, ripple(q1 + vec2(0.0, e), sc, stretch, fine), wgt);
	}
	float amp = mix(0.3, 0.9, rapid);
	vec2 da = vec2((ha - h0) / e, (hc - h0) / e) * amp;
	vec2 gw = river ? fl * da.x + sd * da.y : da;
	vec3 nw = normalize(vec3(-gw.x, 1.0, -gw.y));
	// foam: along the shores (shallow), streaming down the rapids along the flow, a ring round a pillar's rock
	float brk = gnoise(mp * 0.3 + vec2(TIME * 0.4, -TIME * 0.3)) * 0.5 + 0.5;
	float shore = (1.0 - smoothstep(0.1, 0.8, depth)) * smoothstep(0.25, 0.6, brk + 0.25);
	float rap = 0.0;
	if (rapid > 0.01 && river) {
		float s0 = streaks(q0, 0.0, fine);
		float s1 = streaks(q1, 4.3, fine);
		// (the cross-fade halves the contrast midway: stretched back)
		float st = 0.5 + (mix(s0, s1, wgt) - 0.5) * inversesqrt(wgt * wgt + (1.0 - wgt) * (1.0 - wgt));
		rap = rapid * (0.28 + 0.72 * smoothstep(0.4, 0.72, st));
	}
	float ring = (1.0 - smoothstep(0.5, 5.0, v_ring)) * smoothstep(0.2, 0.55, brk + 0.2 * (1.0 - smoothstep(0.0, 2.0, v_ring)));
	float foam = clamp(max(shore, max(rap, ring)), 0.0, 1.0);
	col = mix(col, foam_col, foam);
	ALBEDO = col;
	ROUGHNESS = mix(0.05, 0.55, foam);
	SPECULAR = 0.55;
	NORMAL = normalize(mix((VIEW_MATRIX * vec4(nw, 0.0)).xyz, NORMAL, foam * 0.6));
	ALPHA = clamp(mix(0.55, 0.94, smoothstep(0.0, 3.0, depth)) + foam * 0.7, 0.0, 1.0) * v_fade;
	if (debug_tint == 1) {
		ALBEDO = rapid > 0.5 ? vec3(0.95, 0.85, 0.10) : (v_lake > 0.5 ? vec3(0.10, 0.62, 0.22) : vec3(0.15, 0.85, 0.20));
		ALPHA = v_fade;
		ROUGHNESS = 0.9;
	}
}
