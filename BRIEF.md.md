# Brief till Claude Code — Fingerstyrkeprojektet

*Konsoliderad spec från planering + förundersökning (aug 2026). Ägare: Måns.*
*Läs hela dokumentet innan du börjar. Del D listar det som ännu är obestämt — fråga hellre än gissa där.*

---

## Vad som byggs

En DIY-ersättare för Climbro: en lastcell sitter mellan en enhands-hangboard (4 fingrar, justerbart greppdjup) och taket. Användaren står på golvet och drar nedåt — cellen ser alltså **bara fingerkraften, aldrig kroppsvikten**. En ESP32 läser cellen och streamar kraft via BLE.

Två kodbaser:

- **Del A — Firmware**: ESP32-C3 som implementerar Tindeqs öppna Progressor-API. Ger fungerande produkt dag 1 med Tindeqs officiella app (iOS + Android).
- **Del B — Appmodul** (byggs in i Måns befintliga stretchapp, en webapp: Vite + TypeScript + Supabase): Web Bluetooth, Climbro-likt realtids-UI, träningsprogram och tester enligt förundersökningen, historik, adaptiv belastning.

**Repostruktur: monorepo.** Firmwaren bor i mappen `firmware/` i stretchappens repo. Skapa den inte för hand — scaffolda med PlatformIO (`platformio.ini` med `board = seeed_xiao_esp32c3`, `src/main.cpp`, `.gitignore`-poster för `.pio/`). Ett repo betyder en BRIEF.md, och att app-sidan kan läsa firmware-källan när TLV-parsningen ska matcha. Se till att befintlig CI/deploy i `.github/` path-filtreras så firmware-ändringar inte triggar app-deploy.

Fas 1 = firmware + Tindeqs app. Fas 2 = egen appmodul. **Inga firmwareändringar mellan faserna** — den egna modulen pratar samma Progressor-API.

---

## Del A — Firmware

### Hårdvara (köpt och på väg)

| Komponent | Detalj |
|---|---|
| Seeed Xiao ESP32-C3 | BLE 5, inbyggd LiPo-laddkrets, USB-C. Board: `seeed_xiao_esp32c3` |
| Adafruit NAU7802 | 24-bit ADC för lastcell, I2C **0x2A** (fast adress), Qwiic, skruvterminaler |
| OLED 0.96" 128×64 (SSD1306) | I2C **0x3C** (fast adress), Qwiic ×2, vit |
| LiPo 3,7 V 1200 mAh | JST-PH, med skyddskrets |
| 2× 100 kΩ 1 % + 100 nF | Spänningsdelare för batterinivå |
| TOPWAY minikranvåg 150 kg | Donator: lastcell (Wheatstone, 4 ledare), hölje, ögla |

### Inkoppling

```
I2C-kedja (3,3 V rakt igenom):
  Xiao D4 = SDA (GPIO6), D5 = SCL (GPIO7)
  → NAU7802 (0x2A) via Qwiic→dupont-kabel
  → OLED (0x3C) via Qwiic→Qwiic-kabel (kedjad från NAU7802)

Lastcell → NAU7802 skruvterminaler: E+, E–, A+, A–
  (verifiera med multimeter: excitationsparet har ~350 Ω konstant,
   oberoende av last; färger brukar vara röd=E+, svart=E–, grön=A+, vit=A–)

Batterinivå:
  BAT+ ──100k──┬──100k── GND
               ├── A1 (D1/GPIO3)
             100nF
               └── GND
```

### Hårda regler

- **JST-PH-polaritet är INTE standardiserad.** Klipp aldrig i batterikabeln. Mät med multimeter vilken ledare som är +, löd den till BAT+. Batteriet lödas **sist**, när allt fungerar över USB.
- Använd aldrig **A0 (GPIO2)** — strapping-pin — eller **A3 (GPIO5)** — ADC2, opålitlig när radion sänder. Undvik även D8/D9 (strapping).
- C3:ans ADC är olinjär och mättar ~2,5 V: kalibrera batterimätningen i mjukvara, visa 4 grova nivåsteg — aldrig falsk procent.
- OLED:en drar ~20 mA tänd: auto-släck efter ~10 s inaktivitet.

### Stack

- **PlatformIO** (inte Arduino IDE), Arduino-ramverk, C++.
- Bibliotek: Adafruit NAU7802, **NimBLE-Arduino**, U8g2 (eller Adafruit_SSD1306).
- Samplingshastighet: **80 SPS** default (matchar Progressor). 320 SPS finns i chippet för framtida RFD-läge.

### Tindeq Progressor-API

- Annonsera som `Progressor_XXXX` (prefixet krävs för att officiella appen ska hitta enheten).
- API-dokumentation: <https://tindeq.com/progressor_api/> — en control point-characteristic (kommandon, write) + en data point-characteristic (mätström, notify), TLV-format.
- **UUIDs och kommandobytes: extrahera ur BigBangers källkod** (<https://github.com/FilMarini/bigbanger>, MicroPython-firmware, Apache 2.0). Läs den som spec och porta till C++ — kopiera inte rakt av.
- Minsta kommandoset: tare, starta/stoppa mätström, batterinivå.

### Milstolpar med acceptanskriterier

1. **I2C-scan** — 0x2A och 0x3C hittas på bussen. *(Bekräftar hela kedjan.)*
2. **Rå mätström** — 80 SPS till seriell monitor; dokumentera brusnivå i vila.
3. **Kalibrering** — tvåpunkts med kända vikter (t.ex. 5 + 20 kg), faktorer i NVS-flash; verifiera linjäritet med en tredje vikt.
4. **Tindeq-API** — officiella Tindeq-appen ansluter, visar live-kraft, tare fungerar. *(Detta är fas 1-mållinjen.)*
5. **OLED** — batterinivå, BLE-status, senaste max; auto-släck.
6. **Ström** — deep sleep vid inaktivitet (väckning: knapp eller BLE-intervall — designval, motivera), batterinivå in i API:ts batterifält.

---

## Del B — Appmodul i stretchappen

Stacken är **Vite + TypeScript + Supabase**. Inventera `src/` för komponentramverk, state-hantering och routing innan modulen ritas in, och följ befintliga mönster. **Historik lagras i Supabase** — inför ingen ny lagring. Designa tabeller för pass, tester och maxvärden med samma RLS-mönster som övriga appen; det ger synk mellan enheter på köpet. Typa Web Bluetooth med `@types/web-bluetooth`.

### BLE

- **Web Bluetooth.** Fungerar i Chrome på Android och desktop. Kräver HTTPS och user gesture för enhetsväljaren. **Fungerar inte i någon iOS-webbläsare** — iPhone-användare hänvisas till Tindeqs app; bygg inget iOS-workaround.
- Appen är central: skanna på namnprefix `Progressor`, anslut, prenumerera på data point, parsa TLV-strömmen (~80 Hz).
- **Bygg en mock-källa** (syntetisk kraftström med brus + ramper) bakom samma interface som BLE-källan, så UI och träningsmotor kan utvecklas och testas utan hårdvara.

### UI — Climbro-modellen

- Realtidsgraf: tid på x, kraft på y. Övningens målband som skuggat intervall, egna kraftkurvan ritas ovanpå, färgkodad **under / i / över** bandet. Stor aktuell siffra + ljudsignal. Coachning: "sikta mot mitten av zonen".
- Historik: progressionsgrafer per mätvärde; radardiagram (styrka/uthållighet/…) när flera tester finns.

### Träningsmotor

Byggblock: `{duration_s, target_%_av_max, vila_s, reps, grepp, hand, djupsteg}` — komponerbara till pass.

Program v1 (hårdkodade):

| Program | Intensitet | Struktur | Frekvens |
|---|---|---|---|
| **Abrahangs (daglig bas)** | band **30–50 %** av 1-hands-max, mål ~40 % | 6×10 s / 20 s vila, per grepp (half crimp + front-3 drag) | 2 pass/dag, ≥6 h mellan |
| **Max Hangs (styrka)** | **85–95 %** av max | 6×10 s / 2 min vila | 2–3×/vecka |

⚠️ **Viktig korrigering från förundersökningen:** Abrahangs-intensiteten är **~40 % av max** (Gilmore/Baar-studiens definition) — inte de "70–80 %" Emil nämner i videon (den siffran avser andel av lyftkraften med fötterna i golvet, något helt annat). Hårdkoda 30–50 %-bandet.

Huvudbudskap i UI:t: **kombinationen** Abrahangs + Max Hangs — den additiva effekten var studiens enda stora fynd (d=0,79).

Senare (ej v1): repeaters ~60 % 7:3, CF-modul, RFD.

### Tester

- **Primärtest:** 1-hands max peak force, **djupsteget närmast 20 mm**, half crimp, 5–7 s, 2–3 försök per hand, 2 min vila, **båda händer separat**. Detta max styr *alla* intensitetsband (Climbro-modellen).
- Re-test-prompt: var 4:e vecka, konfigurerbart 4–8 v. Nytt max → alla band räknas om automatiskt.
- Sekundärt: samma test med öppet grepp (front-3 drag).
- **Critical force (7 s all-out / 3 s vila, 4 min):** valfri avancerad modul, endast för ≥7a, tydligt märkt som osäker (Baláš 2024 ifrågasätter prediktionsvärdet). **Ej v1.**
- **RFD: ej v1** — kräver ≥100 Hz (320 SPS-läge) och sannolikt en egen BLE-utbyggnad bortom Tindeq-API:t. Parkerad designfråga.

### Gradering — ärlighetskraven (hårda)

- Gradestimat visas **endast** för tester på 20 mm-steget, **alltid som intervall**, med konfidensnivå, aldrig som garanti.
- Obligatorisk kontext i UI: *"Fingerstyrka förklarar ~50 % av variansen i bouldergrad."*
- Kanter <10 mm: fritt fram för träning, **aldrig gradpåstående** (ingen normdata existerar).
- Händerna hålls **separata** — det finns ingen validerad omräkningsfaktor 1-hand→2-hand. Jämför aldrig mot tvåhandsnormer.
- Kroppsvikt är en användarinställning (allt uttrycks i % av kroppsvikt).

### Säkerhet

- Uppvärmningsprompt före varje maxtest.
- Varning vid för hög intensitet i Abrahangs-pass (låg last räckte i studien; högre är inte bättre här).

---

## Del C — Data att hårdkoda

Grad-tabell (max total last i % av kroppsvikt, 20 mm half crimp). **Fet stil = faktiska Lattice-datapunkter; övriga interpolerade.** Källa: Lattice-data via förundersökningen; 2-handskolumnen R²≈0,50 mot boulder.

| Grad (V/Font) | %BW 2-hand 7 s | %BW 1-arm | Konfidens |
|---|---|---|---|
| V4 / 6B+ | **128** | **49** | Medel |
| V5 | 134 | 55 | Låg |
| V6 | 140 | 61 | Låg |
| V7 / 7A+ | **146** | **67** | Medel |
| V8 | 152 | 73 | Låg |
| V9 | 158 | 79 | Låg |
| V10 | 164 | 85 | Låg |
| V11 / 8A | **170** | **91** | Medel |
| V12 | — | 96 | Mycket låg |
| V13 | — | 101 | Mycket låg |
| V14 / 8B+ | — | **106** | Medel |
| V15 | — | **110** | Medel |
| V16 | — | **114** | Medel |
| V17 | — | **118** | Medel |

Visa alltid som intervall (±1 grad vid Medel, ±2 vid Låg/Mycket låg) och exponera konfidensen i UI:t.

Konstanter: Abrahangs-band 0,30–0,50 av max (mål 0,40) · Max Hangs 0,85–0,95 · maxtest 5–7 s · vila 2 min · re-test 28 dagar default.

---

## Del D — Öppna punkter (fråga, gissa inte)

1. **Djupstegen i mm** — Måns mäter hangboardens steg; läggs i konfig. 20 mm-steget identifieras där.
2. **Kranvågens innanmäte** — antagandet är en 4-ledarcell med åtkomliga ledare; verifieras när paketet öppnas.
3. **Progressor-UUIDs** — hämtas ur BigBanger-källkoden vid implementation av milstolpe 4.
4. **Stretchappens inre struktur** — Vite + TS + Supabase är bekräftat; komponentramverk och state-lösning inventeras i `src/` innan Del B ritas in.
5. **Deep sleep-väckning** — knapp vs långsam BLE-advertising; väljs i milstolpe 6.
6. **RFD-läge** — kräver beslut om eget BLE-tillägg; parkerad.

---

## Arbetsordning

1. **Nu (utan hårdvara):** Del B:s UI + träningsmotor mot mock-källan. `firmware/`-mappen scaffoldas (PlatformIO-skelett som bygger).
2. **När Electrokit-paketet landar:** milstolpe 1–3 på skrivbordet, över USB, utan batteri.
3. **Kranvågen öppnas:** cell → skruvterminaler, kalibrering med kända vikter.
4. **Milstolpe 4:** verifiera mot officiella Tindeq-appen. *(Här kan iPhone-polaren börja använda enheten.)*
5. Milstolpe 5–6, batteriet lödas sist.
6. Web Bluetooth mot riktig enhet; testbatteri + program live.
7. Träna, samla egen data, omvärdera mot trösklarna i förundersökningen (t.ex. ingen progression vid 40 % → öppna 50–60 %-band).
