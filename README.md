# hexaos-extensions

Public catalogue of **HexaOS Extensions**. The first (and currently only)
extension type is **Drivers** — versioned JSON device drivers for the HexaOS
firmware. Future extension types (HMI widgets, rules, computed demos, display
JSONs, …) will live under their own root dirs alongside `Drivers/`.

## Layout
```
Drivers/<slug>/        one directory per driver; <slug> = manufacturer_model
  cat.json             identity / index header (source of truth)
  set.json             user-overridable settings + defaults
  drv.json             the driver body (engine logic)
  readme.md            human docs
  changelog.md         change history (repo-only)
SCHEMA.md              authoritative package + cat/set/drv split spec
```

## How it flows
1. Contribute/update a driver via PR or commit (community welcome; most drivers
   are authored by the HexaOS AI). Bump `cat.json.version` and add a
   `changelog.md` entry on every change (see Versioning in `SCHEMA.md`).
2. This repo is **pure data — it has no CI of its own.** The **hexaos-portal**
   repo includes it as a git submodule, generates the catalogue index from the
   `Drivers/` packages at build time (validating the 5 mandatory files, the
   `cat.json` schema, semver, unique slug and `hexaos_compat`), and serves the
   Extensions → Drivers catalogue on hexaos.io. A driver change goes live by
   bumping the submodule in the portal and deploying it — there is no separate
   publish pipeline here.

## Rules
- `slug` = `manufacturer_model` (lowercase snake_case), unique, = directory name.
- `cat.json.version` is the driver semver; bump it on every change and add a
  `changelog.md` entry. `hexaos_compat` is the minimum HexaOS version.
- The driver JSON is **immutable** at runtime; per-device tweaks happen through
  the `set.json` override settings, never by editing the driver.
- No `max_instances` — there is no per-driver instance limit.

See `SCHEMA.md` for the full format.
