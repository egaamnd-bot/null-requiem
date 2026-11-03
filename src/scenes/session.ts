import type Phaser from 'phaser';
import type { Sfx } from '../audio/Sfx';
import type { SaveStore } from '../core/progression';
import type { Progression } from '../core/progression';
import type { GameWorld } from '../core/world';
import type { Ambience } from '../audio/Ambience';
import type { Music } from '../audio/Music';
import type { MenuTab } from './MenuScene';

/** Long-lived services shared by all scenes, passed explicitly through scene data. */
export interface Services {
  sfx: Sfx;
  music: Music;
  /** Recorded region ambience (optional; silent without delivered files). */
  ambience: Ambience;
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
  pause(): void;
  retry(): void;
  quit(): void;
  /** Open a full-screen menu tab over the paused game. */
  openMenu(tab: MenuTab, vendorId?: string): void;
  /** True while the tabbed menu overlay is on screen. */
  menuOpen(): boolean;
}

export interface VictoryData {
  services: Services;
  playTime: number;
  deaths: number;
  secretsFound: number;
  secretsTotal: number;
  rooms: number;
  roomsTotal: number;
  records: number;
  recordsTotal: number;
  questsDone: number;
  questsTotal: number;
  scrap: number;
}

export const SCENES = {
  boot: 'boot',
  title: 'title',
  game: 'game',
  ui: 'ui',
  victory: 'victory',
} as const;
