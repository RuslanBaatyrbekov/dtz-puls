/* DTZ-Puls · add-learner
 * Adding a learner account (observers only, Edge Function create-learner).
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* add learner (observer only, via Edge Function create-learner) */
var ADD = { busy: false, res: null, err: '' };
function vAdd() {
  var h =
    '<details class="card"' +
    (ADD.res || ADD.err ? ' open' : '') +
    '><summary>' +
    esc(t('add.h')) +
    '</summary><p class="small muted">' +
    esc(t('add.p')) +
    '</p>' +
    '<form id="af" style="display:flex;flex-direction:column;gap:8px"><input class="txt" style="max-width:none" id="ae" type="email" dir="ltr" placeholder="' +
    esc(t('add.email')) +
    '" autocomplete="off" required>' +
    '<input class="txt" style="max-width:none" id="an" placeholder="' +
    esc(t('add.name')) +
    '" maxlength="30" autocomplete="off">' +
    '<input class="txt" style="max-width:none" id="ap" dir="ltr" placeholder="' +
    esc(t('add.pw')) +
    '" autocomplete="new-password">' +
    '<button class="btn" type="submit"' +
    (ADD.busy ? ' disabled' : '') +
    '>' +
    esc(ADD.busy ? t('add.busy') : t('add.btn')) +
    '</button></form>';
  if (ADD.err) h += '<p class="small" role="alert" style="color:var(--bad)">' + esc(ADD.err) + '</p>';
  if (ADD.res) {
    h +=
      '<p class="small"><b>' +
      esc(t('add.ok')) +
      '</b></p><textarea class="txt" id="amsg" style="max-width:none;min-height:110px" dir="ltr" readonly>' +
      esc(addMsg(ADD.res)) +
      '</textarea><div class="row" style="margin-top:8px"><button class="btn small" data-a="addcopy">' +
      esc(t('add.copy')) +
      '</button></div>';
  }
  return h + '</details>';
}
function addMsg(r) {
  return (
    'DTZ-Puls\n' +
    location.origin +
    location.pathname +
    '\nEmail: ' +
    r.email +
    '\nPasswort / Password: ' +
    r.password +
    '\n\nSprache ändern / change language: oben im Menü.'
  );
}
function doAdd() {
  var em = $('#ae').value.trim(),
    nm = $('#an').value.trim(),
    pw = $('#ap').value.trim();
  if (!em) return;
  if (!SB || !SB.functions) return;
  ADD = { busy: true, res: null, err: '' };
  render();
  SB.auth.getUser().then(
    function (u) {
      if (u && u.error) {
        ADD = { busy: false, res: null, err: '' };
        SB.auth.signOut({ scope: 'local' }).then(
          function () {},
          function () {}
        );
        onSession(null);
        toast(t('login.again'));
        return null;
      }
      return SB.functions
        .invoke('create-learner', { body: { email: em, name: nm, password: pw } })
        .then(function (r) {
          var d = r.data,
            e = r.error;
          if (e) {
            var ctx = e.context;
            var p = ctx && ctx.json ? ctx.json() : Promise.resolve(null);
            return p.then(
              function (j) {
                var code = j && j.error;
                ADD = {
                  busy: false,
                  res: null,
                  err:
                    code === 'exists'
                      ? t('add.exists')
                      : /not found|404|FunctionsFetchError|Failed to send/i.test(
                            String(e.message) + String(e.name)
                          )
                        ? t('add.nofn')
                        : t('add.err', {
                            m: (code || e.message || '?') + (j && j.detail ? ' (' + j.detail + ')' : '')
                          })
                };
                render();
              },
              function () {
                ADD = { busy: false, res: null, err: t('add.err', { m: e.message || '?' }) };
                render();
              }
            );
          }
          ADD = { busy: false, res: d, err: '' };
          render();
          loadWatch();
        });
    },
    function (e) {
      ADD = { busy: false, res: null, err: t('add.err', { m: String((e && e.message) || e) }) };
      render();
    }
  );
}
