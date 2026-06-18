# Changelog — st7796u_i8080

## 1.0.0 — 2026-06-18
- Initial HexaOS Extension package. Sitronix ST7796U over the Intel 8080 (i80)
  parallel interface, 480x320, 16 bpp, BGR. Init sequence translated from the
  Tasmota uDisplay descriptor; GRAM window/rotation/invert command set, reset +
  PWM backlight timing and the LVGL pixel format included.
- Settings exposed via the display interface: `framebuffer`, `partial_lines`,
  `partial_buffering` (single/double line buffers), `heap_kb`, `rotation_deg`.
  Data pins, bus width and pixel clock are board-defined in hardware.json.
