#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p native/dist
emcc native/warlike_pathfinding.cpp native/warlike_physics.cpp -O2 -std=c++17 -s WASM=1 -s MODULARIZE=1 -s EXPORT_ES6=1 -s ALLOW_MEMORY_GROWTH=1 -s ENVIRONMENT=web -s 'EXPORTED_FUNCTIONS=["_wl_find_path","_wl_integrate_gravity","_malloc","_free"]' -s 'EXPORTED_RUNTIME_METHODS=["HEAPF32"]' -o native/dist/warlike_pathfinding.mjs
echo 'Build ready: native/dist/warlike_pathfinding.mjs + .wasm'
