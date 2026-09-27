import { Disk } from "./disk.js";
import { Quad } from "./quad.js";
import { Shape } from "./shape.js";
import { Engine } from "./engine.js";
import { ortho, multiply } from "./mat.js";
import {
  earthCanvas, sunCanvas, moonCanvas, mercuryCanvas, starsCanvas,
  textureFromCanvas,
} from "./textures.js";

// ---- Shaders (WGSL) ------------------------------------------------------
// Astros: recebem mvp + cor por uniforme e amostram a textura do astro.
const bodyShader = /* wgsl */ `
struct Uniforms {
  mvp   : mat4x4f,
  color : vec4f,
};
@group(0) @binding(0) var<uniform> u : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var tex  : texture_2d<f32>;

struct VSOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
};

@vertex
fn vs(@location(0) position : vec2f, @location(1) uv : vec2f) -> VSOut {
  var out : VSOut;
  out.pos = u.mvp * vec4f(position, 0.0, 1.0);
  out.uv = uv;
  return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4f {
  let base = textureSample(tex, samp, in.uv).rgb * u.color.rgb;
  // Leve escurecimento em direção à borda, dando sensação de esfera.
  let d = distance(in.uv, vec2f(0.5, 0.5)) * 2.0;
  let shade = mix(1.0, 0.75, clamp(d, 0.0, 1.0));
  return vec4f(base * shade, 1.0);
}
`;

// Fundo: desenha a textura de estrelas cobrindo a tela (sem mvp).
const bgShader = /* wgsl */ `
@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var tex  : texture_2d<f32>;

struct VSOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
};

@vertex
fn vs(@location(0) position : vec2f, @location(1) uv : vec2f) -> VSOut {
  var out : VSOut;
  out.pos = vec4f(position, 0.0, 1.0);
  out.uv = uv;
  return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4f {
  return textureSample(tex, samp, in.uv);
}
`;

const UNIFORM_STRIDE = 256; // alinhamento mínimo para offsets no buffer

function fail(msg) {
  const el = document.getElementById("err");
  el.style.display = "grid";
  el.innerHTML = msg;
  console.error(msg);
}

async function main() {
  const canvas = document.getElementById("gpu-canvas");

  if (!navigator.gpu) {
    fail(
      "Seu navegador não suporta <b>WebGPU</b>.<br>Use Chrome/Edge 113+ ou Firefox recente (com WebGPU habilitado)."
    );
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    fail("Não foi possível obter um adaptador WebGPU.");
    return;
  }
  const device = await adapter.requestDevice();

  const context = canvas.getContext("webgpu");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });

  // ---- Geometria ----
  const disk = new Disk(device, 96);
  const quad = new Quad(device);
  const engine = new Engine(disk);

  // ---- Texturas (geradas por código) e sampler ----
  const textures = {
    sun: textureFromCanvas(device, sunCanvas()),
    earth: textureFromCanvas(device, earthCanvas()),
    moon: textureFromCanvas(device, moonCanvas()),
    mercury: textureFromCanvas(device, mercuryCanvas()),
  };
  const starTexture = textureFromCanvas(device, starsCanvas());

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  // ---- Pipeline dos astros ----
  const bodyModule = device.createShaderModule({ code: bodyShader });
  const bodyLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    ],
  });
  const bodyPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bodyLayout] }),
    vertex: { module: bodyModule, entryPoint: "vs", buffers: [Shape.vertexBufferLayout()] },
    fragment: { module: bodyModule, entryPoint: "fs", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  // ---- Pipeline do fundo ----
  const bgModule = device.createShaderModule({ code: bgShader });
  const bgLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    ],
  });
  const bgPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bgLayout] }),
    vertex: { module: bgModule, entryPoint: "vs", buffers: [Shape.vertexBufferLayout()] },
    fragment: { module: bgModule, entryPoint: "fs", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
  const bgBindGroup = device.createBindGroup({
    layout: bgLayout,
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: starTexture.createView() },
    ],
  });

  // ---- Uniformes e bind groups por astro ----
  // A ordem dos astros no grafo é fixa, então montamos um bind group por
  // astro uma única vez (cada um aponta para sua fatia do buffer e sua textura).
  const initial = engine.drawList();
  const uniformBuffer = device.createBuffer({
    size: UNIFORM_STRIDE * initial.length,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bodyBindGroups = initial.map((body, i) =>
    device.createBindGroup({
      layout: bodyLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer, offset: i * UNIFORM_STRIDE, size: UNIFORM_STRIDE },
        },
        { binding: 1, resource: sampler },
        { binding: 2, resource: textures[body.texture].createView() },
      ],
    })
  );

  // ---- Loop de render ----
  const proj = ortho(8); // mundo visível ~[-8, 8]
  const scratch = new Float32Array(UNIFORM_STRIDE / 4);
  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    engine.update(dt);
    const bodies = engine.drawList();

    // Uniformes de cada astro na sua fatia do buffer.
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const mvp = multiply(proj, b.model);
      scratch.set(mvp, 0);
      scratch[16] = b.color[0];
      scratch[17] = b.color[1];
      scratch[18] = b.color[2];
      scratch[19] = 1.0;
      device.queue.writeBuffer(uniformBuffer, i * UNIFORM_STRIDE, scratch);
    }

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.02, g: 0.024, b: 0.04, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    // 1) Fundo estrelado.
    pass.setPipeline(bgPipeline);
    pass.setBindGroup(0, bgBindGroup);
    quad.draw(pass);

    // 2) Astros por cima.
    pass.setPipeline(bodyPipeline);
    for (let i = 0; i < bodies.length; i++) {
      pass.setBindGroup(0, bodyBindGroups[i]);
      bodies[i].shape.draw(pass);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main();
