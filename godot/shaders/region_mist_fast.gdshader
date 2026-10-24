// THE WATERFALLS' SPRAY AND THE CANYON'S CLOUDS, LOW PRESET (shaders/region_mist_fast.gdshader): the same billboards
// (shaders/region_mist.gdshaderinc) without the soft fade against the scene behind them (no depth texture read).
shader_type spatial;
render_mode blend_mix, unshaded, depth_draw_never, cull_disabled, shadows_disabled, skip_vertex_transform;
#include "res://shaders/region_mist.gdshaderinc"
