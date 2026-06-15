# Changelog — bosch_bmp280

## 1.0.0 — 2026-06-15
- Initial HexaOS Extension package, converted from the legacy single-file driver `i2c/sensor/bmp280.json`.
- Split into cat.json / set.json / drv.json; address + poll_ms moved to overridable settings; max_instances and special_usecase removed.
