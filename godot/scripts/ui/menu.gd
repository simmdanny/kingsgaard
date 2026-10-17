extends CanvasLayer
## THE MENUS (scripts/ui/menu.gd): the browser game's title screen, rebuilt (src/menu in the HTML repo). Its black-hole painting
## (assets/menu/kingsgaard-menu.jpg, painted by code for the HTML version) fills the screen, darkened on the left where the
## words live, with the same live touches drawn over it: a slow breath of light round the singularity, motes spiralling into
## it, embers and ash drifting up, a haze, a vignette. The same type: KINGSGAARD in Cinzel with a gold gradient over a thin gold
## rule with a diamond, the menu words in spaced Cormorant Garamond capitals that grow a gold diamond and an underline on hover;
## "A realm beneath a dragon's shadow" at the foot. Play -> the hero -> "Forging the realm" (the gold ring) while the world
## streams in behind. Settings, Controls and Credits are panels in the HTML Load panel's style (a Back word, a Cinzel heading,
## dark cards with a thin gold edge). In the game Esc opens the same menu over the darkened game as the pause menu.
## Layout units are the 1280 x 720 base the window stretches from (project: canvas_items stretch).

const IMG_SIZE := Vector2(3840.0, 2160.0)
const IMG_POS := Vector2(0.5, 0.62)  # the painting's object-position
const HOLE := Vector3(0.6016, 0.463, 0.07)  # the singularity in the painting: x, y (of its size) and radius (of its width)
const INK := Color(0.020, 0.027, 0.043)
const IVORY := Color(0.925, 0.894, 0.816)
const SILVER := Color(0.706, 0.737, 0.796)
const GOLD := Color(0.788, 0.659, 0.404)
const WORD := Color(0.804, 0.776, 0.706)
const WORD_HI := Color(0.965, 0.925, 0.816)
const HEAD := Color(0.894, 0.839, 0.682)
const WGHT := 0x77676874  # the OpenType tag of the weight axis ("wght")
const LEFT := 79.0
const COL_W := 435.0

var main
var in_game := false

var _cinzel: FontFile
var _cormorant: FontFile
var _art: Control
var _img: TextureRect
var _fx: Control
var _dim: ColorRect
var _overlay: ColorRect
var _body: VBoxContainer
var _stack: Control
var _foot: Label
var _credit: Label
var _veil: Control
var _screens := {}
var _current := ""
var _back_to := "title"
var _wait_t := 0.0
var _loading := false
var _t := 0.0
var _embers := []
var _motes := []
var _fade := 0.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	layer = 10
	_cinzel = load("res://assets/fonts/Cinzel.ttf")
	_cormorant = load("res://assets/fonts/CormorantGaramond.ttf")
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.theme = _theme()
	add_child(root)
	# the painting and its live touches
	_art = Control.new()
	_art.set_anchors_preset(Control.PRESET_FULL_RECT)
	_art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_art)
	var ink := ColorRect.new()
	ink.color = INK
	ink.set_anchors_preset(Control.PRESET_FULL_RECT)
	_art.add_child(ink)
	_img = TextureRect.new()
	_img.texture = load("res://assets/menu/kingsgaard-menu.jpg")
	_img.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_img.stretch_mode = TextureRect.STRETCH_SCALE
	_img.modulate.a = 0.0
	_art.add_child(_img)
	_fx = Control.new()
	_fx.set_anchors_preset(Control.PRESET_FULL_RECT)
	_fx.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var add := CanvasItemMaterial.new()
	add.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	_fx.material = add
	_fx.draw.connect(_draw_fx)
	_art.add_child(_fx)
	# over the game when paused
	_dim = ColorRect.new()
	_dim.color = Color(0.012, 0.02, 0.035, 0.62)
	_dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_dim.visible = false
	root.add_child(_dim)
	# the dark side for the words, the top and bottom shades, the vignette
	_overlay = ColorRect.new()
	_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sm := ShaderMaterial.new()
	sm.shader = load("res://shaders/menu_shade.gdshader")
	_overlay.material = sm
	root.add_child(_overlay)
	# the words
	_body = VBoxContainer.new()
	_body.anchor_top = 0.0
	_body.anchor_bottom = 1.0
	_body.offset_left = LEFT
	_body.offset_right = LEFT + COL_W
	_body.alignment = BoxContainer.ALIGNMENT_CENTER
	_body.add_theme_constant_override("separation", 36)
	root.add_child(_body)
	_body.add_child(_title_block())
	_stack = VBoxContainer.new()
	_body.add_child(_stack)
	_screens.title = _nav([["Play", _open.bind("heroes")], ["Settings", _open_sub.bind("settings")], ["Controls", _open_sub.bind("controls")],
		["Credits", _open_sub.bind("credits")], ["Quit", _quit]])
	_screens.heroes = _panel("Your hero", _nav([["Female", _choose.bind("female")], ["Male", _choose.bind("male")]]))
	_screens.settings = _panel("Settings", _settings())
	_screens.controls = _panel("Controls", _controls())
	_screens.credits = _panel("Credits", _credits())
	_screens.pause = _nav([["Resume", resume], ["Settings", _open_sub.bind("settings")], ["Controls", _open_sub.bind("controls")],
		["Title screen", _to_title], ["Quit", _quit]])
	for k in _screens:
		_stack.add_child(_screens[k])
	_foot = _text("A REALM BENEATH A DRAGON'S SHADOW", _cormorant, 500, 12, 4, Color(SILVER, 0.38))
	_foot.anchor_top = 1.0
	_foot.anchor_bottom = 1.0
	_foot.offset_left = LEFT
	_foot.offset_top = -38.0
	root.add_child(_foot)
	# the models' credits (the male model's CC-BY-4.0 license asks for it wherever the game is shared)
	_credit = _text("HEROES BASED ON A MODEL BY ALICEWITHALEX (CC-BY-4.0)", _cormorant, 500, 11, 2, Color(SILVER, 0.3))
	_credit.anchor_left = 1.0
	_credit.anchor_right = 1.0
	_credit.anchor_top = 1.0
	_credit.anchor_bottom = 1.0
	_credit.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	_credit.offset_right = -28.0
	_credit.offset_top = -38.0
	root.add_child(_credit)
	_veil = _make_veil()
	root.add_child(_veil)
	var rng := RandomNumberGenerator.new()
	for i in 46:
		_embers.append({"x": rng.randf(), "y": rng.randf(), "vx": -0.004 - 0.006 * rng.randf(), "vy": -0.008 - 0.012 * rng.randf(),
			"s": 0.6 + rng.randf() * 1.5, "ph": rng.randf() * TAU, "w": rng.randf() < 0.6})
	for i in 58:
		_motes.append({"a": rng.randf() * TAU, "r": 0.03 + rng.randf() * 0.2, "s": 0.4 + rng.randf() * 0.9, "k": rng.randf()})
	show_screen("title")


# ---- flow ------------------------------------------------------------------------------------------------------------

func show_screen(name: String) -> void:
	_current = name
	for k in _screens:
		_screens[k].visible = k == name
	_veil.visible = name == "loading"
	var first := _first_focus(_screens.get(name, _veil))
	if first != null:
		first.grab_focus.call_deferred()


func _open(name: String) -> void:
	show_screen(name)


## settings / controls / credits: Back returns to where they were opened from (the title or the pause menu)
func _open_sub(name: String) -> void:
	_back_to = "pause" if in_game else "title"
	show_screen(name)


func _back() -> void:
	match _current:
		"settings":
			Settings.save_file()
			show_screen(_back_to)
		"controls", "credits":
			show_screen(_back_to)
		"heroes":
			show_screen("title")
		"pause":
			resume()


func _choose(kind: String) -> void:
	main.player.set_hero(kind)
	_loading = true
	_wait_t = 0.0
	show_screen("loading")


## the pause menu, over the game
func pause() -> void:
	in_game = true
	visible = true
	_art.visible = false
	_dim.visible = true
	show_screen("pause")
	if not Shot.active:
		get_tree().paused = true


func resume() -> void:
	visible = false
	get_tree().paused = false


func _to_title() -> void:
	get_tree().paused = false
	get_tree().reload_current_scene()


func _quit() -> void:
	Settings.save_file()
	get_tree().quit()


func _process(dt: float) -> void:
	if _loading:
		_wait_t += dt
		if main.world_idle() or _wait_t > 25.0:
			_loading = false
			in_game = true
			visible = false
	if not visible:
		return
	_t += dt
	_layout_art()
	if _art.visible:
		_fade = minf(1.0, _fade + dt / 1.6)
		_img.modulate.a = 1.0 - pow(1.0 - _fade, 3.0)
		_step_fx(minf(dt, 0.05))
		_fx.queue_redraw()
	if _veil.visible:
		_veil.queue_redraw()


func _unhandled_input(e: InputEvent) -> void:
	if not e.is_action_pressed("ui_cancel"):
		return
	if visible:
		if _current != "loading" and _current != "title":
			_back()
	elif in_game:
		pause()
	get_viewport().set_input_as_handled()


# ---- the painting and its live touches -------------------------------------------------------------------------------

## the painting's rect: covering the screen, placed like CSS object-position 50% 62%
func _img_rect() -> Rect2:
	var vs := _art.size
	var sc := maxf(vs.x / IMG_SIZE.x, vs.y / IMG_SIZE.y)
	var d := IMG_SIZE * sc
	return Rect2((vs - d) * IMG_POS, d)


func _layout_art() -> void:
	var r := _img_rect()
	_img.position = r.position
	_img.size = r.size
	(_overlay.material as ShaderMaterial).set_shader_parameter("px", _overlay.size)
	(_overlay.material as ShaderMaterial).set_shader_parameter("t", _t)


func _step_fx(dt: float) -> void:
	for d in _motes:
		var r0: float = d.r
		var sp: float = (0.12 + 0.05 / (r0 + 0.02)) * d.s
		d.a += sp * dt * (1.4 + 0.5 / (r0 * 8.0 + 0.4))
		d.r -= dt * (0.006 + 0.02 * (1.0 - minf(1.0, r0 * 5.0))) * d.s
		d["sp"] = sp
		if d.r < 0.012:
			d.r = 0.16 + randf() * 0.1
			d.a = randf() * TAU
			d.k = randf()
	for e in _embers:
		e.x += e.vx * dt
		e.y += e.vy * dt + sin(_t * 0.6 + e.ph) * 0.0005
		if e.y < -0.02:
			e.y = 1.02
			e.x = randf()
		if e.x < -0.02:
			e.x = 1.02


func _draw_fx() -> void:
	var R := _img_rect()
	var h := R.position + Vector2(HOLE.x, HOLE.y) * R.size
	var hr := HOLE.z * R.size.x
	# a very slow breath of light round the singularity: rings of falling alpha out to 3.4 radii
	var br := 0.5 + 0.5 * sin(_t * 0.7)
	for i in 14:
		var f := float(i) / 13.0
		var rad := hr * lerpf(3.4, 0.6, f)
		var a := lerpf(0.0, (0.035 + 0.02 * br), clampf(f * 2.0, 0.0, 1.0)) + lerpf(0.0, 0.065 + 0.05 * br, clampf(f * 2.0 - 1.0, 0.0, 1.0))
		_fx.draw_circle(h, rad, Color(0.55, 0.62, 0.95, a / 6.0))
	# motes drawn in towards the void: faster and flatter as they fall
	for d in _motes:
		if not d.has("sp"):
			continue
		var rr: float = d.r * R.size.x
		var p := h + Vector2(cos(d.a) * rr, sin(d.a) * rr * 0.5)
		var q := h + Vector2(cos(d.a - d.sp * 0.05) * rr, sin(d.a - d.sp * 0.05) * rr * 0.5)
		var fade := minf(1.0, (d.r - 0.012) * 28.0) * minf(1.0, (0.26 - d.r) * 14.0)
		var c := Color(0.745, 0.843, 1.0) if d.k < 0.5 else Color(0.922, 0.882, 1.0)
		c.a = 0.55 * maxf(fade, 0.0)
		_fx.draw_line(q, p, c, 0.6 + d.s * 0.9, true)
	# embers and ash
	for e in _embers:
		var p := R.position + Vector2(e.x, e.y) * R.size
		if p.x < -4.0 or p.y < -4.0 or p.x > _fx.size.x + 4.0 or p.y > _fx.size.y + 4.0:
			continue
		var fl := 0.55 + 0.45 * sin(_t * (1.1 + e.s) + e.ph)
		var c := Color(1.0, 0.77, 0.51, 0.5 * fl) if e.w else Color(0.667, 0.706, 0.784, 0.28 * fl)
		_fx.draw_circle(p, e.s, c)


# ---- the title -------------------------------------------------------------------------------------------------------

func _title_block() -> VBoxContainer:
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 14)
	var title := Control.new()
	title.custom_minimum_size = Vector2(COL_W, 50.0)
	var glow := _text("KINGSGAARD", _cinzel, 600, 43, 6, Color(0, 0, 0, 0))
	glow.add_theme_constant_override("outline_size", 16)
	glow.add_theme_color_override("font_outline_color", Color(GOLD, 0.07))
	title.add_child(glow)
	var shadow := _text("KINGSGAARD", _cinzel, 600, 43, 6, Color(0, 0, 0, 0.55))
	shadow.position = Vector2(0.0, 2.0)
	title.add_child(shadow)
	var front := _text("KINGSGAARD", _cinzel, 600, 43, 6, Color.WHITE)
	var gm := ShaderMaterial.new()
	gm.shader = load("res://shaders/gold_text.gdshader")
	front.material = gm
	title.add_child(front)
	box.add_child(title)
	var rule := Control.new()
	rule.custom_minimum_size = Vector2(COL_W, 10.0)
	rule.draw.connect(func():
		var w := rule.size.x
		var y := rule.size.y * 0.5
		var seg := (w - 10.0 - 24.0) * 0.5
		_fade_line(rule, Vector2(0.0, y), seg, 0.75)
		var cx := seg + 12.0 + 5.0
		var pts := PackedVector2Array([Vector2(cx, y - 5.0), Vector2(cx + 5.0, y), Vector2(cx, y + 5.0), Vector2(cx - 5.0, y)])
		rule.draw_colored_polygon(pts, Color(GOLD, 0.18))
		pts.append(pts[0])
		rule.draw_polyline(pts, GOLD, 1.0, true)
		_fade_line(rule, Vector2(cx + 5.0 + 12.0, y), seg, 0.75))
	box.add_child(rule)
	return box


## a 1 px line fading from gold (alpha a) to nothing, left to right
static func _fade_line(ci: CanvasItem, from: Vector2, length: float, a: float) -> void:
	ci.draw_polygon(PackedVector2Array([from, from + Vector2(length, 0.0), from + Vector2(length, 1.0), from + Vector2(0.0, 1.0)]),
		PackedColorArray([Color(GOLD, a), Color(GOLD, 0.0), Color(GOLD, 0.0), Color(GOLD, a)]))


# ---- screens ---------------------------------------------------------------------------------------------------------

func _nav(items: Array) -> VBoxContainer:
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 2)
	for it in items:
		var b := GmButton.new(it[0], _fv(_cormorant, 600, 8), 24)
		b.pressed.connect(it[1])
		box.add_child(b)
	return box


## a panel in the HTML Load panel's style: a Back word and a Cinzel heading over its content
func _panel(heading: String, content: Control) -> VBoxContainer:
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)
	var back := Button.new()
	back.text = "‹ BACK"
	back.theme_type_variation = "GmBack"
	back.pressed.connect(_back)
	row.add_child(back)
	var h := _text(heading.to_upper(), _cinzel, 600, 22, 5, HEAD)
	h.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row.add_child(h)
	box.add_child(row)
	box.add_child(content)
	return box


func _settings() -> VBoxContainer:
	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(480.0, 0.0)
	box.add_theme_constant_override("separation", 6)
	_option(box, "Window", ["Windowed", "Fullscreen"], "window")
	_check(box, "VSync", "vsync")
	_option(box, "Render scale", ["50 %", "75 %", "100 %"], "render_scale")
	_option(box, "Shadows", ["Off", "Low", "High"], "shadows")
	_option(box, "Grass", ["Off", "Low", "High"], "grass")
	_option(box, "Tree distance", ["Near", "Far"], "trees")
	var s := HSlider.new()
	s.min_value = 0.2
	s.max_value = 3.0
	s.step = 0.1
	s.value = Settings.sensitivity
	s.custom_minimum_size = Vector2(200.0, 24.0)
	s.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	s.value_changed.connect(func(v): Settings.set_option("sensitivity", v))
	box.add_child(_card("Mouse sensitivity", s))
	_check(box, "Show info (F1)", "info")
	var hint := _text("Lower the render scale, shadows and grass for a faster game.", _cormorant, 500, 15, 1, Color(SILVER, 0.7))
	box.add_child(hint)
	return box


## one settings row: a dark card with a thin gold edge, the name on the left, the control on the right
func _card(name: String, control: Control) -> PanelContainer:
	var card := PanelContainer.new()
	card.theme_type_variation = "GmCard"
	var row := HBoxContainer.new()
	var l := _text(name, _cormorant, 600, 19, 1, IVORY)
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	l.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row.add_child(l)
	row.add_child(control)
	card.add_child(row)
	return card


func _option(box: VBoxContainer, name: String, items: Array, key: String) -> void:
	var o := OptionButton.new()
	for it in items:
		o.add_item(it)
	o.selected = Settings.get(key)
	o.custom_minimum_size = Vector2(170.0, 30.0)
	o.item_selected.connect(func(i): Settings.set_option(key, i))
	box.add_child(_card(name, o))


func _check(box: VBoxContainer, name: String, key: String) -> void:
	var cb := CheckButton.new()
	cb.button_pressed = Settings.get(key)
	cb.toggled.connect(func(on): Settings.set_option(key, on))
	box.add_child(_card(name, cb))


func _controls() -> VBoxContainer:
	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(480.0, 0.0)
	box.add_theme_constant_override("separation", 6)
	for row in [["W A S D", "Move"], ["Shift  /  Alt", "Run  /  sprint"], ["Space", "Jump"], ["Mouse drag", "Turn the camera"],
			["Mouse wheel", "Zoom"], ["F", "Fly over the land"], ["F1", "Info: fps, position"], ["Esc", "Pause menu  /  back"]]:
		var k := _text(row[0].to_upper(), _cormorant, 600, 16, 3, GOLD)
		k.custom_minimum_size = Vector2(150.0, 0.0)
		var line := HBoxContainer.new()
		line.add_child(k)
		line.add_child(_text(row[1], _cormorant, 600, 19, 1, IVORY))
		var card := PanelContainer.new()
		card.theme_type_variation = "GmCard"
		card.add_child(line)
		box.add_child(card)
	return box


func _credits() -> VBoxContainer:
	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(480.0, 0.0)
	box.add_theme_constant_override("separation", 6)
	for row in [["Heroes", ["Based on \"Low Poly Male Character [Free Download]\" by alicewithalex (sketchfab.com/alicewithalex),",
			"licensed under CC-BY-4.0. The female hero is the same model, reshaped in code."]],
			["Title painting and type", ["The painting from the browser Kingsgaard, painted in code", "Cinzel and Cormorant Garamond, SIL Open Font License"]],
			["Engine", ["Made with the Godot Engine (godotengine.org), MIT license, © the Godot Engine contributors"]]]:
		var card := PanelContainer.new()
		card.theme_type_variation = "GmCard"
		var v := VBoxContainer.new()
		v.add_child(_text(row[0].to_upper(), _cinzel, 600, 14, 3, HEAD))
		for line in row[1]:
			var l := _text(line, _cormorant, 600, 17, 0, IVORY)
			l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			l.custom_minimum_size = Vector2(440.0, 0.0)
			v.add_child(l)
		card.add_child(v)
		box.add_child(card)
	return box


## the loading veil: the gold ring turning over "Forging the realm"
func _make_veil() -> Control:
	var veil := ColorRect.new()
	veil.color = Color(0.012, 0.02, 0.035, 0.9)
	veil.set_anchors_preset(Control.PRESET_FULL_RECT)
	var box := VBoxContainer.new()
	box.set_anchors_preset(Control.PRESET_CENTER)
	box.grow_horizontal = Control.GROW_DIRECTION_BOTH
	box.grow_vertical = Control.GROW_DIRECTION_BOTH
	box.add_theme_constant_override("separation", 22)
	var ring := Control.new()
	ring.custom_minimum_size = Vector2(54.0, 54.0)
	ring.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	ring.draw.connect(func():
		var c := ring.size * 0.5
		var a0 := fmod(_t / 1.1, 1.0) * TAU
		ring.draw_arc(c, 26.5, 0.0, TAU, 64, Color(GOLD, 0.25), 1.0, true)
		ring.draw_arc(c, 26.5, a0 - PI * 0.75, a0 - PI * 0.25, 24, Color(GOLD, 0.55), 1.0, true)
		ring.draw_arc(c, 26.5, a0 - PI * 0.25, a0 + PI * 0.25, 24, GOLD, 1.0, true))
	veil.draw.connect(func(): ring.queue_redraw())
	box.add_child(ring)
	box.add_child(_text("FORGING THE REALM", _cinzel, 500, 15, 4, Color(0.851, 0.792, 0.624)))
	veil.add_child(box)
	veil.visible = false
	return veil


# ---- type and look ---------------------------------------------------------------------------------------------------

## a weight and letter spacing of a variable font
static func _fv(file: FontFile, weight: int, spacing: int) -> FontVariation:
	var f := FontVariation.new()
	f.base_font = file
	f.variation_opentype = {WGHT: weight}
	f.spacing_glyph = spacing
	return f


func _text(s: String, file: FontFile, weight: int, size: int, spacing: int, color: Color) -> Label:
	var l := Label.new()
	l.text = s
	l.add_theme_font_override("font", _fv(file, weight, spacing))
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


static func _first_focus(n: Node) -> Control:
	for c in n.get_children():
		if c is BaseButton or c is Range:
			return c
		var f := _first_focus(c)
		if f != null:
			return f
	return null


## the HTML menu's controls: cards (gm-save), the Back word (gm-back), dropdowns, switches and the slider in its colours
func _theme() -> Theme:
	var th := Theme.new()
	th.default_font = _fv(_cormorant, 600, 1)
	th.default_font_size = 18
	var card := func(bg_a: float, edge_a: float) -> StyleBoxFlat:
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(0.071, 0.094, 0.149, bg_a)
		sb.border_color = Color(GOLD, edge_a)
		sb.set_border_width_all(1)
		sb.set_corner_radius_all(3)
		sb.content_margin_left = 16.0
		sb.content_margin_right = 14.0
		sb.content_margin_top = 7.0
		sb.content_margin_bottom = 7.0
		return sb
	th.add_type("GmCard")
	th.set_type_variation("GmCard", "PanelContainer")
	th.set_stylebox("panel", "GmCard", card.call(0.72, 0.22))
	th.add_type("GmBack")
	th.set_type_variation("GmBack", "Button")
	var empty := StyleBoxEmpty.new()
	empty.content_margin_top = 6.0
	empty.content_margin_bottom = 6.0
	empty.content_margin_right = 10.0
	for st in ["normal", "hover", "pressed", "focus", "disabled"]:
		th.set_stylebox(st, "GmBack", empty)
	th.set_font("font", "GmBack", _fv(_cormorant, 600, 3))
	th.set_font_size("font_size", "GmBack", 15)
	th.set_color("font_color", "GmBack", SILVER)
	th.set_color("font_hover_color", "GmBack", WORD_HI)
	th.set_color("font_focus_color", "GmBack", WORD_HI)
	th.set_color("font_pressed_color", "GmBack", WORD_HI)
	var opt: StyleBoxFlat = card.call(0.9, 0.35)
	opt.content_margin_top = 3.0
	opt.content_margin_bottom = 3.0
	th.set_stylebox("normal", "OptionButton", opt)
	th.set_stylebox("hover", "OptionButton", card.call(0.95, 0.65))
	th.set_stylebox("pressed", "OptionButton", card.call(0.95, 0.9))
	th.set_stylebox("focus", "OptionButton", card.call(0.0, 0.8))
	th.set_color("font_color", "OptionButton", IVORY)
	th.set_color("font_hover_color", "OptionButton", WORD_HI)
	th.set_color("font_focus_color", "OptionButton", IVORY)
	th.set_stylebox("panel", "PopupMenu", card.call(0.97, 0.4))
	th.set_stylebox("hover", "PopupMenu", card.call(0.0, 0.55))
	th.set_color("font_color", "PopupMenu", IVORY)
	th.set_color("font_hover_color", "PopupMenu", WORD_HI)
	for st in ["normal", "hover", "pressed", "hover_pressed", "disabled"]:
		th.set_stylebox(st, "CheckButton", StyleBoxEmpty.new())
	th.set_stylebox("focus", "CheckButton", card.call(0.0, 0.8))
	var track := StyleBoxFlat.new()
	track.bg_color = Color(GOLD, 0.25)
	track.content_margin_top = 1.0
	track.content_margin_bottom = 1.0
	th.set_stylebox("slider", "HSlider", track)
	var fill := StyleBoxFlat.new()
	fill.bg_color = Color(GOLD, 0.8)
	fill.content_margin_top = 1.0
	fill.content_margin_bottom = 1.0
	th.set_stylebox("grabber_area", "HSlider", fill)
	th.set_stylebox("grabber_area_highlight", "HSlider", fill)
	return th


## a menu word (gm-btn): spaced capitals, no frame; on hover or focus it brightens, a gold diamond slides in on the left and a
## gold underline sweeps out under it
class GmButton extends Button:
	var glow := 0.0
	var _tw: Tween

	func _init(label: String, font: Font, size: int) -> void:
		text = label.to_upper()
		alignment = HORIZONTAL_ALIGNMENT_LEFT
		add_theme_font_override("font", font)
		add_theme_font_size_override("font_size", size)
		var sb := StyleBoxEmpty.new()
		sb.content_margin_left = 2.3 * size
		sb.content_margin_top = 0.42 * size
		sb.content_margin_bottom = 0.42 * size
		for st in ["normal", "hover", "pressed", "focus", "disabled", "hover_pressed"]:
			add_theme_stylebox_override(st, sb)
		add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.55))
		add_theme_constant_override("shadow_offset_y", 2)
		add_theme_constant_override("shadow_outline_size", 6)
		size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		_paint()
		mouse_entered.connect(_aim)
		mouse_exited.connect(_aim)
		focus_entered.connect(_aim)
		focus_exited.connect(_aim)

	func _aim() -> void:
		var on := is_hovered() or has_focus()
		if _tw != null:
			_tw.kill()
		_tw = create_tween()
		_tw.tween_method(_set_glow, glow, 1.0 if on else 0.0, 0.3).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)

	func _set_glow(v: float) -> void:
		glow = v
		_paint()
		queue_redraw()

	func _paint() -> void:
		var c := WORD.lerp(WORD_HI, glow)
		for k in ["font_color", "font_hover_color", "font_focus_color", "font_pressed_color", "font_hover_pressed_color"]:
			add_theme_color_override(k, c)

	func _draw() -> void:
		if glow <= 0.001:
			return
		var em := float(get_theme_font_size("font_size"))
		var y := size.y * 0.5
		var hd := 0.42 * em * (0.4 + 0.6 * glow) * 0.7071
		var cx := 0.36 * em - (1.0 - glow) * 0.9 * em
		var pts := PackedVector2Array([Vector2(cx, y - hd), Vector2(cx + hd, y), Vector2(cx, y + hd), Vector2(cx - hd, y)])
		draw_colored_polygon(pts, Color(GOLD, 0.35 * glow))
		pts.append(pts[0])
		draw_polyline(pts, Color(GOLD, glow), 1.0, true)
		var x0 := 2.3 * em
		var x1 := x0 + (size.x - x0) * glow
		var ly := size.y - 0.18 * em
		draw_polygon(PackedVector2Array([Vector2(x0, ly), Vector2(x1, ly), Vector2(x1, ly + 1.0), Vector2(x0, ly + 1.0)]),
			PackedColorArray([Color(GOLD, 0.9), Color(GOLD, 0.0), Color(GOLD, 0.0), Color(GOLD, 0.9)]))
