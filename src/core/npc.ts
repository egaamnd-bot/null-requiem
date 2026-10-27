/**
 * NPC entities: static characters the player can talk to.
 * Each NPC cycles through a list of dialogue lines. The active line advances on each interact.
 */

export interface NpcDef {
  id: string;
  name: string;
  /** Dialogue lines shown in sequence (wraps around). */
  lines: readonly string[];
  /** Pixel position of the NPC's feet. */
  feetX: number;
  feetY: number;
  /** Sprite variant for rendering ('zero' | 'mira' | 'terminal'). */
  kind: 'zero' | 'mira' | 'terminal';
}

export class NpcEntity {
  readonly id: string;
  readonly name: string;
  readonly lines: readonly string[];
  readonly feetX: number;
  readonly feetY: number;
  readonly kind: NpcDef['kind'];
  /** Index of the next line to show. */
  private lineIndex = 0;

  constructor(def: NpcDef) {
    this.id = def.id;
    this.name = def.name;
    this.lines = def.lines;
    this.feetX = def.feetX;
    this.feetY = def.feetY;
    this.kind = def.kind;
  }

  get currentLine(): string {
    return this.lines[this.lineIndex % this.lines.length] ?? '';
  }

  get centerX(): number {
    return this.feetX;
  }

  get centerY(): number {
    return this.feetY - 11;
  }

  /** Advances to the next dialogue line. Returns the line that was shown. */
  advance(): string {
    const line = this.currentLine;
    this.lineIndex = (this.lineIndex + 1) % this.lines.length;
    return line;
  }

  /** Whether the NPC is a terminal (non-humanoid display). */
  get isTerminal(): boolean {
    return this.kind === 'terminal';
  }
}
