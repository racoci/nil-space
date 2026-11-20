/* tslint:disable */
/* eslint-disable */

/**
 * Flat hypergraph buffer structure generated in Rust for zero-copy WebAssembly sharing
 */
export class GeneratedHypergraphBuffer {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    get_edge_types_len(): number;
    get_edge_types_ptr(): number;
    get_edge_types_view(): Uint32Array;
    get_edges_len(): number;
    get_edges_ptr(): number;
    get_edges_view(): Uint32Array;
    get_hyperedges_len(): number;
    get_hyperedges_ptr(): number;
    get_hyperedges_view(): Uint32Array;
    get_positions_len(): number;
    get_positions_ptr(): number;
    /**
     * Zero-copy TypedArray views directly into WebAssembly memory
     */
    get_positions_view(): Float32Array;
    get_triangle_data_len(): number;
    get_triangle_data_ptr(): number;
    get_triangle_data_view(): Float32Array;
    get_triangle_ids_len(): number;
    get_triangle_ids_ptr(): number;
    get_triangle_ids_view(): Int32Array;
}

/**
 * Representation of a point in Nil space (Heisenberg group H3)
 */
export class NilPoint {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Group inversion in Heisenberg group: p^-1
     */
    inverse(torsion: number): NilPoint;
    /**
     * Heisenberg group multiplication: p1 * p2
     * (x1, y1, z1) * (x2, y2, z2) = (x1 + x2, y1 + y2, z1 + z2 + torsion * x1 * y2)
     */
    multiply(other: NilPoint, torsion: number): NilPoint;
    constructor(x: number, y: number, z: number);
    /**
     * Nil distance approximation (Cygan / Koranyi gauge distance)
     * d(p, 0) = ((x^2 + y^2)^2 + 16 * z^2)^(1/4)
     */
    norm(): number;
    x: number;
    y: number;
    z: number;
}

/**
 * Batch transform vertex buffer using Safe Newton inverse exponential map
 */
export function batch_nil_inverse_exp_newton(vertices: Float32Array | number[]): Float32Array;

/**
 * Computes the vertical holonomy shift in Nil space for a closed loop in XY
 */
export function compute_nil_holonomy(area_xy: number, torsion: number): number;

/**
 * Exact closed-form Nil geodesic point evaluation: P(s)
 */
export function evaluate_nil_geodesic_point(x0: number, y0: number, z0: number, vx0: number, vy0: number, vz0: number, torsion: number, s: number): Float32Array;

/**
 * Generate a Nil macro-structure with interleaved Penrose triangles and pseudo-random hyperedges
 */
export function generate_nil_penrose_hypergraph(num_triangles: number, side_length: number, torsion: number, random_density: number, seed: number): GeneratedHypergraphBuffer;

/**
 * Bisection implementation (HyperRogue baseline) for testing & benchmark comparison
 */
export function nil_inverse_exp_bisection(hx: number, hy: number, hz: number, iterations: number): Float32Array;

/**
 * Computes the inverse exponential map in Nil geometry using Safe Newton-Raphson.
 * Given a point (hx, hy, hz) in Nil space relative to the camera, computes the initial
 * tangent velocity vector (vx, vy, vz) such that the geodesic exp(v) = h.
 * This determines the exact visual angle and distance under non-Euclidean light propagation.
 */
export function nil_inverse_exp_newton(hx: number, hy: number, hz: number): Float32Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_generatedhypergraphbuffer_free: (a: number, b: number) => void;
    readonly __wbg_get_nilpoint_x: (a: number) => number;
    readonly __wbg_get_nilpoint_y: (a: number) => number;
    readonly __wbg_get_nilpoint_z: (a: number) => number;
    readonly __wbg_nilpoint_free: (a: number, b: number) => void;
    readonly __wbg_set_nilpoint_x: (a: number, b: number) => void;
    readonly __wbg_set_nilpoint_y: (a: number, b: number) => void;
    readonly __wbg_set_nilpoint_z: (a: number, b: number) => void;
    readonly batch_nil_inverse_exp_newton: (a: number, b: number) => [number, number];
    readonly compute_nil_holonomy: (a: number, b: number) => number;
    readonly evaluate_nil_geodesic_point: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly generate_nil_penrose_hypergraph: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly generatedhypergraphbuffer_get_edge_types_len: (a: number) => number;
    readonly generatedhypergraphbuffer_get_edge_types_ptr: (a: number) => number;
    readonly generatedhypergraphbuffer_get_edge_types_view: (a: number) => any;
    readonly generatedhypergraphbuffer_get_edges_len: (a: number) => number;
    readonly generatedhypergraphbuffer_get_edges_ptr: (a: number) => number;
    readonly generatedhypergraphbuffer_get_edges_view: (a: number) => any;
    readonly generatedhypergraphbuffer_get_hyperedges_len: (a: number) => number;
    readonly generatedhypergraphbuffer_get_hyperedges_ptr: (a: number) => number;
    readonly generatedhypergraphbuffer_get_hyperedges_view: (a: number) => any;
    readonly generatedhypergraphbuffer_get_positions_len: (a: number) => number;
    readonly generatedhypergraphbuffer_get_positions_ptr: (a: number) => number;
    readonly generatedhypergraphbuffer_get_positions_view: (a: number) => any;
    readonly generatedhypergraphbuffer_get_triangle_data_len: (a: number) => number;
    readonly generatedhypergraphbuffer_get_triangle_data_ptr: (a: number) => number;
    readonly generatedhypergraphbuffer_get_triangle_data_view: (a: number) => any;
    readonly generatedhypergraphbuffer_get_triangle_ids_len: (a: number) => number;
    readonly generatedhypergraphbuffer_get_triangle_ids_ptr: (a: number) => number;
    readonly generatedhypergraphbuffer_get_triangle_ids_view: (a: number) => any;
    readonly nil_inverse_exp_bisection: (a: number, b: number, c: number, d: number) => [number, number];
    readonly nil_inverse_exp_newton: (a: number, b: number, c: number) => [number, number];
    readonly nilpoint_inverse: (a: number, b: number) => number;
    readonly nilpoint_multiply: (a: number, b: number, c: number) => number;
    readonly nilpoint_new: (a: number, b: number, c: number) => number;
    readonly nilpoint_norm: (a: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
