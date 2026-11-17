//! Optional geometry kernel for WarLike Editor ray/axis interaction.
//! Pure deterministic math; no DOM, files, network or JS runtime dependency.
//! Build (optional): cargo build --manifest-path rust/geometry-kernel/Cargo.toml --target wasm32-unknown-unknown --release

/// Return the parameter t on a world-space gizmo axis closest to a camera ray.
/// Axis and ray direction are normalized internally. Parallel/degenerate input
/// returns NaN; the editor should fall back to its established TypeScript path.
#[no_mangle]
pub extern "C" fn wl_axis_ray_parameter(
    ox: f32, oy: f32, oz: f32, dx: f32, dy: f32, dz: f32,
    ax: f32, ay: f32, az: f32, vx: f32, vy: f32, vz: f32,
) -> f32 {
    let values = [ox, oy, oz, dx, dy, dz, ax, ay, az, vx, vy, vz];
    if values.iter().any(|v| !v.is_finite()) { return f32::NAN; }
    let dlen = (dx * dx + dy * dy + dz * dz).sqrt();
    let vlen = (vx * vx + vy * vy + vz * vz).sqrt();
    if dlen <= 1e-8 || vlen <= 1e-8 { return f32::NAN; }
    let d = [dx / dlen, dy / dlen, dz / dlen];
    let v = [vx / vlen, vy / vlen, vz / vlen];
    let w = [ox - ax, oy - ay, oz - az];
    let b = d[0] * v[0] + d[1] * v[1] + d[2] * v[2];
    let dw = d[0] * w[0] + d[1] * w[1] + d[2] * w[2];
    let vw = v[0] * w[0] + v[1] * w[1] + v[2] * w[2];
    let denom = 1.0 - b * b;
    if denom.abs() <= 1e-6 { return f32::NAN; }
    let t = (vw - b * dw) / denom;
    if t.is_finite() { t } else { f32::NAN }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn picks_axis_coordinate() {
        let t = wl_axis_ray_parameter(4., 2., 4., 0., -1., 0., 0., 0., 0., 1., 0., 0.);
        assert!((t - 4.).abs() < 1e-5);
    }
    #[test]
    fn parallel_is_explicitly_unsupported() {
        assert!(wl_axis_ray_parameter(0., 1., 0., 1., 0., 0., 0., 0., 0., 1., 0., 0.).is_nan());
    }
    #[test]
    fn rejects_non_finite() {
        assert!(wl_axis_ray_parameter(f32::INFINITY, 0., 0., 0., 1., 0., 0., 0., 0., 1., 0., 0.).is_nan());
    }
}
