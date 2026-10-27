# Manual playtest checklist

Things automated tests can't judge (feel, visuals, audio, real devices). Run `npm run dev`, or serve the CI artifact.

## Critical path
- [ ] Title → **Begin** → arrive in Ashfall Hollow; area name banner shows.
- [ ] Walk right to the first Hearth Lantern; toast confirms, lantern lights.
- [ ] Defeat both Ashgrubs. Watch for: wind-up is readable; striking during the wind-up interrupts it.
- [ ] East door → Lantern Gallery; fade transition, no visible gap or wrong spawn.
- [ ] Try to jump the ember pit without Veilstep — you should fall short, lose one ember, return to the near ledge.
- [ ] Climb the ledges to the shrine (Wisps fire bolts; bolts can be struck down). Veilstep unlocks; HUD icon appears.
- [ ] Cross the pit with jump + dash. Second lantern lights.
- [ ] East door → Cinder Sanctum; gate closes when you step in; boss bar appears.
- [ ] Defeat the Kiln Warden: see all three patterns (ember rain only below half health). Gate reopens; victory screen shows time, deaths, secrets.

## Secret
- [ ] In Ashfall Hollow, strike the cracked wall left of the start three times; it crumbles. Collect the Heartcoal — max embers becomes 6.
- [ ] Die and retry: wall stays broken, Heartcoal stays collected.

## Edge cases to try to break
- [ ] Wall-hug while jumping; jump into ceiling corners — never stick or jitter.
- [ ] Stand still on a ledge for 10 s — no jitter; drop through one-way ledges with ↓ + Jump.
- [ ] Get hit repeatedly by overlapping enemies — damage only once per blink window.
- [ ] Ashgrub on the far side of a wall cannot hit you; you cannot hit it.
- [ ] Die mid-swing and mid-dash; retry; controls respond normally.
- [ ] Die to the boss; retry from Lantern #2; boss and gate reset.
- [ ] Pause during combat, resume — nothing moves while paused; the key that closed the menu doesn't make you jump.
- [ ] Alt-tab / switch tabs — the game auto-pauses.
- [ ] Camera never shows outside room edges, including at room corners.
- [ ] Resize the window — the game letterboxes and stays centred.
- [ ] Refresh mid-run → **Continue** resumes at the last lantern with abilities kept.

## Feel notes to capture
- Jump height / air control: too floaty, too heavy?
- Dash distance and cooldown.
- Strike reach and hit-stop strength.
- Boss: are telegraphs readable on first encounter? Is 20 HP too long or short?
- Gamepad (if available): which controller, any mapping issues.
