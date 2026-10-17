// THE STONE (shaders/stone.gdshader): every boulder, in both art presets - the browser game's one stone material (src/world/wrlook.js
// boulderMat, tools/mockups/river/src/06-stone-material.js) ported as it was, with the field boulders' settings (moss on two in five,
// up_k .30): the warm tan palette in four soft tone steps, lighter facing up and on the bevels' upper edges, cooler underneath, darker
// low down (the shape's baked occlusion), a seam across some stones, faint cracks and chips close up, moss of the meadow's own colours
// on some tops, the foot fading into a darker earth tone where it goes into the ground, and the shade side lifted a little (the
// browser game's fill light). Per vertex (art/stones/stones.res, tools/stones/make_stones.py): COLOR = (edge, occ, rel), UV.x = seam.
// Per instance (scripts/world/boulders.gd): INSTANCE_CUSTOM = (brightness, the ground's height there, seed, -).
shader_type spatial;
render_mode cull_back;

#include "res://shaders/inc/meadow.gdshaderinc"
#include "res://shaders/inc/stone.gdshaderinc"

uniform float moss = 0.7;
uniform float moss_p = 0.4;
uniform float moss_top = 0.0;
uniform float up_k = 0.30;
uniform float shade_lift = 0.32;
uniform vec3 sun_dir = vec3(0.4, 0.6, 0.3);  // toward the sun, world space (main.gd sets it from the preset's sun)

varying vec3 v_wp;
varying vec3 v_wn;
varying float v_edge;
varying float v_occ;
varying float v_seam;
varying float v_sc;
varying vec4 v_inst;

void vertex() {
	v_wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_wn = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
	v_edge = COLOR.r;
	v_occ = COLOR.g;
	v_seam = UV.x;
	v_sc = length(MODEL_MATRIX[0].xyz);
	v_inst = INSTANCE_CUSTOM;
}

void fragment() {
	vec3 P = v_wp;
	vec3 N = normalize(v_wn);
	vec2 X = P.xz;
	float cd = length(P - CAMERA_POSITION_WORLD);
	float fd = 1.0 - smoothstep(25.0, 70.0, cd);
	float seed = v_inst.z;
	float up = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
	float t = 0.54 + up_k * (up - 0.5) + 0.10 * (fbm(P * 0.45 + seed * 9.0) - 0.5) + 0.04 * (vn(P * 3.0) - 0.5) * fd
		+ 0.12 * v_edge * smoothstep(-0.1, 0.6, N.y) - 0.30 * v_occ;
	float sd = abs(v_seam), on = step(sd, 5.0);
	float sw = 0.045, sa = fwidth(sd) * 0.8 + 0.002;
	float seam = (1.0 - smoothstep(sw - sa, sw + sa, sd)) * on;
	float seam_soft = (1.0 - smoothstep(0.045, 0.2, sd)) * on;
	float crev = max(seam, 0.45 * seam_soft);
	t -= 0.15 * crev;
	float ck = vedge(vec3(P.x * 0.8, P.y * 0.5, P.z * 0.8) + seed * 9.0);
	float cka = fwidth(ck) * 0.8 + 0.003;
	float crack_fade = 1.0 - smoothstep(10.0, 28.0, cd);
	float crack = (1.0 - smoothstep(0.008 - cka, 0.008 + cka, ck)) * smoothstep(0.5, 0.62, fbm(P * 0.6 + seed * 4.0)) * step(0.67, fract(seed * 3.71)) * crack_fade;
	t -= 0.12 * crack;
	vec3 ch = cell2(P.xz * 2.2 + P.y * 1.7);
	float chip = step(0.93, ch.x) * (1.0 - smoothstep(0.08, 0.16, ch.y)) * fd;
	t += 0.04 * chip * (ch.z < 0.5 ? -1.0 : 1.0) * crack_fade;
	t = stone_steps(t);
	vec3 col = ramp4(t, stone_r0, stone_r1, stone_r2, stone_r3);
	col *= mix(stone_cool, stone_warm, fract(seed * 5.31));
	col *= 0.93 + 0.14 * v_inst.x;
	col = mix(col, col * stone_cool * 0.9, clamp((1.0 - up) * 0.35, 0.0, 1.0));
	col *= 1.0 - 0.07 * smoothstep(0.58, 0.74, fbm(P * 1.1 + 7.0));
	float sp = vn(P * 12.0);
	col *= 1.0 + (0.02 * step(0.86, sp) - 0.03 * step(sp, 0.10)) * fd;
	col *= mix(1.0, 0.70, smoothstep(0.15, 0.9, crev));
	col = mix(col, col * vec3(1.0, 0.88, 0.78), smoothstep(0.4, 1.0, crev) * 0.5);
	float clump;
	vec3 gcol = meadowStrokes(grassRamp(meadowT(X, fd, clump)), X, 1.0 - smoothstep(14.0, 42.0, cd));
	float mo = smoothstep(0.6, 0.9, N.y) * smoothstep(0.5 - 0.25 * moss_top, 0.62 - 0.25 * moss_top, fbm(P * 0.7 + 2.0)) * step(fract(seed * 7.13), moss_p) * moss;
	col = mix(col, gcol * 0.85, mo);
	// the foot: a darker, greener earth tone where it goes into the ground
	float hgt = P.y - v_inst.y;
	vec3 earth = mix(mix(vec3(0.16, 0.13, 0.08), vec3(0.14, 0.20, 0.07), fbm2(X * 0.9)), gcol * 0.55, 0.35);
	float bnd = clamp(v_sc * 0.45, 0.04, 1.0);
	float gm0 = 1.0 - smoothstep(-0.05 * bnd, 0.30 * bnd, hgt);
	col = mix(col, earth, gm0 * 0.9);
	col *= 1.0 - 0.25 * (1.0 - smoothstep(0.0, 0.6 * bnd, hgt));
	float sun_f = clamp(dot(N, normalize(sun_dir)), 0.0, 1.0);
	col *= 1.0 + shade_lift * (1.0 - sun_f) * (1.0 - gm0);
	ALBEDO = to_linear(col);
	ROUGHNESS = 0.8;
	SPECULAR = 0.25;
}
