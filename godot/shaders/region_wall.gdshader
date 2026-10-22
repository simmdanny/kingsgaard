// THE REGION'S ROCK (shaders/region_wall.gdshader): the sheer plateau walls and every carved feature - arches, supports,
// overhangs, pillars, sinkholes (tepui_region.gd builds them as separate meshes) - one material for all of it.
// Pale limestone: big soft patches between a cool pale grey and a warm sandy grey, soft horizontal bands where the layers run,
// long vertical streaks of staining down the faces, all mapped triplanar in map coordinates (no stretching on any face, the
// finest detail fading out far away); the undersides of overhangs and arches a little darker, the rubble at the walls' feet
// darker and browner, running out into the grass at its toe; darker, cooler, glossy and streaked near the waterfalls (their
// lips and feet passed in as fall_a / fall_b). The rock's top - its lip over a plateau's edge, the ledges of its setbacks, the
// carved rock's top surfaces - is the region's grass (region_ground.gdshaderinc, the terrain's own colour), wrapping over the
// rounded lip as a carpet with a ragged edge. The warm and cool come from the light: the warm sun on the faces turned to it,
// the blue sky filling the shade (main.gd), so no shadow is black.
// greybox (while the landforms were judged): one flat rock grey, the top in the ground's greybox colour. The terrain's debug
// views carry on over it (1 heights in the same colour ramp, 2 tiers: walls in neutral grey, 3 slopes: too steep, 4
// steep-edge mask: all of them).
shader_type spatial;
render_mode cull_disabled, diffuse_burley, specular_schlick_ggx;

#include "res://shaders/region_ground.gdshaderinc"

uniform int debug_view = 0;
uniform bool greybox = true;
uniform vec3 rock_col : source_color = vec3(0.74, 0.71, 0.66);
// the terrain's greybox colour (shaders/terrain3d.gdshader)
uniform vec3 top_col : source_color = vec3(0.47, 0.57, 0.38);
uniform float greybox_floor = 0.0;
uniform float greybox_span = 450.0;
// the limestone
uniform vec3 lime_pale : source_color = vec3(0.60, 0.61, 0.60);
uniform vec3 lime_warm : source_color = vec3(0.68, 0.60, 0.48);
uniform vec3 lime_stain : source_color = vec3(0.31, 0.33, 0.37);
// the waterfalls (tepui_water.gd): per fall a = its lip (map x, z), its outward normal (x, z); b = half its width at its foot,
// its top, its bottom
uniform vec4 fall_a[16];
uniform vec4 fall_b[16];
uniform int fall_n = 0;
global uniform vec2 world_offset;

varying float v_h;
varying float v_up;
varying float v_grass;
varying vec3 v_mp;
varying vec3 v_wn;
varying float v_wet;

void vertex() {
	vec3 wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_h = wpos.y;
	v_wn = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
	v_up = v_wn.y;
	v_grass = COLOR.r;
	v_mp = vec3(wpos.x + world_offset.x, wpos.y, wpos.z + world_offset.y);
	// (wet: the face beside and behind a fall, from its lip down, and all round its foot where the spray drifts)
	float wet = 0.0;
	for (int i = 0; i < fall_n; i++) {
		vec2 nr = fall_a[i].zw;
		vec2 rel = v_mp.xz - fall_a[i].xy;
		float out_d = dot(rel, nr);
		float side = abs(dot(rel, vec2(-nr.y, nr.x)));
		float hw = fall_b[i].x;
		float face = (1.0 - smoothstep(hw + 6.0, hw + 42.0, side)) * (1.0 - smoothstep(25.0, 70.0, abs(out_d - 6.0)));
		face *= 1.0 - smoothstep(fall_b[i].y + 1.0, fall_b[i].y + 6.0, v_mp.y);
		float foot = (1.0 - smoothstep(hw + 15.0, hw + 70.0, length(rel - nr * 25.0))) * (1.0 - smoothstep(fall_b[i].z + 5.0, fall_b[i].z + 60.0, v_mp.y));
		wet = max(wet, max(face, foot * 0.85));
	}
	v_wet = wet;
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
	vec3 p = v_mp;
	// (metres per pixel: the finest detail fades out far away, no shimmer)
	float px = length(fwidth(p));
	float fine = 1.0 - smoothstep(0.25, 1.4, px);
	float rag = rg_noise(p.xz * 0.08 + vec2(p.y * 0.05));
	// the grass: on the rock's marked top (lips, carved tops) wrapping well over the rounded lip with a ragged edge; elsewhere
	// only on near-level ground (the setbacks' ledges); and where the rubble runs out flat at its toe
	float rub = smoothstep(0.55, 0.75, v_up) * (1.0 - smoothstep(0.3, 0.7, v_grass));
	float gt = mix(smoothstep(0.93, 0.98, v_up), smoothstep(0.08, 0.3, v_up + (rag - 0.5) * 0.25), smoothstep(0.3, 0.7, v_grass));
	gt = max(gt, rub * smoothstep(0.76, 0.93, v_up + (rag - 0.5) * 0.3));
	vec3 col;
	float wet = 0.0;
	if (greybox) {
		col = mix(rock_col, top_col * mix(0.36, 1.3, clamp((v_h - greybox_floor) / greybox_span, 0.0, 1.0)), gt);
	} else {
		// triplanar weights (sharp, so the planes barely blend) - and only the planes that count are looked up
		vec3 tw = pow(abs(v_wn), vec3(4.0));
		tw /= tw.x + tw.y + tw.z;
		tw *= step(vec3(0.03), tw);
		tw /= max(tw.x + tw.y + tw.z, 1e-4);
		// per plane: big soft patches (pale to warm), long streaks of staining down the faces (stretched along the height on
		// the side planes), and the finer runnels
		float big = 0.0;
		float st = 0.0;
		float st2 = 0.0;
		if (gt < 0.995) {
			if (tw.x > 0.0) {
				big += tw.x * rg_noise(p.zy * vec2(0.0055, 0.008));
				st += tw.x * rg_noise(vec2(p.z * 0.085, p.y * 0.0075));
				st2 += tw.x * rg_noise(vec2(p.z * 0.33, p.y * 0.018) + 5.0);
			}
			if (tw.z > 0.0) {
				big += tw.z * rg_noise(p.xy * vec2(0.0055, 0.008));
				st += tw.z * rg_noise(vec2(p.x * 0.085, p.y * 0.0075));
				st2 += tw.z * rg_noise(vec2(p.x * 0.33, p.y * 0.018) + 5.0);
			}
			if (tw.y > 0.0) {
				big += tw.y * rg_noise(p.xz * 0.0055);
				st += tw.y * rg_noise(p.xz * 0.05);
				st2 += tw.y * rg_noise(p.xz * 0.2 + 5.0);
			}
		}
		// the layers: soft bands along the height, wandering a little
		float band = rg_noise(vec2(p.y * 0.065 + big * 1.5, 0.5));
		vec3 rock = mix(lime_pale, lime_warm, smoothstep(0.3, 0.78, big));
		rock *= mix(0.84, 1.06, band);
		rock = mix(rock, lime_stain, smoothstep(0.45, 0.85, st) * 0.62);
		// (the darker cracks and runnels between the streaks)
		rock *= 1.0 - smoothstep(0.62, 0.9, st2) * 0.28;
		rock *= 1.0 + (st2 - 0.5) * 0.3 * fine;
		// undersides (overhangs, the arches' soffits) a little darker
		rock *= mix(1.0, 0.8, smoothstep(-0.1, -0.6, v_up));
		// the rubble: darker and browner
		rock = mix(rock, rock * vec3(0.68, 0.64, 0.58), rub);
		// wet near the falls: darker, cooler, streaked
		wet = clamp(v_wet * (0.8 + 0.6 * st), 0.0, 1.0) * (1.0 - gt);
		rock = mix(rock, rock * vec3(0.4, 0.45, 0.5) * (0.85 + 0.3 * st2), wet);
		col = gt > 0.002 ? mix(rock, region_lawn(p.xz, fine), gt) : rock;
	}
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
	// (the top matches the terrain's surface; wet rock glossy)
	ROUGHNESS = mix(mix(0.93, 0.4, wet), 0.92, gt);
	SPECULAR = mix(mix(0.15, 0.5, wet), 0.2, gt);
}
