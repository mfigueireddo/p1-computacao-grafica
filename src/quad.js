import { Shape } from "./shape.js";

// Quad: retângulo que cobre toda a tela em coordenadas de clip [-1, 1].
// Usado só para desenhar a textura de fundo (o espaço). Mesmo layout de
// vértice das demais formas: [x, y, u, v].
export class Quad extends Shape {
  constructor(device) {
    super(device);
    // dois triângulos cobrindo a tela; v invertido para a imagem não sair
    // de cabeça para baixo.
    const vertices = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
       1,  1, 1, 0,
      -1,  1, 0, 0,
    ]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    this._upload(vertices, indices);
  }
}
