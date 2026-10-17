// THE TREES, STYLIZED (shaders/b/tree_b.gdshader, art preset B_stylized, see ART_STYLE.md): for the smooth clumped meshes of
// proc_meshes.gd (broadleaf_b / conifer_b). Vertex colour = a gradient baked per mesh (sRGB, made linear here), COLOR.a = baked
// ambient occlusion (soft and tinted by the sky light, never black), UV.x = 1 on leaves. Each tree is tinted and its crown reshaped
// by a hash of where it stands, as in the current tree shader, and crowns sway in the wind. Leaves let a little sun through
// (backlight), so a crown against the sun glows at its edge.
shader_type spatial;
render_mode cull_back;

uniform float tint_amount : hint_range(0.0, 1.0) = 0.5;
uniform vec3 backlight_col : source_color = vec3(0.30, 0.42, 0.10);
uniform float ao_strength : hint_range(0.0, 1.0) = 1.0;

varying vec3 v_col;
varying float v_ao;
varying float v_leaf;

float hash2(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

void vertex() {
	vec3 org = MODEL_MATRIX[3].xyz;
	float r = hash2(floor(org.xz * 4.0));
	float r2 = hash2(floor(org.xz * 4.0) + 17.0);
	float leafy = UV.x;
	vec3 col = pow(COLOR.rgb, vec3(2.2));
	vec3 tint = mix(vec3(1.0), vec3(1.12, 1.06, 0.80), r2 * 0.6) * (0.88 + 0.22 * r);
	v_col = mix(col, col * mix(vec3(1.0), tint, tint_amount * 2.0), leafy);
	v_ao = COLOR.a;
	v_leaf = leafy;
	float r3 = hash2(floor(org.xz * 4.0) + 41.0);
	float r4 = hash2(floor(org.xz * 4.0) + 73.0);
	vec3 crown = vec3(VERTEX.x * (0.84 + 0.36 * r3), 1.5 + (VERTEX.y - 1.5) * (0.86 + 0.3 * r4), VERTEX.z * (0.84 + 0.36 * r3));
	VERTEX = mix(VERTEX, crown, leafy);
	float sway = max(VERTEX.y - 2.0, 0.0) * 0.01 * sin(TIME * 1.1 + org.x * 0.05 + org.z * 0.07);
	VERTEX.x += sway;
	VERTEX.z += sway * 0.6;
}

void fragment() {
	ALBEDO = v_col;
	AO = mix(1.0, v_ao, ao_strength);
	AO_LIGHT_AFFECT = 0.4;
	ROUGHNESS = 0.88;
	SPECULAR = 0.2;
	BACKLIGHT = backlight_col * v_leaf;
}
