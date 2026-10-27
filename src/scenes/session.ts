import type Phaser from 'phaser';
import type { Sfx } from '../audio/Sfx';
import type { SaveStore } from '../core/progression';
import type { Progression } from '../core/progression';
import type { GameWorld } from '../core/world';

/** Long-lived services shared by all scenes, passed explicitly through scene data. */
export interface Services {
  sfx: Sfx;
  store: SaveStore;
}

export interface GameSceneData {
  services: Services;
  progression: Progression;
}

/** What the UI overlay needs from the running game. */
export interface Session {
  world: GameWorld;
  services: Services;
  /** Simulation events are re-broadcast here as 'event'. */
  bus: Phaser.Events.EventEmitter;
  resume(): void;
  retry(): void;
  quit(): void;
}

export interface VictoryData {
  services: Services;
  playTime: number;
  deaths: number;
  secretsFound: number;
  secretsTotal: number;
}

export const SCENES = {
  boot: 'boot',
  title: 'title',
  game: 'game',
  ui: 'ui',
  victory: 'victory',
} as const;
