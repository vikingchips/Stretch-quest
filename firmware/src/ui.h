#pragma once
#include <Arduino.h>
#include "progressor.h"

/*
 * The OLED. Everything here is presentation: it renders the numbers it is
 * handed and holds no state of its own beyond the heartbeat.
 */

// Returns false when no display answered; the program runs fine without one.
bool uiBegin();

// Three-line splash/message screen.
void uiMessage(const char *line1, const char *line2, const char *line3);

// The live screen: big number, peak, sample rate, bar, BLE state.
void uiDraw(float forceKg, float peakKg, float sampleRateHz,
            bool sensorOk, ProgressorState ble);
