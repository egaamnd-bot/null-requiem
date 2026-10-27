extends SceneTree
## Headless regression test: the enemy must keep attacking after being hit
## during its recovery window.
## Run: godot --headless --path . --script res://tests/enemy_cycle_test.gd

const DT: float = 1.0 / 60.0

func _init() -> void:
	var main: Node = load("res://Main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	var player: NullPlayer = main.get_node("Player")
	var enemy: RiotEnforcer = main.get_node("Enemy")
	var strikes := [0]
	var _original_hp: int = player.health

	# Drive the enemy deterministically; count how many strikes it throws.
	var step := func(frames: int) -> void:
		for i in frames:
			var before: String = enemy.state
			enemy._physics_process(DT)
			if before == "telegraph" and enemy.state == "recovery":
				strikes[0] += 1

	step.call(300)  # approach -> telegraph -> strike -> recovery
	var first: int = strikes[0]
	var failures: Array[String] = []
	if first < 1:
		failures.append("enemy never struck during the first cycle (strikes=%d)" % first)

	# Wait until recovery, then punish the enemy (the normal player play pattern).
	var guard := 0
	while enemy.state != "recovery" and guard < 600:
		step.call(1); guard += 1
	enemy.take_hit(1, player.global_position)
	strikes[0] = 0
	step.call(600)  # 10s is plenty for approach+stagger+telegraph+strike
	if strikes[0] < 1:
		failures.append("enemy stuck after being hit in recovery (state=%s, strikes=%d)" % [enemy.state, strikes[0]])

	if failures.is_empty():
		print("PASS enemy_cycle_test")
		quit(0)
	else:
		for f in failures:
			printerr("FAIL: " + f)
		quit(1)
