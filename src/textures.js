// Geração das texturas por código, usando um canvas 2D como "pintura".
//
// Em vez de carregar arquivos de imagem (que exigiriam assets externos e
// servidor configurado para servi-los), desenhamos cada astro num canvas e
// enviamos esse canvas como textura para a GPU. Continua sendo mapeamento de
// textura de verdade: há um objeto GPUTexture, um sampler e coordenadas (u,v).

function makeCanvas(size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
}

// Gerador de números pseudoaleatório com semente, para as texturas saírem
// sempre iguais (útil para o relatório e o vídeo ficarem consistentes).
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ---- Terra ----------
export function earthCanvas(size = 512) {
  const c = makeCanvas(size);
  const g = c.getContext("2d");

  // Oceano.
  const ocean = g.createLinearGradient(0, 0, 0, size);
  ocean.addColorStop(0, "#123a8f");
  ocean.addColorStop(0.5, "#1e63c8");
  ocean.addColorStop(1, "#123a8f");
  g.fillStyle = ocean;
  g.fillRect(0, 0, size, size);

  return c;
}

// ---- Sol ---------
export function sunCanvas(size = 512) {
  const c = makeCanvas(size);
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(
    size * 0.5, size * 0.5, size * 0.05,
    size * 0.5, size * 0.5, size * 0.5
  );
  grad.addColorStop(0, "#fff6c8");
  grad.addColorStop(0.55, "#ffcf3f");
  grad.addColorStop(1, "#f08a1d");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

// ---- Base para Lua e Mercúrio -------------
function solidCanvas(size, base) {
  const c = makeCanvas(size);
  const g = c.getContext("2d");
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  return c;
}

export function moonCanvas(size = 512) {
  return solidCanvas(size, "#9aa0a6");
}

export function mercuryCanvas(size = 512) {
  return solidCanvas(size, "#8a7a6a");
}

// ---- Espaço ---------------------------------------
export function starsCanvas(size = 1024) {
  const c = makeCanvas(size);
  const g = c.getContext("2d");

  const bg = g.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, "#03040a");
  bg.addColorStop(0.5, "#080a1a");
  bg.addColorStop(1, "#040309");
  g.fillStyle = bg;
  g.fillRect(0, 0, size, size);

  // Nebulosa suave.
  const rnd = seeded(99);
  for (let i = 0; i < 6; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = size * (0.15 + rnd() * 0.2);
    const neb = g.createRadialGradient(x, y, 0, x, y, r);
    const hue = rnd() > 0.5 ? "80,60,160" : "40,80,150";
    neb.addColorStop(0, `rgba(${hue},0.12)`);
    neb.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = neb;
    g.fillRect(0, 0, size, size);
  }

  // Estrelas.
  for (let i = 0; i < 700; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = rnd() * 1.6 + 0.2;
    const b = 0.5 + rnd() * 0.5;
    g.fillStyle = `rgba(255,255,255,${b})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// ---- Envio de um canvas para a GPU como textura -------------------------
export function textureFromCanvas(device, canvas) {
  const texture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: canvas },
    { texture },
    [canvas.width, canvas.height]
  );
  return texture;
}
