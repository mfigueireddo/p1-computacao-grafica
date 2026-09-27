// Shape: classe base do "grafo de cena" mínimo.
// Guarda a geometria (buffers de vértices/índices) e sabe se desenhar.
// Cada Shape concreto (ex.: Disk) preenche os buffers no construtor.

export class Shape {
  constructor(device) {
    this.device = device;
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.indexCount = 0;
  }

  // Envia para a GPU os dados já montados pela subclasse.
  // vertices: Float32Array  -> layout [x, y, u, v] por vértice
  // indices : Uint16Array
  _upload(vertices, indices) {
    const device = this.device;

    this.vertexBuffer = device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.vertexBuffer, 0, vertices);

    this.indexBuffer = device.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.indexBuffer, 0, indices);

    this.indexCount = indices.length;
  }

  // Descreve o layout dos vértices para o pipeline.
  // Compartilhado por todas as formas: 2 floats de posição + 2 de textura.
  static vertexBufferLayout() {
    return {
      arrayStride: 4 * 4, // 4 floats * 4 bytes
      attributes: [
        { shaderLocation: 0, offset: 0, format: "float32x2" }, // posição
        { shaderLocation: 1, offset: 2 * 4, format: "float32x2" }, // coord. textura
      ],
    };
  }

  // Emite os comandos de desenho no render pass atual.
  draw(pass) {
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setIndexBuffer(this.indexBuffer, "uint16");
    pass.drawIndexed(this.indexCount);
  }
}
