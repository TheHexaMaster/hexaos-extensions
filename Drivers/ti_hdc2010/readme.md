# Texas Instruments HDC2010 — sensor

Low-power digital humidity and temperature sensor.

## Wiring / addressing
- Bus: I2C. Default address `0x40`.
- Polled every `1000 ms` by default.
- `device_id`: register `0xFF` is expected to read `7`.

## Settings (`set.json`)
- **address** — I2C address of the chip (default `0x40`).
- **poll_ms** — read interval in ms (default `1000`).
- **meas_mode** (enum) — T+H, T only, or H only.

## Behaviour
On init the driver writes the measurement-config mode bits, enables auto
measurement at 1 Hz, and triggers the first measurement. Temperature and Humidity
are exposed as fields; each is conditionally gated on the selected measurement
mode (Temperature hidden in H-only, Humidity hidden in T-only).

## Notes
Mechanically converted from the legacy single-file HexaOS driver
(`i2c/sensor/hdc2010.json`).
