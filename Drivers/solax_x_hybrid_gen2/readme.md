# Solax X1/X3 Hybrid Gen2 — Modbus RTU inverter

Solax X1/X3 Hybrid Gen2 (3-7.5 kW, ~2018-2020) hybrid inverter.

## Connection
UART / Modbus RTU, default unit id `1`, 9600 baud, parity `N`, 1 stop bit (all overridable in the install wizard).

## Behaviour
Block-mode reader. Input registers (func 4) expose AC/PV/battery power, frequency, temperatures, SOC, inverter/battery state and energy counters; holding registers (func 3) expose writable configuration and settings (power limits, charge/discharge schedules, charger mode, battery limits, on/off and manual control).

## Notes
Mechanically converted from the legacy single-file HexaOS driver (`uart/modbus_rtu/inverter/solax_x_hybrid_gen2.json`).
