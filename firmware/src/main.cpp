/*
 * StretchQuest force sensor — milestones 2–4.
 *
 * Reads force (cell, pot or simulation — see config.h), shows it on the
 * OLED, and speaks the Tindeq Progressor API over BLE so both the official
 * Tindeq app and StretchQuest's finger module can connect.
 *
 * Controls:
 *   BOOT button (GPIO9)   short press = tare, long press = reset peak
 *   Serial (115200):      t        tare
 *                         p        reset peak
 *                         c<kg>    calibrate with a known weight, e.g. c10.5
 *                         s        status
 *                         r        reset calibration to factory default
 *                         x        dump the canonical weight packet as hex,
 *                                  for cross-checking against the app parser
 *                         ?        help
 *
 * Calibration and tare persist in flash, per mode.
 */

#include <Arduino.h>
#include <Wire.h>
#include "config.h"
#include "sensor.h"
#include "calibration.h"
#include "progressor.h"
#include "ui.h"

static float filteredCounts = 0.0f;
static bool  filterPrimed   = false;
static float forceKg        = 0.0f;
static float peakKg         = 0.0f;

static uint32_t sampleCount  = 0;
static float    sampleRateHz = 0.0f;

// ======================= Commands =======================
static void doTare() {
  // Before the first sample the filter holds zero, and taring against that
  // silently stores a nonsense offset that looks like tare not working.
  if (!filterPrimed) {
    Serial.println("no samples yet — nothing to tare against");
    return;
  }
  calibrationTare(filteredCounts);
  peakKg = 0.0f;
}

static void printStatus() {
  Serial.println("--- status ---");
  Serial.printf("mode:          %s\n", MODE_NAME);
  Serial.printf("sensor:        %s\n", sensorOk() ? "ok" : "missing/simulated");
  Serial.printf("counts/kg:     %.1f\n", calibrationFactor());
  Serial.printf("tare offset:   %ld\n", (long)calibrationOffset());
  Serial.printf("raw (filtered):%.0f\n", filteredCounts);
  Serial.printf("force:         %.2f kg\n", forceKg);
  Serial.printf("peak:          %.2f kg\n", peakKg);
  Serial.printf("sample rate:   %.1f Hz\n", sampleRateHz);
  Serial.printf("ble:           %d (0=adv 1=conn 2=stream)\n", progressorState());
}

static void dumpFixturePacket() {
  // Must print 01 08 00 00 48 41 40 42 0f 00 — the exact bytes the app's
  // parser test asserts. If these two ever disagree, believe neither and
  // find out why.
  uint8_t pkt[10];
  size_t n = progressorBuildWeightPacket(pkt, 12.5f, 1000000UL);
  Serial.print("fixture (kg=12.5, t=1000000us): ");
  for (size_t i = 0; i < n; i++) Serial.printf("%02x ", pkt[i]);
  Serial.println();
}

static void handleSerial() {
  static char buf[24];
  static uint8_t len = 0;

  while (Serial.available()) {
    char c = Serial.read();

    if (c == '\n' || c == '\r') {
      if (len == 0) continue;
      buf[len] = '\0';

      switch (buf[0]) {
        case 't': doTare(); break;
        case 'p': peakKg = 0.0f; Serial.println("peak reset"); break;
        case 'c': calibrationCalibrate(filteredCounts, atof(buf + 1)); break;
        case 's': printStatus(); break;
        case 'r': calibrationReset(); break;
        case 'x': dumpFixturePacket(); break;
        case '?':
          Serial.println("t=tare  p=reset peak  c<kg>=calibrate  s=status  "
                         "r=reset cal  x=packet fixture");
          break;
        default:
          Serial.println("unknown command, ? for help");
      }
      len = 0;
    } else if (len < sizeof(buf) - 1) {
      buf[len++] = c;
    }
  }
}

static void handleButton() {
  static bool          wasDown   = false;
  static unsigned long pressedAt = 0;
  static bool          longFired = false;

  bool down = (digitalRead(PIN_BUTTON) == LOW);

  if (down && !wasDown) {
    pressedAt = millis();
    longFired = false;
  } else if (down && !longFired && millis() - pressedAt > 1000) {
    peakKg = 0.0f;                    // long press
    longFired = true;
    Serial.println("peak reset (long press)");
  } else if (!down && wasDown && !longFired) {
    if (millis() - pressedAt > 30) {  // debounce
      doTare();
    }
  }
  wasDown = down;
}

// ======================= Setup =======================
void setup() {
  Serial.begin(115200);
  unsigned long t0 = millis();
  while (!Serial && millis() - t0 < 2000) delay(10);

  Serial.println();
  Serial.println("=== stretchquest force sensor ===");
  Serial.printf("mode: %s\n", MODE_NAME);

  pinMode(PIN_BUTTON, INPUT_PULLUP);

  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(400000);

  uiBegin();
  calibrationLoad();

  if (!sensorBegin() && MODE != MODE_SIM) {
    uiMessage("NAU7802 missing", "check 0x2A on the bus", "or build MODE_SIM");
    delay(3000);
  }

  progressorBegin();

  uiMessage("KRAFT " MODE_NAME, "ble: " DEVICE_NAME, "BOOT=tare  ?=help");
  delay(1500);
}

// ======================= Loop =======================
void loop() {
  static unsigned long lastDraw   = 0;
  static unsigned long lastRate   = 0;
  static unsigned long lastReport = 0;

  // 1. Sample as fast as the ADC delivers.
  int32_t raw;
  if (sensorRead(&raw)) {
    if (!filterPrimed) {
      filteredCounts = (float)raw;
      filterPrimed = true;
    } else {
      filteredCounts += FILTER_ALPHA * ((float)raw - filteredCounts);
    }

    forceKg = (filteredCounts - (float)calibrationOffset()) / calibrationFactor();
    if (forceKg > peakKg) peakKg = forceKg;
    sampleCount++;

    // 2. Same filtered value to BLE as to the screen: what the app plots is
    //    what the person on the board sees.
    progressorOnSample(forceKg);
  }

  // 3. Tare and calibration that arrived over BLE run here, where the
  //    filtered reading and the flash write both live.
  if (progressorConsumeTareRequest()) doTare();

  float knownKg;
  if (progressorConsumeCalibrationRequest(&knownKg)) {
    bool ok = filterPrimed && calibrationCalibrate(filteredCounts, knownKg);
    if (!filterPrimed) Serial.println("no samples yet — cannot calibrate");
    progressorReportCalibration(ok, ok ? calibrationFactor() : 0.0f);
  }

  // The app builds multi-point fits itself: it asks for tared counts, pairs
  // them with weights it knows, and sends back the factor it worked out.
  if (progressorConsumeCountsRequest()) {
    progressorReportCounts(filterPrimed ? filteredCounts - (float)calibrationOffset() : 0.0f);
  }

  float factor;
  if (progressorConsumeSetFactorRequest(&factor)) {
    calibrationSetFactor(factor);
  }

  // 4. Measured sample rate, once a second.
  if (millis() - lastRate >= 1000) {
    sampleRateHz = sampleCount * 1000.0f / (millis() - lastRate);
    sampleCount = 0;
    lastRate = millis();
  }

  // 5. Redraw at 10 Hz. Faster than that and the OLED eats I2C time from
  //    the ADC and the sample rate sags.
  if (millis() - lastDraw >= 100) {
    lastDraw = millis();
    uiDraw(forceKg, peakKg, sampleRateHz, sensorOk(), progressorState());
  }

  // 6. Serial commands and the button.
  handleSerial();
  handleButton();

  // 7. Log to USB.
  if (millis() - lastReport >= 500) {
    lastReport = millis();
    Serial.printf("%.2f kg  (peak %.2f)  raw %.0f  %.0f Hz\n",
                  forceKg, peakKg, filteredCounts, sampleRateHz);
  }
}
