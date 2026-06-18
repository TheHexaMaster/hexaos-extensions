# Goodix GT911 — capacitive touch controller

Goodix GT911 capacitive touch controller for 1024x600-class TFT panels. Supports
up to 5 simultaneous touch points; this template publishes the first point only
(`x`, `y`, `pressed`) since LVGL's `lv_indev_t` consumes single-pointer state.

## Wiring / addressing
- Bus: I2C, 16-bit register addresses (`addr_bytes: 2`). Default address `0x5D`.
- Polled every `20 ms` by default.
- No HW reset pulse is issued by this driver — the board ties the touch reset to
  the panel reset rail, which is already cycled by the display init.

## Settings (set.json)
- **address** / **poll_ms** — I2C address (default `0x5D`) and poll cadence.
- **swap_xy / mirror_x / mirror_y** — touch orientation, applied by the display
  handler (not the chip). `swap_xy` transposes the axes; each mirror then flips
  that axis against the display resolution. Use these to align a panel mounted
  rotated/flipped relative to the display (swap first, then mirror).

## Behaviour
On init the driver writes 0 to the status register (`0x814E`) to clear any stale
buffer-ready latch. Each poll reads the status byte and the 8-byte touch-data
block (`0x814F`):
- **pressed** — low nibble of status (`mask 0x0F`) = touch count; non-zero means
  a touch is active. (bit7 is sticky on this variant and is deliberately unused.)
- **x** / **y** — raw little-endian 16-bit coordinates sliced from the touch
  block; valid only when `pressed`. Orientation is applied downstream by the
  display handler, not here.
- After reading `y` (the last field), a `post_read` writes 0 back to `0x814E` to
  ack the sample so the chip captures the next one.

## Notes
Mechanically converted from the legacy single-file HexaOS driver
(`i2c/touch/gt911.json`); orientation moved to per-axis swap/mirror in 1.1.0.
