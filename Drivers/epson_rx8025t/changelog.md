# Changelog — epson_rx8025t

## 1.0.0 — 2026-06-15
- Initial HexaOS Extension package, converted from the legacy single-file driver `i2c/rtc/rx8025t.json`.
- Split into cat.json / set.json / drv.json; address + poll_ms moved to overridable settings; max_instances removed; special_usecase "RTC" encoded as protocol "rtc" (RTCs only).
