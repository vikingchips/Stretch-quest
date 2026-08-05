/*
 * Milestone 1: scan the I2C bus.
 *
 * This is deliberately the whole program. It confirms the entire chain in one
 * go — power, the Qwiic cabling and both peripherals — before any of the code
 * that depends on them exists. Expect two addresses:
 *
 *   0x2A  NAU7802  24-bit ADC for the load cell
 *   0x3C  SSD1306  128x64 OLED, chained off the NAU7802's second Qwiic port
 *
 * One address means a break further down the chain. Neither means power or
 * the first cable.
 */
#include <Arduino.h>
#include <Wire.h>

// Xiao ESP32-C3 I2C. The silkscreen calls these D4 and D5.
constexpr int PIN_SDA = 6;  // D4
constexpr int PIN_SCL = 7;  // D5

/*
 * Battery sense, for milestone 6. The divider is 2x100k with a 100nF cap, so
 * this pin reads half of BAT+.
 *
 * A1 is not an arbitrary choice, and the alternatives are worse:
 *   A0 (GPIO2) is a strapping pin — pulling it about at boot changes how the
 *              chip starts.
 *   A3 (GPIO5) is on ADC2, which the C3 cannot read reliably while the radio
 *              is transmitting. This device transmits constantly.
 *   D8/D9      are also strapping pins. Leave them alone.
 *
 * The C3's ADC is non-linear and saturates around 2.5 V, so calibrate in
 * software and show four coarse levels. Never show a percentage you cannot
 * back up.
 */
constexpr int PIN_BATTERY = 3;  // A1

constexpr uint8_t ADDR_NAU7802 = 0x2A;
constexpr uint8_t ADDR_OLED = 0x3C;

void setup() {
  Serial.begin(115200);
  // USB CDC needs a moment before the first line is not swallowed.
  delay(2000);
  Wire.begin(PIN_SDA, PIN_SCL);
  Serial.println();
  Serial.println("stretchquest force sensor — i2c scan");
  Serial.printf("sda=gpio%d scl=gpio%d\n", PIN_SDA, PIN_SCL);
}

void loop() {
  int found = 0;
  bool sawAdc = false;
  bool sawOled = false;

  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() != 0) continue;

    found++;
    if (address == ADDR_NAU7802) sawAdc = true;
    if (address == ADDR_OLED) sawOled = true;

    const char* label = address == ADDR_NAU7802   ? "  nau7802 (adc)"
                        : address == ADDR_OLED    ? "  ssd1306 (oled)"
                                                  : "  unknown";
    Serial.printf("0x%02X%s\n", address, label);
  }

  if (found == 0) {
    Serial.println("nothing on the bus — check power and the first qwiic cable");
  } else if (!sawAdc || !sawOled) {
    Serial.printf("%d device(s); missing %s\n", found,
                  !sawAdc ? "the adc" : "the oled");
  } else {
    Serial.println("both devices present");
  }

  delay(2000);
}
