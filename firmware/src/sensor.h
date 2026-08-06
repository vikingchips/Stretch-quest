#pragma once
#include <Arduino.h>

/*
 * The force source, behind one seam. Load cell, potentiometer or synthetic
 * curve — downstream code sees raw ADC counts and nothing else, which is the
 * same trick the app plays with its ForceSource interface.
 */

// Initialise the ADC (or the simulator). Returns false if real hardware was
// expected but not found on the bus.
bool sensorBegin();

// True when a real ADC answered at startup.
bool sensorOk();

// Fetch a new sample if one is ready. Returns false when there is nothing
// new — the caller polls this as fast as it likes.
bool sensorRead(int32_t *raw);
