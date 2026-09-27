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
 */

const CARD_VERSION = "2.0.0";

const SENSOR_DEFS = [
  { key: "moisture", icon: "mdi:water-percent", unit: "%" },
  { key: "temperature", icon: "mdi:thermometer", unit: "°C" },
  { key: "illuminance", icon: "mdi:white-balance-sunny", unit: "lx" },
  { key: "conductivity", icon: "mdi:flower-outline", unit: "µS/cm" },
  { key: "humidity", icon: "mdi:water", unit: "%" },
  { key: "battery", icon: "mdi:battery", unit: "%" },
];

const DEFAULT_BATTERY_MIN = 20;
const HISTORY_LOOKBACK_MS = 6 * 60 * 60 * 1000; // 6h window used to seed the debounce timer
const SPARKLINE_TTL_MS = 5 * 60 * 1000; // re-fetch history at most every 5 minutes

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
      showSparkline: "24h-Verlauf (Sparkline) anzeigen",
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
      showSparkline: "Show 24h sparkline",
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
    this._sparklineCache = {}; // entityId -> { ts, points }
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
            advice.push({ icon: "mdi:alert-circle-outline", severity: "warning", text: adviceLow, entityId });
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
            advice.push({ icon: "mdi:alert-circle-outline", severity: "warning", text: adviceHigh, entityId });
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
  // Sparkline (24h history) per sensor, fetched lazily and cached.
  // -------------------------------------------------------------------
  async _loadSparklinePoints(entityId) {
    const cached = this._sparklineCache[entityId];
    const now = Date.now();
    if (cached && now - cached.ts < SPARKLINE_TTL_MS) return cached.points;

    if (!this._hass) return [];
    try {
      const start = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const result = await this._hass.callApi("GET", `history/period/${start}?filter_entity_id=${entityId}`);
      const series = (result && result[0]) || [];
      const points = series
        .map((p) => ({ t: new Date(p.last_changed).getTime(), v: Number(p.state) }))
        .filter((p) => Number.isFinite(p.v));
      this._sparklineCache[entityId] = { ts: now, points };
      return points;
    } catch (e) {
      return [];
    }
  }

  _sparklineSvg(points) {
    if (!points || points.length < 2) return "";
    const width = 100;
    const height = 28;
    const values = points.map((p) => p.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const t0 = points[0].t;
    const tSpan = points[points.length - 1].t - t0 || 1;

    const coords = points.map((p) => {
      const x = ((p.t - t0) / tSpan) * width;
      const y = height - ((p.v - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `
      <svg class="psc-spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <polyline points="${coords.join(" ")}" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke" />
      </svg>
    `;
  }

  async _renderSparkline(item, entityId) {
    const holder = item.querySelector(".psc-spark-holder");
    if (!holder) return;
    const points = await this._loadSparklinePoints(entityId);
    // Item might have been removed/replaced by a re-render while we were fetching.
    if (!this.isConnected || !holder.isConnected) return;
    holder.innerHTML = this._sparklineSvg(points);
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
      <mwc-button dense id="psc-water-btn">
        <ha-icon icon="mdi:watering-can" slot="icon"></ha-icon>
        ${t.wateredNow}
      </mwc-button>
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

    if (!this.content) {
      this.innerHTML = `
        <ha-card>
          <div class="psc-card">
            <div class="psc-header">
              <img class="psc-image" style="display:none;" />
              <div class="psc-title-wrap">
                <div class="psc-title"></div>
                <div class="psc-species"></div>
              </div>
            </div>
            <div class="psc-grid"></div>
            <div class="psc-watered"></div>
            <div class="psc-advice"></div>
          </div>
          <style>
            ha-card { padding: 16px; }
            .psc-card { display: flex; flex-direction: column; gap: 12px; }
            .psc-header { display: flex; align-items: center; gap: 12px; }
            .psc-image {
              width: 56px; height: 56px; border-radius: 50%;
              object-fit: cover; flex-shrink: 0;
            }
            .psc-title { font-size: 1.2em; font-weight: 500; }
            .psc-species { font-size: 0.9em; color: var(--secondary-text-color); }
            .psc-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
              gap: 12px;
            }
            .psc-item {
              display: flex; flex-direction: column; gap: 6px;
              padding: 8px; border-radius: 8px;
              background: var(--secondary-background-color, rgba(0,0,0,0.04));
              cursor: pointer;
            }
            .psc-item-main { display: flex; align-items: center; gap: 8px; }
            .psc-item ha-icon {
              --mdc-icon-size: 22px;
              color: var(--state-icon-color, var(--paper-item-icon-color));
            }
            .psc-item.problem ha-icon { color: var(--error-color, #db4437); }
            .psc-value-wrap { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
            .psc-value { font-weight: 500; }
            .psc-label {
              font-size: 0.75em; color: var(--secondary-text-color);
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .psc-spark-holder { color: var(--primary-color); height: 22px; }
            .psc-spark { width: 100%; height: 22px; display: block; }

            .psc-watered {
              display: flex; align-items: center; justify-content: space-between;
              gap: 8px; font-size: 0.9em; color: var(--secondary-text-color);
            }
            .psc-watered mwc-button { --mdc-theme-primary: var(--primary-color); }

            .psc-advice { display: flex; flex-direction: column; gap: 8px; }
            .psc-advice-title {
              font-size: 0.8em; font-weight: 600; text-transform: uppercase;
              letter-spacing: 0.03em; color: var(--secondary-text-color);
              margin-top: 4px;
            }
            .psc-advice-item {
              display: flex; align-items: flex-start; gap: 10px;
              padding: 8px 10px; border-radius: 8px;
              background: var(--secondary-background-color, rgba(0,0,0,0.04));
              border-left: 3px solid var(--warning-color, #ff9800);
              font-size: 0.88em; line-height: 1.35;
              cursor: pointer;
            }
            .psc-advice-item.ok { border-left-color: var(--success-color, #4caf50); cursor: default; }
            .psc-advice-item ha-icon {
              --mdc-icon-size: 20px; flex-shrink: 0; margin-top: 1px;
              color: var(--warning-color, #ff9800);
            }
            .psc-advice-item.ok ha-icon { color: var(--success-color, #4caf50); }
          </style>
        </ha-card>
      `;
      this.content = this.querySelector(".psc-card");
    }

    const t = this._t;
    const name = this._config.name || t.defaultName;
    const species = this._config.species || "";
    const image = this._config.image || "";

    const titleEl = this.querySelector(".psc-title");
    const speciesEl = this.querySelector(".psc-species");
    const imgEl = this.querySelector(".psc-image");
    titleEl.textContent = name;
    speciesEl.textContent = species;
    if (image) {
      imgEl.src = image;
      imgEl.style.display = "";
    } else {
      imgEl.style.display = "none";
    }

    const grid = this.querySelector(".psc-grid");
    grid.innerHTML = "";

    const showSparkline = this._config.show_sparkline !== false;

    SENSOR_DEFS.forEach((def) => {
      const entityId = this._config[`${def.key}_entity`];
      if (!entityId) return;

      const stateObj = this._stateOf(entityId);
      const value = this._formatValue(stateObj, def.unit);
      const label = t.labels[def.key];

      const minAttr = this._config[`${def.key}_min`];
      const maxAttr = this._config[`${def.key}_max`];
      let problem = false;
      if (stateObj && stateObj.state !== "unknown" && stateObj.state !== "unavailable") {
        const num = Number(stateObj.state);
        if (Number.isFinite(num)) {
          if (minAttr !== undefined && minAttr !== "" && num < Number(minAttr)) problem = true;
          if (maxAttr !== undefined && maxAttr !== "" && num > Number(maxAttr)) problem = true;
        }
      }

      const item = document.createElement("div");
      item.className = "psc-item" + (problem ? " problem" : "");
      item.innerHTML = `
        <div class="psc-item-main">
          <ha-icon icon="${def.icon}"></ha-icon>
          <div class="psc-value-wrap">
            <span class="psc-value">${value}</span>
            <span class="psc-label">${label}</span>
          </div>
        </div>
        ${showSparkline ? `<div class="psc-spark-holder"></div>` : ""}
      `;
      item.addEventListener("click", () => this._fireMoreInfo(entityId));
      grid.appendChild(item);

      if (showSparkline) {
        this._renderSparkline(item, entityId);
      }
    });

    if (!grid.children.length) {
      grid.innerHTML = `<div class="psc-label">${t.noSensors}</div>`;
    }

    this._renderWatered();
    this._renderAdvice();
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
          <ha-icon icon="mdi:check-circle-outline"></ha-icon>
          <span>${t.careOk}</span>
        </div>
      `;
    } else {
      itemsHtml = advice
        .map(
          (a) => `
        <div class="psc-advice-item" data-entity="${a.entityId}">
          <ha-icon icon="${a.icon}"></ha-icon>
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
  description: "Zeigt Pflanzensensor-Werte, 24h-Verlauf und automatische Pflegehinweise; Sensoren werden im Editor per Dropdown ausgewählt.",
  preview: true,
  documentationURL: "https://github.com/patrickbrundiers-dev/Plant_card-b",
});

console.info(
  `%c PLANT-SENSOR-CARD %c v${CARD_VERSION} `,
  "color: white; background: #4caf50; font-weight: 700;",
  "color: #4caf50; background: white; font-weight: 700;"
);
