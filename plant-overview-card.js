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

const CARD_VERSION = "1.1.0";

const SENSOR_DEFS = [
  { key: "moisture", icon: "mdi:water-percent", unit: "%" },
  { key: "temperature", icon: "mdi:thermometer", unit: "°C" },
  { key: "illuminance", icon: "mdi:white-balance-sunny", unit: "lx" },
  { key: "conductivity", icon: "mdi:flower-outline", unit: "µS/cm" },
  { key: "humidity", icon: "mdi:water", unit: "%" },
  { key: "battery", icon: "mdi:battery", unit: "%" },
];

const DEFAULT_BATTERY_MIN = 20;

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

    plants.forEach((plant) => {
      const { configured, problems, dangerProblems } = evaluatePlant(this._hass, plant);
      let dotClass = "neutral";
      let statusText = t.noThresholds;
      if (configured) {
        dotClass = dangerProblems > 0 ? "danger" : problems > 0 ? "warning" : "ok";
        statusText = problems > 0 ? t.problemsCount(problems) : t.allGood;
      }

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

        return `
          <div class="poc-plant-block">
            <div class="poc-plant-header">
              <ha-textfield data-plant="${index}" data-key="name" label="${t.editor.plantName}"></ha-textfield>
              <mwc-button data-remove="${index}">${t.editor.removePlant}</mwc-button>
            </div>
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
        .poc-sensor-row { display: flex; gap: 6px; align-items: flex-end; }
        .poc-sensor-row ha-entity-picker { flex: 2; }
        .poc-sensor-row ha-textfield { flex: 1; }
      </style>
      <ha-textfield id="poc-title-field" label="${t.editor.title}"></ha-textfield>
      ${plantBlocks}
      <mwc-button id="poc-add-plant" outlined>${t.editor.addPlant}</mwc-button>
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

    this.content.querySelector("#poc-add-plant").addEventListener("click", () => this._addPlant());
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
