# Changelog — fitipower_jd9165a

## 1.1.0 — 2026-06-18
- LVGL memory settings moved out of the driver body into `set.json` as
  interface settings: `framebuffer` (renamed from `fb_mode`), `partial_lines`,
  and new `heap_kb` (LVGL heap soft-cap), `rotation_deg`, `dsi_phy_ldo_channel`,
  `dsi_phy_voltage_mv`.
- `drv.json` `lvgl` block reduced to the intrinsic `fb_color_mode`; `heap_kb`,
  `framebuffer` and `partial_lines` removed from the driver body.
- Settings are now mandatory at runtime (no hardcoded fallback) — a missing
  one fails display bring-up. Requires the firmware display memory-model rework.

## 1.0.0 — 2026-06-15
- Initial HexaOS Extension package, converted from the legacy single-file display
  driver `display/dsi/jd9165a_1024x600.json`.
- Split into cat.json / set.json / drv.json; init sequence, DSI/reset timing,
  backlight and LVGL profile preserved unchanged. fb_mode + partial_lines exposed
  as overridable settings.
