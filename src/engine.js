import { translation, scaling, rotationZ, multiply } from "./mat.js";
import { Node, collect } from "./scene.js";

// Engine: monta o grafo de cena do mini-sistema solar e o anima.
//
// ACada órbita é um nó de rotação; o
// astro pendura num nó de translação (o raio da órbita) abaixo dele. Assim a
// composição de matrizes da travessia posiciona tudo automaticamente.
//
//   root
//   ├─ sunVisual        (rotaçãoZ lenta + escala)      -> Sol
//   ├─ mercuryOrbit     (rotaçãoZ)
//   │   └─ mercuryVisual (translação + escala)         -> Mercúrio
//   └─ earthOrbit       (rotaçãoZ)  translação da Terra em torno do Sol
//       └─ earthPos     (translação: raio da órbita da Terra)
//           ├─ earthVisual (rotaçãoZ própria + escala) -> Terra (gira no eixo)
//           └─ moonOrbit   (rotaçãoZ)                   translação da Lua
//               └─ moonVisual (translação + escala)     -> Lua
//
// A Lua NÃO herda a rotação da Terra no
// próprio eixo. Isso sai de graça da hierarquia: 'moonOrbit' é irmão de
// 'earthVisual' (ambos filhos de 'earthPos'), então a Lua acompanha a
// translação da Terra em torno do Sol, mas não o giro do 'earthVisual'.
export class Engine {
  constructor(diskShape) {
    this.disk = diskShape;

    // --- Estado angular (radianos) ---
    this.earthOrbitAngle = 0; // Terra em torno do Sol
    this.earthSpinAngle = 0;  // Terra no próprio eixo
    this.moonAngle = 0;       // Lua em torno da Terra
    this.mercuryAngle = 0;    // Mercúrio em torno do Sol
    this.sunSpinAngle = 0;    // Sol girando devagar (só estético)

    // --- Velocidades angulares (rad/s) ---
    this.earthOrbitSpeed = 0.4;
    this.earthSpinSpeed = 1.6; // bem mais rápido: o dia é curto perto do ano
    this.moonSpeed = 2.2;
    this.mercurySpeed = 0.95; // Mercúrio é o mais rápido em translação
    this.sunSpinSpeed = 0.15;

    // --- Geometria (unidades de mundo) ---
    this.mercuryOrbit = 2.8;
    this.earthOrbit = 5.5;
    this.moonOrbit = 1.4;

    this.sunSize = 1.6;
    this.mercurySize = 0.35;
    this.earthSize = 0.7;
    this.moonSize = 0.28;

    this._build();
  }

  _build() {
    const root = new Node("root");

    // Sol no centro.
    this.sunVisual = new Node("sunVisual");
    this.sunVisual.setDrawable(this.disk, "sun");
    root.add(this.sunVisual);

    // Mercúrio: órbita própria entre o Sol e a Terra.
    this.mercuryOrbit_ = new Node("mercuryOrbit");
    const mercuryVisual = new Node("mercuryVisual");
    mercuryVisual.local = multiply(
      translation(this.mercuryOrbit, 0),
      scaling(this.mercurySize)
    );
    mercuryVisual.setDrawable(this.disk, "mercury");
    this.mercuryOrbit_.add(mercuryVisual);
    root.add(this.mercuryOrbit_);

    // Terra: órbita -> posição -> (giro próprio + Lua).
    this.earthOrbit_ = new Node("earthOrbit");
    this.earthPos = new Node("earthPos");
    this.earthPos.local = translation(this.earthOrbit, 0);
    this.earthOrbit_.add(this.earthPos);
    root.add(this.earthOrbit_);

    // Terra visível (este nó recebe a rotação no próprio eixo).
    this.earthVisual = new Node("earthVisual");
    this.earthVisual.setDrawable(this.disk, "earth");
    this.earthPos.add(this.earthVisual);

    // Lua: irmã do earthVisual -> segue a Terra, mas não herda o giro dela.
    this.moonOrbit_ = new Node("moonOrbit");
    const moonVisual = new Node("moonVisual");
    moonVisual.local = multiply(
      translation(this.moonOrbit, 0),
      scaling(this.moonSize)
    );
    moonVisual.setDrawable(this.disk, "moon");
    this.moonOrbit_.add(moonVisual);
    this.earthPos.add(this.moonOrbit_);

    this.root = root;
    this._syncMatrices();
  }

  update(dt) {
    this.earthOrbitAngle += this.earthOrbitSpeed * dt;
    this.earthSpinAngle += this.earthSpinSpeed * dt;
    this.moonAngle += this.moonSpeed * dt;
    this.mercuryAngle += this.mercurySpeed * dt;
    this.sunSpinAngle += this.sunSpinSpeed * dt;
    this._syncMatrices();
  }

  // Atualiza só os nós animados (os estáticos foram montados uma vez).
  _syncMatrices() {
    this.sunVisual.local = multiply(
      rotationZ(this.sunSpinAngle),
      scaling(this.sunSize)
    );
    this.mercuryOrbit_.local = rotationZ(this.mercuryAngle);
    this.earthOrbit_.local = rotationZ(this.earthOrbitAngle);
    this.earthVisual.local = multiply(
      rotationZ(this.earthSpinAngle),
      scaling(this.earthSize)
    );
    this.moonOrbit_.local = rotationZ(this.moonAngle);
  }

  // Lista plana de astros a desenhar, com matriz de mundo já composta.
  drawList() {
    return collect(this.root);
  }
}
