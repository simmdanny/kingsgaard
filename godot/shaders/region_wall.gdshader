// THE REGION'S WALLS (shaders/region_wall.gdshader): the sheer plateau walls (tepui_region.gd builds them as separate meshes).
// For now the greybox look: one flat rock grey, lit; the terrain's debug views carry on over them (1 heights in the same colour
// ramp, 2 tiers: walls in neutral grey, 3 slopes: too steep, 4 steep-edge mask: all of them).
shader_type spatial;
render_mode cull_disabled, diffuse_burley, specular_schlick_ggx;

uniform int debug_view = 0;
uniform vec3 rock_col : source_color = vec3(0.74, 0.71, 0.66);

varying float v_h;

void vertex() {
	v_h = (MODEL_MATRIX * vec4(VERTEX, 1.0)).y;
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
	vec3 col = rock_col;
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
	ROUGHNESS = 0.95;
	SPECULAR = 0.15;
}
