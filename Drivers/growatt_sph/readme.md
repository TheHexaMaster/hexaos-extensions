# Growatt SPH 3000-10000 TL-BL/TL-BH — inverter

Growatt SPH 3000-10000 TL-BL/TL-BH three-phase hybrid inverter, read over
Modbus-RTU.

## Connection
- Modbus-RTU over UART. Default `9600` baud, parity `N`, `1` stop bit.
- Default unit id `1` (override via `modbus_addr`, range 1–247).

## Behaviour
Block read mode with 10 register blocks (5 input-register blocks on func 4, 5
holding-register blocks on func 3). Exposes 92 registers: func-4 telemetry for
two PV strings, three-phase AC (L1/L2/L3), battery and BMS detail, plus grid
import/export, load and energy counters; func-3 holding registers for
charge/discharge mode, time-of-use periods, system clock, charge currents,
charge/cutoff voltages, cell-voltage cutoffs and Modbus config. Key metric
groups: `system`, `mppt`, `ac`, `battery`, `energy`, `setting`, `config`.

## Note
Mechanically converted from the legacy single-file HexaOS driver
(`uart/modbus_rtu/inverter/growatt_sph.json`).
