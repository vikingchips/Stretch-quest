# Force sensor firmware

An ESP32-C3 that reads a load cell and speaks Tindeq's open Progressor BLE API,
so the official Tindeq app works with it on day one and the StretchQuest finger
module works with it over Web Bluetooth on day two. Wiring, parts and the hard
electrical rules are in [`../BRIEF.md.md`](../BRIEF.md.md).

```bash
pio run                  # build
pio run -t upload        # flash over USB-C
pio device monitor       # 115200 baud
```

The app half of this project lives in `../src/finger/` and needs none of this
to run — it has a simulated force source.

## Milestones

Current state: **1 is written, nothing else is.** The hardware has not arrived.
Each milestone has an acceptance test; do not move on without it.

1. **I2C scan** — `0x2A` and `0x3C` both answer. Confirms the whole chain.
   *(This is what `src/main.cpp` does today.)*
2. **Raw stream** — 80 SPS to the serial monitor. Write down the resting noise
   level; every later threshold is judged against it.
3. **Calibration** — two-point with known weights (5 and 20 kg), factors stored
   in NVS flash. Verify linearity with a third weight that was not used to fit.
4. **Progressor API** — the official Tindeq app connects, shows live force, and
   tare works. **This is the phase 1 finish line** — the device is usable here.
5. **OLED** — battery level, BLE state, last max. Auto-off after ~10 s; the
   panel draws ~20 mA lit, which is not free on a 1200 mAh cell.
6. **Power** — deep sleep on inactivity, battery level into the API's battery
   field. Wake source (button vs slow BLE advertising) is an open decision;
   pick one and write down why.

## Rules that will cost you hardware if ignored

- **JST-PH polarity is not standardised.** Never cut the battery lead. Measure
  which conductor is positive, solder that to BAT+. The battery goes on last,
  once everything works over USB.
- Never use **A0 (GPIO2)** or **D8/D9** — strapping pins. Never use
  **A3 (GPIO5)** — ADC2, unreliable while the radio transmits.
- The C3's ADC is non-linear and saturates near 2.5 V. Calibrate in software
  and show four coarse battery levels, never a fabricated percentage.

## Protocol

The Progressor GATT UUIDs, command bytes and TLV layout are documented at
<https://tindeq.com/progressor_api/> and readable in BigBanger's MicroPython
firmware (<https://github.com/FilMarini/bigbanger>, Apache 2.0). Read it as a
specification and port it — the app-side parser in
`../src/finger/progressorProtocol.ts` is the reference for what this firmware
has to emit.
