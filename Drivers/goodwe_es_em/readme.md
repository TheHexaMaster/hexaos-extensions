# GoodWe ES / EM Hybrid (3-8 kW) — inverter

GoodWe ES/EM single-phase hybrid inverter (3-8 kW), read over Modbus-RTU.

## Connection
- Modbus-RTU over UART. Default `9600` baud, parity `N`, `1` stop bit.
- Default unit id `1` (override via `modbus_addr`, range 1–247).

## Behaviour
Block read mode with 3 register blocks. Exposes 21 registers covering grid,
battery and PV instantaneous values, energy counters and inverter / battery
state. Key metric groups: `mppt`, `ac`, `system`, `battery`, `energy`.

## Note
Mechanically converted from the legacy single-file HexaOS driver
(`uart/modbus_rtu/inverter/goodwe_es_em.json`).
