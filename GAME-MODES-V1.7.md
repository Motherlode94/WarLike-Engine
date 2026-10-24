# WarLike Studio V1.7 — Game Modes

WarLike Studio now includes **5 configurable local game mode simulations**. Modes are original code, not imported network game services.

## Game modes

| Mode | Implemented behavior |
| --- | --- |
| Deathmatch | Solo score target, eliminations, bot respawn, match timer |
| Team Deathmatch | Team 1/2 assignment and team points, allied bot protection |
| Battle Royale | Shrinking danger zone, periodic damage outside zone, last survivor victory |
| Roleplay / RP | Editable starting role, change role with R, virtual money, paycheck interval |
| Frontline / Capture | Contested capture circle, team control, points over time, victory target |

## How to use

Go to **Game** → select a mode in the dropdown → **Charger la démo choisie**. Confirm replacing your current scene, then press Play. Before using the demo, export important scenes or use undo after loading.

To add a mode to an existing scene without replacing it: **Game → Ajouter Game Mode à la scène**. Select the main player. Configure the **Game Mode Rules** component in Inspector. Tune timer, win score, respawn, storm radius, roles or capture position as appropriate. Individual playable characters/bots have a **Game Role / Team** inspector component.

Existing scenes remain compatible. Mode definitions are attached to an entity as its `gameMode` field and are preserved by scene JSON export/import and browser autosave. Game Mode runtime scores, role income and round state reset when stopping Play.

## Developer modules

- `js/core/game-modes.js`: rules, role state, elimination, capture, BR storm, HUD
- `js/core/gameplay.js`: elimination and team-aware combat integration
- `js/core/scene.js`: templates and mode components
- `js/ui/inspector.js`: configuration controls
- `js/ui/studio-menu.js` and `index.html`: mode selector and demo launcher
- `tests/game-modes.test.mjs`: regression tests

## Limits

**No multiplayer networking, dedicated servers, parties, lobbies, matchmaking, player accounts, persistent economic database, synchronization or anti-cheat.** Solo/local bots only. Roleplay jobs currently provide a named role and salary but not full policing, medicine, vehicle maintenance or commerce mechanics. Battle Royale has a shrinking circular danger zone but not loot drops, aircraft insertion, or networked squads. Frontline uses a simple stationary capture circle and basic team score, not a fully networked territorial war.
