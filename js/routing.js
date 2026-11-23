/* DTZ-Puls · routing
 * Hash routing between screens.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* ---------- routing ---------- */
var VIEWS = ['path', 'practice', 'cards', 'notes', 'top', 'progress', 'watch'],
  view = 'path',
  R = null,
  T = null,
  RES = null,
  toastT = null,
  BACK = 'path';
function fromHash() {
  var h = (location.hash || '').slice(1);
  return VIEWS.indexOf(h) >= 0 ? h : 'path';
}
window.addEventListener('hashchange', function () {
  if (view === 'run' || view === 'result') return;
  stopSay();
  view = fromHash();
  render();
});
function toast(m) {
  var o = $('.toast');
  if (o) o.remove();
  var d = document.createElement('div');
  d.className = 'toast';
  d.setAttribute('role', 'status');
  d.textContent = m;
  document.body.appendChild(d);
  clearTimeout(toastT);
  toastT = setTimeout(function () {
    d.remove();
  }, 3600);
}
