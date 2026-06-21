# Changelog — hexaos_battery

## 2.0.0 — 2026-06-21
- **Complete modern rebuild** with **six pre-built themes** — **Vertical**,
  **Horizontal**, **Segment vertical**, **Segment horizontal**, **Ring** and
  **Minimal** — chosen from a dropdown **in the Theme Selector section header**;
  selecting a theme reveals that theme's own design settings below it.
- **Responsive.** The battery is sized by CSS container queries against the cell:
  **Scale to fit** keeps the shape and grows it to the largest size that fits
  (like an SVG viewBox), **Stretch to fill** uses the whole widget — set in the
  new **Sizing** section. No more shrinking to a useless stick on resize.
- **Segment themes** are a proper battery whose interior is split into a
  **configurable number of cells** (1–12, with adjustable gap), each with a subtle
  3D gloss.
- **Per-theme design settings:** **frame** width + colour + corner radius (battery
  themes), **ring thickness** (ring), **segment** count + gap, a **glow** toggle +
  colour, and three-stage **threshold colours** (charge / warning / critical).
- **Tasteful animations:** a smooth fill tween, an **auto-detected charging**
  shimmer + bolt (latches when the level rises — no extra binding), and a gentle
  **low-battery pulse**. Each is individually toggleable; all respect
  `prefers-reduced-motion`.
- **New config architecture.** The numeric input is the **Simple Datapoint**
  (Bindings); appearance settings under **Appearance**, range/thresholds under
  **Logic**; strict `span`/12 layout. Themes are driven by CSS custom properties
  (`--hxp`, `--hxc`, …) and scale with the cell.
- **Breaking:** a widget saved on 1.x must be re-bound and re-styled.

## 1.0.0 — 2026-06-19
- Initial release. Reference HexaOS Dashboard Widget: a vertical battery gauge
  (`hexaos_battery.battery`) filled by a numeric datapoint, with a low-level
  colour threshold and an optional percentage label.
