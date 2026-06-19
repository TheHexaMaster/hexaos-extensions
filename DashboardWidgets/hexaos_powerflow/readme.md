# Power Flow — Dashboard Widget

An animated energy power-flow diagram for the HexaOS WebUI dashboard, inspired by
the Home Assistant *power-flow-card-plus*. Four nodes sit on a diamond — **Solar**
(top), **Grid** (left), **Home** (right), **Battery** (bottom) — and animated dots
travel along each link in the direction energy is flowing, faster when more power
moves.

## Binding (multi-point)
This is a **multi-point** widget: instead of one datapoint it binds one per node,
each picked from the config form (a `point`-type option). Bind a **signed power**
datapoint per node — values in watts:

| Node    | Point                | Sign convention                                  |
|---------|----------------------|--------------------------------------------------|
| Solar   | `Solar power`        | production (always flows out)                    |
| Grid    | `Grid power`         | **+ import** (grid → home) / **− export**        |
| Battery | `Battery power`      | **+ discharge** (battery → home) / **− charge**  |
| Home    | `Home power` *(opt)* | consumption — auto-computed if left unbound      |
| Battery | `Battery charge %` *(opt)* | fills the battery glyph and shows under it |

Any sensor whose sign is reversed can be flipped with the per-node **Invert** switch.
When the Home point is left empty it is derived from the energy balance:
`home = solar + grid_import + battery_discharge − grid_export − battery_charge`.

## Flow logic
Per update the widget splits the measured powers into the seven links it draws:
solar → home / battery / grid, grid → home / battery, battery → home / grid.
Solar serves the house first, then charges the battery, then exports; the house is
supplied from solar first, then the battery, then the grid. Each link only animates
while its power is above the **Hide flow** threshold.

## Settings
- **Points** — Solar / Grid / Battery / Home / Battery-charge datapoints.
- **Invert** — flip the sign of any node whose sensor uses the opposite convention.
- **Labels / colours** — per-node label text and colour; **Show labels** toggle.
- **Dot colour** — *By source* (each dot takes its source node's colour) or *Fixed*.
- **kW threshold / decimals** — values switch from `W` to `kW` above the threshold.
- **Fastest / Slowest dot (s)** + **Full speed at (W)** — map power to dot speed:
  a link at/above *Full speed at* runs at *Fastest*, an idle link at *Slowest*.
- **Hide flow < (W)** — links below this power show no dots.
- **Dot size** — ball stroke width (SVG user units).

## Anatomy
- `cat.json` — identity + asset manifest; `provides: ["hexaos_powerflow.powerflow"]`.
- `widget.js` — registers the widget into `window.HexaDash`; binds extra points via
  `point` opts and reads them with `ctx.resolve(slug)`.
- `widget.css` — namespaced `.hxpf-*` styles. The dots are an animated dashed
  stroke, so the whole diagram scales with the cell and needs no resize handling.

The widget is read-only and needs no recorder; it repaints from the live cache on
every update and touches only `host` and `ctx` — never Alpine/`this`.

> Requires a HexaOS build with the **multi-point widget API** (`point` options and
> `ctx.resolve()`); on older firmware the node pickers and live values are unavailable.
