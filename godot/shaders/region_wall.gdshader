// THE REGION'S WALLS (shaders/region_wall.gdshader): the sheer plateau walls (tepui_region.gd builds them as separate meshes).
// For now the greybox look: one flat rock grey, lit; the rock's top (its lip over the plateau's edge, and the ledges of its
// setbacks) in the ground's greybox colour, so a plateau's top reads as one table right to its edge. The terrain's debug
// views carry on over them (1 heights in the same colour ramp, 2 tiers: walls in neutral grey, 3 slopes: too steep, 4
// steep-edge mask: all of them).
shader_type spatial;
render_mode cull_disabled, diffuse_burley, specular_schlick_ggx;

uniform int debug_view = 0;
uniform vec3 rock_col : source_color = vec3(0.74, 0.71, 0.66);
uniform bool greybox = true;
// the terrain's greybox colour (shaders/terrain3d.gdshader)
uniform vec3 top_col : source_color = vec3(0.47, 0.57, 0.38);
uniform float greybox_floor = 0.0;
uniform float greybox_span = 450.0;

varying float v_h;
varying float v_up;
varying float v_grass;

void vertex() {
	v_h = (MODEL_MATRIX * vec4(VERTEX, 1.0)).y;
	v_up = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz).y;
	v_grass = COLOR.r;
}

vec3 height_ramp(float h) {
	vec3 c = mix(vec3(0.20, 0.48, 0.78), vec3(0.30, 0.62, 0.30), smoothstep(0.0, 10.0, h));
	c = mix(c, vec3(0.55, 0.75, 0.30), smoothstep(10.0, 80.0, h));
	c = mix(c, vec3(0.88, 0.82, 0.30), smoothstep(80.0, 150.0, h));
	c = mix(c, vec3(0.80, 0.52, 0.22), smoothstep(150.0, 350.0, h));
	c = mix(c, vec3(0.62, 0.40, 0.22), smoothstep(350.0, 450.0, h));
	c = mix(c, vec3(0.50, 0.36, 0.30), smoothstep(450.0, 700.0, h));
	c = mix(c, vec3(0.62, 0.58, 0.58), smoothstep(700.0, 900.0, h));
	c = mix(c, vec3(1.0), smoothstep(900.0, 1500.0, h));
	return c;
}

void fragment() {
	// (both sides of a triangle shaded with the mesh's own normal: a carved arch's tiny folded triangles stay lit like their
	// neighbours instead of showing their dark back)
	if (!FRONT_FACING) {
		NORMAL = -NORMAL;
	}
	vec3 col = rock_col;
	// (grass where the mesh marks the rock's top - the walls' lips, the carved rock's top surfaces - on anything not too steep;
	// elsewhere only on near-level ground, so the rubble's slopes and the faces stay rock. A soft edge over a little of the
	// slope, not a hard switch: a hard one zig-zags along the mesh's triangles where a rounded rim turns down)
	float gt = mix(smoothstep(0.95, 0.985, v_up), smoothstep(0.38, 0.55, v_up), smoothstep(0.3, 0.7, v_grass));
	col = mix(col, top_col * mix(0.36, 1.3, clamp((v_h - greybox_floor) / greybox_span, 0.0, 1.0)), gt);
	if (debug_view == 1) {
		col = height_ramp(v_h) * 0.8;
	} else if (debug_view == 2) {
		col = vec3(0.45);
	} else if (debug_view == 3) {
		col = vec3(0.45, 0.04, 0.04);
	} else if (debug_view == 4) {
		col = vec3(0.88, 0.10, 0.10);
	}
	if (debug_view > 0) {
		vec3 lin = pow(col, vec3(2.2));
		ALBEDO = lin * 0.25;
		EMISSION = lin * 0.8;
	} else {
		ALBEDO = col;
	}
	// (the top matches the terrain's surface)
	ROUGHNESS = mix(0.95, 0.92, gt);
	SPECULAR = mix(0.15, 0.2, gt);
}
