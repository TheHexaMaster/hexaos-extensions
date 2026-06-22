# hexaos-extensions

Public catalogue of **HexaOS Extensions**. Extension types so far:
- **Drivers** — versioned JSON device drivers for the HexaOS firmware.
- **Dashboard Widgets** — community widgets for the HexaOS **WebUI dashboard**
  (a JS module that registers into the `HexaDash` registry).

Each type lives under its own root dir. Future types (HMI widgets — for the
**display engine**, a different runtime from the dashboard — rules, computed
demos, display JSONs, …) will get their own root dirs too.

## Layout
```
Drivers/<slug>/             one dir per driver; <slug> = manufacturer_model
  cat.json                  identity / index header (source of truth)
  set.json                  user-overridable settings + defaults
  drv.json                  the driver body (engine logic)
  readme.md  changelog.md   human docs / change history (changelog repo-only)

DashboardWidgets/<slug>/    one dir per widget package; <slug> = author_widgetname
  cat.json                  identity / metadata + asset manifest (source of truth)
  widget.js                 registers the widget(s) into HexaDash (no set.json)
  widget.css                optional styles (namespaced by slug)
  assets/…                  optional runtime files (svg/png/…); preview.svg optional
  readme.md  changelog.md   human docs / change history (changelog repo-only)

SCHEMA.md                   authoritative spec for BOTH package types
```

## How it flows

Contribute/update a driver or widget via PR or commit (community welcome; most
packages are authored by the HexaOS AI). Bump `cat.json.version` and add a
`changelog.md` entry on every change (see Versioning in `SCHEMA.md`).

## Rules
- `slug` = lowercase snake_case, unique, = directory name (`manufacturer_model`
  for drivers, `author_widgetname` for dashboard widgets).
- `cat.json.version` is the package semver; bump it on every change and add a
  `changelog.md` entry. `hexaos_compat` is the minimum HexaOS version.
- A driver's JSON is **immutable** at runtime; per-device tweaks happen through
  the `set.json` override settings, never by editing the driver.
- A dashboard widget's options live in `widget.js` (`def.opts`) — there is **no
  `set.json`** for widgets.
- No `max_instances` — there is no per-driver instance limit.

See `SCHEMA.md` for the full format.
