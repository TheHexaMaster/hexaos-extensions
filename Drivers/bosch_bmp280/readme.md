# Bosch BMP280 — sensor

Atmospheric pressure + temperature sensor. Reads the 12 factory calibration
coefficients once at init (cached) and applies Bosch's compensation formulas via
a chain of computed fields. Operates in FORCED mode: each poll cycle writes
`ctrl_meas` with mode=01 to wake the chip for one measurement, then reads.

## Wiring / addressing
- Bus: I2C. Default address `0x77` (Adafruit / GY-BMP280 / most breakouts, SDO
  tied to VDDIO); set to `0x76` when SDO is tied to GND.
- Polled every `1000 ms` by default.
- `device_id`: chip-id register `0xD0` must return `0x58` (enforced); `0x60` is a
  BME280 and `0x55` a BMP180.

## Settings (`set.json`)
- **address** — I2C address of the chip (default `0x77`).
- **poll_ms** — read interval in ms (default `1000`).
- **show_calibration** (bool) — expose the raw calibration coefficients and ADC
  intermediates as fields.

## Behaviour
On init the driver soft-resets the chip and clears the config (IIR off). Each
cycle it triggers a forced single-shot measurement and reads the temperature and
pressure ADC words. The chained `computed[]` fields reproduce Bosch's reference
double-precision compensation: `t_fine` feeds Temperature, and `p_var1`/`p_var2`/
`p_raw` feed the final Pressure (in hPa).

## Notes
Mechanically converted from the legacy single-file HexaOS driver
(`i2c/sensor/bmp280.json`).
