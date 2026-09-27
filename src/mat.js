// Utilitário mínimo de matrizes 4x4 (column-major, compatível com WGSL mat4x4f).
// Trabalhamos no plano XY (vista superior), Z fica em 0.

export function identity() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

export function multiply(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) {
        s += a[k * 4 + r] * b[c * 4 + k];
      }
      out[c * 4 + r] = s;
    }
  }
  return out;
}

export function translation(x, y) {
  const m = identity();
  m[12] = x;
  m[13] = y;
  return m;
}

export function scaling(s) {
  const m = identity();
  m[0] = s;
  m[5] = s;
  return m;
}

// Rotação em torno do eixo Z (o eixo que "sai" da tela na vista superior).
// theta em radianos. Column-major, igual às demais.
export function rotationZ(theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const m = identity();
  m[0] = c;  m[1] = s;
  m[4] = -s; m[5] = c;
  return m;
}

// Projeção ortográfica simples que mantém o mundo quadrado dentro
// de [-half, half] em ambos os eixos (canvas é quadrado).
export function ortho(half) {
  const m = identity();
  m[0] = 1 / half;
  m[5] = 1 / half;
  return m;
}
