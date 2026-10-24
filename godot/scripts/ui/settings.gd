extends Node
## THE SETTINGS (scripts/ui/settings.gd, autoload "Settings"): the player's options, kept in user://settings.cfg between launches.
## The menu changes them through set_option(); main.gd listens to `changed` and applies them to the window and the world.
## Screenshot runs (Shot) ignore the saved file, so their numbers stay comparable.
## Graphics presets (Low / Medium / High): picking one sets the render scale and the shadows to its own values (they can still be
## changed one by one afterwards) and everything only the preset decides - the anti-aliasing, how far the meshes' coarser
## levels of detail reach, the detail of the rock, the water, the clouds and the spray (main.gd apply_settings).

signal changed

const PATH := "user://settings.cfg"
const KEYS := ["window", "vsync", "graphics", "render_scale", "shadows", "grass", "trees", "sensitivity", "info"]
const SCALES := [0.5, 0.67, 0.75, 1.0]
## per preset: render_scale (index into SCALES) and shadows (0 off, 1 low: one cascade to 60 m, 2 high: two cascades to 100 m)
## for the settings rows; aa 1 FXAA, 2 SMAA (no MSAA: it cost 14 - 18 ms at 1080p on the Intel HD 520); lod = the mesh level of
## detail's allowed error in pixels (higher: coarser meshes sooner); rock / water 0 low .. 2 high (the rock's grooves and
## strata from medium, its cracks from high); clouds = the sky clouds' layers of lumps; spray = the spray clouds' size; drops =
## the share of fine drops drawn; soft = the spray and the canyon's clouds faded softly against what is behind them (reads the
## depth texture); far_shadows = four cascades to 200 m
const PRESETS := [
	{"name": "Low", "render_scale": 0, "shadows": 1, "aa": 1, "lod": 4.0, "rock": 0, "water": 0, "clouds": 3, "spray": 0.5, "drops": 0.35,
		"soft": false, "far_shadows": false},
	{"name": "Medium", "render_scale": 2, "shadows": 2, "aa": 2, "lod": 2.0, "rock": 1, "water": 1, "clouds": 4, "spray": 0.62, "drops": 0.7,
		"soft": true, "far_shadows": false},
	{"name": "High", "render_scale": 3, "shadows": 2, "aa": 2, "lod": 1.0, "rock": 2, "water": 2, "clouds": 5, "spray": 0.62, "drops": 1.0,
		"soft": true, "far_shadows": true},
]

var window := 0  ## 0 windowed, 1 fullscreen
var vsync := true
var graphics := 1  ## index into PRESETS
var render_scale := 2  ## index into SCALES
var shadows := 2  ## off, low, high
var grass := 2  ## off, low, high
var trees := 1  ## near, far
var sensitivity := 1.0
var info := false  ## the F1 overlay (fps, position, streaming counters)


func _ready() -> void:
	if not Shot.active:
		load_file()


func load_file() -> void:
	var cf := ConfigFile.new()
	if cf.load(PATH) != OK:
		return
	for k in KEYS:
		set(k, cf.get_value("options", k, get(k)))
	# (a file from before the 67 % render scale: its 75 % and 100 % one place on)
	if int(cf.get_value("options", "scales", 1)) < 2 and cf.has_section_key("options", "render_scale"):
		render_scale = [0, 2, 3][clampi(int(cf.get_value("options", "render_scale")), 0, 2)]


func save_file() -> void:
	var cf := ConfigFile.new()
	for k in KEYS:
		cf.set_value("options", k, get(k))
	cf.set_value("options", "scales", 2)
	cf.save(PATH)


func set_option(key: String, value) -> void:
	set(key, value)
	changed.emit()


## a graphics preset: its own values into the render scale and the shadows too
func apply_preset(p: int, emit := true) -> void:
	graphics = clampi(p, 0, PRESETS.size() - 1)
	var pr: Dictionary = PRESETS[graphics]
	render_scale = pr.render_scale
	shadows = pr.shadows
	if emit:
		changed.emit()
