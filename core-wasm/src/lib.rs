use wasm_bindgen::prelude::*;

/// Representation of a point in Nil space (Heisenberg group H3)
#[derive(Debug, Clone, Copy, PartialEq)]
#[wasm_bindgen]
pub struct NilPoint {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[wasm_bindgen]
impl NilPoint {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    /// Heisenberg group multiplication: p1 * p2
    /// (x1, y1, z1) * (x2, y2, z2) = (x1 + x2, y1 + y2, z1 + z2 + torsion * x1 * y2)
    pub fn multiply(&self, other: &NilPoint, torsion: f32) -> NilPoint {
        NilPoint {
            x: self.x + other.x,
            y: self.y + other.y,
            z: self.z + other.z + torsion * self.x * other.y,
        }
    }

    /// Group inversion in Heisenberg group: p^-1
    pub fn inverse(&self, torsion: f32) -> NilPoint {
        NilPoint {
            x: -self.x,
            y: -self.y,
            z: -self.z + torsion * self.x * self.y,
        }
    }

    /// Nil distance approximation (Cygan / Koranyi gauge distance)
    /// d(p, 0) = ((x^2 + y^2)^2 + 16 * z^2)^(1/4)
    pub fn norm(&self) -> f32 {
        let r2 = self.x * self.x + self.y * self.y;
        ((r2 * r2) + 16.0 * self.z * self.z).powf(0.25)
    }
}

/// Compute signed planar area of a polygon in the XY projection
pub fn signed_planar_area(vertices: &[(f32, f32)]) -> f32 {
    let n = vertices.len();
    if n < 3 {
        return 0.0;
    }
    let mut area = 0.0;
    for i in 0..n {
        let (x1, y1) = vertices[i];
        let (x2, y2) = vertices[(i + 1) % n];
        area += x1 * y2 - x2 * y1;
    }
    area * 0.5
}

/// Computes the vertical holonomy shift in Nil space for a closed loop in XY
#[wasm_bindgen]
pub fn compute_nil_holonomy(area_xy: f32, torsion: f32) -> f32 {
    torsion * area_xy
}

/// Flat hypergraph buffer structure generated in Rust for zero-copy WebAssembly sharing
#[wasm_bindgen]
pub struct GeneratedHypergraphBuffer {
    positions: Vec<f32>,      // [x, y, z, ...] length = num_vertices * 3
    edge_indices: Vec<u32>,   // [u, v, ...] length = num_edges * 2
    edge_types: Vec<u32>,     // 0 = Penrose macro edge, 1 = random hyperedge
    triangle_ids: Vec<i32>,   // Triangle ID for each vertex (-1 if free)
    hyperedges: Vec<u32>,     // Packed: [size, v0, v1, v2, ...]
    triangle_data: Vec<f32>,  // 20 floats per triangle: [id, cx, cy, cz, area, holonomy, pAx, pAy, pAz, pBx, pBy, pBz, pCx, pCy, pCz, camX, camY, camZ, tgtX, tgtY, tgtZ]
}

#[wasm_bindgen]
impl GeneratedHypergraphBuffer {
    pub fn get_positions_ptr(&self) -> *const f32 {
        self.positions.as_ptr()
    }

    pub fn get_positions_len(&self) -> usize {
        self.positions.len()
    }

    pub fn get_edges_ptr(&self) -> *const u32 {
        self.edge_indices.as_ptr()
    }

    pub fn get_edges_len(&self) -> usize {
        self.edge_indices.len()
    }

    pub fn get_edge_types_ptr(&self) -> *const u32 {
        self.edge_types.as_ptr()
    }

    pub fn get_edge_types_len(&self) -> usize {
        self.edge_types.len()
    }

    pub fn get_triangle_ids_ptr(&self) -> *const i32 {
        self.triangle_ids.as_ptr()
    }

    pub fn get_triangle_ids_len(&self) -> usize {
        self.triangle_ids.len()
    }

    pub fn get_hyperedges_ptr(&self) -> *const u32 {
        self.hyperedges.as_ptr()
    }

    pub fn get_hyperedges_len(&self) -> usize {
        self.hyperedges.len()
    }

    pub fn get_triangle_data_ptr(&self) -> *const f32 {
        self.triangle_data.as_ptr()
    }

    pub fn get_triangle_data_len(&self) -> usize {
        self.triangle_data.len()
    }

    /// Zero-copy TypedArray views directly into WebAssembly memory
    pub fn get_positions_view(&self) -> js_sys::Float32Array {
        unsafe { js_sys::Float32Array::view(&self.positions) }
    }

    pub fn get_edges_view(&self) -> js_sys::Uint32Array {
        unsafe { js_sys::Uint32Array::view(&self.edge_indices) }
    }

    pub fn get_edge_types_view(&self) -> js_sys::Uint32Array {
        unsafe { js_sys::Uint32Array::view(&self.edge_types) }
    }

    pub fn get_triangle_ids_view(&self) -> js_sys::Int32Array {
        unsafe { js_sys::Int32Array::view(&self.triangle_ids) }
    }

    pub fn get_hyperedges_view(&self) -> js_sys::Uint32Array {
        unsafe { js_sys::Uint32Array::view(&self.hyperedges) }
    }

    pub fn get_triangle_data_view(&self) -> js_sys::Float32Array {
        unsafe { js_sys::Float32Array::view(&self.triangle_data) }
    }
}

/// Exact closed-form Nil geodesic point evaluation: P(s)
#[wasm_bindgen]
pub fn evaluate_nil_geodesic_point(
    x0: f32, y0: f32, z0: f32,
    vx0: f32, vy0: f32, vz0: f32,
    torsion: f32,
    s: f32,
) -> Vec<f32> {
    let k = vz0 - torsion * x0 * vy0;
    let omega = torsion * k;
    if omega.abs() < 1e-6 {
        let x = x0 + vx0 * s;
        let y = y0 + vy0 * s;
        let z = z0 + torsion * x0 * vy0 * s + 0.5 * torsion * vx0 * vy0 * s * s;
        vec![x, y, z]
    } else {
        let sin_w = (omega * s).sin();
        let cos_w = (omega * s).cos();
        let x = x0 + (1.0 / omega) * (vx0 * sin_w + vy0 * (cos_w - 1.0));
        let y = y0 + (1.0 / omega) * (-vx0 * (cos_w - 1.0) + vy0 * sin_w);
        let a = x0 - vy0 / omega;
        let term1 = a * (y - y0);
        let vxy2 = vx0 * vx0 + vy0 * vy0;
        let term2 = (vxy2 / (2.0 * omega)) * s;
        let term3 = ((vy0 * vy0 - vx0 * vx0) / (4.0 * omega * omega)) * (2.0 * omega * s).sin();
        let term4 = ((vx0 * vy0) / (2.0 * omega * omega)) * (1.0 - (2.0 * omega * s).cos());
        let z = z0 + k * s + torsion * (term1 + term2 + term3 + term4);
        vec![x, y, z]
    }
}

/// Computes the inverse exponential map in Nil geometry using Safe Newton-Raphson.
/// Given a point (hx, hy, hz) in Nil space relative to the camera, computes the initial
/// tangent velocity vector (vx, vy, vz) such that the geodesic exp(v) = h.
/// This determines the exact visual angle and distance under non-Euclidean light propagation.
#[wasm_bindgen]
pub fn nil_inverse_exp_newton(hx: f32, hy: f32, hz: f32) -> Vec<f32> {
    let r2 = hx * hx + hy * hy;
    if r2 < 1e-12 {
        return vec![hx, hy, hz, 1.0];
    }

    let b2 = 0.25 * r2;
    let b = b2.sqrt();
    let side = hz - 0.5 * hx * hy;

    if side.abs() < 1e-6 {
        return vec![hx, hy, 0.0, 1.0];
    }

    let (w_min, w_max) = if side > 0.0 {
        (0.0001, std::f32::consts::PI * 2.0 - 0.001)
    } else {
        (-std::f32::consts::PI * 2.0 + 0.001, -0.0001)
    };

    // 1. Initial guess via 1st order Taylor expansion around w=0
    let mut w = (side / (b2 / 3.0 + 1.0)).clamp(w_min, w_max);

    // 2. Safe Newton-Raphson with interval clamping (3 iterations)
    for _ in 0..3 {
        let (gw, dgw) = if w.abs() < 0.1 {
            let w2 = w * w;
            (w * (1.0 / 3.0 + w2 / 90.0), 1.0 / 3.0 + w2 / 30.0)
        } else {
            let cw = w.cos();
            let sw = w.sin();
            let den = 1.0 - cw;
            ((w - sw) / den, (2.0 * den - w * sw) / (den * den))
        };

        let f = b2 * gw + w - side;
        let df = b2 * dgw + 1.0;
        let step = f / df;
        w = (w - step).clamp(w_min, w_max);
    }

    let alpha_total = hy.atan2(hx);
    let alpha = alpha_total - w * 0.5;
    let c = b / (w * 0.5).sin();

    vec![c * w * alpha.cos(), c * w * alpha.sin(), w, 1.0]
}

/// Bisection implementation (HyperRogue baseline) for testing & benchmark comparison
#[wasm_bindgen]
pub fn nil_inverse_exp_bisection(hx: f32, hy: f32, hz: f32, iterations: usize) -> Vec<f32> {
    let r2 = hx * hx + hy * hy;
    if r2 < 1e-12 {
        return vec![hx, hy, hz, 1.0];
    }

    let b2 = 0.25 * r2;
    let b = b2.sqrt();
    let side = hz - 0.5 * hx * hy;

    if side.abs() < 1e-6 {
        return vec![hx, hy, 0.0, 1.0];
    }

    let (mut w_min, mut w_max) = if side > 0.0 {
        (0.0, std::f32::consts::PI * 2.0)
    } else {
        (-std::f32::consts::PI * 2.0, 0.0)
    };

    for _ in 0..iterations {
        let w = (w_min + w_max) * 0.5;
        let gw = if w.abs() < 0.1 {
            w * (1.0 / 3.0 + w * w / 90.0)
        } else {
            (w - w.sin()) / (1.0 - w.cos())
        };
        let z = b2 * gw + w;
        if side > z {
            w_min = w;
        } else {
            w_max = w;
        }
    }

    let w = (w_min + w_max) * 0.5;
    let alpha_total = hy.atan2(hx);
    let alpha = alpha_total - w * 0.5;
    let c = b / (w * 0.5).sin();

    vec![c * w * alpha.cos(), c * w * alpha.sin(), w, 1.0]
}

/// Batch transform vertex buffer using Safe Newton inverse exponential map
#[wasm_bindgen]
pub fn batch_nil_inverse_exp_newton(vertices: &[f32]) -> Vec<f32> {
    let count = vertices.len() / 3;
    let mut out = Vec::with_capacity(count * 3);
    for i in 0..count {
        let hx = vertices[i * 3];
        let hy = vertices[i * 3 + 1];
        let hz = vertices[i * 3 + 2];
        let v = nil_inverse_exp_newton(hx, hy, hz);
        out.push(v[0]);
        out.push(v[1]);
        out.push(v[2]);
    }
    out
}

/// Simple deterministic PRNG (PCG/Mulberry32-style) for reproducible pseudo-random generation
struct SimpleRng {
    state: u32,
}

impl SimpleRng {
    fn new(seed: u32) -> Self {
        Self { state: if seed == 0 { 0x12345678 } else { seed } }
    }

    fn next_u32(&mut self) -> u32 {
        self.state = self.state.wrapping_mul(1664525).wrapping_add(1013904223);
        let mut x = self.state;
        x ^= x >> 16;
        x = x.wrapping_mul(0x45d9f3b);
        x ^= x >> 16;
        x
    }

    fn next_f32(&mut self) -> f32 {
        (self.next_u32() >> 8) as f32 / 16777216.0
    }

    fn next_range(&mut self, min: f32, max: f32) -> f32 {
        min + self.next_f32() * (max - min)
    }
}

/// Generate a Nil macro-structure with interleaved Penrose triangles and pseudo-random hyperedges
#[wasm_bindgen]
pub fn generate_nil_penrose_hypergraph(
    num_triangles: usize,
    side_length: f32,
    torsion: f32,
    random_density: f32,
    seed: u32,
) -> GeneratedHypergraphBuffer {
    let mut rng = SimpleRng::new(seed);
    let mut positions = Vec::new();
    let mut edge_indices = Vec::new();
    let mut edge_types = Vec::new();
    let mut triangle_ids = Vec::new();
    let mut hyperedges = Vec::new();
    let mut triangle_data = Vec::with_capacity(num_triangles * 20);

    // Height of equilateral triangle in XY plane
    let h = (3.0_f32).sqrt() * 0.5 * side_length;
    let base_area = 0.5 * side_length * h;
    let holonomy_step = torsion * base_area;

    // We interleave triangles along a chiral screw axis / hexagonal lattice.
    // Each triangle k has center (cx, cy) and base z elevation.
    for k in 0..num_triangles {
        let tri_id = k as i32;
        // Chiral alternation: alternate counter-clockwise (+area) and clockwise (-area)
        let orientation = if k % 2 == 0 { 1.0 } else { -1.0 };

        // Position in the hexagonal base grid
        let ring = (k as f32 / 3.0).floor();
        let angle = (k % 3) as f32 * (std::f32::consts::PI * 2.0 / 3.0) + (ring * 0.5);
        let radius = ring * side_length * 0.9 + (if k == 0 { 0.0 } else { side_length * 0.6 });

        let cx = radius * angle.cos();
        let cy = radius * angle.sin();
        let base_z = (k as f32 - (num_triangles as f32 * 0.5)) * holonomy_step * 0.75;

        // Triangles have 3 main corner vertices: A, B, C
        // Under Nil horizontal holonomy:
        // Going A -> B (along x): dx = L, dy = 0 => dz = 0
        // Going B -> C: dx = -L/2, dy = h => dz = x * dy
        // Going C -> A: returns to A, but with holonomy shift Delta z = torsion * Area!
        // To construct the seamless Penrose tribar in Nil, we discretize each of the 3 beams.
        let v0_idx = (positions.len() / 3) as u32;

        let half_l = side_length * 0.5;
        let p_a = (cx - half_l, cy - h / 3.0 * orientation, base_z);
        let p_b = (cx + half_l, cy - h / 3.0 * orientation, base_z);
        let p_c = (cx, cy + (2.0 * h / 3.0) * orientation, base_z + holonomy_step * 0.5);

        let center_z = base_z + holonomy_step * 0.25;
        let loop_area = base_area * orientation;
        let holonomy = torsion * loop_area;
        let dist = side_length * 2.8;
        let elev_angle = std::f32::consts::PI * 0.22;
        let azim_angle = if orientation > 0.0 { std::f32::consts::PI * 0.25 } else { -std::f32::consts::PI * 0.25 };
        let cam_x = cx + dist * elev_angle.cos() * azim_angle.sin();
        let cam_y = cy - dist * elev_angle.cos() * azim_angle.cos();
        let cam_z = center_z + dist * elev_angle.sin() + holonomy * 0.5;

        triangle_data.extend_from_slice(&[
            k as f32, cx, cy, center_z, loop_area, holonomy,
            p_a.0, p_a.1, p_a.2,
            p_b.0, p_b.1, p_b.2,
            p_c.0, p_c.1, p_c.2,
            cam_x, cam_y, cam_z,
            cx, cy, center_z,
        ]);

        // Subdivide each beam into 3 segments to allow Nil geodesic curving
        let corners = [p_a, p_b, p_c];
        let mut triangle_node_indices = Vec::new();

        for i in 0..3 {
            let start = corners[i];
            let end = corners[(i + 1) % 3];

            // 3 segments per beam
            let segments = 3;
            for s in 0..segments {
                let t = s as f32 / segments as f32;
                let cur_x = start.0 + (end.0 - start.0) * t;
                let cur_y = start.1 + (end.1 - start.1) * t;
                // Nil connection: z evolves with the contact form dz = torsion * x dy
                let cur_z = start.2 + (end.2 - start.2) * t + torsion * 0.5 * (start.0 * (cur_y - start.1) - start.1 * (cur_x - start.0));

                let idx = (positions.len() / 3) as u32;
                positions.push(cur_x);
                positions.push(cur_y);
                positions.push(cur_z);
                triangle_ids.push(tri_id);
                triangle_node_indices.push(idx);
            }
        }

        // Close the beam edges within the triangle
        let num_tri_nodes = triangle_node_indices.len();
        for i in 0..num_tri_nodes {
            let u = triangle_node_indices[i];
            let v = triangle_node_indices[(i + 1) % num_tri_nodes];
            edge_indices.push(u);
            edge_indices.push(v);
            edge_types.push(0); // 0 = Macro Penrose Edge
        }

        // Record the triangle as a 3-uniform hyperedge (corner triad)
        hyperedges.push(3); // size = 3
        hyperedges.push(v0_idx);
        hyperedges.push(v0_idx + 3);
        hyperedges.push(v0_idx + 6);

        // Interleaving connections: link adjacent triangles if k > 0
        if k > 0 {
            let prev_start = v0_idx - num_tri_nodes as u32;
            // Bridge corner of previous triangle to current triangle
            edge_indices.push(prev_start);
            edge_indices.push(v0_idx);
            edge_types.push(0);
        }
    }

    // Add pseudo-random satellite nodes and cross-cutting hyperedges
    let total_macro_nodes = (positions.len() / 3) as u32;
    let extra_nodes = ((total_macro_nodes as f32) * random_density * 0.4) as usize;

    for _ in 0..extra_nodes {
        let parent_idx = (rng.next_u32() as usize % total_macro_nodes as usize) * 3;
        let px = positions[parent_idx];
        let py = positions[parent_idx + 1];
        let pz = positions[parent_idx + 2];

        let offset_x = rng.next_range(-side_length * 0.4, side_length * 0.4);
        let offset_y = rng.next_range(-side_length * 0.4, side_length * 0.4);
        let offset_z = rng.next_range(-holonomy_step * 0.4, holonomy_step * 0.4);

        let new_idx = (positions.len() / 3) as u32;
        positions.push(px + offset_x);
        positions.push(py + offset_y);
        positions.push(pz + offset_z);
        triangle_ids.push(-1); // Free node

        // Connect to parent
        edge_indices.push((parent_idx / 3) as u32);
        edge_indices.push(new_idx);
        edge_types.push(1); // 1 = Random edge
    }

    // Generate random 3- and 4-hyperedges across nearby nodes
    let total_nodes = (positions.len() / 3) as u32;
    let num_random_hyperedges = ((total_nodes as f32) * random_density * 0.3) as usize;

    for _ in 0..num_random_hyperedges {
        let size = if rng.next_f32() > 0.5 { 4 } else { 3 };
        hyperedges.push(size);
        let anchor = rng.next_u32() % total_nodes;
        hyperedges.push(anchor);
        for _ in 1..size {
            let offset = (rng.next_u32() % 12) + 1;
            let other = (anchor + offset) % total_nodes;
            hyperedges.push(other);
        }
    }

    GeneratedHypergraphBuffer {
        positions,
        edge_indices,
        edge_types,
        triangle_ids,
        hyperedges,
        triangle_data,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_heisenberg_group_multiplication() {
        let p1 = NilPoint::new(1.0, 0.0, 0.0);
        let p2 = NilPoint::new(0.0, 1.0, 0.0);
        // (1, 0, 0) * (0, 1, 0) with torsion 1.0 => (1, 1, 1)
        let p3 = p1.multiply(&p2, 1.0);
        assert_eq!(p3, NilPoint::new(1.0, 1.0, 1.0));

        // In reverse: (0, 1, 0) * (1, 0, 0) => (1, 1, 0)
        let p4 = p2.multiply(&p1, 1.0);
        assert_eq!(p4, NilPoint::new(1.0, 1.0, 0.0));

        // Demonstrates non-commutativity [X, Y] = Z !
        assert_ne!(p3.z, p4.z);
        assert_eq!(p3.z - p4.z, 1.0);
    }

    #[test]
    fn test_holonomy_closed_loop() {
        // Square loop of side 2.0: Area = 4.0
        let area = 4.0;
        let torsion = 1.0;
        let holonomy = compute_nil_holonomy(area, torsion);
        assert_eq!(holonomy, 4.0);
    }

    #[test]
    fn test_hypergraph_buffer_generation() {
        let buffer = generate_nil_penrose_hypergraph(4, 5.0, 1.0, 0.5, 42);
        assert!(buffer.positions.len() > 0);
        assert!(buffer.edge_indices.len() > 0);
        assert!(buffer.hyperedges.len() > 0);
        // Vertices must have 3 floats each
        assert_eq!(buffer.positions.len() % 3, 0);
        // Edges must have 2 u32 each
        assert_eq!(buffer.edge_indices.len() % 2, 0);
    }

    #[test]
    fn test_inverse_exp_newton_vs_bisection() {
        // Test various points across Nil space
        let test_points = [
            (1.0, 2.0, 1.5),
            (2.5, -1.2, 3.8),
            (-1.8, -2.1, -2.4),
            (0.5, 0.5, 0.125), // near horizontal
            (3.0, 1.0, 6.0),
        ];

        for (hx, hy, hz) in test_points {
            let v_newton = nil_inverse_exp_newton(hx, hy, hz);
            let v_bisection = nil_inverse_exp_bisection(hx, hy, hz, 50);

            // Newton in 3 iterations must match 50-step Bisection within floating point tolerance
            let diff_x = (v_newton[0] - v_bisection[0]).abs();
            let diff_y = (v_newton[1] - v_bisection[1]).abs();
            let diff_w = (v_newton[2] - v_bisection[2]).abs();

            assert!(diff_x < 1e-4, "Newton vs Bisection X mismatch at ({}, {}, {}): {}", hx, hy, hz, diff_x);
            assert!(diff_y < 1e-4, "Newton vs Bisection Y mismatch at ({}, {}, {}): {}", hx, hy, hz, diff_y);
            assert!(diff_w < 1e-4, "Newton vs Bisection W mismatch at ({}, {}, {}): {}", hx, hy, hz, diff_w);
        }
    }

    #[test]
    fn test_inverse_exp_newton_near_zero() {
        let v = nil_inverse_exp_newton(0.0001, 0.0001, 0.00001);
        assert!(v[0].is_finite());
        assert!(v[1].is_finite());
        assert!(v[2].is_finite());
    }

    #[test]
    fn test_geodesic_evaluation() {
        let pt = evaluate_nil_geodesic_point(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 2.0);
        assert_eq!(pt.len(), 3);
        // Moving purely horizontally along x: y remains 0, z remains 0
        assert!((pt[0] - 2.0).abs() < 1e-4);
        assert!(pt[1].abs() < 1e-4);
        assert!(pt[2].abs() < 1e-4);
    }
}
