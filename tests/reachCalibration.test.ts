import { describe, expect, it } from 'vitest';
import { analyseRoom, canStand, touches } from '../src/world/reach';
import { ROOMS } from '../src/world/rooms';

const room = (id: string) => ROOMS.find((r) => r.id === id)!;

describe('reachability analysis is calibrated against known geometry', () => {
  it('Transit Stacks: the far side of the 8-tile pit is reachable only with the dash', () => {
    const transit = room('transit');
    const start = [{ col: transit.entries['west']!.col, row: transit.entries['west']!.row }];
    const dash = analyseRoom(transit, start, { abilities: { dash: true, airJump: false } });
    const noDash = analyseRoom(transit, start, { abilities: { dash: false, airJump: false } });
    // Cell just beyond the hazard strip (cols 41-48), on the far ledge at col 50.
    expect(canStand(dash, 52, 25)).toBe(true);
    expect(canStand(noDash, 52, 25)).toBe(false);
    expect(canStand(noDash, 38, 25)).toBe(true);
  });

  it('a platforming room: every catwalk top in Rainline Alley is reachable on foot', () => {
    const alley = room('alley');
    const r = analyseRoom(alley, [{ col: 9, row: 19 }], { abilities: { dash: true, airJump: false } });
    expect(canStand(r, 32, 13)).toBe(true); // catwalk at row 14
    expect(touches(r, 40, 9)).toBe(true); // memory fragment up high
  });
});
