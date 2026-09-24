// Merkt sich die Einstellungen im Browser, damit ein Neuladen das Spiel nicht beendet.
const KEY = "imposter.state.v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const GUIDE_KEY = "imposter.guideSeen";

export function hasSeenGuide() {
  try {
    return localStorage.getItem(GUIDE_KEY) === "1";
  } catch {
    return true; // Ohne Speicher lieber nicht bei jedem Start nerven.
  }
}

export function markGuideSeen() {
  try {
    localStorage.setItem(GUIDE_KEY, "1");
  } catch {
    // egal
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Privater Modus o. ae.: Spiel laeuft trotzdem, nur ohne Speichern.
  }
}
