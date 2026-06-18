# FocalTech FT6336U — capacitive touch controller

I2C capacitive touch controller (up to 2 simultaneous points; this template
publishes the first point: `x`, `y`, `pressed`). Commonly paired with small TFT
panels (e.g. the ST7796U). Default I2C address `0x38`.

## Binding
A touch controller is a normal **I2C device** with `category: touch`. Add it to
the bus the chip is wired to, then point a display interface's
`touch_device_slug` at this device's slug so LVGL consumes its `pressed`/`x`/`y`
fields.

## Settings (set.json)
- **address** — I2C address (default `0x38`).
- **poll_ms** — read/poll cadence (default 15 ms).
- **int_gpio** — INT line. **None → polling mode** (G_MODE=0, periodic read).
  **A pin → interrupt mode**: the driver writes G_MODE=trigger (0xA4=1) and the
  firmware reads the chip only when the INT line signals a touch (no I2C while
  idle). The pin is claimed in the shared GPIO owner map (conflict-checked,
  shown in the pinmap).
- **reset_gpio** — hardware reset line. A pin → the firmware pulses it at
  startup per the driver's `reset_timing` (active-low). None → not pulsed (e.g.
  the reset is shared with the panel and cycled by the display init).
- **touch_threshold** — written to TH_GROUP (0x80); touch-detection threshold
  (lower = more sensitive).
- **active_period** — written to PERIODACTIVE (0x88); active-mode scan/report
  period.
- **swap_xy / mirror_x / mirror_y** — touch orientation, applied by the display
  handler (not the chip). `swap_xy` transposes the axes; each mirror then flips
  that axis against the display resolution. Use these to align a touch panel
  mounted rotated/flipped relative to the display (swap first, then mirror).

## What the driver provides (drv.json)
- `reset_timing` — pre-low / pulse / post-high (boot) milliseconds for the
  reset pulse.
- `init_sequence` — at startup writes G_MODE (interrupt vs polling, derived from
  whether `int_gpio` is set), TH_GROUP and PERIODACTIVE.
- Registers + fields: `td_status` (0x02, touch count → `pressed`), `touch1`
  block (0x03..0x06 → 12-bit big-endian `x`/`y`, event-flag / touch-id nibbles
  masked off).

## Notes
First touch point only is published. INT operation is interrupt-gated polling
(the firmware level-checks the INT line at the poll tick), not a hard edge ISR.
