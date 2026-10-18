/**
 * BirdNET Live - Main Application Script
 * Handles audio capture, TensorFlow.js worker communication,
 * spectrogram visualization, and UI rendering.
 */

/* ==========================================================================
   1. CONFIGURATION & CONSTANTS
   ========================================================================== */

// Audio settings
const SAMPLE_RATE = 48000;
const WINDOW_SECONDS = 3;
const WINDOW_SAMPLES = SAMPLE_RATE * WINDOW_SECONDS;
const AUDIO_BUFFER_SECONDS = 8;
const CLIP_SECONDS = 6;

// Inference settings
const TEMPORAL_POOL_WINDOW = 5;    // Number of recent predictions to pool
const USE_TEMPORAL_POOL = true;    // Enable log-mean-exp pooling

// Spectrogram settings
const SPECTRO_FFT_SIZE = 2048;
const SPECTRO_DEFAULT_DURATION_SEC = 20;
const SPECTRO_DEFAULT_GAIN = 1.5;
const SPECTRO_SMOOTHING = 0.0; // 0.0 = crisp details, 1.0 = very smooth
const SPECTRO_MIN_FREQ_DEFAULT = 0;
const SPECTRO_MAX_FREQ_DEFAULT = 12000;

// Supported Languages
const LANG_LABELS = {
  en_us: "English (US)", en_uk: "English (UK)", de: "Deutsch", fr: "Français",
  es: "Español", it: "Italiano", nl: "Nederlands", pt: "Português",
  fi: "Suomi", sv: "Svenska", no: "Norsk", da: "Dansk", pl: "Polski",
  ru: "Русский", uk: "Українська", cs: "Čeština", sk: "Slovenčina",
  sl: "Slovenski", hu: "Magyar", ro: "Română", tr: "Türkçe",
  ar: "العربية", ja: "日本語", ko: "한국어", th: "ไทย", zh: "中文",
  af: "Afrikaans"
};
const SUPPORTED_LABEL_LANGS = Object.keys(LANG_LABELS);

// UI Translation State
let currentUiLang = "en";
let translations = {};

/* ==========================================================================
   2. GLOBAL STATE
   ========================================================================== */

// Audio & Worker State
let isListening = false;
let workerReady = false;
let birdnetWorker = null;
let audioContext;
let workletNode;
let gainNode;
let highPassFilterNode;
let circularBuffer;
let circularWriteIndex = 0;
let currentStream;

// Inference State
let lastInferenceStart = 0;
let lastInferenceMs = null;
let recentInferenceSets = []; // Buffer for temporal pooling
let latestDetections = [];
const JOURNAL_KEY = "bn_field_journal_v1";
const JOURNAL_LIMIT = 500;
const recentBirdHits = new Map();
let clipsDbPromise;
const activeClipUrls = [];

// Spectrogram State
let spectroCanvas, spectroCtx;
let spectroAxisCanvas, spectroAxisCtx; // Overlay for axis
let spectroAnimationId = null;
let analyser;
let dataArray; // Float32 array for dB values
let bufferLength;
let spectroColumnSeconds = 0;
let lastSpectroColumnTime = 0;

// Geolocation State
let geolocation = null;
let geoWatchId = null;

// Caching
let lastSpeciesList = null; // Cache for explore page filtering

/* ==========================================================================
   3. UTILITIES & STORAGE
   ========================================================================== */

const store = {
  get: (k, def) => localStorage.getItem(k) ?? def,
  getFloat: (k, def) => { const v = localStorage.getItem(k); return v === null ? def : parseFloat(v); },
  getBool: (k, def) => { const v = localStorage.getItem(k); return v === null ? def : v === "true"; },
  set: (k, v) => localStorage.setItem(k, v)
};

function loadJournal() {
  try {
    const entries = JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]");
    return Array.isArray(entries) ? entries.filter(entry => entry && typeof entry.commonName === "string" && typeof entry.firstHeardAt === "string").slice(0, JOURNAL_LIMIT) : [];
  } catch (_) {
    return [];
  }
}

function openClipsDb() {
  if (clipsDbPromise) return clipsDbPromise;
  clipsDbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error("Audio storage unavailable")); return; }
    const request = indexedDB.open("bn_field_clips_v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("clips", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(error => { clipsDbPromise = undefined; throw error; });
  return clipsDbPromise;
}

async function putClip(id, blob) {
  const db = await openClipsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("clips", "readwrite");
    tx.objectStore("clips").put({ id, blob });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getClip(id) {
  const db = await openClipsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("clips", "readonly");
    const request = tx.objectStore("clips").get(id);
    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => reject(request.error);
  });
}

async function clearClips() {
  const db = await openClipsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("clips", "readwrite");
    tx.objectStore("clips").clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function wavBlob(samples) {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const write = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  write(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}

async function captureAudioForEntry(entry) {
  const windowed = getRecentAudio(CLIP_SECONDS);
  if (!windowed) return;
  entry.audioPending = true;
  try {
    await putClip(entry.id, wavBlob(windowed));
    entry.audioAvailable = true;
    entry.audioPending = false;
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journalEntries));
    const notice = document.getElementById("journalNotice");
    if (notice) notice.textContent = `Saved ${entry.commonName} with a sound clip on this phone.`;
    renderJournal();
  } catch (_) {
    const notice = document.getElementById("journalNotice");
    if (notice) notice.textContent = `Saved ${entry.commonName}, but this browser could not keep the sound clip. Check device storage.`;
  } finally {
    entry.audioPending = false;
  }
}

function journalTime(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Unknown time" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function renderJournal() {
  const list = document.getElementById("journalList");
  if (!list) return;
  for (const url of activeClipUrls.splice(0)) URL.revokeObjectURL(url);
  document.getElementById("journalCount").textContent = String(journalEntries.length);
  document.getElementById("exportJournal").disabled = journalEntries.length === 0;
  document.getElementById("clearJournal").disabled = journalEntries.length === 0;
  list.replaceChildren();
  if (!journalEntries.length) {
    const empty = document.createElement("p");
    empty.className = "field-journal-empty";
    empty.textContent = "Nothing saved yet. Start listening outside; each new bird identification will appear here with its time.";
    list.appendChild(empty);
    return;
  }
  for (const entry of journalEntries.slice(0, 30)) {
    const row = document.createElement("div");
    row.className = "field-journal-row";
    const names = document.createElement("div");
    const bird = document.createElement("strong");
    bird.textContent = entry.commonName;
    const scientific = document.createElement("small");
    scientific.textContent = entry.scientificName || "BirdNET suggestion";
    names.append(bird, scientific);
    const details = document.createElement("div");
    details.className = "field-journal-detail";
    const savedAt = document.createElement("div");
    savedAt.textContent = `${journalTime(entry.firstHeardAt)} · ${entry.method === "manual" ? "saved by you" : "saved automatically"}`;
    const evidence = document.createElement("div");
    evidence.className = "field-journal-evidence";
    const checks = Math.max(1, Number(entry.checkCount) || 1);
    const ticks = document.createElement("span");
    ticks.className = "field-check-ticks";
    ticks.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 5; i++) {
      const tick = document.createElement("span");
      tick.className = `field-check-tick${i < checks ? " is-filled" : ""}${i === Math.min(checks, 5) - 1 ? " is-newest" : ""}`;
      ticks.appendChild(tick);
    }
    const checkLabel = document.createElement("span");
    checkLabel.textContent = `${checks} ${checks === 1 ? "check" : "checks"} · peak BirdNET score ${Math.round(entry.peakConfidence * 100)}%`;
    evidence.append(ticks, checkLabel);
    details.append(savedAt, evidence);
    if (entry.audioAvailable) {
      const load = document.createElement("button");
      load.type = "button";
      load.className = "field-clip-button";
      load.textContent = "Play sound clip";
      load.addEventListener("click", async () => {
        load.disabled = true;
        try {
          const clip = await getClip(entry.id);
          if (!clip) throw new Error("Missing clip");
          const url = URL.createObjectURL(clip);
          activeClipUrls.push(url);
          const controls = document.createElement("div");
          controls.className = "field-clip-controls";
          const audio = document.createElement("audio");
          audio.controls = true;
          audio.src = url;
          const download = document.createElement("a");
          download.href = url;
          download.download = `birdnet-${entry.firstHeardAt.slice(0, 19).replaceAll(":", "-")}.wav`;
          download.textContent = "Download clip";
          controls.append(audio, download);
          row.appendChild(controls);
          load.remove();
        } catch (_) {
          load.textContent = "Clip unavailable";
        }
      });
      details.appendChild(load);
    }
    row.append(names, details);
    list.appendChild(row);
  }
  if (journalEntries.length > 30) {
    const more = document.createElement("p");
    more.className = "field-journal-empty";
    more.textContent = `${journalEntries.length - 30} older entries are in the exported list.`;
    list.appendChild(more);
  }
}

function saveBirdSuggestion(bird, method = "manual", countCheck = false) {
  if (!bird || !Number.isFinite(bird.confidence)) return;
  const now = Date.now();
  const scientificName = String(bird.scientificName || "");
  const commonName = String(bird.commonNameI18n || bird.commonName || scientificName || "Unknown bird");
  const speciesKey = scientificName || String(bird.index);
  const previous = journalEntries.find(entry => entry.speciesKey === speciesKey && now - Date.parse(entry.lastHeardAt) < 90_000);
  let entry;
  if (previous) {
    previous.lastHeardAt = new Date(now).toISOString();
    previous.peakConfidence = Math.max(previous.peakConfidence, bird.confidence);
    if (countCheck) previous.checkCount = Math.min(999, (Number(previous.checkCount) || 1) + 1);
    if (method === "manual") previous.method = "manual";
    entry = previous;
  } else {
    entry = { id: crypto.randomUUID ? crypto.randomUUID() : `${now}-${Math.random()}`, speciesKey, commonName, scientificName, firstHeardAt: new Date(now).toISOString(), lastHeardAt: new Date(now).toISOString(), peakConfidence: bird.confidence, checkCount: 1, method, audioAvailable: false };
    journalEntries.unshift(entry);
    journalEntries = journalEntries.slice(0, JOURNAL_LIMIT);
  }
  const notice = document.getElementById("journalNotice");
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journalEntries));
    if (notice && (!previous || method === "manual")) notice.textContent = `Saved ${commonName} on this phone.`;
  } catch (_) {
    if (notice) notice.textContent = "This browser could not save the journal. Try exporting your list or freeing device storage.";
  }
  renderJournal();
  if (saveAudio && !entry.audioAvailable && !entry.audioPending) void captureAudioForEntry(entry);
}

function visibleBirds(birds) {
  if (!Array.isArray(birds)) return [];
  const inArea = geoEnabled && geolocation
    ? birds.filter(bird => typeof bird.geoscore === "number" && bird.geoscore >= 0.05)
    : birds;
  return inArea
    .filter(bird => Number.isFinite(bird.confidence) && bird.confidence >= detectionThreshold)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20);
}

function considerAutoSave(birds) {
  if (!isListening || !autoSave || !Array.isArray(birds)) return;
  const now = Date.now();
  for (const bird of visibleBirds(birds)) {
    const key = bird.scientificName || String(bird.index);
    const evidence = recentBirdHits.get(key);
    const newOccurrence = !evidence || now - evidence.lastAt > 90_000;
    const countCheck = newOccurrence || now - evidence.lastCountedAt >= 3_000;
    const higherPeak = bird.confidence > (evidence?.peakConfidence || 0) + 0.01;
    if (countCheck || higherPeak) saveBirdSuggestion(bird, "auto", countCheck);
    recentBirdHits.set(key, {
      lastAt: now,
      lastCountedAt: countCheck ? now : evidence.lastCountedAt,
      peakConfidence: Math.max(evidence?.peakConfidence || 0, bird.confidence)
    });
  }
  for (const [key, evidence] of recentBirdHits) {
    if (now - evidence.lastAt > 120_000) recentBirdHits.delete(key);
  }
}

function exportJournal() {
  const cell = value => {
    const safe = String(value ?? "").replace(/^[=+@-]/, match => `'${match}`);
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = [["First heard", "Last heard", "Bird", "Scientific name", "Listening checks", "Peak BirdNET score", "Saved how"], ...journalEntries.map(entry => [entry.firstHeardAt, entry.lastHeardAt, entry.commonName, entry.scientificName, Math.max(1, Number(entry.checkCount) || 1), Math.round(entry.peakConfidence * 100) + "%", entry.method])];
  const file = new Blob([rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `birdnet-field-journal-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function setupFieldJournal() {
  renderJournal();
  const auto = document.getElementById("autoSaveToggle");
  const audio = document.getElementById("saveAudioToggle");
  auto.checked = autoSave;
  auto.addEventListener("change", () => { autoSave = auto.checked; store.set("bn_field_auto_save", autoSave); });
  document.getElementById("quietYardPreset").addEventListener("click", () => {
    for (const [id, value] of [
      ["thresholdRange", 10],
      ["sensitivityRange", 1],
      ["inputGainRange", 1],
      ["rumbleFilterRange", 200],
      ["inferenceIntervalRange", 500]
    ]) {
      const input = document.getElementById(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    auto.checked = true;
    auto.dispatchEvent(new Event("change", { bubbles: true }));
  });
  audio.checked = saveAudio;
  audio.addEventListener("change", () => { saveAudio = audio.checked; store.set("bn_field_save_audio", saveAudio); });
  detectionsList().addEventListener("click", event => {
    const button = event.target.closest(".save-sighting");
    if (!button) return;
    const key = button.closest("[data-species]")?.dataset.species;
    const bird = latestDetections.find(item => (item.scientificName || `idx-${item.index}`) === key);
    if (bird) saveBirdSuggestion(bird);
  });
  document.getElementById("exportJournal").addEventListener("click", exportJournal);
  document.getElementById("clearJournal").addEventListener("click", async () => {
    if (!window.confirm("Clear the saved bird suggestions from this phone? Export a copy first if you want to keep them.")) return;
    journalEntries = [];
    recentBirdHits.clear();
    localStorage.removeItem(JOURNAL_KEY);
    let clipsCleared = true;
    try { await clearClips(); } catch (_) { clipsCleared = false; }
    document.getElementById("journalNotice").textContent = clipsCleared ? "Saved bird suggestions and clips cleared." : "Bird names cleared, but clips may remain. Clear this site's browser data to remove them.";
    renderJournal();
  });
}

/**
 * Maps browser locale string (e.g., "en-US") to BirdNET label code (e.g., "en_us").
 */
function mapBrowserLangToLabelLang(locale) {
  if (!locale) return "en_us";
  const l = locale.toLowerCase();
  if (SUPPORTED_LABEL_LANGS.includes(l)) return l;
  
  const base = l.split(/[-_]/)[0];
  switch (base) {
    case "en": return l.includes("gb") || l.includes("uk") ? "en_uk" : "en_us";
    case "de": return "de";
    case "fr": return "fr";
    case "es": return "es";
    case "it": return "it";
    case "nl": return "nl";
    case "pt": return "pt";
    case "fi": return "fi";
    case "sv": return "sv";
    case "no": return "no";
    case "da": return "da";
    case "pl": return "pl";
    case "ru": return "ru";
    case "uk": return "uk";
    case "cs": return "cs";
    case "sk": return "sk";
    case "sl": return "sl";
    case "hu": return "hu";
    case "ro": return "ro";
    case "tr": return "tr";
    case "ar": return "ar";
    case "ja": return "ja";
    case "ko": return "ko";
    case "th": return "th";
    case "zh": return "zh";
    case "af": return "af";
    default: return "en_us";
  }
}

/**
 * Loads UI translations for the specified language.
 */
async function loadTranslations(lang) {
  try {
    const prefix = window.PATH_PREFIX || "/";
    const response = await fetch(`${prefix}locales/${lang}.json`);
    if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
    translations = await response.json();
    currentUiLang = lang;
    store.set("bn_ui_lang", lang);
    updateUIText();
    
    // Re-render dynamic lists to apply new translations
    renderDetections(latestDetections);
    if (document.getElementById("exploreList")) renderExploreList();

    // Update selector if it exists
    const selector = document.getElementById("uiLangSelect");
    if (selector) selector.value = lang;
    
  } catch (e) {
    console.error("Translation load error:", e);
    // Fallback to English if not already English
    if (lang !== "en") loadTranslations("en");
  }
}

/**
 * Updates all elements with data-i18n attribute.
 */
function updateUIText() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[key]) {
      el.innerHTML = translations[key];
    }
  });
  
  // Update status text if not currently recording/processing
  // (Dynamic status updates will use the new translation map)
  if (!isListening && !workerReady) {
    updateStatus("status_init");
  }
}

/**
 * Helper to get a translated string.
 */
function t(key, ...args) {
  let str = translations[key];
  if (!str) return "";
  args.forEach((arg, i) => {
    str = str.replace(`{${i}}`, arg);
  });
  return str;
}

/**
 * Updates the main status text with a translated string.
 */
function updateStatus(key, ...args) {
  const el = statusEl();
  if (el) {
    el.textContent = t(key, ...args);
    // Only set data-i18n if no args, to avoid overwriting dynamic text with static template
    if (args.length === 0) {
      el.setAttribute("data-i18n", key);
    } else {
      el.removeAttribute("data-i18n");
    }
  }
}

/* ==========================================================================
   4. USER SETTINGS (LOADED FROM STORAGE)
   ========================================================================== */

// Spectrogram
let spectroMinFreq = store.getFloat("bn_spec_min_freq", SPECTRO_MIN_FREQ_DEFAULT);
let spectroMaxFreq = store.getFloat("bn_spec_max_freq", SPECTRO_MAX_FREQ_DEFAULT);
let spectroMinDb = store.getFloat("bn_spec_min_db", -120);
let spectroMaxDb = store.getFloat("bn_spec_max_db", -40);
let spectroDurationSec = store.getFloat("bn_spec_duration", SPECTRO_DEFAULT_DURATION_SEC);
let spectroGain = store.getFloat("bn_spec_gain", SPECTRO_DEFAULT_GAIN);
let spectroAxisTicks = store.getFloat("bn_spec_axis_ticks", 9); 
let colormapName = store.get("bn_colormap", "viridis");
let colormapFn = d3.interpolateViridis; // Updated in init

// Model & Detection
let currentLabelLang = store.get("bn_lang", mapBrowserLangToLabelLang(navigator.language));
let geoEnabled = store.getBool("bn_geo_enabled", false);
let detectionThreshold = store.getFloat("bn_threshold", 0.15);
if (!Number.isFinite(detectionThreshold) || detectionThreshold < 0.05 || detectionThreshold > 0.95) detectionThreshold = 0.15;
let autoSave = store.getBool("bn_field_auto_save", true);
let saveAudio = store.getBool("bn_field_save_audio", false);
let journalEntries = loadJournal();
let inputGain = store.getFloat("bn_input_gain", 1.0);
let sensitivity = store.getFloat("bn_sensitivity", 1.0); // New: Sensitivity
let inferenceInterval = store.getFloat("bn_inference_interval", 500);
let rumbleFilterFreq = store.getFloat("bn_rumble_freq", 200);
let geoThreshold = store.getFloat("bn_geo_threshold", 0.05);

/* ==========================================================================
   5. DOM ACCESSORS
   ========================================================================== */

const statusEl          = () => document.getElementById("statusText");
const recordButtonEl    = () => document.getElementById("recordButton");
const recordLabelTextEl = () => document.querySelector(".record-label-text");
const detectionsList    = () => document.getElementById("detectionsList");
const geoStatusEl       = () => document.getElementById("geoStatusText");
const geoCoordsEl       = () => document.getElementById("geoCoordsText");
const settingsToggleEl  = () => document.getElementById("settingsToggle");
const settingsDrawerEl  = () => document.getElementById("settingsDrawer");
const settingsOverlayEl = () => document.getElementById("settingsOverlay");

/* ==========================================================================
   6. INITIALIZATION (BOOT)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  updateColormap(colormapName);

  // Initialize Language
  const savedLang = store.get("bn_ui_lang");
  const browserLang = navigator.language.split("-")[0];
  const initialLang = savedLang || (["de", "en"].includes(browserLang) ? browserLang : "en");
  loadTranslations(initialLang);
  
  const isLive = !!document.getElementById("recordButton");
  const isExplore = !!document.getElementById("exploreList");

  // Only run if we are on Live or Explore pages
  if (!isLive && !isExplore) return;

  initWorker(); 
  setupSettingsToggle();
  initUIControls();

  if (isLive) {
    setupRecordButton();
    initSpectrogramCanvas(); // Initialize canvas size immediately to prevent layout shift
    setupFieldJournal();
  }

  // Handle Geolocation Initialization
  if (geoEnabled) {
    getGeolocation();
  } else {
    updateGeoDisplay("status_geo_disabled", null);
    if (isExplore) {
      // Show hint instead of full list if geo is off
      const container = document.getElementById("exploreList");
      if (container) {
        container.innerHTML = `
          <div class="col-12 text-center py-5 text-muted">
            <i class="bi bi-geo-alt-slash fs-1 d-block mb-3 opacity-25"></i>
            <p data-i18n="msg_explore_geo_disabled">${t("msg_explore_geo_disabled")}</p>
          </div>
        `;
      }
    }
  }
});

/* ==========================================================================
   7. WORKER & MODEL LOGIC
   ========================================================================== */

function initWorker(langOverride) {
  if (birdnetWorker) {
    try { birdnetWorker.terminate(); } catch (_) {}
    birdnetWorker = null;
    workerReady = false;
    
    // Disable record button while reloading
    const btn = recordButtonEl();
    if (btn) btn.disabled = true;
  }
  
  const prefix = (window.PATH_PREFIX || "/");
  const tfPath = prefix + "js/tfjs-4.14.0.min.js";
  const root   = prefix + "models";
  const lang   = langOverride || currentLabelLang || (navigator.language || "en-US");
  const params = new URLSearchParams({ tf: tfPath, root, lang });
  
  const status = statusEl();
  if (status) updateStatus("status_loading_percent", 0);
  
  birdnetWorker = new Worker(prefix + "js/birdnet-worker.js?" + params.toString());

  birdnetWorker.onmessage = (event) => {
    const data = event.data || {};
    switch (data.message) {
      case "load_model":
      case "warmup":
      case "load_geomodel":
      case "load_labels":
        if (typeof data.progress === "number") {
          updateStatus("status_loading_percent", data.progress);
        }
        break;
        
      case "labels_loaded":
        updateStatus("status_ready");
        requestSpeciesList();
        break;

      case "loaded":
        workerReady = true;
        updateStatus("status_ready");
        
        // Enable record button
        const btn = recordButtonEl();
        if (btn) btn.disabled = false;

        if (geolocation) sendAreaScores();
        // If on explore page, request list immediately after load
        if (document.getElementById("exploreList")) requestSpeciesList();
        break;

      case "pooled":
        // Handle inference results
        if (Array.isArray(data.pooled)) {
          recentInferenceSets.push(data.pooled);
          if (recentInferenceSets.length > TEMPORAL_POOL_WINDOW) {
            recentInferenceSets.shift();
          }
        }
        const toRender = USE_TEMPORAL_POOL
          ? computeTemporalPooledDetections(recentInferenceSets)
          : data.pooled;
        renderDetections(toRender);
        considerAutoSave(toRender);
        
        if (isListening && lastInferenceStart) {
          lastInferenceMs = Math.round(performance.now() - lastInferenceStart);
          updateStatus("status_listening_inference", lastInferenceMs);
        }
        break;

      case "area-scores":
        // Geo priors updated, refresh explore list if visible
        if (document.getElementById("exploreList")) requestSpeciesList();
        break;

      case "species_list":
        renderExploreList(data.list);
        break;
    }
  };

  birdnetWorker.onerror = (err) => {
    console.error("Worker error", err);
    updateStatus("status_worker_error");
  };
}

function requestSpeciesList() {
  if (birdnetWorker) {
    birdnetWorker.postMessage({ message: "get_species_list" });
  }
}

/* ==========================================================================
   8. AUDIO ENGINE & INFERENCE LOOP
   ========================================================================== */

function setupRecordButton() {
  const btn = recordButtonEl();
  if (!btn) return;
  
  // Initially disable until model loads
  btn.disabled = true;
  
  btn.addEventListener("click", async () => {
    if (!isListening) {
      await startListening();
    } else {
      stopListening();
    }
  });
}

async function startListening() {
  if (!workerReady) {
    updateStatus("status_loading");
    return;
  }
  try {
    isListening = true;
    
    // UI Updates
    const button = recordButtonEl();
    if (button) button.classList.add("recording");
    const label = recordLabelTextEl();
    if (label) {
      label.textContent = t("btn_stop");
      label.setAttribute("data-i18n", "btn_stop");
    }
    const spinner = document.getElementById("listeningIndicator");
    if (spinner) spinner.classList.remove("d-none");
    
    updateStatus("status_requesting_mic");
    await requestWakeLock();

    currentStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: SAMPLE_RATE,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    await setupAudioGraphFromStream(currentStream);
    updateStatus("status_listening");
  } catch (e) {
    console.error(e);
    updateStatus("status_mic_failed");
    stopListening(); // Cleanup UI state
  }
}

function stopListening() {
  isListening = false;
  recentBirdHits.clear();
  recentInferenceSets = [];
  releaseWakeLock();
  
  // UI Updates
  const button = recordButtonEl();
  if (button) button.classList.remove("recording");
  const label = recordLabelTextEl();
  if (label) {
    label.textContent = t("btn_start");
    label.setAttribute("data-i18n", "btn_start");
  }
  const spinner = document.getElementById("listeningIndicator");
  if (spinner) spinner.classList.add("d-none");

  updateStatus("status_stopped");

  // Reset State
  lastInferenceStart = 0;
  lastInferenceMs = null;

  // Cleanup Audio
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
  }
  if (workletNode) {
    workletNode.port.onmessage = null;
    workletNode.disconnect();
    workletNode = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
  if (highPassFilterNode) {
    highPassFilterNode.disconnect();
    highPassFilterNode = null;
  }
  if (audioContext) {
    stopSpectrogram();
    audioContext.close();
    audioContext = null;
  }
}

async function setupAudioGraphFromStream(stream) {
  audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });

  // Resume if suspended (browser requirements)
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  const source = audioContext.createMediaStreamSource(stream);
  
  // Create Gain Node (Hardware-like gain)
  gainNode = audioContext.createGain();
  gainNode.gain.value = inputGain;
  
  // Create High-Pass Filter (Rumble Filter)
  highPassFilterNode = audioContext.createBiquadFilter();
  highPassFilterNode.type = "highpass";
  highPassFilterNode.frequency.value = rumbleFilterFreq;
  highPassFilterNode.Q.value = 0.707; // Butterworth

  // Connect Mic -> Gain -> HighPass
  source.connect(gainNode);
  gainNode.connect(highPassFilterNode);

  // Start visualizer (Connect HighPass -> Spectrogram)
  startSpectrogram(highPassFilterNode);

  // Setup circular buffer for inference
  circularBuffer = new Float32Array(SAMPLE_RATE * AUDIO_BUFFER_SECONDS);
  circularWriteIndex = 0;

  if (!audioContext.audioWorklet) {
    updateStatus("status_browser_old");
    return;
  }

  // Use AudioWorklet for raw audio access (Replaces ScriptProcessor)
  try {
    const prefix = (window.PATH_PREFIX || "/");
    await audioContext.audioWorklet.addModule(prefix + "js/audio-processor.js");

    workletNode = new AudioWorkletNode(audioContext, "audio-processor");

    // Handle audio data from the worklet
    workletNode.port.onmessage = (event) => {
      const input = event.data;
      for (let i = 0; i < input.length; i++) {
        circularBuffer[circularWriteIndex] = input[i];
        circularWriteIndex = (circularWriteIndex + 1) % circularBuffer.length;
      }
    };

    // Connect Gain -> Worklet -> Destination
    // gainNode.connect(workletNode); // OLD
    highPassFilterNode.connect(workletNode);
    workletNode.connect(audioContext.destination);

  } catch (err) {
    console.error("Failed to load AudioWorklet", err);
    updateStatus("status_audio_failed");
    return;
  }

  startInferenceLoop();
}

function startInferenceLoop() {
  const tick = () => {
    if (!isListening || !workerReady || !circularBuffer || !birdnetWorker) return;
    
    const windowed = getCurrentWindow();
    if (windowed) {
      const geoCtx = geolocation ? {
        latitude: geolocation.lat,
        longitude: geolocation.lon
      } : {};
      
      lastInferenceStart = performance.now();
      birdnetWorker.postMessage(
        { 
          message: "predict", 
          pcmAudio: windowed, 
          overlapSec: 1.5, 
          sensitivity: sensitivity, // Pass sensitivity to worker
          ...geoCtx 
        },
        [windowed.buffer]
      );
    }
    
    if (isListening) setTimeout(tick, inferenceInterval);
  };
  tick();
}

/**
 * Extracts the most recent 3 seconds of audio from the circular buffer.
 */
function getCurrentWindow() {
  return getRecentAudio(WINDOW_SECONDS);
}

function getRecentAudio(seconds) {
  if (!circularBuffer) return null;
  const sampleCount = Math.min(circularBuffer.length, Math.round(SAMPLE_RATE * seconds));
  const result = new Float32Array(sampleCount);
  let idx = (circularWriteIndex - sampleCount + circularBuffer.length) % circularBuffer.length;
  for (let i = 0; i < sampleCount; i++) {
    // Gain is already applied by GainNode, just clamp to prevent clipping artifacts in model
    result[i] = Math.max(-1, Math.min(1, circularBuffer[idx]));
    idx = (idx + 1) % circularBuffer.length;
  }
  return result;
}

/* ==========================================================================
   9. SPECTROGRAM VISUALIZATION
   ========================================================================== */

function initSpectrogramCanvas() {
  if (spectroCanvas) return;
  spectroCanvas = document.getElementById("liveSpectrogram");
  if (!spectroCanvas) return;

  // Create Axis Overlay if it doesn't exist
  if (!spectroAxisCanvas) {
    const parent = spectroCanvas.parentElement;
    if (parent) {
      parent.style.position = "relative"; // Ensure positioning context
      spectroAxisCanvas = document.createElement("canvas");
      spectroAxisCanvas.className = "spectro-axis-overlay";
      spectroAxisCanvas.style.position = "absolute";
      spectroAxisCanvas.style.top = "0";
      spectroAxisCanvas.style.left = "0";
      spectroAxisCanvas.style.pointerEvents = "none"; // Let clicks pass through
      spectroAxisCanvas.style.zIndex = "10"; // Above spectrogram
      parent.appendChild(spectroAxisCanvas);
      spectroAxisCtx = spectroAxisCanvas.getContext("2d");
    }
  }
  
  resizeSpectrogramCanvas();
  window.addEventListener("resize", resizeSpectrogramCanvas);
}

function resizeSpectrogramCanvas() {
  if (!spectroCanvas) return;
  const cssW = spectroCanvas.clientWidth || 600;
  const cssH = spectroCanvas.clientHeight || 220;

  // Preserve existing content if possible
  let snapshot = null;
  if (spectroCtx) {
    try {
      snapshot = spectroCtx.getImageData(0, 0, spectroCanvas.width, spectroCanvas.height);
    } catch (_) {}
  }

  spectroCanvas.width = cssW;
  spectroCanvas.height = cssH;

  // Optimize for frequent readback (resizing)
  spectroCtx = spectroCanvas.getContext("2d", { willReadFrequently: true });
  spectroCtx.fillStyle = "#000";
  spectroCtx.fillRect(0, 0, cssW, cssH);

  if (snapshot) spectroCtx.putImageData(snapshot, 0, 0);

  // Resize Axis Overlay (High DPI support)
  if (spectroAxisCanvas) {
    const dpr = window.devicePixelRatio || 1;
    // Set physical size based on DPR
    spectroAxisCanvas.width = Math.floor(cssW * dpr);
    spectroAxisCanvas.height = Math.floor(cssH * dpr);
    
    // Set CSS size to match layout
    spectroAxisCanvas.style.width = `${cssW}px`;
    spectroAxisCanvas.style.height = `${cssH}px`;
    
    // Scale context so drawing operations use CSS pixels
    spectroAxisCtx.scale(dpr, dpr);
    
    drawSpectrogramAxis();
  }

  spectroColumnSeconds = cssW > 0 ? spectroDurationSec / cssW : 0.05;
  lastSpectroColumnTime = audioContext ? audioContext.currentTime : 0;
}

function drawSpectrogramAxis() {
  if (!spectroAxisCtx || !spectroAxisCanvas) return;
  const ctx = spectroAxisCtx;
  // Use logical CSS dimensions for drawing
  const w = spectroAxisCanvas.clientWidth;
  const h = spectroAxisCanvas.clientHeight;

  ctx.clearRect(0, 0, w, h);
  
  // Background strip for legibility
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, 40, h);

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = "10px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const numSteps = spectroAxisTicks;
  const range = spectroMaxFreq - spectroMinFreq;

  for (let i = 0; i <= numSteps; i++) {
    const ratio = i / numSteps;
    const freq = spectroMinFreq + (range * ratio);
    // Canvas Y is inverted (0 is top/high freq)
    let y = h - (ratio * h);
    
    // Aesthetic tweak: inset edge ticks so they aren't on the absolute pixel edge
    if (i === 0) y -= 5;          // Move bottom tick up
    if (i === numSteps) y += 5;   // Move top tick down
    
    // Adjust text position to avoid clipping at edges
    let textY = y;
    if (i === 0) textY -= 5;
    if (i === numSteps) textY += 5;

    ctx.fillText(`${(freq/1000).toFixed(1)}k`, 32, textY);
    
    // Tick mark
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(34, y, 6, 1);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  }
}

function startSpectrogram(source) {
  initSpectrogramCanvas();
  if (!spectroCanvas) return;

  analyser = audioContext.createAnalyser();
  analyser.fftSize = SPECTRO_FFT_SIZE;
  analyser.smoothingTimeConstant = SPECTRO_SMOOTHING;
  source.connect(analyser);

  bufferLength = analyser.frequencyBinCount;
  dataArray = new Float32Array(bufferLength); // Use Float32 for dB

  lastSpectroColumnTime = audioContext.currentTime;
  if (!spectroColumnSeconds) {
    const w = spectroCanvas.width || 600;
    spectroColumnSeconds = spectroDurationSec / w;
  }
  if (!spectroAnimationId) {
    spectroAnimationId = requestAnimationFrame(drawSpectrogram);
  }
}

function stopSpectrogram() {
  if (spectroAnimationId) {
    cancelAnimationFrame(spectroAnimationId);
    spectroAnimationId = null;
  }
  if (analyser) {
    try { analyser.disconnect(); } catch (_) {}
    analyser = null;
  }
}

function updateColormap(name) {
  switch (name) {
    case "inferno": colormapFn = d3.interpolateInferno; break;
    case "plasma": colormapFn = d3.interpolatePlasma; break;
    case "viridis": colormapFn = d3.interpolateViridis; break;
    case "turbo": colormapFn = d3.interpolateTurbo; break;
    case "cubehelix": colormapFn = d3.interpolateCubehelixDefault; break;
    default: colormapFn = d3.interpolateMagma; break;
  }
}

function drawSpectrogram() {
  spectroAnimationId = requestAnimationFrame(drawSpectrogram);
  if (!analyser || !audioContext) return;

  analyser.getFloatFrequencyData(dataArray);

  const w = spectroCanvas.width;
  const h = spectroCanvas.height;
  if (!w || !h) return;

  // Calculate scrolling
  if (!spectroColumnSeconds) {
    spectroColumnSeconds = spectroDurationSec / Math.max(1, w);
  }
  const audioNow = audioContext.currentTime;
  let columnsNeeded = Math.floor((audioNow - lastSpectroColumnTime) / spectroColumnSeconds);
  if (columnsNeeded <= 0) return;
  columnsNeeded = Math.min(columnsNeeded, w - 1);
  lastSpectroColumnTime += columnsNeeded * spectroColumnSeconds;

  // Shift canvas left
  spectroCtx.drawImage(
    spectroCanvas,
    columnsNeeded, 0, w - columnsNeeded, h,
    0, 0, w - columnsNeeded, h
  );

  // Frequency bin mapping
  const nyquist = SAMPLE_RATE / 2;
  const startBin = Math.max(0, Math.floor((spectroMinFreq / nyquist) * bufferLength));
  const endBin = Math.min(bufferLength - 1, Math.floor((spectroMaxFreq / nyquist) * bufferLength));
  const binCount = endBin - startBin + 1;

  // Draw new columns
  for (let c = 0; c < columnsNeeded; c++) {
    const x = w - columnsNeeded + c;
    
    // Clear column
    spectroCtx.fillStyle = "#000";
    spectroCtx.fillRect(x, 0, 1, h);

    // Draw frequency bins
    for (let i = startBin; i <= endBin; i++) {
      const db = dataArray[i];
      
      // Normalize dB to 0..1 range
      let norm = (db - spectroMinDb) / (spectroMaxDb - spectroMinDb);
      norm = Math.max(0, Math.min(1, norm));
      
      // Optional: slight gamma for contrast
      norm = Math.pow(norm, 0.8);

      // Map to Y pixels (flip Y so low freq is at bottom)
      // Calculate exact pixel boundaries for this bin to prevent gaps
      const relIndex = i - startBin;
      
      // yBottom is the lower edge of the bin (lower frequency, higher Y pixel value)
      const yBottom = h * (1 - relIndex / binCount);
      // yTop is the upper edge of the bin (higher frequency, lower Y pixel value)
      const yTop = h * (1 - (relIndex + 1) / binCount);
      
      // Snap to integer pixels to avoid sub-pixel rendering gaps
      const yDraw = Math.floor(yTop);
      const hDraw = Math.ceil(yBottom) - yDraw;

      spectroCtx.fillStyle = colormapFn(norm);
      spectroCtx.fillRect(x, yDraw, 1, hDraw);
    }
  }
}

/* ==========================================================================
   10. UI & RENDERING
   ========================================================================== */

function initUIControls() {
  // Geolocation Toggle
  const geoToggle = document.getElementById("geoToggle");
  if (geoToggle) {
    geoToggle.checked = geoEnabled;
    geoToggle.addEventListener("change", () => {
      geoEnabled = geoToggle.checked;
      store.set("bn_geo_enabled", geoEnabled);

      if (geoEnabled) {
        updateGeoDisplay("status_geo_requesting", null);
        getGeolocation();
      } else {
        geolocation = null;
        if (geoWatchId !== null) {
          navigator.geolocation.clearWatch(geoWatchId);
          geoWatchId = null;
        }
        updateGeoDisplay("status_geo_disabled", null);
        
        // Handle Explore page state change
        if (document.getElementById("exploreList")) {
           const container = document.getElementById("exploreList");
           container.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
              <i class="bi bi-geo-alt-slash fs-1 d-block mb-3 opacity-25"></i>
              <p data-i18n="msg_explore_geo_disabled">${t("msg_explore_geo_disabled")}</p>
            </div>
          `;
        } else {
          renderDetections();
        }
      }
    });
  }

  // Settings Sliders
  bindRange("geoThresholdRange", geoThreshold * 100, (v) => {
    geoThreshold = v / 100;
    store.set("bn_geo_threshold", geoThreshold);
    if (document.getElementById("exploreList")) {
      renderExploreList(null); // Re-render cached list
    }
  }, (v) => `${Math.round(v)}%`);

  bindRange("durationRange", spectroDurationSec, (v) => {
    spectroDurationSec = v;
    if (spectroCanvas && spectroCanvas.width > 0) {
      spectroColumnSeconds = spectroDurationSec / spectroCanvas.width;
    }
  }, (v) => `${v}s`, "bn_spec_duration");

  bindRange("gainRange", spectroGain, (v) => {
    spectroGain = v;
  }, (v) => `${v.toFixed(1)}×`, "bn_spec_gain");

  bindRange("thresholdRange", detectionThreshold * 100, (v) => {
    detectionThreshold = v / 100;
    store.set("bn_threshold", detectionThreshold);
    renderDetections();
  }, (v) => `${Math.round(v)}%`);

  bindRange("inputGainRange", inputGain, (v) => {
    inputGain = v;
    // Apply gain immediately if listening
    if (gainNode) gainNode.gain.value = v;
  }, (v) => `${v.toFixed(1)}×`, "bn_input_gain");

  bindRange("rumbleFilterRange", rumbleFilterFreq, (v) => {
    rumbleFilterFreq = v;
    if (highPassFilterNode) highPassFilterNode.frequency.value = v;
  }, (v) => `${Math.round(v)} Hz`, "bn_rumble_freq");

  bindRange("sensitivityRange", sensitivity, (v) => {
    sensitivity = v;
  }, (v) => v.toFixed(1), "bn_sensitivity");

  bindRange("inferenceIntervalRange", inferenceInterval, (v) => {
    inferenceInterval = v;
  }, (v) => `${Math.round(v)} ms`, "bn_inference_interval");

  bindRange("minFreqRange", spectroMinFreq, (v) => {
    spectroMinFreq = Math.min(v, spectroMaxFreq - 100);
    drawSpectrogramAxis();
  }, (v) => `${Math.round(v)} Hz`, "bn_spec_min_freq");

  bindRange("maxFreqRange", spectroMaxFreq, (v) => {
    spectroMaxFreq = Math.max(v, spectroMinFreq + 100);
    drawSpectrogramAxis();
  }, (v) => `${Math.round(v)} Hz`, "bn_spec_max_freq");

  bindRange("axisTicksRange", spectroAxisTicks, (v) => {
    spectroAxisTicks = v;
    drawSpectrogramAxis();
  }, (v) => `${v}`, "bn_spec_axis_ticks");

  bindRange("minDbRange", spectroMinDb, (v) => {
    spectroMinDb = Math.min(v, spectroMaxDb - 10);
  }, (v) => `${v} dB`, "bn_spec_min_db");

  bindRange("maxDbRange", spectroMaxDb, (v) => {
    spectroMaxDb = Math.max(v, spectroMinDb + 10);
  }, (v) => `${v} dB`, "bn_spec_max_db");

  // Dropdowns
  const colormapSelect = document.getElementById("colormapSelect");
  if (colormapSelect) {
    colormapSelect.value = colormapName;
    colormapSelect.addEventListener("change", () => {
      colormapName = colormapSelect.value;
      store.set("bn_colormap", colormapName);
      updateColormap(colormapName);
    });
  }

  const uiLangSelect = document.getElementById("uiLangSelect");
  if (uiLangSelect) {
    uiLangSelect.value = currentUiLang;
    uiLangSelect.addEventListener("change", () => {
      loadTranslations(uiLangSelect.value);
    });
  }

  const langSelect = document.getElementById("labelLangSelect");
  if (langSelect) {
    langSelect.innerHTML = SUPPORTED_LABEL_LANGS
      .map(code => {
        const label = LANG_LABELS[code] || code;
        const sel = code === currentLabelLang ? " selected" : "";
        return `<option value="${code}"${sel}>${label}</option>`;
      })
      .join("");
    langSelect.addEventListener("change", () => {
      currentLabelLang = langSelect.value;
      store.set("bn_lang", currentLabelLang);
      latestDetections = [];
      renderDetections([]);
      
      if (birdnetWorker && workerReady) {
        updateStatus("status_reloading_model");
        birdnetWorker.postMessage({ message: 'load_labels', lang: currentLabelLang });
      } else {
        initWorker(currentLabelLang);
      }
    });
  }
}

function bindRange(id, initialValue, onChange, format, storageKey) {
  const input = document.getElementById(id);
  const label = document.querySelector(`[id='${id.replace("Range", "Value")}']`);
  if (!input) return;
  if (typeof initialValue === "number") {
    input.value = initialValue;
  }
  const setLabel = (val) => {
    if (label) label.textContent = format ? format(val) : val;
  };
  setLabel(parseFloat(input.value));
  input.addEventListener("input", () => {
    const val = parseFloat(input.value);
    onChange(val, input);
    setLabel(val);
    if (storageKey) store.set(storageKey, val);
  });
}

function setupSettingsToggle() {
  const toggle = settingsToggleEl();
  const drawer = settingsDrawerEl();
  const overlay = settingsOverlayEl();
  const closeBtn = document.getElementById("settingsClose");
  const closeBtnBottom = document.getElementById("settingsCloseBottom");

  if (!toggle || !drawer) return;

  const setState = (open) => {
    // Manage focus to avoid "aria-hidden" violation
    if (!open) {
      // If closing and focus is inside, move it back to toggle
      if (drawer.contains(document.activeElement)) {
        toggle.focus();
      }
    }

    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    drawer.classList.toggle("open", open);
    document.body.classList.toggle("drawer-open", open);
    if (overlay) {
      overlay.classList.toggle("active", open);
      overlay.setAttribute("aria-hidden", open ? "false" : "true");
    }

    if (open) {
      // If opening, move focus to close button
      if (closeBtn) closeBtn.focus();
    }
  };

  setState(false);

  toggle.addEventListener("click", () => {
    const open = !drawer.classList.contains("open");
    setState(open);
  });

  if (overlay) overlay.addEventListener("click", () => setState(false));
  if (closeBtn) closeBtn.addEventListener("click", () => setState(false));
  if (closeBtnBottom) closeBtnBottom.addEventListener("click", () => setState(false));
  
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape") setState(false);
  });
}

/**
 * Renders the list of detected species (Live View).
 * Uses DOM diffing to prevent flickering of images.
 */
function renderDetections(pooled) {
  if (Array.isArray(pooled)) latestDetections = pooled;
  const container = detectionsList();
  if (!container) return;
  
  const useGeoFilter = geoEnabled && !!geolocation;
  const top = visibleBirds(latestDetections);

  // Empty State
  if (!top.length) {
    container.innerHTML = `
      <div class="col-12 text-center text-muted py-5">
        <i class="bi bi-soundwave fs-1 d-block mb-3 opacity-25"></i>
        <p>${t("msg_no_detections", Math.round(detectionThreshold * 100))}</p>
        ${useGeoFilter ? `<small>${t("msg_geo_active")}</small>` : ""}
      </div>
    `;
    return;
  }

  // Clear empty state message if present
  if (container.querySelector(".text-center.text-muted")) {
    container.innerHTML = "";
  }

  // Diffing Strategy: Map existing cards by species key
  const existingCards = new Map();
  Array.from(container.children).forEach(child => {
    const key = child.dataset.species;
    if (key) existingCards.set(key, child);
  });

  const newKeys = new Set();

  top.forEach((p, index) => {
    const confPct = (p.confidence * 100).toFixed(1);
    const geoInfo = useGeoFilter && typeof p.geoscore === "number"
      ? t("lbl_geo_score", (p.geoscore * 100).toFixed(1))
      : "";
    const commonName = p.commonNameI18n || p.commonName || `Class ${p.index}`;
    const scientificName = p.scientificName || "";
    const key = scientificName || `idx-${p.index}`;
    const imgUrl = `https://birdnet.cornell.edu/api2/bird/${encodeURIComponent(scientificName)}.webp`;

    newKeys.add(key);
    let cardCol = existingCards.get(key);

    if (cardCol) {
      // UPDATE existing card (text only)
      const badge = cardCol.querySelector(".badge");
      if (badge) badge.textContent = `${confPct}%`;
      
      const geoDiv = cardCol.querySelector(".geo-info");
      if (geoDiv) {
        if (geoInfo) geoDiv.innerHTML = `<i class="bi bi-geo-alt me-1"></i>${geoInfo}`;
        else geoDiv.innerHTML = "";
      }
      container.appendChild(cardCol); // Re-order
    } else {
      // CREATE new card
      cardCol = document.createElement("div");
      cardCol.className = "col-md-6 col-lg-4 fade-in";
      cardCol.dataset.species = key;
      cardCol.innerHTML = `
        <div class="card h-100 border-0 shadow-sm overflow-hidden">
          <div class="d-flex h-100">
            <div class="flex-shrink-0 position-relative" style="width: 90px; background-color: #f8f9fa;">
              <img src="${imgUrl}" 
                   alt="${commonName}"
                   loading="lazy"
                   style="width: 100%; height: 100%; object-fit: cover;"
                   onerror="this.onerror=null; this.src='img/dummy.webp';">
            </div>
            <div class="card-body py-2 px-3 flex-grow-1">
              <div class="d-flex justify-content-between align-items-start mb-1">
                <h6 class="card-title mb-0 fw-bold text-primary text-truncate me-2" style="min-width: 0; font-size: 0.95rem;" title="${commonName}">${commonName}</h6>
                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10 flex-shrink-0">
                  ${confPct}%
                </span>
              </div>
              ${scientificName ? `<div class="text-muted fst-italic small mb-2 text-truncate" style="font-size: 0.8rem;">${scientificName}</div>` : ""}
              <div class="small text-muted border-top pt-2 mt-1 geo-info">
                ${geoInfo ? `<i class="bi bi-geo-alt me-1"></i>${geoInfo}` : ""}
              </div>
              <button type="button" class="save-sighting btn btn-sm btn-outline-success mt-2">Save this bird</button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(cardCol);
    }
  });

  // Remove old cards
  existingCards.forEach((node, key) => {
    if (!newKeys.has(key)) node.remove();
  });
}

/**
 * Renders the list of local species (Explore View).
 */
function renderExploreList(list) {
  if (list) lastSpeciesList = list;
  const sourceList = list || lastSpeciesList;

  const container = document.getElementById("exploreList");
  if (!container || !sourceList) return;

  if (!geolocation || !geoEnabled) {
    container.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <i class="bi bi-geo-alt-slash fs-1 d-block mb-3 opacity-25"></i>
        <p data-i18n="msg_explore_geo_disabled">${t("msg_explore_geo_disabled")}</p>
      </div>
    `;
    return;
  }

  const sorted = sourceList
    .filter(item => item.geoscore >= geoThreshold) 
    .sort((a, b) => b.geoscore - a.geoscore);

  container.innerHTML = "";
  
  if (sorted.length === 0) {
    container.innerHTML = `<div class="col-12 text-center text-muted py-5">${t("msg_explore_no_species", Math.round(geoThreshold * 100))}<br>${t("msg_explore_lower_threshold")}</div>`;
    return;
  }

  sorted.forEach(bird => {
    const scorePct = (bird.geoscore * 100).toFixed(1);
    const common = bird.commonNameI18n || bird.commonName;
    const imgUrl = `https://birdnet.cornell.edu/api2/bird/${encodeURIComponent(bird.scientificName)}.webp`;
    
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";
    col.innerHTML = `
      <div class="card h-100 border-0 shadow-sm overflow-hidden">
        <div class="d-flex h-100">
          <div class="flex-shrink-0 position-relative" style="width: 90px; background-color: #f8f9fa;">
            <img src="${imgUrl}" 
                 alt="${common}"
                 loading="lazy"
                 style="width: 100%; height: 100%; object-fit: cover;"
                 onerror="this.onerror=null; this.src='img/dummy.webp';">
          </div>
          <div class="card-body py-2 px-3 flex-grow-1">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <div class="overflow-hidden me-2">
                <h6 class="card-title mb-0 fw-bold text-dark text-truncate" style="font-size: 0.95rem;" title="${common}">${common}</h6>
                <div class="text-muted fst-italic small mt-1 text-truncate" style="font-size: 0.8rem;">${bird.scientificName}</div>
              </div>
              <span class="badge bg-light text-dark border flex-shrink-0">
                ${scorePct}%
              </span>
            </div>
            <div class="mt-3">
              <div class="progress" style="height: 4px;">
                <div class="progress-bar bg-success" role="progressbar" style="width: ${scorePct}%" aria-valuenow="${scorePct}" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

/* ==========================================================================
   11. GEOLOCATION
   ========================================================================== */

function updateGeoDisplay(key, coords) {
  const status = geoStatusEl();
  const coordsEl = geoCoordsEl();
  if (status) {
    status.textContent = t(key);
    status.setAttribute("data-i18n", key);
  }
  if (coordsEl) {
    coordsEl.textContent = coords
      ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)} (±${Math.round(coords.accuracy)}m)`
      : "—";
  }
}

function getGeolocation() {
  if (!navigator.geolocation) {
    updateGeoDisplay("status_geo_unsupported", null);
    return;
  }
  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }
  updateGeoDisplay("status_geo_requesting", null);

  geoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      geolocation = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp
      };
      updateGeoDisplay("status_geo_acquired", geolocation);
      sendAreaScores();
      renderDetections(); // re-filter with geo prior active
    },
    (err) => {
      console.warn("Geolocation error", err);
      geolocation = null;
      updateGeoDisplay("status_geo_failed", null);
      renderDetections();
    },
    {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 20000
    }
  );
}

function sendAreaScores() {
  if (!birdnetWorker || !geolocation) return;
  const now = new Date();
  const startYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.min(
    52,
    Math.max(
      1,
      Math.floor((now - startYear) / (7 * 24 * 60 * 60 * 1000)) + 1
    )
  );
  const hour = now.getHours();
  birdnetWorker.postMessage({
    message: "area-scores",
    latitude: geolocation.lat,
    longitude: geolocation.lon,
    week,
    hour
  });
}

/* ==========================================================================
   12. SYSTEM UTILITIES
   ========================================================================== */

// Wake Lock (Keep screen on while recording)
let wakeLock = null;
let wakeLockRequested = false;

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLockRequested = true;
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
      wakeLockRequested = false;
    });
  } catch (e) {
    console.warn("Wake Lock request failed:", e);
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(()=>{});
    wakeLock = null;
    wakeLockRequested = false;
  }
}

// Lifecycle Management
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && isListening) {
    stopListening();
  }
});

window.addEventListener("pagehide", () => {
  if (isListening) {
    stopListening();
  }
});

/**
 * Temporal Pooling: Log-Mean-Exp over logits.
 * Smooths predictions over time to reduce noise.
 */
function computeTemporalPooledDetections(sets) {
  if (!sets || !sets.length) return [];
  if (sets.length === 1) return sets[0];

  const eps = 1e-8;
  const byIndex = new Map();
  
  // Group confidences by species index
  for (let s = 0; s < sets.length; s++) {
    for (const det of sets[s]) {
      const idx = det.index;
      if (!byIndex.has(idx)) {
        byIndex.set(idx, { samples: [], ref: det });
      }
      byIndex.get(idx).samples.push(det.confidence);
    }
  }

  const pooled = [];
  for (const [idx, entry] of byIndex.entries()) {
    const samples = entry.samples;
    // Convert confidences to logits
    const logits = samples.map(c => {
      const clipped = Math.min(1 - eps, Math.max(eps, c));
      return Math.log(clipped / (1 - clipped));
    });
    
    // Log-mean-exp pooling
    const maxLogit = Math.max(...logits);
    const sumExp = logits.reduce((acc, l) => acc + Math.exp(l - maxLogit), 0);
    const lme = maxLogit + Math.log(sumExp / logits.length);
    
    // Back to probability
    const pooledConf = 1 / (1 + Math.exp(-lme));

    pooled.push({
      ...entry.ref,
      confidence: pooledConf
    });
  }

  pooled.sort((a, b) => b.confidence - a.confidence);
  return pooled;
}
