/* hexaos_powerflow — HexaOS Dashboard Widget: animated energy power-flow diagram.
 *
 * Square layout (2x2):  Solar = top-left, Battery = top-right,
 *                       Grid  = bottom-left, House = bottom-right.
 * Energy flows are drawn as a stream of glowing balls gliding from source to
 * sink along the connecting lines; the more power on a link, the bigger AND the
 * faster its balls. The battery node carries a circular state-of-charge ring.
 * Inspired by the Home Assistant "power-flow-card-plus" card.
 *
 * MULTI-POINT: binds a signed power datapoint PER NODE via `point`-type opts and
 * reads them with `ctx.resolve(slug)`. Sign convention (each invertible):
 *   Grid    + = import (grid -> home),     - = export (home -> grid)
 *   Battery + = discharge (battery -> home), - = charge (-> battery)
 *   Solar   = production (always out)
 * Home is taken from its own point, or auto-computed from the energy balance
 * (solar + grid_import + batt_discharge - grid_export - batt_charge) when unbound.
 *
 * The ball stream runs on a requestAnimationFrame loop (started in render, stopped
 * in destroy); update() only refreshes the data it reads. Classes are .hxpf-*.
 */
(function () {
  if (!window.HexaDash || !window.HexaDash.register) return;

  /* node centres (square corners) in the fixed 0..100 SVG viewBox */
  var POS = { solar: [27, 27], batt: [73, 27], grid: [27, 73], home: [73, 73] };
  var NR = 14;     /* node radius */
  var RIM = 15.6;  /* link endpoints sit this far from a node centre (just past the rim) */
  var BPL = 3;     /* balls per link */

  /* directed flows: key, from-node, to-node, source letter (ball colour) */
  var FLOWS = [
    { k: "s2b", a: "solar", b: "batt", src: "s" }, /* solar -> battery (charge)  */
    { k: "s2g", a: "solar", b: "grid", src: "s" }, /* solar -> grid (export)     */
    { k: "s2h", a: "solar", b: "home", src: "s" }, /* solar -> home (diagonal)   */
    { k: "b2h", a: "batt",  b: "home", src: "b" }, /* battery -> home            */
    { k: "g2h", a: "grid",  b: "home", src: "g" }, /* grid -> home               */
    { k: "g2b", a: "grid",  b: "batt", src: "g" }, /* grid -> battery (diagonal) */
    { k: "b2g", a: "batt",  b: "grid", src: "b" }  /* battery -> grid (diagonal) */
  ];
  /* undirected base lines (4 sides + 2 diagonals of the square) */
  var BASES = [["solar","batt"],["solar","grid"],["batt","home"],["grid","home"],["solar","home"],["grid","batt"]];
  var NODES = ["solar", "grid", "home", "batt"];

  /* node glyphs around their local origin (~ +-5 units); stroke = node colour */
  var ICON = {
    solar: "<circle r='2.5'/><path d='M0,-5.2V-3.5M0,5.2V3.5M-5.2,0H-3.5M5.2,0H3.5M-3.7,-3.7L-2.5,-2.5M3.7,3.7L2.5,2.5M-3.7,3.7L-2.5,2.5M3.7,-3.7L2.5,-2.5'/>",
    grid:  "<path d='M-3.7,4.8L-1.3,-4.6M3.7,4.8L1.3,-4.6M-1.6,-4.6H1.6M-2.2,-0.5H2.2M-3,2.2H3M-1.3,-4.6L1.3,-2M1.3,-4.6L-1.3,-2'/>",
    home:  "<path d='M-4.4,0.2L0,-4.4L4.4,0.2M-3.1,-1.1V4.4H3.1V-1.1M-1.1,4.4V1.7H1.1V4.4'/>",
    batt:  "<rect x='-4.4' y='-2.7' width='7.4' height='5.4' rx='1.1'/><rect x='3.2' y='-1.2' width='1.4' height='2.4' rx='.4'/><path d='M.6,-1.5L-1.1,.4H1.1L-.6,1.9' stroke-width='1.1'/>"
  };

  function num(ctx, slug) {
    if (!slug || !ctx.resolve) return null;
    var p = ctx.resolve(slug);
    if (!p) return null;
    var v = parseFloat(p.value);
    return isFinite(v) ? v : null;
  }

  window.HexaDash.register("hexaos_powerflow.powerflow", {
    name: "Power Flow",
    cat: "chart",
    /* bare SVG inner string (picker wraps it in <svg stroke=currentColor>):
       a square with a node dot in each corner. */
    icon: "<rect x='3' y='3' width='12' height='12' rx='2.5'/><circle cx='6' cy='6' r='1.15' fill='currentColor' stroke='none'/><circle cx='12' cy='6' r='1.15' fill='currentColor' stroke='none'/><circle cx='6' cy='12' r='1.15' fill='currentColor' stroke='none'/><circle cx='12' cy='12' r='1.15' fill='currentColor' stroke='none'/>",
    w: 5, h: 5, minW: 4, minH: 4,
    needsBind: false,
    writable: false,
    cfgOnAdd: true,
    opts: [
      { key: "solarP", label: "Solar power (W)",                type: "point", pick: "number", col: 1, default: "" },
      { key: "gridP",  label: "Grid power (W, + import)",       type: "point", pick: "number", col: 1, default: "" },
      { key: "battP",  label: "Battery power (W, + discharge)", type: "point", pick: "number", col: 1, default: "" },
      { key: "homeP",  label: "Home power (W, optional)",       type: "point", pick: "number", col: 1, default: "" },
      { key: "socP",   label: "Battery charge (%, optional)",   type: "point", pick: "number", col: 1, default: "" },

      { key: "solarInv",   label: "Invert solar sign",   type: "bool", default: false },
      { key: "gridInv",    label: "Invert grid sign",    type: "bool", default: false },
      { key: "battInv",    label: "Invert battery sign", type: "bool", default: false },
      { key: "showLabels", label: "Show labels",         type: "bool", default: true },

      { key: "lblSolar", label: "Solar label",   type: "text", col: 2, default: "Solar" },
      { key: "lblGrid",  label: "Grid label",    type: "text", col: 2, default: "Grid" },
      { key: "lblBatt",  label: "Battery label", type: "text", col: 2, default: "Battery" },
      { key: "lblHome",  label: "Home label",    type: "text", col: 2, default: "Home" },

      { key: "colSolar", label: "Solar colour",   type: "color", default: "#f5a623" },
      { key: "colGrid",  label: "Grid colour",    type: "color", default: "#5b9bd5" },
      { key: "colBatt",  label: "Battery colour", type: "color", default: "#3fb950" },
      { key: "colHome",  label: "Home colour",    type: "color", default: "#9aa4af" },

      { key: "flowColor", label: "Ball colour", type: "select", default: "source",
        options: [{ v: "source", l: "By source" }, { v: "fixed", l: "Fixed" }] },
      { key: "flowFixed", label: "Fixed ball colour", type: "color", default: "#58a6ff" },

      { key: "kiloThr",    label: "kW threshold (W)",  type: "number", col: 3, default: 1000 },
      { key: "decimals",   label: "kW decimals",       type: "number", col: 3, default: 1 },
      { key: "threshold",  label: "Hide flow < (W)",   type: "number", col: 3, default: 10 },
      { key: "flowRef",    label: "Full power at (W)", type: "number", col: 3, default: 2000 },
      { key: "ballScale",  label: "Ball size",         type: "number", col: 3, default: 1 },
      { key: "speedScale", label: "Flow speed",        type: "number", col: 3, default: 1 }
    ],

    render: function (host, ctx) {
      if (host._pf && host._pf.raf) { cancelAnimationFrame(host._pf.raf); host._pf = null; }
      var uid = (ctx && ctx.w && ctx.w.id) || "x";

      /* trimmed straight segment between two node centres */
      var seg = function (a, b) {
        var A = POS[a], B = POS[b], dx = B[0] - A[0], dy = B[1] - A[1];
        var L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L;
        return { x0: A[0] + ux * RIM, y0: A[1] + uy * RIM, x1: B[0] - ux * RIM, y1: B[1] - uy * RIM };
      };
      var geo = {};
      FLOWS.forEach(function (f) { geo[f.k] = seg(f.a, f.b); });

      var s = "<svg class='hxpf-svg' viewBox='0 0 100 100'>";
      s += "<defs>" +
        "<radialGradient id='hxpf-nbg-" + uid + "' cx='50%' cy='34%' r='78%'>" +
          "<stop offset='0%' stop-color='#2b313b'/><stop offset='58%' stop-color='#191c22'/><stop offset='100%' stop-color='#0f1115'/>" +
        "</radialGradient>" +
        "<filter id='hxpf-glow-" + uid + "' x='-70%' y='-70%' width='240%' height='240%'>" +
          "<feGaussianBlur stdDeviation='1.25' result='b'/>" +
          "<feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge>" +
        "</filter></defs>";

      BASES.forEach(function (p) { var g = seg(p[0], p[1]);
        s += "<line class='hxpf-base' x1='" + g.x0.toFixed(2) + "' y1='" + g.y0.toFixed(2) + "' x2='" + g.x1.toFixed(2) + "' y2='" + g.y1.toFixed(2) + "'/>"; });

      s += "<g class='hxpf-balls' filter='url(#hxpf-glow-" + uid + ")'>";
      FLOWS.forEach(function (f) { for (var i = 0; i < BPL; i++) s += "<circle class='hxpf-ball' data-fk='" + f.k + "' r='0'/>"; });
      s += "</g>";

      NODES.forEach(function (k) {
        var top = (k === "solar" || k === "batt"), lblY = top ? -(NR + 4.5) : (NR + 5.5);
        s += "<g class='hxpf-node' data-k='" + k + "' transform='translate(" + POS[k][0] + "," + POS[k][1] + ")'>";
        if (k === "batt") {
          s += "<circle class='hxpf-soc-track' r='" + (NR + 3.8) + "' pathLength='100'/>";
          s += "<circle class='hxpf-soc-arc' r='" + (NR + 3.8) + "' pathLength='100' transform='rotate(-90)'/>";
        }
        s += "<circle class='hxpf-bg' r='" + NR + "' fill='url(#hxpf-nbg-" + uid + ")'/>";
        s += "<g class='hxpf-ico' transform='translate(0,-4.6) scale(.9)'>" + ICON[k] + "</g>";
        s += "<text class='hxpf-val' y='6.8'>--</text>";
        s += "<text class='hxpf-lbl' y='" + lblY + "'></text>";
        s += "</g>";
      });
      s += "</svg>";
      host.innerHTML = "<div class='dw-name'></div><div class='hxpf-stage'>" + s + "</div>";

      /* cache balls + start the animation loop */
      var balls = [], perFk = {};
      Array.prototype.forEach.call(host.querySelectorAll(".hxpf-ball"), function (el) {
        var fk = el.getAttribute("data-fk"), n = perFk[fk] || 0; perFk[fk] = n + 1;
        balls.push({ el: el, fk: fk, phase: n / BPL });
      });
      var pf = host._pf = { balls: balls, geo: geo, flows: {}, norm: {}, params: null, last: 0 };
      var loop = function (now) {
        if (host._pf !== pf) return;                       /* superseded by a remount */
        var dt = pf.last ? Math.min(0.05, (now - pf.last) / 1000) : 0; pf.last = now;
        var P = pf.params;
        if (P) {
          for (var i = 0; i < balls.length; i++) {
            var bl = balls[i], val = pf.flows[bl.fk] || 0;
            if (!(val > P.hide)) { if (bl.el.style.display !== "none") bl.el.style.display = "none"; continue; }
            var nz = pf.norm[bl.fk] || 0;
            bl.phase += (P.sMin + (P.sMax - P.sMin) * nz) * dt;
            if (bl.phase >= 1) bl.phase -= 1;
            var g = pf.geo[bl.fk], t = bl.phase;
            var fade = Math.min(t / P.fade, (1 - t) / P.fade); if (fade > 1) fade = 1; if (fade < 0) fade = 0;
            bl.el.setAttribute("cx", (g.x0 + (g.x1 - g.x0) * t).toFixed(2));
            bl.el.setAttribute("cy", (g.y0 + (g.y1 - g.y0) * t).toFixed(2));
            bl.el.setAttribute("r", (P.rMin + (P.rMax - P.rMin) * nz).toFixed(2));
            bl.el.style.opacity = fade.toFixed(2);
            if (bl.el.style.display === "none") bl.el.style.display = "";
          }
        }
        pf.raf = requestAnimationFrame(loop);
      };
      pf.raf = requestAnimationFrame(loop);
    },

    update: function (host, ctx) {
      var o = ctx.cfg || {};
      var nm = host.querySelector(".dw-name");
      if (nm) { nm.textContent = ctx.title(); nm.style.display = ctx.title() ? "" : "none"; }

      var sgn = function (slug, inv) { var v = num(ctx, slug); return v == null ? null : (inv ? -v : v); };
      var solar = sgn(o.solarP, o.solarInv);
      var grid  = sgn(o.gridP,  o.gridInv);
      var batt  = sgn(o.battP,  o.battInv);
      var homeR = num(ctx, o.homeP);
      var soc   = num(ctx, o.socP);

      var S  = Math.max(0, solar || 0);
      var Gi = Math.max(0, grid || 0), Ge = Math.max(0, -(grid || 0));
      var Bd = Math.max(0, batt || 0), Bc = Math.max(0, -(batt || 0));
      var H  = (homeR != null) ? Math.max(0, homeR) : Math.max(0, S + Gi + Bd - Ge - Bc);

      /* distribution — solar serves home first, then battery, then grid;
         home is drawn from solar, then battery, then grid. */
      var s2h = Math.min(S, H),  S1 = S - s2h;
      var s2b = Math.min(S1, Bc), S2 = S1 - s2b;
      var s2g = Math.min(S2, Ge);
      var H1 = H - s2h, b2h = Math.min(Bd, H1), H2 = H1 - b2h;
      var g2h = Math.max(0, H2);
      var g2b = Math.max(0, Bc - s2b);                                  /* charge not from solar -> from grid     */
      var b2g = Math.min(Math.max(0, Bd - b2h), Math.max(0, Ge - s2g)); /* export beyond solar -> battery surplus */
      var F = { s2b: s2b, s2g: s2g, s2h: s2h, b2h: b2h, g2h: g2h, g2b: g2b, b2g: b2g };

      var ref = Math.max(1, Number(o.flowRef) || 2000);
      if (host._pf) {
        var N = {}; for (var fk in F) N[fk] = Math.max(0, Math.min(1, F[fk] / ref));
        var bs = (o.ballScale  != null && o.ballScale  !== "") ? Number(o.ballScale)  : 1; if (!(bs > 0)) bs = 1;
        var ss = (o.speedScale != null && o.speedScale !== "") ? Number(o.speedScale) : 1; if (!(ss > 0)) ss = 1;
        var hide = (o.threshold != null && o.threshold !== "") ? Number(o.threshold) : 10;
        host._pf.flows = F; host._pf.norm = N;
        host._pf.params = { hide: hide, sMin: 0.12 * ss, sMax: 0.6 * ss, rMin: 1.5 * bs, rMax: 3.1 * bs, fade: 0.16 };
      }

      var fixed = (o.flowColor || "source") === "fixed";
      var thr = (o.kiloThr != null && o.kiloThr !== "") ? Number(o.kiloThr) : 1000;
      var dec = (o.decimals != null && o.decimals !== "") ? Number(o.decimals) : 1;
      var fmt = function (w) {
        if (w == null || !isFinite(w)) return "--";
        if (Math.abs(w) >= thr) return (w / 1000).toFixed(dec) + " kW";
        return Math.round(w) + " W";
      };
      var COL = { solar: o.colSolar || "#f5a623", grid: o.colGrid || "#5b9bd5",
                  batt: o.colBatt || "#3fb950", home: o.colHome || "#9aa4af" };

      /* ball colours */
      var SRC = { s: COL.solar, g: COL.grid, b: COL.batt };
      if (host._pf) host._pf.balls.forEach(function (b) {
        b.el.setAttribute("fill", fixed ? (o.flowFixed || "#58a6ff") : SRC[b.fk.charAt(0)]);
      });

      var setN = function (k, val, lbl) {
        var g = host.querySelector(".hxpf-node[data-k='" + k + "']"); if (!g) return;
        var c = COL[k];
        var bg = g.querySelector(".hxpf-bg");  if (bg) { bg.style.stroke = c; bg.style.filter = "drop-shadow(0 0 1.6px " + c + ")"; }
        var ic = g.querySelector(".hxpf-ico"); if (ic) ic.style.stroke = c;
        var vt = g.querySelector(".hxpf-val"); if (vt) { vt.textContent = val; vt.style.fill = c; }
        var lt = g.querySelector(".hxpf-lbl"); if (lt) { lt.textContent = lbl || ""; lt.style.display = (o.showLabels === false || !lbl) ? "none" : ""; }
      };
      setN("solar", fmt(S), o.lblSolar || "Solar");
      setN("grid",  grid == null ? "--" : fmt(Math.abs(grid)), o.lblGrid || "Grid");
      setN("home",  fmt(H), o.lblHome || "Home");
      setN("batt",  batt == null ? "--" : fmt(Math.abs(batt)),
           (soc != null) ? (Math.round(soc) + "%") : (o.lblBatt || "Battery"));

      /* battery SOC ring */
      var arc = host.querySelector(".hxpf-node[data-k='batt'] .hxpf-soc-arc");
      var trk = host.querySelector(".hxpf-node[data-k='batt'] .hxpf-soc-track");
      if (arc && trk) {
        if (soc != null) {
          var sv = Math.max(0, Math.min(100, soc));
          arc.setAttribute("stroke-dasharray", sv.toFixed(1) + " 100");
          arc.style.stroke = sv > 50 ? "#3fb950" : (sv >= 20 ? "#d29922" : "#f85149");
          arc.style.display = ""; trk.style.display = "";
        } else { arc.style.display = "none"; trk.style.display = "none"; }
      }
    },

    destroy: function (host) {
      if (host._pf && host._pf.raf) cancelAnimationFrame(host._pf.raf);
      host._pf = null;
    }
  });
})();
