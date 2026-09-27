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

const CARD_VERSION = "1.1.0";

const SENSOR_DEFS = [
  { key: "moisture", label: "Feuchtigkeit", icon: "mdi:water-percent", unit: "%", deviceClass: "moisture" },
  { key: "temperature", label: "Temperatur", icon: "mdi:thermometer", unit: "°C", deviceClass: "temperature" },
  { key: "illuminance", label: "Licht", icon: "mdi:white-balance-sunny", unit: "lx", deviceClass: "illuminance" },
  { key: "conductivity", label: "Leitfähigkeit / Dünger", icon: "mdi:flower-outline", unit: "µS/cm", deviceClass: null },
  { key: "humidity", label: "Luftfeuchtigkeit", icon: "mdi:water", unit: "%", deviceClass: "humidity" },
  { key: "battery", label: "Batterie", icon: "mdi:battery", unit: "%", deviceClass: "battery" },
];

// Care advice generated per sensor once a min/max threshold is crossed.
// "low" fires when the value is below _min, "high" when it is above _max.
const ADVICE_RULES = {
  moisture: {
    low: {
      icon: "mdi:watering-can",
      severity: "warning",
      text: "Erde ist zu trocken – gieße die Pflanze zeitnah.",
    },
    high: {
      icon: "mdi:water-off",
      severity: "warning",
      text: "Erde ist zu nass – nicht gießen und Drainage/Übertopf prüfen.",
    },
  },
  temperature: {
    low: {
      icon: "mdi:snowflake",
      severity: "warning",
      text: "Zu kalt für die Pflanze – wärmeren Standort ohne Zugluft wählen.",
    },
    high: {
      icon: "mdi:thermometer-alert",
      severity: "warning",
      text: "Zu warm – vor direkter Heizungs-/Sonnenwärme schützen.",
    },
  },
  illuminance: {
    low: {
      icon: "mdi:weather-sunset-down",
      severity: "info",
      text: "Zu wenig Licht – näher ans Fenster stellen oder Pflanzenlampe nutzen.",
    },
    high: {
      icon: "mdi:sun-thermometer",
      severity: "info",
      text: "Zu viel direktes Licht – etwas vom Fenster wegrücken oder abschatten.",
    },
  },
  conductivity: {
    low: {
      icon: "mdi:bottle-tonic-plus-outline",
      severity: "info",
      text: "Nährstoffe niedrig – in den nächsten Tagen düngen.",
    },
    high: {
      icon: "mdi:alert-outline",
      severity: "warning",
      text: "Zu viel Dünger im Substrat – mit klarem Wasser durchspülen, Düngepause einlegen.",
    },
  },
  humidity: {
    low: {
      icon: "mdi:air-humidifier",
      severity: "info",
      text: "Luft ist zu trocken – besprühen oder Luftbefeuchter aufstellen.",
    },
    high: {
      icon: "mdi:weather-fog",
      severity: "info",
      text: "Luftfeuchtigkeit sehr hoch – für bessere Belüftung sorgen (Pilzgefahr).",
    },
  },
  battery: {
    low: {
      icon: "mdi:battery-alert",
      severity: "warning",
      text: "Sensorbatterie wird schwach – bald austauschen.",
    },
  },
};

const DEFAULT_BATTERY_MIN = 20;

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

  // Compares every configured sensor against its min/max and returns a
  // list of care-advice entries { icon, severity, text, entityId }.
  _generateAdvice() {
    const advice = [];
    let anyThresholdConfigured = false;

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

      const rules = ADVICE_RULES[def.key];
      if (!rules) return;

      if (minAttr !== undefined && minAttr !== "") {
        anyThresholdConfigured = true;
        if (num < Number(minAttr) && rules.low) {
          advice.push({ ...rules.low, entityId });
        }
      }
      if (maxAttr !== undefined && maxAttr !== "") {
        anyThresholdConfigured = true;
        if (num > Number(maxAttr) && rules.high) {
          advice.push({ ...rules.high, entityId });
        }
      }
    });

    return { advice, anyThresholdConfigured };
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
              border-left: 3px solid var(--info-color, #039be5);
              font-size: 0.88em; line-height: 1.35;
            }
            .psc-advice-item.warning { border-left-color: var(--warning-color, #ff9800); }
            .psc-advice-item.ok { border-left-color: var(--success-color, #4caf50); }
            .psc-advice-item ha-icon {
              --mdc-icon-size: 20px; flex-shrink: 0; margin-top: 1px;
              color: var(--info-color, #039be5);
            }
            .psc-advice-item.warning ha-icon { color: var(--warning-color, #ff9800); }
            .psc-advice-item.ok ha-icon { color: var(--success-color, #4caf50); }
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

    this._renderAdvice();
  }

  _renderAdvice() {
    const adviceEl = this.querySelector(".psc-advice");
    if (!adviceEl) return;

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
          <span>Alle Werte im Sollbereich – aktuell ist nichts zu tun.</span>
        </div>
      `;
    } else {
      itemsHtml = advice
        .map(
          (a) => `
        <div class="psc-advice-item ${a.severity}" data-entity="${a.entityId}">
          <ha-icon icon="${a.icon}"></ha-icon>
          <span>${a.text}</span>
        </div>
      `
        )
        .join("");
    }

    adviceEl.innerHTML = `
      <div class="psc-advice-title">Was zu tun ist</div>
      ${itemsHtml}
    `;

    adviceEl.querySelectorAll(".psc-advice-item[data-entity]").forEach((el) => {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        const ev = new CustomEvent("hass-more-info", {
          detail: { entityId: el.dataset.entity },
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(ev);
      });
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
      const hasThreshold = !!ADVICE_RULES[def.key];
      const thresholdRow = hasThreshold
        ? `
        <div class="psc-threshold-row">
          <ha-textfield
            type="number"
            data-key="${def.key}_min"
            label="Min ${def.unit ? `(${def.unit})` : ""}"
          ></ha-textfield>
          <ha-textfield
            type="number"
            data-key="${def.key}_max"
            label="Max ${def.unit ? `(${def.unit})` : ""}"
          ></ha-textfield>
        </div>`
        : "";

      return `
        <div class="psc-row" data-key="${def.key}_entity">
          <ha-entity-picker
            data-key="${def.key}_entity"
            label="${def.label}"
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
      </style>
      <ha-textfield
        id="psc-name"
        label="Name der Pflanze"
      ></ha-textfield>
      <ha-textfield
        id="psc-species"
        label="Art / Spezies (optional)"
      ></ha-textfield>
      <ha-textfield
        id="psc-image"
        label="Bild-URL (optional)"
      ></ha-textfield>
      <div class="psc-section-title">Sensoren (per Dropdown auswählen)</div>
      <div class="psc-hint">
        Min/Max sind optional. Wenn gesetzt, erscheint bei Über-/Unterschreitung
        automatisch ein Pflegehinweis unter der Karte (z. B. „gießen“, „mehr Licht“).
      </div>
      ${sensorRows}
      <div class="psc-switch-row">
        <span>Pflegehinweise anzeigen</span>
        <ha-switch id="psc-show-advice"></ha-switch>
      </div>
    `;

    // Wire text fields (set value as a property, then listen for input)
    const nameField = this.content.querySelector("#psc-name");
    nameField.value = cfg.name || "";
    nameField.addEventListener("input", (e) => this._valueChanged("name", e.target.value));

    const speciesField = this.content.querySelector("#psc-species");
    speciesField.value = cfg.species || "";
    speciesField.addEventListener("input", (e) => this._valueChanged("species", e.target.value));

    const imageField = this.content.querySelector("#psc-image");
    imageField.value = cfg.image || "";
    imageField.addEventListener("input", (e) => this._valueChanged("image", e.target.value));

    // Wire min/max threshold fields
    this.content.querySelectorAll(".psc-threshold-row ha-textfield").forEach((field) => {
      const key = field.dataset.key;
      field.value = cfg[key] !== undefined ? String(cfg[key]) : "";
      field.addEventListener("input", (e) => {
        const raw = e.target.value;
        this._valueChanged(key, raw === "" ? "" : Number(raw));
      });
    });

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

    // Wire the show-advice toggle
    const adviceSwitch = this.content.querySelector("#psc-show-advice");
    adviceSwitch.checked = cfg.show_advice !== false;
    adviceSwitch.addEventListener("change", (e) => {
      this._valueChanged("show_advice", e.target.checked);
    });
  }
}

customElements.define("plant-sensor-card", PlantSensorCard);
customElements.define("plant-sensor-card-editor", PlantSensorCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "plant-sensor-card",
  name: "Plant Sensor Card",
  description: "Zeigt Pflanzensensor-Werte an und gibt automatisch Pflegehinweise; Sensoren werden im Editor per Dropdown ausgewählt.",
  preview: true,
  documentationURL: "https://github.com/patrickbrundiers-dev/Plant_card-b",
});

console.info(
  `%c PLANT-SENSOR-CARD %c v${CARD_VERSION} `,
  "color: white; background: #4caf50; font-weight: 700;",
  "color: #4caf50; background: white; font-weight: 700;"
);
