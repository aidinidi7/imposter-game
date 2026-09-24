// Haelt den Bildschirm waehrend des Spiels an (Screen Wake Lock API, iPhone ab iOS 16.4).
// Funktioniert nur ueber https oder localhost. Ohne Unterstuetzung passiert einfach nichts.

let sentinel = null;
let wanted = false;

async function acquire() {
  if (!wanted || sentinel || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
  try {
    sentinel = await navigator.wakeLock.request("screen");
    sentinel.addEventListener("release", () => {
      sentinel = null;
    });
  } catch {
    // z. B. Energiesparmodus: dann eben ohne.
  }
}

// Der Browser gibt die Sperre frei, sobald die App in den Hintergrund geht. Beim Zurueckkommen neu holen.
document.addEventListener("visibilitychange", acquire);

export function keepScreenOn(on) {
  wanted = on;
  if (on) {
    acquire();
  } else if (sentinel) {
    sentinel.release();
    sentinel = null;
  }
}
