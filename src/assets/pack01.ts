/** Production Pack 01 (Rainline Alley): the 38 files of docs/GEMINI_PACK_01_BRIEF.md, grouped as the creative handoff counts them. */
export const PACK_01_GROUPS = {
  courier: ['player_courier_idle', 'player_courier_run', 'player_courier_jump', 'player_courier_fall', 'player_courier_dash', 'player_courier_attack', 'player_courier_hurt', 'player_courier_backtrace', 'player_courier_airjump', 'player_courier_interact', 'player_courier_death'],
  enemies: ['enemy_scrap_hound', 'enemy_security_drone'],
  npc: ['npc_desert_man'],
  environment: ['env_rainline_tiles', 'env_rainline_bg_far', 'env_rainline_bg_mid', 'env_rainline_fg_silhouette', 'env_rainline_props'],
  objects: ['obj_sync_relay', 'obj_security_door', 'obj_pressure_plate', 'obj_breakable_wall', 'pickup_backtrace_module', 'pickup_integrity_cell', 'pickup_glitch_strike', 'pickup_memory_fragment', 'pickup_scrap'],
  combatFx: ['fx_slash_side', 'fx_slash_up', 'fx_slash_down', 'fx_hit_spark', 'fx_enemy_telegraph', 'fx_projectile_set', 'fx_glitch_strike'],
  backtraceFx: ['fx_backtrace_arrival', 'fx_backtrace_streak', 'fx_temporal_plate_pulse'],
} as const;

export const PACK_01_IDS: readonly string[] = Object.values(PACK_01_GROUPS).flat();
