/*
 * Akalynth account portal (E5 / AKALYNTH_SITE_ACCOUNT_PORTAL_API_V1).
 *
 * Talks to the REAL account + character API (E2/E4) instead of localStorage:
 * register / verify email / login / dashboard / create character (world + sex +
 * outfit). Cookie sessions via `credentials: 'include'` — the API must send CORS
 * for this origin and the cookies are HttpOnly + SameSite=Strict (same-site:
 * akalynth.com <-> api.akalynth.com). The website holds no secrets or authority.
 *
 * Until E2/E4 are deployed (and CORS is enabled) the calls won't succeed; the
 * portal degrades to the signed-out forms with a clear "server unreachable" note.
 */
(function () {
  'use strict';

  function apiBase() {
    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000';
    if (h === 'beta.akalynth.com') return 'https://beta-api.akalynth.com';
    return 'https://api.akalynth.com';
  }

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  // Resolves to { ok, status, body, networkError }.
  function api(path, opts) {
    opts = opts || {};
    var headers = { 'content-type': 'application/json' };
    if (opts.csrf) {
      var c = getCookie('akalynth_csrf');
      if (c) headers['x-csrf-token'] = c;
    }
    return fetch(apiBase() + path, {
      method: opts.method || 'GET',
      credentials: 'include',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return null;
          })
          .then(function (body) {
            return { ok: res.ok, status: res.status, body: body };
          });
      })
      .catch(function () {
        return { ok: false, status: 0, body: null, networkError: true };
      });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var root;
  function $(sel) {
    return root.querySelector(sel);
  }
  function setHTML(html) {
    root.innerHTML = html;
  }
  function msg(sel, text, kind) {
    var node = $(sel);
    if (node) {
      node.textContent = text || '';
      node.className = 'portal-msg' + (kind ? ' portal-msg--' + kind : '');
    }
  }

  // ---------------------------------------------------------------- signed out
  function renderSignedOut(serverDown) {
    setHTML(
      '<article class="parchment">' +
        '<p class="lede">Sign in</p>' +
        (serverDown
          ? '<p class="notice">⚠ Could not reach the account server. The account service may not be live yet.</p>'
          : '') +
        '<form id="login-form" novalidate>' +
        '<div class="field"><label for="login-email">Email</label><input id="login-email" type="email" autocomplete="email" /></div>' +
        '<div class="field"><label for="login-pw">Password</label><input id="login-pw" type="password" autocomplete="current-password" /></div>' +
        '<button class="btn btn-gold btn-block" type="submit">Sign in</button>' +
        '<p class="portal-msg" id="login-msg"></p>' +
        '</form>' +
        '</article>' +
        '<article class="parchment">' +
        '<p class="lede">Create an account</p>' +
        '<p class="muted small">Email + password. We send a verification link; verify before creating a character.</p>' +
        '<form id="reg-form" novalidate>' +
        '<div class="field"><label for="reg-email">Email</label><input id="reg-email" type="email" autocomplete="email" /></div>' +
        '<div class="field"><label for="reg-pw">Password</label><input id="reg-pw" type="password" autocomplete="new-password" minlength="8" /><p class="muted small">At least 8 characters.</p></div>' +
        '<button class="btn btn-ghost btn-block" type="submit">Create account</button>' +
        '<p class="portal-msg" id="reg-msg"></p>' +
        '</form>' +
        '<details class="portal-details"><summary>Have a verification token?</summary>' +
        '<form id="verify-form" novalidate><div class="field"><input id="verify-token" type="text" placeholder="verification token" /></div>' +
        '<button class="btn btn-ghost" type="submit">Verify email</button><p class="portal-msg" id="verify-msg"></p></form></details>' +
        '</article>',
    );

    $('#login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      msg('#login-msg', 'Signing in…');
      api('/v1/accounts/login', { method: 'POST', body: { email: $('#login-email').value, password: $('#login-pw').value } }).then(function (r) {
        if (r.networkError) return msg('#login-msg', 'Server unreachable.', 'error');
        if (r.ok) return refresh();
        msg('#login-msg', (r.body && r.body.error === 'invalid_credentials') ? 'Email or password incorrect.' : 'Could not sign in.', 'error');
      });
    });

    $('#reg-form').addEventListener('submit', function (e) {
      e.preventDefault();
      msg('#reg-msg', 'Creating…');
      api('/v1/accounts/register', { method: 'POST', body: { email: $('#reg-email').value, password: $('#reg-pw').value } }).then(function (r) {
        if (r.networkError) return msg('#reg-msg', 'Server unreachable.', 'error');
        if (r.ok) {
          var dev = r.body && r.body.dev_verification_token;
          msg('#reg-msg', 'Check your email for a verification link.' + (dev ? ' (dev token: ' + dev + ')' : ''), 'ok');
        } else {
          msg('#reg-msg', (r.body && r.body.message) || 'Could not create the account.', 'error');
        }
      });
    });

    $('#verify-form').addEventListener('submit', function (e) {
      e.preventDefault();
      doVerify($('#verify-token').value, '#verify-msg');
    });
  }

  // ----------------------------------------------------------------- dashboard
  function renderDashboard(account) {
    setHTML(
      '<article class="parchment">' +
        '<p class="lede">Your account</p>' +
        '<dl class="summary-list">' +
        '<div><dt>Account</dt><dd>' + esc(account.account_id) + '</dd></div>' +
        '<div><dt>Email</dt><dd>' + (account.email_verified ? 'verified' : '<strong>not verified</strong>') + '</dd></div>' +
        '</dl>' +
        '<button class="btn btn-ghost" id="logout-btn" type="button">Sign out</button>' +
        '</article>' +
        (account.email_verified
          ? '<article class="parchment" id="characters-card"><p class="lede">Your characters</p><div id="char-list"><p class="muted small">Loading…</p></div></article>' +
            '<article class="parchment" id="create-card"><p class="lede">Create a character</p><div id="create-host"></div></article>'
          : '<article class="parchment"><p class="notice">⚠ Verify your email to create a character.</p>' +
            '<details class="portal-details"><summary>Enter a verification token</summary><form id="verify-form" novalidate><div class="field"><input id="verify-token" type="text" placeholder="verification token" /></div><button class="btn btn-ghost" type="submit">Verify email</button><p class="portal-msg" id="verify-msg"></p></form></details></article>'),
    );

    $('#logout-btn').addEventListener('click', function () {
      api('/v1/accounts/logout', { method: 'POST', csrf: true }).then(refresh);
    });

    if (!account.email_verified) {
      $('#verify-form').addEventListener('submit', function (e) {
        e.preventDefault();
        doVerify($('#verify-token').value, '#verify-msg');
      });
      return;
    }

    loadCharacters();
    renderCreate();
  }

  function loadCharacters() {
    api('/v1/characters').then(function (r) {
      var host = $('#char-list');
      if (!host) return;
      var chars = (r.body && r.body.characters) || [];
      if (!chars.length) {
        host.innerHTML = '<p class="muted small">No characters yet — create one below.</p>';
        return;
      }
      host.innerHTML = chars
        .map(function (c) {
          return '<div class="char-row"><strong>' + esc(c.name) + '</strong> · ' + esc(c.world_id) + ' · ' + esc(c.sex) + ' · ' + esc(c.outfit_id) + '</div>';
        })
        .join('');
    });
  }

  function renderCreate() {
    var host = $('#create-host');
    host.innerHTML =
      '<form id="create-form" novalidate>' +
      '<div class="field"><label for="cc-name">Character name</label><input id="cc-name" type="text" maxlength="20" placeholder="e.g. Brannic" /></div>' +
      '<fieldset class="field radio-group"><legend>Sex</legend>' +
      '<label class="radio"><input type="radio" name="cc-sex" value="male" /> Male</label>' +
      '<label class="radio"><input type="radio" name="cc-sex" value="female" /> Female</label></fieldset>' +
      '<div class="field"><label for="cc-world">World</label><select id="cc-world"><option value="">Choose a world…</option></select></div>' +
      '<div class="field"><label for="cc-outfit">Outfit</label><select id="cc-outfit"><option value="">Choose sex first…</option></select></div>' +
      '<button class="btn btn-gold btn-block" type="submit">Create character</button>' +
      '<p class="portal-msg" id="create-msg"></p>' +
      '</form>';

    api('/v1/worlds').then(function (r) {
      var sel = $('#cc-world');
      ((r.body && r.body.worlds) || []).forEach(function (w) {
        var o = document.createElement('option');
        o.value = w.world_id;
        o.textContent = w.name;
        sel.appendChild(o);
      });
    });

    function loadOutfits(sex) {
      api('/v1/outfits?sex=' + encodeURIComponent(sex)).then(function (r) {
        var sel = $('#cc-outfit');
        sel.innerHTML = '<option value="">Choose an outfit…</option>';
        ((r.body && r.body.outfits) || []).forEach(function (o) {
          var opt = document.createElement('option');
          opt.value = o.outfit_id;
          opt.textContent = o.name + (o.sprite_id ? '' : ' (art pending)');
          sel.appendChild(opt);
        });
      });
    }
    Array.prototype.forEach.call(document.getElementsByName('cc-sex'), function (radio) {
      radio.addEventListener('change', function () {
        loadOutfits(radio.value);
      });
    });

    $('#create-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var sexEl = document.querySelector('input[name="cc-sex"]:checked');
      var payload = {
        name: $('#cc-name').value.trim(),
        sex: sexEl ? sexEl.value : '',
        world_id: $('#cc-world').value,
        outfit_id: $('#cc-outfit').value,
      };
      msg('#create-msg', 'Creating…');
      api('/v1/characters', { method: 'POST', body: payload }).then(function (r) {
        if (r.networkError) return msg('#create-msg', 'Server unreachable.', 'error');
        if (r.status === 201 && r.body && r.body.ok) {
          msg('#create-msg', 'Character "' + esc(r.body.character.name) + '" created.', 'ok');
          $('#create-form').reset();
          loadCharacters();
        } else if (r.status === 403) {
          msg('#create-msg', 'Verify your email first.', 'error');
        } else {
          msg('#create-msg', (r.body && r.body.message) || 'Could not create the character.', 'error');
        }
      });
    });
  }

  function doVerify(token, msgSel) {
    if (!token) return msg(msgSel, 'Enter a token.', 'error');
    msg(msgSel, 'Verifying…');
    api('/v1/accounts/verify-email', { method: 'POST', body: { token: token } }).then(function (r) {
      if (r.networkError) return msg(msgSel, 'Server unreachable.', 'error');
      if (r.ok) return refresh();
      msg(msgSel, 'Invalid or expired token.', 'error');
    });
  }

  function refresh() {
    setHTML('<p class="muted small">Loading…</p>');
    api('/v1/accounts/me').then(function (r) {
      if (r.networkError) return renderSignedOut(true);
      if (r.status === 200 && r.body && r.body.account) return renderDashboard(r.body.account);
      renderSignedOut(false);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    root = document.getElementById('portal');
    if (!root) return;
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
    var verifyParam = new URLSearchParams(location.search).get('verify');
    if (verifyParam) {
      setHTML('<p class="muted small">Verifying your email…</p>');
      api('/v1/accounts/verify-email', { method: 'POST', body: { token: verifyParam } }).then(function () {
        refresh();
      });
      return;
    }
    refresh();
  });
})();
