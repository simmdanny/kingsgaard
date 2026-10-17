// THE ONE STONE'S PALETTE (shaders/inc/stone.gdshaderinc): the browser game's rock palette (src/world/wrlook.js PAL.brown, "warm tan
// everywhere") and its soft four tone steps, for every rock of the world: the boulders (shaders/stone.gdshader) and, in the stylized
// preset, the ground's steep slopes (shaders/b/terrain_b.gdshader). Needs shaders/inc/meadow.gdshaderinc first. Display (sRGB) colours.

uniform vec3 stone_r0 = vec3(0.30, 0.22, 0.16);
uniform vec3 stone_r1 = vec3(0.48, 0.39, 0.29);
uniform vec3 stone_r2 = vec3(0.66, 0.56, 0.43);
uniform vec3 stone_r3 = vec3(0.82, 0.73, 0.58);
uniform vec3 stone_warm = vec3(1.04, 1.0, 0.94);
uniform vec3 stone_cool = vec3(0.95, 0.96, 1.02);

// four soft tone steps (the browser game's: t quantised to quarters, 80 % of the way, the step edges smoothed)
float stone_steps(float t) { float q = t * 4.0; return mix(t, (floor(q) + smoothstep(0.3, 0.7, fract(q))) / 4.0, 0.8); }

// the stone of the ground's steep slopes (the rock look v59: lighter facing up, cooler underneath, its variation triplanar - soft,
// low contrast, no streaks): world point p, world normal n
vec3 stone_slope(vec3 p, vec3 n) {
	vec3 w = pow(abs(n), vec3(4.0));
	w /= (w.x + w.y + w.z);
	float v22 = vn2(p.zy / 22.0) * w.x + vn2(p.xz / 22.0) * w.y + vn2(p.xy / 22.0) * w.z;
	float v6 = vn2(p.zy / 6.0 + 3.1) * w.x + vn2(p.xz / 6.0 + 3.1) * w.y + vn2(p.xy / 6.0 + 3.1) * w.z;
	float up = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
	float t = 0.54 + 0.30 * (up - 0.5) + 0.16 * (v22 - 0.5) + 0.08 * (v6 - 0.5);
	vec3 col = ramp4(stone_steps(t), stone_r0, stone_r1, stone_r2, stone_r3);
	return mix(col, col * stone_cool * 0.9, clamp((1.0 - up) * 0.35, 0.0, 1.0));
}
