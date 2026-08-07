import type { ForceSample } from './types';

/**
 * Tindeq Progressor GATT, from the app's side.
 *
 * Kept apart from the Bluetooth plumbing so it can be tested against
 * hand-built buffers instead of against hardware — this is the layer most
 * likely to be wrong and the hardest to debug through a BLE stack.
 *
 * Verified against BigBanger's MicroPython firmware
 * (github.com/FilMarini/bigbanger, Apache 2.0, firmware/upython/config.py and
 * hx711_bb.py), read as a specification. The firmware in ../../firmware has to
 * emit exactly what this parses, which is half the reason it lives in the
 * same repository.
 */

export const PROGRESSOR_SERVICE = '7e4e1701-1ea6-40c9-9dcc-13d34ffead57';
/** Read + notify: the measurement stream and command responses. */
export const PROGRESSOR_DATA_POINT = '7e4e1702-1ea6-40c9-9dcc-13d34ffead57';
/** Write: one command byte at a time. */
export const PROGRESSOR_CONTROL_POINT = '7e4e1703-1ea6-40c9-9dcc-13d34ffead57';

/** Devices must advertise with this prefix for the official app to find them. */
export const PROGRESSOR_NAME_PREFIX = 'Progressor';

export const COMMAND = {
  tare: 100,
  startMeasurement: 101,
  stopMeasurement: 102,
  /** Both RFD modes exist on the device. Neither is used: RFD needs 320 SPS
   *  and a decision this project has parked. */
  startPeakRfd: 103,
  startPeakRfdSeries: 104,
  addCalibrationPoint: 105,
  saveCalibration: 106,
  getAppVersion: 107,
  getErrorInformation: 108,
  clearErrorInformation: 109,
  enterSleep: 110,
  getBatteryVoltage: 111,
  getDeviceId: 112,
} as const;

export const RESPONSE = {
  commandResponse: 0,
  weightMeasurement: 1,
  rfdPeak: 2,
  rfdPeakSeries: 3,
  lowPowerWarning: 4,
} as const;

/**
 * Extensions of ours, not Tindeq's.
 *
 * Tindeq reserves 105 and 106 for calibration, but their payload format is
 * not something this project has a verified reference for — BigBanger reads
 * the whole write as a single integer, so multi-byte commands do not exist
 * in the firmware we checked ourselves against. Guessing at a format and
 * silently disagreeing with a real Progressor is worse than owning a
 * private range, so these sit far above theirs and are documented as ours.
 *
 * A real Progressor will simply ignore them.
 */
export const SQ_COMMAND = {
  /** 0xC0 + float32 LE known kilograms. Calibrates against the reading now. */
  calibrate: 0xc0,
} as const;

export const SQ_RESPONSE = {
  /** 0x40 + uint8 ok + float32 LE counts-per-kg. */
  calibration: 0x40,
} as const;

export interface CalibrationResult {
  ok: boolean;
  /** The factor the device settled on. Zero when it refused. */
  countsPerKg: number;
}

/** A calibrate command with its weight payload. */
export function calibrateCommand(knownKg: number): Uint8Array {
  const buffer = new ArrayBuffer(5);
  const view = new DataView(buffer);
  view.setUint8(0, SQ_COMMAND.calibrate);
  view.setFloat32(1, knownKg, true);
  return new Uint8Array(buffer);
}

/** One (float32 kg, uint32 microseconds) pair. */
const WEIGHT_ENTRY_BYTES = 8;

export interface Notification {
  samples?: ForceSample[];
  /** Millivolts, from a battery-voltage command response. */
  batteryMv?: number;
  /** The device is about to run out. */
  lowPower?: boolean;
  /** Answer to a calibrate command. Ours, not Tindeq's. */
  calibration?: CalibrationResult;
}

/**
 * Parse one notification from the data point.
 *
 * Layout is [tag u8][length u8][payload]. A weight notification carries as
 * many (weight, timestamp) pairs as fit — BigBanger sends one per packet, but
 * the length byte is what decides, not the assumption.
 *
 * Command responses share the same envelope, so a battery reading and a
 * device id arrive tagged identically and are told apart by what was asked
 * for. Only the battery reading is used here, and only its four-byte form.
 */
export function parseNotification(view: DataView): Notification {
  if (view.byteLength < 2) return {};
  const tag = view.getUint8(0);
  const length = view.getUint8(1);
  const available = Math.min(length, view.byteLength - 2);

  if (tag === RESPONSE.weightMeasurement) {
    const samples: ForceSample[] = [];
    const end = 2 + available;
    for (let offset = 2; offset + WEIGHT_ENTRY_BYTES <= end; offset += WEIGHT_ENTRY_BYTES) {
      samples.push({
        kg: view.getFloat32(offset, true),
        // The device counts microseconds since the stream started. Everything
        // else in the app is milliseconds, and only deltas are ever used.
        t: view.getUint32(offset + 4, true) / 1000,
      });
    }
    return { samples };
  }

  if (tag === SQ_RESPONSE.calibration && available >= 5) {
    return {
      calibration: {
        ok: view.getUint8(2) === 1,
        countsPerKg: view.getFloat32(3, true),
      },
    };
  }

  if (tag === RESPONSE.lowPowerWarning) {
    return { lowPower: true };
  }

  if (tag === RESPONSE.commandResponse && available === 4) {
    return { batteryMv: view.getUint32(2, true) };
  }

  return {};
}

export function commandBuffer(command: number): Uint8Array {
  return new Uint8Array([command]);
}
