# Battery — Dashboard Widget

A modern, themeable, **responsive** battery for a numeric **level / state-of-charge**
datapoint (a %, a tank, an SoC — anything that maps onto 0–100). Pick a look, set
your colours and thresholds, and it scales to fit the cell and animates smoothly
as the value changes — with an auto-detected charging shimmer and a low pulse.

This is the **reference Dashboard Widget** for HexaOS — copy it as the starting
point for your own widget. See the *HexaOS Dashboard Widgets — Developer Guide*
(`manuals/`) for the full contract.

## Binding
Bind any **numeric** datapoint in the **Bindings** tab (the *Battery level* simple
datapoint). The value is mapped from `Empty at`…`Full at` onto a 0–100 % charge.

## Themes
Choose from the dropdown in the **Theme Selector** section header. Each theme
reveals its own design settings below it.

- **Vertical** / **Horizontal** — a solid-fill battery (upright / landscape).
- **Segment vertical** / **Segment horizontal** — a battery whose interior is split
  into a configurable number of glossy cells.
- **Ring** — a circular gauge with the % in the centre.
- **Minimal** — a big percentage over a slim progress bar.

## Sizing (responsive)
The **Sizing** section controls how the battery uses the cell on resize:
- **Scale to fit (keep shape)** — keeps the battery's aspect ratio and grows it to
  the largest size that fits (set a custom **Aspect W÷H** if you like).
- **Stretch to fill** — uses the whole widget area.

## Settings (Appearance)
- **Theme Selector** — the theme (header) + **Show %**.
- **Sizing** — Fit mode + aspect ratio.
- **Frame** *(battery themes)* — frame width, frame colour, corner radius.
- **Segments** *(segment themes)* — segment count (1–12) + gap.
- **Ring** *(ring theme)* — ring thickness.
- **Colours** — Charge / Warning / Critical fill + optional Track (empty) colour.
- **Glow** — glow on/off + glow colour.
- **Animation** — Animate fill, Charging effect, Low pulse.

## Settings (Logic)
- **Range** — **Empty at / Full at**: the value range mapped to 0 % / 100 %.
- **Thresholds** — **Warning ≤ %** and **Critical ≤ %**: the fill switches colour
  (and pulses, when critical) at or below these levels.

The label/icon/last-update styling and the container (size, margins, background,
title) come from the standard **Appearance** / **Common** tabs every widget shares.

## Anatomy
- `cat.json` — identity + asset manifest; `provides: ["hexaos_battery.battery"]`.
- `widget.js` — registers the widget; computes state and sets CSS custom
  properties (`--hxp` fill %, `--hxc` colour, `--hx-ar` aspect, frame/glow/segment
  vars) + state classes per tick. All settings live in `def.opts`.
- `widget.css` — namespaced `.hxbat-*` styles for every theme + the animations.
  The battery box is sized by **CSS container queries** against the cell; text and
  px sizes scale via `em` + `--dw-scale`.

The widget is read-only and needs no recorder; it repaints from the live cache on
every update. It touches only `host` and `ctx` — never Alpine/`this`.
