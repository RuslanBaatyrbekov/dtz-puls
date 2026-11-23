/* DTZ-Puls · speech
 * Text-to-speech with the browser's German voice.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* ---------- speech (browser voice, German) ---------- */
var deVoice = null,
  sayEl = null;
function loadVoices() {
  try {
    var vs = speechSynthesis.getVoices();
    deVoice =
      vs.filter(function (v) {
        return /^de(-|_)DE/i.test(v.lang);
      })[0] ||
      vs.filter(function (v) {
        return /^de/i.test(v.lang);
      })[0] ||
      null;
  } catch (e) {}
}
try {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
} catch (e) {}
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
    u.rate = (rate || 1) * 0.95;
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
