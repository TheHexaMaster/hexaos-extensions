# Sungrow SH-RT / SG Hybrid — Modbus RTU inverter

Sungrow SH-RT / SG residential hybrid inverter (3-25 kW).

## Connection
UART / Modbus RTU, default unit id `1`, 9600 baud, parity `N`, 1 stop bit (all overridable in the install wizard).

## Behaviour
Block-mode reader. Input registers (func 4) expose inverter status/temperature, solar energy counters, dual PV strings and total PV power, grid voltage/frequency, battery voltage/current/power/SOC/SOH/temperature, battery running state, battery charge/discharge energy totals, and total/grid/load active power.

## Notes
Mechanically converted from the legacy single-file HexaOS driver (`uart/modbus_rtu/inverter/sungrow_sh_rt.json`).
