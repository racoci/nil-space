import initWasm, {
  generate_nil_penrose_hypergraph,
  evaluate_nil_geodesic_point,
  GeneratedHypergraphBuffer,
  NilPoint,
  compute_nil_holonomy
} from './nil_core.js';

let wasmInitialized = false;

export async function initNilWasm(): Promise<boolean> {
  if (wasmInitialized) return true;
  try {
    await initWasm();
    wasmInitialized = true;
    return true;
  } catch (err) {
    console.warn('WebAssembly module initialization fallback to TS runtime:', err);
    return false;
  }
}

export function isWasmInitialized(): boolean {
  return wasmInitialized;
}

export {
  generate_nil_penrose_hypergraph,
  evaluate_nil_geodesic_point,
  GeneratedHypergraphBuffer,
  NilPoint,
  compute_nil_holonomy
};
