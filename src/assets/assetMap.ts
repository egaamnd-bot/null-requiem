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
