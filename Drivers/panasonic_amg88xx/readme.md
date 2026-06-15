# Panasonic AMG88xx — sensor

Grid-EYE 8x8 thermal IR array sensor (64 pixels). One package covers both
AMG8831 (low gain, wider object range) and AMG8833 (high gain, finer resolution)
— they share an identical register map. Pixels are 12-bit two's complement
(0.25 °C/LSB); the thermistor is 11-bit magnitude + sign (0.0625 °C/LSB).

## Wiring / addressing
- Bus: I2C. Default address `0x69` (AD_SELECT high, e.g. Adafruit module); set
  to `0x68` if AD_SELECT is tied low.
- Polled every `1000 ms` by default.

## Settings (`set.json`)
- **address** — I2C address of the chip (default `0x69`).
- **poll_ms** — read interval in ms (default `1000`).
- **frame_rate** (enum) — 10 Hz or 1 Hz.
- **show_thermistor** (bool) — expose the ambient thermistor field.
- **show_pixels** (bool) — expose all 64 pixel fields.

## Behaviour
On init the driver clears sleep/standby, issues an initial reset, sets the frame
rate, and disables the interrupt output. The thermistor is exposed as one field;
the 64 pixels are generated from a field template and arranged into an 8x8
`thermal_grid` matrix group with a heat colormap.

## Notes
Mechanically converted from the legacy single-file HexaOS driver
(`i2c/sensor/amg88xx.json`).
