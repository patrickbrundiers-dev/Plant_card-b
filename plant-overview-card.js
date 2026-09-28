/**
 * Plant Overview Card
 * A companion custom Lovelace card that lists several plants at once with
 * a traffic-light status per plant, based on the same min/max thresholds
 * used by the Plant Sensor Card. Useful once you have more than one plant
 * and want a single glance at which ones need attention.
 *
 * This file is self-contained (no dependency on plant-sensor-card.js) so
 * it can be added as its own Lovelace resource.
 *
 * https://github.com/patrickbrundiers-dev/Plant_card-b
 */

const CARD_VERSION = "1.2.0";

const SENSOR_DEFS = [
  { key: "moisture", icon: "mdi:water-percent", unit: "%" },
  { key: "temperature", icon: "mdi:thermometer", unit: "°C" },
  { key: "illuminance", icon: "mdi:white-balance-sunny", unit: "lx" },
  { key: "conductivity", icon: "mdi:flower-outline", unit: "µS/cm" },
  { key: "humidity", icon: "mdi:water", unit: "%" },
  { key: "battery", icon: "mdi:battery", unit: "%" },
];

const DEFAULT_BATTERY_MIN = 20;

// Same presets as the Plant Sensor Card (kept in sync manually - this file
// is intentionally self-contained, see header comment). Only the fields
// used here are included.
const SPECIES_PRESETS = [
  { id: "monstera", category: "houseplant", label: "Monstera deliciosa", moisture: [20, 60], temperature: [18, 27], illuminance: [1000, 15000], conductivity: [350, 700] },
  { id: "sansevieria", category: "houseplant", label: "Sansevieria (Bogenhanf)", moisture: [5, 30], temperature: [15, 30], illuminance: [500, 20000], conductivity: [150, 500] },
  { id: "ficus_elastica", category: "houseplant", label: "Ficus elastica (Gummibaum)", moisture: [15, 50], temperature: [16, 26], illuminance: [1500, 20000], conductivity: [300, 600] },
  { id: "ficus_benjamina", category: "houseplant", label: "Ficus benjamina (Birkenfeige)", moisture: [20, 50], temperature: [16, 27], illuminance: [1000, 18000], conductivity: [300, 600] },
  { id: "epipremnum", category: "houseplant", label: "Epipremnum aureum (Efeutute)", moisture: [20, 55], temperature: [18, 29], illuminance: [500, 12000], conductivity: [250, 600] },
  { id: "spathiphyllum", category: "houseplant", label: "Spathiphyllum (Einblatt)", moisture: [25, 65], temperature: [18, 26], illuminance: [500, 8000], conductivity: [300, 600] },
  { id: "chlorophytum", category: "houseplant", label: "Chlorophytum comosum (Grünlilie)", moisture: [15, 50], temperature: [13, 27], illuminance: [800, 15000], conductivity: [250, 550] },
  { id: "orchidee", category: "houseplant", label: "Phalaenopsis (Orchidee)", moisture: [15, 45], temperature: [18, 28], illuminance: [1000, 10000], conductivity: [100, 350] },
  { id: "zamioculcas", category: "houseplant", label: "Zamioculcas zamiifolia (Glücksfeder)", moisture: [5, 30], temperature: [16, 28], illuminance: [300, 15000], conductivity: [150, 450] },
  { id: "hedera", category: "houseplant", label: "Hedera helix (Efeu)", moisture: [20, 55], temperature: [10, 24], illuminance: [500, 12000], conductivity: [200, 500] },
  { id: "dracaena", category: "houseplant", label: "Dracaena marginata (Drachenbaum)", moisture: [15, 45], temperature: [18, 27], illuminance: [800, 15000], conductivity: [250, 550] },
  { id: "philodendron", category: "houseplant", label: "Philodendron scandens", moisture: [20, 55], temperature: [18, 28], illuminance: [500, 10000], conductivity: [250, 550] },
  { id: "calathea", category: "houseplant", label: "Calathea", moisture: [30, 65], temperature: [18, 26], illuminance: [500, 6000], conductivity: [200, 450] },
  { id: "fittonia", category: "houseplant", label: "Fittonia (Mosaikpflanze)", moisture: [35, 70], temperature: [18, 26], illuminance: [500, 6000], conductivity: [200, 450] },
  { id: "alocasia", category: "houseplant", label: "Alocasia", moisture: [30, 60], temperature: [18, 27], illuminance: [800, 10000], conductivity: [250, 500] },
  { id: "anthurium", category: "houseplant", label: "Anthurium (Flamingoblume)", moisture: [25, 55], temperature: [18, 27], illuminance: [800, 10000], conductivity: [250, 550] },
  { id: "schefflera", category: "houseplant", label: "Schefflera (Strahlenaralie)", moisture: [20, 50], temperature: [16, 27], illuminance: [1000, 15000], conductivity: [250, 550] },
  { id: "areca", category: "houseplant", label: "Areca-Palme (Dypsis lutescens)", moisture: [25, 55], temperature: [18, 27], illuminance: [1000, 15000], conductivity: [250, 500] },
  { id: "pilea", category: "houseplant", label: "Pilea peperomioides (Ufopflanze)", moisture: [20, 50], temperature: [18, 26], illuminance: [800, 10000], conductivity: [250, 500] },
  { id: "saintpaulia", category: "houseplant", label: "Saintpaulia (Usambaraveilchen)", moisture: [30, 60], temperature: [18, 24], illuminance: [500, 5000], conductivity: [200, 450] },
  { id: "aloe_vera", category: "succulent", label: "Aloe Vera", moisture: [5, 25], temperature: [15, 30], illuminance: [2000, 25000], conductivity: [150, 400] },
  { id: "crassula", category: "succulent", label: "Crassula ovata (Geldbaum)", moisture: [5, 25], temperature: [15, 27], illuminance: [2000, 20000], conductivity: [150, 400] },
  { id: "echeveria", category: "succulent", label: "Echeveria", moisture: [5, 20], temperature: [15, 28], illuminance: [3000, 25000], conductivity: [100, 350] },
  { id: "kaktus", category: "succulent", label: "Kaktus (allgemein)", moisture: [3, 15], temperature: [15, 32], illuminance: [3000, 30000], conductivity: [100, 300] },
  { id: "yucca", category: "succulent", label: "Yucca elephantipes", moisture: [5, 30], temperature: [15, 30], illuminance: [2000, 25000], conductivity: [150, 400] },
  { id: "basilikum", category: "herb", label: "Basilikum", moisture: [30, 65], temperature: [18, 30], illuminance: [2000, 20000], conductivity: [400, 800] },
  { id: "minze", category: "herb", label: "Minze", moisture: [35, 70], temperature: [15, 28], illuminance: [2000, 20000], conductivity: [400, 800] },
  { id: "rosmarin", category: "herb", label: "Rosmarin", moisture: [10, 35], temperature: [12, 30], illuminance: [3000, 25000], conductivity: [200, 500] },
  { id: "thymian", category: "herb", label: "Thymian", moisture: [10, 35], temperature: [12, 30], illuminance: [3000, 25000], conductivity: [200, 450] },
  { id: "petersilie", category: "herb", label: "Petersilie", moisture: [30, 60], temperature: [12, 25], illuminance: [1500, 15000], conductivity: [350, 700] },
  { id: "schnittlauch", category: "herb", label: "Schnittlauch", moisture: [30, 60], temperature: [10, 25], illuminance: [1500, 15000], conductivity: [300, 650] },
  { id: "lavendel", category: "herb", label: "Lavendel", moisture: [10, 30], temperature: [10, 30], illuminance: [3000, 25000], conductivity: [150, 400] },
  { id: "geranie", category: "herb", label: "Geranie (Pelargonium)", moisture: [20, 50], temperature: [15, 28], illuminance: [3000, 25000], conductivity: [300, 650] },
  { id: "tomate", category: "herb", label: "Tomate (Balkon)", moisture: [35, 70], temperature: [15, 30], illuminance: [3000, 30000], conductivity: [500, 1000] },
];
const SPECIES_CATEGORY_ORDER = ["houseplant", "succulent", "herb"];

const STRINGS = {
  de: {
    title: "Pflanzen",
    noPlants: "Keine Pflanzen konfiguriert. Karte im Editor bearbeiten.",
    allGood: "Alles gut",
    problemsCount: (n) => `${n} Hinweis${n === 1 ? "" : "e"}`,
    noThresholds: "Keine Grenzwerte gesetzt",
    labels: {
      moisture: "Feuchtigkeit", temperature: "Temperatur", illuminance: "Licht",
      conductivity: "Leitfähigkeit", humidity: "Luftfeuchtigkeit", battery: "Batterie",
    },
    editor: {
      title: "Titel",
      addPlant: "+ Pflanze hinzufügen",
      removePlant: "Entfernen",
      plantName: "Name",
      min: "Min", max: "Max",
      speciesPreset: "Pflanzenart-Vorlage",
      speciesPresetNone: "Keine Vorlage",
      speciesCategory: {
        houseplant: "Zimmerpflanzen",
        succulent: "Sukkulenten & Kakteen",
        herb: "Kräuter & Balkon",
      },
      sortByStatus: "Nach Dringlichkeit sortieren (kritisch zuerst)",
    },
  },
  en: {
    title: "Plants",
    noPlants: "No plants configured yet. Edit the card to add some.",
    allGood: "All good",
    problemsCount: (n) => `${n} issue${n === 1 ? "" : "s"}`,
    noThresholds: "No thresholds set",
    labels: {
      moisture: "Moisture", temperature: "Temperature", illuminance: "Light",
      conductivity: "Conductivity", humidity: "Humidity", battery: "Battery",
    },
    editor: {
      title: "Title",
      addPlant: "+ Add plant",
      removePlant: "Remove",
      plantName: "Name",
      min: "Min", max: "Max",
      speciesPreset: "Species preset",
      speciesPresetNone: "No preset",
      speciesCategory: {
        houseplant: "Houseplants",
        succulent: "Succulents & cacti",
        herb: "Herbs & balcony",
      },
      sortByStatus: "Sort by urgency (most critical first)",
    },
  },
};

function getLang(hass) {
  const lang = (hass && hass.language) || "en";
  return STRINGS[lang] ? lang : lang.startsWith("de") ? "de" : "en";
}

// How far past a threshold a value has drifted before it counts as a
// "danger"-level problem instead of a plain "warning" one - same relative
// heuristic as the single-plant card, so the two stay consistent.
function breachSeverity(num, threshold, direction) {
  const t = Number(threshold);
  if (!Number.isFinite(t) || t === 0) return "warning";
  if (direction === "low") return num < t * 0.6 ? "danger" : "warning";
  return num > t * 1.4 ? "danger" : "warning";
}

function evaluatePlant(hass, plant) {
  let configured = false;
  let problems = 0;
  let dangerProblems = 0;

  SENSOR_DEFS.forEach((def) => {
    const entityId = plant[`${def.key}_entity`];
    if (!entityId) return;
    const stateObj = hass.states[entityId];
    if (!stateObj || stateObj.state === "unknown" || stateObj.state === "unavailable") return;
    const num = Number(stateObj.state);
    if (!Number.isFinite(num)) return;

    let min = plant[`${def.key}_min`];
    const max = plant[`${def.key}_max`];
    if (def.key === "battery" && (min === undefined || min === "")) min = DEFAULT_BATTERY_MIN;

    if (min !== undefined && min !== "") {
      configured = true;
      if (num < Number(min)) {
        problems += 1;
        if (breachSeverity(num, min, "low") === "danger") dangerProblems += 1;
      }
    }
    if (max !== undefined && max !== "") {
      configured = true;
      if (num > Number(max)) {
        problems += 1;
        if (breachSeverity(num, max, "high") === "danger") dangerProblems += 1;
      }
    }
  });

  return { configured, problems, dangerProblems };
}

class PlantOverviewCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("plant-overview-card-editor");
  }

  static getStubConfig() {
    return { type: "custom:plant-overview-card", plants: [] };
  }

  setConfig(config) {
    this._config = { plants: [], ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 1 + (this._config?.plants?.length || 1);
  }

  get _t() {
    return STRINGS[getLang(this._hass)];
  }

  _fireMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true })
    );
  }

  _render() {
    if (!this._config || !this._hass) return;
    const t = this._t;

    if (!this.content) {
      this.innerHTML = `
        <ha-card>
          <div class="poc-title"></div>
          <div class="poc-list"></div>
          <style>
            @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560&family=Manrope:wght@500;700;800&display=swap");

            ha-card {
              --poc-surface-2: #eef3e8; --poc-text: #16211a; --poc-text-2: #647566;
              --poc-accent-1: #2f8f5c; --poc-accent-soft: #e2f1e6;
              --poc-warning: #d98a2b; --poc-warning-soft: #fbeedd;
              --poc-danger: #c85a45;
              --poc-track: #e5ecdf;
              display: block;
              padding: 20px;
              font-family: "Manrope", system-ui, sans-serif;
              color: var(--poc-text);
              overflow: hidden;
            }
            ha-card.poc-dark {
              --poc-surface-2: #1c2721; --poc-text: #edf3ec; --poc-text-2: #93a696;
              --poc-accent-1: #74cf9d; --poc-accent-soft: #1e3428;
              --poc-warning: #f0a75c; --poc-warning-soft: #3a2c18;
              --poc-danger: #ef7a68;
              --poc-track: #263129;
            }
            .poc-title {
              font-family: "Fraunces", serif; font-weight: 560; font-size: 1.2rem;
              margin-bottom: 12px; letter-spacing: -0.01em;
            }
            .poc-list { display: flex; flex-direction: column; gap: 8px; }
            .poc-row {
              display: flex; align-items: center; gap: 12px;
              padding: 12px 14px; border-radius: 14px;
              background: var(--poc-surface-2);
              cursor: pointer;
            }
            .poc-dot {
              width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
              background: var(--poc-accent-1);
            }
            .poc-dot.warning { background: var(--poc-warning); }
            .poc-dot.danger { background: var(--poc-danger); }
            .poc-dot.neutral { background: var(--poc-text-2); opacity: 0.5; }
            .poc-name-wrap { display: flex; flex-direction: column; flex: 1; min-width: 0; }
            .poc-name { font-weight: 800; font-size: 0.92rem; }
            .poc-status { font-size: 0.78rem; color: var(--poc-text-2); font-weight: 600; }
            .poc-empty { color: var(--poc-text-2); font-size: 0.88rem; }
            .poc-row ha-icon { color: var(--poc-text-2); --mdc-icon-size: 18px; }
          </style>
        </ha-card>
      `;
      this.content = this.querySelector(".poc-list");
      this._cardEl = this.querySelector("ha-card");
    }

    const isDark = !!(this._hass.themes && this._hass.themes.darkMode);
    this._cardEl.classList.toggle("poc-dark", isDark);

    this.querySelector(".poc-title").textContent = this._config.title || t.title;

    const list = this.content;
    list.innerHTML = "";

    const plants = this._config.plants || [];
    if (!plants.length) {
      list.innerHTML = `<div class="poc-empty">${t.noPlants}</div>`;
      return;
    }

    // Evaluate every plant once, then (by default) sort the list so the
    // ones needing attention float to the top - a glance at the card
    // should show what to deal with first, not just alphabetical order.
    const evaluated = plants.map((plant) => {
      const { configured, problems, dangerProblems } = evaluatePlant(this._hass, plant);
      let dotClass = "neutral";
      let statusText = t.noThresholds;
      if (configured) {
        dotClass = dangerProblems > 0 ? "danger" : problems > 0 ? "warning" : "ok";
        statusText = problems > 0 ? t.problemsCount(problems) : t.allGood;
      }
      return { plant, dotClass, statusText };
    });

    if (this._config.sort_by_status !== false) {
      const rank = { danger: 0, warning: 1, ok: 2, neutral: 3 };
      evaluated.sort((a, b) => rank[a.dotClass] - rank[b.dotClass]);
    }

    evaluated.forEach(({ plant, dotClass, statusText }) => {
      const firstEntity =
        plant.moisture_entity || plant.temperature_entity || plant.illuminance_entity ||
        plant.conductivity_entity || plant.humidity_entity || plant.battery_entity;

      const row = document.createElement("div");
      row.className = "poc-row";
      row.innerHTML = `
        <span class="poc-dot ${dotClass}"></span>
        <div class="poc-name-wrap">
          <span class="poc-name">${plant.name || "?"}</span>
          <span class="poc-status">${statusText}</span>
        </div>
        <ha-icon icon="mdi:chevron-right"></ha-icon>
      `;
      row.addEventListener("click", () => this._fireMoreInfo(firstEntity));
      list.appendChild(row);
    });
  }
}

class PlantOverviewCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { plants: [], ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  get _t() {
    return STRINGS[getLang(this._hass)];
  }

  _emit() {
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })
    );
  }

  _updatePlant(index, key, value) {
    const plants = [...(this._config.plants || [])];
    plants[index] = { ...plants[index], [key]: value };
    if (value === "" || value === undefined) delete plants[index][key];
    this._config = { ...this._config, plants };
    this._emit();
  }

  _addPlant() {
    const plants = [...(this._config.plants || []), { name: "" }];
    this._config = { ...this._config, plants };
    this._emit();
    this._render();
  }

  _removePlant(index) {
    const plants = [...(this._config.plants || [])];
    plants.splice(index, 1);
    this._config = { ...this._config, plants };
    this._emit();
    this._render();
  }

  _applyPresetToPlant(index, presetId) {
    const preset = SPECIES_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const plants = [...(this._config.plants || [])];
    const next = { ...plants[index], species_preset: presetId };
    ["moisture", "temperature", "illuminance", "conductivity"].forEach((key) => {
      if (preset[key]) {
        next[`${key}_min`] = preset[key][0];
        next[`${key}_max`] = preset[key][1];
      }
    });
    if (!next.name) next.name = preset.label;
    plants[index] = next;
    this._config = { ...this._config, plants };
    this._emit();
    this._updateValues();
  }

  _render() {
    if (!this._hass) return;

    // Same issue as the single-plant card's editor: Home Assistant calls
    // setConfig()/the hass setter again after every "config-changed" event,
    // i.e. on every keystroke or entity-picker selection. Rebuilding the
    // whole innerHTML then would destroy and recreate every live
    // ha-entity-picker/ha-textfield mid-interaction, causing flicker and
    // aborted selections. So the DOM is only rebuilt when its shape
    // actually changes (plant added/removed, language switch, first
    // render); otherwise only values are updated in place.
    const plants = (this._config || {}).plants || [];
    if (
      !this.content ||
      this._builtLang !== getLang(this._hass) ||
      this._builtPlantCount !== plants.length
    ) {
      this._buildStructure();
    }
    this._updateValues();
  }

  _buildStructure() {
    const t = this._t;
    this._builtLang = getLang(this._hass);

    this.innerHTML = `<div class="poc-editor"></div>`;
    this.content = this.querySelector(".poc-editor");

    const cfg = this._config || {};
    const plants = cfg.plants || [];
    this._builtPlantCount = plants.length;

    const plantBlocks = plants
      .map((plant, index) => {
        const sensorRows = SENSOR_DEFS.map(
          (def) => `
          <div class="poc-sensor-row">
            <ha-entity-picker
              data-plant="${index}"
              data-key="${def.key}_entity"
              label="${t.labels[def.key]}"
              allow-custom-entity
            ></ha-entity-picker>
            <ha-textfield type="number" data-plant="${index}" data-key="${def.key}_min" label="${t.editor.min}"></ha-textfield>
            <ha-textfield type="number" data-plant="${index}" data-key="${def.key}_max" label="${t.editor.max}"></ha-textfield>
          </div>`
        ).join("");

        const presetOptions = SPECIES_CATEGORY_ORDER.map((cat) => {
          const items = SPECIES_PRESETS.filter((p) => p.category === cat);
          if (!items.length) return "";
          const optionsHtml = items.map((p) => `<option value="${p.id}">${p.label}</option>`).join("");
          return `<optgroup label="${t.editor.speciesCategory[cat] || cat}">${optionsHtml}</optgroup>`;
        }).join("");

        return `
          <div class="poc-plant-block">
            <div class="poc-plant-header">
              <ha-textfield data-plant="${index}" data-key="name" label="${t.editor.plantName}"></ha-textfield>
              <mwc-button data-remove="${index}">${t.editor.removePlant}</mwc-button>
            </div>
            <select class="poc-preset-select" data-preset-plant="${index}">
              <option value="">${t.editor.speciesPresetNone}</option>
              ${presetOptions}
            </select>
            ${sensorRows}
          </div>
        `;
      })
      .join("");

    this.content.innerHTML = `
      <style>
        .poc-editor { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
        .poc-plant-block {
          border: 1px solid var(--divider-color, #ccc); border-radius: 8px;
          padding: 10px; display: flex; flex-direction: column; gap: 8px;
        }
        .poc-plant-header { display: flex; align-items: center; gap: 8px; }
        .poc-plant-header ha-textfield { flex: 1; }
        .poc-preset-select {
          padding: 8px; border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #000);
          font: inherit;
        }
        .poc-sensor-row { display: flex; gap: 6px; align-items: flex-end; }
        .poc-sensor-row ha-entity-picker { flex: 2; }
        .poc-sensor-row ha-textfield { flex: 1; }
        .poc-switch-row { display: flex; align-items: center; justify-content: space-between; }
      </style>
      <ha-textfield id="poc-title-field" label="${t.editor.title}"></ha-textfield>
      ${plantBlocks}
      <mwc-button id="poc-add-plant" outlined>${t.editor.addPlant}</mwc-button>
      <div class="poc-switch-row">
        <span>${t.editor.sortByStatus}</span>
        <ha-switch id="poc-sort-by-status"></ha-switch>
      </div>
    `;

    // Event listeners are wired up exactly once per structure build. Values
    // are (re)applied separately in _updateValues() on every render pass.
    const titleField = this.content.querySelector("#poc-title-field");
    titleField.addEventListener("input", (e) => {
      this._config = { ...this._config, title: e.target.value };
      this._emit();
    });

    this.content.querySelectorAll("ha-entity-picker[data-plant]").forEach((picker) => {
      const index = Number(picker.dataset.plant);
      const key = picker.dataset.key;
      picker.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._updatePlant(index, key, ev.detail.value);
      });
    });

    this.content.querySelectorAll("ha-textfield[data-plant]").forEach((field) => {
      const index = Number(field.dataset.plant);
      const key = field.dataset.key;
      field.addEventListener("input", (e) => {
        const val = e.target.value;
        const isNumeric = key.endsWith("_min") || key.endsWith("_max");
        this._updatePlant(index, key, val === "" ? "" : isNumeric ? Number(val) : val);
      });
    });

    this.content.querySelectorAll("mwc-button[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => this._removePlant(Number(btn.dataset.remove)));
    });

    this.content.querySelectorAll(".poc-preset-select").forEach((select) => {
      const index = Number(select.dataset.presetPlant);
      select.addEventListener("change", (e) => {
        if (e.target.value) this._applyPresetToPlant(index, e.target.value);
      });
    });

    this.content.querySelector("#poc-add-plant").addEventListener("click", () => this._addPlant());

    const sortSwitch = this.content.querySelector("#poc-sort-by-status");
    sortSwitch.addEventListener("change", (e) => {
      this._config = { ...this._config, sort_by_status: e.target.checked };
      this._emit();
    });
  }

  // Applies the current config to the already-built DOM. Called on every
  // setConfig()/hass update. Skips whichever field currently has focus, so
  // a config-changed round-trip from the user's own edit doesn't fight
  // their cursor or close an open entity-picker dropdown mid-pick.
  _updateValues() {
    const root = this.content;
    if (!root) return;

    const cfg = this._config || {};
    const plants = cfg.plants || [];
    const active = root.contains(document.activeElement) ? document.activeElement : null;

    const titleField = root.querySelector("#poc-title-field");
    if (titleField && titleField !== active && titleField.value !== (cfg.title || "")) {
      titleField.value = cfg.title || "";
    }

    root.querySelectorAll("ha-entity-picker[data-plant]").forEach((picker) => {
      const index = Number(picker.dataset.plant);
      const key = picker.dataset.key;
      picker.hass = this._hass;
      if (picker !== active) picker.value = plants[index]?.[key] || "";
    });

    root.querySelectorAll("ha-textfield[data-plant]").forEach((field) => {
      const index = Number(field.dataset.plant);
      const key = field.dataset.key;
      if (field === active) return;
      const raw = plants[index]?.[key];
      const val = raw !== undefined ? String(raw) : "";
      if (field.value !== val) field.value = val;
    });

    root.querySelectorAll(".poc-preset-select").forEach((select) => {
      const index = Number(select.dataset.presetPlant);
      if (select === active) return;
      const val = plants[index]?.species_preset || "";
      if (select.value !== val) select.value = val;
    });

    const sortSwitch = root.querySelector("#poc-sort-by-status");
    if (sortSwitch) sortSwitch.checked = cfg.sort_by_status !== false;
  }
}

customElements.define("plant-overview-card", PlantOverviewCard);
customElements.define("plant-overview-card-editor", PlantOverviewCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "plant-overview-card",
  name: "Plant Overview Card",
  description: "Listet mehrere Pflanzen mit Ampel-Status auf einen Blick auf.",
  preview: true,
  documentationURL: "https://github.com/patrickbrundiers-dev/Plant_card-b",
});

console.info(
  `%c PLANT-OVERVIEW-CARD %c v${CARD_VERSION} `,
  "color: white; background: #4caf50; font-weight: 700;",
  "color: #4caf50; background: white; font-weight: 700;"
);
