# Growatt SPF6000ES — inverter

Growatt SPF6000ES off-grid inverter, read over Modbus-RTU.

## Connection
- Modbus-RTU over UART. Default `9600` baud, parity `N`, `1` stop bit.
- Default unit id `1` (override via `modbus_addr`, range 1–247).

## Behaviour
Block read mode with 6 register blocks (3 input-register blocks on func 4, 3
holding-register blocks on func 3). Exposes 74 registers: func-4 telemetry for
PV, AC output, battery, load, plus error/warning flags and energy counters; a
large set of func-3 writable holding registers (inverter on/off, output/charge
priority, charge voltages and currents, SOC thresholds, resets, battery
protocol). Key metric groups: `system`, `mppt`, `ac`, `battery`, `energy`,
`setting`, `config`.

## Note
Mechanically converted from the legacy single-file HexaOS driver
(`uart/modbus_rtu/inverter/growatt_spf6000es.json`).
