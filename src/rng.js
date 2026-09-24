// Deterministischer Zufall: gleicher Seed ergibt auf jedem Geraet dieselbe Zahlenfolge.

/** FNV-1a: macht aus einem String eine 32-Bit-Zahl. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: liefert eine Funktion, die bei jedem Aufruf eine Zahl in [0, 1) zurueckgibt. */
export function createRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ganze Zahl in [0, max). */
export function randomInt(rand, max) {
  return Math.floor(rand() * max);
}

/** Fisher-Yates auf einer Kopie, das Original bleibt unveraendert. */
export function shuffle(items, rand) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(rand, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
