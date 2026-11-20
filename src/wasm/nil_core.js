/* @ts-self-types="./nil_core.d.ts" */

/**
 * Flat hypergraph buffer structure generated in Rust for zero-copy WebAssembly sharing
 */
export class GeneratedHypergraphBuffer {
    static __wrap(ptr) {
        const obj = Object.create(GeneratedHypergraphBuffer.prototype);
        obj.__wbg_ptr = ptr;
        GeneratedHypergraphBufferFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GeneratedHypergraphBufferFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_generatedhypergraphbuffer_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get_edge_types_len() {
        const ret = wasm.generatedhypergraphbuffer_get_edge_types_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_edge_types_ptr() {
        const ret = wasm.generatedhypergraphbuffer_get_edge_types_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint32Array}
     */
    get_edge_types_view() {
        const ret = wasm.generatedhypergraphbuffer_get_edge_types_view(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_edges_len() {
        const ret = wasm.generatedhypergraphbuffer_get_edges_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_edges_ptr() {
        const ret = wasm.generatedhypergraphbuffer_get_edges_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint32Array}
     */
    get_edges_view() {
        const ret = wasm.generatedhypergraphbuffer_get_edges_view(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_hyperedges_len() {
        const ret = wasm.generatedhypergraphbuffer_get_hyperedges_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_hyperedges_ptr() {
        const ret = wasm.generatedhypergraphbuffer_get_hyperedges_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint32Array}
     */
    get_hyperedges_view() {
        const ret = wasm.generatedhypergraphbuffer_get_hyperedges_view(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_positions_len() {
        const ret = wasm.generatedhypergraphbuffer_get_positions_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_positions_ptr() {
        const ret = wasm.generatedhypergraphbuffer_get_positions_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Zero-copy TypedArray views directly into WebAssembly memory
     * @returns {Float32Array}
     */
    get_positions_view() {
        const ret = wasm.generatedhypergraphbuffer_get_positions_view(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_triangle_data_len() {
        const ret = wasm.generatedhypergraphbuffer_get_triangle_data_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_triangle_data_ptr() {
        const ret = wasm.generatedhypergraphbuffer_get_triangle_data_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Float32Array}
     */
    get_triangle_data_view() {
        const ret = wasm.generatedhypergraphbuffer_get_triangle_data_view(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get_triangle_ids_len() {
        const ret = wasm.generatedhypergraphbuffer_get_triangle_ids_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get_triangle_ids_ptr() {
        const ret = wasm.generatedhypergraphbuffer_get_triangle_ids_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Int32Array}
     */
    get_triangle_ids_view() {
        const ret = wasm.generatedhypergraphbuffer_get_triangle_ids_view(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) GeneratedHypergraphBuffer.prototype[Symbol.dispose] = GeneratedHypergraphBuffer.prototype.free;

/**
 * Representation of a point in Nil space (Heisenberg group H3)
 */
export class NilPoint {
    static __wrap(ptr) {
        const obj = Object.create(NilPoint.prototype);
        obj.__wbg_ptr = ptr;
        NilPointFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NilPointFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_nilpoint_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_nilpoint_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_nilpoint_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get z() {
        const ret = wasm.__wbg_get_nilpoint_z(this.__wbg_ptr);
        return ret;
    }
    /**
     * Group inversion in Heisenberg group: p^-1
     * @param {number} torsion
     * @returns {NilPoint}
     */
    inverse(torsion) {
        const ret = wasm.nilpoint_inverse(this.__wbg_ptr, torsion);
        return NilPoint.__wrap(ret);
    }
    /**
     * Heisenberg group multiplication: p1 * p2
     * (x1, y1, z1) * (x2, y2, z2) = (x1 + x2, y1 + y2, z1 + z2 + torsion * x1 * y2)
     * @param {NilPoint} other
     * @param {number} torsion
     * @returns {NilPoint}
     */
    multiply(other, torsion) {
        _assertClass(other, NilPoint);
        const ret = wasm.nilpoint_multiply(this.__wbg_ptr, other.__wbg_ptr, torsion);
        return NilPoint.__wrap(ret);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    constructor(x, y, z) {
        const ret = wasm.nilpoint_new(x, y, z);
        this.__wbg_ptr = ret;
        NilPointFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Nil distance approximation (Cygan / Koranyi gauge distance)
     * d(p, 0) = ((x^2 + y^2)^2 + 16 * z^2)^(1/4)
     * @returns {number}
     */
    norm() {
        const ret = wasm.nilpoint_norm(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_nilpoint_x(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_nilpoint_y(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set z(arg0) {
        wasm.__wbg_set_nilpoint_z(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) NilPoint.prototype[Symbol.dispose] = NilPoint.prototype.free;

/**
 * Batch transform vertex buffer using Safe Newton inverse exponential map
 * @param {Float32Array | number[]} vertices
 * @returns {Float32Array}
 */
export function batch_nil_inverse_exp_newton(vertices) {
    const ptr0 = passArrayF32ToWasm0(vertices, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.batch_nil_inverse_exp_newton(ptr0, len0);
    var v2 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Computes the vertical holonomy shift in Nil space for a closed loop in XY
 * @param {number} area_xy
 * @param {number} torsion
 * @returns {number}
 */
export function compute_nil_holonomy(area_xy, torsion) {
    const ret = wasm.compute_nil_holonomy(area_xy, torsion);
    return ret;
}

/**
 * Exact closed-form Nil geodesic point evaluation: P(s)
 * @param {number} x0
 * @param {number} y0
 * @param {number} z0
 * @param {number} vx0
 * @param {number} vy0
 * @param {number} vz0
 * @param {number} torsion
 * @param {number} s
 * @returns {Float32Array}
 */
export function evaluate_nil_geodesic_point(x0, y0, z0, vx0, vy0, vz0, torsion, s) {
    const ret = wasm.evaluate_nil_geodesic_point(x0, y0, z0, vx0, vy0, vz0, torsion, s);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Generate a Nil macro-structure with interleaved Penrose triangles and pseudo-random hyperedges
 * @param {number} num_triangles
 * @param {number} side_length
 * @param {number} torsion
 * @param {number} random_density
 * @param {number} seed
 * @returns {GeneratedHypergraphBuffer}
 */
export function generate_nil_penrose_hypergraph(num_triangles, side_length, torsion, random_density, seed) {
    const ret = wasm.generate_nil_penrose_hypergraph(num_triangles, side_length, torsion, random_density, seed);
    return GeneratedHypergraphBuffer.__wrap(ret);
}

/**
 * Bisection implementation (HyperRogue baseline) for testing & benchmark comparison
 * @param {number} hx
 * @param {number} hy
 * @param {number} hz
 * @param {number} iterations
 * @returns {Float32Array}
 */
export function nil_inverse_exp_bisection(hx, hy, hz, iterations) {
    const ret = wasm.nil_inverse_exp_bisection(hx, hy, hz, iterations);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Computes the inverse exponential map in Nil geometry using Safe Newton-Raphson.
 * Given a point (hx, hy, hz) in Nil space relative to the camera, computes the initial
 * tangent velocity vector (vx, vy, vz) such that the geodesic exp(v) = h.
 * This determines the exact visual angle and distance under non-Euclidean light propagation.
 * @param {number} hx
 * @param {number} hy
 * @param {number} hz
 * @returns {Float32Array}
 */
export function nil_inverse_exp_newton(hx, hy, hz) {
    const ret = wasm.nil_inverse_exp_newton(hx, hy, hz);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_4c88d8bf264fd984: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(F32)) -> NamedExternref("Float32Array")`.
            const ret = getArrayF32FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_generic_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(I32)) -> NamedExternref("Int32Array")`.
            const ret = getArrayI32FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_generic_0000000000000003: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U32)) -> NamedExternref("Uint32Array")`.
            const ret = getArrayU32FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            table.set(0, undefined);
            table.set(1024, undefined);
            table.set(1025, null);
            table.set(1026, true);
            table.set(1027, false);
        },
    };
    return {
        __proto__: null,
        "./nil_core_bg.js": import0,
    };
}

const GeneratedHypergraphBufferFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_generatedhypergraphbuffer_free(ptr, 1));
const NilPointFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_nilpoint_free(ptr, 1));

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
    if (cachedInt32ArrayMemory0 === null || cachedInt32ArrayMemory0.byteLength === 0) {
        cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(bytes) {
    numBytesDecoded += bytes.length;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
        cachedTextDecoder.decode();
        numBytesDecoded = bytes.length;
    }
    return cachedTextDecoder.decode(bytes);
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat32ArrayMemory0 = null;
    cachedInt32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

let __wbg_init_promise;
async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;
    if (__wbg_init_promise === undefined) {
        __wbg_init_promise = __wbg_init_once(module_or_path);
        __wbg_init_promise.catch(() => { __wbg_init_promise = undefined; });
    }
    return __wbg_init_promise;
}

async function __wbg_init_once(module_or_path) {

    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('nil_core_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
