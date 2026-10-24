# WarLike Studio 1.4.1 — TypeScript + C# interoperability

## What runs where

- **Browser / Cloudflare Pages**: existing ES-module JavaScript engine, the new **110-asset local content pack**, animation/VFX rendering, Visual Logic, RPG and vehicles.
- **TypeScript**: strict type contracts for scenes, prefabs, animation, triggers, dialogue and vehicle settings. Types are compile-time only; no TypeScript runtime is needed by the browser.
- **Typed math library**: source in `types/systems.ts`, compiled-compatible output in `js/typed/systems.js`. The web vehicle controller now imports its geometry and validated physics defaults from the browser module.
- **C#**: optional Unity 6000.3 bridge under `unity/`; **C# does not run in Cloudflare Pages or the browser**.

## Develop TypeScript

Run locally (for developers who want to change the typed modules):

```sh
npm install
npm run typecheck
npm test
npm run build:types
```

`build:types` emits ES modules and declaration files under `js/typed/`. The existing static site continues to work without these commands because compiled-compatible JavaScript is already committed.

GitHub Actions runs typechecking and JavaScript geometry/schema tests on pushes to main and on pull requests. It does **not** validate Unity C# compilation.

## Unity (optional)

Copy `unity/WarLikeVehicle2D.cs` and `unity/WarLikeSceneImporter.cs` to `Assets/WarLikeBridge/` in a Unity 6 2D project.

1. Create a GameObject with `WarLikeSceneImporter`.
2. Export a scene JSON from WarLike Studio and import it as a TextAsset into Unity.
3. Assign the asset to `sourceScene` in the importer and use its **Import WarLike Scene** component context menu.
4. The importer creates objects with placeholder colored SpriteRenderers, optionally BoxCollider2D and Rigidbody2D/vehicle components. Actual detailed WarLike SVG images are **not** automatically converted into Unity sprites.
5. On a generated vehicle, enable `playerDriving` to use Horizontal/Vertical input axes. Legacy input manager or **Both** input mode is required; Unity's new Input System alone is not wired in this bridge.

Web pixel coordinates are converted into Unity units using `pixelsPerUnit`. This is an initial interchange bridge, **not** a production-ready 1:1 Unity scene converter (materials, complex colliders, animation clips, Game Creator 2 modules, and physics scene fidelity are not transferred).

## Content pack V1.4

Expansion in `js/assets/expansion.js`: **56 extra offline illustrations**, adding 8 playable-looking character variants, 8 monsters, 8 vehicles, 8 weapons, 12 props and 12 VFX effects (54 + 56 = 110 items). Preset animations in `js/assets/animation-vfx.js`: procedural idle/walk/run/attack/hurt/death/move/pulse/loop depending on asset type. Effects are rendered on Canvas. These are stylized vector assets and procedural animations; **not** dozens of hand-drawn multi-frame spritesheets.

## Known limitations

- No performance benchmark has established a frame-rate increase from TypeScript or C#. TypeScript improves type safety and maintainability, C# extends Unity compatibility.
- Browser persistence remains local unless the Cloudflare KV integration is configured.
- Unity C# compilation and production browser end-to-end tests require their respective runtime environments.
