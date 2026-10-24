# WarLike Studio V0.9 — Vehicle Controller 2D

## Driving Sandbox
1. In WarLike Studio click **🚗 Driving Sandbox** (this replaces the edit scene; undo via Ctrl+Z).
2. Click Play / Game.
3. Walk to the Jeep and press **E** to enter.
4. Use **Z/W / ↑** to accelerate, **S / ↓** to reverse/brake, **Q/A / ←** and **D / →** to steer.
5. Use **Space** for a handbrake and **E** to exit.
6. Test the Jeep, slower Tank and agile Buggy against solid crates and rocks.

## Editable Inspector settings
For any prefab categorized under Vehicles, Vehicle Controller 2D exposes:
- Max Speed (world units/second), Acceleration (world units/second²)
- Brake Force, Turn Rate (degrees per second)
- Drag (velocity damping), Collision Radius

Settings are serialized into scene JSON and browser automatic save. Existing saved vehicle prefabs use safe defaults. In Play mode changes are discarded by Stop, like other runtime edits.

## Technical scope
Code: `js/core/vehicle.js`; simulation uses a lightweight deterministic-step-ish kinematic model based on browser frame delta with maximum frame step, velocity, acceleration, steering proportional to speed, reverse gear, friction/drag and circle-vs-AABB obstacle rejection. This is **not** yet a full rigidbody physics engine (no suspension, deformable collisions, tire slip integration or friction impulses). The vehicle is rendered by the existing procedural 2D asset catalog.

For future production physics: integrate a locally hosted, audited MIT/Apache-compatible 2D physics library with fixed-step simulation, vehicle colliders, collision layers and collision callbacks.
