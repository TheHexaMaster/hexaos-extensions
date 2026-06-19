# HexaOS Extension — Driver Package Schema (authoritative)

A HexaOS **driver** is a directory (package) under `Drivers/<slug>/`. The slug is
**`manufacturer_model`** (lowercase snake_case), unique, and equals the directory
name (e.g. `xinluda_xl9535`, `growatt_spf6000es`, `maxim_ds3232`).

## Mandatory files in every `Drivers/<slug>/`

| File | In repo | On device | Purpose |
|---|---|---|---|
| `cat.json` | yes | yes | Identity / index header — source of truth for what the driver is. |
| `set.json` | yes | yes | User-**overridable settings** with defaults + constraints (persisted into `hardware.json`). |
| `drv.json` | yes | yes | The driver **body** (the engine logic). |
| `readme.md` | yes | yes | Human explanation: device, usage, settings, notes. |
| `changelog.md` | **yes** | no | Structured change history. Repo-mandatory; stripped on device. |

This **replaces** the old single `/hexaos/drivers/<iface>/<category>/<name>.json`.
Today's one file splits three ways: metadata → `cat.json`, the `settings[]` +
per-instance knobs → `set.json`, everything else (the body) → `drv.json`.

---

## `cat.json` (identity / metadata)
```json
{
  "slug": "xinluda_xl9535",
  "interface": "i2c",
  "protocol": "none",
  "category": "expander",
  "manufacturer": "XINLUDA",
  "model": "XL9535",
  "version": "1.0.0",
  "hexaos_compat": "0.1.1",
  "released": "2026-05-15",
  "updated": "2026-06-15",
  "author": "Martin Macak",
  "description": "16-channel I2C GPIO expander with polarity inversion ...",
  "tags": ["16 Bit", "IO Expander"],
  "dependencies": []
}
```
- `slug` first, = dir name, = `manufacturer_model` lowercase snake_case.
- `interface`: `i2c` | `uart` | `display`.
- `protocol`: `none` | `rtc` | `modbus_rtu` | `pace` | `dsi` | `rgb` | `dspi` |
  `qspi` | `i8080`. **`protocol: "rtc"` REPLACES the old `special_usecase: "RTC"`.**
  `i8080` is the Intel 8080 parallel MCU display interface (e.g. ST7796U).
- `category`: free string for grouping/search (sensor, expander, relay, touch,
  rtc, inverter, bms, display …).
- `version`: driver **semver** MAJOR.MINOR.PATCH (bump `version` here on any
  change; old "1.0" → "1.0.0").
- `hexaos_compat`: **minimum HexaOS version** (semver, e.g. `HX_VERSION`) the driver
  requires — the SINGLE compatibility gate. It means compatibility with **HexaOS**,
  NOT with any per-interface "engine version" (per-engine versioning is being
  removed from the firmware). **BOD 0 (2026-06-15):** every converted driver is set
  to `hexaos_compat: "0.7.0"` and `HX_VERSION` is bumped to `0.7.0`.
- `released`/`updated`: `YYYY-MM-DD`. `author`: ≤64 chars. `description`: ≤256.
  `tags`: ≤10 strings. `dependencies`: array of other driver slugs (usually `[]`).
- **`max_instances` is REMOVED — never include it.**

---

## `set.json` (overridable settings + defaults)
The per-instance, user-tunable knobs with their defaults + options/constraints.
This is the OVERRIDE schema: the wizard renders it; chosen values persist into the
device's `custom`/`params` in `hardware.json`; the engine overlays them on the
defaults at load.

### I2C (`interface: "i2c"`, `protocol: "none"`)
```json
{
  "address": { "default": "0x20" },
  "poll_ms": { "default": 100 },
  "settings": [
    { "key": "io_mask", "label": "Pin direction (0=input, 1=output)", "type": "bitmask16", "default": 0, "label_0": "IN", "label_1": "OUT" },
    { "key": "invert",  "label": "Polarity inversion (1=inverted)",   "type": "bitmask16", "default": 0, "label_0": "NORMAL", "label_1": "INVERT" },
    { "key": "state_mem","label": "Persist output state across reboots","type": "bool",     "default": false }
  ]
}
```
- `address` and `poll_ms` move here from the old header (they are per-device
  overridable). `settings[]` is copied verbatim from the old driver.
- `settings[]` entry types (unchanged from the engine): `bool`, `float`,
  `int`/`enum` (int with `options` UI metadata), `bitmask8`/`bitmask16`. Keep
  `label`, `default`, `min`/`max`, `options`/`states`, `label_0`/`label_1`.
- `gpio` — a host GPIO number (`default: -1` = none). The WebUI renders it as a
  claim-aware free-pin picker (not a raw number), and the firmware claims the
  pin in the shared GPIO owner map (conflict-checked, shown in the pinmap) like
  a bus/interface pin. The reserved key `int_gpio` uses this for a device's
  interrupt line (interrupt-gated polling); the value is stored in the device's
  `custom` block and surfaced on `HxHwDevice.int_gpio`.

### I2C RTC (`protocol: "rtc"`)
```json
{ "address": { "default": "0x68" }, "poll_ms": { "default": 0 }, "settings": [] }
```
- RTC has `poll_ms` 0 (fixed) and usually no `settings[]`.

### UART (`interface: "uart"`, `protocol: "modbus_rtu"` | `"pace"`)
```json
{
  "modbus_addr": { "default": 1, "min": 1, "max": 247 },
  "baud_rate":   { "default": 9600,  "options": [1200,2400,4800,9600,19200,38400,57600,115200] },
  "parity":      { "default": "N", "options": ["N","E","O"] },
  "stop_bits":   { "default": 1, "options": [1,2] },
  "settings": [
    { "key": "read_timeout_ms",   "label": "Read Timeout",   "type": "int", "unit": "ms", "default": 1000, "min": 50,  "max": 10000 },
    { "key": "device_timeout_ms", "label": "Device Timeout", "type": "int", "unit": "ms", "default": 5000, "min": 100, "max": 30000 },
    { "key": "device_pause_ms",   "label": "Device Pause",   "type": "int", "unit": "ms", "default": 20,   "min": 0,   "max": 5000 },
    { "key": "read_pause_ms",     "label": "Read Pause",     "type": "int", "unit": "ms", "default": 20,   "min": 0,   "max": 5000 },
    { "key": "stale_ms",          "label": "Stale Timeout",  "type": "int", "unit": "ms", "default": 10000,"min": 0,   "max": 120000 }
  ]
}
```
- `modbus_addr` (per-device unit id) + the connection params from the old
  `requires{}` (baud_rate/parity/stop_bits) become overridable defaults here.
- The old driver's `settings[]` (timeouts) is copied verbatim.

---

## `drv.json` (the driver body)
Everything that is NOT identity (cat) and NOT a user setting (set). The engine
logic. Copy the remaining keys of the old driver verbatim.

### I2C (`protocol: "none"`)
Keys: `device_id`, `init_retry`, `registers[]`, `register_arrays[]`,
`init_sequence[]`, `fields[]`, `field_templates[]`, `computed[]`, `groups[]`.
```json
{
  "registers": [ ... ],
  "init_sequence": [ ... ],
  "field_templates": [ ... ],
  "fields": [ ... ],
  "computed": [ ... ],
  "groups": [ ... ]
}
```

### I2C RTC (`protocol: "rtc"`)
Keys: `init_sequence[]`, `rtc{ validity, read, write }`.
```json
{ "init_sequence": [ ... ], "rtc": { "validity": {...}, "read": {...}, "write": {...} } }
```

### UART (`protocol: "modbus_rtu"` | `"pace"`)
Keys: `read_mode`, `blocks[]`, `regs[]` (+ any `retry`/`offline_threshold`/
`backoff_max_ms`/`device_pause_ms`/`read_pause_ms`/`stale_ms`/`read_timeout_ms`/
`device_timeout_ms` defaults that are NOT exposed as overridable settings — but
prefer moving anything user-tunable to `set.json`).
```json
{ "read_mode": "block", "blocks": [ ... ], "regs": [ ... ] }
```

---

## Conversion rules (old single JSON → package)
1. **slug** = `manufacturer_model` lowercase snake_case → directory name +
   `cat.json.slug`.
2. **cat.json** ← interface, category, manufacturer, model, description; set
   `protocol` (none/rtc/modbus_rtu/pace/…); `version` → semver (e.g. 1.0→1.0.0);
   keep `hexaos_compat`; add `released`/`updated`/`author`/`tags`/`dependencies`.
   DROP `max_instances`.
3. **set.json** ← `address`+`poll_ms` (I2C) or `modbus_addr`+connection params
   (UART), plus the old `settings[]` verbatim.
4. **drv.json** ← all remaining body keys verbatim.
5. **readme.md** ← prose from `description` + the device's usage/settings notes.
6. **changelog.md** ← `## 1.0.0 — YYYY-MM-DD\n- Initial HexaOS package (converted
   from the legacy single-file driver).`
7. Preserve all values byte-for-byte where they move (registers, fields,
   transforms, blocks, regs, init sequences, rtc bodies) — this is a **mechanical
   split**, not a rewrite of behaviour. Only metadata is reshaped.

> NOTE: the firmware engine must be updated to read `cat.json`/`set.json`/
> `drv.json` from `hexaos/extensions/drivers/<slug>/` instead of the single
> segmented file, and to drop `max_instances` + `special_usecase` (→ `protocol`).
> See `hexaos-claude/docs/firmware/processing/driver_system_redesign.md` §11.

---

## Versioning & updates

Every change to a driver is a new **version** (`cat.json.version`, semver). The
rules are mandatory:

1. **Changelog** — every version MUST add an entry to `changelog.md` describing
   what changed in that version.
2. **Bump** — every change MUST raise `cat.json.version` (PATCH for fixes, MINOR
   for additive, MAJOR for breaking). Also bump `cat.json.updated`.
3. **Keep old versions on the hexaos.io mirror catalogue.** When a driver is
   updated, the **previous** version's three key files (`cat.json`, `set.json`,
   `drv.json`) are preserved in a sub-folder named after that previous version, so
   users can install any earlier version (e.g. if they're unhappy with an update
   or want to stay put). Example — TSL2561 goes 1.0.0 → 1.0.1:
   ```
   (mirror) Drivers/ams_tsl2561/
     cat.json  set.json  drv.json   ← current (1.0.1)
     readme.md changelog.md
     1.0.0/                          ← snapshot of the previous version
       cat.json  set.json  drv.json
   ```
   This per-version snapshotting is done **only on the hexaos.io mirror
   catalogue**, NOT in this Git repo — Git history already preserves every prior
   version here. The publish GitHub Action is responsible for moving the superseded
   `cat/set/drv` into the `<old-version>/` sub-folder on the mirror.

---

# Dashboard Widget Package Schema (`DashboardWidgets/<slug>/`)

A second extension type: **Dashboard Widgets** — community widgets for the HexaOS
**WebUI dashboard** (the `HexaDash` registry). A package ships a JS module (+
optional CSS + optional assets) that registers one or more widget types into the
same registry the built-in dashboard widgets use; the firmware stores/serves the
files, the WebUI loads them on dashboard open, and a dashboard's JSON references
the widget by its type id.

> **NOT** HMI Widgets. *HMI Widgets* are a separate, future extension type for the
> **display engine** (LVGL on the physical LCD/touch HMI) and are unrelated to
> these dashboard widgets. Keep the two categories distinct.

## Mandatory files in every `DashboardWidgets/<slug>/`
- `cat.json` — identity / metadata + the asset declaration (source of truth).
- `widget.js` — the body: calls `window.HexaDash.register(typeId, def)` once per
  provided widget. **Authoritative** — the widget's options live in `def.opts`
  (there is intentionally **no `set.json`**; the dashboard config form renders
  straight from `def.opts`, identical to the built-ins).
- `readme.md` — human docs (kept on device, shown in the widget info).
- `changelog.md` — change history (repo-only; stripped on device).

`slug` = `author_widgetname` (lowercase snake_case), unique, = directory name.

## Optional files
- `widget.css` — styles. **Namespace every class with the slug** (e.g.
  `.acme-battery-fill`) to avoid clashing with `.dw-*` or other packages. May read
  the dashboard CSS variables (`--dw-bg`, `--dwv-color`, …).
- `preview.svg` — catalogue thumbnail.
- `assets/…` — arbitrary runtime files (`.svg .png .webp .woff2 .json` …), nested
  paths allowed. **Served, never executed.** Reference them at runtime via
  `window.HexaDash.asset(slug, relpath)`.

## `cat.json` (identity / metadata / asset manifest)
```json
{
  "slug": "acme_battery",
  "kind": "dashboard_widget",
  "category": "display",
  "name": "Battery",
  "version": "1.0.0",
  "hexaos_compat": "0.7.0",
  "released": "2026-06-19",
  "updated": "2026-06-19",
  "author": "Acme",
  "description": "Vertical battery gauge filled by a 0-100% datapoint.",
  "tags": ["battery", "percent", "gauge"],
  "dependencies": [],
  "provides": ["acme_battery.battery"],
  "assets": { "js": "widget.js", "css": "widget.css", "files": ["assets/dial.svg"] }
}
```
- `kind`: always `"dashboard_widget"`.
- `category`: `display | control | chart | layout` — must equal each widget's
  `def.cat`. Used for catalogue grouping/search.
- `version`: widget **semver**; bump on every change + add a `changelog.md` entry.
- `hexaos_compat`: minimum HexaOS version (`HX_VERSION`) — the single compat gate
  (as drivers). `released`/`updated`: `YYYY-MM-DD`. `author` ≤64, `description`
  ≤256, `tags` ≤10.
- `provides`: the type ids registered by `widget.js`. **Type id =
  `<slug>.<widget>`** (namespaced) so it never collides with built-ins or other
  packages — a package may provide several.
- `assets`: the author's runtime-file declaration. `js` required, `css` optional,
  `files[]` optional (extra assets under the package, relative paths, no `..`).
  The device install fetches exactly `cat.json` + `js` + `css` (if any) +
  `readme.md` + every `files[]` entry; `changelog.md` is never sent to the device.

## `widget.js` (the HexaDash contract)
```js
window.HexaDash.register("acme_battery.battery", {
  name: "Battery",                 // picker label
  cat: "display",                  // display | control | chart | layout
  icon: "<rect .../>",             // SVG inner string, 18x18 viewBox (picker card);
                                   //   wrapped in <svg stroke=currentColor> by the picker
  w: 2, h: 2, minW: 1, minH: 1,    // default + minimum span (grid units)
  needsBind: true,                 // requires the single main datapoint
  writable: false,                 // writes a datapoint (affects default picker filter)
  pick: "number",                  // any | writable | enum | numeric | number | writenum
  cfgOnAdd: false,                 // optional: auto-open the config form when added
                                   //   (use for multi-point widgets that have no main bind)
  opts: [                          // option schema rendered by the config form
    { key: "min", label: "Empty at", type: "number", col: 2, default: 0 }
    // type: bool | number | text | color | select | icon | point
    // select -> options:[{v,l}];  number/text -> ph? ;  col 1|2|3 = fields per row
    // point  -> binds an EXTRA datapoint (multi-point widgets); pick? = the picker
    //           filter; the chosen slug is stored in cfg[key], resolve it with
    //           ctx.resolve(slug). { key:"grid", label:"Grid", type:"point", pick:"number" }
  ],
  render(host, ctx) { /* build DOM once into host (the .dw element) */ },
  update(host, ctx) { /* called on every live delta + on resize; refresh values */ },
  destroy(host, ctx) { /* optional: clear timers / observers */ }
});
```
`ctx` (built by the dashboard — a widget **never touches `this`**, only `host` +
`ctx`): `w`, `cfg` (= the option values), `title()`, `point()` (current LIVE point
of the main bind, or `null`), `resolve(slug)` (LIVE point for ANY slug — use with
`point`-type opts for multi-point widgets), `value()`, `fmt(p,dec)`, `boolOf(p)`,
`iconSvg(name,colour)`, `history(fromMs,toMs,max)` → `Promise<[{t,v}]>` recorder
series (or `null`), `write(value)`, and `window.HexaDash.asset(slug, relpath)` for
packaged assets.

Lifecycle: `render` once → `update` on every live delta (and resize) → `destroy`
on removal. In dashboard **edit mode** a transparent shield overlays the cell, so
clicks/drag drive the editor, not the widget.

## Install / serve / load (device side, summary)
- Install: `POST /api/extensions/dashboard-widgets/install` — the browser fetches
  the package from hexaos.io and POSTs a JSON envelope of its files; the firmware
  writes them under `/hexaos/extensions/dashboard_widgets/<slug>/` (gate
  `hexaos_compat`, enforce a per-package **256 KiB** budget, sanitize paths).
- Serve: `GET /ext/dw/<slug>/<file>` serves an installed file with the right MIME.
- Load: on dashboard open the WebUI fetches the installed list
  (`GET /api/extensions/dashboard-widgets`) and injects each `widget.css` +
  `widget.js`; community types then appear in the picker alongside the built-ins.
- Uninstall: `POST /api/extensions/dashboard-widgets/uninstall?slug=` — refused
  while any saved dashboard still uses one of the package's type ids (refcount).

## Versioning & updates
Same rules as drivers: every change bumps `cat.json.version` (PATCH/MINOR/MAJOR) +
`cat.json.updated` and adds a `changelog.md` entry; the hexaos.io mirror keeps
prior versions in `<old-version>/` sub-folders (Git history preserves them here).
