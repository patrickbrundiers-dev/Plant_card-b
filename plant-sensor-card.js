/**
 * Plant Sensor Card
 * A custom Lovelace card for Home Assistant that shows plant sensor
 * readings (moisture, temperature, illuminance, conductivity, battery).
 *
 * The card comes with a visual editor: every sensor slot is a dropdown
 * (entity picker) so you just pick your existing sensors - no YAML needed.
 *
 * https://github.com/patrickbrundiers-dev/Plant_card-b
 */

const CARD_VERSION = "1.0.0";

const SENSOR_DEFS = [
  { key: "moisture", label: "Feuchtigkeit", icon: "mdi:water-percent", unit: "%", deviceClass: "moisture" },
  { key: "temperature", label: "Temperatur", icon: "mdi:thermometer", unit: "°C", deviceClass: "temperature" },
  { key: "illuminance", label: "Licht", icon: "mdi:white-balance-sunny", unit: "lx", deviceClass: "illuminance" },
  { key: "conductivity", label: "Leitfähigkeit / Dünger", icon: "mdi:flower-outline", unit: "µS/cm", deviceClass: null },
  { key: "humidity", label: "Luftfeuchtigkeit", icon: "mdi:water", unit: "%", deviceClass: "humidity" },
  { key: "battery", label: "Batterie", icon: "mdi:battery", unit: "%", deviceClass: "battery" },
];

class PlantSensorCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("plant-sensor-card-editor");
  }

  static getStubConfig(hass) {
    return {
      type: "custom:plant-sensor-card",
      name: "Meine Pflanze",
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Bitte Karte konfigurieren.");
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
              grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
              gap: 12px;
            }
            .psc-item {
              display: flex; align-items: center; gap: 8px;
              padding: 8px; border-radius: 8px;
              background: var(--secondary-background-color, rgba(0,0,0,0.04));
            }
            .psc-item ha-icon, .psc-item svg {
              --mdc-icon-size: 22px;
              color: var(--state-icon-color, var(--paper-item-icon-color));
            }
            .psc-item.problem ha-icon { color: var(--error-color, #db4437); }
            .psc-value-wrap { display: flex; flex-direction: column; line-height: 1.2; }
            .psc-value { font-weight: 500; }
            .psc-label { font-size: 0.75em; color: var(--secondary-text-color); }
          </style>
        </ha-card>
      `;
      this.content = this.querySelector(".psc-card");
    }

    const name = this._config.name || "Pflanze";
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

    SENSOR_DEFS.forEach((def) => {
      const entityId = this._config[`${def.key}_entity`];
      if (!entityId) return;

      const stateObj = this._stateOf(entityId);
      const value = this._formatValue(stateObj, def.unit);

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
        <ha-icon icon="${def.icon}"></ha-icon>
        <div class="psc-value-wrap">
          <span class="psc-value">${value}</span>
          <span class="psc-label">${def.label}</span>
        </div>
      `;
      item.style.cursor = "pointer";
      item.addEventListener("click", () => {
        const ev = new CustomEvent("hass-more-info", {
          detail: { entityId },
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(ev);
      });
      grid.appendChild(item);
    });

    if (!grid.children.length) {
      grid.innerHTML = `<div class="psc-label">Keine Sensoren konfiguriert. Karte im Editor bearbeiten.</div>`;
    }
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

  _render() {
    if (!this._hass) return;

    if (!this.content) {
      this.innerHTML = `<div class="psc-editor"></div>`;
      this.content = this.querySelector(".psc-editor");
    }

    const cfg = this._config || {};

    const sensorRows = SENSOR_DEFS.map((def) => {
      return `
        <div class="psc-row" data-key="${def.key}_entity">
          <ha-entity-picker
            data-key="${def.key}_entity"
            label="${def.label}"
            allow-custom-entity
          ></ha-entity-picker>
        </div>
      `;
    }).join("");

    this.content.innerHTML = `
      <style>
        .psc-editor { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
        .psc-row { width: 100%; }
        .psc-section-title {
          font-weight: 500; margin-top: 8px; color: var(--secondary-text-color);
        }
      </style>
      <ha-textfield
        id="psc-name"
        label="Name der Pflanze"
        .value="${cfg.name || ""}"
      ></ha-textfield>
      <ha-textfield
        id="psc-species"
        label="Art / Spezies (optional)"
        .value="${cfg.species || ""}"
      ></ha-textfield>
      <ha-textfield
        id="psc-image"
        label="Bild-URL (optional)"
        .value="${cfg.image || ""}"
      ></ha-textfield>
      <div class="psc-section-title">Sensoren (per Dropdown auswählen)</div>
      ${sensorRows}
    `;

    // Wire text fields
    const nameField = this.content.querySelector("#psc-name");
    nameField.addEventListener("input", (e) => this._valueChanged("name", e.target.value));

    const speciesField = this.content.querySelector("#psc-species");
    speciesField.addEventListener("input", (e) => this._valueChanged("species", e.target.value));

    const imageField = this.content.querySelector("#psc-image");
    imageField.addEventListener("input", (e) => this._valueChanged("image", e.target.value));

    // Wire entity pickers (dropdowns)
    this.content.querySelectorAll("ha-entity-picker").forEach((picker) => {
      const key = picker.dataset.key;
      picker.hass = this._hass;
      picker.value = cfg[key] || "";
      picker.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._valueChanged(key, ev.detail.value);
      });
    });
  }
}

customElements.define("plant-sensor-card", PlantSensorCard);
customElements.define("plant-sensor-card-editor", PlantSensorCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "plant-sensor-card",
  name: "Plant Sensor Card",
  description: "Zeigt Pflanzensensor-Werte an; Sensoren werden im Editor per Dropdown ausgewählt.",
  preview: true,
  documentationURL: "https://github.com/patrickbrundiers-dev/Plant_card-b",
});

console.info(
  `%c PLANT-SENSOR-CARD %c v${CARD_VERSION} `,
  "color: white; background: #4caf50; font-weight: 700;",
  "color: #4caf50; background: white; font-weight: 700;"
);
