# Changelog — goodwe_es_em

## 1.0.1 — 2026-06-15
- Removed redundant timeout defaults from drv.json (read_timeout_ms, device_timeout_ms, device_pause_ms, read_pause_ms, stale_ms); set.json is the single source of truth for these overridable settings (engine reads set.json).

## 1.0.0 — 2026-06-15
- Initial HexaOS Extension package, converted from the legacy single-file driver `uart/modbus_rtu/inverter/goodwe_es_em.json`.
- Split into cat.json / set.json / drv.json; connection params (baud/parity/stop) + modbus unit id moved to overridable settings; max_instances removed.
