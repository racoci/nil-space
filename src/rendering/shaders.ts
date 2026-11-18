/**
 * GLSL ES 3.00 Shaders for Real-Time Nil Space Rendering
 * 
 * Includes:
 * 1. True Nil Geodesic Raymarching Shader (Curved light rays along Heisenberg group)
 * 2. High-throughput Hardware Instanced Node & Edge Rasterization Shaders
 */

/**
 * Fullscreen Vertex Shader for Raymarching Quad
 */
export const RAYMARCH_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * True Nil Geodesic Raymarching Fragment Shader
 * Solves the closed-form Nil geodesic ODEs per pixel in real time on the GPU.
 */
export const RAYMARCH_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

// Camera & View Uniforms
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_cameraPos;
uniform mat4 u_invViewProj;

// Nil Metric & Macro Parameters
uniform float u_torsion;
uniform int u_numTriangles;
uniform int u_selectedTriangleId;
uniform int u_hoveredTriangleId;
uniform int u_selectedNodeId;

// Packed Triangle Data: 5 vec4s per triangle
// [0]: (cx, cy, cz, loopArea)
// [1]: (holonomy, sideLength, orientation, 0)
// [2]: (cornerA.x, cornerA.y, cornerA.z, 0)
// [3]: (cornerB.x, cornerB.y, cornerB.z, 0)
// [4]: (cornerC.x, cornerC.y, cornerC.z, 0)
uniform vec4 u_triangles[80];

// Node Positions (x, y, z, triangleId)
uniform int u_numNodes;
uniform vec4 u_nodes[96];

// Analytical Nil Geodesic: P(s) along curved light ray
vec3 evaluateNilGeodesic(vec3 p0, vec3 v0, float torsion, float s) {
    float k = v0.z - torsion * p0.x * v0.y;
    float omega = torsion * k;

    if (abs(omega) < 1e-5) {
        return vec3(
            p0.x + v0.x * s,
            p0.y + v0.y * s,
            p0.z + torsion * p0.x * v0.y * s + 0.5 * torsion * v0.x * v0.y * s * s
        );
    }

    float sinW = sin(omega * s);
    float cosW = cos(omega * s);

    float x = p0.x + (1.0 / omega) * (v0.x * sinW + v0.y * (cosW - 1.0));
    float y = p0.y + (1.0 / omega) * (-v0.x * (cosW - 1.0) + v0.y * sinW);

    float a = p0.x - v0.y / omega;
    float term1 = a * (y - p0.y);
    float vxy2 = v0.x * v0.x + v0.y * v0.y;
    float term2 = (vxy2 / (2.0 * omega)) * s;
    float term3 = ((v0.y * v0.y - v0.x * v0.x) / (4.0 * omega * omega)) * sin(2.0 * omega * s);
    float term4 = ((v0.x * v0.y) / (2.0 * omega * omega)) * (1.0 - cos(2.0 * omega * s));

    float z = p0.z + k * s + torsion * (term1 + term2 + term3 + term4);
    return vec3(x, y, z);
}

// Distance from point p to line segment [a, b]
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a;
    vec3 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

// Cygan / Koranyi Nil gauge distance
float nilGaugeDist(vec3 p, vec3 q, float torsion) {
    vec2 dxy = q.xy - p.xy;
    float r2 = dot(dxy, dxy);
    float dz = (q.z - p.z) - torsion * p.x * dxy.y;
    return pow(r2 * r2 + 16.0 * dz * dz, 0.25);
}

// Scene Distance Field & Material ID
// Returns: vec4(distance, materialId, hitTriangleId, extraGlow)
// materialId: 1 = Penrose beam, 2 = Node, 3 = Translucent membrane, 4 = Coordinate grid
vec4 mapScene(vec3 p) {
    float minDist = 1e5;
    float matId = 0.0;
    float hitTri = -1.0;
    float glow = 0.0;

    int activeTri = u_selectedTriangleId >= 0 ? u_selectedTriangleId : u_hoveredTriangleId;

    // 1. Penrose Triangle Beams
    for (int t = 0; t < 16; t++) {
        if (t >= u_numTriangles) break;
        int baseIdx = t * 5;
        vec3 pA = u_triangles[baseIdx + 2].xyz;
        vec3 pB = u_triangles[baseIdx + 3].xyz;
        vec3 pC = u_triangles[baseIdx + 4].xyz;

        float beamRadius = (t == activeTri) ? 0.24 : 0.16;

        float dAB = sdCapsule(p, pA, pB, beamRadius);
        float dBC = sdCapsule(p, pB, pC, beamRadius);
        float dCA = sdCapsule(p, pC, pA, beamRadius);
        float dTri = min(min(dAB, dBC), dCA);

        if (dTri < minDist) {
            minDist = dTri;
            matId = 1.0;
            hitTri = float(t);
        }
    }

    // 2. Hypergraph Nodes
    for (int n = 0; n < 96; n++) {
        if (n >= u_numNodes) break;
        vec3 nodePos = u_nodes[n].xyz;
        int nodeTri = int(u_nodes[n].w);
        float nodeRadius = (n == u_selectedNodeId) ? 0.42 : ((nodeTri == activeTri) ? 0.28 : 0.18);

        float dNode = length(p - nodePos) - nodeRadius;
        if (dNode < minDist) {
            minDist = dNode;
            matId = 2.0;
            hitTri = float(nodeTri);
            if (n == u_selectedNodeId) glow = 1.0;
        }
    }

    // 3. Coordinate Fibers (Vertical lines at regular (x, y) intervals revealing the Heisenberg twist)
    vec2 gridPos = p.xy;
    vec2 gridCell = floor(gridPos / 6.0 + 0.5);
    vec2 center = gridCell * 6.0;
    float dFiber = length(gridPos - center) - 0.035;
    if (dFiber < minDist && abs(p.z) < 18.0) {
        minDist = dFiber;
        matId = 4.0;
    }

    return vec4(minDist, matId, hitTri, glow);
}

// Estimate normal at surface point via central differences
vec3 calcNormal(vec3 p) {
    const float eps = 0.002;
    vec2 h = vec2(eps, 0.0);
    return normalize(vec3(
        mapScene(p + h.xyy).x - mapScene(p - h.xyy).x,
        mapScene(p + h.yxy).x - mapScene(p - h.yxy).x,
        mapScene(p + h.yyx).x - mapScene(p - h.yyx).x
    ));
}

void main() {
    // Screen coords to Normalized Device Coordinates [-1, 1]
    vec2 ndc = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;

    // Unproject to find initial ray origin & direction
    vec4 pNear = u_invViewProj * vec4(ndc, -1.0, 1.0);
    pNear /= pNear.w;
    vec4 pFar = u_invViewProj * vec4(ndc, 1.0, 1.0);
    pFar /= pFar.w;

    vec3 rayOrigin = pNear.xyz;
    vec3 rayDir = normalize(pFar.xyz - pNear.xyz);

    // Deep non-Euclidean background color
    vec3 bgGrad = mix(vec3(0.024, 0.035, 0.075), vec3(0.012, 0.018, 0.04), v_uv.y);
    vec3 col = bgGrad;

    // Atmospheric coordinate dust
    float dust = fract(sin(dot(ndc * 18.0, vec2(12.9898, 78.233))) * 43758.5453);
    if (dust > 0.992) {
        col += vec3(0.05, 0.12, 0.18) * dust;
    }

    // Curved Nil Geodesic Raymarcher Loop
    float s = 0.0;
    const float sMax = 65.0;
    const int maxSteps = 72;
    float hitMat = 0.0;
    float hitTri = -1.0;
    vec3 hitPos = vec3(0.0);
    float glowAcc = 0.0;

    int activeTri = u_selectedTriangleId >= 0 ? u_selectedTriangleId : u_hoveredTriangleId;

    for (int i = 0; i < maxSteps; i++) {
        // Evaluate closed-form Nil geodesic trajectory at distance s
        vec3 p = evaluateNilGeodesic(rayOrigin, rayDir, u_torsion, s);
        vec4 res = mapScene(p);
        float d = res.x;

        // Energy halo glow accumulation along ray
        if (d < 1.2) {
            float glowFactor = (1.2 - d) / 1.2;
            glowAcc += glowFactor * glowFactor * 0.035;
        }

        if (d < 0.008) {
            hitMat = res.y;
            hitTri = res.z;
            hitPos = p;
            break;
        }

        s += max(d * 0.72, 0.015);
        if (s > sMax) break;
    }

    if (hitMat > 0.5) {
        vec3 n = calcNormal(hitPos);
        vec3 lightDir = normalize(vec3(0.4, 0.6, 0.8));
        float diff = max(dot(n, lightDir), 0.0);
        float fresnel = pow(1.0 - max(dot(-rayDir, n), 0.0), 3.0);

        vec3 matCol = vec3(0.0, 0.85, 0.95);
        bool isActive = (int(hitTri) == activeTri && activeTri >= 0);

        if (hitMat == 1.0) {
            // Penrose Beam
            if (isActive) {
                matCol = vec3(0.0, 1.0, 0.8);
            } else if (activeTri >= 0) {
                matCol = vec3(0.0, 0.35, 0.5) * 0.4;
            } else {
                matCol = vec3(0.0, 0.65, 0.85);
            }
        } else if (hitMat == 2.0) {
            // Node
            if (isActive) {
                matCol = vec3(1.0, 0.85, 0.1);
            } else {
                matCol = vec3(0.1, 0.95, 0.85);
            }
        } else if (hitMat == 4.0) {
            // Coordinate Fiber Grid
            matCol = vec3(0.0, 0.25, 0.45);
        }

        vec3 lit = matCol * (0.35 + 0.65 * diff) + vec3(0.5, 0.8, 1.0) * fresnel * 0.6;
        if (isActive) {
            lit += vec3(0.0, 0.4, 0.3);
        }

        // Distance fog along curved geodesic
        float fog = clamp(s / sMax, 0.0, 1.0);
        col = mix(lit, bgGrad, fog * fog);
    }

    // Additive volumetric glow
    vec3 haloCol = activeTri >= 0 ? vec3(0.0, 0.6, 0.5) : vec3(0.0, 0.4, 0.6);
    col += haloCol * glowAcc;

    // ACES Filmic Tone Mapping
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/**
 * High-Throughput Instanced Node Shaders with Native Nil Safe-Newton Warping
 */
export const INSTANCED_NODE_VERT = `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_vertex; // Unit sphere / billboard vertex
layout(location = 1) in vec4 a_instancePos; // (x, y, z, triangleId)
layout(location = 2) in vec4 a_instanceProps; // (nodeId, isCorner, selected, scale)

uniform mat4 u_viewProj;
uniform mat4 u_view;
uniform mat4 u_proj;
uniform vec3 u_cameraPos;
uniform float u_torsion;
uniform float u_enableNewton; // 1.0 = Safe Newton Native Nil, 0.0 = Euclidean
uniform int u_selectedNodeId;
uniform int u_activeTriangleId;

out vec3 v_normal;
out vec4 v_color;
out float v_dist;

// Safe Newton-Raphson inverse exponential map for Nil space (3 steps)
vec4 nil_inverse_exp_newton(vec4 h) {
    float r2 = h.x * h.x + h.y * h.y;
    if (r2 < 1e-10) return vec4(h.xyz, 1.0);

    float b2 = 0.25 * r2;
    float b = sqrt(b2);
    float side = h.z - 0.5 * h.x * h.y;

    if (abs(side) < 1e-6) return vec4(h.xy, 0.0, 1.0);

    float w_min = side > 0.0 ? 0.0001 : -6.28218;
    float w_max = side > 0.0 ? 6.28218 : -0.0001;

    // Initial Taylor guess around w = 0
    float w = clamp(side / (b2 / 3.0 + 1.0), w_min, w_max);

    // 3 Safe Newton-Raphson quadratic iterations
    for (int it = 0; it < 3; it++) {
        float gw, dgw;
        if (abs(w) < 0.1) {
            float w2 = w * w;
            gw = w * (1.0 / 3.0 + w2 / 90.0);
            dgw = 1.0 / 3.0 + w2 / 30.0;
        } else {
            float cw = cos(w);
            float sw = sin(w);
            float den = 1.0 - cw;
            gw = (w - sw) / den;
            dgw = (2.0 * den - w * sw) / (den * den);
        }

        float f = b2 * gw + w - side;
        float df = b2 * dgw + 1.0;
        float step = f / df;
        w = clamp(w - step, w_min, w_max);
    }

    float alpha_total = atan(h.y, h.x);
    float alpha = alpha_total - w * 0.5;
    float sin_half_w = sin(w * 0.5);
    float c = abs(sin_half_w) > 1e-6 ? b / sin_half_w : b / (w * 0.5);

    return vec4(c * w * cos(alpha), c * w * sin(alpha), w, 1.0);
}

void main() {
    int nodeId = int(a_instanceProps.x);
    int triId = int(a_instancePos.w);
    bool isCorner = a_instanceProps.y > 0.5;
    float baseScale = a_instanceProps.w;

    bool isSelected = (nodeId == u_selectedNodeId);
    bool isInActiveTri = (triId == u_activeTriangleId && u_activeTriangleId >= 0);

    float scale = baseScale;
    vec3 col = vec3(0.0, 0.9, 0.8);

    if (isSelected) {
        scale *= 2.2;
        col = vec3(1.0, 0.85, 0.1); // Gold
    } else if (isInActiveTri) {
        scale *= 1.5;
        col = vec3(0.0, 1.0, 0.7); // Bright Cyan
    } else if (u_activeTriangleId >= 0) {
        scale *= 0.75;
        col = vec3(0.0, 0.3, 0.4) * 0.4; // Dimmed
    } else if (isCorner) {
        scale *= 1.35;
        col = vec3(0.0, 0.95, 1.0);
    }

    vec3 worldPos = a_instancePos.xyz + a_vertex * scale;

    if (u_enableNewton > 0.5) {
        // Heisenberg relative coordinate pullback to camera
        vec3 diff = worldPos - u_cameraPos;
        float relZ = diff.z - 0.5 * u_torsion * (u_cameraPos.x * diff.y - u_cameraPos.y * diff.x);
        vec4 nilRel = vec4(diff.x, diff.y, relZ, 1.0);

        // Safe Newton inverse exponential map
        vec4 warped = nil_inverse_exp_newton(nilRel);
        vec4 eyePos = u_view * vec4(u_cameraPos + warped.xyz, 1.0);
        gl_Position = u_proj * eyePos;
    } else {
        gl_Position = u_viewProj * vec4(worldPos, 1.0);
    }

    v_normal = normalize(a_vertex);
    v_color = vec4(col, 1.0);
    v_dist = gl_Position.w;
}
`;

export const INSTANCED_NODE_FRAG = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec4 v_color;
in float v_dist;
out vec4 fragColor;

void main() {
    vec3 n = normalize(v_normal);
    vec3 lightDir = normalize(vec3(0.4, 0.6, 0.8));
    float diff = max(dot(n, lightDir), 0.25);
    float fresnel = pow(1.0 - max(n.z, 0.0), 2.5);

    vec3 lit = v_color.rgb * diff + vec3(0.6, 0.9, 1.0) * fresnel * 0.5;
    fragColor = vec4(lit, 1.0);
}
`;

/**
 * Line Segment Edge Shaders with Native Nil Safe-Newton Warping
 */
export const EDGE_VERT = `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec4 a_edgeInfo; // (triangleId, edgeType, isSelected, 0)

uniform mat4 u_viewProj;
uniform mat4 u_view;
uniform mat4 u_proj;
uniform vec3 u_cameraPos;
uniform float u_torsion;
uniform float u_enableNewton;
uniform int u_activeTriangleId;

out vec4 v_color;

// Safe Newton-Raphson inverse exponential map for Nil space (3 steps)
vec4 nil_inverse_exp_newton(vec4 h) {
    float r2 = h.x * h.x + h.y * h.y;
    if (r2 < 1e-10) return vec4(h.xyz, 1.0);

    float b2 = 0.25 * r2;
    float b = sqrt(b2);
    float side = h.z - 0.5 * h.x * h.y;

    if (abs(side) < 1e-6) return vec4(h.xy, 0.0, 1.0);

    float w_min = side > 0.0 ? 0.0001 : -6.28218;
    float w_max = side > 0.0 ? 6.28218 : -0.0001;

    float w = clamp(side / (b2 / 3.0 + 1.0), w_min, w_max);

    for (int it = 0; it < 3; it++) {
        float gw, dgw;
        if (abs(w) < 0.1) {
            float w2 = w * w;
            gw = w * (1.0 / 3.0 + w2 / 90.0);
            dgw = 1.0 / 3.0 + w2 / 30.0;
        } else {
            float cw = cos(w);
            float sw = sin(w);
            float den = 1.0 - cw;
            gw = (w - sw) / den;
            dgw = (2.0 * den - w * sw) / (den * den);
        }

        float f = b2 * gw + w - side;
        float df = b2 * dgw + 1.0;
        float step = f / df;
        w = clamp(w - step, w_min, w_max);
    }

    float alpha_total = atan(h.y, h.x);
    float alpha = alpha_total - w * 0.5;
    float sin_half_w = sin(w * 0.5);
    float c = abs(sin_half_w) > 1e-6 ? b / sin_half_w : b / (w * 0.5);

    return vec4(c * w * cos(alpha), c * w * sin(alpha), w, 1.0);
}

void main() {
    int triId = int(a_edgeInfo.x);
    bool isInActiveTri = (triId == u_activeTriangleId && u_activeTriangleId >= 0);
    bool isSelected = a_edgeInfo.z > 0.5;

    vec3 col = vec3(0.0, 0.35, 0.55);
    float alpha = 0.45;

    if (isSelected) {
        col = vec3(1.0, 0.9, 0.2);
        alpha = 1.0;
    } else if (isInActiveTri) {
        col = vec3(0.0, 1.0, 0.85);
        alpha = 0.95;
    } else if (u_activeTriangleId >= 0) {
        col = vec3(0.0, 0.15, 0.25);
        alpha = 0.12;
    }

    v_color = vec4(col, alpha);

    if (u_enableNewton > 0.5) {
        vec3 diff = a_position - u_cameraPos;
        float relZ = diff.z - 0.5 * u_torsion * (u_cameraPos.x * diff.y - u_cameraPos.y * diff.x);
        vec4 nilRel = vec4(diff.x, diff.y, relZ, 1.0);

        vec4 warped = nil_inverse_exp_newton(nilRel);
        vec4 eyePos = u_view * vec4(u_cameraPos + warped.xyz, 1.0);
        gl_Position = u_proj * eyePos;
    } else {
        gl_Position = u_viewProj * vec4(a_position, 1.0);
    }
}
`;

export const EDGE_FRAG = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
    fragColor = v_color;
}
`;

/**
 * Helper to compile and link a WebGL2 Shader Program
 */
export function createShaderProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  if (!vertShader) throw new Error('Failed to create vertex shader');
  gl.shaderSource(vertShader, vertexSource);
  gl.compileShader(vertShader);
  if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(vertShader);
    gl.deleteShader(vertShader);
    throw new Error(`Vertex shader compilation failed: ${info}`);
  }

  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fragShader) throw new Error('Failed to create fragment shader');
  gl.shaderSource(fragShader, fragmentSource);
  gl.compileShader(fragShader);
  if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(fragShader);
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    throw new Error(`Fragment shader compilation failed: ${info}`);
  }

  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create shader program');
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Shader program link failed: ${info}`);
  }

  // Once linked, shaders can be detached and flagged for deletion
  gl.detachShader(program, vertShader);
  gl.detachShader(program, fragShader);
  gl.deleteShader(vertShader);
  gl.deleteShader(fragShader);

  return program;
}
