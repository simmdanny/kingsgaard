// THE WATERFALLS' SPLASH (shaders/region_splash.gdshader): chunky white blobs heaped where a fall meets its pool
// (scripts/world/tepui_water.gd). COLOR.r each blob's phase, COLOR.g its size / 10 m; NORMAL its sphere's own direction. Each
// swells and bobs on its own beat: a boiling, stylized splash.
shader_type spatial;
render_mode cull_back, diffuse_burley, specular_schlick_ggx;

uniform vec3 foam_col : source_color = vec3(0.95, 0.98, 0.99);
uniform vec3 shade_col : source_color = vec3(0.62, 0.82, 0.88);

void vertex() {
	float ph = COLOR.r * 6.2832;
	float s = COLOR.g * 10.0;
	VERTEX += NORMAL * s * (0.18 + 0.16 * sin(TIME * 3.1 + ph));
	VERTEX.y += abs(sin(TIME * 1.6 + ph * 1.7)) * s * 0.35;
}

void fragment() {
	vec3 wn = (INV_VIEW_MATRIX * vec4(NORMAL, 0.0)).xyz;
	ALBEDO = mix(shade_col, foam_col, smoothstep(-0.3, 0.6, wn.y));
	ROUGHNESS = 0.75;
	SPECULAR = 0.25;
}
