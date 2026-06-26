# Changelog — hexaos_list (List)

## 1.1.1 — 2026-06-21
Bug fixes for the live controls.

- Switch / icon-toggle / button / stepper now read the datapoint's **current** value at
  click time instead of a stale render-time snapshot — repeated toggles work again
  (previously only the first toggle took effect; later clicks re-sent the same value).
  Toggles also honour the point's on/off values (`ton`/`toff`).
- Icon-toggle now applies its on/off **status colours** correctly — they were set on the
  wrong element and read from the wrong place, so the user colours were ignored and the
  icon never recoloured.

## 1.1.0 — 2026-06-21
Adds the proposed list enhancements.

- **Per-row thresholds** — warn / critical levels recolour the value and/or icon (explicit
  levels + global warn / critical colours + colour target).
- **Last-updated** age column; **value alignment** (left / right) + min column width;
  **name weight**.
- **Number stepper** control; units shown on slider / stepper / number controls; **button
  write value**; **click-row-to-toggle** for switch / icon / button rows.
- **Per-row sparkline min / max**; sparkline **bars** style.
- **Summary row** — sum / average / min / max / count of the numeric Value rows.
- **Section headers** — non-datapoint rows that group the list.
- Offline rows: show / dim / hide.
- Fix: the sparkline read-out now uses the Value size / weight / colour (was the name
  colour at a reduced size).

## 1.0.0 — 2026-06-21
First release. The first HexaOS dashboard widget built on the **array** data source.

- Bind N datapoints into one array input; each becomes a row. Add / remove / reorder freely.
- **Per-row** (in Bindings): icon, colour, label override and **unit override**; plus a value
  **Mode** — Value, Control or Sparkline.
- **Control mode** — turns a writable datapoint into a live control. The element is
  auto-detected from the point (bool → switch, enum → dropdown, numeric → slider or number,
  text → input) or chosen explicitly (Icon toggle / Switch / Button / Number / Slider / Dropdown / Text).
  The **Icon toggle** shows a clickable icon that switches between two user-defined status
  colours (on / off).
  Changes are written back to the device; controls reflect the live value.
- **Sparkline mode** — a rolling mini-graph of the datapoint with a live value read-out.
  Points held, min and max (auto) and colour/fill are options.
- **Value mode** — formatted value + unit; numeric by the decimals option (blank = automatic),
  non-numeric states (e.g. `Closed`, `Auto`) shown as-is.
- **Global options**: density (comfortable / compact), row dividers, zebra rows; icon size +
  default colour; name size + colour; value size + weight + colour; decimals, show unit, tint
  value with row colour; sparkline points / min / max / colour / fill; optional header row.
- Absolute px sizing (the table stays readable and shows more rows when taller). Sizes are set
  on the row container so they survive the framework's style pass. Stale / offline rows dim.
- No auto or random icons / colours — every visual aspect is set explicitly by the user.
