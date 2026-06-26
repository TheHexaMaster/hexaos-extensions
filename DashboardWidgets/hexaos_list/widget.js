/* hexaos_list — HexaOS Dashboard Widget: dynamic data table (HexaOS List).
 *
 * The first HexaOS widget for the ARRAY data source. Binds ONE input of
 * kind:'array' holding N datapoints; renders one row per datapoint as
 *   [icon] [name] .......... [value | control | sparkline]  [age]
 *
 * Per ROW (Bindings): icon, colour, label override, UNIT override, value MODE
 * (Value / Control / Sparkline / Section header), control element + icon-toggle
 * colours + button write value, warn/critical thresholds, per-row sparkline
 * min/max. GLOBAL options: sizes, colours, density, dividers, value alignment +
 * min width, threshold colours, last-updated column, sparkline line/bars, a
 * summary row, offline handling, header. No auto/random icons or colours.
 */
(function () {
  if (!window.HexaDash || !window.HexaDash.register) return;
  var SVGNS = "http://www.w3.org/2000/svg";

  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function isSet(v) { return v != null && v !== ""; }
  function fmtVal(val, dec) {
    if (val == null || val === "") return "--";
    var n = parseFloat(val);
    if (!isFinite(n)) return String(val);
    if (isSet(dec)) return n.toFixed(Math.max(0, Math.min(6, Number(dec))));
    return String(Math.round(n * 100) / 100);
  }
  function boolOn(p) {
    if (!p) return false; var v = p.value;
    if (v === true || v === "true" || v === 1 || v === "1") return true;
    if (v === false || v === "false" || v === 0 || v === "0") return false;
    return parseFloat(v) > 0;
  }
  /* explicit warn/crit thresholds -> colour (or null = normal). Never random. */
  function threshColor(val, it, o) {
    if (!isSet(it.warnAt) && !isSet(it.critAt)) return null;
    var n = parseFloat(val); if (!isFinite(n)) return null;
    if (isSet(it.critAt) && n >= Number(it.critAt)) return o.critColor || "#f85149";
    if (isSet(it.warnAt) && n >= Number(it.warnAt)) return o.warnColor || "#d29922";
    return null;
  }
  function ageText(p) {
    if (!p) return "";
    if (p.ageStr) return p.ageStr;
    var a = p.age; if (a == null || !isFinite(a)) return "";
    if (a < 60) return Math.round(a) + "s";
    if (a < 3600) return Math.round(a / 60) + "m";
    if (a < 86400) return Math.round(a / 3600) + "h";
    return Math.round(a / 86400) + "d";
  }
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
  function unitSpan(u) { var s = document.createElement("span"); s.className = "hxl-cu"; s.textContent = u || ""; return s; }

  function buildControl(type, it, p, ctx, o) {
    var slug = it.p, el, wrap, unit = it.unit || (p && p.unit) || "";
    var tog = function (e) {
      if (e) e.stopPropagation();
      if (isSet(it.writeVal)) { ctx.writePoint(slug, it.writeVal); return; }
      /* read the CURRENT point at click time — never the render-time snapshot */
      var cur = (ctx.resolve && ctx.resolve(slug)) || p;
      var on = ctx.boolOf ? ctx.boolOf(cur) : boolOn(cur);
      ctx.writePoint(slug, on ? (cur && cur.toff != null ? cur.toff : 0) : (cur && cur.ton != null ? cur.ton : 1));
    };
    if (type === "switch") {
      el = document.createElement("button"); el.type = "button"; el.className = "hxl-sw"; el.setAttribute("role", "switch");
      el.innerHTML = "<span class='hxl-sw-k'></span>"; el.onclick = tog; return el;
    }
    if (type === "icon") {
      el = document.createElement("button"); el.type = "button"; el.className = "hxl-ico-tog";
      el.innerHTML = ctx.iconSvg(it.ctlIcon || it.icon || "power", "currentColor");
      el.setAttribute("data-on", it.onColor || "#3fb950"); el.setAttribute("data-off", it.offColor || "#6e7681");
      el.onclick = tog; return el;
    }
    if (type === "button") {
      el = document.createElement("button"); el.type = "button"; el.className = "hxl-btn"; el.textContent = it.label || "Set";
      el.onclick = tog; return el;
    }
    if (type === "select") {
      el = document.createElement("select"); el.className = "hxl-sel"; var map = (p && p.el) || {};
      Object.keys(map).forEach(function (k) { var op = document.createElement("option"); op.value = k; op.textContent = map[k]; el.appendChild(op); });
      el.onclick = function (e) { if (e) e.stopPropagation(); };
      el.onchange = function () { ctx.writePoint(slug, el.value); }; return el;
    }
    if (type === "slider") {
      wrap = document.createElement("span"); wrap.className = "hxl-rngw";
      el = document.createElement("input"); el.type = "range"; el.className = "hxl-rng";
      el.min = (p && p.min != null) ? p.min : 0; el.max = (p && p.max != null) ? p.max : 100; el.step = (p && p.step) || "any";
      el.onclick = function (e) { if (e) e.stopPropagation(); };
      el.onchange = function () { ctx.writePoint(slug, el.value); };
      wrap.appendChild(el); if (unit) wrap.appendChild(unitSpan(unit)); return wrap;
    }
    if (type === "stepper") {
      wrap = document.createElement("span"); wrap.className = "hxl-step";
      var dec = document.createElement("button"); dec.type = "button"; dec.className = "hxl-step-b"; dec.textContent = "−";
      var vv = document.createElement("span"); vv.className = "hxl-step-v";
      var inc = document.createElement("button"); inc.type = "button"; inc.className = "hxl-step-b"; inc.textContent = "+";
      var st = (p && p.step) ? Number(p.step) : 1;
      var stepBy = function (e, dir) { if (e) e.stopPropagation(); var rp = (ctx.resolve && ctx.resolve(slug)) || p; var cur = parseFloat(rp && rp.value); if (!isFinite(cur)) cur = 0; var nv = cur + dir * st; if (rp && rp.min != null) nv = Math.max(Number(rp.min), nv); if (rp && rp.max != null) nv = Math.min(Number(rp.max), nv); ctx.writePoint(slug, nv); };
      dec.onclick = function (e) { stepBy(e, -1); }; inc.onclick = function (e) { stepBy(e, 1); };
      wrap.appendChild(dec); wrap.appendChild(vv); if (unit) wrap.appendChild(unitSpan(unit)); wrap.appendChild(inc); return wrap;
    }
    wrap = document.createElement("span"); wrap.className = "hxl-txtw";
    el = document.createElement("input"); el.type = "number" === type ? "number" : "text"; el.className = type === "number" ? "hxl-numi" : "hxl-txt";
    if (type === "number" && p) { if (p.min != null) el.min = p.min; if (p.max != null) el.max = p.max; if (p.step != null) el.step = p.step; }
    el.onclick = function (e) { if (e) e.stopPropagation(); };
    el.onchange = function () { ctx.writePoint(slug, el.value); };
    wrap.appendChild(el); if (unit && type === "number") wrap.appendChild(unitSpan(unit)); return wrap;
  }
  function syncControl(type, ctlSpan, p) {
    if (!ctlSpan) return;
    if (type === "switch" || type === "button") {
      var on = boolOn(p); ctlSpan.classList.toggle("on", on); ctlSpan.setAttribute("aria-checked", on ? "true" : "false");
    } else if (type === "icon") {
      var oni = boolOn(p); ctlSpan.classList.toggle("on", oni);
      var ib = ctlSpan.firstChild;   /* the .hxl-ico-tog button holds data-on/off + the SVG */
      if (ib) ib.style.color = oni ? (ib.getAttribute("data-on") || "#3fb950") : (ib.getAttribute("data-off") || "#6e7681");
    } else if (type === "stepper") {
      var sv = ctlSpan.querySelector(".hxl-step-v"); if (sv) sv.textContent = p ? fmtVal(p.value, "") : "--";
    } else if (type === "slider") {
      var rng = ctlSpan.querySelector(".hxl-rng"); if (rng && document.activeElement !== rng && p && p.value != null) rng.value = p.value;
    } else {
      var inp = ctlSpan.tagName === "SELECT" ? ctlSpan : ctlSpan.querySelector("input,select"); if (!inp) inp = ctlSpan;
      if (inp && document.activeElement !== inp && p && p.value != null && "value" in inp) inp.value = p.value;
    }
  }
  function drawSpark(host, key, m, p, o, it) {
    var buf = host._spark[key] || (host._spark[key] = []);
    var v = p ? parseFloat(p.value) : NaN;
    if (isFinite(v)) { buf.push(v); var cap = Math.max(2, Math.min(240, num(o.sparkPoints, 30))); while (buf.length > cap) buf.shift(); }
    if (m.sparkV) m.sparkV.textContent = (isFinite(v) ? fmtVal(v, o.decimals) : "--") +
      ((o.showUnit !== false && (it.unit || (p && p.unit))) ? (" " + (it.unit || p.unit)) : "");
    if (buf.length < 2) { m.spark.line.setAttribute("d", ""); m.spark.fill.setAttribute("d", ""); m.spark.bars.innerHTML = ""; return; }
    var mn = isSet(it.sparkMin) ? Number(it.sparkMin) : (isSet(o.sparkMin) ? Number(o.sparkMin) : Math.min.apply(null, buf));
    var mx = isSet(it.sparkMax) ? Number(it.sparkMax) : (isSet(o.sparkMax) ? Number(o.sparkMax) : Math.max.apply(null, buf));
    if (!(mx > mn)) mx = mn + 1;
    var W = 100, H = 30, n = buf.length, col = o.sparkColor || it.color || o.valColor || "#58a6ff";
    var y = function (val) { return (H - 2) - ((val - mn) / (mx - mn)) * (H - 4); };
    if (o.sparkStyle === "bars") {
      m.spark.line.setAttribute("d", ""); m.spark.fill.setAttribute("d", "");
      var bw = W / n, g = Math.min(1.5, bw * 0.25), html = "";
      for (var i = 0; i < n; i++) { var by = y(buf[i]), x = i * bw; html += "<rect x='" + (x + g).toFixed(1) + "' y='" + by.toFixed(1) + "' width='" + Math.max(0.4, bw - g * 2).toFixed(1) + "' height='" + (H - by).toFixed(1) + "'/>"; }
      m.spark.bars.innerHTML = html; m.spark.bars.style.fill = col;
    } else {
      m.spark.bars.innerHTML = "";
      var step = W / (n - 1);
      var d = "M" + buf.map(function (val, idx) { return (idx * step).toFixed(1) + " " + y(val).toFixed(1); }).join(" L");
      m.spark.line.setAttribute("d", d); m.spark.line.style.stroke = col;
      if (o.sparkFill !== false) { m.spark.fill.setAttribute("d", d + " L" + W + " " + H + " L0 " + H + " Z"); m.spark.fill.style.fill = col; m.spark.fill.style.display = ""; }
      else m.spark.fill.style.display = "none";
    }
  }

  var WEIGHTS = [{ v: "", l: "Auto" }, { v: "300", l: "300" }, { v: "400", l: "400" },
    { v: "500", l: "500" }, { v: "600", l: "600" }, { v: "700", l: "700" }, { v: "800", l: "800" }];

  window.HexaDash.register("hexaos_list.list", {
    name: "List",
    cat: "display",
    icon: "<line x1='9' y1='5' x2='20' y2='5'/><line x1='9' y1='12' x2='20' y2='12'/><line x1='9' y1='19' x2='20' y2='19'/><circle cx='4.5' cy='5' r='1.4' fill='currentColor' stroke='none'/><circle cx='4.5' cy='12' r='1.4' fill='currentColor' stroke='none'/><circle cx='4.5' cy='19' r='1.4' fill='currentColor' stroke='none'/>",
    w: 4, h: 4, minW: 2, minH: 2, cfgOnAdd: true,

    sources: [
      { key: "items", label: "Datapoints", kind: "array", pick: "any",
        entry: { label: 1, icon: 1, color: 1, unit: 1, mode: 1, control: 1, ctlIcon: 1, onColor: 1, offColor: 1, warnAt: 1, critAt: 1, sparkMin: 1, sparkMax: 1, writeVal: 1, header: 1 } }
    ],

    opts: [
      { section: "Rows", cat: "appearance" },
      { key: "density", label: "Density", type: "select", span: 4, default: "comfortable", options: [{ v: "comfortable", l: "Comfortable" }, { v: "compact", l: "Compact" }] },
      { key: "divider", label: "Row dividers", type: "bool", span: 4, default: true },
      { key: "zebra",   label: "Zebra rows",   type: "bool", span: 4, default: false },
      { key: "offline", label: "Offline rows", type: "select", span: 6, default: "dim", options: [{ v: "show", l: "Show" }, { v: "dim", l: "Dim" }, { v: "hide", l: "Hide" }] },
      { key: "rowAction", label: "Click row toggles control", type: "bool", span: 6, default: false, help: "Click anywhere on a switch / icon / button row to toggle it." },

      { section: "Icon", cat: "appearance" },
      { key: "iconSize",  label: "Icon size (px)", type: "number", span: 6, default: 18 },
      { key: "iconColor", label: "Default icon colour", type: "color", span: 6, default: "#8b949e" },

      { section: "Name", cat: "appearance" },
      { key: "nameSize",   label: "Name size (px)", type: "number", span: 4, default: 13 },
      { key: "nameWeight", label: "Name weight", type: "select", span: 4, default: "", options: WEIGHTS },
      { key: "nameColor",  label: "Name colour", type: "color", span: 4, default: "#c9d1d9" },

      { section: "Value", cat: "appearance" },
      { key: "valSize",   label: "Value size (px)", type: "number", span: 4, default: 14 },
      { key: "valWeight", label: "Value weight", type: "select", span: 4, default: "600", options: WEIGHTS },
      { key: "valColor",  label: "Value colour", type: "color", span: 4, default: "#f0f3f6" },
      { key: "valAlign",  label: "Value align", type: "select", span: 6, default: "right", options: [{ v: "right", l: "Right" }, { v: "left", l: "Left" }] },
      { key: "valMinW",   label: "Value min width (px)", type: "number", span: 6, default: "", ph: "auto" },

      { section: "Thresholds", cat: "appearance" },
      { key: "threshTgt",  label: "Colour target", type: "select", span: 4, default: "value", options: [{ v: "value", l: "Value" }, { v: "icon", l: "Icon" }, { v: "both", l: "Both" }] },
      { key: "warnColor",  label: "Warn colour", type: "color", span: 4, default: "#d29922" },
      { key: "critColor",  label: "Critical colour", type: "color", span: 4, default: "#f85149" },

      { section: "Format" },
      { key: "decimals", label: "Decimals", type: "number", span: 4, default: "", ph: "auto", help: "Numeric values; blank = automatic. Non-numeric states show as-is." },
      { key: "showUnit",  label: "Show unit", type: "bool", span: 4, default: true },
      { key: "tintValue", label: "Tint value with row colour", type: "bool", span: 4, default: false },
      { key: "showAge",   label: "Show last-updated", type: "bool", span: 6, default: false, help: "Append the age of each value (e.g. 5s, 2m)." },
      { key: "ageColor",  label: "Last-updated colour", type: "color", span: 6, default: "#6e7681" },

      { section: "Sparkline" },
      { key: "sparkPoints", label: "Points held", type: "number", span: 4, default: 30 },
      { key: "sparkMin", label: "Min", type: "number", span: 4, default: "", ph: "auto" },
      { key: "sparkMax", label: "Max", type: "number", span: 4, default: "", ph: "auto" },
      { key: "sparkColor", label: "Colour", type: "color", span: 4, default: "", ph: "row / value" },
      { key: "sparkStyle", label: "Style", type: "select", span: 4, default: "line", options: [{ v: "line", l: "Line" }, { v: "bars", l: "Bars" }] },
      { key: "sparkFill",  label: "Fill under line", type: "bool", span: 4, default: true },

      { section: "Summary" },
      { key: "summaryOp", label: "Summary row", type: "select", span: 6, default: "", options: [{ v: "", l: "Off" }, { v: "sum", l: "Sum" }, { v: "avg", l: "Average" }, { v: "min", l: "Min" }, { v: "max", l: "Max" }, { v: "count", l: "Count" }] },
      { key: "summaryLabel", label: "Summary label", type: "text", span: 6, default: "Total", help: "Computed over numeric Value-mode rows." },

      { section: "Header" },
      { key: "showHeader", label: "Show header row", type: "bool", span: 4, default: false },
      { key: "hdrName",    label: "Name heading", type: "text", span: 4, default: "Name" },
      { key: "hdrValue",   label: "Value heading", type: "text", span: 4, default: "Value" }
    ],

    render: function (host, ctx) {
      var o = ctx.cfg || {}, items = (ctx.items ? ctx.items("items") : []) || [];
      if (o.offline === "hide") items = items.filter(function (it) { return it.mode === "header" || !(it.point && it.point.offline); });
      host.className = "dw hxl" + (o.density === "compact" ? " hxl-compact" : "") + (o.divider !== false ? " hxl-div" : "") + (o.zebra ? " hxl-zebra" : "");
      host.innerHTML = "";
      var wrap = document.createElement("div"); wrap.className = "hxl-wrap";
      var S = wrap.style;
      S.setProperty("--hxl-ico", String(num(o.iconSize, 18)));
      S.setProperty("--hxl-nm", String(num(o.nameSize, 13)));
      S.setProperty("--hxl-val", String(num(o.valSize, 14)));
      S.setProperty("--hxl-nm-color", o.nameColor || "#c9d1d9");
      S.setProperty("--hxl-nm-wt", String(isSet(o.nameWeight) ? o.nameWeight : 400));
      S.setProperty("--hxl-val-wt", String(isSet(o.valWeight) ? o.valWeight : 600));
      S.setProperty("--hxl-val-color", o.valColor || "#f0f3f6");
      S.setProperty("--hxl-age-color", o.ageColor || "#6e7681");
      S.setProperty("--hxl-val-minw", isSet(o.valMinW) ? (num(o.valMinW, 0) + "px") : "0px");
      if (o.valAlign === "left") wrap.classList.add("hxl-vleft");

      if (o.showHeader) {
        var hdr = document.createElement("div"); hdr.className = "hxl-hdr";
        var hn = document.createElement("span"); hn.className = "hxl-hdr-n"; hn.textContent = (o.hdrName != null ? o.hdrName : "Name");
        var hv = document.createElement("span"); hv.className = "hxl-hdr-v"; hv.textContent = (o.hdrValue != null ? o.hdrValue : "Value");
        hdr.appendChild(hn); hdr.appendChild(hv); wrap.appendChild(hdr);
      }
      var rowsEl = document.createElement("div"); rowsEl.className = "hxl-rows";
      host._rows = []; host._spark = host._spark || {};

      if (!items.length) {
        var em = document.createElement("div"); em.className = "hxl-empty"; em.innerHTML = "No datapoints bound.<br>Add rows in <b>Bindings</b>."; rowsEl.appendChild(em);
      } else {
        items.forEach(function (it) {
          if (it.mode === "header") {
            var sec = document.createElement("div"); sec.className = "hxl-sec"; sec.textContent = it.label || "";
            rowsEl.appendChild(sec); host._rows.push({ mode: "header" }); return;
          }
          var p = it.point, mode = it.mode || "value", baseCol = it.color || o.iconColor || "#8b949e";
          var row = document.createElement("div"); row.className = "hxl-row";
          var ico = document.createElement("span"); ico.className = "hxl-ico" + (it.icon ? "" : " hxl-ico-empty");
          if (it.icon) { ico.style.color = baseCol; ico.innerHTML = ctx.iconSvg(it.icon, "currentColor"); }
          row.appendChild(ico);
          var nm = document.createElement("span"); nm.className = "hxl-nm"; nm.textContent = (it.label || (p && p.label) || it.p || "");
          row.appendChild(nm);

          var meta = { mode: mode, slug: it.p, baseCol: baseCol, ico: ico, ctlType: null, spark: null, sparkV: null, ageEl: null };
          if (mode === "control") {
            var type = ctlType(p, it.control); meta.ctlType = type;
            var ctl = document.createElement("span"); ctl.className = "hxl-ctl hxl-ctl-" + type;
            ctl.appendChild(buildControl(type, it, p, ctx, o)); row.appendChild(ctl);
            if (o.rowAction && (type === "switch" || type === "icon" || type === "button")) {
              row.classList.add("hxl-clickable");
              row.onclick = function () { ctx.writePoint(it.p, isSet(it.writeVal) ? it.writeVal : (boolOn(p) ? 0 : 1)); };
            }
          } else if (mode === "graph") {
            var sp = document.createElement("span"); sp.className = "hxl-spark";
            var svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("class", "hxl-spark-svg"); svg.setAttribute("viewBox", "0 0 100 30"); svg.setAttribute("preserveAspectRatio", "none");
            var fill = document.createElementNS(SVGNS, "path"); fill.setAttribute("class", "hxl-spark-fill");
            var bars = document.createElementNS(SVGNS, "g"); bars.setAttribute("class", "hxl-spark-bars");
            var line = document.createElementNS(SVGNS, "path"); line.setAttribute("class", "hxl-spark-line");
            svg.appendChild(fill); svg.appendChild(bars); svg.appendChild(line); sp.appendChild(svg);
            var sv = document.createElement("span"); sv.className = "hxl-spark-v"; sp.appendChild(sv);
            row.appendChild(sp); meta.spark = { svg: svg, fill: fill, bars: bars, line: line }; meta.sparkV = sv;
            if (!host._spark[it.p]) host._spark[it.p] = [];
          } else {
            var val = document.createElement("span"); val.className = "hxl-val";
            var v = document.createElement("span"); v.className = "hxl-v"; v.textContent = "--";
            var u = document.createElement("span"); u.className = "hxl-u";
            val.appendChild(v); val.appendChild(u); row.appendChild(val);
            if (o.showAge) { var ag = document.createElement("span"); ag.className = "hxl-age"; row.appendChild(ag); meta.ageEl = ag; }
          }
          host._rows.push(meta); rowsEl.appendChild(row);
        });
      }

      host._summary = null;
      if (isSet(o.summaryOp) && items.length) {
        var sr = document.createElement("div"); sr.className = "hxl-row hxl-summary";
        sr.appendChild(document.createElement("span")).className = "hxl-ico hxl-ico-empty";
        var snm = document.createElement("span"); snm.className = "hxl-nm"; snm.textContent = o.summaryLabel != null ? o.summaryLabel : "Total"; sr.appendChild(snm);
        var sval = document.createElement("span"); sval.className = "hxl-val"; var sv2 = document.createElement("span"); sv2.className = "hxl-v"; sv2.textContent = "--"; var su = document.createElement("span"); su.className = "hxl-u"; sval.appendChild(sv2); sval.appendChild(su); sr.appendChild(sval);
        rowsEl.appendChild(sr); host._summary = { vEl: sv2, uEl: su, op: o.summaryOp };
      }
      wrap.appendChild(rowsEl); host.appendChild(wrap);
    },

    update: function (host, ctx) {
      var o = ctx.cfg || {}, items = (ctx.items ? ctx.items("items") : []) || [];
      if (o.offline === "hide") items = items.filter(function (it) { return it.mode === "header" || !(it.point && it.point.offline); });
      var rows = host.querySelectorAll(".hxl-row:not(.hxl-summary)"), meta = host._rows || [];
      var dataMeta = meta.filter(function (m) { return m.mode !== "header"; });
      var dataItems = items.filter(function (it) { return it.mode !== "header"; });
      var n = Math.min(rows.length, dataItems.length, dataMeta.length), i, sumVals = [];
      for (i = 0; i < n; i++) {
        var row = rows[i], it = dataItems[i], p = it.point, m = dataMeta[i];
        var tc = threshColor(p ? p.value : null, it, o);
        if (m.mode === "control") {
          syncControl(m.ctlType, row.querySelector(".hxl-ctl"), p);
        } else if (m.mode === "graph") {
          drawSpark(host, m.slug, m, p, o, it);
          if (m.sparkV) m.sparkV.style.color = (tc && (o.threshTgt === "value" || o.threshTgt === "both")) ? tc : ((o.tintValue && it.color) ? it.color : (o.valColor || "#f0f3f6"));
        } else {
          var vEl = row.querySelector(".hxl-v"), uEl = row.querySelector(".hxl-u"), wrap = row.querySelector(".hxl-val");
          if (vEl) vEl.textContent = p ? fmtVal(p.value, o.decimals) : "--";
          if (uEl) uEl.textContent = (p && o.showUnit !== false) ? (it.unit || p.unit || "") : "";
          var vc = tc && (o.threshTgt === "value" || o.threshTgt === "both") ? tc : ((o.tintValue && it.color) ? it.color : (o.valColor || "#f0f3f6"));
          if (wrap) wrap.style.color = vc;
          if (m.ageEl) m.ageEl.textContent = ageText(p);
          var nval = p ? parseFloat(p.value) : NaN; if (isFinite(nval)) sumVals.push(nval);
        }
        if (m.ico && it.icon) m.ico.style.color = (tc && (o.threshTgt === "icon" || o.threshTgt === "both")) ? tc : m.baseCol;
        row.classList.toggle("hxl-stale", !!(p && (p.offline || p.stale)));
      }
      if (host._summary) {
        var s = host._summary, r, op = s.op;
        if (!sumVals.length) r = NaN;
        else if (op === "sum") r = sumVals.reduce(function (a, b) { return a + b; }, 0);
        else if (op === "avg") r = sumVals.reduce(function (a, b) { return a + b; }, 0) / sumVals.length;
        else if (op === "min") r = Math.min.apply(null, sumVals);
        else if (op === "max") r = Math.max.apply(null, sumVals);
        else if (op === "count") r = sumVals.length;
        s.vEl.textContent = isFinite(r) ? (op === "count" ? String(r) : fmtVal(r, o.decimals)) : "--";
        s.uEl.textContent = (op !== "count" && o.showUnit !== false && dataItems[0]) ? (dataItems[0].unit || (dataItems[0].point && dataItems[0].point.unit) || "") : "";
      }
    },

    destroy: function (host) { host._spark = null; host._rows = null; host._summary = null; }
  });
})();
