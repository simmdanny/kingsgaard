// THE STONE'S CONTACT SHADOW (shaders/stone_ring.gdshader): the browser game's soft darker ring under each boulder (wboulder.js wbldRing):
// a flat card on the ground, darkest just outside the stone's foot - the contact the ground's own light cannot know.
shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never, cull_disabled, shadows_disabled;

uniform vec3 tint : source_color = vec3(0.03, 0.04, 0.02);
uniform float strength = 1.0;

void fragment() {
	float r = length(UV * 2.0 - 1.0);
	float a = (1.0 - smoothstep(0.62, 1.0, r)) * smoothstep(0.25, 0.6, r) * 0.42 + (1.0 - smoothstep(0.0, 0.62, r)) * 0.18;
	ALBEDO = tint;
	ALPHA = a * strength;
}
