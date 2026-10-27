class_name NullPlayer
extends CharacterBody2D

@export var speed: float = 240.0
@export var dodge_speed: float = 620.0

var health: int = 5
var facing: Vector2 = Vector2.RIGHT
var dodge_direction: Vector2 = Vector2.RIGHT
var dodge_timer: float = 0.0
var invulnerability_timer: float = 0.0
var parry_timer: float = 0.0
var parry_cooldown: float = 0.0
var attack_cooldown: float = 0.0
var attack_visual_timer: float = 0.0
var locked: bool = false

@onready var body: Polygon2D = $Silhouette
@onready var core: Polygon2D = $Core
@onready var attack_arc: Polygon2D = $AttackArc
@onready var parry_ring: Polygon2D = $ParryRing

func _physics_process(delta: float) -> void:
	attack_cooldown = maxf(0.0, attack_cooldown - delta)
	parry_cooldown = maxf(0.0, parry_cooldown - delta)
	parry_timer = maxf(0.0, parry_timer - delta)
	invulnerability_timer = maxf(0.0, invulnerability_timer - delta)
	attack_visual_timer = maxf(0.0, attack_visual_timer - delta)
	attack_arc.visible = attack_visual_timer > 0.0
	parry_ring.visible = parry_timer > 0.0

	if locked:
		velocity = Vector2.ZERO
		return

	if dodge_timer > 0.0:
		dodge_timer = maxf(0.0, dodge_timer - delta)
		velocity = dodge_direction * dodge_speed
	else:
		var direction := Vector2.ZERO
		direction.x = (1.0 if (Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)) else 0.0) - (1.0 if (Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)) else 0.0)
		direction.y = (1.0 if (Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)) else 0.0) - (1.0 if (Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP)) else 0.0)
		if direction.length_squared() > 0.0:
			facing = direction.normalized()
		velocity = direction.normalized() * speed

	rotation = facing.angle()
	move_and_slide()

func start_attack() -> bool:
	if locked or attack_cooldown > 0.0:
		return false
	attack_cooldown = 0.32
	attack_visual_timer = 0.18
	attack_arc.visible = true
	return true

func start_dodge() -> bool:
	if locked or dodge_timer > 0.0 or invulnerability_timer > 0.0:
		return false
	var direction := Vector2.ZERO
	direction.x = (1.0 if (Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)) else 0.0) - (1.0 if (Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)) else 0.0)
	direction.y = (1.0 if (Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)) else 0.0) - (1.0 if (Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP)) else 0.0)
	if direction.length_squared() > 0.0:
		dodge_direction = direction.normalized()
	else:
		dodge_direction = facing
	dodge_timer = 0.22
	invulnerability_timer = 0.28
	return true

func start_parry() -> bool:
	if locked or parry_cooldown > 0.0:
		return false
	parry_cooldown = 0.55
	parry_timer = 0.24
	parry_ring.visible = true
	return true

func is_parrying() -> bool:
	return parry_timer > 0.0

func take_damage(amount: int) -> void:
	if invulnerability_timer > 0.0 or locked:
		return
	health = maxi(0, health - amount)
	invulnerability_timer = 0.7
	body.color = Color(1.0, 0.25, 0.32, 1.0)
	get_tree().create_timer(0.12).timeout.connect(func():
		if is_instance_valid(body):
			body.color = Color(0.0, 0.898, 1.0, 1.0)
	)

func restore_snapshot(saved_position: Vector2, saved_health: int) -> void:
	global_position = saved_position
	health = saved_health
	velocity = Vector2.ZERO
	locked = false
	dodge_timer = 0.0
	invulnerability_timer = 0.0
	parry_timer = 0.0
	body.color = Color(0.0, 0.898, 1.0, 1.0)

