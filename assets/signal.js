/* Draws a synthetic wideband spectrogram of "Zach Hopton" [zæk hɑptən],
   in the style of a Praat Sound + TextGrid editor window.
   Not a recording: formant targets, loci and noise bands are hand-set
   approximations of an American English production. */
(function () {
  "use strict";

  var FMAX = 5000;            // Praat's default view range
  var SEGS = [                // label, seconds, kind
    ["z", 0.12, "fric"],
    ["æ", 0.16, "vowel"],
    ["k", 0.10, "stop"],
    ["h", 0.07, "asp"],
    ["ɑ", 0.15, "vowel"],
    ["p", 0.09, "stop"],
    ["t", 0.08, "stop"],
    ["ə", 0.06, "vowel"],
    ["n", 0.13, "nasal"]
  ];
  var TARGET = { "æ": [760, 1720, 2480], "ɑ": [740, 1140, 2450], "ə": [520, 1450, 2500],
                 "n": [280, 1300, 2450] };
  var LOCUS  = { z: [260, 1700, 2600], k: [320, 2050, 2280], p: [260, 900, 2200],
                 t: [260, 1780, 2700], n: [280, 1650, 2550] };
  var TOTAL = SEGS.reduce(function (s, d) { return s + d[1]; }, 0);

  // seeded RNG so the picture is stable across loads
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

  // where each segment starts/ends (seconds)
  var bounds = [], acc = 0;
  SEGS.forEach(function (s) { bounds.push([acc, acc + s[1]]); acc += s[1]; });

  function segAt(t) {
    for (var i = 0; i < SEGS.length; i++) if (t < bounds[i][1]) return i;
    return SEGS.length - 1;
  }

  function f0(t) {           // statement intonation, two accents
    var u = t / TOTAL;
    return 112 + 40 * Math.exp(-Math.pow((u - 0.22) / 0.13, 2))
               + 22 * Math.exp(-Math.pow((u - 0.52) / 0.10, 2)) - 18 * u;
  }

  function formants(i, u) {  // u = position within segment, 0..1
    var lab = SEGS[i][0], tgt = TARGET[lab];
    var prev = SEGS[i - 1] && LOCUS[SEGS[i - 1][0]];
    var next = SEGS[i + 1] && LOCUS[SEGS[i + 1][0]];
    return tgt.map(function (f, k) {
      var v = f;
      if (prev && u < 0.35) v += (prev[k] - f) * Math.pow(1 - u / 0.35, 1.6);
      if (next && u > 0.65) v += (next[k] - f) * Math.pow((u - 0.65) / 0.35, 1.6);
      return v;
    });
  }

  function bump(f, c, bw) { var d = (f - c) / bw; return Math.exp(-d * d); }

  function voicing(t) {      // glottal pulse striations
    var T0 = 1 / f0(t), ph = (t % T0) / T0;
    return 0.5 + 0.5 * Math.exp(-ph * 9);
  }

  function nextVowel(i) {
    for (var j = i + 1; j < SEGS.length; j++) if (TARGET[SEGS[j][0]]) return SEGS[j][0];
    return "ə";
  }

  function energy(t, f) {
    var i = segAt(t), s = SEGS[i], kind = s[2];
    var u = (t - bounds[i][0]) / s[1];
    var tilt = Math.exp(-f / 3600);
    var n = rnd();

    if (kind === "vowel" || kind === "nasal") {
      var F = formants(i, u), nasal = kind === "nasal";
      var amps = nasal ? [1.0, 0.3, 0.25] : [1.0, 0.9, 0.7];
      var bws  = nasal ? [80, 170, 210] : [120, 150, 190];
      var e = 0;
      for (var k = 0; k < 3; k++) e += amps[k] * bump(f, F[k], bws[k]);
      if (!nasal) e += 0.32 * bump(f, 3500, 220);
      e += 0.5 * bump(f, 140, 90);                            // low harmonics
      var edge = Math.min(1, u / 0.06, (1 - u) / 0.08);       // onset/offset ramps
      if (i === SEGS.length - 1) edge = Math.min(edge, Math.pow(1 - u, 0.6));
      return 1.45 * (e * (0.55 + 0.45 * tilt) * voicing(t) * edge) * (0.85 + 0.3 * n);
    }
    if (kind === "fric") {   // [z]: high noise + voice bar
      var hiss = Math.max(0, Math.min(1, (f - 3300) / 900)) * 0.55 * (0.3 + 0.9 * n);
      var bar = 0.55 * bump(f, 150, 120) * voicing(t);
      var e2 = Math.min(1, u / 0.1, (1 - u) / 0.1);
      return (hiss + bar) * e2;
    }
    if (kind === "asp") {    // [h]: noise shaped by the next vowel
      var Fv = TARGET[nextVowel(i)];
      var shaped = 0.5 * bump(f, Fv[0], 160) + 0.55 * bump(f, Fv[1], 180) + 0.45 * bump(f, Fv[2], 220);
      return (0.18 + shaped) * 0.55 * (0.3 + 1.0 * n) * Math.min(1, u / 0.15 + 0.3);
    }
    // stops: closure, then burst, then (for k/p/t) short aspiration
    var lab = s[0];
    var closeEnd = lab === "t" ? 0.6 : 0.7;
    if (u < closeEnd) return 0.03 * n;
    var b = (u - closeEnd) / (1 - closeEnd);
    var burst = Math.exp(-b * 18);
    var spec = lab === "k" ? bump(f, 2200, 700) + 0.3
             : lab === "t" ? Math.max(0.15, Math.min(1, (f - 2500) / 1500))
             : 0.35 * tilt + 0.1;
    var aspir = lab === "t" && SEGS[i + 1] && SEGS[i + 1][0] === "ə"
      ? 0.25 * (0.4 + n) * (bump(f, 1500, 400) + bump(f, 2600, 500))
      : 0.12 * (0.4 + n);
    return burst * spec * (0.7 + 0.6 * n) + aspir * (1 - burst);
  }

  function hexToRgb(h) { h = h.replace("#", ""); return [0, 2, 4].map(function (k) { return parseInt(h.substr(k, 2), 16); }); }

  function draw(canvas, animate) {
    var css = getComputedStyle(document.documentElement);
    var ink = hexToRgb(css.getPropertyValue("--ink").trim() || "#18233a");
    var red = css.getPropertyValue("--formant").trim() || "#c8322a";
    var blue = css.getPropertyValue("--pitch").trim() || "#2348c8";

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
    if (!W || !H) return;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");
    var img = ctx.createImageData(W, H), px = img.data;

    seed = 7;
    for (var x = 0; x < W; x++) {
      var t = (x + 0.5) / W * TOTAL;
      for (var y = 0; y < H; y++) {
        var f = (1 - (y + 0.5) / H) * FMAX;
        var v = energy(t, f);
        v = Math.max(0, Math.min(1, v));
        v = Math.pow(v, 0.85) * 0.92;
        var o = (y * W + x) * 4;
        px[o]     = Math.round(255 + (ink[0] - 255) * v);
        px[o + 1] = Math.round(255 + (ink[1] - 255) * v);
        px[o + 2] = Math.round(255 + (ink[2] - 255) * v);
        px[o + 3] = 255;
      }
    }

    function overlays(upTo) {
      // formant track: red dots, vowels + nasal, as Praat draws them
      ctx.fillStyle = red;
      var r = 1.6 * dpr, step = Math.max(5, Math.round(W / 170));
      for (var x2 = 0; x2 < upTo; x2 += step) {
        var t2 = (x2 + 0.5) / W * TOTAL, i = segAt(t2), s = SEGS[i];
        if (!TARGET[s[0]]) continue;
        var u = (t2 - bounds[i][0]) / s[1];
        if (u < 0.08 || u > 0.94) continue;
        formants(i, u).forEach(function (F) {
          var yy = (1 - F / FMAX) * H;
          ctx.beginPath(); ctx.arc(x2, yy, r, 0, 6.2832); ctx.fill();
        });
      }
      // pitch track: blue, on its own 75–250 Hz scale
      ctx.strokeStyle = blue; ctx.lineWidth = 2 * dpr; ctx.lineJoin = "round";
      var started = false;
      ctx.beginPath();
      for (var x3 = 0; x3 < upTo; x3 += 2) {
        var t3 = (x3 + 0.5) / W * TOTAL, k = SEGS[segAt(t3)][2];
        var voiced = k === "vowel" || k === "nasal" || k === "fric";
        if (!voiced) { if (started) { ctx.stroke(); ctx.beginPath(); started = false; } continue; }
        var py = (1 - (f0(t3) - 75) / 175) * H;
        if (!started) { ctx.moveTo(x3, py); started = true; } else ctx.lineTo(x3, py);
      }
      if (started) ctx.stroke();
    }

    if (!animate) { ctx.putImageData(img, 0, 0); overlays(W); return; }

    // one moment of motion: the sound "records" in from left to right
    var start = null, DUR = 1100;
    ctx.clearRect(0, 0, W, H);
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / DUR);
      var upTo = Math.round(W * (1 - Math.pow(1 - p, 2)));
      ctx.putImageData(img, 0, 0, 0, 0, upTo, H);
      if (p < 1) requestAnimationFrame(frame);
      else overlays(W);
    }
    requestAnimationFrame(frame);
  }

  function init() {
    var canvas = document.getElementById("spectrogram");
    if (!canvas) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    draw(canvas, !reduce);

    var lastW = canvas.clientWidth, timer;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; draw(canvas, false); }
      }, 120);
    });

    // hovering an interval selects that stretch of signal, like the TextGrid editor
    var sel = document.getElementById("selection"), host = document.querySelector(".signal-main");
    var words = document.querySelector(".tier.words");
    document.querySelectorAll(".tier span").forEach(function (sp) {
      sp.addEventListener("mouseenter", function () {
        var hb = host.getBoundingClientRect(), r = sp.getBoundingClientRect();
        sel.style.left = (r.left - hb.left) + "px";
        sel.style.width = r.width + "px";
        sel.style.height = (words.getBoundingClientRect().bottom - hb.top) + "px";
        sel.classList.add("on");
      });
      sp.addEventListener("mouseleave", function () { sel.classList.remove("on"); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
