# Changelog — fitipower_jd9165a

## 1.0.0 — 2026-06-15
- Initial HexaOS Extension package, converted from the legacy single-file display
  driver `display/dsi/jd9165a_1024x600.json`.
- Split into cat.json / set.json / drv.json; init sequence, DSI/reset timing,
  backlight and LVGL profile preserved unchanged. fb_mode + partial_lines exposed
  as overridable settings.
