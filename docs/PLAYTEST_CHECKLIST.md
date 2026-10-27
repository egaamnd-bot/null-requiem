# Manual playtest checklist

This covers what automated tests can't judge: feel, visuals, audio and real devices. Run `npm run dev`, or serve the CI artifact.

## Critical path
- [ ] Title → **Start** → arrive in Rainline Alley. The area name banner shows and rain is falling.
- [ ] Walk right to the first Sync Relay. The screen turns cyan and a toast confirms it.
- [ ] Defeat both Scrap Hounds. Check that the wind-up is readable and that striking during it interrupts the lunge.
- [ ] Take the east door to Transit Stacks. The fade transition plays with no visible gap or wrong spawn.
- [ ] Climb the catwalks to the Backtrace module. Drones fire bolts, and bolts can be struck down. Backtrace unlocks, and the HUD icon and echo appear.
- [ ] Cross the live-current pit with a jump and a dash. The second relay links.
- [ ] Touch the security gate. A toast says the switch is back down the line.
- [ ] Solve the gate:
  1. Stand at the gate for a second.
  2. Run back to the switch and strike it.
  3. Press **L** while the echo is at the gate.
  4. Walk through. The gate stays open afterwards.
- [ ] Take the east door to Precinct Vault. The shutter closes behind you and the boss bar appears.
- [ ] Defeat BULWARK-9 and see all three patterns (plasma rain only appears below half health). The shutter reopens, and the victory screen shows time, deaths and secrets.

## Backtrace specifics
- [ ] Take a hit, then Backtrace within 4 seconds. The lost integrity comes back.
- [ ] Backtrace while an enemy stands on your echo. The burst damages it.
- [ ] After using it, the icon dims and fills back over 6 seconds, and the echo is faint until ready.
- [ ] Close the gate on your echo's spot. Backtrace lands you at the nearest valid earlier spot, never inside the gate.

## Secret
- [ ] In Rainline Alley, strike the cracked wall left of the start three times until it crumbles. Collect the Integrity Cell; max integrity becomes 6.
- [ ] Die and retry. The wall stays broken and the cell stays collected.

## Edge cases to try to break
- [ ] Wall-hug while jumping, and jump into ceiling corners. You should never stick or jitter.
- [ ] Stand still on a catwalk for 10 seconds with no jitter, then drop through with Down + Jump.
- [ ] Get hit repeatedly by overlapping enemies. Damage should land only once per blink window.
- [ ] Put a Scrap Hound on the far side of a wall. It can't hit you and you can't hit it.
- [ ] Die mid-swing, mid-dash and right after a Backtrace, then retry. Controls should respond normally.
- [ ] Die to the boss and retry from relay #2. The boss and shutter reset.
- [ ] Pause during combat, then resume. Nothing moves while paused, and the key that closed the menu doesn't make you jump.
- [ ] Alt-tab or switch tabs. The game auto-pauses.
- [ ] The camera never shows outside room edges.
- [ ] Resize the window. The game letterboxes and stays centred.
- [ ] Refresh mid-run and choose **Continue**. You resume at the last relay with abilities kept.

## Feel notes to capture
- Jump height and air control: too floaty, too heavy?
- Dash distance and cooldown.
- Backtrace: is 4s the right window? Is a 6s cooldown too punishing in the boss fight?
- Strike reach and hit-stop strength.
- Boss: are the telegraphs readable on first encounter? Is 20 HP too long or too short?
- Gamepad (if available): which controller, and any mapping issues.
