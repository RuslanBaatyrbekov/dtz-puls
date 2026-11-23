/* DTZ-Puls · effects
 * Visual effects: confetti, count-up numbers, view transitions.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* effects: confetti, count-up, view transitions */
var RM = false;
try {
  RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
} catch (e) {}
function confetti(big) {
  if (RM) return;
  try {
    var c = document.createElement('canvas'),
      x = c.getContext('2d'),
      W = window.innerWidth,
      H = window.innerHeight,
      dpr = Math.min(2, window.devicePixelRatio || 1);
    c.className = 'fx';
    c.width = W * dpr;
    c.height = H * dpr;
    x.scale(dpr, dpr);
    document.body.appendChild(c);
    var cols = ['#151515', '#dd0000', '#ffce00', '#16a34a', '#2563eb', '#ff8fc7', '#ffffff'],
      P = [];
    function burst(cx, cy, k) {
      for (var i = 0; i < k; i++) {
        var a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4,
          v = 5 + Math.random() * 9;
        P.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          s: 6 + Math.random() * 7,
          r: Math.random() * 6,
          vr: (Math.random() - 0.5) * 0.35,
          c: cols[(Math.random() * cols.length) | 0],
          l: 1,
          w: Math.random() * 6
        });
      }
    }
    burst(W * 0.5, H * 0.42, big ? 110 : 80);
    if (big) {
      setTimeout(function () {
        burst(W * 0.15, H * 0.5, 70);
      }, 260);
      setTimeout(function () {
        burst(W * 0.85, H * 0.5, 70);
      }, 480);
    }
    var t0 = Date.now();
    (function f() {
      var now = Date.now();
      x.clearRect(0, 0, W, H);
      P.forEach(function (p) {
        p.vy += 0.28;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx + Math.sin(now / 180 + p.w);
        p.y += p.vy;
        p.r += p.vr;
        if (now - t0 > 1400) p.l -= 0.02;
        if (p.l <= 0) return;
        x.save();
        x.globalAlpha = Math.max(0, p.l);
        x.translate(p.x, p.y);
        x.rotate(p.r);
        x.fillStyle = p.c;
        x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        x.restore();
      });
      if (now - t0 < 3400) requestAnimationFrame(f);
      else c.remove();
    })();
  } catch (e) {}
}
function countUps() {
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var to = +el.dataset.count,
      pre = el.dataset.pre || '';
    el.removeAttribute('data-count');
    if (RM || !to) return;
    var t0 = Date.now(),
      d = Math.min(1200, 400 + to * 6);
    el.textContent = pre + '0';
    (function f() {
      var k = Math.min(1, (Date.now() - t0) / d);
      el.textContent = pre + Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(f);
    })();
  });
}
var LASTV = '';
function viewIn() {
  var a = $('#app'),
    k = view + '|' + (R ? R.pos : '') + '|' + (view === 'cards' && CS ? 's' : '') + '|' + (NOTE || '');
  if (k !== LASTV) gClose();
  if (k === LASTV || RM) {
    LASTV = k;
    return;
  }
  var first = !LASTV;
  LASTV = k;
  if (first) return;
  a.classList.remove('vin');
  void a.offsetWidth;
  a.classList.add('vin');
}
