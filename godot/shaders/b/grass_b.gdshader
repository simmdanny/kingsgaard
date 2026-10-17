// THE GRASS, STYLIZED (shaders/b/grass_b.gdshader, art preset B_stylized, see ART_STYLE.md): the same blades and placement as the
// current grass (shaders/grass.gdshader), drawn softer: a fuller gradient from a darker base to a light warm tip, the base sunk in
// soft occlusion so blades sit in the ground, normals pointing up so a field shades like the ground under it, and a gentler wind.
// Colours are the stylized ground's (art/B_stylized/grass.tres = the same values as terrain.tres).
shader_type spatial;
render_mode cull_disabled, world_vertex_coords;

uniform vec3 grass_col : source_color = vec3(0.40, 0.64, 0.21);
uniform vec3 meadow_col : source_color = vec3(0.55, 0.71, 0.27);
uniform vec3 forest_col : source_color = vec3(0.21, 0.38, 0.16);
uniform vec3 tip_col : source_color = vec3(0.80, 0.86, 0.38);
uniform float base_dark : hint_range(0.0, 1.0) = 0.68;
uniform float wind : hint_range(0.0, 2.0) = 0.7;
uniform float fade_begin = 30.0;
uniform float fade_end = 62.0;

varying vec3 v_col;
varying float v_h;

void vertex() {
	vec3 root = MODEL_MATRIX[3].xyz;
	vec4 cd = INSTANCE_CUSTOM;
	float h = UV.y;
	float d = distance(root.xz, CAMERA_POSITION_WORLD.xz);
	float keep = 1.0 - smoothstep(fade_begin, fade_end, d);
	VERTEX = root + (VERTEX - root) * keep;
	float t = TIME * 1.3;
	float gust = sin(root.x * 0.09 + root.z * 0.06 + t) * 0.5 + 0.5;
	float w = (0.08 + 0.16 * gust) * wind * h * h * (VERTEX.y - root.y + 0.2);
	VERTEX.x += w * (0.8 + 0.25 * sin(t * 2.1 + cd.y * 6.28));
	VERTEX.z += w * 0.45;
	NORMAL = normalize(mix(NORMAL, vec3(0.0, 1.0, 0.0), 0.85));
	vec3 base = mix(mix(grass_col, meadow_col, cd.x), forest_col, cd.w) * (0.9 + 0.2 * cd.y);
	vec3 col = mix(base * base_dark, mix(base, tip_col, 0.3 + 0.2 * cd.x), smoothstep(0.0, 1.0, h));
	if (cd.z > 0.0 && h > 0.72) {
		vec3 fc = cd.z < 0.4 ? vec3(0.97, 0.95, 0.88) : (cd.z < 0.6 ? vec3(0.98, 0.80, 0.24) : vec3(0.72, 0.56, 0.92));
		col = fc;
	}
	v_col = col;
	v_h = h;
}

void fragment() {
	if (!FRONT_FACING) {
		NORMAL = -NORMAL;
	}
	ALBEDO = v_col;
	AO = 0.55 + 0.45 * smoothstep(0.0, 0.6, v_h);
	AO_LIGHT_AFFECT = 0.3;
	ROUGHNESS = 0.9;
	SPECULAR = 0.15;
	BACKLIGHT = vec3(0.3, 0.32, 0.15) * v_h;
}
