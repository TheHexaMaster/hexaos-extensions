# Deye SUN-X-K-SG (LP3 single-phase hybrid) — inverter

Deye / Sun-Synk single-phase hybrid inverter on the LP3 platform, read over
Modbus-RTU.

## Connection
- Modbus-RTU over UART. Default `9600` baud, parity `N`, `1` stop bit.
- Default unit id `1` (override via `modbus_addr`, range 1–247).

## Behaviour
Block read mode with 5 register blocks. Exposes 24 registers covering grid,
battery and PV power and energies, battery SOC / voltage / current /
temperature, inverter status and temperatures, plus a handful of writable
settings (max charge/discharge current, SOC cutoff). Key metric groups:
`system`, `energy`, `mppt`, `ac`, `battery`, `setting`.

## Note
Mechanically converted from the legacy single-file HexaOS driver
(`uart/modbus_rtu/inverter/deye_sun_x_k_sg.json`).
