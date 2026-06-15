# Solis S5/S6 Hybrid — Modbus RTU inverter

Solis (Ginlong) S5/S6 Hybrid RHI / RAI / RAI-S series hybrid inverter.

## Connection
UART / Modbus RTU, default unit id `1`, 9600 baud, parity `N`, 1 stop bit (all overridable in the install wizard).

## Behaviour
Block-mode reader. Input registers (func 4) expose solar energy counters, dual PV strings, AC voltage/current/frequency/power, battery voltage/current/power/SOC/SOH/temperature, inverter temperature, house load power and grid power.

## Notes
Mechanically converted from the legacy single-file HexaOS driver (`uart/modbus_rtu/inverter/solis_s5_s6_hybrid.json`).
