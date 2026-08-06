#include "sensor.h"
#include "config.h"
#include "calibration.h"
#include <Wire.h>
#include <Adafruit_NAU7802.h>
#include <math.h>

static Adafruit_NAU7802 nau;
static bool ok = false;

bool sensorOk() { return ok; }

#if MODE == MODE_SIM

/*
 * Synthetic hang: 15 s cycle of rest, pull-up, a hang that slowly fades,
 * and release. Generated in counts so every line of downstream code is the
 * same code that will run against the real cell.
 */
static int32_t simulateCounts() {
  float t = (millis() % 15000) / 1000.0f;
  float kg;

  if (t < 2.0f) {
    kg = 0.0f;                                   // rest
  } else if (t < 3.0f) {
    kg = 45.0f * (t - 2.0f);                     // pulling on
  } else if (t < 10.0f) {
    kg = 45.0f - 3.0f * (t - 3.0f) / 7.0f;       // hang, slowly fading
  } else if (t < 10.6f) {
    kg = 42.0f * (1.0f - (t - 10.0f) / 0.6f);    // release
  } else {
    kg = 0.0f;
  }

  if (kg > 1.0f) {
    kg += 0.8f * sinf(t * 11.0f);                // grip wobble
  }
  kg += random(-60, 61) / 1000.0f;               // noise

  // Multiplied by the calibration factor here and divided by the same
  // factor downstream, so the 'c' command is deliberately harmless in this
  // mode. That round-trip is intentional, not a bug: it keeps the sim
  // exercising the exact same conversion path as the real cell.
  return (int32_t)(kg * calibrationFactor()) + calibrationOffset();
}

bool sensorBegin() {
  ok = false;  // nothing real on the bus, and that is fine
  randomSeed(micros());
  Serial.println("sensor: simulated, nothing on the bus is read");
  return true;
}

bool sensorRead(int32_t *raw) {
  static unsigned long lastSim = 0;
  if (millis() - lastSim < 12) return false;     // ~80 Hz
  lastSim = millis();
  *raw = simulateCounts();
  return true;
}

#else

bool sensorBegin() {
  if (!nau.begin(&Wire)) {
    ok = false;
    Serial.println("sensor: no NAU7802 at 0x2A");
    return false;
  }
  ok = true;
  nau.setLDO(NAU7802_3V0);
  nau.setGain(ADC_GAIN);
  nau.setRate(NAU7802_RATE_80SPS);

  // The internal calibration must rerun after a gain change.
  nau.calibrate(NAU7802_CALMOD_INTERNAL);
  nau.calibrate(NAU7802_CALMOD_OFFSET);

  // The first samples after calibration are garbage; burn them.
  for (int i = 0; i < 20; i++) {
    unsigned long w = millis();
    while (!nau.available() && millis() - w < 100) delay(1);
    if (nau.available()) nau.read();
  }
  Serial.println("sensor: NAU7802 running at 80 SPS");
  return true;
}

bool sensorRead(int32_t *raw) {
  if (!ok) return false;
  if (!nau.available()) return false;
  *raw = nau.read();
  return true;
}

#endif
