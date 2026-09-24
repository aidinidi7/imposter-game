// Reine Spiellogik. Kein DOM, kein localStorage, dadurch ohne Browser testbar.
import { createRng, hashString, randomInt, shuffle } from "./rng.js";

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

/**
 * Bringt die Eingabe des Raumcodes in eine einheitliche Form, damit kleine
 * Tippunterschiede zwischen den Handys nicht zu verschiedenen Spielen fuehren.
 */
export function normalizeRoomCode(input) {
  return String(input ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, "");
}

/** Prueft alles, was fuer den ganzen Raum gilt. Fehlermeldung oder null. */
export function validateRoom({ roomCode, playerCount, categories }) {
  if (!roomCode) return "Bitte einen Raumcode eingeben.";
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return `Es können ${MIN_PLAYERS} bis ${MAX_PLAYERS} Leute mitspielen.`;
  }
  if (!Array.isArray(categories) || categories.length === 0) {
    return "Bitte mindestens eine Kategorie wählen.";
  }
  return null;
}

/** Prueft alle Einstellungen vor dem Spielstart. Fehlermeldung oder null. */
export function validateSetup(settings) {
  const roomError = validateRoom(settings);
  if (roomError) return roomError;
  const { playerNumber, playerCount } = settings;
  if (!Number.isInteger(playerNumber) || playerNumber < 1 || playerNumber > playerCount) {
    return "Bitte deine Spielernummer wählen.";
  }
  return null;
}

/** Kategorien als fester Text, unabhaengig davon, in welcher Reihenfolge sie angetippt wurden. */
export function categoryKey(categoryIds) {
  return [...categoryIds].sort().join(",");
}

/** Woerter der gewaehlten Kategorien, immer in der festen Reihenfolge der Kategorienliste. */
export function buildWordPool(allCategories, selectedIds) {
  const selected = new Set(selectedIds);
  return allCategories
    .filter((category) => selected.has(category.id))
    .flatMap((category) => category.words.map((word) => ({ word, category: category.name })));
}

/** Alles, was auf allen Handys gleich sein muss, als ein String. */
function roomKey({ roomCode, version, categories }) {
  return `${version}|${roomCode}|${categoryKey(categories)}`;
}

/**
 * Pro Raum wird die Wortliste einmal gemischt. Runde n nimmt das n-te Wort,
 * so wiederholt sich nichts, bis die Liste einmal durch ist.
 */
function deckFor(settings, words) {
  return shuffle(words, createRng(hashString(`deck|${roomKey(settings)}`)));
}

/** Berechnet Wort, Imposter und Startspieler einer Runde. Auf jedem Geraet identisch. */
export function createRound(settings, words) {
  const { round, playerCount } = settings;
  const deck = deckFor(settings, words);
  const entry = deck[(round - 1) % deck.length];
  const rand = createRng(hashString(`round|${roomKey(settings)}|${round}`));
  const imposter = randomInt(rand, playerCount) + 1;
  // Startspieler komplett zufaellig, auch der Imposter kann anfangen. Waere er ausgeschlossen,
  // koennte man daraus schliessen, dass der Startspieler sicher unschuldig ist.
  const starter = randomInt(rand, playerCount) + 1;
  return { round, word: entry.word, category: entry.category, imposter, starter };
}

// Ohne leicht verwechselbare Zeichen wie 0/O, 1/I, 2/Z, 5/S, 8/B.
const CHECK_ALPHABET = "ACDEFHJKLMNPRTUVWXY34679";

/**
 * Kurzes Kuerzel aus allen Werten, die bei allen gleich sein muessen.
 * Gleiches Kuerzel auf allen Handys heisst: alle spielen dieselbe Runde.
 */
export function checkCode(settings) {
  let h = hashString(`check|${roomKey(settings)}|${settings.playerCount}|${settings.round}`);
  let code = "";
  for (let i = 0; i < 3; i++) {
    code += CHECK_ALPHABET[h % CHECK_ALPHABET.length];
    h = Math.floor(h / CHECK_ALPHABET.length);
  }
  return code;
}

/** Was ein bestimmter Spieler in dieser Runde zu sehen bekommt. */
export function roleFor(roundInfo, playerNumber, { showHintToImposter }) {
  if (playerNumber === roundInfo.imposter) {
    return {
      isImposter: true,
      word: null,
      category: showHintToImposter ? roundInfo.category : null,
    };
  }
  return { isImposter: false, word: roundInfo.word, category: roundInfo.category };
}
