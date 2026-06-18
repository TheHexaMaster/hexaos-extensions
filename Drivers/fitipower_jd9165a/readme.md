# Fitipower JD9165A — 1024x600 MIPI-DSI panel

Panel controller driver for the Fitipower JD9165A TFT (1024x600), driven over a
2-lane MIPI-DSI bus.

## Binding
Display drivers bind through the **display interface** (not a device): set the
interface's `panel_template` to this driver's slug (`fitipower_jd9165a`). The
interface entry also carries the board wiring (reset/backlight GPIOs) and the
DSI/LVGL settings below. Panel geometry (width/height/bpp) and DSI bus/timing are
driver-defined in `drv.json`.

## What the driver provides (drv.json)
- `panel` — geometry (1024x600, 16 bpp).
- `dsi_bus` / `dsi_timing` — lane count, bit rate, DPI clock, H/V sync timing.
- `reset_timing` — reset pulse timing.
- `dbi_io` — virtual channel + command/parameter bit widths.
- `init_sequence` — the panel power-on command sequence.
- `backlight` — PWM backlight (LEDC channel/timer, frequency, default brightness).
- `lvgl` — pixel format (`fb_color_mode`).

## Overridable settings (set.json)
- **framebuffer** — `single` / `double` / `partial` (DSI scanout strategy;
  `double` is tear-free).
- **partial_lines** — number of lines in partial mode (0 = full screen).
- **heap_kb** — LVGL working-heap soft cap (KiB).
- **rotation_deg** — `0` / `90` / `180` / `270`.
- **dsi_phy_ldo_channel** / **dsi_phy_voltage_mv** — MIPI-DSI PHY power
  (internal LDO channel + voltage in mV).

These are applied through the display interface config. They are **mandatory** —
the driver carries no runtime fallback, so a missing setting fails display
bring-up with an explicit error.

## Notes
Init sequence, DSI/reset timing and backlight are preserved from the original
panel bring-up. As of 1.1.0 the LVGL memory knobs (framebuffer mode, partial
lines, heap) live in `set.json` as interface settings rather than in the driver
body; `drv.json` keeps only the intrinsic pixel format.
