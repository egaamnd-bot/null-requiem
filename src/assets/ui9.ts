/**
 * Nine-slice UI skins (R-UI): which manifest asset skins which UI element, its corner margins (logical px, measured on the
 * un-scaled art) and the state→animation-row mapping. Pure data, unit-tested; used by src/render/uiSkin.ts.
 */
export type SkinKind = 'button' | 'panel' | 'choice';
export type SkinState = 'idle' | 'focus' | 'pressed' | 'disabled' | 'selected' | 'destructive';

export interface SkinDef {
  assetId: string;
  /** Width/height of the whole art cell in logical px (the manifest display size). */
  cell: { w: number; h: number };
  margins: { left: number; right: number; top: number; bottom: number };
  /** Animation rows available (a state missing here falls back to `idle`). */
  states: readonly SkinState[];
}

export const SKINS: Readonly<Record<SkinKind, SkinDef>> = {
  button: { assetId: 'ui_button_9slice', cell: { w: 48, h: 24 }, margins: { left: 10, right: 10, top: 8, bottom: 8 }, states: ['idle', 'focus', 'pressed', 'disabled', 'selected', 'destructive'] },
  panel: { assetId: 'ui_panel_9slice', cell: { w: 48, h: 48 }, margins: { left: 16, right: 16, top: 16, bottom: 16 }, states: ['idle'] },
  choice: { assetId: 'ui_dialogue_choice', cell: { w: 200, h: 20 }, margins: { left: 14, right: 8, top: 6, bottom: 6 }, states: ['idle', 'focus'] },
};

/** Animation row names in the manifest (the panel's single row is called `panel`). */
export const rowName = (kind: SkinKind, state: SkinState): string => (kind === 'panel' ? 'panel' : state);

/** Texture key of a state (frame 0 of the row), matching the manifest's auto-derived keys. */
export function skinKey(kind: SkinKind, state: SkinState): string {
  const d = SKINS[kind];
  const eff = d.states.includes(state) ? state : 'idle';
  return `${d.assetId}__${rowName(kind, eff)}_0`;
}

/** The art may be drawn smaller than the cell it is placed in; the corners must never overlap. */
export function fitsMargins(kind: SkinKind, w: number, h: number): boolean {
  const m = SKINS[kind].margins;
  return w >= m.left + m.right + 1 && h >= m.top + m.bottom + 1;
}
