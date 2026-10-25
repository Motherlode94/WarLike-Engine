# External Engine Components — licenses and use

WarLike integrates third-party engines as **dependencies**, without copying their source indiscriminately.

## Rapier 3D Physics
- Upstream: https://github.com/dimforge/rapier
- License: Apache License 2.0
- Dependency: `@dimforge/rapier3d-compat@0.21.0`
- Adapter: `js/core/rapier-physics-3d.js`
- Supported adapter functions: `loadRapier3d`, `createRapierScene`, `stepRapierScene`, `disposeRapierScene`

To use the adapter, the npm package must be installed and your application must be bundled or have an import map resolving the bare specifier. **The current static Cloudflare editor does not bundle npm imports by default.** The adapter is therefore opt-in and is not yet enabled in the browser Play Mode. Falling back to the internal physics is intentional.

Apache-2.0 obligations: preserve applicable copyright and license notices if redistributing library binaries and include a copy of the Apache 2.0 license and relevant NOTICE file, if any. The upstream library is not authored by WarLike.

## Jolt Physics (future native candidate)
- Upstream: https://github.com/jrouwe/JoltPhysics
- License: MIT
- Language: C++17
- Status: researched, **not copied or linked**.
- Do not claim that Jolt runs in WarLike until its build and runtime integration are tested.

## Acceptance criteria
1. Install dependencies and bundle for static hosting.
2. Integration test: create static ground + dynamic body; verify falling, collision, and restitution.
3. Verify memory disposal on scene reload and Play stop.
4. Compare simulation physics against fallback in browser.
5. Record timings across 10, 100, 1,000 moving rigidbodies.

Models, textures, scripts and game characters from third-party catalogs require separate per-asset license verification.
