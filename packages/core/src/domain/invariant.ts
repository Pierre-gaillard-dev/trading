/** Garde-fou : lève une erreur si la condition est fausse (validation de config, etc.). */
export function invariant(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}
