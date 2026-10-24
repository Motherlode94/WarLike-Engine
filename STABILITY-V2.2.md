# WarLike Studio V2.2 — Stability pass

This version concentrates on correctness and backward-compatible scene authoring, not more prefabs.

## Changes made

1. **Reusable interactions:** levers and pressure plates can be triggered more than once, without becoming permanently consumed after their first use.
2. **Inventory-based locked gates:** gate checks consult the RPG inventory key stored by the keycard pickup. A fabricated character property is no longer required.
3. **Context-sensitive interaction:** a player riding in a vehicle, entering/exiting one, or hidden inside a house cannot interact with world Elements using E.
4. **House/vehicle transitions:** attempting to leave a house doesn't immediately trigger a vehicle entry while the house transition is in progress.
5. **Scene import fidelity:** imported prefab animation names are validated against their actual humanoid clip library; house door state and house lighting values are retained.
6. **Game damage termination:** traps and Visual Logic damage at 0 HP now cause a Game Over in standalone Play or player elimination in a configured game mode.
7. **Clean session reset:** the RPG inventory, quest journal and dialogue runtime now reset on starting Play, matching other transient gameplay systems.

## Regression coverage

Added `tests/stability-v2.2.test.mjs`, with four tests:
- enter and exit a house;
- collect a keycard and unlock a gate;
- reuse a lever twice;
- prevent vehicle entry during a house transition.

These regression tests are **committed but not confirmed executed** in this environment. Syntax validation passed on the modified JavaScript files. Run `npm test` and `npm run typecheck` on a working checkout or CI. A full browser E2E pass is still necessary.

## Known limitations

WarLike remains a 2D, browser-based local gameplay editor with simple bots and procedural animations. It is not a complete online game engine. No multiplayer servers, realtime state replication, fully navigable interiors or physically realistic driving have been added in this stabilization pass.
