// THE SEA'S LOOK (shaders/water.gdshader): how deep the water is at each pixel comes from the depth buffer (the ground behind the
// surface, in view space): clear turquoise over the sand, a foam line where it laps the beach, deep blue further out. Small
// analytic waves move the normal for the sun's glints.
shader_type spatial;
render_mode blend_mix, cull_back, specular_schlick_ggx;

uniform vec3 shallow_col : source_color = vec3(0.26, 0.80, 0.76);
uniform vec3 deep_col : source_color = vec3(0.06, 0.27, 0.45);
uniform vec3 foam_col : source_color = vec3(0.96, 0.98, 0.97);
uniform sampler2D depth_tex : hint_depth_texture, filter_nearest;

varying vec3 v_wpos;
// where the local origin is on the map (scripts/world/floating_origin.gd): the waves keep their pattern across a shift
global uniform vec2 world_offset;

void vertex() {
	v_wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float z = texture(depth_tex, SCREEN_UV).r;
	vec4 p = INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, z, 1.0);
	p.xyz /= p.w;
	float depth = max(VERTEX.z - p.z, 0.0);
	vec2 q = v_wpos.xz + world_offset;
	float t = TIME;
	vec2 g = vec2(cos(q.x * 0.21 + t * 1.1) * 0.6 + cos((q.x + q.y) * 0.13 + t * 0.8) * 0.5,
		cos(q.y * 0.17 + t * 0.9) * 0.6 + cos((q.y - q.x) * 0.11 + t * 1.3) * 0.5);
	float near = 1.0 - smoothstep(40.0, 500.0, length(VERTEX));
	vec3 n = normalize(vec3(g.x * 0.06 * near, 1.0, g.y * 0.06 * near));
	NORMAL = normalize((VIEW_MATRIX * vec4(n, 0.0)).xyz);
	float dk = smoothstep(0.5, 14.0, depth);
	vec3 col = mix(shallow_col, deep_col, dk);
	float edge = 0.35 + 0.2 * sin(q.x * 0.3 + q.y * 0.2 + t * 1.5);
	float foam = 1.0 - smoothstep(0.0, edge, depth);
	ALBEDO = mix(col, foam_col, foam * 0.85);
	ALPHA = clamp(mix(0.38, 0.94, smoothstep(0.0, 3.0, depth)) + foam * 0.6, 0.0, 1.0);
	ROUGHNESS = 0.14;
	METALLIC = 0.0;
	SPECULAR = 0.5;
}
