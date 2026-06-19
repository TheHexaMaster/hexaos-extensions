/* hexaos_battery — reference HexaOS Dashboard Widget.
 *
 * A community Dashboard Widget is a plain JS module that registers one or more
 * widget types into the shared window.HexaDash registry — the SAME registry the
 * built-in dashboard widgets use. The firmware serves this file; the WebUI
 * injects it on dashboard open; the widget then appears in the picker and its
 * config form is rendered from def.opts.
 *
 * Rules of the contract (see SCHEMA.md "Dashboard Widget Package Schema"):
 *   - Touch only `host` (the .dw element) and `ctx`. NEVER use `this`/Alpine.
 *   - render(host, ctx): build the DOM once.
 *   - update(host, ctx): called on every live delta + on resize; refresh values.
 *   - destroy(host, ctx): optional; clear timers/observers.
 *   - Namespace your CSS classes with the slug (here: .hxbat-*).
 */
(function () {
  if (!window.HexaDash || !window.HexaDash.register) return;

  window.HexaDash.register("hexaos_battery.battery", {
    name: "Battery",
    cat: "display",
    icon: "<rect x='4' y='3' width='10' height='13' rx='1.5'/><path d='M7 1.8h4'/><rect x='6' y='9' width='6' height='5' rx='.5' fill='currentColor' stroke='none'/>",
    w: 2, h: 3, minW: 1, minH: 2,
    needsBind: true,
    writable: false,
    pick: "number",
    opts: [
      { key: "min",      label: "Empty at",     type: "number", col: 2, default: 0 },
      { key: "max",      label: "Full at",      type: "number", col: 2, default: 100 },
      { key: "warnAt",   label: "Low %",        type: "number", col: 2, default: 20 },
      { key: "showPct",  label: "Show %",       type: "bool",   default: true },
      { key: "color",    label: "Fill colour",  type: "color",  default: "#3fb950" },
      { key: "lowColor", label: "Low colour",   type: "color",  default: "#f85149" }
    ],

    render: function (host) {
      host.innerHTML =
        "<div class='dw-name'></div>" +
        "<div class='hxbat'>" +
          "<div class='hxbat-cap'></div>" +
          "<div class='hxbat-shell'>" +
            "<div class='hxbat-fill'></div>" +
            "<div class='hxbat-pct'>--</div>" +
          "</div>" +
        "</div>";
    },

    update: function (host, ctx) {
      var p = ctx.point(), o = ctx.cfg;
      host.querySelector(".dw-name").textContent = ctx.title();

      var mn = Number(o.min != null && o.min !== "" ? o.min : 0);
      var mx = Number(o.max != null && o.max !== "" ? o.max : 100);
      if (!(mx > mn)) mx = mn + 1;

      var raw = p ? Number(p.value) : NaN;
      var pct = isFinite(raw) ? Math.max(0, Math.min(100, ((raw - mn) / (mx - mn)) * 100)) : 0;
      var lowAt = Number(o.warnAt != null && o.warnAt !== "" ? o.warnAt : 20);

      var fill = host.querySelector(".hxbat-fill");
      fill.style.height = pct.toFixed(0) + "%";
      fill.style.background = (pct <= lowAt) ? (o.lowColor || "#f85149") : (o.color || "#3fb950");

      var lbl = host.querySelector(".hxbat-pct");
      lbl.style.display = (o.showPct === false) ? "none" : "";
      lbl.textContent = isFinite(raw) ? Math.round(pct) + "%" : "--";

      host.classList.toggle("dw-stale", !!(p && (p.offline || p.stale)));
    }
  });
})();
