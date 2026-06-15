# Changelog — ti_hdc2010

## 2.0.1 — 2026-06-15
- Catalogue metadata refresh; no functional change (registers, fields and settings unchanged). First publish through the hexaos.io catalogue pipeline.

## 1.0.0 — 2026-06-15
- Initial HexaOS Extension package, converted from the legacy single-file driver `i2c/sensor/hdc2010.json`.
- Split into cat.json / set.json / drv.json; address + poll_ms moved to overridable settings; max_instances and special_usecase removed.
