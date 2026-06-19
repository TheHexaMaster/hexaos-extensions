# Battery — Dashboard Widget

A vertical battery gauge that fills according to a numeric datapoint (e.g. a
state-of-charge or a tank/level in %). The fill turns red below a configurable
low threshold and an optional percentage label is shown inside the cell.

This is the **reference Dashboard Widget** for HexaOS — copy it as the starting
point for your own widget. See `SCHEMA.md` → *Dashboard Widget Package Schema*
for the full contract.

## Binding
Bind any **numeric** datapoint (read-only). The widget maps it from
`Empty at`…`Full at` onto 0–100 % fill.

## Settings
- **Empty at / Full at** — the value range mapped to 0 % / 100 % fill.
- **Low %** — the fill switches to the low colour at or below this percentage.
- **Show %** — show the numeric percentage label inside the battery.
- **Fill colour / Low colour** — normal and low-level fill colours.

## Anatomy
- `cat.json` — identity + asset manifest; `provides: ["hexaos_battery.battery"]`.
- `widget.js` — registers the widget into `window.HexaDash` (options in `def.opts`,
  there is no `set.json`).
- `widget.css` — namespaced `.hxbat-*` styles; reads the dashboard CSS variables
  and uses container-query units so it scales with the cell.

The widget is read-only and needs no recorder; it repaints from the live cache on
every update. It touches only `host` and `ctx` — never Alpine/`this`.
