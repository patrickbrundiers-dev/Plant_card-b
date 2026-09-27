/**
 * Plant Sensor Card
 * A custom Lovelace card for Home Assistant that shows plant sensor
 * readings (moisture, temperature, illuminance, conductivity, humidity,
 * battery), derives care advice from configurable min/max thresholds,
 * and tracks when the plant was last watered.
 *
 * The card comes with a visual editor: every sensor slot is a dropdown
 * (entity picker) so sensors are picked from the UI - no YAML needed.
 *
 * https://github.com/patrickbrundiers-dev/Plant_card-b
 *
 * See CARD_VERSION below - bump it and push to publish a new release
 * (a GitHub Action then creates the matching GitHub Release automatically).
 */

const CARD_VERSION = "2.1.0";

const SENSOR_DEFS = [
  { key: "moisture", unit: "%" },
  { key: "temperature", unit: "°C" },
  { key: "illuminance", unit: "lx" },
  { key: "conductivity", unit: "µS/cm" },
  { key: "humidity", unit: "%" },
  { key: "battery", unit: "%" },
];

const DEFAULT_BATTERY_MIN = 20;
const HISTORY_LOOKBACK_MS = 6 * 60 * 60 * 1000; // 6h window used to seed the debounce timer

// ---------------------------------------------------------------------------
// Icons: plain line-icon paths (24x24 viewBox), used instead of mdi icons so
// the card keeps a consistent, single-weight look independent of the
// installed Material icon set.
// ---------------------------------------------------------------------------
const ICON_PATHS = {
  moisture: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
  temperature: '<path d="M10 14.76V5a2 2 0 1 1 4 0v9.76a4 4 0 1 1-4 0Z"/>',
  illuminance:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/>',
  conductivity: '<path d="M9 3h6M10 3v5.5L4.6 18a2 2 0 0 0 1.7 3h11.4a2 2 0 0 0 1.7-3L14 8.5V3"/>',
  humidity: '<path d="M6 18.5a4 4 0 1 1 .9-7.9A5 5 0 0 1 17 9a3.5 3.5 0 0 1-.5 7H6Z"/>',
  battery: '<rect x="3" y="8" width="15" height="8" rx="2"/><path d="M18 10.5h1.5a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H18"/>',
  watering_can: '<path d="M4 13h9a4 4 0 0 1 0 8H8"/><path d="M2 13c0-3 2-8 6-8s5 3 5 5"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  alert: '<path d="M12 9v4M12 17h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  leaf: '<path d="M12 21c-3.5-2-6-5.2-6-9a6 6 0 0 1 12 0c0 3.8-2.5 7-6 9Z"/><path d="M12 21V9"/>',
};

function svgIcon(key, extra = "") {
  const inner = ICON_PATHS[key] || "";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${inner}</svg>`;
}

let fontsInjected = false;
function ensurePlantCardFonts() {
  if (fontsInjected || typeof document === "undefined") return;
  fontsInjected = true;
  if (document.getElementById("psc-font-link")) return;
  const link = document.createElement("link");
  link.id = "psc-font-link";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,450;9..144,560;9..144,650&family=Manrope:wght@400;500;600;700;800&display=swap";
  document.head.appendChild(link);
}

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------
const STRINGS = {
  de: {
    defaultName: "Pflanze",
    noSensors: "Keine Sensoren konfiguriert. Karte im Editor bearbeiten.",
    careTitle: "Was zu tun ist",
    careOk: "Alle Werte im Sollbereich – aktuell ist nichts zu tun.",
    wateredNow: "Jetzt gegossen",
    wateredToday: "Heute gegossen",
    wateredYesterday: "Gestern gegossen",
    wateredDaysAgo: (n) => `Vor ${n} Tagen gegossen`,
    wateredNever: "Noch nicht gegossen",
    healthOk: (pct) => `${pct} % im Sollbereich`,
    healthProblems: (pct, n) => `${pct} % · ${n} Hinweis${n === 1 ? "" : "e"}`,
    kicker: "Zimmerpflanze",
    labels: {
      moisture: "Feuchtigkeit",
      temperature: "Temperatur",
      illuminance: "Licht",
      conductivity: "Leitfähigkeit / Dünger",
      humidity: "Luftfeuchtigkeit",
      battery: "Batterie",
    },
    advice: {
      moisture_low: "Erde ist zu trocken – gieße die Pflanze zeitnah.",
      moisture_high: "Erde ist zu nass – nicht gießen und Drainage/Übertopf prüfen.",
      temperature_low: "Zu kalt für die Pflanze – wärmeren Standort ohne Zugluft wählen.",
      temperature_high: "Zu warm – vor direkter Heizungs-/Sonnenwärme schützen.",
      illuminance_low: "Zu wenig Licht – näher ans Fenster stellen oder Pflanzenlampe nutzen.",
      illuminance_high: "Zu viel direktes Licht – etwas vom Fenster wegrücken oder abschatten.",
      conductivity_low: "Nährstoffe niedrig – in den nächsten Tagen düngen.",
      conductivity_high: "Zu viel Dünger im Substrat – mit klarem Wasser durchspülen, Düngepause einlegen.",
      humidity_low: "Luft ist zu trocken – besprühen oder Luftbefeuchter aufstellen.",
      humidity_high: "Luftfeuchtigkeit sehr hoch – für bessere Belüftung sorgen (Pilzgefahr).",
      battery_low: "Sensorbatterie wird schwach – bald austauschen.",
    },
    editor: {
      name: "Name der Pflanze",
      species: "Art / Spezies (optional)",
      image: "Bild-URL (optional)",
      sensorsTitle: "Sensoren (per Dropdown auswählen)",
      thresholdHint:
        "Min/Max sind optional. Wenn gesetzt, erscheint bei Über-/Unterschreitung automatisch ein Pflegehinweis unter der Karte.",
      min: "Min",
      max: "Max",
      showAdvice: "Pflegehinweise anzeigen",
      showSparkline: "Bereichsanzeige (Position zwischen Min/Max) anzeigen",
      speciesPreset: "Pflanzenart-Vorlage",
      speciesPresetHint: "Füllt die Min/Max-Felder mit typischen Richtwerten – danach nach Bedarf anpassen.",
      speciesPresetNone: "Keine Vorlage",
      adviceDelay: "Verzögerung bis ein Hinweis erscheint (Minuten)",
      adviceDelayHint: "Verhindert Fehlalarme durch kurze Ausreißer, z. B. direkt nach dem Gießen.",
      wateredEntity: "Datum/Zeit-Helfer für „zuletzt gegossen“ (optional, input_datetime)",
      wateredEntityHint:
        "Lege dazu einen input_datetime-Helfer an (Einstellungen → Geräte & Dienste → Helfer). Die Karte zeigt dann an, wann zuletzt gegossen wurde, inkl. Button.",
    },
  },
  en: {
    defaultName: "Plant",
    noSensors: "No sensors configured yet. Edit the card to add some.",
    careTitle: "What to do",
    careOk: "Everything is within range – nothing to do right now.",
    wateredNow: "Watered now",
    wateredToday: "Watered today",
    wateredYesterday: "Watered yesterday",
    wateredDaysAgo: (n) => `Watered ${n} days ago`,
    wateredNever: "Not watered yet",
    healthOk: (pct) => `${pct}% within range`,
    healthProblems: (pct, n) => `${pct}% · ${n} issue${n === 1 ? "" : "s"}`,
    kicker: "Houseplant",
    labels: {
      moisture: "Moisture",
      temperature: "Temperature",
      illuminance: "Light",
      conductivity: "Conductivity / Fertility",
      humidity: "Humidity",
      battery: "Battery",
    },
    advice: {
      moisture_low: "Soil is too dry – water the plant soon.",
      moisture_high: "Soil is too wet – hold off watering and check drainage/the pot.",
      temperature_low: "Too cold for this plant – move it somewhere warmer, away from drafts.",
      temperature_high: "Too warm – shield it from direct heating or sun.",
      illuminance_low: "Not enough light – move it closer to a window or add a grow light.",
      illuminance_high: "Too much direct light – move it back from the window or add shade.",
      conductivity_low: "Nutrients are low – fertilize in the next few days.",
      conductivity_high: "Too much fertilizer in the soil – flush with clear water and pause fertilizing.",
      humidity_low: "Air is too dry – mist the plant or use a humidifier.",
      humidity_high: "Humidity is very high – improve ventilation (risk of fungus).",
      battery_low: "Sensor battery is getting low – replace it soon.",
    },
    editor: {
      name: "Plant name",
      species: "Species (optional)",
      image: "Image URL (optional)",
      sensorsTitle: "Sensors (pick from the dropdowns)",
      thresholdHint:
        "Min/Max are optional. When set, crossing them shows a care instruction below the card automatically.",
      min: "Min",
      max: "Max",
      showAdvice: "Show care advice",
      showSparkline: "Show range indicator (position between min/max)",
      speciesPreset: "Species preset",
      speciesPresetHint: "Fills in typical Min/Max ranges – adjust afterwards as needed.",
      speciesPresetNone: "No preset",
      adviceDelay: "Delay before advice appears (minutes)",
      adviceDelayHint: "Avoids false alarms from brief spikes, e.g. right after watering.",
      wateredEntity: "Date/time helper for \"last watered\" (optional, input_datetime)",
      wateredEntityHint:
        "Create an input_datetime helper (Settings → Devices & Services → Helpers). The card then shows when it was last watered, with a button to update it.",
    },
  },
};

function getLang(hass) {
  const lang = (hass && hass.language) || "en";
  return STRINGS[lang] ? lang : lang.startsWith("de") ? "de" : "en";
}

// ---------------------------------------------------------------------------
// Species presets: rough, commonly cited care ranges for popular houseplants.
// Meant as a starting point in the editor, not a botanical guarantee.
// ---------------------------------------------------------------------------
const SPECIES_PRESETS = [
  { id: "monstera", label: "Monstera deliciosa", moisture: [20, 60], temperature: [18, 27], illuminance: [1000, 15000], conductivity: [350, 700] },
  { id: "sansevieria", label: "Sansevieria (Bogenhanf)", moisture: [5, 30], temperature: [15, 30], illuminance: [500, 20000], conductivity: [150, 500] },
  { id: "ficus_elastica", label: "Ficus elastica (Gummibaum)", moisture: [15, 50], temperature: [16, 26], illuminance: [1500, 20000], conductivity: [300, 600] },
  { id: "epipremnum", label: "Epipremnum aureum (Efeutute)", moisture: [20, 55], temperature: [18, 29], illuminance: [500, 12000], conductivity: [250, 600] },
  { id: "spathiphyllum", label: "Spathiphyllum (Einblatt)", moisture: [25, 65], temperature: [18, 26], illuminance: [500, 8000], conductivity: [300, 600] },
  { id: "chlorophytum", label: "Chlorophytum comosum (Grünlilie)", moisture: [15, 50], temperature: [13, 27], illuminance: [800, 15000], conductivity: [250, 550] },
  { id: "aloe_vera", label: "Aloe Vera", moisture: [5, 25], temperature: [15, 30], illuminance: [2000, 25000], conductivity: [150, 400] },
  { id: "orchidee", label: "Phalaenopsis (Orchidee)", moisture: [15, 45], temperature: [18, 28], illuminance: [1000, 10000], conductivity: [100, 350] },
  { id: "basilikum", label: "Basilikum", moisture: [30, 65], temperature: [18, 30], illuminance: [2000, 20000], conductivity: [400, 800] },
  { id: "zamioculcas", label: "Zamioculcas zamiifolia (Glücksfeder)", moisture: [5, 30], temperature: [16, 28], illuminance: [300, 15000], conductivity: [150, 450] },
];

class PlantSensorCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("plant-sensor-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:plant-sensor-card",
      name: "Meine Pflanze",
    };
  }

  constructor() {
    super();
    this._badSince = {}; // per-entity/direction timestamp of when a breach was first observed
    this._seededKeys = new Set(); // avoids re-running the history seed for the same key
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Please configure the card.");
    }
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 3;
  }

  get _t() {
    return STRINGS[getLang(this._hass)];
  }

  _stateOf(entityId) {
    if (!entityId || !this._hass) return null;
    return this._hass.states[entityId];
  }

  _formatValue(stateObj, fallbackUnit) {
    if (!stateObj) return "–";
    const value = stateObj.state;
    if (value === "unknown" || value === "unavailable" || value === undefined) return "–";
    const unit = stateObj.attributes.unit_of_measurement || fallbackUnit || "";
    const num = Number(value);
    const display = Number.isFinite(num) ? Math.round(num * 10) / 10 : value;
    return `${display}${unit ? " " + unit : ""}`;
  }

  _fireMoreInfo(entityId) {
    const ev = new CustomEvent("hass-more-info", {
      detail: { entityId },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(ev);
  }

  // -------------------------------------------------------------------
  // Advice generation, with a debounce so a brief spike (e.g. right
  // after watering) doesn't immediately trigger a care instruction.
  // -------------------------------------------------------------------
  _generateAdvice() {
    const t = this._t;
    const advice = [];
    let anyThresholdConfigured = false;
    const delayMs = Math.max(0, Number(this._config.advice_delay_minutes) || 0) * 60000;
    const now = Date.now();

    SENSOR_DEFS.forEach((def) => {
      const entityId = this._config[`${def.key}_entity`];
      if (!entityId) return;

      const stateObj = this._stateOf(entityId);
      if (!stateObj || stateObj.state === "unknown" || stateObj.state === "unavailable") return;

      const num = Number(stateObj.state);
      if (!Number.isFinite(num)) return;

      let minAttr = this._config[`${def.key}_min`];
      let maxAttr = this._config[`${def.key}_max`];

      // Battery gets a sensible default threshold even if the user didn't set one.
      if (def.key === "battery" && (minAttr === undefined || minAttr === "")) {
        minAttr = DEFAULT_BATTERY_MIN;
      }

      const adviceLow = t.advice[`${def.key}_low`];
      const adviceHigh = t.advice[`${def.key}_high`];

      if (minAttr !== undefined && minAttr !== "") {
        anyThresholdConfigured = true;
        const breach = num < Number(minAttr);
        const key = `${entityId}_low`;
        if (breach && adviceLow) {
          if (!(key in this._badSince)) {
            this._badSince[key] = now;
            this._seedBadSince(entityId, key, (v) => v < Number(minAttr));
          }
          if (now - this._badSince[key] >= delayMs) {
            advice.push({ text: adviceLow, entityId });
          }
        } else {
          delete this._badSince[key];
        }
      }

      if (maxAttr !== undefined && maxAttr !== "") {
        anyThresholdConfigured = true;
        const breach = num > Number(maxAttr);
        const key = `${entityId}_high`;
        if (breach && adviceHigh) {
          if (!(key in this._badSince)) {
            this._badSince[key] = now;
            this._seedBadSince(entityId, key, (v) => v > Number(maxAttr));
          }
          if (now - this._badSince[key] >= delayMs) {
            advice.push({ text: adviceHigh, entityId });
          }
        } else {
          delete this._badSince[key];
        }
      }
    });

    return { advice, anyThresholdConfigured };
  }

  // Best-effort: look a few hours into the recorder history to find how
  // long a breach has really been going on, so the debounce also works
  // right after a dashboard reload instead of always starting at "now".
  async _seedBadSince(entityId, key, isBreach) {
    if (this._seededKeys.has(key) || !this._hass) return;
    this._seededKeys.add(key);
    try {
      const start = new Date(Date.now() - HISTORY_LOOKBACK_MS).toISOString();
      const result = await this._hass.callApi("GET", `history/period/${start}?filter_entity_id=${entityId}`);
      const series = (result && result[0]) || [];
      let boundary = Date.now() - HISTORY_LOOKBACK_MS;
      series.forEach((p) => {
        const v = Number(p.state);
        if (!Number.isFinite(v)) return;
        if (!isBreach(v)) boundary = new Date(p.last_changed).getTime();
      });
      this._badSince[key] = boundary;
      this._render();
    } catch (e) {
      // Recorder history unavailable (e.g. entity has no history yet) - keep the
      // "now" based timestamp already set and just debounce from this point on.
    }
  }

  // -------------------------------------------------------------------
  // Overall "health": share of configured sensors currently within their
  // min/max range. Drives the ring in the header.
  // -------------------------------------------------------------------
  _computeHealth() {
    let total = 0;
    let ok = 0;

    SENSOR_DEFS.forEach((def) => {
      const entityId = this._config[`${def.key}_entity`];
      if (!entityId) return;
      const stateObj = this._stateOf(entityId);
      if (!stateObj || stateObj.state === "unknown" || stateObj.state === "unavailable") return;
      const num = Number(stateObj.state);
      if (!Number.isFinite(num)) return;

      let min = this._config[`${def.key}_min`];
      const max = this._config[`${def.key}_max`];
      if (def.key === "battery" && (min === undefined || min === "")) min = DEFAULT_BATTERY_MIN;

      const hasThreshold = (min !== undefined && min !== "") || (max !== undefined && max !== "");
      if (!hasThreshold) return;

      total += 1;
      const breach =
        (min !== undefined && min !== "" && num < Number(min)) ||
        (max !== undefined && max !== "" && num > Number(max));
      if (!breach) ok += 1;
    });

    if (total === 0) return null;
    return { pct: Math.round((ok / total) * 100), total, ok };
  }

  // Position (0-100) of the current value between min and max, for the
  // little range indicator under each sensor row. Returns null when both
  // bounds aren't set, since a single-sided threshold has no fixed scale.
  _rangePosition(value, min, max) {
    if (min === undefined || min === "" || max === undefined || max === "") return null;
    const lo = Number(min);
    const hi = Number(max);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null;
    const pct = ((value - lo) / (hi - lo)) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  // -------------------------------------------------------------------
  // "Last watered" tracking via an optional input_datetime helper.
  // -------------------------------------------------------------------
  _renderWatered() {
    const wrap = this.querySelector(".psc-watered");
    if (!wrap) return;

    const entityId = this._config.watered_entity;
    if (!entityId) {
      wrap.innerHTML = "";
      return;
    }

    const t = this._t;
    const stateObj = this._stateOf(entityId);
    let label = t.wateredNever;

    if (stateObj && stateObj.state && stateObj.state !== "unknown" && stateObj.state !== "unavailable") {
      const wateredDate = new Date(stateObj.state);
      if (!Number.isNaN(wateredDate.getTime())) {
        const days = Math.floor((Date.now() - wateredDate.getTime()) / 86400000);
        if (days <= 0) label = t.wateredToday;
        else if (days === 1) label = t.wateredYesterday;
        else label = t.wateredDaysAgo(days);
      }
    }

    wrap.innerHTML = `
      <span class="psc-watered-label">${label}</span>
      <button class="psc-btn" id="psc-water-btn">
        ${svgIcon("watering_can")}
        <span>${t.wateredNow}</span>
      </button>
    `;

    wrap.querySelector("#psc-water-btn").addEventListener("click", () => {
      this._hass.callService("input_datetime", "set_datetime", {
        entity_id: entityId,
        datetime: new Date().toISOString().replace("T", " ").substring(0, 19),
      });
    });
  }

  _render() {
    if (!this._config) return;
    ensurePlantCardFonts();

    if (!this.content) {
      this.innerHTML = `
        <ha-card>
          <div class="psc-card">
            <div class="psc-head">
              <div class="psc-ring-wrap">
                <div class="psc-ring">
                  <div class="psc-ring-inner">
                    <img class="psc-image" style="display:none;" />
                    <span class="psc-leaf">${svgIcon("leaf")}</span>
                  </div>
                </div>
              </div>
              <div class="psc-head-text">
                <span class="psc-kicker"></span>
                <div class="psc-title"></div>
                <div class="psc-species"></div>
                <div class="psc-status"></div>
              </div>
            </div>
            <div class="psc-metrics"></div>
            <div class="psc-divider" style="display:none;"></div>
            <div class="psc-watered"></div>
            <div class="psc-advice"></div>
          </div>
          <style>
            @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,450;9..144,560;9..144,650&family=Manrope:wght@400;500;600;700;800&display=swap");

            ha-card {
              --psc-bg: #f2f6ee; --psc-surface: #ffffff; --psc-surface-2: #eef3e8;
              --psc-text: #16211a; --psc-text-2: #647566; --psc-border: #e1e9da;
              --psc-accent-1: #2f8f5c; --psc-accent-2: #a9d977; --psc-accent-soft: #e2f1e6;
              --psc-warning: #d98a2b; --psc-warning-soft: #fbeedd; --psc-danger: #c85a45;
              --psc-track: #e5ecdf;
              display: block;
              padding: 20px;
              font-family: "Manrope", system-ui, sans-serif;
              color: var(--psc-text);
              background: var(--psc-surface);
              overflow: hidden;
            }
            ha-card.psc-dark {
              --psc-bg: #0e1512; --psc-surface: #162019; --psc-surface-2: #1c2721;
              --psc-text: #edf3ec; --psc-text-2: #93a696; --psc-border: #263129;
              --psc-accent-1: #74cf9d; --psc-accent-2: #c3ea7c; --psc-accent-soft: #1e3428;
              --psc-warning: #f0a75c; --psc-warning-soft: #3a2c18; --psc-danger: #ef7a68;
              --psc-track: #263129;
            }

            .psc-card { display: flex; flex-direction: column; gap: 18px; }

            .psc-head { display: flex; align-items: center; gap: 14px; }
            .psc-ring-wrap { position: relative; width: 60px; height: 60px; flex-shrink: 0; }
            .psc-ring {
              --pct: 0; --ring-color: var(--psc-accent-2);
              width: 100%; height: 100%; border-radius: 50%; padding: 4px;
              background: conic-gradient(from -90deg, var(--ring-color) calc(var(--pct) * 1%), var(--psc-track) 0);
            }
            .psc-ring.warning { --ring-color: var(--psc-warning); }
            .psc-ring.neutral { background: var(--psc-track); }
            .psc-ring-inner {
              width: 100%; height: 100%; border-radius: 50%;
              background: var(--psc-surface);
              display: flex; align-items: center; justify-content: center;
              overflow: hidden;
            }
            .psc-ring-inner img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
            .psc-leaf { width: 28px; height: 28px; color: var(--psc-accent-1); display: flex; }
            .psc-leaf svg { width: 100%; height: 100%; }

            .psc-head-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
            .psc-kicker {
              font-size: 0.64rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
              color: var(--psc-text-2);
            }
            .psc-kicker:empty { display: none; }
            .psc-title {
              font-family: "Fraunces", serif; font-weight: 560; font-size: 1.3rem;
              line-height: 1.1; letter-spacing: -0.01em;
            }
            .psc-species { font-size: 0.78rem; color: var(--psc-text-2); font-style: italic; }
            .psc-species:empty { display: none; }
            .psc-status {
              display: flex; align-items: center; gap: 6px;
              font-size: 0.74rem; font-weight: 700; color: var(--psc-accent-1);
              margin-top: 2px;
            }
            .psc-status.warning { color: var(--psc-warning); }
            .psc-status:empty { display: none; }
            .psc-status .psc-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

            .psc-metrics { display: flex; flex-direction: column; gap: 14px; }
            .psc-metric-row { display: flex; align-items: center; gap: 12px; cursor: pointer; }
            .psc-metric-icon {
              width: 32px; height: 32px; border-radius: 11px; flex-shrink: 0;
              background: var(--psc-accent-soft); color: var(--psc-accent-1);
              display: flex; align-items: center; justify-content: center;
            }
            .psc-metric-icon.warning { background: var(--psc-warning-soft); color: var(--psc-warning); }
            .psc-metric-icon svg { width: 17px; height: 17px; }
            .psc-metric-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
            .psc-metric-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
            .psc-metric-label {
              font-size: 0.74rem; color: var(--psc-text-2); font-weight: 600;
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .psc-metric-value { font-weight: 800; font-size: 0.86rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
            .psc-metric-value.warning { color: var(--psc-warning); }
            .psc-metric-value.danger { color: var(--psc-danger); }
            .psc-metric-track { position: relative; height: 4px; border-radius: 999px; background: var(--psc-track); }
            .psc-metric-dot {
              position: absolute; top: 50%; width: 10px; height: 10px; border-radius: 50%;
              background: var(--psc-accent-1); box-shadow: 0 0 0 3px var(--psc-surface);
              transform: translate(-50%, -50%);
            }
            .psc-metric-dot.warning { background: var(--psc-warning); }
            .psc-metric-dot.danger { background: var(--psc-danger); }
            .psc-empty { color: var(--psc-text-2); font-size: 0.85rem; }

            .psc-divider { height: 1px; background: var(--psc-border); }

            .psc-watered { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
            .psc-watered:empty { display: none; }
            .psc-watered-label { font-size: 0.78rem; color: var(--psc-text-2); line-height: 1.35; }
            .psc-btn {
              display: inline-flex; align-items: center; gap: 7px;
              background: linear-gradient(135deg, var(--psc-accent-1), var(--psc-accent-2));
              color: #0c1710; border: none; border-radius: 999px; padding: 9px 15px;
              font-family: inherit; font-weight: 800; font-size: 0.76rem;
              white-space: nowrap; cursor: pointer;
              box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--psc-accent-1) 60%, transparent);
            }
            .psc-btn svg { width: 15px; height: 15px; }

            .psc-advice { display: flex; flex-direction: column; gap: 8px; }
            .psc-advice:empty { display: none; }
            .psc-advice-title {
              font-size: 0.66rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
              color: var(--psc-text-2);
            }
            .psc-advice-item {
              display: flex; align-items: center; gap: 10px;
              background: var(--psc-warning-soft);
              border-radius: 14px; padding: 10px 12px;
              font-size: 0.82rem; line-height: 1.35; font-weight: 500;
              cursor: pointer;
            }
            .psc-advice-item.ok { background: var(--psc-accent-soft); cursor: default; }
            .psc-advice-chip-icon {
              width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
              background: var(--psc-warning); color: #241705;
              display: flex; align-items: center; justify-content: center;
            }
            .psc-advice-chip-icon svg { width: 12px; height: 12px; }
            .psc-advice-item.ok .psc-advice-chip-icon { background: var(--psc-accent-1); color: #08150d; }
          </style>
        </ha-card>
      `;
      this.content = this.querySelector(".psc-card");
      this._cardEl = this.querySelector("ha-card");
    }

    const t = this._t;
    const isDark = !!(this._hass && this._hass.themes && this._hass.themes.darkMode);
    this._cardEl.classList.toggle("psc-dark", isDark);

    const name = this._config.name || t.defaultName;
    const species = this._config.species || "";
    const image = this._config.image || "";

    this.querySelector(".psc-title").textContent = name;
    this.querySelector(".psc-species").textContent = species;
    this.querySelector(".psc-kicker").textContent = t.kicker;

    const imgEl = this.querySelector(".psc-image");
    const leafEl = this.querySelector(".psc-leaf");
    if (image) {
      imgEl.src = image;
      imgEl.style.display = "";
      leafEl.style.display = "none";
    } else {
      imgEl.style.display = "none";
      leafEl.style.display = "";
    }

    // Health ring + status line
    const ringEl = this.querySelector(".psc-ring");
    const statusEl = this.querySelector(".psc-status");
    const health = this._computeHealth();
    if (!health) {
      ringEl.className = "psc-ring neutral";
      statusEl.className = "psc-status";
      statusEl.innerHTML = "";
    } else {
      const isWarning = health.pct < 100;
      ringEl.className = "psc-ring" + (isWarning ? " warning" : "");
      ringEl.style.setProperty("--pct", health.pct);
      const problems = health.total - health.ok;
      statusEl.className = "psc-status" + (isWarning ? " warning" : "");
      statusEl.innerHTML = `<span class="psc-dot"></span>${
        problems > 0 ? t.healthProblems(health.pct, problems) : t.healthOk(health.pct)
      }`;
    }

    // Sensor rows
    const showRange = this._config.show_sparkline !== false;
    const metrics = this.querySelector(".psc-metrics");
    metrics.innerHTML = "";

    SENSOR_DEFS.forEach((def) => {
      const entityId = this._config[`${def.key}_entity`];
      if (!entityId) return;

      const stateObj = this._stateOf(entityId);
      const value = this._formatValue(stateObj, def.unit);
      const label = t.labels[def.key];

      let minAttr = this._config[`${def.key}_min`];
      const maxAttr = this._config[`${def.key}_max`];
      if (def.key === "battery" && (minAttr === undefined || minAttr === "")) {
        minAttr = DEFAULT_BATTERY_MIN;
      }
      let severity = "";
      if (stateObj && stateObj.state !== "unknown" && stateObj.state !== "unavailable") {
        const num = Number(stateObj.state);
        if (Number.isFinite(num)) {
          if (minAttr !== undefined && minAttr !== "" && num < Number(minAttr)) severity = "warning";
          if (maxAttr !== undefined && maxAttr !== "" && num > Number(maxAttr)) severity = "warning";
        }
      }

      let trackHtml = "";
      if (showRange && stateObj) {
        const num = Number(stateObj.state);
        const pos = Number.isFinite(num) ? this._rangePosition(num, minAttr, maxAttr) : null;
        if (pos !== null) {
          trackHtml = `
            <div class="psc-metric-track">
              <div class="psc-metric-dot ${severity}" style="left:${pos}%"></div>
            </div>
          `;
        }
      }

      const row = document.createElement("div");
      row.className = "psc-metric-row";
      row.innerHTML = `
        <div class="psc-metric-icon ${severity}">${svgIcon(def.key)}</div>
        <div class="psc-metric-main">
          <div class="psc-metric-top">
            <span class="psc-metric-label">${label}</span>
            <span class="psc-metric-value ${severity}">${value}</span>
          </div>
          ${trackHtml}
        </div>
      `;
      row.addEventListener("click", () => this._fireMoreInfo(entityId));
      metrics.appendChild(row);
    });

    if (!metrics.children.length) {
      metrics.innerHTML = `<div class="psc-empty">${t.noSensors}</div>`;
    }

    this._renderWatered();
    this._renderAdvice();

    const hasWatered = !!this._config.watered_entity;
    this.querySelector(".psc-divider").style.display = hasWatered ? "" : "none";
  }

  _renderAdvice() {
    const adviceEl = this.querySelector(".psc-advice");
    if (!adviceEl) return;
    const t = this._t;

    // Hidden entirely if the user switched it off in the editor.
    if (this._config.show_advice === false) {
      adviceEl.innerHTML = "";
      return;
    }

    const { advice, anyThresholdConfigured } = this._generateAdvice();

    if (!anyThresholdConfigured) {
      // No min/max set anywhere -> nothing to base advice on, stay quiet.
      adviceEl.innerHTML = "";
      return;
    }

    let itemsHtml;
    if (advice.length === 0) {
      itemsHtml = `
        <div class="psc-advice-item ok">
          <span class="psc-advice-chip-icon">${svgIcon("check", 'stroke-width="2.5"')}</span>
          <span>${t.careOk}</span>
        </div>
      `;
    } else {
      itemsHtml = advice
        .map(
          (a) => `
        <div class="psc-advice-item" data-entity="${a.entityId}">
          <span class="psc-advice-chip-icon">${svgIcon("alert", 'stroke-width="2.5"')}</span>
          <span>${a.text}</span>
        </div>
      `
        )
        .join("");
    }

    adviceEl.innerHTML = `
      <div class="psc-advice-title">${t.careTitle}</div>
      ${itemsHtml}
    `;

    adviceEl.querySelectorAll(".psc-advice-item[data-entity]").forEach((el) => {
      el.addEventListener("click", () => this._fireMoreInfo(el.dataset.entity));
    });
  }
}

class PlantSensorCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  get _t() {
    return STRINGS[getLang(this._hass)];
  }

  _valueChanged(key, value) {
    this._config = { ...this._config, [key]: value };
    if (value === "" || value === undefined) {
      delete this._config[key];
    }
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  _applyPreset(presetId) {
    const preset = SPECIES_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    let next = { ...this._config, species_preset: presetId };
    ["moisture", "temperature", "illuminance", "conductivity"].forEach((key) => {
      if (preset[key]) {
        next[`${key}_min`] = preset[key][0];
        next[`${key}_max`] = preset[key][1];
      }
    });
    if (!next.species) next.species = preset.label;

    this._config = next;
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
    this._render();
  }

  _render() {
    if (!this._hass) return;
    const t = this._t;

    if (!this.content) {
      this.innerHTML = `<div class="psc-editor"></div>`;
      this.content = this.querySelector(".psc-editor");
    }

    const cfg = this._config || {};

    const presetOptions = SPECIES_PRESETS.map(
      (p) => `<option value="${p.id}" ${cfg.species_preset === p.id ? "selected" : ""}>${p.label}</option>`
    ).join("");

    const sensorRows = SENSOR_DEFS.map((def) => {
      const thresholdRow = `
        <div class="psc-threshold-row">
          <ha-textfield
            type="number"
            data-key="${def.key}_min"
            label="${t.editor.min} ${def.unit ? `(${def.unit})` : ""}"
          ></ha-textfield>
          <ha-textfield
            type="number"
            data-key="${def.key}_max"
            label="${t.editor.max} ${def.unit ? `(${def.unit})` : ""}"
          ></ha-textfield>
        </div>`;

      return `
        <div class="psc-row" data-key="${def.key}_entity">
          <ha-entity-picker
            data-key="${def.key}_entity"
            label="${t.labels[def.key]}"
            allow-custom-entity
          ></ha-entity-picker>
          ${thresholdRow}
        </div>
      `;
    }).join("");

    this.content.innerHTML = `
      <style>
        .psc-editor { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
        .psc-row { width: 100%; display: flex; flex-direction: column; gap: 6px; }
        .psc-threshold-row { display: flex; gap: 8px; padding-left: 4px; }
        .psc-threshold-row ha-textfield { flex: 1; }
        .psc-section-title {
          font-weight: 500; margin-top: 8px; color: var(--secondary-text-color);
        }
        .psc-hint {
          font-size: 0.85em; color: var(--secondary-text-color); margin-top: -4px;
        }
        .psc-switch-row {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 4px;
        }
        .psc-preset-row { display: flex; flex-direction: column; gap: 4px; }
        .psc-preset-row select {
          padding: 10px 8px; border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #000);
          font: inherit;
        }
      </style>
      <ha-textfield id="psc-name" label="${t.editor.name}"></ha-textfield>
      <ha-textfield id="psc-species" label="${t.editor.species}"></ha-textfield>
      <ha-textfield id="psc-image" label="${t.editor.image}"></ha-textfield>

      <div class="psc-preset-row">
        <label class="psc-section-title">${t.editor.speciesPreset}</label>
        <select id="psc-species-preset">
          <option value="">${t.editor.speciesPresetNone}</option>
          ${presetOptions}
        </select>
        <div class="psc-hint">${t.editor.speciesPresetHint}</div>
      </div>

      <div class="psc-section-title">${t.editor.sensorsTitle}</div>
      <div class="psc-hint">${t.editor.thresholdHint}</div>
      ${sensorRows}

      <ha-textfield
        id="psc-advice-delay"
        type="number"
        label="${t.editor.adviceDelay}"
      ></ha-textfield>
      <div class="psc-hint">${t.editor.adviceDelayHint}</div>

      <ha-entity-picker
        id="psc-watered-entity"
        label="${t.editor.wateredEntity}"
        include-domains='["input_datetime"]'
      ></ha-entity-picker>
      <div class="psc-hint">${t.editor.wateredEntityHint}</div>

      <div class="psc-switch-row">
        <span>${t.editor.showAdvice}</span>
        <ha-switch id="psc-show-advice"></ha-switch>
      </div>
      <div class="psc-switch-row">
        <span>${t.editor.showSparkline}</span>
        <ha-switch id="psc-show-sparkline"></ha-switch>
      </div>
    `;

    // Text fields
    const nameField = this.content.querySelector("#psc-name");
    nameField.value = cfg.name || "";
    nameField.addEventListener("input", (e) => this._valueChanged("name", e.target.value));

    const speciesField = this.content.querySelector("#psc-species");
    speciesField.value = cfg.species || "";
    speciesField.addEventListener("input", (e) => this._valueChanged("species", e.target.value));

    const imageField = this.content.querySelector("#psc-image");
    imageField.value = cfg.image || "";
    imageField.addEventListener("input", (e) => this._valueChanged("image", e.target.value));

    const delayField = this.content.querySelector("#psc-advice-delay");
    delayField.value = cfg.advice_delay_minutes !== undefined ? String(cfg.advice_delay_minutes) : "";
    delayField.addEventListener("input", (e) => {
      const raw = e.target.value;
      this._valueChanged("advice_delay_minutes", raw === "" ? "" : Number(raw));
    });

    // Species preset
    this.content.querySelector("#psc-species-preset").addEventListener("change", (e) => {
      if (e.target.value) this._applyPreset(e.target.value);
    });

    // Min/max threshold fields
    this.content.querySelectorAll(".psc-threshold-row ha-textfield").forEach((field) => {
      const key = field.dataset.key;
      field.value = cfg[key] !== undefined ? String(cfg[key]) : "";
      field.addEventListener("input", (e) => {
        const raw = e.target.value;
        this._valueChanged(key, raw === "" ? "" : Number(raw));
      });
    });

    // Entity pickers (sensors + watered helper)
    this.content.querySelectorAll("ha-entity-picker[data-key]").forEach((picker) => {
      const key = picker.dataset.key;
      picker.hass = this._hass;
      picker.value = cfg[key] || "";
      picker.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._valueChanged(key, ev.detail.value);
      });
    });

    const wateredPicker = this.content.querySelector("#psc-watered-entity");
    wateredPicker.hass = this._hass;
    wateredPicker.value = cfg.watered_entity || "";
    wateredPicker.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._valueChanged("watered_entity", ev.detail.value);
    });

    // Toggles
    const adviceSwitch = this.content.querySelector("#psc-show-advice");
    adviceSwitch.checked = cfg.show_advice !== false;
    adviceSwitch.addEventListener("change", (e) => this._valueChanged("show_advice", e.target.checked));

    const sparklineSwitch = this.content.querySelector("#psc-show-sparkline");
    sparklineSwitch.checked = cfg.show_sparkline !== false;
    sparklineSwitch.addEventListener("change", (e) => this._valueChanged("show_sparkline", e.target.checked));
  }
}

customElements.define("plant-sensor-card", PlantSensorCard);
customElements.define("plant-sensor-card-editor", PlantSensorCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "plant-sensor-card",
  name: "Plant Sensor Card",
  description: "Zeigt Pflanzensensor-Werte mit Gesundheits-Ring und automatischen Pflegehinweisen; Sensoren werden im Editor per Dropdown ausgewählt.",
  preview: true,
  documentationURL: "https://github.com/patrickbrundiers-dev/Plant_card-b",
});

console.info(
  `%c PLANT-SENSOR-CARD %c v${CARD_VERSION} `,
  "color: white; background: #4caf50; font-weight: 700;",
  "color: #4caf50; background: white; font-weight: 700;"
);
