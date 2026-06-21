# Changelog — hexaos_powerflow

## 3.0.0 — 2026-06-21
- **New config architecture.** Every datapoint (each node's main + secondary, plus
  the battery SOC) is now a named source registered via the **Bindings** tab — no
  more `point`-type options or hardcoded slugs; the widget reads them with
  `ctx.point(key)`.
- Per-node + global options split across **Logic** (flow / input unit / decimals /
  invert / speed / node title / SOC thresholds) and **Appearance** (node + line +
  ball colours / sizes, SOC colours, diagram style) tabs; `col` widths → `span`.
- The overall heading is now the optional framework **Widget Title** (Common tab),
  not a widget-drawn name.
- **Breaking:** a widget saved on 2.x must be re-bound and re-styled.

## 2.0.0 — 2026-06-20
- **Hub-and-spoke redesign** (was a square of nodes): a central **inverter** with
  Solar / Battery / Grid / Home around it, joined by orthogonal lines that carry the
  flow balls toward / away from the inverter by each node's main-value sign.
- **Rich illustrations** for every node + the inverter (`assets/*.svg`, referenced
  via `HexaDash.asset()`), replacing the line-art icons.
- **Two values per node** — a main (large) value + an optional secondary (small) one.
  The main value's **input unit is a dropdown (W / kW)**; display auto-switches at
  1000 W (W → 0 dp, kW → 2 dp). Secondary takes its unit from HxLive, decimals
  configurable. (Replaces the old per-node unit/decimals/auto-kW options.)
- **State-of-charge arc** on the battery: fills from the left of the % box,
  counter-clockwise round the bottom, to the right at 100 %, with a configurable
  **3-stage colour threshold** (critical / warning / normal — colour + %).
- **Per-node styling**: line colour / width / type (dashed / solid) / dash / opacity;
  ball colour / count / size; an optional title above each node (show / text / common
  colour / offset).
- Category changed from `chart` to **`diagram`**.
- **Breaking:** several v1.x options were removed / renamed, so a widget saved on
  1.x must be reconfigured.

## 1.1.0 — 2026-06-19
- Full visual redesign. Square layout: Solar top-left, Battery top-right, Grid
  bottom-left, Home bottom-right (was a diamond).
- Energy is now a stream of glowing balls that glide smoothly from source to sink
  on a requestAnimationFrame loop; each ball grows **bigger and faster** with more
  power (was an animated dashed stroke) and fades in/out at the node rims.
- Battery node carries a circular **state-of-charge ring** (level-coloured: green
  / amber / red) plus the SOC % label; the node icon keeps its bolt.
- Glassier nodes: radial-gradient discs, coloured rim with a soft glow, value
  inside the disc and the label/SOC outside.
- New options: **Ball size**, **Flow speed** (replace the old fastest/slowest/dot-
  size trio); **Full power at (W)** drives both ball size and speed.

## 1.0.0 — 2026-06-19
- Initial release. Animated energy power-flow diagram (`hexaos_powerflow.powerflow`)
  with Solar / Grid / Battery / Home nodes on a diamond, signed per-node power
  bindings (each invertible), optional Home point (auto-computed when unbound) and
  optional battery charge %, and dots that travel each link in the flow direction
  with a power-scaled speed. Multi-point widget — uses the `point` option type and
  `ctx.resolve()`.
