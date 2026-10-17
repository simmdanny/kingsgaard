extends SceneTree
## MENU FLOW TEST (scripts/tools/ui_flow_test.gd): runs the real game and walks the menus by pressing their buttons - title,
## Play, a hero, into the game, Esc to pause, Settings (grass off and back on), Back, Resume - checking each step. Leaves the
## settings as it found them.  Godot_console.exe --path <project> --resolution 1280x720 --script res://scripts/tools/ui_flow_test.gd

var main
var menu
var step := 0
var t := 0.0
var fails := 0
var saved := {}
var S  # the Settings autoload (looked up at run time: a --script main loop cannot name autoloads)


func _initialize() -> void:
	main = (load("res://scenes/main.tscn") as PackedScene).instantiate()
	S = root.get_node("Settings")
	root.add_child(main)
	current_scene = main


func _check(ok: bool, what: String) -> void:
	print(("PASS  " if ok else "FAIL  ") + what)
	if not ok:
		fails += 1


func _press(screen: String, text: String) -> void:
	for b in menu._screens[screen].find_children("*", "Button", true, false):
		if (b as Button).text.to_upper().trim_prefix("‹ ") == text.to_upper():
			(b as Button).pressed.emit()
			return
	_check(false, "button '%s' on %s" % [text, screen])


func _esc() -> void:
	var e := InputEventAction.new()
	e.action = "ui_cancel"
	e.pressed = true
	Input.parse_input_event(e)


func _process(dt: float) -> bool:
	t += dt
	match step:
		0:
			if t > 1.0:
				menu = main.menu
				for k in S.KEYS:
					saved[k] = S.get(k)
				_check(menu.visible and menu._current == "title", "launch shows the title screen")
				_press("title", "Play")
				_check(menu._current == "heroes", "Play opens the hero choice")
				_press("heroes", "Back")
				_check(menu._current == "title", "Back returns to the title")
				_press("title", "Play")
				_press("heroes", "Male")
				_check(menu._current == "loading", "choosing a hero shows Forging the realm")
				step = 1
				t = 0.0
		1:
			if not menu.visible or t > 40.0:
				_check(not menu.visible and menu.in_game, "the menu closes when the world is ready (%.1f s)" % t)
				_check(main.player.hero == "male", "the chosen hero is in the game")
				_esc()
				step = 2
				t = 0.0
		2:
			if t > 0.3:
				_check(menu.visible and menu._current == "pause" and paused, "Esc opens the pause menu and pauses")
				_press("pause", "Settings")
				_check(menu._current == "settings", "Settings opens from the pause menu")
				S.set_option("grass", 0)
				_check(not main.grass.visible, "Grass Off hides the grass")
				S.set_option("grass", saved.grass)
				# (a greybox region keeps the grass off whatever the setting)
				var grey: bool = main.region_cfg != null and main.region_cfg.greybox
				_check(main.grass.visible == (saved.grass > 0 and not grey), "Grass back on" + (" (stays off: greybox region)" if grey else ""))
				S.set_option("render_scale", 0)
				_check(is_equal_approx(main.get_viewport().scaling_3d_scale, 0.5), "Render scale 50 %")
				S.set_option("render_scale", saved.render_scale)
				_press("settings", "Back")
				_check(menu._current == "pause", "Back from Settings returns to the pause menu")
				_press("pause", "Resume")
				_check(not menu.visible and not paused, "Resume closes the menu and unpauses")
				_esc()
				step = 3
				t = 0.0
		3:
			if t > 0.3:
				_check(menu.visible and menu._current == "pause", "Esc pauses again")
				_esc()
				step = 4
				t = 0.0
		4:
			if t > 0.3:
				_check(not menu.visible and not paused, "Esc in the pause menu resumes")
				_esc()
				step = 5
				t = 0.0
		5:
			if t > 0.3:
				_press("pause", "Title screen")
				step = 6
				t = 0.0
		6:
			if t > 1.5:
				var fresh = current_scene
				_check(fresh != null and fresh != main and fresh.menu.visible and fresh.menu._current == "title" and not paused,
					"Title screen restarts the game at the title")
				for k in saved:
					S.set(k, saved[k])
				S.save_file()
				print("UI FLOW: %s (%d failed)" % ["OK" if fails == 0 else "FAILED", fails])
				return true
	return false
