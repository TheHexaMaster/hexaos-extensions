/* hexaos_powerflow — HexaOS Dashboard Widget: animated energy power-flow diagram.
 *
 * Hub-and-spoke layout: a central inverter with four corner nodes — Solar
 * (top-left), Battery (top-right), Grid (bottom-left), Home (bottom-right). Each
 * node connects to the inverter by an orthogonal line carrying a stream of balls;
 * the balls' DIRECTION, speed and count follow that node's MAIN value (sign =
 * direction, magnitude = speed/count). The battery node carries a state-of-charge
 * arc (0% at the box's left edge, filling counter-clockwise around the bottom to
 * 100% at the right edge) with a 3-stage colour threshold.
 *
 * Each node binds a MAIN datapoint + an optional SECONDARY (info) datapoint; the
 * battery also binds a SOC datapoint. The main value's INPUT unit (W or kW) is a
 * dropdown — display auto-switches at 1000 W (W -> 0 dp, kW -> 2 dp). The secondary
 * value shows the datapoint's own HxLive unit with a configurable decimal count.
 *
 * Icons are the packaged SVG illustrations (assets/*.svg) via HexaDash.asset();
 * the ball stream runs on a requestAnimationFrame loop. Touch only host + ctx.
 */
(function () {
  if (!window.HexaDash || !window.HexaDash.register) return;
  var SLUG = "hexaos_powerflow";
  function asset(f) { return window.HexaDash.asset ? window.HexaDash.asset(SLUG, "assets/" + f) : ("assets/" + f); }

  /* ---- geometry (squarer viewBox; nodes pulled in toward the inverter) ---- */
  var VW = 740, VH = 600, R = 82, MAXB = 8;
  var POS = { solar: [130, 115], batt: [610, 115], grid: [130, 485], home: [610, 485] };
  var INV = { cx: 370, cy: 300, sz: 246 };
  /* connector polylines, node -> inverter port */
  var PATH = {
    solar: [[130, 197], [130, 300], [308, 300]],
    batt:  [[610, 197], [610, 300], [432, 300]],
    grid:  [[212, 485], [337, 485], [337, 374]],
    home:  [[528, 485], [403, 485], [403, 374]]
  };
  var NODES = [
    { k: "solar", name: "Solar",   color: "#f2c014", icon: "solar.svg",   toInv: true  },
    { k: "batt",  name: "Battery", color: "#36c75f", icon: "battery.svg", toInv: true  },
    { k: "grid",  name: "Grid",    color: "#f0463a", icon: "grid.svg",    toInv: true  },
    { k: "home",  name: "Home",    color: "#8b5cf6", icon: "home.svg",    toInv: false }
  ];
  /* icon sits in the upper part of the disc; values go BELOW it (no overlap).
     per-node size/offset so the icons' visible bottoms line up (the SVGs fill
     their viewBoxes differently). */
  var MAIN_DY = 34, SEC_DY = 58, TITLE_DY = -(R + 16);
  var ICON = { solar: { sz: 92, dy: -30 }, batt: { sz: 108, dy: -26 }, grid: { sz: 108, dy: -27 }, home: { sz: 110, dy: -32 } };
  /* SOC arc: ring radius (>= 2px clear of the primary ring) + top-gap half-angle */
  var RSOC = R + 12, SOC_STROKE = 7, SOC_G = 22;

  function socArcPath(cx, cy, r, g) {
    var aL = (90 + g) * Math.PI / 180, aR = (90 - g) * Math.PI / 180;
    var p0x = cx + r * Math.cos(aL), p0y = cy - r * Math.sin(aL);
    var p1x = cx + r * Math.cos(aR), p1y = cy - r * Math.sin(aR);
    /* large-arc=1, sweep=0 => the long way round the BOTTOM (counter-clockwise on screen) */
    return "M" + p0x.toFixed(2) + "," + p0y.toFixed(2) + "A" + r + " " + r + " 0 1 0 " + p1x.toFixed(2) + "," + p1y.toFixed(2);
  }

  /* ---- options (built per node) ---- */
  function nodeOpts(n) {
    var p = n.name + " · ", k = n.k;
    var o = [
      { key: k + "_main",     label: p + "main value",      type: "point",  pick: "number", col: 1, default: "" },
      { key: k + "_mainIn",   label: p + "main input unit", type: "select", col: 3, default: "W", options: [{ v: "W", l: "W (auto kW ≥1000)" }, { v: "kW", l: "kW" }] },
      { key: k + "_sec",      label: p + "secondary value", type: "point",  pick: "number", col: 1, default: "" },
      { key: k + "_secDec",   label: p + "sec decimals",    type: "number", col: 3, default: 1 },
      { key: k + "_color",    label: p + "colour",          type: "color",  default: n.color },
      { key: k + "_invert",   label: p + "invert flow",     type: "bool",   col: 3, default: false },
      { key: k + "_titleShow",label: p + "show title",      type: "bool",   col: 3, default: false },
      { key: k + "_title",    label: p + "title text",      type: "text",   col: 2, default: n.name },
      { key: k + "_lnColor",  label: p + "line colour",     type: "color",  default: "" },
      { key: k + "_lnWidth",  label: p + "line width",      type: "number", col: 3, default: 3 },
      { key: k + "_lnType",   label: p + "line type",       type: "select", col: 3, default: "dash", options: [{ v: "dash", l: "Dashed" }, { v: "solid", l: "Solid" }] },
      { key: k + "_lnDash",   label: p + "dash on,off",     type: "text",   col: 3, default: "10,9" },
      { key: k + "_lnOpacity",label: p + "line opacity %",  type: "number", col: 3, default: 70 },
      { key: k + "_ballColor",label: p + "ball colour",     type: "color",  default: "" },
      { key: k + "_ballCount",label: p + "ball count",      type: "number", col: 3, default: 3 },
      { key: k + "_ballSize", label: p + "ball size",       type: "number", col: 3, default: 9 },
      { key: k + "_speedRef", label: p + "full speed at W", type: "number", col: 3, default: 2000 }
    ];
    if (k === "batt") o = o.concat([
      { key: "batt_soc",         label: "Battery · SOC value (%)", type: "point",  pick: "number", col: 1, default: "" },
      { key: "batt_socShow",     label: "Battery · show SOC arc",  type: "bool",   col: 3, default: true },
      { key: "batt_socCritPct",  label: "SOC critical ≤ %",   type: "number", col: 3, default: 15 },
      { key: "batt_socCritColor",label: "SOC critical colour",     type: "color",  col: 3, default: "#f85149" },
      { key: "batt_socWarnPct",  label: "SOC warning ≤ %",    type: "number", col: 3, default: 35 },
      { key: "batt_socWarnColor",label: "SOC warning colour",      type: "color",  col: 3, default: "#d29922" },
      { key: "batt_socNormColor",label: "SOC normal colour",       type: "color",  col: 3, default: "#3fb950" }
    ]);
    return o;
  }
  var OPTS = [];
  NODES.forEach(function (n) { OPTS = OPTS.concat(nodeOpts(n)); });
  OPTS = OPTS.concat([
    { key: "hideBelow",   label: "Hide flow below W", type: "number", col: 3, default: 5 },
    { key: "titleColor",  label: "Title colour",      type: "color",  col: 3, default: "#9aa4af" },
    { key: "titleOffset", label: "Title offset",      type: "number", col: 3, default: 0 }
  ]);

  /* ---- helpers ---- */
  function num(ctx, slug) { if (!slug || !ctx.resolve) return null; var pt = ctx.resolve(slug); if (!pt) return null; var v = parseFloat(pt.value); return isFinite(v) ? v : null; }
  /* main: input W or kW -> normalise to watts, then show W (0 dp) / kW (2 dp) at 1000W */
  function toWatts(v, inUnit) { if (v == null || !isFinite(v)) return null; return (inUnit === "kW") ? v * 1000 : v; }
  function fmtMain(watts) {
    if (watts == null) return "-- W";
    if (Math.abs(watts) >= 1000) return (watts / 1000).toFixed(2) + " kW";
    return Math.round(watts) + " W";
  }
  function fmtSec(v, dec, unit) {
    var d = (dec != null && dec !== "") ? Number(dec) : 1;
    if (v == null || !isFinite(v)) return "-- " + (unit || "");
    return v.toFixed(d) + (unit ? " " + unit : "");
  }
  function polyPrep(pts) { var s = [], t = 0, i; for (i = 1; i < pts.length; i++) { var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], l = Math.sqrt(dx * dx + dy * dy); s.push(l); t += l; } return { pts: pts, segs: s, tot: t || 1 }; }
  function polyPos(P, t) { var d = t * P.tot, i = 0; while (i < P.segs.length && d > P.segs[i]) { d -= P.segs[i]; i++; } if (i >= P.segs.length) i = P.segs.length - 1; var a = P.pts[i], b = P.pts[i + 1], l = P.segs[i] || 1, f = d / l; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
  function ptsStr(pts) { return pts.map(function (p) { return p[0] + "," + p[1]; }).join(" "); }

  window.HexaDash.register("hexaos_powerflow.powerflow", {
    name: "Power Flow",
    cat: "diagram",
    icon: "<rect x='3' y='3' width='12' height='12' rx='2.5'/><circle cx='6' cy='6' r='1.15' fill='currentColor' stroke='none'/><circle cx='12' cy='6' r='1.15' fill='currentColor' stroke='none'/><circle cx='6' cy='12' r='1.15' fill='currentColor' stroke='none'/><circle cx='12' cy='12' r='1.15' fill='currentColor' stroke='none'/>",
    w: 5, h: 5, minW: 4, minH: 3, needsBind: false, writable: false, cfgOnAdd: true,
    opts: OPTS,

    render: function (host, ctx) {
      if (host._pf && host._pf.raf) { cancelAnimationFrame(host._pf.raf); host._pf = null; }
      var s = "<svg class='hxpf-svg' viewBox='0 0 " + VW + " " + VH + "'>";

      NODES.forEach(function (n) { s += "<polyline class='hxpf-line' data-k='" + n.k + "' points='" + ptsStr(PATH[n.k]) + "'/>"; });

      s += "<g class='hxpf-balls'>";
      NODES.forEach(function (n) { for (var i = 0; i < MAXB; i++) s += "<circle class='hxpf-ball' data-k='" + n.k + "' r='0'/>"; });
      s += "</g>";

      s += "<image class='hxpf-inv' href='" + asset("inverter.svg") + "' x='" + (INV.cx - INV.sz / 2) + "' y='" + (INV.cy - INV.sz / 2) + "' width='" + INV.sz + "' height='" + INV.sz + "'/>";

      NODES.forEach(function (n) {
        var c = POS[n.k], x = c[0], y = c[1];
        s += "<g class='hxpf-node' data-k='" + n.k + "'>";
        if (n.k === "batt") {
          var d = socArcPath(x, y, RSOC, SOC_G), fw = 72, fh = 27, fy = y - RSOC - 2;
          s += "<path class='hxpf-soc-track' d='" + d + "' pathLength='100'/>";
          s += "<path class='hxpf-soc-arc' d='" + d + "' pathLength='100'/>";
          s += "<rect class='hxpf-soc-frame' x='" + (x - fw / 2) + "' y='" + (fy - fh / 2) + "' width='" + fw + "' height='" + fh + "' rx='" + (fh / 2) + "'/>";
          s += "<text class='hxpf-soc-lbl' x='" + x + "' y='" + fy + "'>--</text>";
        }
        var ic = ICON[n.k];
        s += "<image class='hxpf-ico' href='" + asset(n.icon) + "' x='" + (x - ic.sz / 2) + "' y='" + (y + ic.dy - ic.sz / 2) + "' width='" + ic.sz + "' height='" + ic.sz + "'/>";
        s += "<circle class='hxpf-ring' data-k='" + n.k + "' cx='" + x + "' cy='" + y + "' r='" + R + "'/>";
        s += "<text class='hxpf-main' data-k='" + n.k + "' x='" + x + "' y='" + (y + MAIN_DY) + "'>--</text>";
        s += "<text class='hxpf-sec' data-k='" + n.k + "' x='" + x + "' y='" + (y + SEC_DY) + "'></text>";
        s += "<text class='hxpf-title' data-k='" + n.k + "' x='" + x + "' y='" + (y + TITLE_DY) + "'></text>";
        s += "</g>";
      });
      s += "</svg>";
      host.innerHTML = "<div class='dw-name'></div><div class='hxpf-stage'>" + s + "</div>";

      var pf = host._pf = { nodes: {}, raf: 0, last: 0 };
      NODES.forEach(function (n) {
        var balls = host.querySelectorAll(".hxpf-ball[data-k='" + n.k + "']"), phases = [], i;
        for (i = 0; i < balls.length; i++) phases.push(i / MAXB);
        pf.nodes[n.k] = { P: polyPrep(PATH[n.k]), balls: balls, phases: phases, active: false, rev: false, count: 0, size: 9, color: "#888", speed: 0.3 };
      });
      var loop = function (now) {
        if (host._pf !== pf) return;
        var dt = pf.last ? Math.min(0.05, (now - pf.last) / 1000) : 0; pf.last = now;
        NODES.forEach(function (n) {
          var st = pf.nodes[n.k], bs = st.balls, i;
          for (i = 0; i < bs.length; i++) {
            if (!st.active || i >= st.count) { if (bs[i].style.display !== "none") bs[i].style.display = "none"; continue; }
            st.phases[i] += st.speed * dt; if (st.phases[i] >= 1) st.phases[i] -= 1;
            var t = st.rev ? (1 - st.phases[i]) : st.phases[i], pos = polyPos(st.P, t);
            var fade = Math.min(t / 0.12, (1 - t) / 0.12); if (fade > 1) fade = 1; if (fade < 0) fade = 0;
            bs[i].setAttribute("cx", pos[0].toFixed(1)); bs[i].setAttribute("cy", pos[1].toFixed(1));
            bs[i].setAttribute("r", st.size); bs[i].setAttribute("fill", st.color);
            bs[i].style.opacity = fade.toFixed(2); bs[i].style.display = "";
          }
        });
        pf.raf = requestAnimationFrame(loop);
      };
      pf.raf = requestAnimationFrame(loop);
    },

    update: function (host, ctx) {
      var o = ctx.cfg || {}, pf = host._pf;
      var nm = host.querySelector(".dw-name"); if (nm) { nm.textContent = ctx.title(); nm.style.display = ctx.title() ? "" : "none"; }
      var hide = (o.hideBelow != null && o.hideBelow !== "") ? Number(o.hideBelow) : 5;
      var qg = function (sel) { return host.querySelector(sel); };

      NODES.forEach(function (n) {
        var k = n.k, col = o[k + "_color"] || n.color;
        var mainWatts = toWatts(num(ctx, o[k + "_main"]), o[k + "_mainIn"] || "W");
        var secPt = (o[k + "_sec"] && ctx.resolve) ? ctx.resolve(o[k + "_sec"]) : null;
        var secV = secPt ? parseFloat(secPt.value) : null;

        var ring = qg(".hxpf-ring[data-k='" + k + "']"); if (ring) ring.style.stroke = col;
        var mt = qg(".hxpf-main[data-k='" + k + "']"); if (mt) { mt.textContent = fmtMain(mainWatts); mt.style.fill = col; }
        var se = qg(".hxpf-sec[data-k='" + k + "']");
        if (se) { se.style.display = o[k + "_sec"] ? "" : "none"; se.textContent = o[k + "_sec"] ? fmtSec(secV, o[k + "_secDec"], secPt ? (secPt.unit || "") : "") : ""; se.style.fill = col; }

        var tt = qg(".hxpf-title[data-k='" + k + "']");
        if (tt) {
          tt.style.display = o[k + "_titleShow"] ? "" : "none";
          tt.textContent = (o[k + "_title"] != null ? o[k + "_title"] : n.name);
          tt.style.fill = o.titleColor || "#9aa4af";
          tt.setAttribute("y", (POS[k][1] + TITLE_DY - (Number(o.titleOffset) || 0)));
        }

        var ln = qg(".hxpf-line[data-k='" + k + "']");
        if (ln) {
          ln.style.stroke = o[k + "_lnColor"] || col;
          ln.style.strokeWidth = (o[k + "_lnWidth"] != null && o[k + "_lnWidth"] !== "") ? o[k + "_lnWidth"] : 3;
          ln.style.opacity = ((o[k + "_lnOpacity"] != null && o[k + "_lnOpacity"] !== "") ? Number(o[k + "_lnOpacity"]) : 70) / 100;
          ln.style.strokeDasharray = (o[k + "_lnType"] === "solid") ? "none" : ((o[k + "_lnDash"] || "10,9").replace(/;/g, ","));
        }

        if (pf) {
          var st = pf.nodes[k];
          var ref = Math.max(1, Number(o[k + "_speedRef"]) || 2000);
          var mag = Math.abs(mainWatts || 0), norm = Math.max(0, Math.min(1, mag / ref));
          var dirPos = (n.toInv ? 1 : -1) * (o[k + "_invert"] ? -1 : 1) * ((mainWatts || 0) >= 0 ? 1 : -1);
          st.active = mainWatts != null && mag > hide;
          st.rev = dirPos < 0;
          var maxc = Math.max(1, Math.min(MAXB, Number(o[k + "_ballCount"]) || 3));
          st.count = st.active ? Math.max(1, Math.round(maxc * (0.35 + 0.65 * norm))) : 0;
          st.size = (o[k + "_ballSize"] != null && o[k + "_ballSize"] !== "") ? Number(o[k + "_ballSize"]) : 9;
          st.color = o[k + "_ballColor"] || o[k + "_lnColor"] || col;
          st.speed = 0.18 + 0.55 * norm;
        }
      });

      /* battery SOC arc: 0% left edge -> counter-clockwise round the bottom -> 100% right edge */
      var soc = num(ctx, o.batt_soc);
      var track = qg(".hxpf-soc-track"), arc = qg(".hxpf-soc-arc"), frame = qg(".hxpf-soc-frame"), lbl = qg(".hxpf-soc-lbl");
      var showSoc = (o.batt_socShow !== false) && (o.batt_soc);
      [track, arc, frame, lbl].forEach(function (el) { if (el) el.style.display = showSoc ? "" : "none"; });
      if (showSoc && arc) {
        var sv = (soc != null) ? Math.max(0, Math.min(100, soc)) : 0;
        arc.style.strokeDasharray = sv.toFixed(1) + " 100";   /* pathLength=100 -> reveal soc% from the start (left edge) */
        var cp = (o.batt_socCritPct != null && o.batt_socCritPct !== "") ? Number(o.batt_socCritPct) : 15;
        var wp = (o.batt_socWarnPct != null && o.batt_socWarnPct !== "") ? Number(o.batt_socWarnPct) : 35;
        arc.style.stroke = (sv <= cp) ? (o.batt_socCritColor || "#f85149") : (sv <= wp ? (o.batt_socWarnColor || "#d29922") : (o.batt_socNormColor || "#3fb950"));
        if (lbl) lbl.textContent = (soc != null) ? (Math.round(sv) + "%") : "--";
      }
    },

    destroy: function (host) { if (host._pf && host._pf.raf) cancelAnimationFrame(host._pf.raf); host._pf = null; }
  });
})();
