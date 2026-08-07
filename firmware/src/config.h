#pragma once

/*
 * All build-time choices in one place. Everything else includes this and
 * stays mode-agnostic: the rest of the program never knows whether force
 * comes from a load cell, a potentiometer or thin air.
 */

// ======================= Mode =======================
#define MODE_LOADCELL 0
#define MODE_POT      1
#define MODE_SIM      2

#define MODE MODE_LOADCELL        // <<< CHANGE HERE

// ======================= Pins =======================
// Hard rules from BRIEF.md.md: never GPIO2/A0 or D8/D9 (strapping pins),
// never GPIO5/A3 (ADC2 — unreliable while the radio transmits, and this
// device transmits constantly). Battery sense goes to A1/GPIO3.
static const int PIN_SDA     = 6;   // D4
static const int PIN_SCL     = 7;   // D5
static const int PIN_BUTTON  = 9;   // BOOT button, active low
static const int PIN_BATTERY = 3;   // A1 — divider not fitted yet (milestone 6)

// ======================= Display =======================
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_ADDR     0x3C

// Full scale of the bar graph, kg.
static const float BAR_MAX_KG = 60.0f;

// ======================= Filtering =======================
// 0.0 = frozen, 1.0 = unfiltered. 0.30 at 80 Hz gives ~40 ms time constant:
// fast enough for a jerk, calm enough that the last digit does not flicker.
static const float FILTER_ALPHA = 0.30f;

// ======================= Per-mode ADC setup =======================
#if MODE == MODE_POT
  // Gain 1: a pot swings the full input range, and any more gain just
  // saturates across the whole travel.
  #define ADC_GAIN              NAU7802_GAIN_1
  #define DEFAULT_COUNTS_PER_KG 80000.0f
  #define MODE_NAME             "POT"
#elif MODE == MODE_SIM
  #define ADC_GAIN              NAU7802_GAIN_128
  #define DEFAULT_COUNTS_PER_KG 14000.0f
  #define MODE_NAME             "SIM"
#else
  #define ADC_GAIN              NAU7802_GAIN_128
  // Rough guess for a 150 kg cell at ~1 mV/V. Means nothing until the
  // two-point calibration has been run with known weights.
  #define DEFAULT_COUNTS_PER_KG 14000.0f
  #define MODE_NAME             "CELL"
#endif

// ======================= BLE identity =======================
// The "Progressor" prefix is what both the official Tindeq app and
// StretchQuest scan for. Not ours to change.
#define DEVICE_NAME "Progressor_SQ"
