// THE GROUND'S LOOK (shaders/terrain.gdshader): the vertex colour carries the cover weights (r forest, g meadow, b sand), the
// rest is plain grassland. Colours are uniforms set from main.gd (shared with the grass so blades melt into the ground);
// two scales of value noise in world space break up each colour. Wet sand at the waterline, the sea floor darkening with depth.
shader_type spatial;
render_mode cull_back;

uniform vec3 grass_col : source_color = vec3(0.42, 0.62, 0.25);
uniform vec3 meadow_col : source_color = vec3(0.56, 0.70, 0.29);
uniform vec3 forest_col : source_color = vec3(0.25, 0.39, 0.17);
uniform vec3 sand_col : source_color = vec3(0.86, 0.79, 0.58);
uniform vec3 wet_col : source_color = vec3(0.60, 0.54, 0.40);

varying vec3 v_wpos;
varying vec3 v_cover;

float hash2(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}

void vertex() {
	v_wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_cover = COLOR.rgb;
}

void fragment() {
	float n1 = vnoise(v_wpos.xz * 0.045);
	float n2 = vnoise(v_wpos.xz * 0.37);
	float n3 = vnoise(v_wpos.xz * 0.006);
	vec3 c = grass_col * (0.88 + 0.2 * n1 + 0.1 * n3);
	c = mix(c, meadow_col * (0.92 + 0.16 * n2), v_cover.g);
	c = mix(c, forest_col * (0.84 + 0.3 * n1), v_cover.r);
	float s = smoothstep(0.35, 0.65, v_cover.b + (n2 - 0.5) * 0.3);
	vec3 sand = mix(wet_col, sand_col * (0.95 + 0.1 * n2), smoothstep(0.3, 1.8, v_wpos.y));
	c = mix(c, sand, s);
	c *= mix(1.0, 0.6, smoothstep(0.0, -6.0, v_wpos.y));
	ALBEDO = c;
	ROUGHNESS = 0.95;
	SPECULAR = 0.2;
}
