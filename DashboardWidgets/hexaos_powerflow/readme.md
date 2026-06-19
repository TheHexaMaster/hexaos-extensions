# Power Flow — Dashboard Widget

An animated energy power-flow diagram for the HexaOS WebUI dashboard, inspired by
the Home Assistant *power-flow-card-plus*. Four nodes sit on a square — **Solar**
(top-left), **Battery** (top-right), **Grid** (bottom-left), **Home** (bottom-right)
— and a stream of glowing balls glides from source to sink along each link. The
more power a link carries, the **bigger and faster** its balls; the battery node
carries a circular state-of-charge ring.

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
| Battery | `Battery charge %` *(opt)* | drives the SOC ring + % label on the battery |

Any sensor whose sign is reversed can be flipped with the per-node **Invert** switch.
When the Home point is left empty it is derived from the energy balance:
`home = solar + grid_import + battery_discharge − grid_export − battery_charge`.

## Flow logic
Per update the widget splits the measured powers into the seven links it can draw:
solar → home / battery / grid, grid → home / battery, battery → home / grid.
Solar serves the house first, then charges the battery, then exports; the house is
supplied from solar first, then the battery, then the grid. Each link only streams
balls while its power is above the **Hide flow** threshold.

## Settings
- **Points** — Solar / Grid / Battery / Home / Battery-charge datapoints.
- **Invert** — flip the sign of any node whose sensor uses the opposite convention.
- **Labels / colours** — per-node label text and colour; **Show labels** toggle.
- **Ball colour** — *By source* (each ball takes its source node's colour) or *Fixed*.
- **kW threshold / decimals** — values switch from `W` to `kW` above the threshold.
- **Full power at (W)** — the power at which a link's balls reach full size and speed.
- **Ball size / Flow speed** — multipliers to taste.
- **Hide flow < (W)** — links below this power carry no balls.

## Anatomy
- `cat.json` — identity + asset manifest; `provides: ["hexaos_powerflow.powerflow"]`.
- `widget.js` — registers the widget into `window.HexaDash`; binds extra points via
  `point` opts and reads them with `ctx.resolve(slug)`; the ball stream runs on a
  `requestAnimationFrame` loop (started in `render`, stopped in `destroy`).
- `widget.css` — namespaced `.hxpf-*` styles. The diagram is one square SVG viewBox,
  so it scales with the cell and needs no resize handling.

The widget is read-only and needs no recorder; it repaints from the live cache on
every update and touches only `host` and `ctx` — never Alpine/`this`.

> Requires a HexaOS build with the **multi-point widget API** (`point` options and
> `ctx.resolve()`); on older firmware the node pickers and live values are unavailable.
