# Epson RX8025T — I2C RTC

Low-power I2C real-time clock with backup battery support. Time is stored as
packed BCD across registers `0x00..0x06`.

## Wiring / addressing
- Bus: I2C. Default address `0x32` (override in the install wizard).
- `poll_ms` is `0` (RTC is read on demand, not polled).

## Settings
None — the RTC has no user-tunable settings beyond `address`.

## Behaviour
- **Init** — CTRL1 (`0x0E`) is set to `0x20` (24-hour mode, USEL=0, /INT
  disabled, no alarms), then CTRL2 (`0x0F`) is cleared to `0x00` to clear the
  PON+VLF flags after configuration.
- **Validity** — status register `0x0F`: PON (bit4=0x10) + VLF (bit1=0x02).
  `(raw & 18) == 0` (both clear) means the stored time is valid.
- **Read** — 7 bytes from register `0x00`: seconds, minutes, hours, day-of-week,
  day, month, year (year offset 2000). All BCD except day-of-week.
- **Write** — same 7-field layout written back to register `0x00`.

## Notes
Mechanically converted from the legacy single-file HexaOS driver
(`i2c/rtc/rx8025t.json`).
