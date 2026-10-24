# WarLike Engine V0.7 — Gameplay Sandbox

## New: one-click playable game
1. Open the WarLike Web editor.
2. Click **⚔ Combat Sandbox**. This creates a **new demo scene** (it replaces the current edit scene, recorded as a step in undo history). To preserve an existing project first, export the scene or ensure cloud/local save is secure.
3. Click **▶ Play** or the **Game** tab.
4. Move with **ZQSD / WASD / arrow keys**, aim with the mouse, and fire with **left mouse**, **F**, or **Space**.
5. Fight zombies and goblins; use obstacles as cover and collect medkits to recover health.
6. **Stop** returns the unchanged authored edit scene (runtime movement and defeated enemies are not saved).

## Systems implemented
- Player directional movement with collision against solid props and walls.
- Fixed-rate weapon fire with projectiles, simple hit detection, and enemy HP.
- Enemies with chase / patrol movement, contact damage and HP.
- Particle impacts, muzzle flashes, health pickups, score, kill counter, Game Over.
- Runtime rendering and persistent existing editor tools and prefab library.

## Limitations
This is a playable **top-down action prototype**, not a complete game engine. There are no enemy pathfinding meshes, inventory, ammunition and reload, vehicle controls, true component-based physics, animation controllers or professional game authoring pipeline yet. Generated enemies use the vector asset catalog.

## Saving
The authored edit scene still auto-saves to this browser. Cloud persistence requires the previously documented Cloudflare bindings and private token; it is not enabled automatically.

## Files
- `js/core/gameplay.js` — runtime simulation and combat
- `js/core/renderer.js` — editor viewport and runtime overlays
- `js/core/scene.js` — demo scene creator, Play/Stop
- `js/editor.js` — UI wiring
