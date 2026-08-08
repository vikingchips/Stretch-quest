#include "calibration.h"
#include "config.h"
#include <Preferences.h>
#include <math.h>

static Preferences prefs;
static float   countsPerKg = DEFAULT_COUNTS_PER_KG;
static int32_t tareOffset  = 0;

// Per-mode keys — see the header for why sharing one key is a trap.
static const char *FACTOR_KEY = "factor_" MODE_NAME;
static const char *OFFSET_KEY = "offset_" MODE_NAME;

float   calibrationFactor() { return countsPerKg; }
int32_t calibrationOffset() { return tareOffset; }

void calibrationLoad() {
  prefs.begin("kraft", false);
  countsPerKg = prefs.getFloat(FACTOR_KEY, DEFAULT_COUNTS_PER_KG);
  tareOffset  = prefs.getInt(OFFSET_KEY, 0);
  if (!isfinite(countsPerKg) || fabsf(countsPerKg) < 1.0f) {
    countsPerKg = DEFAULT_COUNTS_PER_KG;
  }
  Serial.printf("calibration [%s]: %.1f counts/kg, offset %ld\n",
                MODE_NAME, countsPerKg, (long)tareOffset);
}

static void save() {
  prefs.putFloat(FACTOR_KEY, countsPerKg);
  prefs.putInt(OFFSET_KEY, tareOffset);
}

void calibrationTare(float filteredCounts) {
  tareOffset = (int32_t)filteredCounts;
  save();
  Serial.printf("tared, new offset %ld\n", (long)tareOffset);
}

bool calibrationCalibrate(float filteredCounts, float knownKg) {
  if (fabsf(knownKg) < 0.05f) {
    Serial.println("weight must be over 0.05 kg");
    return false;
  }
  float delta = filteredCounts - (float)tareOffset;
  if (fabsf(delta) < 100.0f) {
    // A real weight moves the reading thousands of counts. A hundred means
    // the weight is not on, or the tare was taken with it already on.
    Serial.println("swing too small — is the weight on? did you tare first?");
    return false;
  }
  countsPerKg = delta / knownKg;
  save();
  Serial.printf("calibrated: %.1f counts/kg (%.4f kg per count)\n",
                countsPerKg, 1.0f / countsPerKg);
  return true;
}

bool calibrationSetFactor(float factor) {
  // A zero or non-finite factor would divide every future reading into
  // nonsense, and it would persist across reboots. Refuse it.
  if (!isfinite(factor) || fabsf(factor) < 1.0f) {
    Serial.printf("refusing implausible factor %.3f\n", factor);
    return false;
  }
  countsPerKg = factor;
  save();
  Serial.printf("factor set from app: %.1f counts/kg\n", countsPerKg);
  return true;
}

void calibrationReset() {
  countsPerKg = DEFAULT_COUNTS_PER_KG;
  save();
  Serial.println("calibration reset to factory default");
}
