#pragma once
#include <Arduino.h>

/*
 * The Tindeq Progressor API, from the device side.
 *
 * The other half of this contract lives in the app:
 * ../../src/finger/progressorProtocol.ts. Both were written against
 * BigBanger's MicroPython firmware read as a specification, and every
 * constant here must match that file — the official Tindeq app finds the
 * device by these UUIDs, so none of them are ours to change.
 */

enum ProgressorState {
  PROGRESSOR_ADVERTISING,
  PROGRESSOR_CONNECTED,   // central connected, stream not started
  PROGRESSOR_STREAMING,
};

void            progressorBegin();
ProgressorState progressorState();

// Feed one measured sample. Does nothing unless a central has connected,
// subscribed and sent start-measurement — so main can call it every sample
// unconditionally.
void progressorOnSample(float kg);

// A tare command arrived over BLE. Returns true once per request; main
// consumes it in the loop, where the filtered reading lives.
bool progressorConsumeTareRequest();

// A calibrate command arrived, carrying the known weight now hanging.
// Returns true once per request and writes the weight to `knownKg`.
bool progressorConsumeCalibrationRequest(float *knownKg);

// Report the outcome back to whoever asked. Called by main once the
// calibration has actually been attempted.
void progressorReportCalibration(bool ok, float countsPerKg);

// The app asked for the tared reading in raw counts, so it can build a
// multi-point fit of its own. Same consume-then-report shape as above.
bool progressorConsumeCountsRequest();
void progressorReportCounts(float taredCounts);

// The app worked out a factor from several points and wants it stored.
bool progressorConsumeSetFactorRequest(float *countsPerKg);

// Build one weight notification: [0x01][0x08][float32 LE kg][uint32 LE us].
// Public so the serial 'x' command can print the exact bytes for
// cross-checking against the app's parser tests. `out` needs 10 bytes.
size_t progressorBuildWeightPacket(uint8_t *out, float kg, uint32_t elapsedUs);
