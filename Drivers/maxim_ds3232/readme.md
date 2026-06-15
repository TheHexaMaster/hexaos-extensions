# Maxim Integrated DS3232 — I2C RTC

Extremely accurate I2C real-time clock with integrated TCXO and SRAM. Time is
stored as packed BCD across registers `0x00..0x06`.

## Wiring / addressing
- Bus: I2C. Default address `0x68` (override in the install wizard).
- `poll_ms` is `0` (RTC is read on demand, not polled).

## Settings
None — the RTC has no user-tunable settings beyond `address`.

## Behaviour
- **Validity** — status register `0x0F` bit7 = OSF (Oscillator Stop Flag).
  `(raw & 128) == 0` means the oscillator ran continuously and the stored time is
  valid.
- **Read** — 7 bytes from register `0x00`: seconds, minutes, hours, day-of-week,
  day, month, year (year offset 2000). All BCD except day-of-week.
- **Write** — same 7-field layout written back to register `0x00`.

## Notes
Mechanically converted from the legacy single-file HexaOS driver
(`i2c/rtc/ds3232.json`).
