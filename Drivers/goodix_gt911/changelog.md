# Changelog — goodix_gt911

## 1.1.0 — 2026-06-18
- Touch orientation is now per-board via independent `swap_xy` / `mirror_x` /
  `mirror_y` settings, applied by the display handler (swap axes first, then
  mirror each axis against the display resolution). Replaces the previous
  `x_max` / `y_max` / `swap_xy` — the display handler uses the live display
  resolution as the mirror pivot, so the explicit max values are no longer
  needed.

## 1.0.0 — 2026-06-15
- Initial HexaOS Extension package, converted from the legacy single-file driver `i2c/touch/gt911.json`.
- Split into cat.json / set.json / drv.json; address + poll_ms moved to overridable settings; max_instances removed.
