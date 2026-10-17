// THE GRASS'S LOOK (shaders/grass.gdshader): blades in world space - bent by the wind (tips most), shrunk away towards the edge
// of the grass ring, lit with an upward normal so a meadow shades like the ground under it. Colour from the instance's custom
// data (meadow, random, flower kind, forest) mixed from the same uniforms as the terrain: dark at the root, light at the tip.
shader_type spatial;
render_mode cull_disabled, world_vertex_coords;

uniform vec3 grass_col : source_color = vec3(0.42, 0.62, 0.25);
uniform vec3 meadow_col : source_color = vec3(0.56, 0.70, 0.29);
uniform vec3 forest_col : source_color = vec3(0.25, 0.39, 0.17);
uniform vec3 tip_col : source_color = vec3(0.78, 0.86, 0.42);
uniform float fade_begin = 30.0;
uniform float fade_end = 62.0;
// where the local origin is on the map (scripts/world/floating_origin.gd): the wind keeps its pattern across a shift
global uniform vec2 world_offset;

varying vec3 v_col;
varying float v_h;

void vertex() {
	vec3 root = MODEL_MATRIX[3].xyz;
	vec4 cd = INSTANCE_CUSTOM;
	float h = UV.y;
	float d = distance(root.xz, CAMERA_POSITION_WORLD.xz);
	float keep = 1.0 - smoothstep(fade_begin, fade_end, d);
	VERTEX = root + (VERTEX - root) * keep;
	float t = TIME * 1.6;
	vec2 wr = root.xz + world_offset;
	float gust = sin(wr.x * 0.11 + wr.y * 0.07 + t) * 0.5 + 0.5;
	float w = (0.10 + 0.22 * gust) * h * h * (VERTEX.y - root.y + 0.2);
	VERTEX.x += w * (0.8 + 0.3 * sin(t * 2.3 + cd.y * 6.28));
	VERTEX.z += w * 0.45;
	NORMAL = normalize(mix(NORMAL, vec3(0.0, 1.0, 0.0), 0.8));
	vec3 base = mix(mix(grass_col, meadow_col, cd.x), forest_col, cd.w) * (0.85 + 0.3 * cd.y);
	vec3 col = mix(base * 0.8, mix(base, tip_col, 0.22 + 0.2 * cd.x), smoothstep(0.0, 1.0, h));
	if (cd.z > 0.0 && h > 0.72) {
		vec3 fc = cd.z < 0.4 ? vec3(0.98, 0.95, 0.88) : (cd.z < 0.6 ? vec3(0.98, 0.82, 0.22) : vec3(0.70, 0.52, 0.92));
		col = fc;
	}
	v_col = col;
	v_h = h;
}

void fragment() {
	// a double-sided face gets its normal flipped on the back: undo it, so both sides light like the ground
	if (!FRONT_FACING) {
		NORMAL = -NORMAL;
	}
	ALBEDO = v_col;
	ROUGHNESS = 0.9;
	SPECULAR = 0.15;
	BACKLIGHT = vec3(0.25) * v_h;
}
