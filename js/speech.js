/* DTZ-Puls · speech
 * Text-to-speech with the browser's German voice; voice and speed are set in the Profile.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* ---------- speech (browser voice, German) ---------- */
var deVoice = null,
  deVoices = [],
  sayEl = null;
/* Voice and speed chosen in the Profile; kept per device, because voices differ between devices. */
var VPREF = (function () {
  try {
    return JSON.parse(localStorage.getItem('dtz.voice') || '{}') || {};
  } catch (e) {
    return {};
  }
})();
function saveVoicePref() {
  try {
    localStorage.setItem('dtz.voice', JSON.stringify(VPREF));
  } catch (e) {}
}
/* The speech API does not say a voice's gender: guess it from well-known male voice names. */
var MALE_VOICE =
  /\b(markus|yannick|martin|viktor|stefan|conrad|killian|florian|ralf|bernd|jonas|christoph|kasper|reed|rocko|eddy|grandpa|hans|klaus)\b|\bmale\b|männlich/i;
function isMaleVoice(v) {
  return MALE_VOICE.test(v.name) && !/female|weiblich/i.test(v.name);
}
function loadVoices() {
  try {
    var vs = speechSynthesis.getVoices().filter(function (v) {
      return /^de/i.test(v.lang);
    });
    vs.sort(function (a, b) {
      return (/^de(-|_)DE/i.test(b.lang) ? 1 : 0) - (/^de(-|_)DE/i.test(a.lang) ? 1 : 0);
    });
    deVoices = vs;
    deVoice =
      vs.filter(function (v) {
        return VPREF.voice && v.name === VPREF.voice;
      })[0] ||
      vs.filter(isMaleVoice)[0] ||
      vs[0] ||
      null;
  } catch (e) {}
}
try {
  loadVoices();
  speechSynthesis.onvoiceschanged = function () {
    loadVoices();
    if (typeof view !== 'undefined' && view === 'progress' && !R) render();
  };
} catch (e) {}
function setVoice(name) {
  VPREF.voice = name || '';
  saveVoicePref();
  loadVoices();
}
function setRate(r) {
  VPREF.rate = r;
  saveVoicePref();
}
/* Profile block: voice list (male voices marked) and speed */
function voiceBlock() {
  if (!deVoices.length) return '';
  var cur = deVoice ? deVoice.name : '',
    rate = VPREF.rate || 1,
    male = deVoices.some(isMaleVoice);
  return (
    '<div class="row"><label for="vc" class="small" style="min-width:90px">' +
    esc(t('set.voice')) +
    '</label><select class="txt sel" id="vc" data-ch="voice">' +
    deVoices
      .map(function (v) {
        return (
          '<option value="' +
          esc(v.name) +
          '"' +
          (v.name === cur ? ' selected' : '') +
          '>' +
          (isMaleVoice(v) ? '♂ ' : '') +
          esc(v.name) +
          '</option>'
        );
      })
      .join('') +
    '</select><button class="btn small ghost say" data-a="say" data-txt="' +
    esc(t('set.voicetest')) +
    '" aria-label="' +
    esc(t('btn.listen')) +
    '">🔊</button></div>' +
    (male ? '' : '<p class="small muted" style="margin:0">' + esc(t('set.nomale')) + '</p>') +
    '<div class="row"><span class="small" style="min-width:90px">' +
    esc(t('set.speed')) +
    '</span>' +
    [0.9, 1, 1.15, 1.3]
      .map(function (r) {
        return (
          '<button class="chipbtn' +
          (r === rate ? ' on' : '') +
          '" data-a="vrate" data-v="' +
          r +
          '" aria-pressed="' +
          (r === rate) +
          '">' +
          (r === 1 ? '1×' : r + '×') +
          '</button>'
        );
      })
      .join('') +
    '</div>'
  );
}
function stopSay() {
  try {
    speechSynthesis.cancel();
  } catch (e) {}
  if (sayEl) {
    sayEl.classList.remove('playing');
    sayEl = null;
  }
}
function say(el, text, rate) {
  if (sayEl === el) {
    stopSay();
    return false;
  }
  stopSay();
  try {
    var u = new SpeechSynthesisUtterance(String(text).replace(/—/g, ', '));
    u.lang = 'de-DE';
    if (deVoice) u.voice = deVoice;
    u.rate = Math.min(2, (rate || 1) * (VPREF.rate || 1) * 0.95);
    u.onend = u.onerror = function () {
      if (sayEl === el) {
        el.classList.remove('playing');
        sayEl = null;
      }
    };
    sayEl = el;
    el.classList.add('playing');
    speechSynthesis.speak(u);
    return true;
  } catch (e) {
    toast(t('toast.nospeech'));
    return false;
  }
}
