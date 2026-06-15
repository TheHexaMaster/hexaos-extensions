# Changelog — xinluda_xl9535

## 1.0.0 — 2026-06-15
- Initial HexaOS Extension package, converted from the legacy single-file driver
  `i2c/device/xl9535.json`.
- Split into `cat.json` / `set.json` / `drv.json`; `address` + `poll_ms` moved to
  overridable settings; `max_instances` and `special_usecase` removed.
- Register map, init sequence and 16-pin field template preserved unchanged.
