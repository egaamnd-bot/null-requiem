import { evalCondition, type Condition } from './conditions';
import type { Progression } from './progression';

/** One-shot state changes a dialogue line or choice can cause. Applied by the host (the world). */
export interface Effect {
  setFlag?: string;
  clearFlag?: string;
  giveItem?: { id: string; n?: number };
  takeItem?: { id: string; n?: number };
  scrap?: number;
  startQuest?: string;
  turnInQuest?: string;
  heal?: boolean;
  /** Opens the vendor screen after the dialogue closes. */
  openVendor?: string;
  /** Grants +n max integrity. */
  maxHealth?: number;
  setCheckpointHere?: boolean;
}

export interface DialogueChoice {
  text: string;
  next?: string;
  when?: Condition;
  effects?: Effect[];
}

export interface DialogueNode {
  speaker?: string;
  text: string;
  /** Linear continuation. Ignored when `choices` are present. */
  next?: string;
  choices?: DialogueChoice[];
  effects?: Effect[];
}

export interface DialogueDef {
  id: string;
  /** The first entry whose condition holds decides where a conversation starts. */
  entries: { when?: Condition; node: string }[];
  nodes: Record<string, DialogueNode>;
}

export interface DialogueView {
  speaker: string;
  text: string;
  /** Present when the player must choose. */
  choices: { text: string; index: number }[] | null;
  /** True when the next advance will close the conversation. */
  last: boolean;
}

export interface DialogueHost {
  progression: Progression;
  apply(effect: Effect): void;
}

/** Validate that a dialogue definition has no dangling node references. Returns a list of problems. */
export function validateDialogue(def: DialogueDef): string[] {
  const problems: string[] = [];
  const has = (n: string | undefined) => n === undefined || def.nodes[n] !== undefined;
  if (def.entries.length === 0) problems.push(`${def.id}: no entries`);
  for (const e of def.entries) if (!def.nodes[e.node]) problems.push(`${def.id}: entry -> missing node ${e.node}`);
  for (const [id, n] of Object.entries(def.nodes)) {
    if (!has(n.next)) problems.push(`${def.id}.${id}: next -> missing ${n.next}`);
    for (const c of n.choices ?? []) if (!has(c.next)) problems.push(`${def.id}.${id}: choice -> missing ${c.next}`);
    if (n.choices && n.choices.length === 0) problems.push(`${def.id}.${id}: empty choices`);
  }
  // Last entry should be unconditional so a conversation can always start.
  const lastEntry = def.entries[def.entries.length - 1];
  if (lastEntry?.when) problems.push(`${def.id}: final entry must be unconditional`);
  return problems;
}

/**
 * Runs one conversation. Pure: all state changes go through the host, and the runner only tracks which node is shown.
 * Node effects fire when the node is first displayed; choice effects fire when the choice is taken.
 */
export class DialogueRunner {
  private nodeId: string | null = null;
  private visible: { text: string; index: number }[] = [];

  constructor(
    private readonly def: DialogueDef,
    private readonly host: DialogueHost,
  ) {}

  get active(): boolean {
    return this.nodeId !== null;
  }

  /** Begin the conversation. Returns the first view, or null if the definition has no usable entry. */
  start(): DialogueView | null {
    const entry = this.def.entries.find((e) => evalCondition(e.when, this.host.progression));
    if (!entry) return null;
    return this.enter(entry.node);
  }

  private enter(nodeId: string): DialogueView | null {
    const node = this.def.nodes[nodeId];
    if (!node) {
      this.nodeId = null;
      return null;
    }
    this.nodeId = nodeId;
    for (const e of node.effects ?? []) this.host.apply(e);
    this.visible = (node.choices ?? [])
      .map((c, index) => ({ c, index }))
      .filter(({ c }) => evalCondition(c.when, this.host.progression))
      .map(({ c, index }) => ({ text: c.text, index }));
    return this.view();
  }

  view(): DialogueView | null {
    if (!this.nodeId) return null;
    const node = this.def.nodes[this.nodeId] as DialogueNode;
    const hasChoices = this.visible.length > 0;
    return {
      speaker: node.speaker ?? '',
      text: node.text,
      choices: hasChoices ? this.visible.map((v) => ({ ...v })) : null,
      last: !hasChoices && !node.next,
    };
  }

  /** Continue a linear line. Choice nodes ignore this (the player must choose). Returns the next view or null when finished. */
  advance(): DialogueView | null {
    if (!this.nodeId) return null;
    const node = this.def.nodes[this.nodeId] as DialogueNode;
    if (this.visible.length > 0) return this.view();
    if (!node.next) {
      this.nodeId = null;
      return null;
    }
    return this.enter(node.next);
  }

  /** Pick a visible choice by its original index. */
  choose(index: number): DialogueView | null {
    if (!this.nodeId) return null;
    const node = this.def.nodes[this.nodeId] as DialogueNode;
    const pick = this.visible.find((v) => v.index === index);
    const choice = pick ? node.choices?.[pick.index] : undefined;
    if (!choice) return this.view();
    for (const e of choice.effects ?? []) this.host.apply(e);
    if (!choice.next) {
      this.nodeId = null;
      return null;
    }
    return this.enter(choice.next);
  }

  close(): void {
    this.nodeId = null;
  }
}
