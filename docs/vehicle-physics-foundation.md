# Vehicle physics foundation — Phase V1

This phase adds a pure, testable wheel-force solver: spring/damper suspension,
ground contacts, longitudinal traction, lateral grip, steering, braking and
friction-circle saturation. It does **not** activate wheel simulation in Play mode.

## Integration contract
- Use SI units internally. The current scene coordinate scale is 64 scene units per metre.
- For every wheel, raycast through Rapier along the suspension axis, excluding the vehicle chassis.
- Feed the contact and body linear/angular velocities into `solveWheelForces`
  using a fixed physics tick (e.g. 1/60 s).
- Apply the returned force at `contact.point` to the chassis rigidbody;
  do not just translate the visual mesh. Synchronize wheel mesh transforms.
- Enable vehicle rigidbody rotation and CCD where appropriate.
- Preserve `VehicleController` arcade fallback for existing projects.
- Save and restore wheel configurations, then match exported Web runtime.
- Extend the Inspector with per-wheel position, radius, travel, spring,
  damper, grip, drivetrain selection and vehicle presets.

## Acceptance criteria for the next phase
Four wheels on uneven terrain, suspension rebound, slopes, dynamic impacts,
different grip materials, reverse braking, detached wheels, 2D/3D parity policy,
Play/Stop persistence and exported-runtime equivalence. Browser certification
and Rapier force integration are **not yet complete**.
