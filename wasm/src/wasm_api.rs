//! WASM bindings for the frontend.

use serde::Serialize;
use serde_wasm_bindgen::Serializer;
use wasm_bindgen::prelude::*;

use crate::models::{AddressMapping, AllDRAMStructure, TraceEntry};
use crate::parse::{AddressDecoder, create_all_structure_from_mapping};
use crate::trace::{decode_window, parse_trace};

/// Parse errors reported back to the frontend are truncated to this many.
const MAX_REPORTED_TRACE_ERRORS: usize = 100;

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
fn start() {
    // Without this hook a wasm panic surfaces as an unreadable
    // "unreachable executed" trap; with it the panic message and stack
    // trace land in the browser console.
    console_error_panic_hook::set_once();
}

fn to_js<T: Serialize>(value: &T) -> Result<JsValue, String> {
    value
        .serialize(&Serializer::json_compatible())
        .map_err(|e| e.to_string())
}

#[wasm_bindgen]
#[derive(Default)]
pub struct DramVisualizerCore {
    structures: AllDRAMStructure,
    decoder: Option<AddressDecoder>,
    trace: Vec<TraceEntry>,
}

#[wasm_bindgen]
impl DramVisualizerCore {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self::default()
    }

    #[wasm_bindgen(js_name = setupMemoryController)]
    pub fn setup_memory_controller(&mut self, mapping: JsValue) -> Result<(), String> {
        let mapping: AddressMapping =
            serde_wasm_bindgen::from_value(mapping).map_err(|e| e.to_string())?;

        let n: usize = mapping.values().map(Vec::len).sum();
        if n == 0 || n > 48 {
            return Err(format!(
                "Unsupported matrix size N = {}. N must be between 1 and 48.",
                n
            ));
        }

        self.structures = create_all_structure_from_mapping(&mapping);
        self.decoder = Some(AddressDecoder::new(&mapping));
        Ok(())
    }

    #[wasm_bindgen(js_name = loadAccessTrace)]
    pub fn load_access_trace(&mut self, content: &str) -> Result<JsValue, String> {
        if self.decoder.is_none() {
            return Err(
                "Memory controller is not set up. Apply a configuration before loading a trace."
                    .to_string(),
            );
        }
        let (entries, mut errors) = parse_trace(content);
        errors.truncate(MAX_REPORTED_TRACE_ERRORS);
        let total = entries.len();
        self.trace = entries;
        to_js(&crate::models::TraceSummary { total, errors })
    }

    #[wasm_bindgen(js_name = getDecodedAccesses)]
    pub fn get_decoded_accesses(&self, start: usize, count: usize) -> Result<JsValue, String> {
        let decoder = self.decoder.as_ref().ok_or_else(|| {
            "Memory controller is not set up. Apply a configuration before decoding accesses."
                .to_string()
        })?;
        to_js(&decode_window(
            decoder,
            &self.structures,
            &self.trace,
            start,
            count,
        ))
    }
}
