# Changelog — focaltech_ft6336u

## 1.0.0 — 2026-06-18
- Initial HexaOS Extension package. FocalTech FT6336U I2C capacitive touch
  controller; publishes the first touch point (`x`, `y`, `pressed`).
  Register/field layout: TD_STATUS (0x02) touch count + the 0x03..0x06
  first-point block, 12-bit big-endian X/Y with the event-flag / touch-id
  nibbles masked.
- Settings: `int_gpio` (none = polling mode; a pin = interrupt mode — the driver
  writes G_MODE=trigger and the firmware reads only on INT), `reset_gpio`
  (pulsed at startup per `reset_timing` when set), `touch_threshold` (→ 0x80),
  `active_period` (→ 0x88). `int_gpio` / `reset_gpio` are host pins claimed in
  the shared GPIO owner map.
- `init_sequence` writes G_MODE (derived from `int_gpio` presence), TH_GROUP and
  PERIODACTIVE at startup.
- Touch orientation settings `swap_xy` / `mirror_x` / `mirror_y`, applied by the
  display handler (swap axes first, then mirror against the display resolution)
  to align the panel to the display.
