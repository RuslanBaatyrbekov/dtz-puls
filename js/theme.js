/* DTZ-Puls · theme
 * Colour themes and avatars.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* ---------- themes + avatars ---------- */
var THEMES = [
  ['auto', ''],
  ['flag', 'Schwarz-Rot-Gold', ['#f4f3ee', '#151515', '#dd0000', '#ffce00']],
  ['karo', 'Karopapier', ['#f5f6f2', '#1f45a0', '#c7342b', '#f6dc2a']],
  ['ostsee', 'Ostsee', ['#eef5f7', '#0e7490', '#d9480f', '#f2c14e']],
  ['nacht', 'Nacht', ['#121212', '#ffce00', '#ff4d4d', '#f2f0ea']],
  ['wald', 'Schwarzwald', ['#0f1712', '#7bd389', '#ff7b5c', '#e0c060']],
  ['berlin', 'Berlin', ['#101018', '#b69cff', '#ff5c8a', '#ffd166']]
];
var AVATARS = [
  '🦊',
  '🐻',
  '🐼',
  '🦁',
  '🐯',
  '🐸',
  '🐵',
  '🦉',
  '🐧',
  '🐢',
  '🐙',
  '🦄',
  '🐝',
  '🦋',
  '🌻',
  '🌵',
  '🍀',
  '⚽',
  '🎸',
  '🚗',
  '🚲',
  '☕',
  '📚',
  '🚀'
];
function applyTheme(th) {
  var r = document.documentElement;
  if (!th || th === 'auto') r.removeAttribute('data-theme');
  else r.setAttribute('data-theme', th);
  try {
    localStorage.setItem('dtz-theme', th || 'auto');
  } catch (e) {}
}
