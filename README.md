# Mini-sistema solar 2D — INF1761 (Projeto 1)

Animação da vista superior de um mini-sistema solar em **WebGPU**, modelado com um **grafo de cena**:

- **Sol** no centro (com textura e giro lento no próprio eixo);
- **Mercúrio** orbitando o Sol, entre ele e a Terra;
- **Terra** com **translação** em torno do Sol e **rotação no próprio eixo** (a textura deixa a rotação visível);
- **Lua** orbitando a Terra — **sem herdar** a rotação do eixo da Terra;
- **fundo** com textura de espaço estrelado.

## Como executar

WebGPU não roda abrindo o `index.html` direto do disco (precisa de `http://`). Suba um servidor local na pasta do projeto:

```bash
# opção 1 — Python
python -m http.server 8000

# opção 2 — Node
npx serve .
```

Depois abra <http://localhost:8000> em um navegador com WebGPU (Chrome/Edge 113+ ou Firefox recente com WebGPU habilitado).

## Estrutura

```
index.html        página + canvas
src/shape.js      classe base Shape (buffers + desenho)
src/disk.js       Disk : Shape (disco com coords. de textura)
src/quad.js       Quad : Shape (retângulo de tela cheia p/ o fundo)
src/scene.js      grafo de cena: Node + travessia (collect)
src/engine.js     monta e anima o grafo do mini-sistema solar
src/textures.js   texturas geradas por código (canvas 2D) -> GPU
src/mat.js        utilitário de matrizes 4x4 (translação, escala, rotação)
src/main.js       init WebGPU, pipelines (fundo + astros) e loop de render
```

## Requisitos

- **Grafo de cena** (`src/scene.js`): cada nó tem uma transformação local e filhos; a matriz de mundo é o produto acumulado na travessia. A hierarquia é:

  ```
  root
  ├─ Sol            (rotação lenta + escala)
  ├─ órbita Mercúrio (rotaçãoZ)
  │   └─ Mercúrio    (translação + escala)
  └─ órbita Terra    (rotaçãoZ)  ← translação da Terra em torno do Sol
      └─ posição Terra (translação do raio da órbita)
          ├─ Terra    (rotação no próprio eixo + escala)
          └─ órbita Lua (rotaçãoZ)
              └─ Lua   (translação + escala)
  ```

- **Translação da Terra em torno do Sol**: nó `órbita Terra` (rotaçãoZ) com a Terra pendurada num nó de translação (o raio da órbita).
- **Rotação da Terra no próprio eixo**: o nó visível da Terra recebe uma rotaçãoZ própria; o degradê da textura do oceano mostra o giro.
- **Lua não herda a rotação da Terra**: a órbita da Lua é **irmã** do nó visível da Terra (ambas filhas de "posição Terra"), então a Lua acompanha a translação da Terra, mas não o giro do eixo dela.
- **Astro adicional (Mercúrio)**: órbita própria de raio menor, entre Sol e Terra.
- **Texturas nos astros**: geradas por código num canvas 2D e enviadas à GPU (`copyExternalImageToTexture`), amostradas por `(u,v)` no shader.
- **Textura de fundo (espaço)**: um `Quad` de tela cheia com a textura estrelada, desenhado antes dos astros.

