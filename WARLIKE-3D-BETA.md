# WarLike Studio 3.0 Beta.1 — WebGL 3D

This is the first **actual GPU-rendered 3D viewport**, not a full native 3D engine. It works alongside the existing 2D editor and preserves the legacy 2D gameplay logic.

## Implemented
- WebGL 1 standalone implementation with perspective camera, depth buffer, solid shaded cuboids and floor grid. **No remote CDN or third-party 3D engine dependency.**
- Existing scene X/Y map onto 3D world X/Z. 2D sprite width and height become world dimensions. The new **elevation3d** property controls height above the ground, in world units.
- Additional primitive geometry for **buildings (roof, door, windows)**, **vehicles (cabin, wheels)** and **humanoid characters (head and legs)**.
- Orbit camera **right mouse drag**, middle mouse drag to pan, wheel to zoom, **3D Focus** to center selected objects.
- Left click selects a world object in 3D; Ctrl/Shift adds or removes objects from selection, and left dragging selected objects moves them on the ground plane.
- Top-of-view **2D / 3D Beta** toggle; viewport preference stored in local storage.
- **Game → Démo 3D Beta** creates a demo town with player, buildings, vehicles, monster and props and switches to the 3D viewport.
- Shared scene state: changes to X/Y and elevation appear in 3D without breaking standard scene JSON import/export; the original 2D editor stays available.
- Game's existing 2D simulation continues in Play while the WebGL viewer visualizes scene objects in 3D. Mouse aim is projected onto the ground in 3D view (experimental).

## What is not yet present
- No skeletal 3D rigs, animations, imported FBX/GLTF models, or physics-based rigid bodies.
- No true 3D collisions, 3D character controller, fly camera, 3D terrain, shadows or advanced material editor.
- Existing car/house/RP/combat logic remains 2D under the hood.
- 3D objects are **generated primitives**; inherited SVG sprite imagery is not textured onto them.
- Viewport and 3D camera are dependent on the browser's WebGL implementation.
- Runtime browser testing and CI execution were not confirmed in this update.

## Technical tests
`tests/viewport-3d.test.mjs` includes CPU projection, camera orientation, ground intersection and object extrusion tests. The modified JavaScript source files passed standalone syntax validation. Run `npm test` and `npm run typecheck` on the repo to verify runtime behavior.

This is **WarLike Studio 3.0.0-beta.1**, a development milestone, not a complete 3D replacement for Unity or Unreal.
