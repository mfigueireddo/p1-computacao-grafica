import { identity, multiply } from "./mat.js";

// Node: nó do grafo de cena.
//
// Cada nó tem uma transformação LOCAL (relativa ao pai) e uma lista de
// filhos. A transformação de mundo de um nó é o produto das transformações
// locais desde a raiz até ele — é isso que a travessia calcula.
//
// Um nó pode ter um "drawable" ({ shape, color, texture }); nesse caso ele é
// desenhado usando a matriz de mundo acumulada. Nós sem drawable servem só
// para agrupar/posicionar filhos (pivôs de órbita, por exemplo).
export class Node {
  constructor(name = "") {
    this.name = name;
    this.local = identity();
    this.children = [];
    this.drawable = null; // { shape, color, texture }
  }

  add(child) {
    this.children.push(child);
    return child; // encadeia: const n = pai.add(new Node())
  }

  setDrawable(shape, texture, color = [1, 1, 1]) {
    this.drawable = { shape, texture, color };
    return this;
  }
}

// Percorre a árvore acumulando as matrizes e devolve a lista plana de
// objetos a desenhar, cada um com sua matriz de mundo já pronta.
export function collect(node, parentWorld = identity(), out = []) {
  const world = multiply(parentWorld, node.local);
  if (node.drawable) {
    out.push({
      shape: node.drawable.shape,
      texture: node.drawable.texture,
      color: node.drawable.color,
      model: world,
    });
  }
  for (const child of node.children) {
    collect(child, world, out);
  }
  return out;
}
