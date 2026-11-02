import { describe, expect, it } from 'vitest';
import { autotileIndex, catwalkIndex, tilesetKeys } from '../src/assets/autotile';
import { ASSET_BY_ID } from '../src/assets/manifest';
import { Tile, TileGrid } from '../src/core/tiles';
import { propKey, PROP_TILES, RAINLINE_PROPS, ROOM_PROPS } from '../src/world/props';
import { ROOMS } from '../src/world/rooms';

describe('autotile contract (R3)', () => {
  it('maps neighbours to the documented index', () => {
    expect(autotileIndex(false, false, false, false)).toBe(0);
    expect(autotileIndex(true, true, true, true)).toBe(15);
    expect(autotileIndex(false, true, true, true)).toBe(14); // open to the north = platform top
    expect(autotileIndex(true, true, true, false)).toBe(7); // open to the west
  });
  it('produces 16 distinct indices over all neighbour combinations', () => {
    const seen = new Set<number>();
    for (let m = 0; m < 16; m++) seen.add(autotileIndex(!!(m & 1), !!(m & 2), !!(m & 4), !!(m & 8)));
    expect(seen.size).toBe(16);
  });
  it('catwalk caps', () => {
    expect(catwalkIndex(false, true)).toBe(0);
    expect(catwalkIndex(true, true)).toBe(1);
    expect(catwalkIndex(true, false)).toBe(2);
    expect(catwalkIndex(false, false)).toBe(0);
  });
  it('the keys the renderer asks for are exactly the manifest keys of every region tileset', () => {
    for (const region of ['rainline', 'transit', 'precinct', 'undercity', 'industrial', 'cathedral']) {
      const def = ASSET_BY_ID.get(`env_${region}_tiles`)!;
      const t = tilesetKeys(region);
      expect([...t.solid, ...t.catwalk, ...t.hazard, ...t.details]).toEqual(def.textureKeys);
      expect(def.display).toEqual({ w: 16, h: 16 });
    }
  });
});

describe('props (R5)', () => {
  it('every placement stands on solid ground in open air and never overlaps NPCs, pickups or doors', () => {
    for (const [roomId, list] of Object.entries(ROOM_PROPS)) {
      const room = ROOMS.find((r) => r.id === roomId)!;
      expect(room, roomId).toBeTruthy();
      const { grid } = TileGrid.fromAscii(room.layout, 16);
      for (const p of list) {
        expect(RAINLINE_PROPS).toContain(p.prop);
        // feet tile and the two tiles above it are open; the tile below is solid or a catwalk
        for (let dy = 0; dy < 2; dy++) expect(grid.get(p.col, p.row - dy), `${roomId} ${p.prop} body`).toBe(Tile.Empty);
        expect([Tile.Solid, Tile.OneWay], `${roomId} ${p.prop} floor`).toContain(grid.get(p.col, p.row + 1));
        const half = Math.floor(PROP_TILES / 2);
        for (const s of room.spawns ?? []) {
          if (s.kind === 'enemy') continue;
          expect(Math.abs(s.col - p.col) > half || Math.abs(s.row - p.row) > 2, `${roomId} ${p.prop} overlaps ${s.kind}`).toBe(true);
        }
        for (const d of room.doors) expect(p.col < d.area.col - half || p.col > d.area.col + d.area.cols + half, `${roomId} ${p.prop} blocks door ${d.id}`).toBe(true);
        for (const k of Object.values(room.entries)) expect(Math.abs(k.col - p.col) > half, `${roomId} ${p.prop} on an entry point`).toBe(true);
      }
    }
  });
  it('prop sheet cells map 1:1 to the manifest keys', () => {
    const def = ASSET_BY_ID.get('env_rainline_props')!;
    expect(def.textureKeys).toEqual(RAINLINE_PROPS.map((_, i) => propKey('rainline', i)));
    expect(def.display).toEqual({ w: 48, h: 48 });
  });
});
