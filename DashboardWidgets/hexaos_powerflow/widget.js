/* hexaos_powerflow — HexaOS Dashboard Widget: animated energy power-flow diagram.
 *
 * A diamond of four nodes — Solar (top), Grid (left), Home (right), Battery
 * (bottom) — with animated dots travelling along each link in the direction of
 * energy flow, their speed scaled by the power on that link. Inspired by the
 * Home Assistant "power-flow-card-plus" card.
 *
 * MULTI-POINT: unlike single-binding widgets this one binds a signed power
 * datapoint PER NODE via `point`-type opts and reads them with `ctx.resolve(slug)`
 * (needs the multi-point dashboard widget-API). Sign convention (each invertible):
 *   Grid  + = import (grid -> home),     - = export (home -> grid)
 *   Battery + = discharge (batt -> home), - = charge  (-> batt)
 *   Solar = production (always out)
 * Home is taken from its own point, or auto-computed from the energy balance
 * (solar + grid_import + batt_discharge - grid_export - batt_charge) when unbound.
 *
 * Contract: touch only `host` + `ctx`, never `this`/Alpine. Classes are .hxpf-*.
 */
(function () {
  if (!window.HexaDash || !window.HexaDash.register) return;

  /* diamond node centres in the fixed 0..100 SVG viewBox */
  var POS = { solar: [50, 20], grid: [18, 52], home: [82, 52], batt: [50, 80] };
  var NR = 9.5;   /* node circle radius */
  var GAP = 10.5; /* link endpoints pulled this far off the node centres */

  /* straight link path from node a to node b, trimmed to the circle edges */
  function link(a, b) {
    var A = POS[a], B = POS[b], dx = B[0] - A[0], dy = B[1] - A[1];
    var L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L;
    return "M" + (A[0] + ux * GAP).toFixed(2) + "," + (A[1] + uy * GAP).toFixed(2) +
           "L" + (B[0] - ux * GAP).toFixed(2) + "," + (B[1] - uy * GAP).toFixed(2);
  }

  /* node glyphs drawn around their local origin (~ +-5 units); stroke = node colour */
  var ICON = {
    solar: "<circle r='2.4'/><path d='M0,-5V-3.4M0,5V3.4M-5,0H-3.4M5,0H3.4M-3.5,-3.5L-2.4,-2.4M3.5,3.5L2.4,2.4M-3.5,3.5L-2.4,2.4M3.5,-3.5L2.4,-2.4'/>",
    grid:  "<path d='M-3.6,4.6L-1.3,-4.4M3.6,4.6L1.3,-4.4M-1.6,-4.4H1.6M-2.1,-0.6H2.1M-2.8,2H2.8M-1.3,-4.4L1.3,-2M1.3,-4.4L-1.3,-2'/>",
    home:  "<path d='M-4.2,0L0,-4.2L4.2,0M-3,-1.2V4.2H3V-1.2M-1,4.2V1.6H1V4.2'/>",
    batt:  "<rect x='-4.6' y='-3' width='8.2' height='6' rx='1'/><rect x='3.6' y='-1.3' width='1.3' height='2.6' rx='.4'/><rect class='hxpf-bfill' x='-4' y='-2.4' width='0' height='4.8' rx='.5'/>"
  };

  /* faint base lines (undirected) + animated dot flows (key, from, to) */
  var BASES = [["solar","home"],["solar","grid"],["solar","batt"],["grid","home"],["batt","home"],["grid","batt"]];
  var FLOWS = [["s2h","solar","home"],["s2g","solar","grid"],["s2b","solar","batt"],
               ["g2h","grid","home"],["b2h","batt","home"],["g2b","grid","batt"],["b2g","batt","grid"]];
  var NODES = ["solar", "grid", "home", "batt"];

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
    /* bare SVG inner string (the picker wraps it in <svg stroke=currentColor>):
       a diamond with a node dot on each corner. */
    icon: "<path d='M9 2.5l5.4 6.5L9 15.5 3.6 9z'/><circle cx='9' cy='2.5' r='1.1' fill='currentColor' stroke='none'/><circle cx='15' cy='9' r='1.1' fill='currentColor' stroke='none'/><circle cx='3' cy='9' r='1.1' fill='currentColor' stroke='none'/><circle cx='9' cy='15.5' r='1.1' fill='currentColor' stroke='none'/>",
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

      { key: "flowColor", label: "Dot colour", type: "select", default: "source",
        options: [{ v: "source", l: "By source" }, { v: "fixed", l: "Fixed" }] },
      { key: "flowFixed", label: "Fixed dot colour", type: "color", default: "#58a6ff" },

      { key: "kiloThr",   label: "kW threshold (W)",  type: "number", col: 3, default: 1000 },
      { key: "decimals",  label: "kW decimals",       type: "number", col: 3, default: 1 },
      { key: "threshold", label: "Hide flow < (W)",   type: "number", col: 3, default: 10 },
      { key: "flowMin",   label: "Fastest dot (s)",   type: "number", col: 3, default: 1 },
      { key: "flowMax",   label: "Slowest dot (s)",   type: "number", col: 3, default: 6 },
      { key: "flowRef",   label: "Full speed at (W)", type: "number", col: 3, default: 2000 },
      { key: "dotSize",   label: "Dot size",          type: "number", col: 2, default: 2.4 }
    ],

    render: function (host) {
      var s = "<svg class='hxpf-svg' viewBox='0 0 100 100'>";
      var i;
      for (i = 0; i < BASES.length; i++)
        s += "<path class='hxpf-base' d='" + link(BASES[i][0], BASES[i][1]) + "'/>";
      for (i = 0; i < FLOWS.length; i++)
        s += "<path class='hxpf-dots' data-k='" + FLOWS[i][0] + "' d='" + link(FLOWS[i][1], FLOWS[i][2]) + "'/>";
      for (i = 0; i < NODES.length; i++) {
        var k = NODES[i], pos = POS[k], up = (k === "solar");
        s += "<g class='hxpf-node' data-k='" + k + "' transform='translate(" + pos[0] + "," + pos[1] + ")'>" +
               "<circle class='hxpf-bg' r='" + NR + "'/>" +
               "<g class='hxpf-ico'>" + ICON[k] + "</g>" +
               "<text class='hxpf-val' y='" + (up ? -12.5 : 12.5) + "'>--</text>" +
               "<text class='hxpf-lbl' y='" + (up ? -16.5 : 16.5) + "'></text>" +
             "</g>";
      }
      s += "</svg>";
      host.innerHTML = "<div class='dw-name'></div><div class='hxpf-stage'>" + s + "</div>";
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
      var g2b = Math.max(0, Bc - s2b);                                  /* charge not from solar -> from grid */
      var b2g = Math.min(Math.max(0, Bd - b2h), Math.max(0, Ge - s2g)); /* export beyond solar -> from battery surplus */
      var F = { s2h: s2h, s2g: s2g, s2b: s2b, g2h: g2h, b2h: b2h, g2b: g2b, b2g: b2g };

      var thr = (o.kiloThr != null && o.kiloThr !== "") ? Number(o.kiloThr) : 1000;
      var dec = (o.decimals != null && o.decimals !== "") ? Number(o.decimals) : 1;
      var fmt = function (w) {
        if (w == null || !isFinite(w)) return "--";
        if (Math.abs(w) >= thr) return (w / 1000).toFixed(dec) + " kW";
        return Math.round(w) + " W";
      };

      var COL = { solar: o.colSolar || "#f5a623", grid: o.colGrid || "#5b9bd5",
                  batt: o.colBatt || "#3fb950", home: o.colHome || "#9aa4af" };
      var setN = function (k, val, lbl) {
        var g = host.querySelector(".hxpf-node[data-k='" + k + "']"); if (!g) return;
        var c = COL[k];
        var bg = g.querySelector(".hxpf-bg");  if (bg) bg.style.stroke = c;
        var ic = g.querySelector(".hxpf-ico"); if (ic) ic.style.stroke = c;
        var vt = g.querySelector(".hxpf-val"); if (vt) { vt.textContent = val; vt.style.fill = c; }
        var lt = g.querySelector(".hxpf-lbl"); if (lt) { lt.textContent = lbl || ""; lt.style.display = (o.showLabels === false || !lbl) ? "none" : ""; }
      };
      setN("solar", fmt(S), o.lblSolar || "Solar");
      setN("grid",  grid == null ? "--" : fmt(Math.abs(grid)), o.lblGrid || "Grid");
      setN("home",  fmt(H), o.lblHome || "Home");
      setN("batt",  batt == null ? "--" : fmt(Math.abs(batt)),
           (soc != null) ? (Math.round(soc) + "%") : (o.lblBatt || "Battery"));

      /* reflect SOC as the battery icon fill level */
      var bf = host.querySelector(".hxpf-node[data-k='batt'] .hxpf-bfill");
      if (bf) {
        var pct = (soc != null) ? Math.max(0, Math.min(100, soc)) : 0;
        bf.setAttribute("width", (pct / 100 * 7.4).toFixed(2));
        bf.style.fill = COL.batt;
        bf.style.display = (soc != null) ? "" : "none";
      }

      /* flow dots — hide below threshold, colour by source (or fixed),
         duration interpolated from power so heavier flows move faster. */
      var hide = (o.threshold != null && o.threshold !== "") ? Number(o.threshold) : 10;
      var fMin = Math.max(0.2, Number(o.flowMin) || 1);
      var fMax = Math.max(fMin, Number(o.flowMax) || 6);
      var ref  = Math.max(1, Number(o.flowRef) || 2000);
      var dsz  = (o.dotSize != null && o.dotSize !== "") ? Number(o.dotSize) : 2.4;
      var SRC  = { s: COL.solar, g: COL.grid, b: COL.batt };
      var fixed = (o.flowColor || "source") === "fixed";
      Object.keys(F).forEach(function (k) {
        var el = host.querySelector(".hxpf-dots[data-k='" + k + "']"); if (!el) return;
        var p = F[k];
        if (!(p > hide)) { el.style.display = "none"; return; }
        el.style.display = "";
        var f = Math.max(0, Math.min(1, p / ref));
        el.style.animationDuration = (fMax - (fMax - fMin) * f).toFixed(2) + "s";
        el.style.strokeWidth = dsz;
        el.style.stroke = fixed ? (o.flowFixed || "#58a6ff") : SRC[k.charAt(0)];
      });
    }
  });
})();
