// THE TREES' LOOK (shaders/tree.gdshader): flat-shaded faces in the mesh's vertex colours (sRGB, squared into linear here),
// each tree tinted and its crown reshaped (wider / narrower, taller / squatter round 1.5 m up) by a hash of where it stands - the
// same at every distance level - and crowns swaying slowly in the wind.
shader_type spatial;
render_mode cull_back;

varying vec3 v_col;
// where the local origin is on the map (scripts/world/floating_origin.gd): each tree keeps its own look across a shift
global uniform vec2 world_offset;

float hash2(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

void vertex() {
	vec3 org = MODEL_MATRIX[3].xyz + vec3(world_offset.x, 0.0, world_offset.y);
	float r = hash2(floor(org.xz * 4.0));
	float r2 = hash2(floor(org.xz * 4.0) + 17.0);
	vec3 col = pow(COLOR.rgb, vec3(2.2));
	float leafy = step(COLOR.r, COLOR.g);
	vec3 tint = mix(vec3(1.0), vec3(1.12, 1.06, 0.78), r2 * 0.6) * (0.82 + 0.3 * r);
	v_col = mix(col, col * tint, leafy);
	float r3 = hash2(floor(org.xz * 4.0) + 41.0);
	float r4 = hash2(floor(org.xz * 4.0) + 73.0);
	vec3 crown = vec3(VERTEX.x * (0.82 + 0.4 * r3), 1.5 + (VERTEX.y - 1.5) * (0.85 + 0.35 * r4), VERTEX.z * (0.82 + 0.4 * r3));
	VERTEX = mix(VERTEX, crown, leafy);
	float sway = max(VERTEX.y - 2.0, 0.0) * 0.01 * sin(TIME * 1.1 + org.x * 0.05 + org.z * 0.07);
	VERTEX.x += sway;
	VERTEX.z += sway * 0.6;
}

void fragment() {
	ALBEDO = v_col;
	ROUGHNESS = 0.9;
	SPECULAR = 0.25;
}
