// Einstiegspunkt: verbindet Logik, Speicher und UI.
import { CATEGORIES, DEFAULT_CATEGORY_IDS, WORDLIST_VERSION } from "./words.js";
import {
  buildWordPool, categoryKey, checkCode, createRound, normalizeRoomCode, roleFor,
  validateRoom, validateSetup,
} from "./game.js";
import { buildInviteUrl, parseInvite, randomRoomCode } from "./invite.js";
import { hasSeenGuide, loadState, markGuideSeen, saveState } from "./storage.js";
import { createUi } from "./ui.js";
import { keepScreenOn } from "./wakelock.js";

const KNOWN_CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

let state = loadState();

/** Vereinheitlicht Eingaben, bevor sie geprueft oder gespeichert werden. */
function normalizeSettings(input) {
  return {
    ...input,
    roomCode: normalizeRoomCode(input.roomCode),
    categories: (input.categories ?? []).filter((id) => KNOWN_CATEGORY_IDS.has(id)),
  };
}

/** Gleicher Raum = alles, was auf allen Handys gleich sein muss, ist gleich. */
function isSameRoom(a, b) {
  return Boolean(a && b)
    && a.roomCode === b.roomCode
    && a.playerCount === b.playerCount
    && categoryKey(a.categories ?? []) === categoryKey(b.categories ?? []);
}

const ui = createUi({
  categories: CATEGORIES.map(({ id, name, special = false, words }) => ({ id, name, special, count: words.length })),
  defaults: { categories: DEFAULT_CATEGORY_IDS },

  async onStart(input) {
    const settings = normalizeSettings(input);
    const error = validateSetup(settings);
    if (error) {
      ui.showError(error);
      return;
    }
    // Gleicher Raumcode, aber andere Spielerzahl oder Kategorien mitten im Spiel: das
    // bringt dieses Handy aus dem Takt mit den anderen. Lieber einmal nachfragen.
    const changesRunningRoom = state?.roomCode === settings.roomCode
      && state.round > 1
      && !isSameRoom(state, settings);
    if (changesRunningRoom) {
      const confirmed = await ui.confirm({
        title: "Einstellungen ändern?",
        text: `Du bist gerade in Runde ${state.round}. Mit geänderten Einstellungen startest du `
          + "wieder bei Runde 1 und siehst andere Wörter als die anderen, bis alle dieselben "
          + "Einstellungen gewählt haben. Am einfachsten: neuen Einladungslink schicken.",
        confirmLabel: "Trotzdem ändern",
      });
      if (!confirmed) return;
    }
    // Gleicher Raum: bei der aktuellen Runde weitermachen, sonst bei Runde 1 anfangen.
    update({ ...settings, round: isSameRoom(state, settings) ? state.round : 1 });
  },
  onInvite(input) {
    const settings = normalizeSettings(input);
    const error = validateRoom(settings);
    if (error) {
      ui.showError(error);
      return;
    }
    ui.shareInvite(buildInviteUrl(settings));
  },
  onRandomCode: randomRoomCode,
  onNext() {
    update({ ...state, round: state.round + 1 });
  },
  onPrev() {
    if (state.round > 1) update({ ...state, round: state.round - 1 });
  },
  onSetRound(round) {
    if (round !== state.round) update({ ...state, round });
  },
  onSettings() {
    keepScreenOn(false);
    ui.showSetup(state, { compact: true });
  },
});

function update(nextState) {
  state = nextState;
  saveState(state);
  renderGame();
}

function renderGame() {
  const settings = { ...state, version: WORDLIST_VERSION };
  const roundInfo = createRound(settings, buildWordPool(CATEGORIES, state.categories));
  ui.showGame({
    ...state,
    role: roleFor(roundInfo, state.playerNumber, state),
    starter: roundInfo.starter,
    check: checkCode(settings),
    solution: { word: roundInfo.word, imposter: roundInfo.imposter },
    version: WORDLIST_VERSION,
  });
  keepScreenOn(true);
}

function start() {
  const invite = parseInvite(window.location.hash);
  if (invite) {
    // Link-Teil entfernen, damit ein Neuladen nicht erneut die Einladung auswertet.
    history.replaceState(null, "", window.location.pathname);
    const room = normalizeSettings({ ...invite, categories: invite.categories ?? DEFAULT_CATEGORY_IDS });
    if (!isSameRoom(state, room) && !validateRoom(room)) {
      ui.showSetup({ ...room, playerNumber: null }, { compact: true });
      return;
    }
  }
  if (state && !validateSetup(normalizeSettings(state))) {
    state = normalizeSettings(state);
    renderGame();
  } else {
    ui.showSetup(state);
  }
}

start();

if (!hasSeenGuide()) {
  ui.showGuide().then(markGuideSeen);
}

// Offline-Modus nur online (https). Lokal beim Entwickeln wuerde der Cache nur stoeren.
if ("serviceWorker" in navigator && window.location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {
    // Ohne Offline-Modus laeuft die App trotzdem.
  });
}
