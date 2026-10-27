class_name RiotEnforcer
extends CharacterBody2D

@export var max_health: int = 4

var health: int = 4
var state: String = "approach"
var state_timer: float = 0.0
var attack_resolved: bool = false
var player: CharacterBody2D
var arena: Node
@onready var shell: Polygon2D = $Shell
@onready var eye: Polygon2D = $Eye
@onready var tell: Polygon2D = $Tell

func _ready() -> void:
	health = max_health
	player = get_tree().get_first_node_in_group("player")
	arena = get_tree().get_first_node_in_group("arena")

func _physics_process(delta: float) -> void:
	if health <= 0:
		return
	if player == null or not is_instance_valid(player):
		return

	state_timer = maxf(0.0, state_timer - delta)
	var to_player := player.global_position - global_position
	if to_player.length_squared() > 0.0:
		rotation = to_player.angle()

	match state:
		"approach":
			if to_player.length() > 66.0:
				velocity = to_player.normalized() * 92.0
				move_and_slide()
			else:
				velocity = Vector2.ZERO
				state = "telegraph"
				state_timer = 0.66
				tell.visible = true
		"telegraph":
			velocity = Vector2.ZERO
			tell.modulate.a = 0.45 + 0.55 * absf(sin(Time.get_ticks_msec() * 0.018))
			if state_timer <= 0.0 and not attack_resolved:
				attack_resolved = true
				tell.visible = false
				state = "recovery"
				state_timer = 0.72
				if arena != null:
					arena.call("resolve_enemy_strike", self)
		"recovery":
			velocity = Vector2.ZERO
			if state_timer <= 0.0:
				state = "approach"
				attack_resolved = false
		"stagger":
			velocity = velocity.move_toward(Vector2.ZERO, 500.0 * delta)
			move_and_slide()
			if state_timer <= 0.0:
				state = "approach"

func take_hit(amount: int, from_position: Vector2, parry_hit: bool = false) -> void:
	if health <= 0:
		return
	health = maxi(0, health - amount)
	var knockback := (global_position - from_position).normalized()
	if knockback == Vector2.ZERO:
		knockback = Vector2.RIGHT
	global_position += knockback * (24.0 if parry_hit else 12.0)
	velocity = knockback * (180.0 if parry_hit else 90.0)
	state = "stagger"
	attack_resolved = false  # a hit cancels the current attack cycle; don't carry the flag into the next telegraph
	state_timer = 0.78 if parry_hit else 0.24
	tell.visible = false
	shell.color = Color(1.0, 0.82, 0.32, 1.0) if parry_hit else Color(1.0, 0.28, 0.4, 1.0)
	if health == 0:
		shell.color = Color(0.13, 0.17, 0.24, 1.0)
		eye.visible = false

func restore_snapshot(saved_position: Vector2, saved_health: int) -> void:
	global_position = saved_position
	health = saved_health
	velocity = Vector2.ZERO
	state_timer = 0.0
	attack_resolved = false
	tell.visible = false
	eye.visible = health > 0
	if health <= 0:
		state = "dead"
		shell.color = Color(0.13, 0.17, 0.24, 1.0)
	else:
		state = "approach"
		shell.color = Color(0.72, 0.25, 0.38, 1.0)
