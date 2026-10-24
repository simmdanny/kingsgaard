// THE REGION'S ROCK (shaders/region_wall.gdshader): the sheer plateau walls and every carved feature - arches, supports,
// overhangs, pillars, sinkholes (tepui_region.gd builds them as separate meshes) - one material for all of it.
// Pale limestone: big soft patches between a cool pale grey and a warm sandy grey, soft horizontal bands where the layers run,
// long vertical streaks of staining down the faces, all mapped triplanar in map coordinates (no stretching on any face, the
// finest detail fading out far away). Its large detail is stylized and procedural (no texture, so nothing tiles): vertical
// grooves - the main pattern - wandering a little and starting and stopping down the face, a few wavy horizontal strata lines
// with a lit ledge over each and a stain running down from it, here and there a crack with chipped, paler rims; crisp means
// sharp edges on those (about a pixel wide at any distance), not more small noise - up close only a very soft micro-variation.
// Readable from 20 - 50 m, faded out by some 200 - 500 m (where it no longer shows, and before it could shimmer), so the far
// walls - most of the rock on screen - skip it. The undersides of overhangs and arches a little darker, the rubble at the walls' feet
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
uniform vec3 lime_stain : source_color = vec3(0.25, 0.27, 0.31);
// the graphics preset: 0 low (patches and streaks), 1 medium (+ the finer runnels, the grooves and strata with their relief),
// 2 high (+ cracks, the stains under the ledges, the soft micro-variation up close)
uniform int rock_quality = 2;
// toward the sun (world): lit faces warmer, shaded ones cooler
uniform vec3 sun_dir = vec3(0.45, 0.52, 0.72);
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

vec2 rk_hash2(vec2 p) {
	return vec2(rg_hash(p), rg_hash(p + vec2(17.0, 41.0)));
}

// a side face's large detail at f (x along the wall, y up, metres), px metres per pixel: x = the albedo's factor, y / z = the
// relief's slopes along the wall and up it (the normal tilts that way)
vec3 rk_face(vec2 f, float px, bool high) {
	float alb = 1.0;
	float su = 0.0;
	float sy = 0.0;
	// vertical grooves, 7 m cells: each its own middle, width and depth, wandering a little as it runs down, starting and
	// stopping; the floor in shade, the walls turned into it, a chipped paler rim along each edge
	float fade_g = 1.0 - smoothstep(0.25, 0.6, px);
	if (fade_g > 0.0) {
		float W = 7.0;
		float uw = f.x + (rg_noise(vec2(f.x * 0.012, f.y * 0.01)) - 0.5) * 14.0 + (rg_noise(vec2(f.x * 0.05, f.y * 0.03) + 3.7) - 0.5) * 3.0;
		float gi = floor(uw / W);
		float gf = fract(uw / W);
		float gc = 0.3 + 0.4 * rg_hash(vec2(gi, 7.0));
		float gw = 0.16 + 0.3 * rg_hash(vec2(gi, 13.0));
		float on = step(0.22, rg_hash(vec2(gi, 29.0))) * smoothstep(0.35, 0.6, rg_noise(vec2(gi * 3.1, f.y * 0.012))) * fade_g;
		float d = (gf - gc) / gw;
		float ad = abs(d);
		float ew = max(px * 0.8 / (W * gw), 0.03);
		float inside = 1.0 - smoothstep(1.0 - ew, 1.0 + ew, ad);
		float wall = smoothstep(0.3, 0.9, ad) * inside;
		float rim = smoothstep(1.0 - ew, 1.0 + ew, ad) - smoothstep(1.1, 1.1 + ew + 0.06, ad);
		alb *= 1.0 - on * inside * (0.1 + 0.14 * (1.0 - ad * ad));
		alb *= 1.0 + 0.07 * on * rim;
		su -= sign(d) * wall * on * 0.7;
	}
	// a few strata lines, some 24 m apart: wavy, here and there; a dark recess with a lit ledge over it (and on high a stain
	// running down from it)
	float fade_s = 1.0 - smoothstep(0.3, 0.8, px);
	if (fade_s > 0.0) {
		float L = 24.0;
		float yy = f.y + (rg_noise(vec2(f.x * 0.006, 3.1)) - 0.5) * 10.0 + (rg_noise(vec2(f.x * 0.04, 8.3)) - 0.5) * 1.5;
		float li = floor(yy / L);
		float present = step(0.45, rg_hash(vec2(li, 51.0))) * smoothstep(0.4, 0.6, rg_noise(vec2(f.x * 0.01, li * 5.3))) * fade_s;
		float dm = (fract(yy / L) - (0.2 + 0.6 * rg_hash(vec2(li, 77.0)))) * L;
		float th = 0.3 + 0.45 * rg_hash(vec2(li, 93.0));
		float es = max(px * 0.7, 0.03);
		float line = 1.0 - smoothstep(th - es, th + es, abs(dm));
		float ledge = smoothstep(th - es, th + es, dm) - smoothstep(th + 0.45, th + 0.45 + es + 0.08, dm);
		alb *= 1.0 - 0.3 * line * present;
		alb *= 1.0 + 0.1 * ledge * present;
		sy += (ledge * 0.55 - line * 0.35) * present;
		if (high) {
			float stain = (1.0 - smoothstep(0.0, 10.0, -dm - th)) * step(dm, -th) * smoothstep(0.5, 0.72, rg_noise(vec2(f.x * 0.22, li * 7.7)));
			alb *= 1.0 - 0.12 * stain * present;
		}
	}
	if (high) {
		// cracks: the edges between cells 16 m across and 32 m tall (so mostly running down), only some of them, with chipped
		// paler rims
		float fade_c = 1.0 - smoothstep(0.08, 0.25, px);
		if (fade_c > 0.0) {
			vec2 cq = vec2(f.x, f.y * 0.5) / 16.0;
			vec2 ci = floor(cq);
			vec2 cf = fract(cq);
			float f1 = 8.0;
			float f2 = 8.0;
			for (int j = -1; j <= 1; j++) {
				for (int i = -1; i <= 1; i++) {
					vec2 o = vec2(float(i), float(j));
					float dd = length(o + rk_hash2(ci + o) - cf);
					if (dd < f1) {
						f2 = f1;
						f1 = dd;
					} else if (dd < f2) {
						f2 = dd;
					}
				}
			}
			float edge = (f2 - f1) * 8.0;
			float cmask = smoothstep(0.55, 0.7, rg_noise(cq * 1.3 + 9.1)) * fade_c;
			float ec = max(px * 0.8, 0.03);
			float crack = 1.0 - smoothstep(0.12 - ec, 0.12 + ec, edge);
			float chip = smoothstep(0.12, 0.12 + ec, edge) - smoothstep(0.45, 0.45 + ec + 0.08, edge);
			alb *= 1.0 - 0.35 * crack * cmask;
			alb *= 1.0 + 0.08 * chip * cmask;
		}
		// up close: a very soft micro-variation (2 m blobs, +-3%), no fine noise
		alb *= 1.0 + (rg_noise(f * vec2(0.5, 0.35)) - 0.5) * 0.06 * (1.0 - smoothstep(0.02, 0.1, px));
	}
	return vec3(alb, su, sy);
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
		// triplanar weights (sharp, so the planes barely blend and nothing smears where they meet) - and only the planes that
		// count are looked up
		vec3 tw = pow(abs(v_wn), vec3(8.0));
		tw /= tw.x + tw.y + tw.z;
		tw *= step(vec3(0.03), tw);
		tw /= max(tw.x + tw.y + tw.z, 1e-4);
		// per plane: big soft patches (pale to warm), long streaks of staining down the faces (stretched along the height on
		// the side planes), the finer runnels (medium and high), and on the side planes the large stylized detail - grooves,
		// strata, cracks (rk_face)
		float big = 0.0;
		float st = 0.0;
		float st2 = 0.5;
		vec3 dn = vec3(0.0);
		float detail = 1.0;
		if (gt < 0.995) {
			st2 = 0.0;
			bool runnels = rock_quality >= 1;
			bool shaped = rock_quality >= 1 && px < 0.8;
			bool high = rock_quality >= 2;
			detail = 0.0;
			if (tw.x > 0.0) {
				big += tw.x * rg_noise(p.zy * vec2(0.0055, 0.008));
				st += tw.x * rg_noise(vec2(p.z * 0.085, p.y * 0.0075));
				st2 += tw.x * (runnels ? rg_noise(vec2(p.z * 0.33, p.y * 0.018) + 5.0) : 0.5);
				vec3 fd = shaped ? rk_face(p.zy, px, high) : vec3(1.0, 0.0, 0.0);
				detail += tw.x * fd.x;
				dn += tw.x * vec3(0.0, fd.z, fd.y);
			}
			if (tw.z > 0.0) {
				big += tw.z * rg_noise(p.xy * vec2(0.0055, 0.008));
				st += tw.z * rg_noise(vec2(p.x * 0.085, p.y * 0.0075));
				st2 += tw.z * (runnels ? rg_noise(vec2(p.x * 0.33, p.y * 0.018) + 5.0) : 0.5);
				vec3 fd = shaped ? rk_face(p.xy, px, high) : vec3(1.0, 0.0, 0.0);
				detail += tw.z * fd.x;
				dn += tw.z * vec3(fd.y, fd.z, 0.0);
			}
			if (tw.y > 0.0) {
				big += tw.y * rg_noise(p.xz * 0.0055);
				st += tw.y * rg_noise(p.xz * 0.05);
				st2 += tw.y * (runnels ? rg_noise(p.xz * 0.2 + 5.0) : 0.5);
				// (tops and undersides: no grooves or strata, the soft micro-variation only)
				detail += tw.y * (high ? 1.0 + (rg_noise(p.xz * 0.5) - 0.5) * 0.06 * (1.0 - smoothstep(0.02, 0.1, px)) : 1.0);
			}
		}
		// the layers: soft bands along the height, wandering a little
		float band = rg_noise(vec2(p.y * 0.065 + big * 1.5, 0.5));
		vec3 rock = mix(lime_pale, lime_warm, smoothstep(0.3, 0.78, big));
		rock *= mix(0.84, 1.06, band);
		rock = mix(rock, lime_stain, smoothstep(0.42, 0.85, st) * 0.7);
		// (the darker cracks and runnels between the streaks)
		rock *= 1.0 - smoothstep(0.62, 0.9, st2) * 0.3;
		rock *= 1.0 + (st2 - 0.5) * 0.3 * fine;
		// (the grooves, strata and cracks)
		rock *= detail;
		// undersides (overhangs, the arches' soffits) a little darker
		rock *= mix(1.0, 0.8, smoothstep(-0.1, -0.6, v_up));
		// lit faces warmer, faces turned from the sun cooler and bluer (never black: the sky fills them)
		float ndl = dot(v_wn, normalize(sun_dir));
		rock *= mix(vec3(0.82, 0.9, 1.06), vec3(1.08, 1.0, 0.86), smoothstep(-0.15, 0.45, ndl));
		// the rubble: darker and browner
		rock = mix(rock, rock * vec3(0.68, 0.64, 0.58), rub);
		// wet near the falls: darker, cooler, streaked
		wet = clamp(v_wet * (0.8 + 0.6 * st), 0.0, 1.0) * (1.0 - gt);
		rock = mix(rock, rock * vec3(0.4, 0.45, 0.5) * (0.85 + 0.3 * st2), wet);
		col = gt > 0.002 ? mix(rock, region_lawn(p.xz, p.y, v_wn, fine), gt) : rock;
		// (the relief of the grooves and ledges)
		if (length(dn) > 0.0) {
			vec3 wn = normalize(v_wn * (FRONT_FACING ? 1.0 : -1.0) + dn * (1.0 - gt));
			NORMAL = normalize((VIEW_MATRIX * vec4(wn, 0.0)).xyz);
		}
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
