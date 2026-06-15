# Solax X1/X3 Hybrid Gen3 — Modbus RTU inverter

Solax X1/X3 Hybrid Gen3 (3-15 kW) hybrid inverter.

## Connection
UART / Modbus RTU, default unit id `1`, 9600 baud, parity `N`, 1 stop bit (all overridable in the install wizard).

## Behaviour
Block-mode reader. Input registers (func 4) expose all-phase grid voltages/currents/powers, dual PV strings, battery metrics, inverter/battery state, temperatures and energy counters; holding registers (func 3) expose writable configuration and settings (on/off, safety country, power and power-factor limits, charger mode, charge/discharge schedules and SOC limits, battery limits, RTC, generator and EPS controls).

## Notes
Mechanically converted from the legacy single-file HexaOS driver (`uart/modbus_rtu/inverter/solax_x_hybrid_gen3.json`).
