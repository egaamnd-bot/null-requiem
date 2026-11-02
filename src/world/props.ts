/**
 * Environmental props (R5): pure decoration, never collide, never affect gameplay. Placement is data keyed by room id.
 * Prop kinds are the cells of `env_<region>_props` in sheet order, so the final painted sheet maps 1:1.
 */
export const RAINLINE_PROPS = ['dumpster', 'fire_escape', 'neon_sign', 'rain_pipes', 'crate_stack', 'street_lamp', 'puddle', 'vent_unit'] as const;
export type RainlineProp = (typeof RAINLINE_PROPS)[number];

export interface PropPlacement {
  prop: RainlineProp;
  /** Column of the prop's horizontal centre tile. */
  col: number;
  /** Row of the tile its feet stand in (the tile below must be solid or a catwalk). */
  row: number;
  flip?: boolean;
}

export const PROP_TILES = 3; // props are 48 x 48 world px = 3 x 3 tiles

/** Props per room. Placed on open floor away from NPCs, pickups, checkpoints and doors. */
export const ROOM_PROPS: Readonly<Record<string, readonly PropPlacement[]>> = {
  alley: [
    { prop: 'dumpster', col: 16, row: 19 },
    { prop: 'crate_stack', col: 24, row: 19, flip: true },
    { prop: 'street_lamp', col: 42, row: 19 },
    { prop: 'puddle', col: 50, row: 19 },
    { prop: 'vent_unit', col: 54, row: 19, flip: true },
  ],
  alley_depot: [
    { prop: 'vent_unit', col: 12, row: 17 },
    { prop: 'crate_stack', col: 22, row: 17 },
    { prop: 'dumpster', col: 27, row: 17, flip: true },
    { prop: 'rain_pipes', col: 49, row: 17 },
  ],
  undercroft: [
    { prop: 'crate_stack', col: 4, row: 15 },
    { prop: 'puddle', col: 14, row: 12 },
    { prop: 'street_lamp', col: 26, row: 12 },
    { prop: 'dumpster', col: 37, row: 15, flip: true },
    { prop: 'vent_unit', col: 41, row: 15 },
  ],
};

export const propKey = (region: string, index: number): string => `env_${region}_props__props_${index}`;
