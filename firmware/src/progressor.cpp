#include "progressor.h"
#include "config.h"
#include <NimBLEDevice.h>
#include <string.h>

// ── Protocol constants — mirror src/finger/progressorProtocol.ts ─────────
static const char *SERVICE_UUID = "7e4e1701-1ea6-40c9-9dcc-13d34ffead57";
static const char *DATA_UUID    = "7e4e1702-1ea6-40c9-9dcc-13d34ffead57";
static const char *CONTROL_UUID = "7e4e1703-1ea6-40c9-9dcc-13d34ffead57";

enum Command : uint8_t {
  CMD_TARE_SCALE          = 100,
  CMD_START_WEIGHT_MEAS   = 101,
  CMD_STOP_WEIGHT_MEAS    = 102,
  CMD_START_PEAK_RFD      = 103,  // unimplemented: RFD is a parked decision
  CMD_START_PEAK_RFD_SER  = 104,
  CMD_ADD_CALIBRATION_PT  = 105,  // calibration stays on serial for now
  CMD_SAVE_CALIBRATION    = 106,
  CMD_GET_APP_VERSION     = 107,
  CMD_GET_ERROR_INFO      = 108,
  CMD_CLR_ERROR_INFO      = 109,
  CMD_ENTER_SLEEP         = 110,  // milestone 6
  CMD_GET_BATTERY_VOLTAGE = 111,
  CMD_GET_DEVICE_ID       = 112,
};

enum ResponseTag : uint8_t {
  RES_CMD_RESPONSE = 0,
  RES_WEIGHT_MEAS  = 1,
};

/*
 * Ours, not Tindeq's.
 *
 * Tindeq reserves 105 and 106 for calibration, but this project has no
 * verified reference for their payload format — BigBanger reads the whole
 * write as one integer, so multi-byte commands do not exist in the firmware
 * we checked ourselves against. Guessing at a format and silently
 * disagreeing with a real Progressor would be worse than owning a private
 * range, so these sit far above theirs. A real Progressor ignores them, and
 * the app's protocol file documents the same pair.
 */
static const uint8_t SQ_CMD_CALIBRATE = 0xC0;  // + float32 LE known kg
static const uint8_t SQ_RES_CALIBRATE = 0x40;  // + uint8 ok + float32 LE factor

static const char    *APP_VERSION = "1.0.0";
static const uint64_t DEVICE_ID   = 42;

// TODO milestone 6: read the A1 divider instead. Until it is fitted this is
// a stub, and any app showing 3.7 V is showing this constant, not a battery.
static const uint32_t BATTERY_STUB_MV = 3700;

// ── State ────────────────────────────────────────────────────────────────
static NimBLECharacteristic *dataChar = nullptr;
static volatile bool streaming     = false;
static volatile bool subscribed    = false;
static volatile bool tareRequested = false;
static volatile bool calibrationRequested = false;
static volatile float calibrationKg = 0.0f;
static volatile ProgressorState state = PROGRESSOR_ADVERTISING;
static uint32_t streamStartUs = 0;

ProgressorState progressorState() {
  return streaming ? PROGRESSOR_STREAMING : state;
}

// ── Packet building ──────────────────────────────────────────────────────
// The ESP32-C3 is little-endian, so memcpy of a float/uint32 produces
// exactly the LE layout the wire format wants. Canonical fixture, asserted
// byte for byte by a test on the app side:
//   kg = 12.5, elapsed = 1_000_000 us
//   -> 01 08 00 00 48 41 40 42 0f 00
size_t progressorBuildWeightPacket(uint8_t *out, float kg, uint32_t elapsedUs) {
  out[0] = RES_WEIGHT_MEAS;
  out[1] = 8;
  memcpy(out + 2, &kg, 4);
  memcpy(out + 6, &elapsedUs, 4);
  return 10;
}

static void notifyResponse(const uint8_t *payload, uint8_t length) {
  if (!dataChar) return;
  uint8_t pkt[2 + 32];
  if (length > 32) length = 32;
  pkt[0] = RES_CMD_RESPONSE;
  pkt[1] = length;
  memcpy(pkt + 2, payload, length);
  dataChar->setValue(pkt, 2 + length);
  dataChar->notify();
}

// ── Callbacks ────────────────────────────────────────────────────────────
class ControlCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic *c, NimBLEConnInfo &) override {
    NimBLEAttValue value = c->getValue();
    if (value.size() < 1) return;

    // Ours, and the only command carrying a payload — handled before the
    // switch so Tindeq's single-byte vocabulary stays exactly as it was.
    if (value[0] == SQ_CMD_CALIBRATE && value.size() >= 5) {
      float kg;
      memcpy(&kg, value.data() + 1, 4);
      calibrationKg = kg;
      // Deferred like the tare: the filtered reading and the NVS write both
      // live in the main loop, and neither belongs in a BLE callback.
      calibrationRequested = true;
      return;
    }

    switch (value[0]) {
      case CMD_TARE_SCALE:
        // The filtered reading lives in the main loop; hand it a flag
        // rather than reaching into another context from a BLE callback.
        tareRequested = true;
        break;

      case CMD_START_WEIGHT_MEAS:
        streamStartUs = micros();
        streaming = true;
        Serial.println("ble: stream started");
        break;

      case CMD_STOP_WEIGHT_MEAS:
        streaming = false;
        Serial.println("ble: stream stopped");
        break;

      case CMD_GET_BATTERY_VOLTAGE: {
        uint8_t mv[4];
        uint32_t v = BATTERY_STUB_MV;
        memcpy(mv, &v, 4);
        notifyResponse(mv, 4);
        break;
      }

      case CMD_GET_APP_VERSION:
        notifyResponse((const uint8_t *)APP_VERSION, strlen(APP_VERSION));
        break;

      case CMD_GET_DEVICE_ID: {
        uint8_t id[8];
        uint64_t v = DEVICE_ID;
        memcpy(id, &v, 8);
        notifyResponse(id, 8);
        break;
      }

      case CMD_GET_ERROR_INFO: {
        static const char *msg = "No crash";
        notifyResponse((const uint8_t *)msg, strlen(msg));
        break;
      }

      default:
        // Unknown or not-yet-implemented commands are ignored on purpose:
        // answering with a made-up payload would be worse than silence.
        Serial.printf("ble: ignoring command %u\n", value[0]);
        break;
    }
  }
};

class DataCallbacks : public NimBLECharacteristicCallbacks {
  // NimBLE 2.x removed getSubscribedCount(), so the subscription is tracked
  // here instead: subValue 0 = unsubscribed, 1 = notifications, 2 = indications.
  void onSubscribe(NimBLECharacteristic *, NimBLEConnInfo &, uint16_t subValue) override {
    subscribed = (subValue != 0);
    Serial.printf("ble: data point %s\n", subscribed ? "subscribed" : "unsubscribed");
  }
};

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer *, NimBLEConnInfo &) override {
    state = PROGRESSOR_CONNECTED;
    Serial.println("ble: central connected");
  }

  void onDisconnect(NimBLEServer *, NimBLEConnInfo &, int reason) override {
    // A vanished central must not leave the stream running: the next
    // connection expects a device at rest, and so does the battery. The
    // stack does not promise an unsubscribe event on disconnect, so the
    // flag is cleared here too.
    streaming = false;
    subscribed = false;
    state = PROGRESSOR_ADVERTISING;
    Serial.printf("ble: disconnected (%d), advertising again\n", reason);
    NimBLEDevice::startAdvertising();
  }
};

// ── Public API ───────────────────────────────────────────────────────────
void progressorBegin() {
  NimBLEDevice::init(DEVICE_NAME);

  NimBLEServer *server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  NimBLEService *service = server->createService(SERVICE_UUID);
  dataChar = service->createCharacteristic(
      DATA_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  dataChar->setCallbacks(new DataCallbacks());
  NimBLECharacteristic *control = service->createCharacteristic(
      CONTROL_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  control->setCallbacks(new ControlCallbacks());
  // No service->start(): a 2.x no-op — services start with the server.

  // The 31-byte advertisement cannot hold both a 128-bit service UUID
  // (16 bytes) and the name, so the split is made explicitly rather than
  // left to the library to decide.
  //
  // The name goes in the primary advertisement: it is what the official
  // Tindeq app and Web Bluetooth match on, and a scanner sees it even
  // without requesting a scan response. The service UUID goes in the scan
  // response, where Chrome still reads it for a services filter. Letting
  // the library pick put the name in the scan response, and a device whose
  // name never arrives shows up as an unnamed row that no name filter can
  // ever match.
  NimBLEAdvertisementData advData;
  advData.setFlags(BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP);
  advData.setName(DEVICE_NAME);

  NimBLEAdvertisementData scanData;
  scanData.addServiceUUID(NimBLEUUID(SERVICE_UUID));

  NimBLEAdvertising *adv = NimBLEDevice::getAdvertising();
  adv->setAdvertisementData(advData);
  adv->setScanResponseData(scanData);
  adv->enableScanResponse(true);
  if (!adv->start()) {
    Serial.println("ble: ADVERTISING FAILED TO START");
    return;
  }

  state = PROGRESSOR_ADVERTISING;
  // The address is printed so it can be matched against a scanner's list:
  // an unnamed row at the right address is a name problem, no row at all is
  // an advertising problem, and the two need different fixes.
  Serial.printf("ble: advertising as %s, address %s\n",
                DEVICE_NAME, NimBLEDevice::getAddress().toString().c_str());
}

void progressorOnSample(float kg) {
  if (!streaming || !subscribed || !dataChar) return;

  uint8_t pkt[10];
  // Unsigned subtraction survives micros() wrapping at ~71 minutes.
  progressorBuildWeightPacket(pkt, kg, micros() - streamStartUs);
  dataChar->setValue(pkt, sizeof(pkt));
  dataChar->notify();
}

bool progressorConsumeTareRequest() {
  if (!tareRequested) return false;
  tareRequested = false;
  return true;
}

bool progressorConsumeCalibrationRequest(float *knownKg) {
  if (!calibrationRequested) return false;
  calibrationRequested = false;
  *knownKg = calibrationKg;
  return true;
}

void progressorReportCalibration(bool ok, float countsPerKg) {
  if (!dataChar) return;
  uint8_t pkt[7];
  pkt[0] = SQ_RES_CALIBRATE;
  pkt[1] = 5;
  pkt[2] = ok ? 1 : 0;
  memcpy(pkt + 3, &countsPerKg, 4);
  dataChar->setValue(pkt, sizeof(pkt));
  dataChar->notify();
}
