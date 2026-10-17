// THE GROUND, STYLIZED (shaders/b/terrain_b.gdshader, art preset B_stylized, see ART_STYLE.md). The same cover weights as the
// current ground (vertex colour: r forest, g meadow, b sand; the rest grassland), drawn with the browser game's meadow and stone
// (shaders/inc/meadow.gdshaderinc, stone.gdshaderinc - the look of the old boulders and their meadow): its ramp of five greens with
// broad patches and darker clover clumps, lighter on meadows, darker under forest with muted dusty-brown earth; the boulders' warm tan
// stone on steep slopes over a wide soft band broken by noise; wet sand at the waterline. Every noise in world space, triplanar where
// it can face a slope. Display (sRGB) colours, made linear at the end. The grass blades take the same greens (art/B_stylized/grass.tres).
shader_type spatial;
render_mode cull_back;

#include "res://shaders/inc/meadow.gdshaderinc"
#include "res://shaders/inc/stone.gdshaderinc"

uniform float meadow_lift = 0.10;  // meadows: how much lighter and yellower on the green ramp
uniform float forest_drop = 0.20;  // under forest: how much darker
uniform vec3 dirt_col = vec3(0.36, 0.33, 0.20);
uniform vec3 sand_col = vec3(0.88, 0.79, 0.58);
uniform vec3 wet_col = vec3(0.62, 0.55, 0.41);
uniform float rock_slope_begin = 0.30;  // 1 - normal.y where stone begins to show
uniform float rock_slope_end = 0.50;
uniform float strokes : hint_range(0.0, 1.0) = 0.0;  // the browser game's painted blade strokes near the eye (off: ART_STYLE.md says no brushstrokes)

varying vec3 v_wpos;
varying vec3 v_wnrm;
varying vec3 v_cover;

void vertex() {
	v_wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
	v_cover = COLOR.rgb;
}

void fragment() {
	vec3 n = normalize(v_wnrm);
	vec2 X = v_wpos.xz;
	float cd = length(v_wpos - CAMERA_POSITION_WORLD);
	float fd = 1.0 - smoothstep(25.0, 70.0, cd);
	float clump;
	float t = meadowT(X, fd, clump);
	t += meadow_lift * v_cover.g;
	t -= forest_drop * v_cover.r;
	vec3 c = grassRamp(t);
	if (strokes > 0.0) {
		c = mix(c, meadowStrokes(c, X, 1.0 - smoothstep(14.0, 42.0, cd)), strokes);
	}
	float patchy = fbm2(X * 0.05 + 3.0);
	c = mix(c, dirt_col * (0.94 + 0.12 * vn2(X * 0.4)), v_cover.r * smoothstep(0.55, 0.8, patchy) * 0.4);
	float slope = 1.0 - n.y;
	vec3 w = pow(abs(n), vec3(4.0));
	w /= (w.x + w.y + w.z);
	float brk = vn2(v_wpos.zy / 7.0) * w.x + vn2(X / 7.0) * w.y + vn2(v_wpos.xy / 7.0) * w.z;
	float rk = smoothstep(rock_slope_begin, rock_slope_end, slope + (brk - 0.5) * 0.14);
	c = mix(c, stone_slope(v_wpos, n), rk);
	float s = smoothstep(0.3, 0.7, v_cover.b + (fbm2(X * 0.05) - 0.5) * 0.35 + (vn2(X * 0.8) - 0.5) * 0.1);
	vec3 sand = mix(wet_col, sand_col * (0.96 + 0.08 * vn2(X * 0.3)), smoothstep(0.3, 1.8, v_wpos.y));
	c = mix(c, sand, s);
	c *= mix(1.0, 0.62, smoothstep(0.0, -6.0, v_wpos.y));
	ALBEDO = to_linear(c);
	ROUGHNESS = mix(0.95, 0.85, rk);
	SPECULAR = 0.2;
}
