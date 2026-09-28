# Plant Sensor Card

Eigene Lovelace-Karten für Home Assistant, die Pflanzensensor-Werte
übersichtlich anzeigen, automatisch Pflegehinweise ableiten und dir sagen,
was mit der Pflanze zu tun ist.

Die Karte bringt einen **visuellen Editor** mit: jeder Sensor wird per
**Dropdown (Entity-Picker)** aus deinen bestehenden Sensoren ausgewählt –
keine YAML-Bearbeitung nötig.

![Beispiel](https://raw.githubusercontent.com/patrickbrundiers-dev/Plant_card-b/main/example.png)

Dieses Repository enthält zwei Karten:

| Datei                      | Karte                  | Wofür                                                   |
|-----------------------------|-------------------------|----------------------------------------------------------|
| `plant-sensor-card.js`      | **Plant Sensor Card**   | Detailkarte für eine einzelne Pflanze                     |
| `plant-overview-card.js`    | **Plant Overview Card** | Kompakte Liste mehrerer Pflanzen mit Ampel-Status         |

Außerdem liegt ein Automation-Blueprint bei, um bei Grenzwertüberschreitung
eine Push-Benachrichtigung zu erhalten – unabhängig davon, ob ein Dashboard
gerade geöffnet ist.

## Funktionen

**Plant Sensor Card**
- Modernes Design mit Gesundheits-Ring (Anteil der Sensoren im Sollbereich),
  Positions-Punkt je Sensor zwischen Min und Max, und einer Serifen-Headline
  (Fraunces) kombiniert mit klarer Groteska (Manrope) für Werte
- Dropdown-Auswahl für jeden Sensor-Typ (kein manuelles Eintippen von Entity-IDs)
- Funktioniert mit **jedem** Sensor, egal welche Integration dahintersteckt
  (Mi Flora / BLE, Zigbee, ESPHome, FYTA, Xiaomi, ...)
- Optionaler Name, Spezies und Bild für die Pflanze
- **Pflanzenart-Vorlagen**: über 30 Vorlagen, gruppiert nach Zimmerpflanzen,
  Sukkulenten/Kakteen und Kräuter/Balkon (z. B. Monstera, Sansevieria,
  Orchidee, Calathea, Efeutute, Echeveria, Rosmarin, Tomate, ...) – Auswahl
  füllt die Min/Max-Werte automatisch mit typischen Richtwerten
- **Grenzwerte jederzeit manuell festlegen**: die Min/Max-Felder pro Sensor
  bleiben nach Anwenden einer Vorlage ganz normal editierbar, und mit
  „Keine Vorlage" lassen sich alle Schwellenwerte komplett frei eintragen
- Min/Max-Schwellenwerte pro Sensor, die den Wert bei Über-/Unterschreitung
  farblich hervorheben
- **Bereichsanzeige** je Sensor: ein Punkt zeigt, wo der aktuelle Wert
  zwischen Min und Max liegt (lässt sich abschalten)
- **Automatische Pflegehinweise**: sobald ein Wert außerhalb von Min/Max
  liegt, erscheint unter der Karte eine konkrete Handlungsempfehlung
  (z. B. "Erde ist zu trocken – gieße die Pflanze zeitnah.",
  "Zu wenig Licht – näher ans Fenster stellen."). Sind alle Werte in
  Ordnung, zeigt die Karte das ebenfalls an.
- **Verzögerte Hinweise**: ein Hinweis erscheint erst, wenn die
  Grenzwertüberschreitung eine einstellbare Zeit lang anhält – so lösen
  kurze Ausreißer (z. B. direkt nach dem Gießen) keinen Fehlalarm aus. Die
  Karte schaut dafür auch ein Stück in den Home-Assistant-Verlauf zurück,
  damit das auch nach einem Dashboard-Neuladen korrekt funktioniert.
- **Trendpfeile & Mini-Verlaufsgrafik**: zeigt neben jedem Wert einen
  kleinen ↑/↓-Pfeil sowie darunter eine kompakte Verlaufslinie der letzten
  ~12 Stunden, wenn sich ein Sensor spürbar verändert (Datenbasis:
  Home-Assistant-Verlauf, alle 20 Minuten aktualisiert)
- **Gieß-Vorhersage**: sinkt die Feuchtigkeit stetig und der Min-Wert ist
  noch nicht erreicht, schätzt die Karte anhand des Trends, in wie vielen
  Tagen vermutlich gegossen werden muss – als ruhiger Hinweis, bevor es
  akut wird
- **Gelerntes Gießintervall**: mit einem "zuletzt gegossen"-Helfer lernt die
  Karte aus dem Verlauf, wie oft normalerweise gegossen wird, und meldet
  sich, wenn die aktuelle Pause deutlich länger ist als sonst – auch ganz
  ohne gesetzte Feuchtigkeits-Schwellenwerte
- **Schweregrade bei Hinweisen**: Pflegehinweise werden farblich nach
  Dringlichkeit sortiert – rot (deutliche Abweichung/deutlich überfällig),
  orange (normale Grenzwertüberschreitung), grün-neutral (Vorhersage/Info)
- **"Zuletzt gegossen" & "Zuletzt gedüngt"**: je optional mit einem eigenen
  `input_datetime`-Helfer verknüpfen; die Karte zeigt "Vor X Tagen
  gegossen/gedüngt" an, bietet je einen Button zum Setzen auf jetzt, und
  zeigt (sobald genug Verlauf vorliegt) das gelernte Intervall ("Ø alle X
  Tage") direkt daneben an
- **Kombi-Hinweis bei trockener Erde + trockener Luft**: erscheint
  zusätzlich, wenn beide gleichzeitig unter ihrem Min-Wert liegen, da sich
  das gegenseitig verstärkt
- **Saisonale Anpassung (optional)**: lockert im Winter (Dez/Jan/Feb) die
  "zu trocken"-Schwelle für Feuchtigkeit um 20 %, um Fehlalarme zu
  vermeiden – wirkt nur auf Hinweise, nicht auf den angezeigten Min-Wert
- **Konfiguration als YAML kopieren & einfügen**: Button im Editor, um die
  aktuelle Kartenkonfiguration zum Sichern oder Teilen in die Zwischenablage
  zu kopieren; über ein Textfeld direkt darunter lässt sich eine zuvor
  kopierte YAML-Konfiguration auch wieder einfügen und übernehmen – praktisch
  zum Duplizieren einer Pflanze oder zum Wiederherstellen einer Sicherung
- **Kompaktmodus**: über einen Schalter im Editor aktivierbar, macht die
  Karte deutlich kleiner (schmalerer Ring, ohne Mini-Verlaufsgrafik) – für
  Dashboards mit vielen Pflanzen nebeneinander
- **Passendes Symbol ohne Bild**: ist kein Bild hinterlegt, zeigt die Karte
  je nach gewählter Pflanzenart-Vorlage ein passendes Symbol (Kaktus für
  Sukkulenten, Kräuter-Symbol für Kräuter, Blatt für Zimmerpflanzen) statt
  eines generischen Platzhalters
- Die Batterie bekommt automatisch einen sinnvollen Standard-Grenzwert (20 %)
- Verfügbar auf Deutsch, Englisch, Französisch und Spanisch (folgt
  automatisch der Home-Assistant-Spracheinstellung)
- Klick auf einen Wert oder Hinweis öffnet den "Mehr Informationen"-Dialog
  der zugehörigen Entität (inkl. Verlaufsgrafik, wie von Home Assistant
  gewohnt)

**Plant Overview Card**
- Listet mehrere Pflanzen mit Ampel-Punkt auf: grün (alles ok), orange
  (Hinweis), rot (deutliche Abweichung – dieselbe Schwerelogik wie bei der
  Einzelkarte), grau (keine Grenzwerte gesetzt)
- Zeigt pro Pflanze die Anzahl offener Hinweise
- **Sortiert automatisch nach Dringlichkeit** (rot vor orange vor grün vor
  grau), abschaltbar über einen Schalter im Editor
- **Pflanzenart-Vorlagen** auch hier verfügbar, pro Pflanze im Editor
  auswählbar (gleiche gruppierte Liste wie bei der Einzelkarte)
- **Kompaktmodus**: schaltbar im Editor, zeigt schmalere Zeilen – nützlich
  bei längeren Pflanzenlisten
- Eigener Editor zum Hinzufügen/Entfernen von Pflanzen und deren Sensoren

## Installation über HACS

1. HACS in Home Assistant öffnen.
2. Oben rechts auf die drei Punkte klicken → **Benutzerdefinierte Repositories**.
3. URL eintragen: `https://github.com/patrickbrundiers-dev/Plant_card-b`
   Kategorie: **Dashboard**.
4. Auf **Hinzufügen** klicken, dann die Karte in HACS suchen und **herunterladen**.
5. Browser mit Hard-Refresh neu laden (Strg+Shift+R).

Danach registriert HACS die Hauptkarte (`plant-sensor-card.js`) automatisch
als Ressource. Willst du zusätzlich die **Plant Overview Card**, füge sie
manuell als zweite Ressource hinzu (**Einstellungen → Dashboards →
Ressourcen → Ressource hinzufügen**):

```
URL: /hacsfiles/Plant_card-b/plant-overview-card.js
Typ: JavaScript-Modul
```

## Manuelle Installation

1. Gewünschte Datei(en) herunterladen: `plant-sensor-card.js` und/oder
   `plant-overview-card.js`.
2. Nach `/config/www/` kopieren.
3. Unter **Einstellungen → Dashboards → Ressourcen** je Datei hinzufügen:
   ```
   URL: /local/plant-sensor-card.js
   Typ: JavaScript-Modul
   ```
4. Browser hart neu laden (Strg+Shift+R).

## Verwendung: Plant Sensor Card

### Über die Oberfläche (empfohlen)

1. Dashboard bearbeiten → **Karte hinzufügen**.
2. Nach **"Plant Sensor Card"** suchen.
3. Optional eine **Pflanzenart-Vorlage** wählen, um Min/Max vorauszufüllen.
4. Für jeden gewünschten Sensor per Dropdown die passende Entität auswählen.
5. Optional: Verzögerung für Hinweise, Sparkline an/aus, "zuletzt gegossen"-Helfer.

### Per YAML

```yaml
type: custom:plant-sensor-card
name: Monstera
species: Monstera deliciosa
image: /local/monstera.jpg
moisture_entity: sensor.monstera_feuchtigkeit
moisture_min: 20
moisture_max: 60
temperature_entity: sensor.monstera_temperatur
temperature_min: 18
temperature_max: 27
illuminance_entity: sensor.monstera_licht
illuminance_min: 1000
conductivity_entity: sensor.monstera_leitfaehigkeit
battery_entity: sensor.monstera_batterie
watered_entity: input_datetime.monstera_gegossen
advice_delay_minutes: 30
show_advice: true
show_sparkline: true
```

Nur die Felder eintragen, die du wirklich brauchst – nicht konfigurierte
Sensoren werden einfach nicht angezeigt.

### Unterstützte Sensor-Slots

| Feld                  | Anzeige              |
|-----------------------|------------------------|
| `moisture_entity`     | Erdfeuchtigkeit (%)   |
| `temperature_entity`  | Temperatur (°C)       |
| `illuminance_entity`  | Licht (lx)            |
| `conductivity_entity` | Leitfähigkeit/Dünger  |
| `humidity_entity`     | Luftfeuchtigkeit (%)  |
| `battery_entity`      | Batterie (%)          |

Für alle außer `battery` können zusätzlich `_min` und `_max` gesetzt werden.
`battery` bekommt automatisch `min: 20`, falls nichts anderes angegeben ist.

### Weitere Optionen

| Option                    | Beschreibung                                                             |
|----------------------------|---------------------------------------------------------------------------|
| `show_advice`              | Pflegehinweise ein-/ausblenden (Standard: `true`)                        |
| `show_sparkline`           | Bereichsanzeige je Sensor ein-/ausblenden (Standard: `true`)             |
| `show_trend`               | Trendpfeile + Mini-Verlaufsgrafik je Sensor ein-/ausblenden (Standard: `true`) |
| `show_predictions`         | Gieß-/Düngeprognose und gelernte Intervalle ein-/ausblenden (Standard: `true`) |
| `advice_delay_minutes`     | Wie lange eine Grenzwertüberschreitung anhalten muss, bevor ein Hinweis erscheint (Standard: `0`) |
| `watered_entity`           | Ein `input_datetime`-Helfer für "zuletzt gegossen" inkl. Button          |
| `fertilized_entity`        | Ein `input_datetime`-Helfer für "zuletzt gedüngt" inkl. Button           |
| `seasonal_adjustment`      | Lockert im Winter die "zu trocken"-Schwelle für Feuchtigkeit um 20 % (Standard: `false`) |
| `species_preset`           | Wird von der Editor-Vorlagenauswahl gesetzt, kann aber auch manuell angegeben werden |
| `compact`                  | Kompaktere Darstellung für Dashboards mit vielen Pflanzen (Standard: `false`) |

Für `watered_entity`/`fertilized_entity` legst du vorher unter
**Einstellungen → Geräte & Dienste → Helfer → Helfer hinzufügen → Datum
und/oder Uhrzeit** je einen `input_datetime`-Helfer an.

## Verwendung: Plant Overview Card

Über die Oberfläche: Karte hinzufügen → **"Plant Overview Card"** suchen →
mit **"+ Pflanze hinzufügen"** beliebig viele Pflanzen mit ihren Sensoren
und Grenzwerten eintragen (dieselben Felder wie bei der Einzelkarte).

Per YAML:

```yaml
type: custom:plant-overview-card
title: Meine Pflanzen
plants:
  - name: Monstera
    moisture_entity: sensor.monstera_feuchtigkeit
    moisture_min: 20
    moisture_max: 60
  - name: Basilikum
    moisture_entity: sensor.basilikum_feuchtigkeit
    moisture_min: 30
    battery_entity: sensor.basilikum_sensor_batterie
sort_by_status: true
```

`sort_by_status` (Standard `true`) sortiert die Liste automatisch so, dass
Pflanzen mit dem dringendsten Handlungsbedarf oben stehen (rot vor orange
vor grün vor grau); `false` behält die Reihenfolge aus `plants` bei.

`compact` (Standard `false`) zeigt die Liste mit schmaleren Zeilen an –
praktisch, wenn viele Pflanzen auf einmal auf dem Dashboard stehen.

## Benachrichtigungen per Automation-Blueprint

Die Karte selbst kann keine Push-Benachrichtigungen senden – dafür liegt ein
Blueprint bei, das unabhängig vom Dashboard funktioniert:

1. In Home Assistant: **Einstellungen → Automatisierungen & Szenen →
   Blueprints → Blueprint importieren**.
2. URL einfügen:
   `https://github.com/patrickbrundiers-dev/Plant_card-b/blob/main/blueprints/automation/patrickbrundiers-dev/plant_sensor_notify.yaml`
3. Aus dem importierten Blueprint eine neue Automation erstellen: Sensor,
   Grenzwert(e), Mindestdauer und Ziel-`notify`-Dienst auswählen.

Wird nur ein Grenzwert gebraucht (z. B. nur "unter"), den jeweils anderen
auf einen Wert setzen, der praktisch nie erreicht wird (z. B. `-1` für
"oberer Grenzwert" bei einem Prozentsensor).

## Entwicklung & Tests

Im Ordner `tests/` liegt eine Playwright-basierte Testsuite, die den
Editor und die Kartenlogik gegen kleine Attrappen der echten
Home-Assistant-Frontend-Elemente prüft (Sensorauswahl, Vorlagen,
Schwellenwert-Hinweise, YAML-Export/-Import, gelernte Intervalle, u. a.).

```bash
npm install
npx playwright install --with-deps chromium
npm test
```

Ein GitHub-Actions-Workflow (`.github/workflows/test.yml`) führt die
gleiche Suite bei jedem Push und Pull Request automatisch aus.

## Lizenz

MIT
