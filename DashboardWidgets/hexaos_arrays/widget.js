/* hexaos_arrays — HexaOS Dashboard Widget: dynamic data table (List).
 *
 * The first HexaOS widget for the ARRAY data source. Binds ONE input of
 * kind:'array' holding N datapoints; renders one row per datapoint as
 *   [icon] [name] .......... [value | control | sparkline]
 *
 * Per ROW (Bindings): icon, colour, label override, UNIT override, and a value
 * MODE — Value, Control (live interactive control for a writable point) or
 * Sparkline (rolling mini-graph). The control element is auto-detected from the
 * datapoint (bool->switch, enum->dropdown, numeric->slider/number, else text)
 * or chosen explicitly. GLOBAL (options): sizes, colours, density, dividers,
 * decimals, sparkline points/min/max. No auto/random icons or colours.
 */
(function () {
  if (!window.HexaDash || !window.HexaDash.register) return;
  var SVGNS = "http://www.w3.org/2000/svg";

  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function fmtVal(val, dec) {
    if (val == null || val === "") return "--";
    var n = parseFloat(val);
    if (!isFinite(n)) return String(val);
    if (dec != null && dec !== "") return n.toFixed(Math.max(0, Math.min(6, Number(dec))));
    return String(Math.round(n * 100) / 100);
  }
  function boolOn(p) {
    if (!p) return false; var v = p.value;
    if (v === true || v === "true" || v === 1 || v === "1") return true;
    if (v === false || v === "false" || v === 0 || v === "0") return false;
    return parseFloat(v) > 0;
  }
  /* detect the control element for a writable point (override wins over 'auto') */
  function ctlType(p, override) {
    if (override && override !== "auto") return override;
    if (!p) return "text";
    if (p.el && typeof p.el === "object") {
      var ks = Object.keys(p.el);
      if (ks.length === 2 && p.el["0"] != null && p.el["1"] != null) return "switch";
      return "select";
    }
    if (p.type === 2) return "switch";
    if (isFinite(parseFloat(p.value))) return (p.min != null && p.max != null) ? "slider" : "number";
    return "text";
  }
  function buildControl(type, it, p, ctx) {
    var slug = it.p, el;
    if (type === "switch") {
      el = document.createElement("button"); el.type = "button"; el.className = "hxl-sw"; el.setAttribute("role", "switch");
      el.innerHTML = "<span class='hxl-sw-k'></span>";
      el.onclick = function () { ctx.writePoint(slug, boolOn(p) ? 0 : 1); };
    } else if (type === "icon") {
      el = document.createElement("button"); el.type = "button"; el.className = "hxl-ico-tog";
      el.innerHTML = ctx.iconSvg(it.ctlIcon || it.icon || "power", "currentColor");
      el.setAttribute("data-on", it.onColor || "#3fb950");
      el.setAttribute("data-off", it.offColor || "#6e7681");
      el.onclick = function () { ctx.writePoint(slug, boolOn(p) ? 0 : 1); };
    } else if (type === "button") {
      el = document.createElement("button"); el.type = "button"; el.className = "hxl-btn"; el.textContent = it.label || "Set";
      el.onclick = function () { ctx.writePoint(slug, boolOn(p) ? 0 : 1); };
    } else if (type === "select") {
      el = document.createElement("select"); el.className = "hxl-sel"; var map = (p && p.el) || {};
      Object.keys(map).forEach(function (k) { var op = document.createElement("option"); op.value = k; op.textContent = map[k]; el.appendChild(op); });
      el.onchange = function () { ctx.writePoint(slug, el.value); };
    } else if (type === "slider") {
      el = document.createElement("input"); el.type = "range"; el.className = "hxl-rng";
      el.min = (p && p.min != null) ? p.min : 0; el.max = (p && p.max != null) ? p.max : 100; el.step = (p && p.step) || "any";
      el.onchange = function () { ctx.writePoint(slug, el.value); };
    } else if (type === "number") {
      el = document.createElement("input"); el.type = "number"; el.className = "hxl-numi";
      if (p && p.min != null) el.min = p.min; if (p && p.max != null) el.max = p.max; if (p && p.step != null) el.step = p.step;
      el.onchange = function () { ctx.writePoint(slug, el.value); };
    } else {
      el = document.createElement("input"); el.type = "text"; el.className = "hxl-txt";
      el.onchange = function () { ctx.writePoint(slug, el.value); };
    }
    return el;
  }
  function syncControl(type, ctlSpan, p) {
    if (!ctlSpan) return; var el = ctlSpan.firstChild; if (!el) return;
    if (type === "switch" || type === "button") {
      var on = boolOn(p); ctlSpan.classList.toggle("on", on); el.setAttribute("aria-checked", on ? "true" : "false");
    } else if (type === "icon") {
      var oni = boolOn(p); ctlSpan.classList.toggle("on", oni);
      el.style.color = oni ? (el.getAttribute("data-on") || "#3fb950") : (el.getAttribute("data-off") || "#6e7681");
    } else {
      if (document.activeElement === el) return;
      if (p && p.value != null) el.value = p.value;
    }
  }
  function drawSpark(host, i, m, p, o, it) {
    var buf = host._spark[i] || (host._spark[i] = []);
    var v = p ? parseFloat(p.value) : NaN;
    if (isFinite(v)) { buf.push(v); var cap = Math.max(2, Math.min(240, num(o.sparkPoints, 30))); while (buf.length > cap) buf.shift(); }
    if (m.sparkV) m.sparkV.textContent = (isFinite(v) ? fmtVal(v, o.decimals) : "--") +
      ((o.showUnit !== false && (it.unit || (p && p.unit))) ? (" " + (it.unit || p.unit)) : "");
    if (buf.length < 2) { m.spark.line.setAttribute("d", ""); m.spark.fill.setAttribute("d", ""); return; }
    var mn = (o.sparkMin != null && o.sparkMin !== "") ? Number(o.sparkMin) : Math.min.apply(null, buf);
    var mx = (o.sparkMax != null && o.sparkMax !== "") ? Number(o.sparkMax) : Math.max.apply(null, buf);
    if (!(mx > mn)) mx = mn + 1;
    var W = 100, H = 30, n = buf.length, step = W / (n - 1);
    var d = "M" + buf.map(function (val, idx) {
      var x = idx * step, y = (H - 2) - ((val - mn) / (mx - mn)) * (H - 4);
      return x.toFixed(1) + " " + y.toFixed(1);
    }).join(" L");
    var col = o.sparkColor || it.color || o.valColor || "#58a6ff";
    m.spark.line.setAttribute("d", d); m.spark.line.style.stroke = col;
    if (o.sparkFill !== false) { m.spark.fill.setAttribute("d", d + " L" + W + " " + H + " L0 " + H + " Z"); m.spark.fill.style.fill = col; m.spark.fill.style.display = ""; }
    else m.spark.fill.style.display = "none";
  }

  var WEIGHTS = [{ v: "", l: "Auto" }, { v: "300", l: "300" }, { v: "400", l: "400" },
    { v: "500", l: "500" }, { v: "600", l: "600" }, { v: "700", l: "700" }, { v: "800", l: "800" }];

  window.HexaDash.register("hexaos_arrays.list", {
    name: "List",
    cat: "display",
    icon: "<line x1='9' y1='5' x2='20' y2='5'/><line x1='9' y1='12' x2='20' y2='12'/><line x1='9' y1='19' x2='20' y2='19'/><circle cx='4.5' cy='5' r='1.4' fill='currentColor' stroke='none'/><circle cx='4.5' cy='12' r='1.4' fill='currentColor' stroke='none'/><circle cx='4.5' cy='19' r='1.4' fill='currentColor' stroke='none'/>",
    w: 4, h: 4, minW: 2, minH: 2, cfgOnAdd: true,

    /* one array input; each entry carries label/icon/colour/unit + a value mode + control type */
    sources: [
      { key: "items", label: "Datapoints", kind: "array", pick: "any",
        entry: { label: 1, icon: 1, color: 1, unit: 1, mode: 1, control: 1, ctlIcon: 1, onColor: 1, offColor: 1 } }
    ],

    opts: [
      { section: "Rows", cat: "appearance" },
      { key: "density", label: "Density", type: "select", span: 6, default: "comfortable",
        options: [{ v: "comfortable", l: "Comfortable" }, { v: "compact", l: "Compact" }] },
      { key: "divider", label: "Row dividers", type: "bool", span: 3, default: true },
      { key: "zebra",   label: "Zebra rows",   type: "bool", span: 3, default: false },

      { section: "Icon", cat: "appearance" },
      { key: "iconSize",  label: "Icon size (px)",      type: "number", span: 6, default: 18 },
      { key: "iconColor", label: "Default icon colour", type: "color",  span: 6, default: "#8b949e",
        help: "Used for rows that have no per-row colour set in Bindings." },

      { section: "Name", cat: "appearance" },
      { key: "nameSize",  label: "Name size (px)", type: "number", span: 6, default: 13 },
      { key: "nameColor", label: "Name colour",    type: "color",  span: 6, default: "#c9d1d9" },

      { section: "Value", cat: "appearance" },
      { key: "valSize",   label: "Value size (px)", type: "number", span: 4, default: 14 },
      { key: "valWeight", label: "Value weight",    type: "select", span: 4, default: "600", options: WEIGHTS },
      { key: "valColor",  label: "Value colour",    type: "color",  span: 4, default: "#f0f3f6" },

      { section: "Format" },
      { key: "decimals", label: "Decimals", type: "number", span: 4, default: "", ph: "auto",
        help: "Decimal places for numeric values; blank = automatic. Non-numeric states show as-is." },
      { key: "showUnit",  label: "Show unit", type: "bool", span: 4, default: true },
      { key: "tintValue", label: "Tint value with row colour", type: "bool", span: 4, default: false,
        help: "When on, each value uses its own row colour instead of the value colour." },

      { section: "Sparkline" },
      { key: "sparkPoints", label: "Points held", type: "number", span: 4, default: 30,
        help: "How many recent samples each Sparkline row keeps." },
      { key: "sparkMin", label: "Min", type: "number", span: 4, default: "", ph: "auto" },
      { key: "sparkMax", label: "Max", type: "number", span: 4, default: "", ph: "auto" },
      { key: "sparkColor", label: "Sparkline colour", type: "color", span: 6, default: "", ph: "row / value colour" },
      { key: "sparkFill",  label: "Fill under line",  type: "bool",  span: 6, default: true },

      { section: "Header" },
      { key: "showHeader", label: "Show header row", type: "bool", span: 4, default: false },
      { key: "hdrName",    label: "Name heading",    type: "text", span: 4, default: "Name" },
      { key: "hdrValue",   label: "Value heading",   type: "text", span: 4, default: "Value" }
    ],

    render: function (host, ctx) {
      var o = ctx.cfg || {}, items = (ctx.items ? ctx.items("items") : []) || [];
      host.className = "dw hxl" +
        (o.density === "compact" ? " hxl-compact" : "") +
        (o.divider !== false ? " hxl-div" : "") +
        (o.zebra ? " hxl-zebra" : "");
      host.innerHTML = "";
      var wrap = document.createElement("div"); wrap.className = "hxl-wrap";
      /* size/colour vars live on the wrap child — the framework's dashApplyStyle
         wipes host.style.cssText right after render. */
      var S = wrap.style;
      S.setProperty("--hxl-ico", String(num(o.iconSize, 18)));
      S.setProperty("--hxl-nm", String(num(o.nameSize, 13)));
      S.setProperty("--hxl-val", String(num(o.valSize, 14)));
      S.setProperty("--hxl-nm-color", o.nameColor || "#c9d1d9");
      S.setProperty("--hxl-val-wt", String((o.valWeight != null && o.valWeight !== "") ? o.valWeight : 600));

      if (o.showHeader) {
        var hdr = document.createElement("div"); hdr.className = "hxl-hdr";
        var hn = document.createElement("span"); hn.className = "hxl-hdr-n"; hn.textContent = (o.hdrName != null ? o.hdrName : "Name");
        var hv = document.createElement("span"); hv.className = "hxl-hdr-v"; hv.textContent = (o.hdrValue != null ? o.hdrValue : "Value");
        hdr.appendChild(hn); hdr.appendChild(hv); wrap.appendChild(hdr);
      }
      var rowsEl = document.createElement("div"); rowsEl.className = "hxl-rows";
      host._rows = []; host._spark = host._spark || {};

      if (!items.length) {
        var em = document.createElement("div"); em.className = "hxl-empty";
        em.innerHTML = "No datapoints bound.<br>Add rows in <b>Bindings</b>.";
        rowsEl.appendChild(em);
      } else {
        items.forEach(function (it, i) {
          var p = it.point, mode = it.mode || "value", col = it.color || o.iconColor || "#8b949e";
          var row = document.createElement("div"); row.className = "hxl-row"; row.setAttribute("data-i", i);
          var ico = document.createElement("span"); ico.className = "hxl-ico" + (it.icon ? "" : " hxl-ico-empty");
          if (it.icon) { ico.style.color = col; ico.innerHTML = ctx.iconSvg(it.icon, col); }
          row.appendChild(ico);
          var nm = document.createElement("span"); nm.className = "hxl-nm"; nm.textContent = (it.label || (p && p.label) || it.p || "");
          row.appendChild(nm);

          var meta = { mode: mode, ctlType: null, spark: null, sparkV: null };
          if (mode === "control") {
            var type = ctlType(p, it.control); meta.ctlType = type;
            var ctl = document.createElement("span"); ctl.className = "hxl-ctl hxl-ctl-" + type;
            ctl.appendChild(buildControl(type, it, p, ctx));
            row.appendChild(ctl);
          } else if (mode === "graph") {
            var sp = document.createElement("span"); sp.className = "hxl-spark";
            var svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("class", "hxl-spark-svg"); svg.setAttribute("viewBox", "0 0 100 30"); svg.setAttribute("preserveAspectRatio", "none");
            var fill = document.createElementNS(SVGNS, "path"); fill.setAttribute("class", "hxl-spark-fill");
            var line = document.createElementNS(SVGNS, "path"); line.setAttribute("class", "hxl-spark-line");
            svg.appendChild(fill); svg.appendChild(line); sp.appendChild(svg);
            var sv = document.createElement("span"); sv.className = "hxl-spark-v"; sp.appendChild(sv);
            row.appendChild(sp); meta.spark = { svg: svg, fill: fill, line: line }; meta.sparkV = sv;
            if (!host._spark[i]) host._spark[i] = [];
          } else {
            var val = document.createElement("span"); val.className = "hxl-val";
            var v = document.createElement("span"); v.className = "hxl-v"; v.textContent = "--";
            var u = document.createElement("span"); u.className = "hxl-u";
            val.appendChild(v); val.appendChild(u); row.appendChild(val);
          }
          host._rows.push(meta);
          rowsEl.appendChild(row);
        });
      }
      wrap.appendChild(rowsEl); host.appendChild(wrap);
    },

    update: function (host, ctx) {
      var o = ctx.cfg || {}, items = (ctx.items ? ctx.items("items") : []) || [];
      var rows = host.querySelectorAll(".hxl-row"), meta = host._rows || [];
      var n = Math.min(rows.length, items.length, meta.length), i;
      for (i = 0; i < n; i++) {
        var row = rows[i], it = items[i], p = it.point, m = meta[i];
        if (m.mode === "control") {
          syncControl(m.ctlType, row.querySelector(".hxl-ctl"), p);
        } else if (m.mode === "graph") {
          drawSpark(host, i, m, p, o, it);
        } else {
          var vEl = row.querySelector(".hxl-v"), uEl = row.querySelector(".hxl-u"), wrap = row.querySelector(".hxl-val");
          if (vEl) vEl.textContent = p ? fmtVal(p.value, o.decimals) : "--";
          if (uEl) uEl.textContent = (p && o.showUnit !== false) ? (it.unit || p.unit || "") : "";
          if (wrap) wrap.style.color = (o.tintValue && it.color) ? it.color : (o.valColor || "#f0f3f6");
        }
        row.classList.toggle("hxl-stale", !!(p && (p.offline || p.stale)));
      }
    },

    destroy: function (host) { host._spark = null; host._rows = null; }
  });
})();
