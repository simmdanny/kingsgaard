extends Node
## THE SETTINGS (scripts/ui/settings.gd, autoload "Settings"): the player's options, kept in user://settings.cfg between launches.
## The menu changes them through set_option(); main.gd listens to `changed` and applies them to the window and the world.
## Screenshot runs (Shot) ignore the saved file, so their numbers stay comparable.

signal changed

const PATH := "user://settings.cfg"
const KEYS := ["window", "vsync", "render_scale", "shadows", "grass", "trees", "sensitivity", "info"]
const SCALES := [0.5, 0.75, 1.0]

var window := 0  ## 0 windowed, 1 fullscreen
var vsync := true
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


func save_file() -> void:
	var cf := ConfigFile.new()
	for k in KEYS:
		cf.set_value("options", k, get(k))
	cf.save(PATH)


func set_option(key: String, value) -> void:
	set(key, value)
	changed.emit()
