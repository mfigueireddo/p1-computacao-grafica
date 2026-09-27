import { Shape } from "./shape.js";

// Disk: forma derivada de Shape.
// Constrói um disco (fan de triângulos) de raio 1 centrado na origem.
export class Disk extends Shape {
  constructor(device, segments = 64) {
    super(device);

    const vertices = [];
    const indices = [];

    // Vértice central: posição (0,0), textura (0.5, 0.5).
    vertices.push(0, 0, 0.5, 0.5);

    // Vértices da borda.
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const x = Math.cos(a);
      const y = Math.sin(a);
      // Mapeia o círculo [-1,1] para coordenada de textura [0,1].
      const u = x * 0.5 + 0.5;
      const v = y * 0.5 + 0.5;
      vertices.push(x, y, u, v);
    }

    // Triângulos do fan: centro (0) + dois vizinhos da borda.
    for (let i = 1; i <= segments; i++) {
      indices.push(0, i, i + 1);
    }

    this._upload(new Float32Array(vertices), new Uint16Array(indices));
  }
}
