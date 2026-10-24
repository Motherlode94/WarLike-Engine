# WarLike Studio 3.0 Beta.4 — Play fixes and separate 2D/3D projects

## Why Play did not appear to work
The earlier Beta.3 implemented WebGL 3D as a second view over the **same 2D scene** and drove game simulation inside the 2D renderer. This caused unclear results when selecting Play in the 3D viewport, and editing or loading a 3D demo could replace 2D content.

## Changes
- Two separate projects: **Projet 2D** and **Projet 3D**, each with its own objects, selection, next entity ID, viewport camera and Undo/Redo timeline.
- **Play/Stop is mode-specific**. The 2D controller and existing 2D gameplay run only in Projet 2D. The 3D mode has its **own prototype keyboard motor**, simple ground-plane obstacle collision and orbit/follow camera. It does not call the 2D gameplay simulator.
- The 2D renderer no longer drives the simulation; a dedicated requestAnimationFrame loop updates 2D only when that mode is active. Rendering of the hidden editor is suspended.
- The 3D editor displays its own inspector: Transform X / Z / height, 3D lighting, audio sources and provisional materials; 2D-only sprite, animator, vehicles and Visual Logic components are not shown in this panel.
- The toolbars and demo menus hide tools belonging to the other project. Game → 3D Beta Demo loads into **only the 3D project**.
- Switching projects is blocked while Play is active; Stop returns to the same edited project.
- If a scene has no player, Play creates a temporary test character and Stop restores the original edit scene and entity counter.
- Project JSON v5, browser autosave and available cloud scene storage include both independently named workspaces; older scene formats remain importable.
- Workspace restoration can re-sync the displayed renderer after backup recovery.

## How to test
1. Open **Projet 2D**; click Play; move with ZQSD/WASD. Click Stop.
2. Add a 2D object. Switch to **Projet 3D**; the 2D object must not be present.
3. In Projet 3D, click Play: use ZQSD/WASD and Shift; the 3D camera tracks the character, right-drag to orbit, wheel to zoom. Click Stop.
4. Create 3D objects, then return to Projet 2D. The 2D objects and edit selection should still be there.
5. Reload / export and reimport the scene and check both workspaces persist.

## Verification limits
Standalone JavaScript syntax validation passed for the edited modules. A targeted standalone workspace state-switch smoke test passed. Four new regression tests were committed in `tests/workspaces-play.test.mjs` but the full Node/browser suite was **not executed**, because GitHub network access was unavailable to the local test container. Deployment to Cloudflare Pages was also not verified.

## Current 3D Beta limitations
The new 3D Play motor is independent but intentionally **basic**: camera-relative planar movement and primitive collisions, not a full physics/animation/vehicle/AI engine. Features of the existing 2D game modes (Deathmatch, Roleplay etc.) are **2D-only** until ported and tested for 3D. No 3D jump, gravity, combat or full character rigging yet.
