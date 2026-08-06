import { SourceBase, type ForceSource } from './source';
import {
  COMMAND,
  PROGRESSOR_CONTROL_POINT,
  PROGRESSOR_DATA_POINT,
  PROGRESSOR_NAME_PREFIX,
  PROGRESSOR_SERVICE,
  commandBuffer,
  parseNotification,
} from './progressorProtocol';

/**
 * A real Progressor-compatible device over Web Bluetooth.
 *
 * Chrome on Android and desktop only. No iOS browser implements Web
 * Bluetooth, and none is going to — an iPhone owner uses the official Tindeq
 * app with the same device instead. There is deliberately no workaround here.
 */

export function bleSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export const BLE_UNSUPPORTED_MESSAGE =
  'web bluetooth is not available in this browser. on iphone, use the tindeq app with the same device — or try the simulated device here.';

export class BleForceSource extends SourceBase implements ForceSource {
  readonly kind = 'ble' as const;

  private device: BluetoothDevice | null = null;
  private control: BluetoothRemoteGATTCharacteristic | null = null;
  private batteryResolve: ((mv: number | null) => void) | null = null;
  private lowPower = false;

  async connect(): Promise<void> {
    if (!bleSupported()) throw new Error(BLE_UNSUPPORTED_MESSAGE);
    this.setStatus('connecting');
    try {
      // Must be reached from a user gesture, or the chooser never opens.
      //
      // Two filters, OR-ed: the name and the service. A 128-bit service UUID
      // plus a name do not fit one 31-byte advertisement, so the name rides
      // in the scan response — where Chrome on Android has a history of not
      // seeing it. The service UUID sits in the main advertisement, so that
      // filter matches even when the name never arrives.
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: PROGRESSOR_NAME_PREFIX },
          { services: [PROGRESSOR_SERVICE] },
        ],
        optionalServices: [PROGRESSOR_SERVICE],
      });
      device.addEventListener('gattserverdisconnected', this.handleDisconnect);

      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(PROGRESSOR_SERVICE);
      const data = await service.getCharacteristic(PROGRESSOR_DATA_POINT);
      const control = await service.getCharacteristic(PROGRESSOR_CONTROL_POINT);

      data.addEventListener('characteristicvaluechanged', this.handleNotification);
      await data.startNotifications();

      this.device = device;
      this.control = control;
      this.setStatus('connected');
      await this.write(COMMAND.startMeasurement);
    } catch (error) {
      this.setStatus('disconnected');
      throw error;
    }
  }

  disconnect(): void {
    const device = this.device;
    this.device = null;
    this.control = null;
    device?.removeEventListener('gattserverdisconnected', this.handleDisconnect);
    if (device?.gatt?.connected) device.gatt.disconnect();
    this.setStatus('disconnected');
  }

  async tare(): Promise<void> {
    await this.write(COMMAND.tare);
  }

  async readBattery(): Promise<number | null> {
    if (!this.control) return null;
    // The answer arrives as a notification rather than a reply, so the
    // request is paired with the next response by waiting for one.
    const answer = new Promise<number | null>((resolve) => {
      this.batteryResolve = resolve;
      setTimeout(() => {
        if (this.batteryResolve === resolve) {
          this.batteryResolve = null;
          resolve(null);
        }
      }, 2000);
    });
    await this.write(COMMAND.getBatteryVoltage);
    const mv = await answer;
    return mv === null ? null : mv / 1000;
  }

  /** True once the device has warned it is nearly flat. */
  get lowBattery(): boolean {
    return this.lowPower;
  }

  private async write(command: number): Promise<void> {
    if (!this.control) return;
    await this.control.writeValue(commandBuffer(command) as BufferSource);
  }

  private handleNotification = (event: Event): void => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;
    const { samples, batteryMv, lowPower } = parseNotification(target.value);
    if (samples) {
      for (const sample of samples) this.emit(sample);
    }
    if (lowPower) this.lowPower = true;
    if (batteryMv !== undefined && this.batteryResolve) {
      const resolve = this.batteryResolve;
      this.batteryResolve = null;
      resolve(batteryMv);
    }
  };

  private handleDisconnect = (): void => {
    this.control = null;
    this.setStatus('disconnected');
  };
}
