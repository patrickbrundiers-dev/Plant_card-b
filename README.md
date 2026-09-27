# Plant Sensor Card

Eine eigene Lovelace-Karte für Home Assistant, die Pflanzensensor-Werte
(Feuchtigkeit, Temperatur, Licht, Leitfähigkeit, Luftfeuchtigkeit, Batterie)
übersichtlich anzeigt.

Die Karte bringt einen **visuellen Editor** mit: jeder Sensor wird per
**Dropdown (Entity-Picker)** aus deinen bestehenden Sensoren ausgewählt –
keine YAML-Bearbeitung nötig.

![Beispiel](https://raw.githubusercontent.com/patrickbrundiers-dev/Plant_card-b/main/example.png)

## Funktionen

- Dropdown-Auswahl für jeden Sensor-Typ (kein manuelles Eintippen von Entity-IDs)
- Funktioniert mit **jedem** Sensor, egal welche Integration dahintersteckt
  (Mi Flora / BLE, Zigbee, ESPHome, FYTA, Xiaomi, ...)
- Optionaler Name, Spezies und Bild für die Pflanze
- Optionale Min/Max-Schwellenwerte pro Sensor, die den Wert bei
  Unter-/Überschreitung farblich hervorheben
- Klick auf einen Wert öffnet den "Mehr Informationen"-Dialog der Entität

## Installation über HACS

1. HACS in Home Assistant öffnen.
2. Oben rechts auf die drei Punkte klicken → **Benutzerdefinierte Repositories**.
3. URL eintragen: `https://github.com/patrickbrundiers-dev/Plant_card-b`
   Kategorie: **Dashboard**.
4. Auf **Hinzufügen** klicken, dann die Karte in HACS suchen und **herunterladen**.
5. Browser mit Hard-Refresh neu laden (Strg+Shift+R).

Danach registriert HACS die Ressource automatisch. Falls nicht, unter
**Einstellungen → Dashboards → Ressourcen** manuell hinzufügen:

```
URL: /hacsfiles/Plant_card-b/plant-sensor-card.js
Typ: JavaScript-Modul
```

## Manuelle Installation

1. Datei `plant-sensor-card.js` herunterladen.
2. Nach `/config/www/plant-sensor-card.js` kopieren.
3. Unter **Einstellungen → Dashboards → Ressourcen** hinzufügen:
   ```
   URL: /local/plant-sensor-card.js
   Typ: JavaScript-Modul
   ```
4. Home Assistant neu starten bzw. Browser hart neu laden.

## Verwendung

### Über die Oberfläche (empfohlen)

1. Dashboard bearbeiten → **Karte hinzufügen**.
2. Nach **"Plant Sensor Card"** suchen.
3. Im Editor für jeden gewünschten Sensor per Dropdown die passende Entität
   auswählen (Feuchtigkeit, Temperatur, Licht, Leitfähigkeit, Batterie, ...).
4. Optional Name, Spezies, Bild-URL sowie Min-/Max-Werte eintragen.

### Per YAML

```yaml
type: custom:plant-sensor-card
name: Monstera
species: Monstera deliciosa
image: /local/monstera.jpg
moisture_entity: sensor.monstera_feuchtigkeit
moisture_min: 15
moisture_max: 60
temperature_entity: sensor.monstera_temperatur
temperature_min: 10
temperature_max: 30
illuminance_entity: sensor.monstera_licht
conductivity_entity: sensor.monstera_leitfaehigkeit
battery_entity: sensor.monstera_batterie
```

Nur die Felder eintragen, die du wirklich brauchst – nicht konfigurierte
Sensoren werden einfach nicht angezeigt.

## Unterstützte Sensor-Slots

| Feld                  | Anzeige            |
|-----------------------|---------------------|
| `moisture_entity`     | Erdfeuchtigkeit (%) |
| `temperature_entity`  | Temperatur (°C)     |
| `illuminance_entity`  | Licht (lx)          |
| `conductivity_entity` | Leitfähigkeit/Dünger|
| `humidity_entity`     | Luftfeuchtigkeit (%)|
| `battery_entity`      | Batterie (%)        |

Für `moisture`, `temperature`, `illuminance` und `conductivity` können
zusätzlich `_min` und `_max` gesetzt werden, um den Wert bei
Grenzwertüberschreitung rot hervorzuheben.

## Lizenz

MIT
