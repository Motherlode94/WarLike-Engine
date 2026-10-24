# WarLike Studio 3.0 Beta.5 — Project Hub, Native 3D Assets & Demo Repairs

## WarLike Hub (Unity Hub-inspired)
- Appears on app startup; create a named project, choose **Projet 2D** or **Projet 3D**, open a recent local project, rename/delete projects or recover the legacy single-scene browser save.
- Project names are stored in a local browser index with each project in a separate localStorage key. The app automatically saves the current named project every few seconds when not playing and again on page hide.
- Selected project type is locked in the editor: 2D projects use 2D tools and catalog; 3D projects use native 3D tools and catalog.
- The existing File -> New option opens WarLike Hub. A topbar Hub button and Save button are also available.
- Existing `warlike.scene.v1` scene is **not overwritten** by Hub autosave. Use the **Récupérer le projet précédent** action to migrate.
- Project storage is **browser-local only**, not a hosted backend project listing. Export the JSON separately to back up/copy the project; clearing browser storage removes these local projects.

## Native 3D catalog (43 prefabs)
- Entirely separate `js/assets/catalog-3d.js` with geometry classes and rendered SVG thumbnails.
- Categories: Primitives, Nature, Terrain, Buildings, Vehicles, Characters, Props.
- Actual WebGL solid geometry: cubes, curved polygon spheres/cylinders/cones, composite trees, simple buildings, humanoids and vehicle kits. Not converted 2D sprites.
- All native prefabs have independent width, height, depth and collision metadata. The 3D Project browser filters the native assets and supports double click to insert.
- World position is stored using ground X/Z with optional height Y; native prefabs can be exported and re-imported in scene JSON format v5.

## Demo improvements
- Corrected 2D Driving Sandbox to start close to the Jeep for E interactions.
- Improved the RTS building demo's Commander as a controllable character and moved the Combat Sandbox Jeep closer.
- Demo-specific Play hints are shown for Combat, Driving, Logic, RPG, Ninja/Zombies, Buildings RTS, Elements, game-mode demos and 3D demos.
- Three dedicated 3D scenes: **Ville**, **Nature** and **Garage**, each with a native 3D playable hero, correctly registered 3D prefabs, a working scene light and a source of positional sound.
- 3D Play recognizes the native playable mesh; it no longer injects a duplicate 2D test player. The 3D Audio Listener can follow the native mesh.
- 3D demos cannot overwrite the 2D scene. Switching to the other type is disabled for named Hub projects.
- Sprite-only 2D game modes are not misrepresented as full 3D gameplay systems. Garage 3D currently previews and explores vehicles; it does **not** implement 3D vehicle driving.

## Verification
- Structural smoke checks of all seven principal 2D demos, five 2D game modes, and three 3D demos succeeded: playable actor, known prefab IDs and unique object IDs.
- 3D scene checks: Ville 14 objects, Nature 13, Garage 14; each includes one native hero, valid meshes, lighting and sound.
- Added `tests/native-3d-assets.test.mjs`, `tests/project-hub.test.mjs`, and `tests/scene-demos-beta5.test.mjs`.
- JavaScript syntax and pure function checks completed; browser-level WebGL, input/audio and full automated suite are not yet fully tested. Live Cloudflare deployment is not verified.

## Next milestone
Automated Play/Stop E2E with Playwright/browser, true 3D animation and physics, 3D driving, asset import, multi-file project bundles and server-backed Hub project storage.
