extends Node2D

const MAX_HISTORY: int = 150
const REWIND_FRAMES: int = 90
const REWIND_RATE: float = 2.5

var history: Array[Dictionary] = []
var rewinding: bool = false
var rewind_cursor: float = 0.0
var rewind_start_size: int = 0

@onready var player: NullPlayer = $Player
@onready var enemy: RiotEnforcer = $Enemy
@onready var hp_label: Label = $HUD/HP
@onready var enemy_label: Label = $HUD/EnemyHP
@onready var status_label: Label = $HUD/Status
@onready var rewind_bar: ProgressBar = $HUD/RewindBar

func _ready() -> void:
	add_to_group("arena")
	_update_hud()
	queue_redraw()

func _unhandled_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo:
		return
	if rewinding:
		return
	match event.keycode:
		KEY_J:
			if player.start_attack():
				_resolve_player_attack()
		KEY_SPACE:
			player.start_dodge()
		KEY_SHIFT:
			player.start_parry()
		KEY_R:
			_begin_rewind()

func _physics_process(_delta: float) -> void:
	if rewinding:
		_tick_rewind()
		_update_hud()
		return
	_record_snapshot()
	_update_hud()

func _resolve_player_attack() -> void:
	var to_enemy: Vector2 = enemy.global_position - player.global_position
	if enemy.health > 0 and to_enemy.length() <= 76.0 and player.facing.dot(to_enemy.normalized()) > 0.15:
		enemy.take_hit(1, player.global_position)

func resolve_enemy_strike(attacker: RiotEnforcer) -> void:
	if rewinding or player.health <= 0:
		return
	if attacker.global_position.distance_to(player.global_position) > 78.0:
		return
	if player.is_parrying():
		attacker.take_hit(1, player.global_position, true)
		player.parry_timer = 0.0
		status_label.text = "PERFECT PARRY  +  TIME RESONANCE"
	elif player.invulnerability_timer <= 0.0:
		player.take_damage(1)
		status_label.text = "HIT  //  FIND THE NEXT TELL"

func _record_snapshot() -> void:
	history.append({
		"player_position": player.global_position,
		"player_health": player.health,
		"enemy_position": enemy.global_position,
		"enemy_health": enemy.health,
	})
	if history.size() > MAX_HISTORY:
		history.pop_front()

func _begin_rewind() -> void:
	if history.size() < 12:
		status_label.text = "NOT ENOUGH RECENT TIME TO REWIND"
		return
	rewinding = true
	rewind_start_size = history.size()
	rewind_cursor = float(history.size() - 1)
	player.locked = true
	player.set_physics_process(false)
	enemy.set_physics_process(false)
	status_label.text = "BACKTRACE  //  REWRITING THE LAST MOMENTS"

func _tick_rewind() -> void:
	rewind_cursor = maxf(0.0, rewind_cursor - REWIND_RATE)
	var snapshot: Dictionary = history[int(rewind_cursor)]
	player.restore_snapshot(snapshot["player_position"], snapshot["player_health"])
	enemy.restore_snapshot(snapshot["enemy_position"], snapshot["enemy_health"])
	player.locked = true
	if rewind_cursor <= maxf(0.0, float(rewind_start_size - REWIND_FRAMES)):
		_finish_rewind()

func _finish_rewind() -> void:
	var keep_count := int(rewind_cursor) + 1
	while history.size() > keep_count:
		history.pop_back()
	rewinding = false
	player.locked = false
	player.set_physics_process(true)
	enemy.set_physics_process(true)
	status_label.text = "BACKTRACE COMPLETE  //  SPACE DODGE  ·  SHIFT PARRY"

func _update_hud() -> void:
	hp_label.text = "VITALS  " + "◆".repeat(player.health) + "◇".repeat(5 - player.health)
	enemy_label.text = "RIOT ENFORCER  " + "■".repeat(enemy.health) + "□".repeat(4 - enemy.health)
	rewind_bar.value = float(history.size()) / float(MAX_HISTORY) * 100.0
	if not rewinding:
		if player.health <= 0:
			status_label.text = "DOWNED  //  PRESS R TO REWRITE THE MOMENT"
		elif enemy.health <= 0:
			status_label.text = "ENFORCER DOWN  //  PROTOTYPE ARENA COMPLETE"
