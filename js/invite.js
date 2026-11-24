/* DTZ-Puls · invite
 * One-tap sign-in: the organiser sends a link …/#join=<code>, the app signs the learner in by itself.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/** {e: email, p: password} from the current link, or null. The code is removed from the address bar at once. */
var INVITE = (function () {
  var m = /[#&]join=([A-Za-z0-9_-]+)/.exec(location.hash || '');
  if (!m) return null;
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch (e) {}
  try {
    var b = m[1].replace(/-/g, '+').replace(/_/g, '/');
    var j = JSON.parse(decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4)))));
    return j && j.e && j.p ? { e: String(j.e), p: String(j.p) } : null;
  } catch (e) {
    return null;
  }
})();

/** Build an invite link for the organiser's message. */
function inviteLink(email, password) {
  var code = btoa(unescape(encodeURIComponent(JSON.stringify({ e: email, p: password }))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return location.origin + location.pathname + '#join=' + code;
}

/** Called whenever the login screen would be shown: use the invite once, if there is one. */
function tryInvite() {
  if (!INVITE || !SB || loginBusy || !LANGCHOSEN) return false;
  var inv = INVITE;
  INVITE = null;
  loginEm = inv.e;
  loginBusy = true;
  loginErr = '';
  view = 'login';
  render();
  SB.auth.signInWithPassword({ email: inv.e, password: inv.p }).then(
    function (r) {
      loginBusy = false;
      if (r.error) {
        loginErr = t('login.invbad');
        render();
        return;
      }
      onSession(r.data.session);
    },
    function () {
      loginBusy = false;
      loginErr = t('err.offline');
      render();
    }
  );
  return true;
}
