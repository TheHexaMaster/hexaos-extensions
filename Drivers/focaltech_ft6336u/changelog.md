# Changelog — focaltech_ft6336u

## 1.0.0 — 2026-06-18
- Initial HexaOS Extension package. FocalTech FT6336U I2C capacitive touch
  controller; publishes the first touch point (x, y, pressed). Register/field
  layout: TD_STATUS (0x02) touch count + the 0x03..0x06 first-point block,
  12-bit big-endian X/Y with the event-flag / touch-id nibbles masked.
- Optional `int_gpio` setting: when set, the firmware claims the pin and runs
  the driver interrupt-gated (reads only when the INT line is asserted) instead
  of polling continuously.
