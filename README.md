# DRAM Visualizer (Web)

A DRAM visualization tool that runs entirely in the browser.

Built with React + TypeScript + MUI + Vite on the frontend, WebGL2 for
rendering, and a Rust core compiled to WebAssembly (wasm-bindgen).

## Features

### DRAM Configuration

Properties of the DRAM device itself. Applying them drives the Memory Map
layout.

- **Total Capacity** — total DRAM capacity (e.g. `32GB`)
- **DRAM Structure** — element counts for Channel / Rank / Bank / BankGroup /
  Subarray / Row / Column
- **Consistency check** — compares the summed bit width of the structures
  against the bit width of the total capacity and shows
  Consistent / Inconsistent

### Memory Controller Configuration

- **Address Mapping** — the address function for each target bit of each
  DRAM structure, entered as a bit mask (e.g. `0x14` = XOR of address bits 2
  and 4). Accepts hex (`0x…`), binary (`0b…`), and decimal; the expanded bit
  positions (`bits: 2,4`) are shown below the field

Applying it builds the address decoder on the WASM side.

### Memory Map

A WebGL2 semantic-zoom view that draws the DRAM hierarchy
(Channel → Rank → BankGroup → Bank → Subarray → Row → Column) as nested
rectangles.

- **Pan / zoom** — drag and scroll freely; the visible hierarchy depth
  switches automatically with the zoom level
- **Hover** — shows a breadcrumb tooltip for the element under the cursor
  (e.g. `Channel 0 › Rank 1 › …`)
- **Trace playback** — loads a memory access trace and flashes the accessed
  elements
  - load from a file (`.txt` / `.trace` / `.log`) or paste as text
  - single-step / play / pause / reset, with a playback-speed slider
  - shows the current access's address and its decoded hierarchy path

### Trace format

One `0x`-prefixed hex address per line.

```text
0x1A2B3C40
0xDEADBEEF
```

## Building

### Host dependencies

The entire toolchain (Rust, Node.js, wasm-bindgen, …) is provided by the
Nix dev shell; the host only needs these two:

| Dependency | Purpose |
|---|---|
| [Nix](https://nixos.org/) (with flakes) | provides the build environment |
| [just](https://github.com/casey/just) (optional) | task runner |

### Steps

```bash
just install   # npm install (fetch frontend dependencies; first time only)
just dev       # dev-build the WASM core and start the Vite dev server
just build     # production build (WASM release + tsc + vite build -> dist/)
just preview   # serve dist/ locally for a final check
```

### Tests and other recipes

```bash
just test        # frontend tests (Vitest)
just test-rust   # native tests of the Rust core (cargo test)
just lint        # cargo clippy + fmt check
just fmt         # cargo fmt
just build-wasm  # build only the WASM core (release / dev)
just clean       # remove build artifacts
```

## Layout

```
├── flake.nix                    # Nix dev shell (build environment)
├── justfile                     # task runner (every recipe runs inside the dev shell)
├── scripts/build-wasm.sh        # builds wasm/pkg/ with cargo + wasm-bindgen + wasm-opt
├── src/                         # React frontend (TypeScript + MUI + WebGL2)
│   ├── shared/backend.ts        # WASM invocation adapter
│   ├── features/configuration/  # Memory Controller configuration panel
│   └── features/memoryMap/      # Memory Map view (WebGL2 engine)
└── wasm/                        # Rust core (compiled to wasm32)
    ├── src/parse.rs             #   address decoder
    ├── src/trace.rs             #   trace parsing and decoding
    └── src/wasm_api.rs          #   wasm-bindgen bindings
```
