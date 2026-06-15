# ASAIR AHT20 — sensor

Calibrated digital humidity + temperature sensor. A pure command-protocol chip
with no register-style addressing: the host writes a 3-byte trigger command,
waits ~80 ms for the conversion, then issues a bare 7-byte read (status, 20-bit
humidity, 20-bit temperature, CRC8).

## Wiring / addressing
- Bus: I2C. Fixed address `0x38`.
- Polled every `1500 ms` by default.

## Settings (`set.json`)
- **address** — I2C address of the chip (default `0x38`).
- **poll_ms** — read interval in ms (default `1500`).
- No device-specific settings.

## Behaviour
On init the driver issues the 0xBE 0x08 0x00 calibrate command. Each poll cycle
sends the 0xAC 0x33 0x00 measurement trigger, waits, then reads the 7-byte data
block once. Humidity is the top 20 bits and Temperature the low 20 bits of the
packed sample; an end-of-frame CRC8 (Sensirion poly) guards the whole block.

## Notes
Mechanically converted from the legacy single-file HexaOS driver
(`i2c/sensor/aht20.json`).
