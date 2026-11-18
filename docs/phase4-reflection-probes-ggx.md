# Phase 4 — capture probes and multi-level GGX rollout

This branch starts the Phase 4 implementation from the merged Phase 3 main. It is **not** a completed reflection-rendering implementation.

## Implemented in this branch
- A six-face, 90-degree real-scene capture interface with documented cube-face orientations, size/clipping validation, copy-safe RGBA8 pixels and cancellation support.
- Nearest-first selection for the four existing HDRI influence volumes in the active camera region.
- Unit tests for capture contract and probe selection.

## Still required for the requested complete phase
1. Wire the engine scene renderer to the capture callback with 90-degree six-direction cameras, including GLB geometry, materials, shadowing, lights, and exclusion of the captured probe. Ensure WebGL viewport/framebuffer/state restoration and avoid recursive probes.
2. Capture into cubemap faces, with explicit source and update modes (On Awake / On Demand / Every Frame where feasible), persistence, and budgeted incremental updates.
3. Implement GGX mip-chain generation for roughness levels and sample the matching LOD; WebGL1 requires a supported LOD extension or compatible texture-level alternative, plus fallback.
4. Blend indoor/outdoor probe irradiance, avoid black seams/edge leaks, and handle overlapping volumes.
5. Build CHAMBRE 07 visual regression cases for indoor vs outdoor, smooth vs rough GLB materials, and moving occluders.
6. Verify that Web export packages actual captured cubemaps and reproduces editor pixels without network fetches.
7. Run unit, WebGL browser, export and runtime-acceptance workflows before merging.

### Acceptance criteria
- Probe visible objects/walls in reflection, not merely the original global sky HDRI.
- Smooth metallic surfaces have sharply detailed reflections; increasing roughness correctly blurs them.
- Interior and exterior transitions are continuous and reproducible after save/reopen.
- CHAMBRE 07 exported pixel comparisons match editor within an explicitly measured tolerance.
- No WebGL errors or GPU texture leaks; preview can fall back safely on weak GPUs.
