/*
 * Track display — a Ridge Racer Type 4 style "course preview".
 *
 * A fixed diamond of dots (an isometric patch of ground). A car drives round the circuit and
 * the diamond always shows the ground around it: the dots never move, they only rise and turn orange
 * where the road currently runs underneath them, and sink back to black once it has passed.
 * The whole circuit is drawn faintly over the grid, with a dot showing where the car is.
 *
 * Usage:  TrackDisplay.show(nextRaceRow)   // row from next_race.csv (circuit_name, locality, ...)
 * Needs:  circuits.js next to the page, and the #trackStage / #trackCanvas markup (see the HTML).
 * Look:   <div id="trackStage" data-look="paper"> or "amber" (the yellow Ridge Racer look).
 * Track outlines: simplified from the open bacinger/f1-circuits dataset.
 */
(function () {
  "use strict";

  /* ---------- tweakables ---------- */
  var CFG = {
    look: "paper",        // "paper" (matches the site) or "amber" (yellow, like the game)
    windowDots: 17,       // how many dots across the diamond is (odd numbers keep the car on a dot)
    spacing: 0.04,        // ground covered per dot, in world units (the track's longest side is 2.0)
    roadInner: 0.6,       // road is full height within this distance of the centre line (in dot spacings)
    roadOuter: 1.35,      // ...and fades out by this distance
    raise: 1.0,           // pillar height in dot spacings
    tilt: 0.56,           // vertical squash of the view (0.5 = classic isometric)
    response: 34,         // how quickly dots rise and sink (higher = snappier; 999 = instant)
    lapSeconds: 26,       // time for the car to drive one lap
    overlay: true         // draw the track layout over the grid, with the car dot on it
  };

  var LOOKS = {
    paper: { bg: null, dark: null, hot: [255, 106, 19], spark: [255, 214, 120],
             ring: "#fff6dc", ringEdge: "rgba(18,18,18,.75)",
             line: "rgba(255,246,220,.78)", lineEdge: "rgba(18,18,18,.35)" },
    amber: { bg: "#ffb800", dark: [66, 66, 66], hot: [255, 98, 0], spark: [255, 246, 196],
             ring: "#fff8de", ringEdge: "rgba(90,60,0,.55)",
             line: "rgba(255,248,222,.8)", lineEdge: "rgba(90,60,0,.3)" }
  };

  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var norm = function (s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, " ").trim();
  };
  function cssToRgb(css) {
    var c = document.createElement("canvas"); c.width = c.height = 1;
    var g = c.getContext("2d"); g.fillStyle = css; g.fillRect(0, 0, 1, 1);
    var d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
  }
  var rgb = function (a) { return "rgb(" + (a[0] | 0) + "," + (a[1] | 0) + "," + (a[2] | 0) + ")"; };
  var lerp3 = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };

  var circuitsPromise = null;
  function loadCircuits() {
    if (window.F1_CIRCUITS) return Promise.resolve(window.F1_CIRCUITS);   // circuits.js (works from file://)
    if (!circuitsPromise) {
      circuitsPromise = fetch("circuits.json").then(function (r) {
        if (!r.ok) throw new Error("circuits.json not found");
        return r.json();
      });
    }
    return circuitsPromise;
  }

  function findCircuit(db, next) {
    var hay = " " + norm([next.circuit_id, next.circuit_name, next.locality].join(" ")) + " ";
    var best = null, bestLen = 0;
    db.circuits.forEach(function (c) {
      c.keys.forEach(function (k) {
        if (hay.indexOf(" " + k + " ") !== -1 && k.length > bestLen) { best = c; bestLen = k.length; }
      });
    });
    return best;
  }

  /* ---------- the renderer ---------- */
  function Display(canvas, circuit, lookName) {
    var self = this;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.visible = true;
    this.t0 = performance.now();
    this.lastT = 0;
    this.raf = 0;

    var look = LOOKS[lookName] || LOOKS[CFG.look];
    this.look = look;
    var ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#121212";
    this.dark = look.dark || cssToRgb(ink);
    this.hot = look.hot; this.spark = look.spark;
    canvas.parentElement.style.setProperty("--track-bg", look.bg || "transparent");

    // outline in world units (longest side = 2, centred on 0), y down
    var p = circuit.pts, n = p.length / 2, i;
    this.track = [];
    for (i = 0; i < n; i++) this.track.push([p[2 * i] / 1000, p[2 * i + 1] / 1000]);
    this.cum = [0];                                    // arc length table: constant car speed
    for (i = 1; i <= n; i++) {
      var a = this.track[i - 1], b = this.track[i % n];
      this.cum.push(this.cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    this.total = this.cum[n];
    // segment tables for the distance-to-road lookups
    this.ax = new Float32Array(n); this.ay = new Float32Array(n);
    this.sx = new Float32Array(n); this.sy = new Float32Array(n); this.sl = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var q = this.track[i], r = this.track[(i + 1) % n];
      this.ax[i] = q[0]; this.ay[i] = q[1]; this.sx[i] = r[0] - q[0]; this.sy[i] = r[1] - q[1];
      this.sl[i] = (r[0] - q[0]) * (r[0] - q[0]) + (r[1] - q[1]) * (r[1] - q[1]) || 1e-9;
    }

    // the fixed diamond: dots at (i, j), |i|,|j| <= half
    this.half = Math.floor(CFG.windowDots / 2);
    this.cells = this.half * 2 + 1;
    this.height = new Float32Array(this.cells * this.cells);   // current raise of each dot, 0..1
    this.tail = new Float32Array(this.cells * this.cells);     // glow just behind the car

    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    new ResizeObserver(this.resize).observe(canvas.parentElement);
    new IntersectionObserver(function (e) {
      self.visible = e[0].isIntersecting;
      if (self.visible) self.start();
    }).observe(canvas);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) self.start(); });
    canvas.parentElement.addEventListener("click", function () {
      self.t0 = performance.now(); self.lastT = 0; self.height.fill(0); self.start();
    });
    this.resize();
  }

  Display.prototype.posAt = function (u) {             // u in [0,1) -> [x, y]
    var d = (u % 1 + 1) % 1 * this.total, lo = 0, hi = this.cum.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (this.cum[m] <= d) lo = m; else hi = m; }
    var f = (d - this.cum[lo]) / ((this.cum[hi] - this.cum[lo]) || 1), n = this.track.length;
    var a = this.track[lo % n], b = this.track[hi % n];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };

  // distance from a world point to the road, and how far along the lap that nearest point is
  Display.prototype.nearest = function (x, y) {
    var n = this.ax.length, bd = 1e9, bu = 0;
    for (var k = 0; k < n; k++) {
      var f = ((x - this.ax[k]) * this.sx[k] + (y - this.ay[k]) * this.sy[k]) / this.sl[k];
      f = f < 0 ? 0 : f > 1 ? 1 : f;
      var ex = x - (this.ax[k] + this.sx[k] * f), ey = y - (this.ay[k] + this.sy[k] * f);
      var d2 = ex * ex + ey * ey;
      if (d2 < bd) { bd = d2; bu = k + f; }
    }
    this.nearU = (this.cum[bu | 0] + (this.cum[(bu | 0) + 1] - this.cum[bu | 0]) * (bu - (bu | 0))) / this.total;
    return Math.sqrt(bd);
  };

  Display.prototype.resize = function () {
    var box = this.canvas.parentElement.getBoundingClientRect();
    var W = Math.max(60, Math.round(box.width)), H = Math.max(40, Math.round(box.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.W = W; this.H = H; this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
    this.canvas.style.width = W + "px"; this.canvas.style.height = H + "px";

    // fit the diamond (and the pillars sticking up from it) into the box
    var s = CFG.spacing, R = (this.half + 0.5) * s, tilt = CFG.tilt, sp = Math.sqrt(1 - tilt * tilt);
    var hz = CFG.raise * s * sp * 1.5, halfW = Math.SQRT2 * R, halfH = Math.SQRT2 * R * tilt;
    this.scale = Math.min(W * 0.96 / (2 * halfW), H * 0.94 / (2 * halfH + hz));
    this.cx = W / 2;
    this.cy = H / 2 + hz * this.scale / 2;
    this.rad = s * this.scale * 0.385;

    // the track layout drawn over the grid
    var xs = this.track.map(function (q) { return q[0]; }), ys = this.track.map(function (q) { return q[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var pad = Math.max(10, H * 0.07);                    // room for the line and the car dot
    var mk = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0));
    this.map = { k: mk, ox: W / 2 - (x0 + x1) / 2 * mk, oy: H / 2 - (y0 + y1) / 2 * mk };
    this.mapPath = new Path2D();
    for (var q = 0; q < this.track.length; q++) {
      var mx = this.map.ox + this.track[q][0] * mk, my = this.map.oy + this.track[q][1] * mk;
      if (q) this.mapPath.lineTo(mx, my); else this.mapPath.moveTo(mx, my);
    }
    this.mapPath.closePath();

    // fixed screen position of every dot
    var c = Math.SQRT1_2, hh = this.half, k = 0;
    this.bx = new Float32Array(this.cells * this.cells); this.by = new Float32Array(this.cells * this.cells);
    for (var i = -hh; i <= hh; i++) {
      for (var j = -hh; j <= hh; j++, k++) {
        this.bx[k] = this.cx + (i - j) * s * c * this.scale;
        this.by[k] = this.cy + (i + j) * s * c * tilt * this.scale;
      }
    }
    this.start();
  };

  Display.prototype.start = function () {
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  };
  Display.prototype.frame = function (now) {
    this.raf = 0;
    this.draw((now - this.t0) / 1000);
    if (this.reduced || !this.visible || document.hidden) return;
    this.raf = requestAnimationFrame(this.frame);
  };

  Display.prototype.draw = function (t) {
    var ctx = this.ctx, s = CFG.spacing, hh = this.half, look = this.look, rad = this.rad;
    var dt = this.reduced ? 10 : clamp(t - this.lastT, 0, 0.05); this.lastT = t;
    var ease = 1 - Math.exp(-dt * CFG.response);
    var tilt = CFG.tilt, sp = Math.sqrt(1 - tilt * tilt), lift = CFG.raise * s * sp * this.scale;
    var r0 = CFG.roadInner * s, r1 = CFG.roadOuter * s;
    var dark = this.dark, hot = this.hot, spark = this.spark, darkCss = rgb(dark);

    // where the car is (smoothed a little so the ground flows calmly)
    var u = this.reduced ? 0.12 : (t / CFG.lapSeconds) % 1;
    var p0 = this.posAt(u - 0.006), p1 = this.posAt(u), p2 = this.posAt(u + 0.006);
    var cam = [(p0[0] + p1[0] + p2[0]) / 3, (p0[1] + p1[1] + p2[1]) / 3];

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);

    var i, j, k = 0;
    for (i = -hh; i <= hh; i++) {
      for (j = -hh; j <= hh; j++, k++) {
        // is there road under this dot right now?
        var d = this.nearest(cam[0] + i * s, cam[1] + j * s);
        var target = d < r1 ? 1 - smooth(r0, r1, d) : 0;
        this.height[k] += (target - this.height[k]) * ease;
        var behind = (((u - this.nearU) % 1) + 1) % 1;
        var glow = target > 0.3 && behind < 0.08 ? Math.exp(-behind * 40) : 0;
        this.tail[k] += (glow - this.tail[k]) * ease;
      }
    }

    k = 0;
    for (i = -hh; i <= hh; i++) {
      for (j = -hh; j <= hh; j++, k++) {
        var x = this.bx[k], y = this.by[k], h = this.height[k], g = this.tail[k];
        if (h < 0.03) {                                               // flat black dot
          ctx.fillStyle = darkCss;
          ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
          continue;
        }
        var col = lerp3(hot, spark, clamp(g * 0.95, 0, 1));
        var top = y - h * lift * (1 + 0.5 * g);
        var side = lerp3(dark, [col[0] * 0.66, col[1] * 0.6, col[2] * 0.5], clamp(h * 1.6, 0, 1));
        ctx.fillStyle = ctx.strokeStyle = rgb(side);                  // pillar: solid, darker than its cap
        ctx.lineWidth = rad * 2; ctx.lineCap = "butt";
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, top); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
        ctx.fillStyle = rgb(lerp3(dark, col, h));                     // cap
        ctx.beginPath(); ctx.arc(x, top, rad, 0, 6.2832); ctx.fill();
      }
    }

    // the track layout, with the car on it (same position the grid is centred on)
    if (CFG.overlay) {
      var m = this.map, cx = m.ox + cam[0] * m.k, cy = m.oy + cam[1] * m.k, lw = Math.max(2, this.H * 0.028);
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.strokeStyle = look.lineEdge; ctx.lineWidth = lw + 2; ctx.stroke(this.mapPath);
      ctx.strokeStyle = look.line; ctx.lineWidth = lw; ctx.stroke(this.mapPath);
      var cr = Math.max(3.2, this.H * 0.045);
      ctx.fillStyle = look.ringEdge; ctx.beginPath(); ctx.arc(cx, cy, cr + 1.6, 0, 6.2832); ctx.fill();
      ctx.fillStyle = look.ring; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 6.2832); ctx.fill();
      ctx.fillStyle = rgb(hot); ctx.beginPath(); ctx.arc(cx, cy, cr * 0.55, 0, 6.2832); ctx.fill();
    }
  };

  /* ---------- public entry ---------- */
  var current = null;
  window.TrackDisplay = {
    show: function (next) {
      var stage = $("trackStage"), canvas = $("trackCanvas");
      if (!stage || !canvas || !next || !next.circuit_name) return Promise.resolve();
      return loadCircuits().then(function (db) {
        var c = findCircuit(db, next);
        if (!c) { console.info("TrackDisplay: no outline for", next.circuit_name); return; }
        stage.hidden = false;
        canvas.setAttribute("aria-label", "Animated dot-matrix preview of " + (next.circuit_name || c.name));
        stage.title = "Click to replay";
        if (current) return;
        requestAnimationFrame(function () { current = new Display(canvas, c, stage.getAttribute("data-look")); });
      }).catch(function (e) { console.error("TrackDisplay:", e); });
    }
  };
})();