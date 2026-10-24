# WarLike Studio V2.0 — Game Elements

28 new original offline SVG prefabs in the **Elements** category, for an estimated **175 catalog assets** total (147 + 28). These are visual 2D assets with configurable basic in-game behavior.

## Category content

- **Pickups (8):** coin, gem, health, ammo, keycard, shield, speed booster, quest scroll.
- **Gameplay (8):** checkpoint, spawn pad, portal, teleporter, pressure plate, lever, locked gate, session checkpoint terminal.
- **Hazards (4):** spikes, laser trap, toxic pool, mine.
- **Racing (4):** boost pad, jump pad, finish line, traffic light.
- **RTS (4):** capture flag, resource node, supply crate, rally point.

## How to try them
1. Open **Game → Elements / Interactions Demo**.
2. Press Play, walk with ZQSD / WASD.
3. Touch coins, gems, ammo and health to pick up.
4. Press E next to a lever, gate, teleporter or terminal.
5. Touch checkpoints and finish line, avoid damage traps.

## Inspector
Select an Element and edit **Game Element** properties: enabled, pickup amount, hazard damage, interaction radius, teleport destination, key name.

Scene JSON import/export and existing browser autosave preserve these properties; changes made in Play are reverted on Stop.

## Current scope
- No full RTS production economy attached to flags and resource nodes yet.
- Save terminal sets a runtime checkpoint; it is not persistent cloud saving.
- Traffic light and pressure plate are prototype decorations; lever toggles gates.
- Jump pad triggers an animation cue, not 3D physics.
- All artwork is generated SVG, not 3D models.
- JavaScript syntax checks passed, but full browser E2E checks and deployed site version remain unverified.
