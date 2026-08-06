#include "ui.h"
#include "config.h"
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <math.h>

static Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
static bool present = false;

bool uiBegin() {
  present = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  if (!present) Serial.println("ui: no SSD1306 at 0x3C, running headless");
  return present;
}

void uiMessage(const char *line1, const char *line2, const char *line3) {
  if (!present) return;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 4);
  display.println(line1);
  if (line2) { display.setCursor(0, 20); display.println(line2); }
  if (line3) { display.setCursor(0, 36); display.println(line3); }
  display.display();
}

static const char *bleLabel(ProgressorState state) {
  switch (state) {
    case PROGRESSOR_STREAMING: return "STRM";
    case PROGRESSOR_CONNECTED: return "CONN";
    default:                   return "ADV";
  }
}

void uiDraw(float forceKg, float peakKg, float sampleRateHz,
            bool sensorOk, ProgressorState ble) {
  if (!present) return;

  static uint8_t beat = 0;
  beat++;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Header: title, mode, BLE state (or the ADC alarm, which matters more).
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(F("KRAFT"));
  display.setCursor(40, 0);
  display.print(F(MODE_NAME));
  display.setCursor(72, 0);
  if (!sensorOk && MODE != MODE_SIM) {
    display.print(F("!ADC"));
  } else {
    display.print(bleLabel(ble));
  }
  if (beat % 2 == 0) {
    display.fillCircle(SCREEN_WIDTH - 4, 3, 3, SSD1306_WHITE);
  }
  display.drawFastHLine(0, 10, SCREEN_WIDTH, SSD1306_WHITE);

  // The big number.
  display.setTextSize(3);
  display.setCursor(2, 16);
  if (fabsf(forceKg) < 100.0f) {
    display.printf("%5.1f", forceKg);
  } else {
    display.printf("%5.0f", forceKg);
  }
  display.setTextSize(1);
  display.setCursor(104, 30);
  display.print(F("kg"));

  // Peak and measured sample rate.
  display.setCursor(0, 42);
  display.printf("max %.1f", peakKg);
  display.setCursor(88, 42);
  display.printf("%2.0fHz", sampleRateHz);

  // Bar with a peak marker.
  display.drawRect(0, 53, SCREEN_WIDTH, 11, SSD1306_WHITE);
  int fill = (int)((forceKg / BAR_MAX_KG) * (SCREEN_WIDTH - 4));
  if (fill < 0) fill = 0;
  if (fill > SCREEN_WIDTH - 4) fill = SCREEN_WIDTH - 4;
  if (fill > 0) display.fillRect(2, 55, fill, 7, SSD1306_WHITE);

  int peakX = (int)((peakKg / BAR_MAX_KG) * (SCREEN_WIDTH - 4)) + 2;
  if (peakX > SCREEN_WIDTH - 3) peakX = SCREEN_WIDTH - 3;
  if (peakKg > 0.1f) {
    display.drawFastVLine(peakX, 51, 13, SSD1306_WHITE);
  }

  display.display();
}
