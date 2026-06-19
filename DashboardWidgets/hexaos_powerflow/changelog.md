# Changelog — hexaos_powerflow

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
