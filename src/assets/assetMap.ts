/** Which manifest asset draws each NPC kind (pure data, importable from tests). The first three NPC kinds are legacy hand-drawn textures. */
export const NPC_ASSET: Readonly<Record<string, string>> = {
  desertman: 'npc_desert_man',
  mechanic: 'npc_station_mechanic',
  medic: 'npc_underground_medic',
  officer: 'npc_former_officer',
  trader: 'npc_black_market_trader',
  informant: 'npc_street_informant',
  researcher: 'npc_temporal_researcher',
  echo: 'npc_null_echo',
};

/** Constant scale a view applies to texture keys whose placeholder pixels are not world pixels (R1). Everything else is 1. */
export const MANIFEST_VIEW_SCALE: Readonly<Record<string, number>> = {
  'player-idle0': 0.65,
  'player-idle1': 0.65,
  'player-run0': 0.65,
  'player-run1': 0.65,
  'player-run2': 0.65,
  'player-run3': 0.65,
  'player-jump': 0.65,
  'player-fall': 0.65,
  'player-dash': 0.65,
  'player-attack': 0.65,
  'player-hurt': 0.65,
};
