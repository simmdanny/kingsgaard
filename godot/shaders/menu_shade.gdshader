// THE TITLE SCREEN'S SHADING (shaders/menu_shade.gdshader), as the HTML menu's CSS layers it over the painting: a dark side on
// the left for the words (ink at 94 % fading out by half the width), a shade up from the bottom and down from the top, a
// vignette round the edges, and a faint haze drifting slowly (70 s) through the lower part.
shader_type canvas_item;
render_mode blend_premul_alpha;

uniform vec2 px = vec2(1280.0, 720.0);
uniform float t = 0.0;

float fall(float x, float a, float b) {
	return clamp((x - a) / (b - a), 0.0, 1.0);
}

void fragment() {
	vec2 uv = UV;
	float x = uv.x;
	float left = x < 0.2 ? mix(0.94, 0.86, x / 0.2) : (x < 0.34 ? mix(0.86, 0.55, (x - 0.2) / 0.14) : mix(0.55, 0.0, fall(x, 0.34, 0.52)));
	float bottom = mix(0.55, 0.0, fall(1.0 - uv.y, 0.0, 0.22));
	float top = mix(0.40, 0.0, fall(uv.y, 0.0, 0.16));
	vec2 p = uv * px;
	float vmin = min(px.x, px.y);
	float d = min(min(p.x, px.x - p.x), min(p.y, px.y - p.y));
	float vig = 0.75 * (1.0 - smoothstep(0.02 * vmin, 0.16 * vmin, d));
	float a = 1.0 - (1.0 - left) * (1.0 - bottom) * (1.0 - top) * (1.0 - vig);
	vec3 ink = vec3(3.0, 5.0, 9.0) / 255.0;
	// the haze: two soft glows, screened in, drifting a few per cent sideways and back
	float s = sin(t * 6.2832 / 140.0);
	vec2 o = vec2(0.035 * s, -0.0075 * (s + 1.0));
	float h1 = exp(-pow((uv.x - 0.30 - o.x) / 0.60, 2.0) * 2.2 - pow((uv.y - 0.78 - o.y) / 0.22, 2.0) * 2.2);
	float h2 = exp(-pow((uv.x - 0.75 - o.x) / 0.50, 2.0) * 2.2 - pow((uv.y - 0.70 - o.y) / 0.18, 2.0) * 2.2);
	vec3 haze = (vec3(120.0, 140.0, 190.0) * 0.10 * h1 + vec3(120.0, 110.0, 170.0) * 0.09 * h2) / 255.0 * 0.5;
	// premultiplied: the painting below is darkened by a, the ink laid in, the haze added on top
	COLOR = vec4(ink * a + haze, a);
}
