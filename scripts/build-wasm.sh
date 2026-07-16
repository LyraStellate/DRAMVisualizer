#!/usr/bin/env bash
# Build the Rust core to wasm/pkg/ with cargo + wasm-bindgen-cli (both provided
# by the Nix dev shell).
#
# wasm-pack is intentionally not used: it downloads a wasm-bindgen-cli binary
# from the network on first run, which defeats a Nix-complete build
# environment. The wasm-bindgen crate version in wasm/Cargo.toml is pinned to
# the CLI version the flake provides; wasm-bindgen aborts with a clear error
# if they ever diverge (e.g. after a `nix flake update`).
set -euo pipefail
cd "$(dirname "$0")/.."

profile="${1:-release}" # release | dev
flags=()
target_dir="wasm/target/wasm32-unknown-unknown/debug"
if [ "$profile" = "release" ]; then
  flags+=(--release)
  target_dir="wasm/target/wasm32-unknown-unknown/release"
elif [ "$profile" != "dev" ]; then
  echo "usage: $0 [release|dev]" >&2
  exit 1
fi

cargo build --manifest-path wasm/Cargo.toml --target wasm32-unknown-unknown ${flags[@]+"${flags[@]}"}
wasm-bindgen --target web --out-dir wasm/pkg "$target_dir/dram_visualizer_lib.wasm"
if [ "$profile" = "release" ]; then
  wasm-opt -O --output wasm/pkg/dram_visualizer_lib_bg.wasm wasm/pkg/dram_visualizer_lib_bg.wasm
fi
