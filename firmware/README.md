# Force sensor firmware

An ESP32-C3 that reads a load cell and speaks Tindeq's open Progressor BLE
API, so the official Tindeq app works with it on day one and StretchQuest's
finger module works with it over Web Bluetooth. Wiring, parts and the hard
electrical rules are in [`../BRIEF.md.md`](../BRIEF.md.md).

```bash
pio run                  # build
pio run -t upload        # flash over USB-C
pio device monitor       # 115200 baud
```

## Modes

`src/config.h` has one switch:

| Mode | What | Gain |
|---|---|---|
| `MODE_LOADCELL` | The real cell in the screw terminals | 128 |
| `MODE_POT` | A potentiometer as stand-in bridge | 1 |
| `MODE_SIM` | No hardware — synthetic hang curve | — |

The pot is not just a toy: with BLE in place it is a full test rig. Turn the
knob and StretchQuest's live graph moves, which exercises the radio, the wire
format, the session engine and the UI before the cell has even shipped.

**Pot wiring that gives the full travel:** two equal resistors across E+/E−
as a midpoint, A− to the midpoint, wiper to A+. With A− grounded instead, the
differential input only sees half its range and the top half of the travel
clips — which looks like a firmware bug and is not.

Calibration is stored **per mode** in NVS. A pot calibration (~80 000
counts/kg at gain 1) leaking into cell mode would make the first real
measurement lie by a factor of five, so the modes never share keys.

## Structure

| File | Owns |
|---|---|
| `config.h` | Mode switch, pins, constants |
| `sensor.*` | NAU7802 / pot / simulator, behind one seam |
| `calibration.*` | NVS, tare, counts-per-kg |
| `progressor.*` | The BLE service and the wire format |
| `ui.*` | The OLED |
| `main.cpp` | The loop that ties them together |

## Controls

BOOT button: short press = tare, long press = reset peak.

Serial at 115200: `t` tare · `p` reset peak · `c<kg>` calibrate with a known
weight (`c10.5`) · `s` status · `r` reset calibration · `x` dump the
canonical weight packet as hex · `?` help.

## The protocol, and how to know both sides agree

`src/progressor.cpp` and the app's `../src/finger/progressorProtocol.ts` are
two halves of one contract — both written against BigBanger's MicroPython
firmware (github.com/FilMarini/bigbanger) read as a specification. UUIDs
`7e4e1701/02/03-…`, commands tare 100 / start 101 / stop 102 / battery 111,
weight packets `[0x01][0x08][float32 LE kg][uint32 LE µs]`.

The serial command `x` prints the canonical fixture packet
(`kg = 12.5, t = 1 000 000 µs`):

```
01 08 00 00 48 41 40 42 0f 00
```

The app has a test asserting those exact bytes parse to 12.5 kg at 1000 ms
(`progressorProtocol.test.ts`, "agrees with the firmware byte for byte").
If the dump and the test ever disagree, believe neither and find out why.

Battery voltage is a **stubbed 3700 mV** until the A1 divider is fitted
(milestone 6) — an app showing 3.7 V is showing the stub, not a battery.

## Milestones

1. **I2C scan** — done, folded into startup error handling: `0x2A` and
   `0x3C` are reported if missing.
2. **Raw stream** — done. 80 SPS, filtered with a ~40 ms time constant.
   Write down the resting noise level; later thresholds are judged by it.
3. **Calibration** — implemented (`t` + `c<kg>`, persisted per mode).
   Verify linearity with a third weight that was not used to fit.
4. **Progressor API** — implemented and working with StretchQuest.
   **The phase 1 finish line.**

   **The official Tindeq app will not accept this device.** It finds it and
   connects, then rejects it as not being in their database — the app checks
   the device against Tindeq's own records of sold hardware. Nothing to fix
   on this side: passing that check would mean claiming a real unit's
   identity, and the protocol being openly published is not an invitation to
   do that.

   Two things follow. The brief's plan of handing an iPhone owner the
   official app does not work, so this device is Android and desktop Chrome
   only for now. And the official app is no longer available as an
   independent check of the wire format — which is what the serial `x`
   fixture and the app-side parser test exist for.
5. **OLED polish** — auto-off after ~10 s idle (the panel draws ~20 mA lit).
   Not started.
6. **Power** — deep sleep, real battery reading into the API's battery
   field. Not started; wake source (button vs slow advertising) still to be
   decided.

## Rules that will cost you hardware if ignored

- **JST-PH polarity is not standardised.** Never cut the battery lead.
  Measure which conductor is positive, solder that to BAT+. Solder with the
  battery unplugged, always.
- Never use **A0 (GPIO2)** or **D8/D9** — strapping pins. Never use
  **A3 (GPIO5)** — ADC2, unreliable while the radio transmits.
- The C3's ADC is non-linear and saturates near 2.5 V. Calibrate the battery
  reading in software and show four coarse levels, never a fabricated
  percentage.
