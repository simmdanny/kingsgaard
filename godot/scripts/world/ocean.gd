extends MeshInstance3D
## THE SEA (scripts/world/ocean.gd): one flat sheet at sea level, 60 km across, following the camera in 64 m steps.
## All the look is in shaders/water.gdshader (depth from the depth buffer: clear shallows, foam on the beach, deep blue offshore).

var focus := Vector3.ZERO


func _ready() -> void:
	var pm := PlaneMesh.new()
	pm.size = Vector2(60000.0, 60000.0)
	pm.subdivide_width = 63
	pm.subdivide_depth = 63
	mesh = pm
	cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF


func _process(_dt: float) -> void:
	position = Vector3(snappedf(focus.x, 64.0), 0.0, snappedf(focus.z, 64.0))
