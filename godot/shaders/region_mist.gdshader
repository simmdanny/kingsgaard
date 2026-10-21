// THE REGION'S MIST (shaders/region_mist.gdshader): soft, slowly drifting cloud layers lying in the deep canyons, and the
// spray billowing at the waterfalls' feet (scripts/world/tepui_water.gd).
//   spray = false: a canyon's mist sheet - COLOR.r its thickness (thinning toward the cliffs), COLOR.g its layer, UV the map
//                  point; soft cloud shapes from slow noise, not grainy.
//   spray = true:  billboards - every corner of a quad at its centre, UV the corner (-1..1), COLOR.r its phase, COLOR.g its
//                  size / 100 m, COLOR.b how far it rises / 100 m; each grows, rises and fades over its cycle.
shader_type spatial;
render_mode blend_mix, unshaded, depth_draw_never, cull_disabled, shadows_disabled, skip_vertex_transform;

uniform bool spray = false;
uniform vec3 mist_col : source_color = vec3(0.90, 0.94, 0.98);
uniform vec3 shade_col : source_color = vec3(0.74, 0.81, 0.90);
uniform float density = 0.62;

varying float v_a;
varying vec2 v_uv;
varying float v_dist;
varying float v_layer;

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
	if (spray) {
		float cyc = fract(TIME * 0.045 + COLOR.r);
		vec3 c = VERTEX + vec3(0.0, cyc * COLOR.b * 100.0, 0.0);
		vec4 vc = MODELVIEW_MATRIX * vec4(c, 1.0);
		vc.xy += UV * COLOR.g * 100.0 * (0.55 + 0.6 * cyc);
		VERTEX = vc.xyz;
		v_a = sin(cyc * 3.1416) * 0.62;
		v_uv = UV + vec2(COLOR.r * 17.0, 0.0);
	} else {
		VERTEX = (MODELVIEW_MATRIX * vec4(VERTEX, 1.0)).xyz;
		v_a = COLOR.r;
		// (the stacked sheets share one cloud pattern, each a little shifted)
		v_uv = UV + vec2(COLOR.g * 23.0, COLOR.g * 17.0);
		v_layer = COLOR.g;
	}
	v_dist = length(VERTEX);
	NORMAL = vec3(0.0, 0.0, 1.0);
}

void fragment() {
	float a;
	float n;
	if (spray) {
		// (a soft round puff, its edge broken by noise that turns slowly; v_uv.x carries the puff's own offset)
		n = vnoise(UV * 1.6 + vec2(v_uv.x, -TIME * 0.25)) * 0.6 + vnoise(UV * 3.7 + vec2(v_uv.x * 1.3, 4.0)) * 0.4;
		a = v_a * (1.0 - smoothstep(0.2, 1.0, length(UV))) * (0.55 + 0.45 * n);
	} else {
		vec2 p = v_uv * 0.0035 + vec2(TIME * 0.0042, TIME * 0.0026);
		n = vnoise(p) * 0.6 + vnoise(p * 2.3 + 5.0) * 0.3 + vnoise(p * 5.1 + 9.0) * 0.1;
		// (each of the stacked thin sheets a little offset, so together they read as a soft deck, thicker seen edge-on)
		float edge_on = 1.0 - abs(dot(normalize(-VERTEX), (VIEW_MATRIX * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
		// (the deck's middle sheets fuller than its top and bottom ones)
		float core = abs(v_layer - 1.5) * 0.06;
		a = smoothstep(0.20 + core, 0.58 + core, n) * v_a * density * (0.6 + 0.9 * edge_on);
		// (fading out right in front of the camera, so a flight through it never fills the screen)
		a *= smoothstep(25.0, 140.0, v_dist);
	}
	ALBEDO = mix(shade_col, mist_col, smoothstep(0.2, 0.8, n));
	ALPHA = clamp(a, 0.0, 1.0);
}
