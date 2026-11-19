import * as THREE from 'three';

/**
 * GLSL Chunk implementing the Safe Newton Inverse Exponential Map for Nil Geometry.
 * Warps vertex positions according to non-Euclidean geodesic light trajectories.
 */
export const NIL_SAFE_NEWTON_GLSL_FUNCTIONS = /* glsl */ `
vec4 nil_inverse_exp_newton(vec4 h) {
  float r2 = h.x * h.x + h.y * h.y;
  if (r2 < 1e-10) {
    return vec4(h.xyz, 1.0);
  }

  float b2 = 0.25 * r2;
  float b = sqrt(b2);
  float side = h.z - 0.5 * h.x * h.y;

  if (abs(side) < 1e-6) {
    return vec4(h.xy, 0.0, 1.0);
  }

  float w_min = side > 0.0 ? 0.0001 : -6.28218;
  float w_max = side > 0.0 ? 6.28218 : -0.0001;

  // Initial Taylor guess
  float w = clamp(side / (b2 / 3.0 + 1.0), w_min, w_max);

  // 3 quadratic Safe Newton-Raphson steps with singularity removal
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
`;

/**
 * Creates a custom ShaderMaterial for line segments warped along Nil geodesics.
 */
export function createNilGeodesicLineMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCameraPos: { value: new THREE.Vector3() },
      uTorsion: { value: 1.0 },
      uEnableNewton: { value: 1.0 }, // 1.0 = Safe Newton Geodesic, 0.0 = Euclidean
      uIntensity: { value: 1.0 }
    },
    vertexShader: /* glsl */ `
      attribute vec3 color;
      varying vec3 vColor;
      uniform vec3 uCameraPos;
      uniform float uTorsion;
      uniform float uEnableNewton;

      ${NIL_SAFE_NEWTON_GLSL_FUNCTIONS}

      void main() {
        vColor = color;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);

        if (uEnableNewton > 0.5) {
          // Compute Nil relative coordinates to camera using Heisenberg action
          vec3 diff = worldPos.xyz - uCameraPos;
          float relZ = diff.z - 0.5 * uTorsion * (uCameraPos.x * diff.y - uCameraPos.y * diff.x);
          vec4 nilRel = vec4(diff.x, diff.y, relZ, 1.0);

          // Apply Safe Newton inverse exponential map
          vec4 warpedTangent = nil_inverse_exp_newton(nilRel);
          vec4 eyePos = viewMatrix * vec4(uCameraPos + warpedTangent.xyz, 1.0);
          gl_Position = projectionMatrix * eyePos;
        } else {
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      uniform float uIntensity;

      void main() {
        gl_FragColor = vec4(vColor * uIntensity, 0.85);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}
