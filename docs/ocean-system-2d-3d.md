# WarLike Ocean System — Phase A (2D + 3D)

WarLike Ocean System shares deterministic wave mathematics between **2D sprites** and **3D meshes**. It is a foundation for an Ocean / Lakes / Rivers extension, not a finished fluid or maritime simulator.

## Integrated
- `js/core/ocean-system.js`: normalized wave parameters; multi-wave Gerstner-style height, horizontal displacement and surface normals; pure 2D area-based and 3D volume-based buoyancy force sampling.
- `js/core/stylized-water.js`: the existing `style:'ocean'` visual in both dimensions now uses the shared wave height sampler. Other styles remain unchanged.
- Standalone Web runtime manifest includes the new module.
- Regression tests assert deterministic waves, mesh data sanity, dry/submerged buoyancy and clamped invalid settings.

## Technical contract
- Coordinates for `oceanSample(x,z,time,config)` use **X/Z as a shared horizontal plane**, returning height along **Y**.
- `waterBuoyancy2d(body,water,time)`: body centre Y, width-derived area (m² per unit thickness), body height and density.
- `waterBuoyancy3d(body,water,time)`: centre Y, submerged volume (m³), height and density.
- Both force functions are *pure queries*. A physics backend must apply `netForceY` and drag to active Rigidbody2D/Rigidbody3D to affect motion. Current implementation does not yet integrate forces, pressure, torque, currents, wakes or boat controllers.
- `waterHeight` returns vertical height for rendering; horizontal displacement from `oceanSample` is currently available through the API but not applied to mesh vertices.

## Further milestones
1. Couple buoyancy to Rigidbody2D and Rigidbody3D through a native `Buoyancy` component, with correct world-space sampling and fixed-step forces.
2. Sample the ocean mesh with world-space X/Z for seamless tiles, render offset, normal and foam consistently.
3. Extend lakes and rivers with spline/current fields, shore foam and underwater volumes.
4. Connect HDRI/reflection probes to water shading, plus roughness/Fresnel.
5. Publish a separately versioned `WarLike Ocean` extension with Inspector controls, WarScript/WarNode nodes and an Engine-authored demo for 2D and 3D.
6. Browser certify Editor vs exported game with a 2D floating object and 3D boat, including reload.

Do not mislabel the foundation as complete OceanCore parity or certified fluid simulation.
