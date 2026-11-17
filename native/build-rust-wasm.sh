#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
if ! command -v cargo >/dev/null 2>&1; then echo 'cargo is required' >&2; exit 1; fi
mkdir -p native/dist
cargo build --manifest-path rust/geometry-kernel/Cargo.toml --release --target wasm32-unknown-unknown
cp rust/geometry-kernel/target/wasm32-unknown-unknown/release/warlike_geometry_kernel.wasm native/dist/warlike_geometry_kernel.wasm
echo 'Optional Rust geometry backend generated: native/dist/warlike_geometry_kernel.wasm'
