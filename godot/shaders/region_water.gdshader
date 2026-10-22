// THE REGION'S STILL AND RUNNING WATER (shaders/region_water.gdshader): rivers, lakes and pools of the tepui region
// (scripts/world/tepui_water.gd builds the meshes). Everything it needs is in the vertices - no depth texture (no depth copy
// each frame): COLOR.r the kind (0 flat, 0.5 rapids), COLOR.g the flow's speed (m/s), COLOR.b 1 on lakes and pools; UV the
// flow's direction; UV2.x the water's depth there, UV2.y the distance to a pillar's rock standing in it (its foam ring);
// COLOR.a fades a lake out where its surface stops short of a drop.
// Clear turquoise in the shallows to teal in the deep, foam along the shores, streaming over the rapids and round the pillars,
// small ripples moving with the flow. debug_tint: green flat water, yellow rapids (red is the waterfalls' own shader).
// Far off it is drawn a little nearer the camera than it is - moved along the line of sight, so it stays where it is on the
// screen: Terrain3D's coarse far rings, their vertices on a river's banks, would otherwise cover a river in dashes.
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, specular_schlick_ggx, shadows_disabled;

uniform vec3 shallow_col : source_color = vec3(0.30, 0.86, 0.80);
uniform vec3 deep_col : source_color = vec3(0.04, 0.36, 0.44);
uniform vec3 foam_col : source_color = vec3(0.95, 0.98, 0.97);
uniform int debug_tint = 0;
global uniform vec2 world_offset;

varying vec3 v_wp;
varying float v_kind;
varying float v_speed;
varying float v_lake;
varying vec2 v_flow;
varying float v_depth;
varying float v_ring;
varying float v_fade;

void vertex() {
	v_wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_kind = COLOR.r;
	v_speed = COLOR.g;
	v_lake = COLOR.b;
	v_flow = UV;
	v_depth = UV2.x;
	v_ring = UV2.y;
	v_fade = COLOR.a;
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

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}

void fragment() {
	vec2 mp = v_wp.xz + world_offset;
	vec2 fl = length(v_flow) > 0.01 ? normalize(v_flow) : vec2(1.0, 0.0);
	vec2 sd = vec2(-fl.y, fl.x);
	float spd = max(v_speed, 0.05);
	// (coordinates along and across the flow, the along one moving downstream)
	vec2 q = vec2(dot(mp, fl) - TIME * spd, dot(mp, sd));
	float rapid = smoothstep(0.2, 0.4, v_kind);
	float depth = max(v_depth, 0.0);
	vec3 col = mix(shallow_col, deep_col, smoothstep(0.4, 7.0, depth));
	// ripples: two layers of noise drifting with the flow (on the lakes a slow drift), as a normal
	float sc = mix(0.12, 0.22, rapid);
	vec2 rq = mix(q, mp + vec2(TIME * 0.35, TIME * 0.2), v_lake);
	float e = 0.6;
	float h0 = vnoise(rq * sc) + 0.5 * vnoise(rq * sc * 2.7 + 13.0);
	float hx = vnoise((rq + vec2(e, 0.0)) * sc) + 0.5 * vnoise((rq + vec2(e, 0.0)) * sc * 2.7 + 13.0);
	float hz = vnoise((rq + vec2(0.0, e)) * sc) + 0.5 * vnoise((rq + vec2(0.0, e)) * sc * 2.7 + 13.0);
	float amp = mix(0.35, 1.1, rapid);
	vec3 nw = normalize(vec3(-(hx - h0) / e * amp, 1.0, -(hz - h0) / e * amp));
	// foam: along the shores (shallow), streaming over the rapids, a ring round a pillar's rock
	float brk = vnoise(mp * 0.35 + vec2(TIME * 0.4, -TIME * 0.3));
	float shore = (1.0 - smoothstep(0.1, 0.8, depth)) * smoothstep(0.25, 0.6, brk + 0.25);
	float streak = smoothstep(0.52, 0.78, vnoise(vec2(q.x * 0.09, q.y * 0.6)) * 0.7 + vnoise(vec2(q.x * 0.3, q.y * 1.4)) * 0.45);
	float rap = rapid * (0.35 + 0.65 * streak);
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
