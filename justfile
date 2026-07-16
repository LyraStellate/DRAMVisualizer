# DRAM Visualizer (web) task runner.
#
# Every recipe runs *inside* the Nix dev shell automatically, so you never need
# to `nix develop` yourself — just `just <recipe>` from the host.
# Requires: `just` and `nix` (with flakes) on the host PATH.

# Run all recipes through the flake dev shell.
set shell := ["nix", "develop", "--command", "bash", "-euo", "pipefail", "-c"]

# List available recipes.
default:
    @just --list --unsorted

# Fetch frontend dependencies (npm).
install:
    npm install

# Build the WASM core only (profile: release | dev).
build-wasm profile="release":
    bash scripts/build-wasm.sh {{profile}}

# Run the Vite dev server (builds the WASM core in dev profile first).
dev:
    npm run dev

# Build the production bundle (dist/).
build:
    npm run build

# Serve the production bundle locally.
preview:
    npm run preview

# Run frontend tests (Vitest).
test:
    npm test

# Run the Rust tests natively (no wasm involved).
test-rust:
    cargo test --manifest-path wasm/Cargo.toml

# Lint and format the Rust code.
lint:
    cargo clippy --manifest-path wasm/Cargo.toml
    cargo fmt --manifest-path wasm/Cargo.toml --check

fmt:
    cargo fmt --manifest-path wasm/Cargo.toml

# Remove build artifacts.
clean:
    cargo clean --manifest-path wasm/Cargo.toml
    rm -rf dist wasm/pkg
