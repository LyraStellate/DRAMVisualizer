{
  description = "DRAM Visualizer (web) — React frontend + Rust/WASM core";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };

        # Stable toolchain with the wasm32 target for the browser build.
        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          targets = [ "wasm32-unknown-unknown" ];
          extensions = [ "rust-src" "rust-analyzer" "clippy" "rustfmt" ];
        };

        devTools = with pkgs; [
          rustToolchain
          nodejs_22
          # wasm-pack is intentionally not used: it downloads a wasm-bindgen-cli
          # binary at build time, which defeats a Nix-complete environment.
          # The crate's wasm-bindgen dependency must be pinned to this CLI's
          # exact version (see wasm/Cargo.toml).
          wasm-bindgen-cli
          binaryen # wasm-opt for release builds
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = devTools;

          shellHook = ''
            if [ -t 1 ]; then
            echo "DRAM Visualizer (web) dev shell"
            echo "  node          $(node --version)"
            echo "  rustc         $(rustc --version)"
            echo "  wasm-bindgen  $(wasm-bindgen --version)"
            echo ""
            echo "  npm install          # fetch frontend deps"
            echo "  npm run dev          # wasm dev build + vite dev server"
            echo "  npm run build        # release build (dist/)"
            fi
          '';
        };
      });
}
