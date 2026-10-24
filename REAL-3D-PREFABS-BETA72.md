# WarLike Studio Beta.7.2 — GLB Real Mesh Prefabs

## Real model library
The **Project 3D → Assets** panel now lists actual glTF 2.0 binary models, alongside the original procedural assets:
- Characters: Cesium Man, Fox
- Vehicle: Toy Car
- Props: Duck, Lantern, BoomBox, Antique Camera

These are Khronos glTF Sample Assets referenced by remote URLs, downloaded **on demand** from raw.githubusercontent.com. They are **not checked into the WarLike repository**. Sources and licenses must be reviewed model by model before redistributing in a commercial project: https://github.com/KhronosGroup/glTF-Sample-Assets

## Import your own weapons, characters and other meshes
Project 3D → Assets → **Importer un modèle GLB**, select a `.glb` file up to 25 MiB, then choose Characters, Weapons, Vehicles, or Props. The mesh is a real polygon mesh (triangles), not a fake primitive. Double click the asset or drag it into the scene. Local model files stay only in memory for this browser session; exporting JSON records the object reference but **does not embed binary model data**. On reload a local model must be imported again. Use a licensed asset that you have permission to use.

## Engine capabilities
WebGL static glTF2 binary decoder for embedded geometry: positions, normals, indexed triangles, basic vertex/node transforms and material baseColorFactor. GLB files that rely on unsupported geometry compression (Draco/Meshopt), sparse accessors or non-binary external buffers will not render. No skinning, skeletal animation, PBR texture maps, UV sampling or model physics integration yet; characters appear in bind pose and the renderer uses simple lit material colors. When loading fails the placeholder shows in red. Local model and remote model failures are logged in the browser console.

## Validation and limitations
JavaScript syntax was validated for the new loader, catalog, Project browser and viewport modules. Regression tests were committed for catalog references, weapon import and minimal GLB triangle parsing; full browser runtime and GitHub CI have **not** yet been confirmed. Remote models require a network connection and host CORS compatibility. A robust asset pipeline with permanent file uploads, animated characters, UV-texture rendering and weapon attachments is a future milestone.
