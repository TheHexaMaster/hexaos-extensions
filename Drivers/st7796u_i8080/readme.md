# Sitronix ST7796U — 480x320 i8080 parallel panel

Panel controller driver for the Sitronix ST7796U TFT (480x320), driven over an
8- or 16-bit Intel 8080 (i80) parallel MCU bus. The controller has its own GRAM,
so LVGL renders into host draw buffers and the flush path pushes dirty
rectangles to GRAM (CASET/RASET/RAMWR) — there is no continuously-scanned
framebuffer.

## Binding
Display drivers bind through the **display interface** (not a device): set the
interface's `panel_template` to this driver's slug (`st7796u_i8080`). The
interface entry carries the board wiring in hardware.json — data lines (`d0..d7`
for 8-bit, `d0..d15` for 16-bit), `dc` (register select / LCD_RS), `wr` (write
strobe), optional `cs`, plus `reset` and `backlight`. Bus width, pixel clock and
the command/parameter bit widths are driver-defined (`drv.json` → `i80_io`) and
are **not** user-tunable.

## What the driver provides (drv.json)
- `panel` — geometry (480x320, 16 bpp, BGR colour order).
- `i80_io` — bus width, pixel clock, command/param bit widths, DC data level,
  byte-swap. Board-fixed, not exposed as settings.
- `init_sequence` — the panel power-on command sequence (sleep-out, pixel
  format, MADCTL, invert, display-on …).
- `panel_cmds` — the GRAM command set: window addressing (CASET/RASET), RAM
  write (RAMWR), MADCTL, invert on/off, display on/off.
- `rotation` — per-orientation MADCTL + offsets for 0 / 90 / 180 / 270°.
- `reset_timing` — hardware reset pulse timing.
- `backlight` — PWM backlight (LEDC channel/timer, frequency, default brightness).
- `lvgl` — pixel format (`fb_color_mode`).

## Overridable settings (set.json)
- **framebuffer** — `single` / `double` / `partial`. For a GRAM panel `partial`
  is usually the right choice; there is no full-screen scanout buffer to keep.
- **partial_lines** — number of lines per partial draw buffer.
- **partial_buffering** — `single` (1 line buffer, lower RAM) or `double`
  (2 buffers, overlaps rendering with the GRAM transfer).
- **heap_kb** — LVGL working-heap soft cap (KiB).
- **rotation_deg** — `0` / `90` / `180` / `270`.

All of these are **mandatory** in the interface config — the driver carries no
runtime fallback, so a missing setting fails display bring-up with an explicit
error rather than running a silent default.

## Notes
The init sequence was translated from the Tasmota uDisplay descriptor for this
panel. The i80 flush is asynchronous: transfer completion is signalled from the
esp_lcd color-trans-done ISR, so a draw buffer is never reused while its DMA is
still in flight (this is what makes single-buffer `partial` safe).
