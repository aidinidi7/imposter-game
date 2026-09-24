// Einladungslink: Raumeinstellungen stecken im Teil nach dem #.
// Der #-Teil wird nie an einen Server geschickt, er bleibt komplett im Browser.

/**
 * Zufaelliger 4-stelliger Zahlencode wie "4827", leicht im Sprachchat durchzugeben.
 * Echter Zufall reicht, nur der Gastgeber erzeugt ihn. Kollisionen sind egal,
 * weil es keinen Server gibt, auf dem sich Raeume in die Quere kommen koennten.
 */
export function randomRoomCode() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

export function buildInviteUrl({ roomCode, playerCount, categories, showHintToImposter }, location = window.location) {
  const params = new URLSearchParams({
    r: roomCode,
    n: String(playerCount),
    c: categories.join("."),
    h: showHintToImposter ? "1" : "0",
  });
  return `${location.origin}${location.pathname}#${params}`;
}

/** Liest die Raumeinstellungen aus dem #-Teil oder gibt null zurueck. */
export function parseInvite(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const roomCode = params.get("r");
  const playerCount = Number(params.get("n"));
  if (!roomCode || !Number.isInteger(playerCount)) return null;
  return {
    roomCode,
    playerCount,
    categories: params.get("c")?.split(".").filter(Boolean) ?? null,
    showHintToImposter: params.get("h") === "1",
  };
}
