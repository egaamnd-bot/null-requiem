# Emberveil — Game Design Document (Milestone 1)

## Pillars

1. **Movement and combat feel good before content grows.** Tight acceleration, forgiving inputs (coyote time, jump buffer, attack buffer), readable telegraphs, hit-stop on impact.
2. **Curiosity is rewarded.** Every room has something off the main line: a cracked wall, a higher ledge, a hint of light where there shouldn't be.
3. **Danger is readable.** Every hostile action has a visible and audible wind-up, and a recovery window that rewards the player who waited for it.

## Premise (original)

Beneath the surface, the world's last fires were sealed under a *veil* of cooling ash to keep them from going out entirely. The **Kindler**, a hooded wanderer carrying a single living ember in place of a face, descends to rekindle the hearth lanterns and learn why the deep fires are dimming. The **Kiln Warden** — a furnace-construct built to tend the sanctum — has grown territorial as its fuel runs low.

Tone: quiet, melancholy, warm light in deep dark. Minimal text; environmental storytelling.

## Visual language

| Element | Treatment |
|---|---|
| Depths | Near-black purple-greys; dim parallax silhouettes |
| Terrain | Warm dark stone with pale stone lips on exposed surfaces |
| Warmth / safety / player | Ember orange and gold (lanterns, the Kindler's eye and scarf) |
| Mystery / life | Cool teal bioluminescent fungi, the Wisps, the Veilstep glyph |
| Danger | Saturated ember-red, brightening during wind-ups |

## Player — the Kindler

| Verb | Rules |
|---|---|
| Run | 150 px/s; snappier deceleration than acceleration; extra decel on reversal |
| Jump | 58 px apex over 0.36 s; heavier gravity while falling; release early to cut |
| Forgiveness | 0.10 s coyote time, 0.12 s jump buffer, 0.10 s attack buffer, 4 px ceiling-corner correction |
| Strike | 0.035 s startup, 0.09 s active, 0.16 s recovery. Side / up / down (air). Each swing hits a target once |
| Pogo | Down-strike on an enemy bounces the Kindler and refreshes the air dash. Hazards, walls and projectiles are not pogo-able (protects the ability gate) |
| Veilstep (unlock) | 340 px/s for 0.2 s, ignores gravity, one per airtime, 0.4 s cooldown |
| Damage | 5 embers (health). Hit → knockback, 0.25 s stun, 1.0 s invulnerability. Ember pits cost one ember and return you to the last safe ground |

## Enemies

**Ashgrub (melee crawler)** — patrols, never walks off ledges. On seeing the Kindler: *wind-up* (rears, core brightens, glint) 0.55 s → *lunge* (armoured) 0.3 s → *recover* (core dims, vulnerable) 0.75 s. Striking during the wind-up interrupts it. 3 HP.

**Lantern Wisp (ranged flyer)** — drifts around its roost; when it sees the Kindler it keeps its distance, swells (0.6 s), then looses a slow ember bolt aimed at the Kindler. Bolts burst on walls and can be cut out of the air. 2 HP.

**The Kiln Warden (miniboss)** — 20 HP.

| Pattern | Telegraph | Punish window |
|---|---|---|
| Charge | Backs up, grate flares (0.75 s) | Hits the wall → stunned 1.4 s, harmless |
| Leap slam | Crouch (0.45 s), then leaps to your position | Shockwaves both ways (jump them); 0.8 s recovery |
| Ember rain (≤ 50% HP) | Rears up; floor + ceiling markers glow 0.9 s before each ember falls | 1.0 s recovery |

Never uses the same pattern three times running. Phase 2 speeds everything up by 15%.

## Level — the vertical slice

```
[ Ashfall Hollow ] ──east door──▶ [ Lantern Gallery ] ──east door──▶ [ Cinder Sanctum ]
  start, lantern #1                 climb → Veilstep shrine            gate seals → boss
  cracked wall → Heartcoal          ember pit (needs Veilstep)          victory
                                    lantern #2 beyond the pit
```

**Ability gate proof:** the pit is 128 px. From the tuning values, a full running jump covers roughly 112 px including coyote time, and jump + Veilstep roughly 165 px (analytical estimates). The test suite is the actual proof: it brute-forces 91 jump timings to confirm none crosses without Veilstep, and that dozens of jump/dash timing pairs succeed with it. A thick rock mass above the pit removes any higher launch point, and pogo doesn't work on hazards.

## Systems

- **Checkpoints (Hearth Lanterns):** touching one sets the respawn point, restores embers, saves.
- **Death:** short death beat → "The ember gutters out" → retry at last lantern. Enemies and the boss reset; abilities, secrets and broken walls persist.
- **Save data:** versioned JSON in `localStorage`; corrupt or foreign data is ignored safely.
- **Camera:** exponential smoothing with look-ahead, clamped to room bounds; rooms are validated to be at least one screen in size.

## Out of scope for Milestone 1

Map screen, currency, healing resource, NPCs and dialogue, music, multiple save slots, touch controls, accessibility options.
