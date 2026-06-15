# Fitipower JD9165A — 1024x600 MIPI-DSI panel

Panel controller driver for the Fitipower JD9165A TFT (1024x600), driven over a
2-lane MIPI-DSI bus.

## Binding
Display drivers bind through the **display interface** (not a device): set the
interface's `panel_template` to this driver's slug (`fitipower_jd9165a`). The
interface entry also carries the wiring/PHY config (GPIOs, DSI PHY LDO/voltage,
rotation) and the panel geometry (width/height/bpp/pixel clock/lane count).

## What the driver provides (drv.json)
- `init_sequence` — the panel power-on command sequence.
- `dsi_bus` / `dsi_timing` — lane count, bit rate, DPI clock, H/V sync timing.
- `reset_timing` — reset pulse timing.
- `dbi_io` — virtual channel + command/parameter bit widths.
- `backlight` — PWM backlight (LEDC channel/timer, frequency, default brightness).
- `lvgl` — LVGL memory profile (heap, framebuffer mode, colour mode, partial lines).
- `panel` — informational geometry.

## Overridable settings (set.json)
- **fb_mode** — framebuffer mode: `single` / `double` / `partial`.
- **partial_lines** — number of lines in partial mode (0 = full screen).

These are applied via the display interface config (override of the LVGL memory
profile), not the device `custom` block.

## Notes
Mechanically converted from the legacy single-file display driver
(`display/dsi/jd9165a_1024x600.json`). Init sequence, timing, backlight and LVGL
profile preserved unchanged.
