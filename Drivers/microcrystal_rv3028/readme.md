# Micro Crystal RV-3028-C7 — I2C RTC

Ultra-low-power I2C real-time clock with EEPROM-backed configuration. Time is
stored as packed BCD across registers `0x00..0x06`.

## Wiring / addressing
- Bus: I2C. Default address `0x52` (override in the install wizard).
- `poll_ms` is `0` (RTC is read on demand, not polled).

## Settings
None — the RTC has no user-tunable settings beyond `address`.

## Behaviour
- **Validity** — status register `0x0E` bit0 = PORF (Power-On Reset Flag).
  `(raw & 1) == 0` means the stored time is valid.
- **Read** — 7 bytes from register `0x00`: seconds, minutes, hours, day-of-week,
  day, month, year (year offset 2000). All BCD except day-of-week.
- **Write** — same 7-field layout written back to register `0x00`.

## Notes
Mechanically converted from the legacy single-file HexaOS driver
(`i2c/rtc/rv3028.json`).
