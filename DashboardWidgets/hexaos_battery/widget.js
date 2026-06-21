/* hexaos_battery — a modern, themeable, RESPONSIVE battery (reference package).
 *
 * Six pre-built themes — Vertical · Horizontal · Segment vertical · Segment
 * horizontal · Ring · Minimal — chosen from the dropdown in the "Theme Selector"
 * section header; each theme reveals its own design settings below it.
 *
 * Responsiveness: the battery is wrapped in a `.hxbat-fit` box sized by CSS
 * container queries against the widget cell, so on resize it scales to fill the
 * space (Sizing → "Scale to fit" keeps the shape like an SVG viewBox, "Stretch
 * to fill" uses the whole cell). No more shrinking to a useless stick.
 *
 * The JS only computes state and sets CSS custom properties:
 *   --hxp fill %   --hxc colour   --hx-ar aspect   --hx-frame-w/-c, --hx-radius,
 *   --hx-ring-w, --hx-seg-gap, --hx-glowc, --hx-track   + state classes.
 * All the look + animations live in widget.css.
 *
 * Contract: touch only `host` (.dw) and `ctx`; never `this`/Alpine. The single
 * input is the `simple` datapoint (Bindings); its label names the widget. CSS is
 * namespaced .hxbat-*; sizes use em + --dw-scale so they scale with the cell.
 */
(function () {
  if (!window.HexaDash || !window.HexaDash.register) return;

  var THEME_OPTS = [
    { v: "vertical",      l: "Vertical" },
    { v: "horizontal",    l: "Horizontal" },
    { v: "segVertical",   l: "Segment vertical" },
    { v: "segHorizontal", l: "Segment horizontal" },
    { v: "ring",          l: "Ring" },
    { v: "minimal",       l: "Minimal" }
  ];
  /* each theme's natural aspect ratio (width ÷ height) for "Scale to fit" */
  var AR = { vertical: 0.55, horizontal: 1.9, segVertical: 0.55, segHorizontal: 1.9, ring: 1, minimal: 2.4 };
  /* which themes a per-theme design field belongs to (drives `when` visibility) */
  var T_FRAME = { key: "theme", in: ["vertical", "horizontal", "segVertical", "segHorizontal"] };
  var T_SEG   = { key: "theme", in: ["segVertical", "segHorizontal"] };
  var T_RING  = { key: "theme", in: ["ring"] };

  var BOLT = "<svg class='hxbat-bolt' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>" +
             "<path d='M13 2 4.5 13.5H11l-1 8.5L19.5 9.5H13z'/></svg>";
  var READ = "<div class='hxbat-read'><span class='hxbat-pct'>--</span>" + BOLT + "</div>";

  function num(v, d) { return (v == null || v === "") ? d : Number(v); }
  function clamp(n, a, b) { return n < a ? a : (n > b ? b : n); }
  function segN(o) { return clamp(Math.round(num(o.segCount, 5)), 1, 12); }
  function vset(st, name, v) { if (v != null && v !== "") st.setProperty(name, String(v)); else st.removeProperty(name); }
  function nset(st, name, v, d) { st.setProperty(name, String(num(v, d))); }

  function segCells(o, dir) {
    var n = segN(o), s = "", i;
    for (i = 0; i < n; i++) {
      var idx = dir === "v" ? (n - 1 - i) : i;            // vertical fills bottom-up
      s += "<div class='hxbat-seg' style='--lo:" + (idx * 100 / n).toFixed(2) +
           ";--step:" + (100 / n).toFixed(2) + "'><b class='hxbat-fill'><span class='hxbat-gloss'></span></b></div>";
    }
    return s;
  }

  function buildVertical() {
    return "<div class='hxbat-fit hxbat-v'>" +
        "<div class='hxbat-cap hxbat-cap-t'></div>" +
        "<div class='hxbat-body hxbat-v-body'>" +
          "<div class='hxbat-fill hxbat-v-fill'><span class='hxbat-gloss'></span><span class='hxbat-flow'></span></div>" + READ +
        "</div></div>";
  }
  function buildHorizontal() {
    return "<div class='hxbat-fit hxbat-h'>" +
        "<div class='hxbat-body hxbat-h-body'>" +
          "<div class='hxbat-fill hxbat-h-fill'><span class='hxbat-gloss'></span><span class='hxbat-flow'></span></div>" + READ +
        "</div><div class='hxbat-cap hxbat-cap-r'></div></div>";
  }
  function buildSegV(o) {
    return "<div class='hxbat-fit hxbat-sv'>" +
        "<div class='hxbat-cap hxbat-cap-t'></div>" +
        "<div class='hxbat-body hxbat-sv-body'><div class='hxbat-segs hxbat-segs-v'>" + segCells(o, "v") + "</div>" + READ +
        "</div></div>";
  }
  function buildSegH(o) {
    return "<div class='hxbat-fit hxbat-sh'>" +
        "<div class='hxbat-body hxbat-sh-body'><div class='hxbat-segs hxbat-segs-h'>" + segCells(o, "h") + "</div>" + READ +
        "</div><div class='hxbat-cap hxbat-cap-r'></div></div>";
  }
  function buildRing() {
    return "<div class='hxbat-fit hxbat-ring'>" +
        "<svg class='hxbat-ring-svg' viewBox='0 0 100 100'>" +
          "<circle class='hxbat-ring-track' cx='50' cy='50' r='43'></circle>" +
          "<circle class='hxbat-ring-prog' cx='50' cy='50' r='43' pathLength='100'></circle>" +
        "</svg><div class='hxbat-ring-c'>" + READ + "</div></div>";
  }
  function buildMinimal() {
    return "<div class='hxbat-fit hxbat-min'>" +
        "<div class='hxbat-min-top'><span class='hxbat-pct'>--</span>" + BOLT + "</div>" +
        "<div class='hxbat-min-track'><div class='hxbat-fill hxbat-min-fill'></div></div></div>";
  }
  var THEMES = {
    vertical: buildVertical, horizontal: buildHorizontal,
    segVertical: buildSegV, segHorizontal: buildSegH,
    ring: buildRing, minimal: buildMinimal
  };

  window.HexaDash.register("hexaos_battery.battery", {
    name: "Battery",
    cat: "display",
    icon: "<rect x='3.5' y='5' width='10' height='8' rx='1.6'/><path d='M14.5 7.6v2.8'/>" +
          "<path d='M8.6 5.6 6.2 9.2h2.3L7.4 12.6l3-4H8z' fill='currentColor' stroke='none'/>",
    w: 2, h: 3, minW: 1, minH: 1,

    sources: [{ key: "simple", label: "Battery level", pick: "number", dec: true, unit: true }],

    opts: [
      /* ---------- Appearance ---------- */
      /* the theme dropdown lives in this section's HEADER; the chosen theme's own
         design settings appear right below it (via per-field `when`). */
      { section: "Theme Selector", cat: "appearance", headSel: { key: "theme", options: THEME_OPTS } },
      { key: "showPct", label: "Show %", type: "bool", span: 12, default: true },
      { key: "frameW",     label: "Frame width",   type: "number", span: 4, default: 3,  when: T_FRAME },
      { key: "frameColor", label: "Frame colour",  type: "color",  span: 4, default: "", when: T_FRAME },
      { key: "radius",     label: "Corner radius", type: "number", span: 4, default: "", ph: "auto", when: T_FRAME },
      { key: "segCount",   label: "Segments",      type: "number", span: 6, default: 5,  when: T_SEG,
        help: "How many cells the battery interior is split into (1–12)." },
      { key: "segGap",     label: "Gap",           type: "number", span: 6, default: 3,  when: T_SEG,
        help: "Space between the segments." },
      { key: "ringThick",  label: "Ring thickness",type: "number", span: 12, default: 10, when: T_RING,
        help: "Stroke width of the ring (out of 100)." },

      { section: "Sizing", cat: "appearance" },
      { key: "fit", label: "Fit", type: "select", span: 6, default: "aspect",
        options: [{ v: "aspect", l: "Scale to fit (keep shape)" }, { v: "fill", l: "Stretch to fill" }],
        help: "Scale to fit keeps the battery's shape and grows it to the largest size that fits the cell; Stretch fills the whole widget." },
      { key: "aspect", label: "Aspect W÷H", type: "number", span: 6, default: "",
        help: "Width-to-height ratio used by Scale to fit (blank = the theme's default)." },

      { section: "Colours", cat: "appearance" },
      { key: "color",      label: "Charge colour",   type: "color", span: 6, default: "#3fb950" },
      { key: "trackColor", label: "Track colour",    type: "color", span: 6, default: "",
        help: "Background of the empty part (blank = theme default)." },
      { key: "warnColor",  label: "Warning colour",  type: "color", span: 6, default: "#d29922" },
      { key: "critColor",  label: "Critical colour", type: "color", span: 6, default: "#f85149" },

      { section: "Glow", cat: "appearance" },
      { key: "glow",      label: "Glow",        type: "bool",  span: 6, default: true },
      { key: "glowColor", label: "Glow colour", type: "color", span: 6, default: "",
        help: "Colour of the fill glow (blank = the charge colour)." },

      { section: "Animation", cat: "appearance" },
      { key: "fillAnim", label: "Animate fill",    type: "bool", span: 4, default: true,
        help: "Smoothly tween the fill when the level changes." },
      { key: "chargeFx", label: "Charging effect", type: "bool", span: 4, default: true,
        help: "Show a bolt + shimmer while the level is rising." },
      { key: "lowPulse", label: "Low pulse",       type: "bool", span: 4, default: true,
        help: "Gently pulse the fill when critically low." },

      /* ---------- Logic ---------- */
      { section: "Range" },
      { key: "min", label: "Empty at", type: "number", span: 6, default: 0,
        help: "Datapoint value mapped to 0%." },
      { key: "max", label: "Full at",  type: "number", span: 6, default: 100,
        help: "Datapoint value mapped to 100%." },
      { section: "Thresholds" },
      { key: "warnAt", label: "Warning ≤ %",  type: "number", span: 6, default: 30,
        help: "At or below this %, the fill uses the warning colour." },
      { key: "critAt", label: "Critical ≤ %", type: "number", span: 6, default: 12,
        help: "At or below this %, the fill uses the critical colour and pulses." }
    ],

    render: function (host) {
      host.innerHTML = "<div class='dw-name'></div><div class='hxbat-stage'></div>";
      host.__theme = null; host.__seg = null; host.__lastVal = null; host.__chgTs = 0;
    },

    update: function (host, ctx) {
      var p = ctx.point(), o = ctx.cfg;
      host.querySelector(".dw-name").textContent = ctx.label("simple");

      /* (re)build the theme DOM on theme change, or on segment-count change */
      var stage = host.querySelector(".hxbat-stage");
      var theme = THEMES[o.theme] ? o.theme : "vertical";
      var isSeg = theme === "segVertical" || theme === "segHorizontal";
      var seg = isSeg ? segN(o) : 0;
      if (host.__theme !== theme || (isSeg && host.__seg !== seg)) {
        stage.innerHTML = THEMES[theme](o);
        stage.className = "hxbat-stage hxbat-t-" + theme;
        host.__theme = theme; host.__seg = seg;
      }

      /* sizing: container-query box, aspect or stretch */
      stage.classList.toggle("hxbat-fill", o.fit === "fill");
      var ar = num(o.aspect, ""); if (!(ar > 0)) ar = AR[theme] || 1;
      var st = stage.style;
      st.setProperty("--hx-ar", ar);

      /* value -> percentage */
      var mn = num(o.min, 0), mx = num(o.max, 100); if (!(mx > mn)) mx = mn + 1;
      var raw = p ? Number(p.value) : NaN, has = isFinite(raw);
      var pct = has ? clamp((raw - mn) / (mx - mn) * 100, 0, 100) : 0;

      /* threshold colour */
      var warnAt = num(o.warnAt, 30), critAt = num(o.critAt, 12);
      var crit = has && pct <= critAt, warn = has && !crit && pct <= warnAt;
      var col = crit ? (o.critColor || "#f85149") : warn ? (o.warnColor || "#d29922") : (o.color || "#3fb950");

      /* charging = the level has risen recently (latched ~4.5 s) */
      var now = Date.now();
      if (host.__lastVal == null && has) host.__lastVal = raw;
      if (has && raw > host.__lastVal + 0.4) host.__chgTs = now;
      if (has) host.__lastVal = raw;
      var charging = (o.chargeFx !== false) && host.__chgTs > 0 && (now - host.__chgTs) < 4500 && pct < 99.5;

      /* push state + design to CSS */
      st.setProperty("--hxp", pct.toFixed(2));
      st.setProperty("--hxc", col);
      vset(st, "--hx-track", o.trackColor);
      vset(st, "--hx-frame-c", o.frameColor);
      vset(st, "--hx-radius", o.radius);
      vset(st, "--hx-glowc", o.glowColor);
      nset(st, "--hx-frame-w", o.frameW, 3);
      nset(st, "--hx-ring-w", o.ringThick, 10);
      nset(st, "--hx-seg-gap", o.segGap, 3);

      stage.classList.toggle("hxbat-glow", o.glow !== false);
      stage.classList.toggle("hxbat-charging", !!charging);
      stage.classList.toggle("hxbat-crit", !!(crit && o.lowPulse !== false));
      stage.classList.toggle("hxbat-noanim", o.fillAnim === false);
      stage.classList.toggle("hxbat-nopct", o.showPct === false);
      stage.classList.toggle("hxbat-empty", !has);

      var pctEl = stage.querySelector(".hxbat-pct");
      if (pctEl) pctEl.textContent = has ? Math.round(pct) + "%" : "--";

      host.classList.toggle("dw-stale", !!(p && (p.offline || p.stale)));
    }
  });
})();
