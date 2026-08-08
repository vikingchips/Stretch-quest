#pragma once
#include <Arduino.h>

/*
 * Calibration and tare, persisted in NVS flash.
 *
 * Stored per mode. The pot needs ~80000 counts/kg at gain 1 and the cell
 * ~14000 at gain 128; a single shared key would let a pot calibration leak
 * into cell mode, where it makes the first real measurement lie by a factor
 * of five and look exactly like a hardware fault.
 */

void  calibrationLoad();

float calibrationFactor();          // counts per kg, never near zero
int32_t calibrationOffset();        // tare offset in counts

// Set the current filtered reading as the new zero.
void  calibrationTare(float filteredCounts);

// Two-point: tare first, put a known weight on, then call this.
// Returns false (and explains on serial) when the swing is implausibly small.
bool  calibrationCalibrate(float filteredCounts, float knownKg);

// Store a factor computed elsewhere — the app's multi-point fit. Refuses a
// value that could not be a real calibration rather than bricking the scale.
bool  calibrationSetFactor(float countsPerKg);

void  calibrationReset();           // back to the mode's factory default
