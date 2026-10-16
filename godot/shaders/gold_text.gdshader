// GOLD LETTERS (shaders/gold_text.gdshader): the HTML title's gradient fill (#f7efd9 at the top, #e3d3a8 at 46 %, #a78a54 at
// the foot) over the glyphs of a Label, by the height inside the label.
shader_type canvas_item;

uniform float top_y = 9.0;
uniform float foot_y = 41.0;

varying float ly;

void vertex() {
	ly = VERTEX.y;
}

void fragment() {
	float k = clamp((ly - top_y) / (foot_y - top_y), 0.0, 1.0);
	vec3 a = vec3(0.969, 0.937, 0.851);
	vec3 b = vec3(0.890, 0.827, 0.659);
	vec3 c = vec3(0.655, 0.541, 0.329);
	vec3 g = k < 0.46 ? mix(a, b, k / 0.46) : mix(b, c, (k - 0.46) / 0.54);
	COLOR = vec4(g, texture(TEXTURE, UV).a * COLOR.a);
}
