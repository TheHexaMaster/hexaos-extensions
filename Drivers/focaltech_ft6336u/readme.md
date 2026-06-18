# FocalTech FT6336U — capacitive touch controller

I2C capacitive touch controller (up to 2 simultaneous points; this template
publishes the first point: `x`, `y`, `pressed`). Commonly paired with small TFT
panels (e.g. the ST7796U).

## Binding
A touch controller is a normal **I2C device** with `category: touch`. Add it to
the bus the chip is wired to, then point a display interface's
`touch_device_slug` at this device's slug so LVGL consumes its `pressed`/`x`/`y`
fields.

## Settings (set.json)
- **address** — I2C address (default `0x38`).
- **poll_ms** — poll cadence (default 20 ms). Also the reaction interval when an
  INT GPIO is set (see below).
- **int_gpio** — optional interrupt line. `-1` = plain periodic polling. When set
  to a GPIO number, the driver **stops continuously polling**: at each tick it
  checks the INT line (active-low) and only reads the chip when a touch is
  signalled, publishing a released state otherwise — so an idle panel does no
  I2C traffic. The pin is claimed in the firmware's shared GPIO owner map
  (conflicts are rejected at config commit and the pin shows in the pinmap),
  exactly like a bus or interface pin. Reaction latency is one `poll_ms` tick.
- **x_max / y_max** — raw coordinate range, used by the display handler to scale
  into LVGL display coordinates. Match the paired panel.
- **swap_xy** — swap raw X/Y before handing to LVGL (for rotated sensor mounts).

## What the driver provides (drv.json)
- `td_status` (0x02) — touch count (low nibble) → `pressed`.
- `touch1` block (0x03..0x06) — first point; `x`/`y` are the 12-bit big-endian
  coordinates with the event-flag / touch-id nibbles masked off.

## Notes
The first touch point only is published, matching the GT911 template. The INT
mode is interrupt-gated polling (level-checked at the poll tick), not a hard
edge ISR — "react within the poll interval". The INT line is treated as
active-low (idle high, pulled up).
