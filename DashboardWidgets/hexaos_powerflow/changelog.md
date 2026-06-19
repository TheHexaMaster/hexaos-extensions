# Changelog — hexaos_powerflow

## 1.0.0 — 2026-06-19
- Initial release. Animated energy power-flow diagram (`hexaos_powerflow.powerflow`)
  with Solar / Grid / Battery / Home nodes on a diamond, signed per-node power
  bindings (each invertible), optional Home point (auto-computed when unbound) and
  optional battery charge %, and dots that travel each link in the flow direction
  with a power-scaled speed. Multi-point widget — uses the `point` option type and
  `ctx.resolve()`.
