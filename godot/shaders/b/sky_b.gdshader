// THE SKY, STYLIZED (shaders/b/sky_b.gdshader, art preset B_stylized, see ART_STYLE.md): a soft gradient from a clear blue zenith
// to a lighter, hazier horizon, a warm glow round the sun and a small bright disc, and soft stylized clouds - lit on the sun's side,
// cool in their shade, thinning toward the horizon. Static (no TIME), so the sky's lighting is not rebuilt every frame.
shader_type sky;

uniform vec3 zenith_col : source_color = vec3(0.15, 0.39, 0.82);
uniform vec3 horizon_col : source_color = vec3(0.68, 0.81, 0.94);
uniform vec3 ground_col : source_color = vec3(0.52, 0.60, 0.66);
uniform float horizon_curve = 0.42;
uniform vec3 cloud_lit : source_color = vec3(1.0, 0.98, 0.95);
uniform vec3 cloud_shade : source_color = vec3(0.70, 0.77, 0.89);
uniform float cloud_cover : hint_range(0.0, 1.0) = 0.42;
uniform float cloud_scale = 1.1;
uniform float sun_disc_deg = 1.6;
uniform float sun_glow = 0.35;

float s_hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float s_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(s_hash(i), s_hash(i + vec2(1.0, 0.0)), u.x), mix(s_hash(i + vec2(0.0, 1.0)), s_hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float s_fbm(vec2 p) {
	float s = 0.0;
	float a = 0.5;
	for (int i = 0; i < 5; i++) {
		s += a * s_noise(p);
		p = p * 2.03 + vec2(1.7, 9.2);
		a *= 0.5;
	}
	return s;
}

void sky() {
	vec3 d = EYEDIR;
	float h = d.y;
	vec3 c = mix(horizon_col, zenith_col, pow(clamp(h, 0.0, 1.0), horizon_curve));
	c = mix(c, ground_col, smoothstep(0.0, 0.25, -h));
	vec3 sd = LIGHT0_ENABLED ? LIGHT0_DIRECTION : vec3(0.0, 1.0, 0.0);
	vec3 sc = LIGHT0_ENABLED ? LIGHT0_COLOR : vec3(1.0);
	float s = max(dot(d, sd), 0.0);
	if (h > 0.0) {
		vec2 uv = d.xz / (h + 0.12) * cloud_scale;
		float n = s_fbm(uv);
		float cov = smoothstep(1.0 - cloud_cover - 0.08, 1.0 - cloud_cover + 0.16, n);
		float lit = smoothstep(0.35, 0.8, s_fbm(uv + sd.xz * 0.12) - n + 0.55);
		vec3 cc = mix(cloud_shade, cloud_lit + sc * 0.15 * pow(s, 6.0), lit);
		c = mix(c, cc, cov * smoothstep(0.02, 0.22, h) * 0.92);
	}
	c += sc * sun_glow * pow(s, 12.0);
	float disc = smoothstep(cos(radians(sun_disc_deg)), cos(radians(sun_disc_deg * 0.7)), s);
	c += sc * 8.0 * disc;
	COLOR = c;
}
