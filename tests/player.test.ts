import { describe, expect, it } from 'vitest';
import { COMBAT, PLAYER, PLAYER_JUMP_VELOCITY } from '../src/config/tuning';
import { Player } from '../src/core/player';
import { DT, gridFrom, input, runPlayer, settle, tileFeet, tileX } from './helpers';

/** 40x16 box with a floor at row 14. */
function flatRoom(): string[] {
  const rows: string[] = ['#'.repeat(40)];
  for (let r = 1; r < 14; r++) rows.push('#' + '.'.repeat(38) + '#');
  rows.push('#'.repeat(40), '#'.repeat(40));
  return rows;
}

/** High ledge on the left (top at row 10), low floor on the right. */
function ledgeRoom(): string[] {
  const rows: string[] = ['#'.repeat(40)];
  for (let r = 1; r < 10; r++) rows.push('#' + '.'.repeat(38) + '#');
  for (let r = 10; r < 14; r++) rows.push('#'.repeat(20) + '.'.repeat(19) + '#');
  rows.push('#'.repeat(40), '#'.repeat(40));
  return rows;
}

/** Tall shaft for long falls. */
function tallRoom(): string[] {
  const rows: string[] = ['#'.repeat(40)];
  for (let r = 1; r < 58; r++) rows.push('#' + '.'.repeat(38) + '#');
  rows.push('#'.repeat(40), '#'.repeat(40));
  return rows;
}

describe('Player movement', () => {
  it('accelerates to run speed, never exceeds it, and decelerates quickly', () => {
    const grid = gridFrom(flatRoom());
    const p = new Player(tileX(5), tileFeet(13));
    settle(p, grid);
    let maxVx = 0;
    runPlayer(p, grid, 60, () => input({ moveX: 1 }), undefined, () => (maxVx = Math.max(maxVx, p.body.vx)));
    expect(p.body.vx).toBeCloseTo(PLAYER.runSpeed, 5);
    expect(maxVx).toBeLessThanOrEqual(PLAYER.runSpeed + 1e-9);
    const stopSteps = Math.ceil(PLAYER.runSpeed / PLAYER.groundDecel / DT) + 1;
    runPlayer(p, grid, stopSteps, () => input());
    expect(p.body.vx).toBe(0);
  });

  it('reaches the configured jump height when jump is held', () => {
    const grid = gridFrom(flatRoom());
    const p = new Player(tileX(5), tileFeet(13));
    settle(p, grid);
    const startY = p.body.y;
    let minY = startY;
    runPlayer(p, grid, 120, (i) => input({ jumpPressed: i === 0, jumpHeld: true }), undefined, () => {
      minY = Math.min(minY, p.body.y);
    });
    expect(startY - minY).toBeGreaterThan(PLAYER.jumpHeight - 3);
    expect(startY - minY).toBeLessThan(PLAYER.jumpHeight + 1);
    expect(p.body.onGround).toBe(true);
  });

  it('cuts the jump short when jump is released early (variable height)', () => {
    const grid = gridFrom(flatRoom());
    const p = new Player(tileX(5), tileFeet(13));
    settle(p, grid);
    const startY = p.body.y;
    let minY = startY;
    runPlayer(p, grid, 120, (i) => input({ jumpPressed: i === 0, jumpHeld: i < 4 }), undefined, () => {
      minY = Math.min(minY, p.body.y);
    });
    expect(startY - minY).toBeLessThan(PLAYER.jumpHeight * 0.5);
    expect(startY - minY).toBeGreaterThan(4);
  });

  it('allows a jump within coyote time after running off a ledge, but not after it', () => {
    const attempt = (delaySteps: number): boolean => {
      const grid = gridFrom(ledgeRoom());
      const p = new Player(tileX(16), tileFeet(9));
      settle(p, grid);
      let leftGroundAt = -1;
      let jumped = false;
      runPlayer(
        p,
        grid,
        120,
        (i) =>
          input({
            moveX: 1,
            jumpPressed: leftGroundAt >= 0 && i === leftGroundAt + delaySteps,
            jumpHeld: true,
          }),
        undefined,
        (i) => {
          if (leftGroundAt < 0 && !p.body.onGround) leftGroundAt = i;
          if (p.body.vy < -PLAYER_JUMP_VELOCITY * 0.9) jumped = true;
        },
      );
      return jumped;
    };
    const coyoteSteps = Math.floor(PLAYER.coyoteTime / DT);
    expect(attempt(Math.floor(coyoteSteps * 0.7))).toBe(true);
    expect(attempt(coyoteSteps + 6)).toBe(false);
  });

  it('buffers a jump pressed shortly before landing', () => {
    const landingStep = (): number => {
      const grid = gridFrom(flatRoom());
      const p = new Player(tileX(5), tileFeet(6));
      let landed = -1;
      runPlayer(p, grid, 200, () => input(), undefined, (i) => {
        if (landed < 0 && p.body.onGround) landed = i;
      });
      return landed;
    };
    const land = landingStep();
    expect(land).toBeGreaterThan(20);

    const tryBuffer = (earlySteps: number): boolean => {
      const grid = gridFrom(flatRoom());
      const p = new Player(tileX(5), tileFeet(6));
      const events = runPlayer(p, grid, land + 10, (i) => input({ jumpPressed: i === land - earlySteps, jumpHeld: true }));
      return events.some((e) => e.type === 'playerJump');
    };
    const bufferSteps = Math.floor(PLAYER.jumpBufferTime / DT);
    expect(tryBuffer(Math.floor(bufferSteps * 0.6))).toBe(true);
    expect(tryBuffer(bufferSteps + 8)).toBe(false);
  });

  it('drops through one-way platforms with down + jump', () => {
    const rows = flatRoom();
    rows[9] = '#' + '.'.repeat(4) + '='.repeat(10) + '.'.repeat(24) + '#';
    const grid = gridFrom(rows);
    const p = new Player(tileX(8), tileFeet(8));
    settle(p, grid);
    expect(p.body.onGround).toBe(true);
    expect(p.feetY).toBeCloseTo(tileFeet(8), 5);
    runPlayer(p, grid, 60, (i) => input({ moveY: 1, jumpPressed: i === 0, jumpHeld: true }));
    expect(p.feetY).toBeCloseTo(tileFeet(13), 5);
  });

  it('lands on one-way platforms from above but passes through them from below', () => {
    const rows = flatRoom();
    rows[11] = '#' + '.'.repeat(4) + '='.repeat(10) + '.'.repeat(24) + '#';
    const grid = gridFrom(rows);
    const p = new Player(tileX(8), tileFeet(13));
    settle(p, grid);
    // Full jump from the floor rises through the ledge (2 tiles above) and lands on top of it.
    runPlayer(p, grid, 120, (i) => input({ jumpPressed: i === 0, jumpHeld: true }));
    expect(p.body.onGround).toBe(true);
    expect(p.feetY).toBeCloseTo(tileFeet(10), 5);
  });

  it('slips around a ceiling corner it only clips by a few pixels', () => {
    const rows = flatRoom();
    // A single ceiling tile at col 10, row 11. The player's left edge is 2px under its right edge.
    rows[11] = '#' + '.'.repeat(9) + '#' + '.'.repeat(28) + '#';
    const grid = gridFrom(rows);
    const p = new Player(0, tileFeet(13));
    p.placeAt(11 * 16 - 2 + PLAYER.width / 2, tileFeet(13));
    settle(p, grid);
    const startY = p.body.y;
    let minY = startY;
    runPlayer(p, grid, 60, (i) => input({ jumpPressed: i === 0, jumpHeld: true }), undefined, () => {
      minY = Math.min(minY, p.body.y);
    });
    expect(startY - minY).toBeGreaterThan(PLAYER.jumpHeight - 4);
  });
});

describe('Dash', () => {
  it('does nothing when dashing is disabled', () => {
    const grid = gridFrom(flatRoom());
    const p = new Player(tileX(5), tileFeet(13));
    settle(p, grid);
    const events = runPlayer(p, grid, 30, (i) => input({ dashPressed: i === 0 }), { dash: false, glitchStrike: false });
    expect(events.some((e) => e.type === 'playerDash')).toBe(false);
    expect(p.body.vx).toBe(0);
  });

  it('dashes a fixed distance at dash speed, ignoring gravity', () => {
    const grid = gridFrom(flatRoom());
    const p = new Player(tileX(5), tileFeet(13));
    settle(p, grid);
    const startX = p.body.x;
    const steps = Math.round(PLAYER.dash.duration / DT);
    const events = runPlayer(p, grid, steps, (i) => input({ dashPressed: i === 0 }), { dash: true, glitchStrike: false });
    expect(events.filter((e) => e.type === 'playerDash')).toHaveLength(1);
    expect(p.body.x - startX).toBeCloseTo(PLAYER.dash.speed * PLAYER.dash.duration, 0);
  });

  it('allows only one air dash per airtime, refreshed on landing', () => {
    const grid = gridFrom(tallRoom());
    const p = new Player(tileX(5), tileFeet(5));
    const cooldownSteps = Math.ceil((PLAYER.dash.duration + PLAYER.dash.cooldown) / DT) + 2;
    const events = runPlayer(
      p,
      grid,
      cooldownSteps * 2,
      (i) => input({ dashPressed: i === 1 || i === cooldownSteps + 1 }),
      { dash: true, glitchStrike: false },
    );
    expect(p.body.onGround).toBe(false);
    expect(events.filter((e) => e.type === 'playerDash')).toHaveLength(1);
  });

  it('stops when it hits a wall instead of passing through', () => {
    const grid = gridFrom(flatRoom());
    const p = new Player(tileX(36), tileFeet(13));
    settle(p, grid);
    p.facing = 1;
    runPlayer(p, grid, 40, (i) => input({ dashPressed: i === 0, moveX: 1 }), { dash: true, glitchStrike: false });
    expect(p.body.x + p.body.w).toBeLessThanOrEqual(39 * 16 + 1e-6);
    expect(p.isDashing).toBe(false);
  });
});

describe('Player attack', () => {
  const startupSteps = Math.ceil(COMBAT.attack.startup / DT);

  it('goes startup → active → recovery → none with the configured timing', () => {
    const grid = gridFrom(flatRoom());
    const p = new Player(tileX(5), tileFeet(13));
    settle(p, grid);
    runPlayer(p, grid, 1, () => input({ attackPressed: true }));
    expect(p.attackPhase).toBe('startup');
    expect(p.hitbox()).toBeNull();
    runPlayer(p, grid, startupSteps, () => input());
    expect(p.attackPhase).toBe('active');
    expect(p.hitbox()).not.toBeNull();
    const total = COMBAT.attack.startup + COMBAT.attack.active + COMBAT.attack.recovery;
    runPlayer(p, grid, Math.ceil(total / DT), () => input());
    expect(p.attackPhase).toBe('none');
  });

  it('places the side hitbox in the facing direction', () => {
    const grid = gridFrom(flatRoom());
    for (const facing of [1, -1] as const) {
      const p = new Player(tileX(10), tileFeet(13));
      settle(p, grid);
      runPlayer(p, grid, 1, () => input({ moveX: facing }));
      runPlayer(p, grid, 1 + startupSteps, (i) => input({ attackPressed: i === 0 }));
      const hb = p.hitbox();
      expect(hb).not.toBeNull();
      if (!hb) continue;
      if (facing === 1) expect(hb.x + hb.w).toBeGreaterThan(p.body.x + p.body.w + COMBAT.attack.side.reach - 1);
      else expect(hb.x).toBeLessThan(p.body.x - COMBAT.attack.side.reach + 1);
    }
  });

  it('attacks upward when holding up, downward only while airborne', () => {
    const grid = gridFrom(flatRoom());
    const p = new Player(tileX(10), tileFeet(13));
    settle(p, grid);
    runPlayer(p, grid, 1 + startupSteps, (i) => input({ attackPressed: i === 0, moveY: -1 }));
    expect(p.attackDir).toBe('up');
    expect(p.hitbox()!.y + p.hitbox()!.h).toBeLessThanOrEqual(p.centerY + 1e-6);
    runPlayer(p, grid, 60, () => input());

    // On the ground, down + attack is a side attack.
    runPlayer(p, grid, 1, () => input({ attackPressed: true, moveY: 1 }));
    expect(p.attackDir).toBe('side');
    runPlayer(p, grid, 60, () => input());

    // In the air it strikes downward.
    runPlayer(p, grid, 10, (i) => input({ jumpPressed: i === 0, jumpHeld: true }));
    runPlayer(p, grid, 1 + startupSteps, (i) => input({ attackPressed: i === 0, moveY: 1 }));
    expect(p.attackDir).toBe('down');
    expect(p.hitbox()!.y).toBeGreaterThanOrEqual(p.centerY - 1e-6);
  });

  it('buffers an attack pressed during recovery', () => {
    const grid = gridFrom(flatRoom());
    const p = new Player(tileX(10), tileFeet(13));
    settle(p, grid);
    const firstEnd = Math.ceil((COMBAT.attack.startup + COMBAT.attack.active + COMBAT.attack.recovery) / DT);
    const pressAt = firstEnd - 4;
    const events = runPlayer(p, grid, firstEnd + 4, (i) => input({ attackPressed: i === 0 || i === pressAt }));
    expect(events.filter((e) => e.type === 'playerAttack')).toHaveLength(2);
  });
});

describe('Player damage', () => {
  it('is knocked away from the source, stunned, and invulnerable', () => {
    const grid = gridFrom(flatRoom());
    const p = new Player(tileX(10), tileFeet(13));
    settle(p, grid);
    const events: string[] = [];
    expect(p.takeDamage(1, p.centerX + 20, (e) => events.push(e.type))).toBe(true);
    expect(p.body.vx).toBeLessThan(0);
    expect(p.body.vy).toBeLessThan(0);
    expect(p.isStunned).toBe(true);
    expect(p.health.current).toBe(PLAYER.maxHealth - 1);
    expect(p.takeDamage(1, p.centerX + 20, () => {})).toBe(false);
    expect(events).toEqual(['playerHurt']);
  });

  it('dying mid-attack cancels the attack and blocks further actions', () => {
    const grid = gridFrom(flatRoom());
    const p = new Player(tileX(10), tileFeet(13), 1);
    settle(p, grid);
    runPlayer(p, grid, 1 + Math.ceil(COMBAT.attack.startup / DT), (i) => input({ attackPressed: i === 0 }));
    expect(p.attackPhase).toBe('active');
    const events: string[] = [];
    p.takeDamage(1, p.centerX - 5, (e) => events.push(e.type));
    expect(events).toEqual(['playerHurt', 'playerDied']);
    expect(p.dead).toBe(true);
    expect(p.attackPhase).toBe('none');
    expect(p.hitbox()).toBeNull();
    const after = runPlayer(p, grid, 60, () => input({ attackPressed: true, jumpPressed: true, moveX: 1 }), {
      dash: true, glitchStrike: false,
    });
    expect(after.filter((e) => e.type === 'playerAttack' || e.type === 'playerJump')).toHaveLength(0);

    p.respawn(tileX(5), tileFeet(13));
    expect(p.dead).toBe(false);
    expect(p.health.current).toBe(1);
    const again = runPlayer(p, grid, 2, (i) => input({ attackPressed: i === 0 }));
    expect(again.some((e) => e.type === 'playerAttack')).toBe(true);
  });
});
