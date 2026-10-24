// THE WATERFALLS' SPRAY (shaders/region_mist.gdshaderinc, the body of region_mist.gdshader / region_mist_fast.gdshader): billboards at the falls' feet (scripts/world/tepui_water.gd); every
// corner of a quad at its centre, UV the corner (-1..1).
//   mode 1: billowing mist - COLOR.r its phase, COLOR.g its size / 100 m, COLOR.b how far it rises / 100 m, COLOR.a its pace,
//           UV2 how far it drifts (m, x / z): each puff grows, rolls outward and up, and fades over its cycle; soft all the
//           way out (no rim to read as a ball), lumpy inside, lit from above, greyer underneath, and soft where it meets the
//           water or the rock (the depth texture, which the sea reads anyway).
//   mode 2: fine drops - COLOR.r its phase, COLOR.g its size / 10 m, COLOR.b its upward speed / 50 m/s, COLOR.a its pace, UV2
//           its horizontal speed (m/s): each flies out of the impact in an arc and falls back, fading.
//   mode 3: the deep canyon's clouds - COLOR.r its phase, COLOR.g its size / 100 m, COLOR.b its opacity, COLOR.a its pace, UV2
//           how far it sways (m, x / z): big soft puffs like the spray's, swaying slowly to and fro along the canyon and
//           breathing a little, soft where they meet the rock, the ground or the water.
uniform int mode = 1;
// (the graphics preset: how big the spray's clouds are, and how many of the drops fly)
uniform float size_scale = 0.62;
uniform float drop_share = 1.0;
uniform vec3 mist_col : source_color = vec3(0.94, 0.96, 0.99);
uniform vec3 shade_col : source_color = vec3(0.70, 0.78, 0.86);
uniform int debug_tint = 0;
#ifdef SOFT_DEPTH
uniform sampler2D depth_tex : hint_depth_texture, filter_nearest;
#endif

varying float v_a;
varying vec2 v_uv;
varying float v_ph;
varying float v_dist;

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
	if (mode == 1) {
		float cyc = fract(TIME * 0.05 * COLOR.a + COLOR.r);
		vec3 c = VERTEX + vec3(UV2.x, 0.0, UV2.y) * cyc + vec3(0.0, cyc * COLOR.b * 100.0, 0.0);
		vec4 vc = MODELVIEW_MATRIX * vec4(c, 1.0);
		vc.xy += UV * COLOR.g * 100.0 * size_scale * (0.55 + 0.75 * cyc);
		VERTEX = vc.xyz;
		v_a = smoothstep(0.0, 0.18, cyc) * (1.0 - smoothstep(0.55, 1.0, cyc));
	} else if (mode == 2) {
		float g = 7.5;
		float vv = COLOR.b * 50.0;
		float life = 2.0 * vv / g;
		float cyc = fract(TIME * COLOR.a / life + COLOR.r);
		float t = cyc * life;
		vec3 c = VERTEX + vec3(UV2.x, 0.0, UV2.y) * t + vec3(0.0, vv * t - 0.5 * g * t * t, 0.0);
		vec4 vc = MODELVIEW_MATRIX * vec4(c, 1.0);
		vc.xy += UV * COLOR.g * 10.0 * (0.6 + 0.8 * cyc);
		VERTEX = vc.xyz;
		// (only a share of the drops on the lower presets: the rest put behind the camera, never drawn)
		if (COLOR.r > drop_share) {
			VERTEX = vec3(0.0, 0.0, 1.0);
		}
		v_a = smoothstep(0.0, 0.06, cyc) * (1.0 - cyc) * 0.85 * step(COLOR.r, drop_share);
	} else if (mode == 3) {
		float sw = sin(TIME * 0.025 * COLOR.a + COLOR.r * 6.2832);
		vec3 c = VERTEX + vec3(UV2.x, 0.0, UV2.y) * sw + vec3(0.0, sin(TIME * 0.03 * COLOR.a + COLOR.r * 11.0) * 3.0, 0.0);
		vec4 vc = MODELVIEW_MATRIX * vec4(c, 1.0);
		vc.xy += UV * COLOR.g * 100.0 * (0.92 + 0.08 * cos(TIME * 0.05 + COLOR.r * 9.0));
		VERTEX = vc.xyz;
		v_a = COLOR.b;
	}
	v_uv = UV;
	v_ph = COLOR.r;
	v_dist = length(VERTEX);
	NORMAL = vec3(0.0, 0.0, 1.0);
}

void fragment() {
	float r = length(v_uv);
	float a;
	vec3 col;
	if (mode == 1 || mode == 3) {
		// (the canyon's clouds churn more slowly than the spray)
		float sl = mode == 3 ? 0.2 : 1.0;
		vec2 q = v_uv * 1.5 + vec2(v_ph * 17.0, v_ph * 9.0);
		float n1 = vnoise(q + vec2(0.0, -TIME * 0.12 * sl));
		float n2 = vnoise(q * 2.3 + vec2(TIME * 0.07 * sl, 3.0));
		float n3 = vnoise(q * 5.1 + 7.0);
		float lump = n1 * 0.55 + n2 * 0.3 + n3 * 0.15;
		float edge = 1.0 - smoothstep(0.1, 0.98, r + (lump - 0.5) * 0.5);
		a = v_a * edge * edge * (0.4 + 0.6 * lump) * (mode == 3 ? 1.0 : 0.8);
		col = mix(shade_col, mist_col, smoothstep(-0.9, 0.6, v_uv.y + (lump - 0.5) * 0.9));
		// (not filling the screen when the camera is right in it: the spray clears well before the camera reaches it)
		a *= mode == 3 ? smoothstep(15.0, 80.0, v_dist) : smoothstep(12.0, 70.0, v_dist);
#ifdef SOFT_DEPTH
		float depth = textureLod(depth_tex, SCREEN_UV, 0.0).r;
		vec4 vp = INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, depth, 1.0);
		a *= smoothstep(0.0, mode == 3 ? 22.0 : 14.0, -vp.z / vp.w + VERTEX.z);
#endif
	} else {
		a = v_a * (1.0 - smoothstep(0.15, 1.0, r));
		// (the drops fade out near the camera: no streaks across the lens)
		a *= smoothstep(8.0, 45.0, v_dist);
		col = mist_col;
	}
	ALBEDO = col;
	ALPHA = clamp(a, 0.0, 1.0);
	if (debug_tint == 1) {
		ALPHA = 0.0;
	}
}
