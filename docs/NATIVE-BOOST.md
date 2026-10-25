# WarLike Native Boost — C# and C++ integration

## Architecture

- **WebGL / JavaScript:** browser editor, scene authoring, visual scripting and rendering.
- **C++17 / WebAssembly:** optional accelerated pathfinding, AABB collision, gravity integration and *batched* gravity integration.
- **C# / .NET 8:** independent gameplay runtime using components with Awake, Start, Update, FixedUpdate, OnDestroy. A localhost HTTP bridge handles scene import and tick.

## Build the native WASM module

Prerequisite: Emscripten `emcc`.

```sh
sh native/build-wasm.sh
```

Publish both `native/dist/warlike_pathfinding.mjs` and `.wasm` with the web app. Without these artifacts, WarLike intentionally falls back to JS. Exported C symbols: `wl_find_path`, `wl_overlap_aabb3d`, `wl_integrate_gravity`, and `wl_integrate_gravity_batch`.

Batch ABI: a Float32 buffer with groups of **four** elements `[elevation, verticalVelocity, gravity, restitution]`. The first two elements are overwritten per body. Returning the body count indicates success. This reduces JS→WASM call overhead; actual speedup must be benchmarked.

## Run the C# runtime locally

Prerequisite: .NET 8 SDK.

```sh
dotnet build csharp/WarLike.Runtime
dotnet run --project csharp/WarLike.Bridge
```

The bridge listens only on `127.0.0.1:8765`, with `GET /health`, `POST /scene`, `POST /tick`. Supported browser origins are explicitly constrained; `POST /scene` is capped at 2 MiB. It does **not** execute untrusted arbitrary C# scripts. It is not yet wired into every browser Play Mode path. Never expose the bridge to the public Internet.

## Required validation

1. Compile native C++ as WebAssembly and run `node --test tests/*.test.mjs`.
2. Run `npm run typecheck` and `dotnet build` for Runtime and Bridge.
3. Test JS fallback versus native across 0, 1, 100 and 1,000 physics bodies.
4. Check collisions, bounce thresholds, deterministic fixed-step behaviour and both native load states.
5. Profile browser FPS and CPU against real game scenes; do not claim AAA performance without measurements.

## Remaining challenges

Continuous collision detection, mature rigidbody solver, scene-to-C# gameplay synchronization, skeletal animation, PBR textures, asset persistence and standalone builds.
