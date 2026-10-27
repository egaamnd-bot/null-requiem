import { COMBAT, GLITCH_STRIKE, PLAYER, PLAYER_GRAVITY, PLAYER_JUMP_VELOCITY, SIGNAL } from '../config/tuning';
import { bodyCenterX, bodyCenterY, createBody, moveBody, type Body } from './body';
import { attackHitbox } from './combat';
import type { AttackDirection, Emit } from './events';
import { Health } from './health';
import type { InputFrame } from './input';
import { approach, sign, type Rect } from './math';
import type { TileGrid } from './tiles';

export type AttackPhase = 'none' | 'startup' | 'active' | 'recovery';

export interface PlayerAbilities {
  dash: boolean;
  glitchStrike: boolean;
}

/**
 * The player character's movement and combat state machine.
 * Pure simulation: no rendering, no engine dependencies.
 */
export class Player {
  readonly body: Body;
  readonly health: Health;
  facing: 1 | -1 = 1;

  // Platforming
  private coyote = 0;
  private jumpBuffer = 0;
  private jumping = false;
  private dropTimer = 0;
  airTime = 0;

  // Dash
  private dashTimer = 0;
  private dashCooldown = 0;
  private dashAvailable = true;

  // Attack
  attackPhase: AttackPhase = 'none';
  attackDir: AttackDirection = 'side';
  attackId = 0;
  private attackTimer = 0;
  private attackBuffer = 0;
  /** True if current attack is a Glitch Strike (heavy charged attack). */
  isGlitchStrike = false;
  /** How long the attack button has been held continuously (for charge detection). */
  chargeTimer = 0;
  private chargeReady = false;
  /** IDs of things already hit this swing — prevent multi-hit per swing. */
  struckThisSwing = new Set<string>();
  /** Whether the swing-connect bonus (pogo / recoil) has been applied yet. */
  swingRewarded = false;

  // Signal Energy
  signalEnergy = 0;

  // Damage
  private stunTimer = 0;
  dead = false;

  constructor(feetX: number, feetY: number, maxHealth: number = PLAYER.maxHealth) {
    this.body = createBody(0, 0, PLAYER.width, PLAYER.height);
    this.health = new Health(maxHealth);
    this.placeAt(feetX, feetY);
  }

  get centerX(): number {
    return bodyCenterX(this.body);
  }

  get centerY(): number {
    return bodyCenterY(this.body);
  }

  get feetX(): number {
    return this.centerX;
  }

  get feetY(): number {
    return this.body.y + this.body.h;
  }

  get isDashing(): boolean {
    return this.dashTimer > 0;
  }

  get isAttacking(): boolean {
    return this.attackPhase !== 'none';
  }

  get isStunned(): boolean {
    return this.stunTimer > 0;
  }

  /** 0 when the dash is ready, rising to 1 right after use. */
  get dashCooldownRatio(): number {
    if (this.dashTimer > 0) return 1;
    return Math.max(0, this.dashCooldown) / PLAYER.dash.cooldown;
  }

  /** Place the player's feet at a point and clear all transient state. */
  placeAt(feetX: number, feetY: number): void {
    const b = this.body;
    b.x = feetX - b.w / 2;
    b.y = feetY - b.h;
    b.vx = 0;
    b.vy = 0;
    b.onGround = false;
    b.wasOnGround = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumping = false;
    this.dropTimer = 0;
    this.airTime = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashAvailable = true;
    this.cancelAttack();
    this.attackBuffer = 0;
    this.stunTimer = 0;
  }

  /** Full reset used when respawning at a checkpoint. */
  respawn(feetX: number, feetY: number): void {
    this.placeAt(feetX, feetY);
    this.health.restoreFull();
    this.dead = false;
    this.facing = 1;
  }

  cancelAttack(): void {
    this.attackPhase = 'none';
    this.attackTimer = 0;
    this.isGlitchStrike = false;
    this.chargeTimer = 0;
    this.chargeReady = false;
    this.struckThisSwing.clear();
    this.swingRewarded = false;
  }

  /** Active attack hitbox, or null outside the active window. */
  hitbox(): Rect | null {
    if (this.attackPhase !== 'active') return null;
    return attackHitbox(this.body, this.facing, this.attackDir);
  }

  /** Add signal energy (capped at max). Call from world when a swing connects. */
  gainSignal(amount: number, emit: Emit): void {
    const prev = this.signalEnergy;
    this.signalEnergy = Math.min(SIGNAL.max, this.signalEnergy + amount);
    if (this.signalEnergy !== prev) emit({ type: 'signalChanged', value: this.signalEnergy, max: SIGNAL.max });
  }

  step(input: InputFrame, grid: TileGrid, dt: number, abilities: PlayerAbilities, emit: Emit): void {
    const b = this.body;
    this.health.tick(dt);
    // Regen signal energy passively
    if (!this.dead) {
      const prev = this.signalEnergy;
      this.signalEnergy = Math.min(SIGNAL.max, this.signalEnergy + SIGNAL.regenRate * dt);
      if (Math.floor(this.signalEnergy) !== Math.floor(prev)) {
        emit({ type: 'signalChanged', value: this.signalEnergy, max: SIGNAL.max });
      }
    }

    if (this.dead) {
      b.vx = approach(b.vx, 0, PLAYER.airDecel * dt);
      b.vy = Math.min(b.vy + PLAYER_GRAVITY * PLAYER.fallGravityMultiplier * dt, PLAYER.maxFallSpeed);
      moveBody(b, grid, dt, { collideOneWay: true });
      return;
    }

    this.coyote -= dt;
    this.jumpBuffer -= dt;
    this.dropTimer -= dt;
    this.dashCooldown -= dt;
    this.stunTimer -= dt;
    this.attackBuffer -= dt;

    const control = this.stunTimer <= 0;
    if (control && input.jumpPressed) this.jumpBuffer = PLAYER.jumpBufferTime;
    if (control && input.attackPressed) this.attackBuffer = COMBAT.attack.bufferTime;

    if (control && !this.isAttacking && !this.isDashing && input.moveX !== 0) {
      this.facing = input.moveX;
    }

    // --- Dash ---
    if (
      control &&
      input.dashPressed &&
      abilities.dash &&
      this.dashTimer <= 0 &&
      this.dashCooldown <= 0 &&
      this.dashAvailable
    ) {
      if (input.moveX !== 0) this.facing = input.moveX;
      this.cancelAttack();
      this.dashTimer = PLAYER.dash.duration;
      if (!b.onGround) this.dashAvailable = false;
      this.jumping = false;
      this.jumpBuffer = 0;
      emit({ type: 'playerDash', x: this.centerX, y: this.centerY, facing: this.facing });
    }

    const preMoveVy = b.vy;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      b.vx = this.facing * PLAYER.dash.speed;
      b.vy = 0;
      if (this.dashTimer <= 0) this.endDash();
    } else {
      this.updateHorizontal(input, control, dt);
      this.updateJump(input, control, grid, emit);
      const gravity = PLAYER_GRAVITY * (b.vy > 0 ? PLAYER.fallGravityMultiplier : 1);
      b.vy = Math.min(b.vy + gravity * dt, PLAYER.maxFallSpeed);
    }

    moveBody(b, grid, dt, { collideOneWay: this.dropTimer <= 0, cornerCorrection: PLAYER.cornerCorrection });

    if (this.dashTimer > 0 && (b.hitWallLeft || b.hitWallRight)) this.endDash();

    if (b.onGround) {
      if (!b.wasOnGround && this.airTime >= PLAYER.landingMinAirTime) {
        emit({ type: 'playerLand', x: this.feetX, y: this.feetY, heavy: preMoveVy >= PLAYER.heavyLandingSpeed });
      }
      this.airTime = 0;
      this.coyote = PLAYER.coyoteTime;
      this.dashAvailable = true;
      this.jumping = false;
    } else {
      this.airTime += dt;
    }

    this.updateAttack(input, control, dt, abilities, emit);
  }

  private endDash(): void {
    this.dashTimer = 0;
    this.dashCooldown = PLAYER.dash.cooldown;
    // Carry momentum out of the dash at run speed rather than stopping dead.
    this.body.vx = this.facing * PLAYER.runSpeed;
  }

  private updateHorizontal(input: InputFrame, control: boolean, dt: number): void {
    const b = this.body;
    if (!control) {
      b.vx = approach(b.vx, 0, PLAYER.airDecel * 0.5 * dt);
      return;
    }
    const target = input.moveX * PLAYER.runSpeed;
    let rate: number;
    if (b.onGround) {
      const reversing = target !== 0 && sign(b.vx) !== 0 && sign(b.vx) !== sign(target);
      rate = target === 0 || reversing ? PLAYER.groundDecel : PLAYER.groundAccel;
    } else {
      rate = target === 0 ? PLAYER.airDecel : PLAYER.airAccel;
    }
    b.vx = approach(b.vx, target, rate * dt);
  }

  private updateJump(input: InputFrame, control: boolean, grid: TileGrid, emit: Emit): void {
    const b = this.body;
    if (control && this.jumpBuffer > 0) {
      if (input.moveY === 1 && b.onGround && this.standingOnlyOnOneWay(grid)) {
        // Down + jump drops through one-way platforms.
        this.dropTimer = PLAYER.dropThroughTime;
        this.jumpBuffer = 0;
        this.coyote = 0;
      } else if (b.onGround || this.coyote > 0) {
        b.vy = -PLAYER_JUMP_VELOCITY;
        this.jumping = true;
        this.coyote = 0;
        this.jumpBuffer = 0;
        emit({ type: 'playerJump', x: this.feetX, y: this.feetY });
      }
    }
    if (this.jumping && !input.jumpHeld && b.vy < 0) {
      b.vy *= PLAYER.jumpCutMultiplier;
      this.jumping = false;
    }
    if (b.vy >= 0) this.jumping = false;
  }

  private standingOnlyOnOneWay(grid: TileGrid): boolean {
    const b = this.body;
    const row = grid.rowAt(b.y + b.h + 0.5);
    const c0 = grid.colAt(b.x);
    const c1 = grid.colAt(b.x + b.w - 1e-4);
    let anyOneWay = false;
    for (let c = c0; c <= c1; c++) {
      if (grid.isSolid(c, row)) return false;
      if (grid.isOneWay(c, row)) anyOneWay = true;
    }
    return anyOneWay;
  }

  private updateAttack(input: InputFrame, control: boolean, dt: number, abilities: PlayerAbilities, emit: Emit): void {
    const a = COMBAT.attack;
    if (this.attackPhase !== 'none') {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        if (this.attackPhase === 'startup') {
          this.attackPhase = 'active';
          this.attackTimer += this.isGlitchStrike ? GLITCH_STRIKE.active : a.active;
        } else if (this.attackPhase === 'active') {
          this.attackPhase = 'recovery';
          this.attackTimer += this.isGlitchStrike ? GLITCH_STRIKE.recovery : a.recovery;
        } else {
          this.attackPhase = 'none';
          this.attackTimer = 0;
          this.isGlitchStrike = false;
        }
      }
    }

    // Glitch strike charge tracking: hold attack outside an active swing
    if (control && abilities.glitchStrike && input.attackHeld && this.attackPhase === 'none' && !this.isDashing) {
      const prevCharge = this.chargeTimer;
      this.chargeTimer += dt;
      if (!this.chargeReady && this.chargeTimer >= GLITCH_STRIKE.chargeTime && this.signalEnergy >= SIGNAL.glitchStrikeCost) {
        this.chargeReady = true;
      }
      if (prevCharge > 0 && this.chargeTimer === prevCharge) this.chargeTimer = dt; // safety
    } else if (!input.attackHeld || this.isDashing) {
      // Attack released — if charge was ready and we're not already in a swing, fire glitch strike
      if (this.chargeReady && this.attackPhase === 'none' && control && !this.isDashing) {
        this.signalEnergy = Math.max(0, this.signalEnergy - SIGNAL.glitchStrikeCost);
        emit({ type: 'signalChanged', value: this.signalEnergy, max: SIGNAL.max });
        this.isGlitchStrike = true;
        this.attackDir = 'side';
        this.attackPhase = 'startup';
        this.attackTimer = GLITCH_STRIKE.startup;
        this.attackId++;
        this.struckThisSwing.clear();
        this.swingRewarded = false;
        this.attackBuffer = 0;
        emit({ type: 'glitchStrike', x: this.centerX, y: this.centerY, facing: this.facing });
      }
      this.chargeTimer = 0;
      this.chargeReady = false;
    }

    if (control && this.attackBuffer > 0 && this.attackPhase === 'none' && !this.isDashing) {
      // Normal (uncharged) attack — only fire if charge is NOT ready
      if (!this.chargeReady) {
        const b = this.body;
        this.isGlitchStrike = false;
        this.attackDir = input.moveY < 0 ? 'up' : input.moveY > 0 && !b.onGround ? 'down' : 'side';
        this.attackPhase = 'startup';
        this.attackTimer = a.startup;
        this.attackId++;
        this.struckThisSwing.clear();
        this.swingRewarded = false;
        this.attackBuffer = 0;
        emit({ type: 'playerAttack', dir: this.attackDir });
      }
    }
  }

  /**
   * Called by the world when the current swing connects. Applies pogo (downward strike)
   * or recoil (side strike) at most once per swing.
   */
  onSwingConnected(pogoable: boolean, emit: Emit): void {
    if (this.swingRewarded) return;
    this.swingRewarded = true;
    const b = this.body;
    if (this.attackDir === 'down' && pogoable) {
      b.vy = -COMBAT.attack.pogoVelocity;
      this.jumping = false;
      this.dashAvailable = true;
      emit({ type: 'playerPogo', x: this.centerX, y: this.feetY });
    } else if (this.attackDir === 'side') {
      b.vx = -this.facing * COMBAT.attack.recoil;
    }
  }

  /**
   * Apply damage from a source at `sourceX`. Returns true if the damage landed.
   */
  takeDamage(amount: number, sourceX: number, emit: Emit): boolean {
    if (this.dead) return false;
    const result = this.health.tryDamage(amount, PLAYER.hurt.invulnerability);
    if (!result.applied) return false;
    const b = this.body;
    this.cancelAttack();
    this.dashTimer = 0;
    this.stunTimer = PLAYER.hurt.stunTime;
    this.jumping = false;
    const dir = sign(this.centerX - sourceX) || -this.facing;
    b.vx = dir * PLAYER.hurt.knockbackX;
    b.vy = -PLAYER.hurt.knockbackY;
    emit({ type: 'playerHurt', x: this.centerX, y: this.centerY, damage: amount });
    if (result.died) {
      this.dead = true;
      emit({ type: 'playerDied', x: this.centerX, y: this.centerY });
    }
    return true;
  }
}
