// THE WATERFALLS' SPRAY AND THE CANYON'S CLOUDS (shaders/region_mist.gdshader): billboards - shaders/region_mist.gdshaderinc,
// soft where they meet the water or the rock (the depth texture). The low preset uses region_mist_fast.gdshader (no depth
// texture read, no depth copy each frame for it).
shader_type spatial;
render_mode blend_mix, unshaded, depth_draw_never, cull_disabled, shadows_disabled, skip_vertex_transform;
#define SOFT_DEPTH
#include "res://shaders/region_mist.gdshaderinc"
