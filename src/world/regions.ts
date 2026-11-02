import type { RegionId } from './types';

export interface RegionInfo {
  id: RegionId;
  name: string;
  /** World-map colour. */
  color: number;
  tagline: string;
}

export const REGIONS: readonly RegionInfo[] = [
  { id: 'rainline', name: 'Rainline Alley', color: 0x3cf2ff, tagline: 'Where the Courier wakes.' },
  { id: 'transit', name: 'Transit Stacks', color: 0xff9f3e, tagline: 'Lifts, girders and loose gravity.' },
  { id: 'precinct', name: 'Precinct Vault', color: 0xff3b4e, tagline: 'Security that remembers you.' },
  { id: 'undercity', name: 'Neon Undercity', color: 0xff3ea5, tagline: 'The survivors\' market.' },
  { id: 'industrial', name: 'Industrial Core', color: 0xffb02e, tagline: 'Heat, steam and the heart of the city.' },
  { id: 'cathedral', name: 'Null Cathedral', color: 0x9b59ff, tagline: 'Everything erased, kept.' },
];

export const REGION_BY_ID: ReadonlyMap<RegionId, RegionInfo> = new Map(REGIONS.map((r) => [r.id, r]));
