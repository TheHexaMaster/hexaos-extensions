# HexaOS Dashboard Widgets — Developer Guide

**HexaOS v0.7.0** · Build interactive dashboard widgets that anyone can install on their HexaOS device.

> This is the complete, authoritative guide for designing and building **HexaOS
> Dashboard Widget extensions**. Follow it and your widget will look, behave, and
> configure exactly like a built-in one — consistent, themeable, and robust.
>
> ⚠️ **This guide is the source of truth, not the existing example packages.**
> Some packages in the catalogue were written against older rules and are being
> brought up to date. Where an old widget disagrees with this guide, the guide
> wins. Build new widgets the way this document describes.

---

## Contents

1. [What a Dashboard Widget is](#1-what-a-dashboard-widget-is)
2. [Quick start — a minimal widget](#2-quick-start--a-minimal-widget)
3. [Package format](#3-package-format)
4. [The widget definition](#4-the-widget-definition)
5. [Bindings — connecting to data](#5-bindings--connecting-to-data)
6. [The `ctx` API — every HexaOS hook you get](#6-the-ctx-api--every-hexaos-hook-you-get)
7. [The live point object](#7-the-live-point-object)
8. [Rendering & the visual system](#8-rendering--the-visual-system)
9. [The config form — the four categories](#9-the-config-form--the-four-categories)
10. [Designing config sections — worked examples & templates](#10-designing-config-sections--worked-examples--templates)
11. [Errors & stale data](#11-errors--stale-data)
12. [Bundled assets & CSS](#12-bundled-assets--css)
13. [Built-in features your widget gets for free](#13-built-in-features-your-widget-gets-for-free)
14. [Testing your widget](#14-testing-your-widget)
15. [Publishing & installing](#15-publishing--installing)
16. [Limits & rules](#16-limits--rules)
17. [Do & Don't](#17-do--dont)
18. [Release checklist](#18-release-checklist)

---

## 1. What a Dashboard Widget is

A HexaOS dashboard is a grid of **widgets** a user builds in the device WebUI.
Each widget **binds** to one or more data inputs (live sensor readings, control
points, an internal array of points, or a remote HTTP/JSON source) and draws
something — a value, a gauge, a chart, a control, a custom diagram.

A **Dashboard Widget extension** is a small package that adds new widget types to
that palette. Your widget is a plain JavaScript object that registers into a
shared registry and draws into a DOM element. There is no build step, no
framework to learn, and no special API beyond the small contract in this guide.

Your widget runs inside the WebUI, on the same page as the built-ins, and gets
the same services: live data, theming, scaling, configuration, error handling.

Widgets fall into categories used for grouping/search: `display`, `control`,
`chart`, `layout`, `diagram`.

### 1.1 The mental model: HexaOS owns the frame, you own the content

Every widget's configuration is split into **four categories** (the four tabs in
the Configure window). Knowing who owns what is the single most important thing:

| Category | Owner | What it holds |
|----------|-------|---------------|
| **Common** | **HexaOS** | Container dimensions & scaling, margins, background, features (stale detection), and the optional **Widget Title** & **Widget Icon**. *You never define Common — it is identical for every widget.* |
| **Bindings** | **You** | Every data input your widget reads. Declared by `def.sources`. **Hardcoding a datapoint slug is forbidden** — all data comes through a binding. |
| **Appearance** | **You** | *Design* settings: colours, sizes, fonts, positions, offsets, radii, borders, line styles. Declared by `opts` sections marked `cat:'appearance'`. (For a simple-datapoint widget, HexaOS also auto-adds Label/Value/Icon/Last-Update styling here.) |
| **Logic** | **You** | *Functional* settings: ranges, thresholds, modes, units, conditions, refresh, fallbacks. Declared by `opts` sections (the default category). |

So: **HexaOS frames and themes the widget; you declare what it reads (Bindings),
how it looks (Appearance), and how it behaves (Logic).**

---

## 2. Quick start — a minimal widget

A package is a folder. The smallest useful one:

```
my_thermometer/
  cat.json
  widget.js
  readme.md
  changelog.md
```

**`cat.json`**

```json
{
  "slug": "my_thermometer",
  "kind": "dashboard_widget",
  "category": "display",
  "name": "Thermometer",
  "version": "1.0.0",
  "hexaos_compat": "0.7.0",
  "released": "2026-06-21",
  "updated": "2026-06-21",
  "author": "Your Name",
  "description": "Shows a temperature datapoint as a coloured reading.",
  "tags": ["temperature", "display"],
  "dependencies": [],
  "provides": ["my_thermometer.thermo"],
  "assets": { "js": "widget.js" }
}
```

**`widget.js`**

```js
window.HexaDash.register("my_thermometer.thermo", {
  name: "Thermometer",
  cat: "display",
  icon: "<path d='M10 13V5a2 2 0 0 1 4 0v8a4 4 0 1 1-4 0z'/>", // inner SVG (0 0 18 18)
  w: 2, h: 2, minW: 1, minH: 1,

  // ONE input = the Simple Datapoint. Its label names the widget; HexaOS styles
  // its label/value/icon for you (see §8).
  sources: [
    { key: "simple", label: "Simple Datapoint", pick: "number", dec: true, unit: true }
  ],

  // widget settings. Sections default to the Logic tab; cat:'appearance' -> Appearance.
  opts: [
    { section: "Warning" },
    { key: "warmAt",    label: "Warm above", type: "number", span: 6, default: 25 },
    { section: "Colours", cat: "appearance" },
    { key: "warmColor", label: "Warm colour", type: "color",  span: 6, default: "#f0883e" }
  ],

  render: function (host) {
    host.innerHTML =
      "<div class='dw-name'></div>" +
      "<div class='dw-vbox'><div class='dw-vline'>" +
        "<span class='dw-val'>--</span><span class='dw-unit'></span>" +
      "</div></div>";
  },

  update: function (host, ctx) {
    var p = ctx.point(), o = ctx.cfg;
    host.querySelector(".dw-name").textContent = ctx.label("simple");
    host.querySelector(".dw-val").textContent  = ctx.fmt(p);
    host.querySelector(".dw-unit").textContent = ctx.unit();

    var warm = p && Number(p.value) >= Number(o.warmAt != null ? o.warmAt : 25);
    host.querySelector(".dw-val").style.color = warm ? (o.warmColor || "#f0883e") : "";

    host.classList.toggle("dw-stale", !!(p && (p.offline || p.stale)));
  }
});
```

That is a complete, themeable, configurable widget. The rest of this guide
explains every piece and the features you get for free.

---

## 3. Package format

A package lives in a folder named after its **slug**:

```
DashboardWidgets/<slug>/
  cat.json        (required)  identity + metadata + asset manifest
  widget.js       (required)  registers your widget(s)
  readme.md       (required)  user-facing documentation
  changelog.md    (required in the repo; not shipped to the device)
  widget.css      (optional)  styles — namespace every class with your slug
  assets/…        (optional)  runtime files (svg/png/webp/woff2/json/…)
  preview/…       (optional)  screenshots/GIFs for docs (not shipped to the device)
```

### 3.1 `cat.json` fields

| Field | Required | Notes |
|-------|----------|-------|
| `slug` | ✅ | Unique id = folder name. Lowercase, `a–z 0–9 _ - .`, ≤47 chars, no `/ \ ..`. Convention: `author_widgetname`. |
| `kind` | ✅ | Always `"dashboard_widget"`. |
| `category` | ✅ | `display \| control \| chart \| layout \| diagram`. Match your widget's `cat`. |
| `name` | ✅ | Display name (≤64 chars). |
| `version` | ✅ | **Semver** `MAJOR.MINOR.PATCH`. Bump on every change. |
| `hexaos_compat` | ✅ | Minimum HexaOS version your widget needs (e.g. `"0.7.0"`). The device refuses to install if it is older. |
| `released` | ✅ | `YYYY-MM-DD`, first release. |
| `updated` | ✅ | `YYYY-MM-DD`, bump on every version. |
| `author` | ✅ | Your name (≤64 chars). |
| `description` | ✅ | ≤256 chars. |
| `tags` | ✅ | Up to 10 search tags. |
| `dependencies` | ✅ | Other package slugs you require (usually `[]`). |
| `provides` | ✅ | The type ids your `widget.js` registers — `["<slug>.<widget>", …]`. |
| `assets` | ✅ | `{ "js": "widget.js", "css": "widget.css"?, "files": ["assets/…", …]? }`. |

`assets.files[]` declares **every** bundled runtime file (no `..`). The device
installs exactly `cat.json` + `js` + `css` (if any) + `readme.md` + each entry in
`files[]`. `changelog.md` and `preview/` are **never** shipped.

### 3.2 Type ids & namespacing

A type id is `<slug>.<widget>`, e.g. `my_thermometer.thermo`. The slug prefix
keeps your widget from colliding with built-ins or other packages. One package
may register several widgets — list each id in `provides[]`.

### 3.3 Versioning

Every change requires: bump `version` (semver), bump `updated`, and add a
`changelog.md` entry. Users browse versions and can install a specific one. A
change that alters the config model (renames/removes options, changes a binding
key) is a **major** bump — a widget saved on the old version must be reconfigured.

---

## 4. The widget definition

Register a widget with `window.HexaDash.register(typeId, def)`. The `def` object:

```js
{
  name:  "Thermometer",      // label in the Add-widget picker
  cat:   "display",          // display | control | chart | layout | diagram
  icon:  "<path …/>",        // picker icon: bare inner SVG (0 0 18 18) OR a full <svg>
  w: 2, h: 2,                // default size in grid cells
  minW: 1, minH: 1,          // minimum size (resize floor)
  noFrame: false,            // true => default Container background OFF (for labels/spacers)

  sources: [ /* Bindings — see §5 */ ],
  opts:    [ /* Appearance + Logic settings — see §9 */ ],

  // optional default overlay anchors (where an "Auto"-positioned overlay lands):
  lpos: "tl", vpos: "mc", tpos: "tl", ipos: "tl", dipos: "tl", lupos: "br",

  // optional defaults the user's "Auto" inherits (all optional):
  margins: { l:8, r:8, t:8, b:8 },   // default Container Margins (px)
  scale: true,                       // default Content Scaling when the user leaves it Auto
  marginExclude: { value:true, label:true },  // which overlays ignore the margins by default
                                     //   keys: title|icon|label|value|dpicon|lastUpdate

  cfgOnAdd: false,           // optional: auto-open the config form when the widget is added
                             //   (use for multi-binding widgets with no single main input)

  render(host, ctx) { /* build the DOM once */ },
  update(host, ctx) { /* refresh values on every live tick + resize */ },
  destroy(host, ctx) { /* optional: clear timers / observers */ }
}
```

- **`host`** is the widget's `.dw` element. You own everything inside it.
- **`render`** runs once when the widget mounts. Build static DOM, attach
  listeners, set classes.
- **`update`** runs on **every** live-data delta and on resize. Keep it cheap —
  only push fresh values into existing nodes. Don't rebuild the DOM here.
- **`destroy`** is optional — use it if you started a `setInterval` or a
  `ResizeObserver`.

> The def has **no** "title", "reserved", or "layout" fields — the Widget Title
> lives in **Common** (HexaOS-owned) and there is no fifth tab. You only ever
> declare `sources` (Bindings) and `opts` (Appearance + Logic).

---

## 5. Bindings — connecting to data

`sources[]` declares the **inputs** your widget binds in the **Bindings** tab.
Every datapoint your widget reads must be a source — **never hardcode a slug.**

Each entry:

```js
{ key: "simple", label: "Simple Datapoint", pick: "number", dec: true, unit: true, writable: false, kind: "point" }
```

| Field | Meaning |
|-------|---------|
| `key` | Slot id, unique within the widget. **`"simple"`** is special (see §5.1). |
| `label` | The section title shown in the **Bindings** tab. |
| `kind` | `"point"` (default) · `"array"` · `"remote"` — the input type (see §5.2). |
| `pick` | (point/array) the picker filter — which datapoints the user may choose. |
| `dec` | (point) `true` → show a Decimals field in the config. |
| `unit` | (point) `true` → show a Unit-override field. |
| `writable` | (point) `true` → this slot is a write target (controls). |

A widget with `sources: []` binds nothing (clocks, labels, spacers).

### 5.1 The Simple Datapoint (`key: "simple"`)

The source key **`"simple"`** is the conventional single main input. When you
declare it, HexaOS **auto-generates its styling in the Appearance tab** — the
**Label**, **Value**, **Icon**, and **Last Update** sections — and draws those
overlays for you (see §8). You just render `.dw-name` + `.dw-vbox` and fill their
text from `ctx.label("simple")` / `ctx.fmt(p)` / `ctx.unit()`.

A complex widget that has no single main reading (e.g. a multi-node diagram)
simply doesn't declare a `simple` source — it names itself with the optional
**Widget Title** (Common) instead, and declares its own named bindings.

### 5.2 Binding kinds

| `kind` | The user binds | Your widget reads |
|--------|----------------|-------------------|
| `"point"` *(default)* | one datapoint — a **Live Point** or a **Frontend Computed** formula | `ctx.point(key)` → a point object (§7); `ctx.value(key)`, `ctx.fmt(p,key)`, `ctx.label(key)`, `ctx.unit(key)` |
| `"array"` | **several** datapoints into one slot | `ctx.points(key)` → array of point objects; `ctx.values(key)` → array of their values |
| `"remote"` | an **HTTP/JSON** endpoint (URL · method · JSON path · refresh) | `ctx.remote(key)` → a cache object `{ data, error, loading, ts }`, refreshed at most every `refreshMs` |

Point and array bindings filter the picker by `pick`; remote bindings are
configured by the user with a URL + a dotted JSON path.

**Picker filters (`pick`):**

| `pick` | Lets the user pick |
|--------|--------------------|
| `any` | any datapoint |
| `writable` | writable datapoints only |
| `enum` | writable datapoints that have an enum table (dropdowns/segments) |
| `numeric` | writable numbers with a defined min/max (sliders) |
| `number` | any number, read or write (display / charts) |
| `writenum` | writable numbers (numeric input / stepper) |

### 5.3 Live Point vs Frontend Computed (point bindings)

A `point` binding can be either, chosen by the user in the Bindings tab — and
it's transparent to you:

- **Live Point** — a real device datapoint, resolved from the live cache.
- **Frontend Computed** — a small client-side math formula over several live
  points (display-only; no backend). `ctx.point(key)` returns a normal-looking
  point with the computed value.

You always read through `ctx.point(key)` / `ctx.fmt(p,key)` — both kinds behave
identically.

### 5.4 Reading a binding in `update`

```js
var p  = ctx.point();         // the simple datapoint (or null if unbound/offline)
var p2 = ctx.point("grid");   // a named point binding
var pts = ctx.points("cells");// an array binding -> [point, point, …]
var r   = ctx.remote("api");  // a remote binding -> { data, error, loading, ts }
```

---

## 6. The `ctx` API — every HexaOS hook you get

Your `render`/`update` receive `ctx`. **Use only `host` and `ctx`** — never reach
into the wider page. This is the complete set of hooks available to a widget:

| Member | What it gives you |
|--------|-------------------|
| `ctx.cfg` | Your option values (the `opts` from the Appearance + Logic tabs). |
| `ctx.point(key="simple")` | The resolved live (or computed) point object, or `null`. |
| `ctx.value(key)` | The raw value, or `null`. |
| `ctx.fmt(p, key="simple")` | The formatted display string — decimals, enum→label, and the user's Transform applied. **Display values through this.** |
| `ctx.unit(key)` | The display unit (the source's override, else the point's own; `""` for computed). |
| `ctx.label(key)` | The **datapoint name** to show (the user's label override, else the point's name; the computed point's name if computed). |
| `ctx.title()` | The user's optional **Widget Title** text. *Usually you don't render this — HexaOS draws it for you.* |
| `ctx.points(key)` | (array binding) the resolved point objects → `[point, …]`. |
| `ctx.values(key)` | (array binding) shorthand for `ctx.points(key).map(p => p.value)`. |
| `ctx.remote(key)` | (remote binding) the fetch cache `{ data, error, loading, ts }` (throttled). |
| `ctx.resolve(slug)` | Resolve any datapoint by its slug string (rarely needed directly). |
| `ctx.boolOf(p)` | Interpret a point as a boolean (handles bool/toggle/numeric). |
| `ctx.iconSvg(name, color)` | An inline SVG string from the built-in HexaOS icon set (§8.8). |
| `ctx.history(fromMs, toMs, max)` | A Promise → `[{t,v}, …]` recorder history for the simple point — or `null` if history isn't available. Always handle `null`. |
| `ctx.write(value, key="simple")` | Write a value to the bound (writable) datapoint. |
| `ctx.error(message)` | Report a problem; HexaOS shows the red error marker (§11). |

> **Name vs Title — important.** The datapoint's **name** is `ctx.label("simple")`
> and belongs in your `.dw-name` element. The **Widget Title** is a *separate*,
> optional manual heading that HexaOS renders as its own overlay — you normally
> don't draw it. Use `ctx.label("simple")` for the reading's name, not
> `ctx.title()`.

---

## 7. The live point object

`ctx.point()` returns a read-only point object (or `null` if the slot is unbound
or the point is gone). The fields you can rely on:

| Field | Type | Meaning |
|-------|------|---------|
| `value` | number\|bool\|string\|null | Current raw value. |
| `type` | `0\|1\|2\|3` | `0` float, `1` integer, `2` bool, `3` string. |
| `unit` | string | The point's own unit. |
| `label` | string | The point's own name. |
| `el` | object\|null | Enum label map `{ "<raw>": "<label>" }` (e.g. `{ "0":"Off","1":"On" }`). |
| `min` `max` `step` | number\|null | Range hints (`null` if undefined). |
| `prec` | number | The point's preferred decimal places. |
| `wr` | bool | Writable. |
| `wc` | `0..4` | Write-control hint: `0` none, `1` toggle, `2` select, `3` number, `4` slider. |
| `ton` `toff` | number | The on/off raw values for a toggle point. |
| `offline` | bool | The point's source is offline. |
| `stale` | bool | The value is older than its freshness timeout. |
| `ageStr` | string | Human "time since change" (e.g. `"5s ago"`). |
| `age` | number\|null | Seconds since the last change (`null` if never). |
| `valid` | bool | Has ever produced a value. |
| `key` | string | The datapoint's stable slug. |

**Always guard for `null`** (unbound) and prefer `ctx.fmt`/`ctx.unit`/`ctx.label`
over reading raw fields, so the user's decimals / unit / transform / label
overrides are respected.

```js
update: function (host, ctx) {
  var p = ctx.point();
  if (!p) { host.querySelector(".dw-val").textContent = "--"; return; }
  host.querySelector(".dw-val").textContent = ctx.fmt(p);
}
```

---

## 8. Rendering & the visual system

### 8.1 The `.dw` shell

`host` is the `.dw` element — a themed card (background, corner radius, shadow,
padding all come from the dashboard theme). You render your content inside it.
For a frameless widget (labels, spacers) set `noFrame: true` in the def.

### 8.2 The simple label & value — render these, HexaOS styles them

For a standard reading, include these two elements in your `render` markup:

```html
<div class="dw-name"></div>                <!-- simple datapoint NAME -->
<div class="dw-vbox">
  <div class="dw-vline">
    <span class="dw-val">--</span>          <!-- the VALUE -->
    <span class="dw-unit"></span>           <!-- the UNIT -->
  </div>
</div>
```

In `update`, fill their **text**:

```js
host.querySelector(".dw-name").textContent = ctx.label("simple");
host.querySelector(".dw-val").textContent  = ctx.fmt(p);
host.querySelector(".dw-unit").textContent = ctx.unit();
```

HexaOS owns their **font, position, and offset** — the user sets those in the
**Appearance** tab (the auto-generated *Simple Datapoint - Label / - Value*
sections), and HexaOS applies them automatically. You never set the label/value
font or position yourself.

### 8.3 Overlays HexaOS draws for you

You do **not** render these — HexaOS creates and positions them from the user's
config:

- **Widget Title** — the optional manual heading (Common tab).
- **Widget Icon** — an optional decorative icon (Common tab).
- **Datapoint Icon** — an optional icon for the simple datapoint (Appearance tab).
- **Last Update** — an optional "last updated" readout for the **simple**
  datapoint (its `ageStr`, e.g. "5s ago"), with an optional text or icon prefix.
  The user enables it in the **Appearance** tab; it shows only when the simple
  binding is a Live Point (it's locked off for a Frontend Computed binding, which
  has no last-changed time).

So a widget only ever renders its own content plus (optionally) the `.dw-name` /
`.dw-vbox` pair. Everything else is automatic.

### 8.4 Positioning & the `pos`/Auto system

The label, value, and icons each have a 9-position anchor (`tl tc tr ml mc mr bl
bc br`) the user can set, defaulting to **Auto**. Auto resolves to your def's
defaults (`lpos`/`vpos`/`tpos`/`ipos`/`dipos`/`lupos`) — so set those to where
your widget wants them, and Auto "just works". Each element also has an **Off X /
Off Y** the user can nudge (auto = 0).

### 8.4a Container Margins & "Exc. Margin"

The user can set per-side **Container Margins** (Left/Right/Top/Bottom) on the
widget; they become the `.dw` padding, and each overlay normally anchors *inside*
that margin. Any overlay with **Exc. Margin** on anchors to the widget's edge
instead, ignoring the margins. **By default the value, the label, the datapoint
icon and the last-update are margin-excluded** (they fill the widget); the
**Widget Title is not** (it sits inside the margin). You don't code any of this —
you can change the per-widget defaults via `def.margins` and `def.marginExclude`
(§4).

### 8.5 Scaling — design at a 120px reference

HexaOS scales every widget with its cell so it stays legible at any size (the user
can override per widget via **Content Scaling** = Auto / Enabled / Disabled; your
`def.scale` is the default when they leave it Auto). The mechanism: a CSS variable
`--dw-scale` multiplies sizes, calibrated so that `min(width,height) = 120px` ⇒
scale `1`.

- Size things in **`em`** where possible — the `.dw` font-size already includes
  `--dw-scale`, so `em` units scale automatically.
- For an explicit pixel size that should scale, multiply by the variable:
  `el.style.width = "calc(" + n + "px * var(--dw-scale,1))";`
- The framework-styled `.dw-val`/`.dw-name`/`.dw-unit` already scale.

### 8.6 Fonts

Text inherits the dashboard's font theme. If you set a font, prefer `inherit` or
the CSS variable `var(--dash-font, inherit)` so the user's Dashboard Font choice
is respected.

### 8.7 Stale styling

Toggle the built-in `dw-stale` class to dim the widget when its data is
stale/offline:

```js
host.classList.toggle("dw-stale", !!(p && (p.offline || p.stale)));
```

### 8.8 The built-in icon set

`ctx.iconSvg(name, color)` returns a `viewBox="0 0 24 24"` stroke icon. Available
names:

```
power bulb bolt fire drop snow thermo lock unlock home door plug battery wifi
bell shield gear check close sun moon fan pump valve play pause eye leaf alert
clock
```

Pass a colour (`"#3fb950"`) or omit it to inherit `currentColor`. For a custom
glyph, ship your own SVG as a bundled asset (§12) and reference it with
`window.HexaDash.asset(slug, path)`.

---

## 9. The config form — the four categories

You never write HTML for the config form — HexaOS generates it from `sources`
(Bindings) and `opts` (Appearance + Logic). The four tabs:

- **Common** — HexaOS-owned. You contribute nothing.
- **Bindings** — your `sources` (§5).
- **Appearance** — your `opts` sections marked `cat:'appearance'`, plus (if you
  have a `simple` source) the auto Label/Value/Icon/Last-Update styling.
- **Logic** — your `opts` sections with no `cat` (the default).

### 9.1 `opts` is sections + fields

`opts[]` is a flat list of **section markers** and **fields**:

```js
opts: [
  { section: "Range" },                         // a Logic section (default cat)
  { key: "min", label: "Min", type: "number", span: 6, default: 0,  ph: "auto" },
  { key: "max", label: "Max", type: "number", span: 6, default: 100, ph: "auto" },

  { section: "Arc", cat: "appearance" },        // an Appearance section
  { key: "thickness", label: "Arc thickness", type: "number", span: 6, default: 9 },
  { key: "color",     label: "Arc colour",    type: "color",  span: 6, default: "#58a6ff" }
]
```

**Section marker** = `{ section, cat?, sub? }`:

| Prop | Meaning |
|------|---------|
| `section` | The card heading. |
| `cat` | `'appearance'` → Appearance tab; anything else (default) → **Logic** tab. |
| `sub` | Optional sub-category label (reserved for grouping; safe to set, no effect yet). |

A section runs until the next section marker. Put **design** settings (colours,
sizes, fonts, line styles, radii) under `cat:'appearance'`; put **functional**
settings (ranges, thresholds, modes, units, refresh) under the default.

### 9.2 Field types

| `type` | Renders | Stored in `ctx.cfg[key]` |
|--------|---------|---------------------------|
| `bool` | a switch | boolean |
| `number` | a number input (`ph` = placeholder) | number/string |
| `text` | a text input | string |
| `color` | the shared colour picker (palette + RGB + opacity) | `#rrggbb` / `#rrggbbaa` |
| `select` | a dropdown (`options:[{v,l}]`) | the chosen `v` |
| `icon` | a HexaOS-icon dropdown | the icon name |
| `point` | a datapoint picker (extra one-off datapoint; `pick` = filter) | the chosen slug — resolve with `ctx.resolve(value)` |

A field is `{ key, label, type, span?, default?, ph?, options?, help?, pick? }`.

### 9.3 The strict row system — use `span`, sum to 12

HexaOS config forms use **one** layout rule. Every field declares a width as a
**span out of 12** via `span`:

- A row's spans **sum to 12**. `12` = full width, `6` = half, `4` = third, `3` =
  quarter; mixes are fine as long as they total 12 (e.g. `5 + 3 + 4`).
- Omit `span` ⇒ the field takes a full row (`span 12`).
- Consecutive fields pack into rows automatically; when the next field would
  overflow 12 it starts a new row; a `{section}` always starts a new card.

> **`span`, not `col`.** Older widgets used a `col` property — it no longer does
> anything. Use `span` (1–12). This keeps every config form, built-in or
> community, perfectly uniform.

### 9.4 Per-field help (`help`)

Add `help` to any field to show a small **`?`** next to its label; clicking it
opens a popover with your text. Keep it one short sentence, in English.

```js
{ key: "refMs", label: "Full speed at", type: "number", span: 4, default: 2000,
  help: "Power (W) at which the animation reaches full speed." }
```

Use `help` for fields whose purpose isn't obvious from the label. Don't add it to
self-explanatory fields (a plain colour, a "Show value" switch).

---

## 10. Designing config sections — worked examples & templates

This is the part that separates a tidy widget from a messy one. **Lay your fields
into rows that read well at SPAN12 — don't dump everything two-per-row.** Group
related short fields onto one row; give selects more width than numbers; pair
colours.

### 10.1 Pattern: split a setting list across Logic + Appearance

A gauge has *functional* settings (range, value toggle, thresholds) and *design*
settings (arc thickness/colour, threshold colours). Put each in its category:

```js
opts: [
  // ---- Logic (functional) ----
  { section: "Range" },
  { key: "min", label: "Min", type: "number", span: 6, default: "", ph: "auto" },
  { key: "max", label: "Max", type: "number", span: 6, default: "", ph: "auto" },
  { section: "Value" },
  { key: "showValue", label: "Show value", type: "bool", default: true },
  { section: "Thresholds" },
  { key: "warnAt", label: "Warn at ≥",     type: "number", span: 6, default: "", ph: "off" },
  { key: "critAt", label: "Critical at ≥", type: "number", span: 6, default: "", ph: "off" },

  // ---- Appearance (design) ----
  { section: "Arc", cat: "appearance" },
  { key: "thickness", label: "Arc thickness", type: "number", span: 6, default: 9 },
  { key: "color",     label: "Arc colour",    type: "color",  span: 6, default: "#58a6ff" },
  { section: "Threshold colours", cat: "appearance" },
  { key: "warnColor", label: "Warn colour",     type: "color", span: 6, default: "#d29922" },
  { key: "critColor", label: "Critical colour", type: "color", span: 6, default: "#f85149" }
]
```

### 10.2 Pattern: dense rows for a settings-heavy section

When a section has many short fields, pack them by content width so each row
sums to 12 (selects wider, numbers/bools narrower, colours medium):

```js
opts: [
  // a node's behaviour — 6 fields in 2 balanced rows
  { section: "Flow" },
  { key: "unit",    label: "Input unit",    type: "select", span: 5, default: "W",
    options: [ { v: "W", l: "W (auto kW ≥1000)" }, { v: "kW", l: "kW" } ],
    help: "Unit of the bound value; display auto-switches to kW above 1000 W." },
  { key: "dec",     label: "Decimals",      type: "number", span: 3, default: 1 },
  { key: "speed",   label: "Full speed at", type: "number", span: 4, default: 2000,
    help: "Power (W) at which the stream reaches full speed." },
  { key: "invert",  label: "Invert",        type: "bool",   span: 4, default: false },
  { key: "showTtl", label: "Show title",    type: "bool",   span: 3, default: false },
  { key: "title",   label: "Title",         type: "text",   span: 5, default: "" },

  // its styling — colours together, line params together, ball params together
  { section: "Style", cat: "appearance" },
  { key: "color",    label: "Node colour", type: "color",  span: 4, default: "#58a6ff" },
  { key: "lnColor",  label: "Line colour", type: "color",  span: 4, default: "" },
  { key: "ballColor",label: "Ball colour", type: "color",  span: 4, default: "" },
  { key: "lnWidth",  label: "Line width",  type: "number", span: 3, default: 3 },
  { key: "lnType",   label: "Line type",   type: "select", span: 3, default: "dash",
    options: [ { v: "dash", l: "Dashed" }, { v: "solid", l: "Solid" } ] },
  { key: "lnDash",   label: "Dash on,off", type: "text",   span: 3, default: "10,9",
    help: "Dash pattern: on-pixels,off-pixels (e.g. 10,9)." },
  { key: "lnOpacity",label: "Opacity %",   type: "number", span: 3, default: 70 },
  { key: "ballCount",label: "Ball count",  type: "number", span: 6, default: 3 },
  { key: "ballSize", label: "Ball size",   type: "number", span: 6, default: 9 }
]
```

Row math: `5+3+4 = 12`, `4+3+5 = 12`, `4+4+4 = 12`, `3+3+3+3 = 12`, `6+6 = 12`.

### 10.3 Span recipes (copy these)

| Fields on the row | Spans | Good for |
|-------------------|-------|----------|
| 2 balanced | `6 \| 6` | min/max, two colours, a value + its toggle |
| 3 equal | `4 \| 4 \| 4` | three colours, three thresholds |
| 4 equal | `3 \| 3 \| 3 \| 3` | line width/type/dash/opacity |
| select + number + bool | `5 \| 3 \| 4` | a unit dropdown + decimals + a toggle |
| bool + bool + text | `4 \| 3 \| 5` | two switches + a text field |
| single field | omit `span` | one setting that fills the row |

### 10.4 A complete minimal template (simple datapoint)

```js
window.HexaDash.register("acme_level.level", {
  name: "Level", cat: "display", icon: "<path d='…'/>",
  w: 2, h: 3, minW: 1, minH: 2,
  sources: [ { key: "simple", label: "Simple Datapoint", pick: "number", dec: true, unit: true } ],
  opts: [
    { section: "Range" },
    { key: "min", label: "Empty at", type: "number", span: 6, default: 0,
      help: "Datapoint value mapped to 0%." },
    { key: "max", label: "Full at",  type: "number", span: 6, default: 100,
      help: "Datapoint value mapped to 100%." },
    { section: "Fill", cat: "appearance" },
    { key: "color", label: "Fill colour", type: "color", span: 12, default: "#3fb950" }
  ],
  render: function (host) {
    host.innerHTML =
      "<div class='dw-name'></div>" +
      "<div class='acme_level-bar'><i></i></div>";
  },
  update: function (host, ctx) {
    var p = ctx.point(), o = ctx.cfg;
    host.querySelector(".dw-name").textContent = ctx.label("simple");
    var mn = Number(o.min || 0), mx = Number(o.max || 100); if (!(mx > mn)) mx = mn + 1;
    var v = p ? Number(p.value) : NaN;
    var pct = isFinite(v) ? Math.max(0, Math.min(100, (v - mn) / (mx - mn) * 100)) : 0;
    var fill = host.querySelector(".acme_level-bar > i");
    fill.style.height = pct.toFixed(0) + "%";
    fill.style.background = o.color || "#3fb950";
    host.classList.toggle("dw-stale", !!(p && (p.offline || p.stale)));
  }
});
```

### 10.5 A complete multi-binding template (no simple datapoint)

```js
window.HexaDash.register("acme_minmax.minmax", {
  name: "Min/Max", cat: "display", icon: "<path d='…'/>",
  w: 3, h: 2, minW: 2, minH: 1,
  cfgOnAdd: true,                       // no main input -> open config on add
  sources: [
    { key: "a", label: "Input A", pick: "number" },
    { key: "b", label: "Input B", pick: "number" }
  ],
  opts: [
    { section: "Display" },
    { key: "mode", label: "Show", type: "select", span: 12, default: "both",
      options: [ { v: "both", l: "Both" }, { v: "diff", l: "Difference" } ] },
    { section: "Colours", cat: "appearance" },
    { key: "hi", label: "Higher colour", type: "color", span: 6, default: "#3fb950" },
    { key: "lo", label: "Lower colour",  type: "color", span: 6, default: "#f85149" }
  ],
  render: function (host) { host.innerHTML = "<div class='acme_minmax-row'></div>"; },
  update: function (host, ctx) {
    var a = ctx.point("a"), b = ctx.point("b");
    if (!a || !b) { ctx.error("Bind both inputs"); return; }
    // … render using ctx.fmt(a,"a"), ctx.fmt(b,"b"), ctx.cfg.mode …
    host.classList.toggle("dw-stale",
      !!((a && (a.offline||a.stale)) || (b && (b.offline||b.stale))));
  }
});
```

This widget names itself with the **Widget Title** (Common) — it has no
`.dw-name`, because it has no single simple datapoint.

---

## 11. Errors & stale data

HexaOS gives every widget two automatic fault markers — you don't build any UI
for them.

### 11.1 Report your own errors

If your widget can't render correctly (a missing required binding, an impossible
combination), call `ctx.error(message)` during `update`. HexaOS shows a **red
error triangle** over the widget; clicking it lists your messages. The error list
is cleared and recomputed every tick, so just call `ctx.error` whenever the
condition holds:

```js
update: function (host, ctx) {
  var a = ctx.point("a"), b = ctx.point("b");
  if (!a || !b) { ctx.error("Bind both inputs"); return; }
  // …normal rendering…
}
```

Uncaught exceptions in `update` are also caught and shown as an error — but
prefer explicit `ctx.error` messages.

### 11.2 Stale data is handled for you

If the user keeps **Live Points Stale Detection** on (default), HexaOS watches
every datapoint your widget uses and shows an **orange marker** when any goes
stale/offline — the last value stays visible. You don't implement this; just keep
showing the last value and (optionally) toggle `dw-stale` for a dimmed look.

---

## 12. Bundled assets & CSS

### 12.1 CSS

Ship a `widget.css` (declare it in `cat.json` `assets.css`). **Namespace every
class with your slug** to avoid clashing with the page or other widgets:

```css
.my_thermometer-bulb { /* … */ }
```

### 12.2 Assets

List runtime files in `cat.json` `assets.files[]`, then reference them at runtime
with the asset helper:

```js
var url = window.HexaDash.asset("my_thermometer", "assets/scale.svg");
img.src = url;
```

Supported asset types include `svg png webp jpg gif woff2 woff json`. Paths are
relative to your package root; no `..`.

---

## 13. Built-in features your widget gets for free

These work automatically — design with them in mind, don't reimplement them:

- **Theming** — card background, radius, shadow, dashboard font.
- **Content Scaling** — your widget scales with its cell (Auto/Enabled/Disabled; §8.5).
- **Container Margins & Exc. Margin** — per-side padding the user sets; your
  value/label sit at the widget edge by default (§8.4a).
- **The simple label/value overlays** — render `.dw-name` + `.dw-vbox`, the user
  styles/positions them in Appearance (§8.2).
- **Title / Icon / Datapoint-Icon / Last Update overlays** — fully automatic (§8.3).
- **Decimals, Unit override, Label override** — honoured through
  `ctx.fmt`/`ctx.unit`/`ctx.label`.
- **Transform** — the user can post-process the displayed value (e.g. `MAT(VAL-15)`
  to offset, or `NTF` to show an enum's raw number). Applied inside `ctx.fmt` —
  free, as long as you display via `ctx.fmt`.
- **Frontend Computed datapoints** — the user can bind a point slot to a
  client-side formula over several points instead of a single live point.
  Transparent to you — `ctx.point()` returns a normal-looking point.
- **Array & Remote bindings** — `ctx.points/values` and `ctx.remote` (§5.2).
- **Stale/offline detection** and **error reporting** (§11).
- **Configuration UI** — generated from `sources` + `opts`.

---

## 14. Testing your widget

You don't need special tooling — a tiny HTML harness reproduces the runtime.

### 14.1 Local mock harness

Create a scratch `index.html` next to your `widget.js`. Mock the registry
**before** loading `widget.js` (otherwise it registers into nothing), build a fake
`ctx`, then call `render` + `update`:

```html
<div class="dw" id="host" style="width:160px;height:160px"></div>
<script>
  window.HexaDash = { types:{}, register:function(t,d){ this.types[t]=d; },
                      asset:function(s,f){ return f; } };
</script>
<script src="widget.js"></script>
<script>
  var def = window.HexaDash.types["my_thermometer.thermo"];
  var point = { value: 23.4, unit: "°C", type: 0, prec: 1, label: "Outside",
                offline:false, stale:false, ageStr:"2s ago" };
  var ctx = {
    cfg: { warmAt: 25, warmColor: "#f0883e" },
    point:  function(){ return point; },
    value:  function(){ return point.value; },
    fmt:    function(p){ return p ? p.value.toFixed(p.prec) : "--"; },
    unit:   function(){ return point.unit; },
    label:  function(){ return point.label; },
    title:  function(){ return ""; },
    points: function(){ return [point]; },
    values: function(){ return [point.value]; },
    remote: function(){ return { data:null, error:"", loading:false, ts:0 }; },
    resolve:function(){ return point; },
    boolOf: function(p){ return !!(p && p.value); },
    iconSvg:function(){ return ""; },
    history:function(){ return Promise.resolve(null); },
    write:  function(){},
    error:  function(m){ console.warn("widget error:", m); }
  };
  var host = document.getElementById("host");
  def.render(host, ctx);
  def.update(host, ctx);
</script>
```

Drive `point.value` on a timer and re-call `def.update(host, ctx)` to see live
behaviour. Resize the host to check scaling.

> Keep your mock's `ctx` faithful to this guide — that's the contract your widget
> must satisfy on a real device. Use the source key **`"simple"`**.

### 14.2 On-device

The real test is installing on a device (§15) and adding the widget to a
dashboard: check it binds, renders, scales, configures, and handles
stale/unbound data gracefully.

---

## 15. Publishing & installing

### 15.1 Publish

Submit your package to the HexaOS extensions catalogue (the `hexaos-extensions`
repo, `DashboardWidgets/<slug>/`). Each change: bump `version` + `updated`, add a
`changelog.md` entry. The catalogue lists your package for users to browse and
install.

### 15.2 Install (on the device)

Installation happens **on the device**, from the WebUI:

1. Open **Extensions → Dashboard Widgets**.
2. Browse the catalogue, pick a version, **Install**. The device downloads your
   package files and stores them locally.
3. **Reload the dashboard page** — newly installed widgets appear in the
   Add-widget picker under the **Extensions Widgets** tab.

To remove: **Uninstall** from the same page. A package can't be uninstalled while
a saved dashboard still uses one of its widgets — remove those widgets first.

The device enforces your `hexaos_compat`: if the device's HexaOS is older, the
install is refused.

---

## 16. Limits & rules

- **Package size:** the installed package (all shipped files) must be **≤ 256 KiB**.
  Keep assets small (optimise SVG/PNG; prefer SVG).
- **Slug:** `a–z A–Z 0–9 _ - .`, ≤47 chars, no `/ \ ..`.
- **File paths:** relative, `a–z A–Z 0–9 _ - . /`, ≤127 chars, no leading `/`,
  no `\`, no `..`. Nested `assets/…` folders are allowed.
- **`hexaos_compat`:** set it honestly to the lowest HexaOS version you tested.
- **Type ids:** always `<slug>.<widget>`, listed in `provides[]`.
- **All data via Bindings.** Never hardcode a datapoint slug; declare a source.
- **No external network from the widget body** beyond a declared **remote**
  binding; rely on `ctx` for data.

---

## 17. Do & Don't

**Do**

- Use the source key **`"simple"`** for a single main reading; render `.dw-name` +
  `.dw-vbox` and fill from `ctx.label("simple")` / `ctx.fmt(p)` / `ctx.unit()`.
- Display values through `ctx.fmt` so decimals + transform are respected.
- Declare **every** data input as a `sources` binding (point/array/remote).
- Guard every `ctx.point()` for `null`.
- Build DOM in `render`, refresh values in `update`.
- Size in `em` (or `* var(--dw-scale,1)`) so you scale.
- Use `span` (1–12) for every option; lay rows out to sum to 12 and group related
  fields (§10).
- Put design settings under `cat:'appearance'`, functional ones under the default.
- Add `help` to non-obvious fields.
- Namespace CSS with your slug.
- Call `ctx.error(msg)` for misconfiguration.
- Clean up timers/observers in `destroy`.

**Don't**

- ❌ Don't use `ctx.title()` for the datapoint name — use `ctx.label("simple")`.
- ❌ Don't render the Title / Widget-Icon / Datapoint-Icon / Last-Update overlays — HexaOS does.
- ❌ Don't set the label/value font or position yourself — that's the Appearance tab.
- ❌ Don't use the old `primary` source key — it's now **`simple`** (HexaOS migrates old saves).
- ❌ Don't use `col` for options — it's dead; use `span`.
- ❌ Don't dump every option two-per-row — design the SPAN12 layout (§10).
- ❌ Don't hardcode a datapoint slug — declare a binding.
- ❌ Don't rebuild the whole DOM in `update`.
- ❌ Don't add a host-level event listener every `render` without a one-shot
  guard (`if (!host.__bound){ host.__bound = 1; … }`) — hosts are reused.
- ❌ Don't reach outside `host`/`ctx`.

---

## 18. Release checklist

- [ ] `cat.json` complete; `slug` = folder name; `provides[]` matches the ids you
      register; `assets` lists every shipped file.
- [ ] `version` bumped (semver — **major** if the config model changed), `updated`
      set, `changelog.md` entry added.
- [ ] `hexaos_compat` set to the lowest version you tested.
- [ ] `widget.js` registers `<slug>.<widget>`; `render`/`update` only touch
      `host` + `ctx`.
- [ ] Single readings use the **`simple`** source; label/value via `.dw-name` +
      `.dw-vbox`, filled from `ctx.label`/`ctx.fmt`/`ctx.unit`.
- [ ] Every data input is a `sources` binding (no hardcoded slugs).
- [ ] Options use `span`; rows sum to 12 and are grouped sensibly (§10); design
      settings are `cat:'appearance'`.
- [ ] Handles unbound (`null`) and stale/offline data gracefully.
- [ ] Scales (tested small and large); CSS namespaced.
- [ ] Package ≤ 256 KiB; assets declared and referenced via `HexaDash.asset`.
- [ ] Tested in a local harness **and** on a device.

---

*Build something great. Follow the contract above and your widget will feel
native on every HexaOS dashboard.*
