// THE REGION'S SKY (shaders/sky_clouds.gdshader): a deep blue overhead paling to a soft haze at the horizon, the sun as a soft
// disc in a warm glow, and big soft stylized clouds - cumulus heaps on a layer seen through the dome, their tops lit white from
// the sun's side, their bellies a cool blue-grey, thinning into the haze toward the horizon. Still (no TIME), so Godot works
// out the sky's light for the ambient and the reflections once, not every frame; the clouds on screen worked out at half
// resolution (they are soft anyway) - per pixel at full resolution they cost 3 - 5 ms a frame on this laptop.
shader_type sky;
render_mode use_debanding, use_half_res_pass;

uniform vec3 top_col : source_color = vec3(0.17, 0.43, 0.84);
uniform vec3 horizon_col : source_color = vec3(0.63, 0.78, 0.96);
uniform vec3 below_col : source_color = vec3(0.52, 0.62, 0.70);
uniform vec3 cloud_lit : source_color = vec3(1.0, 0.99, 0.97);
uniform vec3 cloud_shade : source_color = vec3(0.66, 0.73, 0.85);
// how much of the sky the clouds cover (0..1), and how big they are (larger = smaller clouds)
uniform float coverage = 0.4;
uniform float cloud_scale = 0.75;

float sk_hash(vec2 p) {
	uvec2 q = uvec2(ivec2(floor(p)) + ivec2(1 << 20));
	q *= uvec2(1597334673u, 3812015801u);
	uint n = (q.x ^ q.y) * 1597334673u;
	return float(n >> 8u) * (1.0 / 16777216.0);
}

float sk_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(sk_hash(i), sk_hash(i + vec2(1.0, 0.0)), u.x), mix(sk_hash(i + vec2(0.0, 1.0)), sk_hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// heaped, billowing: rounded lumps on lumps (each octave turned and shifted)
float sk_heap(vec2 p) {
	float v = 0.0;
	float a = 0.55;
	mat2 rot = mat2(vec2(0.8, 0.6), vec2(-0.6, 0.8));
	for (int i = 0; i < 5; i++) {
		v += a * sk_noise(p);
		p = rot * p * 2.03 + vec2(1.7, 9.2);
		a *= 0.5;
	}
	return v;
}

// the clouds over a view direction: their colour and how much they cover (0 below the horizon)
vec4 sk_clouds(vec3 d, vec3 sd, float sdot) {
	float h = d.y;
	if (h <= 0.0) {
		return vec4(0.0);
	}
	// (the cloud layer: the view ray met on a plane, so the clouds shrink toward the horizon)
	vec2 uv = d.xz / (h + 0.1) * cloud_scale;
	// (a slow warp first: heaps, not blots)
	vec2 wq = uv + vec2(sk_noise(uv * 0.3 + 3.0), sk_noise(uv * 0.3 - 7.0)) * 0.6;
	float n = sk_heap(wq);
	float lo = 1.0 - coverage;
	float c = smoothstep(lo * 0.82, lo * 0.82 + 0.07, n);
	if (c <= 0.0) {
		return vec4(0.0);
	}
	// lit from the sun's side: denser toward the sun = in shade
	float n2 = sk_heap(wq + normalize(sd.xz + vec2(1e-4)) * 0.11);
	float lit = clamp(0.58 + (n - n2) * 7.0, 0.0, 1.0);
	// bellies darker: the thicker the cloud, the more of its base in shade
	lit *= mix(1.0, 0.82, smoothstep(lo, lo + 0.3, n));
	vec3 cc = mix(cloud_shade, cloud_lit, lit);
	// (a silver edge toward the sun)
	cc += vec3(0.25) * pow(sdot, 6.0) * (1.0 - smoothstep(lo * 0.82, lo * 0.82 + 0.1, n)) * c;
	// into the haze toward the horizon
	c *= smoothstep(0.015, 0.16, h);
	return vec4(mix(cc, horizon_col, 1.0 - smoothstep(0.03, 0.3, h)), c);
}

void sky() {
	vec3 d = EYEDIR;
	vec3 sd = LIGHT0_DIRECTION;
	float sdot = max(dot(d, sd), 0.0);
	if (AT_HALF_RES_PASS) {
		vec4 cl = sk_clouds(d, sd, sdot);
		COLOR = cl.rgb;
		ALPHA = cl.a;
	} else {
		float h = d.y;
		vec3 col = mix(horizon_col, top_col, pow(clamp(h, 0.0, 1.0), 0.5));
		if (h < 0.0) {
			col = mix(horizon_col, below_col, clamp(-h * 5.0, 0.0, 1.0));
		}
		// (the clouds: from the half-resolution pass on screen; worked out here for the sky's light, the cubemap pass)
		vec4 cl = AT_CUBEMAP_PASS ? sk_clouds(d, sd, sdot) : HALF_RES_COLOR;
		col = mix(col, cl.rgb, cl.a);
		// the sun: a soft disc, a warm glow round it
		col += LIGHT0_COLOR * LIGHT0_ENERGY * (smoothstep(0.9993, 0.9997, sdot) * 2.5 + pow(sdot, 12.0) * 0.12);
		COLOR = col;
	}
}
