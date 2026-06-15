# Texas Instruments INA3221 — sensor

3-channel I2C current/voltage monitor with configurable shunt resistance,
averaging, and per-channel enable.

## Wiring / addressing
- Bus: I2C. Default address `0x40`.
- Polled every `500 ms` by default.
- `device_id`: manufacturer/die-id register `0xFE` is expected to read `21577`.

## Settings (`set.json`)
- **address** — I2C address of the chip (default `0x40`).
- **poll_ms** — read interval in ms (default `500`).
- **shunt_mohm** (int, mΩ) — shunt resistance used to convert shunt voltage to
  current (default `100`).
- **avg** (enum) — hardware averaging count.
- **conv_us** (enum) — shunt/bus conversion time.
- **ch1_en / ch2_en / ch3_en** (bool) — per-channel enable.
- **show_current** (bool) — expose computed current (A) fields.
- **show_power** (bool) — expose computed power (W) fields.

## Behaviour
On init the driver programs the config register from the channel enables,
averaging and conversion-time settings (continuous shunt+bus mode). Each enabled
channel exposes a bus voltage and shunt voltage field; the `computed[]` block
derives per-channel current (shunt voltage / shunt resistance) and power (bus
voltage × current).

## Notes
Mechanically converted from the legacy single-file HexaOS driver
(`i2c/sensor/ina3221.json`).
