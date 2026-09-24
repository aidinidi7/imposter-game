// Alles, was das DOM anfasst. Kennt keine Spielregeln, meldet nur Eingaben per Callback.
import { MAX_PLAYERS, MIN_PLAYERS } from "./game.js";

const $ = (id) => document.getElementById(id);
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * @param categories  [{ id, name, special, count }] fuer die Auswahl-Chips
 * @param defaults    { categories } Vorauswahl, wenn noch nichts gespeichert ist
 */
/** Oeffnet einen <dialog> und liefert beim Schliessen den Wert des gedrueckten Buttons ("ok", "cancel", ""). */
function openDialog(dialog) {
  return new Promise((resolve) => {
    dialog.returnValue = "";
    dialog.addEventListener("close", () => resolve(dialog.returnValue), { once: true });
    dialog.showModal();
  });
}

/** Button reagiert nach einem Tipp kurz nicht, damit ein Doppeltipp nicht zwei Runden weiterspringt. */
function onClickWithCooldown(button, handler, ms = 1000) {
  button.addEventListener("click", () => {
    button.disabled = true;
    setTimeout(() => {
      button.disabled = false;
    }, ms);
    handler();
  });
}

export function createUi({
  categories, defaults, onStart, onInvite, onRandomCode, onNext, onPrev, onSetRound, onSettings,
}) {
  // Tipp auf den abgedunkelten Hintergrund schliesst jeden Dialog.
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  const el = {
    setup: $("screen-setup"),
    game: $("screen-game"),
    form: $("setup-form"),
    summary: $("room-summary"),
    summaryCode: $("summary-code"),
    summaryDetails: $("summary-details"),
    roomSettings: $("room-settings"),
    roomCode: $("room-code"),
    playerCount: $("player-count"),
    picker: $("player-picker"),
    categoryPicker: $("category-picker"),
    themePicker: $("theme-picker"),
    wordCount: $("word-count"),
    hint: $("imposter-hint"),
    error: $("setup-error"),
    info: $("setup-info"),
    metaRoom: $("meta-room"),
    metaPlayer: $("meta-player"),
    metaVersion: $("meta-version"),
    round: $("round-number"),
    starter: $("round-starter"),
    check: $("round-check"),
    solution: $("solution"),
    solutionWord: $("solution-word"),
    solutionImposter: $("solution-imposter"),
    resolve: $("btn-resolve"),
    card: $("card"),
    cardCategory: $("card-category"),
    cardWord: $("card-word"),
  };

  // Zwischenstand des Setup-Formulars, bevor "Spiel starten" gedrueckt wird.
  const draft = { playerCount: 4, playerNumber: null, categories: new Set(defaults.categories) };
  let lastRound = null;

  // ---------- Setup ----------

  function selectedCategories() {
    return categories.filter((c) => draft.categories.has(c.id));
  }

  function wordTotal() {
    return selectedCategories().reduce((sum, c) => sum + c.count, 0);
  }

  function renderPlayerPicker() {
    el.playerCount.textContent = draft.playerCount;
    const buttons = Array.from({ length: draft.playerCount }, (_, i) => {
      const n = i + 1;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = n;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(n === draft.playerNumber));
      button.addEventListener("click", () => {
        draft.playerNumber = n;
        renderPlayerPicker();
      });
      return button;
    });
    el.picker.replaceChildren(...buttons);
  }

  function renderCategories() {
    const chipFor = (category) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = category.name;
      chip.setAttribute("aria-pressed", String(draft.categories.has(category.id)));
      chip.addEventListener("click", () => {
        if (draft.categories.has(category.id)) draft.categories.delete(category.id);
        else draft.categories.add(category.id);
        renderCategories();
      });
      return chip;
    };
    el.categoryPicker.replaceChildren(...categories.filter((c) => !c.special).map(chipFor));
    el.themePicker.replaceChildren(...categories.filter((c) => c.special).map(chipFor));
    el.wordCount.textContent = `${wordTotal()} Wörter`;
  }

  function renderSummary() {
    const count = selectedCategories().length;
    const parts = [
      `${draft.playerCount} Spieler`,
      `${count} ${count === 1 ? "Kategorie" : "Kategorien"}`,
      `${wordTotal()} Wörter`,
    ];
    if (el.hint.checked) parts.push("mit Hinweis");
    el.summaryCode.textContent = el.roomCode.value;
    el.summaryDetails.textContent = parts.join(", ");
  }

  function setCompact(compact) {
    el.summary.hidden = !compact;
    el.roomSettings.hidden = compact;
    if (compact) renderSummary();
  }

  function readForm() {
    return {
      roomCode: el.roomCode.value,
      playerCount: draft.playerCount,
      playerNumber: draft.playerNumber,
      // Reihenfolge wie in der Kategorienliste, nicht wie angetippt.
      categories: selectedCategories().map((c) => c.id),
      showHintToImposter: el.hint.checked,
    };
  }

  el.form.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = draft.playerCount + Number(button.dataset.step);
      draft.playerCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, next));
      if (draft.playerNumber > draft.playerCount) draft.playerNumber = null;
      renderPlayerPicker();
    });
  });

  el.form.addEventListener("submit", (event) => {
    event.preventDefault();
    onStart(readForm());
  });

  $("btn-edit-room").addEventListener("click", () => setCompact(false));
  $("btn-invite").addEventListener("click", () => onInvite(readForm()));
  $("btn-random").addEventListener("click", () => {
    el.roomCode.value = onRandomCode();
    el.error.hidden = true;
  });

  // ---------- Karte: nur sichtbar, solange der Finger drauf ist ----------

  function setRevealed(revealed) {
    el.card.classList.toggle("is-revealed", revealed);
  }

  el.card.addEventListener("pointerdown", (event) => {
    if (event.button > 0) return;
    try {
      // Finger darf beim Halten leicht verrutschen, ohne dass die Karte zuklappt.
      el.card.setPointerCapture(event.pointerId);
    } catch {
      // Ohne Capture klappt die Karte beim Verlassen eben etwas frueher zu.
    }
    setRevealed(true);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    el.card.addEventListener(type, () => setRevealed(false));
  }
  el.card.addEventListener("contextmenu", (event) => event.preventDefault());
  el.card.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    setRevealed(true);
  });
  el.card.addEventListener("keyup", () => setRevealed(false));

  // ---------- Aufloesen: zwei Taps, damit niemand die Runde aus Versehen verraet ----------

  let disarmTimer = null;

  function disarmResolve() {
    clearTimeout(disarmTimer);
    delete el.resolve.dataset.armed;
    el.resolve.textContent = el.solution.hidden ? "Auflösen" : "Karte zeigen";
  }

  function setResolved(resolved) {
    el.solution.hidden = !resolved;
    el.card.hidden = resolved;
    setRevealed(false);
    disarmResolve();
  }

  el.resolve.addEventListener("click", () => {
    if (!el.solution.hidden) {
      setResolved(false);
    } else if (el.resolve.dataset.armed) {
      setResolved(true);
    } else {
      el.resolve.dataset.armed = "true";
      el.resolve.textContent = "Wirklich auflösen?";
      disarmTimer = setTimeout(disarmResolve, 3000);
    }
  });

  // ---------- Runde direkt einstellen ----------

  const roundDialog = $("round-dialog");
  const roundInput = $("round-input");

  $("btn-round").addEventListener("click", async () => {
    roundInput.value = lastRound ?? 1;
    const result = openDialog(roundDialog);
    roundInput.select();
    if ((await result) !== "ok") return;
    const round = Number.parseInt(roundInput.value, 10);
    if (Number.isInteger(round) && round >= 1) onSetRound(round);
  });

  onClickWithCooldown($("btn-next"), onNext);
  onClickWithCooldown($("btn-prev"), onPrev);
  $("btn-settings").addEventListener("click", onSettings);

  // ---------- Anleitung und Rueckfragen ----------

  const guideDialog = $("guide-dialog");
  const confirmDialog = $("confirm-dialog");

  $("btn-guide").addEventListener("click", () => openDialog(guideDialog));

  // ---------- Allgemein ----------

  function showScreen(screen) {
    el.setup.hidden = screen !== el.setup;
    el.game.hidden = screen !== el.game;
    window.scrollTo(0, 0);
  }

  /** Neue Rundennummer faehrt von unten ein, damit man den Wechsel bemerkt. */
  function animateRound(round) {
    if (lastRound !== null && lastRound !== round && !prefersReducedMotion()) {
      const from = round > lastRound ? "40%" : "-40%";
      el.round.animate(
        [{ transform: `translateY(${from})`, opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      );
    }
    lastRound = round;
  }

  // ---------- Oeffentliche Schnittstelle ----------

  return {
    /** compact: Raum-Einstellungen eingeklappt, nur Zusammenfassung und Spielernummer. */
    showSetup(state, { compact = false } = {}) {
      el.roomCode.value = state?.roomCode ?? "";
      el.hint.checked = state?.showHintToImposter ?? false;
      draft.playerCount = state?.playerCount ?? 4;
      draft.playerNumber = state?.playerNumber ?? null;
      draft.categories = new Set(state?.categories ?? defaults.categories);
      el.error.hidden = true;
      el.info.hidden = true;
      renderPlayerPicker();
      renderCategories();
      setCompact(compact && Boolean(state?.roomCode));
      lastRound = null;
      showScreen(el.setup);
    },

    /** Teilt den Link ueber das iOS-Teilen-Menue, sonst Zwischenablage, sonst Link anzeigen. */
    async shareInvite(url) {
      el.error.hidden = true;
      el.info.hidden = true;
      if (navigator.share) {
        try {
          await navigator.share({ title: "Imposter", text: "Komm in meine Imposter-Runde:", url });
          return;
        } catch (err) {
          if (err.name === "AbortError") return; // Nutzer hat das Menue geschlossen
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        el.info.textContent = "Link kopiert. Einfach in die Gruppe einfügen.";
      } catch {
        el.info.textContent = url;
      }
      el.info.hidden = false;
    },

    showGame({ roomCode, playerCount, playerNumber, round, role, starter, check, solution, version }) {
      el.metaRoom.textContent = `Raum ${roomCode}, ${playerCount} Spieler`;
      el.metaPlayer.textContent = playerNumber;
      el.metaVersion.textContent = version;
      el.round.textContent = round;
      el.starter.textContent = starter === playerNumber ? "Du" : `Spieler ${starter}`;
      el.check.textContent = check;

      el.solutionWord.textContent = solution.word;
      el.solutionImposter.textContent = solution.imposter === playerNumber
        ? "Du"
        : `Spieler ${solution.imposter}`;

      el.card.classList.toggle("is-imposter", role.isImposter);
      el.cardWord.textContent = role.isImposter ? "Imposter" : role.word;
      el.cardCategory.textContent = role.category
        ? (role.isImposter ? `Kategorie: ${role.category}` : role.category)
        : "";
      el.cardCategory.hidden = !role.category;

      setResolved(false);
      showScreen(el.game);
      animateRound(round);
    },

    /** Kurzanleitung anzeigen. Promise wird erfuellt, sobald sie geschlossen ist. */
    showGuide() {
      return openDialog(guideDialog);
    },

    /** Rueckfrage mit Abbrechen / Bestaetigen. Liefert true bei Bestaetigung. */
    async confirm({ title, text, confirmLabel }) {
      $("confirm-title").textContent = title;
      $("confirm-text").textContent = text;
      $("confirm-ok").textContent = confirmLabel;
      return (await openDialog(confirmDialog)) === "ok";
    },

    showError(message) {
      el.info.hidden = true;
      el.error.textContent = message;
      el.error.hidden = false;
    },
  };
}
