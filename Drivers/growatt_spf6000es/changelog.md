# Changelog — growatt_spf6000es

## 1.0.0 — 2026-06-15
- Initial HexaOS Extension package, converted from the legacy single-file driver `uart/modbus_rtu/inverter/growatt_spf6000es.json`.
- Split into cat.json / set.json / drv.json; connection params (baud/parity/stop) + modbus unit id moved to overridable settings; max_instances removed.
