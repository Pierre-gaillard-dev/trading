/**
 * Port d'aléa injectable. `next()` renvoie un flottant dans [0, 1) (comme
 * `Math.random`). Le cœur (`packages/core`) ne tire JAMAIS l'aléa lui-même :
 * il le reçoit par ce port, ce qui rend tout comportement déterministe et
 * testable (cf. règle n°2 du CLAUDE.md). En prod, l'adapter s'appuie sur
 * `Math.random` ; en test, on injecte un double déterministe.
 */
export interface RandomSource {
  /** Prochain flottant pseudo-aléatoire dans [0, 1). */
  next(): number;
}
