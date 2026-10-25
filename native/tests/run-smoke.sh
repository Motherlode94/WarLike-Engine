#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/../.."
compiler="${CXX:-c++}"
output="$(mktemp "${TMPDIR:-/tmp}/warlike-physics.XXXXXX")"
trap 'rm -f "$output"' EXIT HUP INT TERM
"$compiler" -std=c++17 -O2 -Wall -Wextra -Werror native/warlike_physics.cpp native/tests/physics_smoke.cpp -o "$output"
"$output"
