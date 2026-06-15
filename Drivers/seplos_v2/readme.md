# Seplos BMS V2 — PACE protocol battery management

Seplos BMS V2 (Pusung / Suten) lithium battery management system.

## Connection
UART / PACE protocol, default unit id `1`, 19200 baud, parity `N`, 1 stop bit (all overridable in the install wizard).

## Behaviour
PACE-protocol reader (`ver` 32, `cid1` 70). A single `telemetry` command (`cid2` 66, addr-based request) decodes the response frame field-by-field: 16 per-cell voltages, four cell temperature probes plus environment and power temperatures, pack current/voltage, remaining/full/rated capacity, SOC, cycle count, SOH and port voltage. Frame-housekeeping fields (info/flags/counts) are decoded but hidden.

## Notes
Mechanically converted from the legacy single-file HexaOS driver (`uart/pace/bms/seplos_v2.json`).
