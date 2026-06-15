# AMS TSL2561 — sensor

Digital ambient light sensor with dual photodiodes — CH0 = full spectrum
(visible + IR), CH1 = IR only. Illuminance in lux is derived from the CH1/CH0
ratio via the manufacturer's piecewise formula calibrated for the T/FN/CL
package. The TSL2561 uses a command-byte protocol (CMD/WORD flags baked into the
register address literals).

## Wiring / addressing
- Bus: I2C. The 3-state ADDR pin selects `0x29` (ADDR=GND), `0x39` (ADDR=float,
  default), or `0x49` (ADDR=VCC).
- Polled every `1000 ms` by default.
- `device_id`: ID register `0x8A` is expected to read one of `0x10/0x11/0x12`
  (PARTNO=TSL2561, any revision); WARN-only, not enforced.

## Settings (`set.json`)
- **address** — I2C address of the chip (default `0x39`).
- **poll_ms** — read interval in ms (default `1000`).
- **gain** (enum) — 1× (bright/outdoor) or 16× (low light/indoor).
- **integration** (enum) — 13.7 ms, 101 ms, or 402 ms integration time.
- **formula_mode** (enum) — SparkFun 4-segment or Adafruit 8-segment lux table.
- **show_raw** (bool) — expose the raw CH0/CH1 channel counts.

## Behaviour
On init the driver powers the chip up and programs the TIMING register from gain
and integration. Each cycle it reads the CH0 and CH1 word registers. The
`computed[]` chain rescales both channels to the reference operating point,
computes the CH1/CH0 ratio, selects the active piecewise lux table (only the
formula matching `formula_mode` is compiled), and produces a final Illuminance
field with a saturation clamp.

## Notes
Mechanically converted from the legacy single-file HexaOS driver
(`i2c/sensor/tsl2561.json`).
