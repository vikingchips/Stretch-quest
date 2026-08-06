import { describe, expect, it } from 'vitest';
import {
  COMMAND,
  PROGRESSOR_CONTROL_POINT,
  PROGRESSOR_DATA_POINT,
  PROGRESSOR_SERVICE,
  RESPONSE,
  commandBuffer,
  parseNotification,
} from './progressorProtocol';

/** Build a weight notification the way the firmware does. */
function weightPacket(entries: Array<{ kg: number; us: number }>): DataView {
  const buffer = new ArrayBuffer(2 + entries.length * 8);
  const view = new DataView(buffer);
  view.setUint8(0, RESPONSE.weightMeasurement);
  view.setUint8(1, entries.length * 8);
  entries.forEach(({ kg, us }, i) => {
    view.setFloat32(2 + i * 8, kg, true);
    view.setUint32(2 + i * 8 + 4, us, true);
  });
  return view;
}

describe('protocol constants', () => {
  it('matches the Progressor API', () => {
    // Read out of BigBanger's firmware/upython/config.py. The official Tindeq
    // app finds the device by these, so they are not ours to choose.
    expect(PROGRESSOR_SERVICE).toBe('7e4e1701-1ea6-40c9-9dcc-13d34ffead57');
    expect(PROGRESSOR_DATA_POINT).toBe('7e4e1702-1ea6-40c9-9dcc-13d34ffead57');
    expect(PROGRESSOR_CONTROL_POINT).toBe('7e4e1703-1ea6-40c9-9dcc-13d34ffead57');
    expect(COMMAND.tare).toBe(100);
    expect(COMMAND.startMeasurement).toBe(101);
    expect(COMMAND.stopMeasurement).toBe(102);
    expect(COMMAND.getBatteryVoltage).toBe(111);
    expect(RESPONSE.commandResponse).toBe(0);
    expect(RESPONSE.weightMeasurement).toBe(1);
  });

  it('writes a command as a single byte', () => {
    expect([...commandBuffer(COMMAND.tare)]).toEqual([100]);
  });
});

describe('parseNotification', () => {
  it('agrees with the firmware byte for byte', () => {
    // The firmware prints this exact packet for kg=12.5, t=1_000_000us via
    // its serial 'x' command (firmware/src/progressor.cpp). If this test and
    // that dump ever disagree, believe neither side and find out why.
    const hex = '01 08 00 00 48 41 40 42 0f 00';
    const bytes = hex.split(' ').map((b) => parseInt(b, 16));
    const view = new DataView(new Uint8Array(bytes).buffer);
    const { samples } = parseNotification(view);
    expect(samples).toHaveLength(1);
    expect(samples![0].kg).toBeCloseTo(12.5, 6);
    expect(samples![0].t).toBe(1000);
  });

  it('reads a single weight sample', () => {
    const { samples } = parseNotification(weightPacket([{ kg: 42.5, us: 1_500_000 }]));
    expect(samples).toHaveLength(1);
    expect(samples![0].kg).toBeCloseTo(42.5, 3);
    // Microseconds on the wire, milliseconds everywhere in the app.
    expect(samples![0].t).toBe(1500);
  });

  it('reads every sample a packet carries', () => {
    // BigBanger sends one per packet, but the length byte decides, not that.
    const { samples } = parseNotification(
      weightPacket([
        { kg: 1, us: 0 },
        { kg: 2, us: 12_500 },
        { kg: 3, us: 25_000 },
      ]),
    );
    expect(samples!.map((s) => s.kg)).toEqual([1, 2, 3]);
    expect(samples!.map((s) => s.t)).toEqual([0, 12.5, 25]);
  });

  it('keeps a negative reading rather than clamping it', () => {
    // A tared cell drifts slightly below zero, and hiding that would make
    // the resting noise look one-sided.
    const { samples } = parseNotification(weightPacket([{ kg: -0.4, us: 0 }]));
    expect(samples![0].kg).toBeCloseTo(-0.4, 3);
  });

  it('trusts the length byte over the buffer size', () => {
    const buffer = new ArrayBuffer(2 + 16);
    const view = new DataView(buffer);
    view.setUint8(0, RESPONSE.weightMeasurement);
    view.setUint8(1, 8); // one entry declared, two entries' worth of room
    view.setFloat32(2, 9, true);
    view.setUint32(6, 0, true);
    expect(parseNotification(view).samples).toHaveLength(1);
  });

  it('does not read past a truncated packet', () => {
    const buffer = new ArrayBuffer(2 + 4);
    const view = new DataView(buffer);
    view.setUint8(0, RESPONSE.weightMeasurement);
    view.setUint8(1, 8); // claims a full entry, only half of one arrived
    expect(parseNotification(view).samples).toEqual([]);
  });

  it('reads the battery response as millivolts', () => {
    const buffer = new ArrayBuffer(6);
    const view = new DataView(buffer);
    view.setUint8(0, RESPONSE.commandResponse);
    view.setUint8(1, 4);
    view.setUint32(2, 3700, true);
    expect(parseNotification(view).batteryMv).toBe(3700);
  });

  it('surfaces the low-power warning', () => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint8(0, RESPONSE.lowPowerWarning);
    view.setUint8(1, 0);
    expect(parseNotification(view).lowPower).toBe(true);
  });

  it('ignores a packet too short to have a header', () => {
    expect(parseNotification(new DataView(new ArrayBuffer(1)))).toEqual({});
  });

  it('ignores responses it has no use for', () => {
    // A device id comes back on the same tag as the battery, with a
    // different length. Guessing at it would be worse than skipping it.
    const buffer = new ArrayBuffer(10);
    const view = new DataView(buffer);
    view.setUint8(0, RESPONSE.commandResponse);
    view.setUint8(1, 8);
    expect(parseNotification(view)).toEqual({});
  });
});
