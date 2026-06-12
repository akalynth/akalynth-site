/*
 * Akalynth public site behaviour.
 *
 * Static frontend only: account, character, economy, property, and receipt
 * authority live on the Akalynth API. This script calls that API and keeps only
 * non-authoritative UI state in browser storage.
 */
(function () {
  "use strict";

  var API_BASE =
    window.AKALYNTH_API_BASE ||
    (location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "http://127.0.0.1:3000"
      : "https://" + "api." + "akalynth.com");
  var CSRF_COOKIE = "akalynth_csrf";
  var CSRF_STORE = "akalynth.csrf.v1";
  var SELECTED_CHARACTER_STORE = "akalynth.selectedCharacter.v1";
  var VALID_WORLD_IDS = ["rookguard", "high_city"];
  var VALID_SEXES = ["male", "female"];
  var VALID_OUTFIT_IDS = [
    "male_wanderer",
    "male_guard",
    "male_mage",
    "female_wanderer",
    "female_guard",
    "female_mage",
  ];

  var FALLBACK_WORLDS = [
    { world_id: "rookguard", name: "Rookguard", description: "The threshold keep where every journey begins." },
    { world_id: "high_city", name: "High City", description: "The city beyond the gate." },
  ];
  var FALLBACK_OUTFITS = [
    { outfit_id: "male_wanderer", sex: "male", name: "Wanderer", sprite_id: "base_human_male_01" },
    { outfit_id: "male_guard", sex: "male", name: "City Guard", sprite_id: "guard_city_01" },
    { outfit_id: "male_mage", sex: "male", name: "Apprentice Mage", sprite_id: "mage_apprentice_01" },
    { outfit_id: "female_wanderer", sex: "female", name: "Wanderer", sprite_id: null },
    { outfit_id: "female_guard", sex: "female", name: "City Guard", sprite_id: null },
    { outfit_id: "female_mage", sex: "female", name: "Apprentice Mage", sprite_id: null },
  ];
  var SHOP_ITEMS = [
    { id: "healing_herb", name: "Healing Herb", tag: "Consumable", desc: "A server-authoritative in-game item. Bought with earned gold only.", gold: 5 },
    { id: "pilgrim_mark", name: "Pilgrim Mark", tag: "Cosmetic", desc: "A non-power mark for identity and memory. No real-money purchase.", gold: 10 },
  ];
  var HOUSE_PLOTS = [
    { property_id: "Azura:H1", zone: "Azura", plot_id: "H1", district: "Harbor Edge", primary_price_gold: 500, listed_price_gold: null, status: "unknown", owner_name: null, sale_count: 0 },
    { property_id: "Azura:H2", zone: "Azura", plot_id: "H2", district: "Market Quarter", primary_price_gold: 1000, listed_price_gold: null, status: "unknown", owner_name: null, sale_count: 0 },
    { property_id: "Azura:H3", zone: "Azura", plot_id: "H3", district: "South Gate", primary_price_gold: 2000, listed_price_gold: null, status: "unknown", owner_name: null, sale_count: 0 },
  ];

  var state = {
    account: null,
    characters: [],
    selectedCharacterId: sessionStorage.getItem(SELECTED_CHARACTER_STORE) || "",
    worlds: FALLBACK_WORLDS.slice(),
    outfits: FALLBACK_OUTFITS.slice(),
    shopItems: SHOP_ITEMS.slice(),
    propertyOverrides: {},
    workContract: null,
    goldBalance: null,
    apiOnline: null,
    message: "",
    messageKind: "info",
    resetToken: "",
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function fmt(n) {
    return Number(n || 0).toLocaleString("en-US");
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function attr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }
  function setText(sel, txt) {
    var el = $(sel);
    if (el) el.textContent = txt;
  }
  function setMessage(msg, kind) {
    state.message = msg || "";
    state.messageKind = kind || "info";
    renderAccountPortal();
  }
  function pageName() {
    return document.body ? document.body.getAttribute("data-page") || "" : "";
  }
  function validWorldId(id) {
    return VALID_WORLD_IDS.indexOf(id) !== -1;
  }
  function validSex(sex) {
    return VALID_SEXES.indexOf(sex) !== -1;
  }
  function validOutfitId(id) {
    return VALID_OUTFIT_IDS.indexOf(id) !== -1;
  }
  function validWorld(entry) {
    return !!(entry && validWorldId(entry.world_id) && typeof entry.name === "string");
  }
  function validOutfit(entry) {
    return !!(entry && validOutfitId(entry.outfit_id) && validSex(entry.sex) && typeof entry.name === "string");
  }
  function validCharacter(entry) {
    return !!(
      entry &&
      typeof entry.character_id === "string" &&
      entry.character_id &&
      typeof entry.name === "string" &&
      validWorldId(entry.world_id) &&
      validSex(entry.sex) &&
      validOutfitId(entry.outfit_id)
    );
  }

  function readCookie(name) {
    var parts = document.cookie ? document.cookie.split(";") : [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (part.indexOf(name + "=") === 0) return decodeURIComponent(part.slice(name.length + 1));
    }
    return "";
  }
  function csrfToken() {
    return readCookie(CSRF_COOKIE) || sessionStorage.getItem(CSRF_STORE) || "";
  }
  function csrfReady() {
    return !!csrfToken();
  }
  function rememberCsrf(body) {
    if (body && typeof body.csrf_token === "string" && body.csrf_token) {
      sessionStorage.setItem(CSRF_STORE, body.csrf_token);
    }
  }
  function rememberSelectedCharacter(id) {
    state.selectedCharacterId = id || "";
    if (state.selectedCharacterId) sessionStorage.setItem(SELECTED_CHARACTER_STORE, state.selectedCharacterId);
    else sessionStorage.removeItem(SELECTED_CHARACTER_STORE);
  }
  function clearAccountScopedUiState() {
    state.account = null;
    state.characters = [];
    state.goldBalance = null;
    state.workContract = null;
    rememberSelectedCharacter("");
  }
  function clearLocalSessionUi(message, kind) {
    sessionStorage.removeItem(CSRF_STORE);
    clearAccountScopedUiState();
    state.message = message;
    state.messageKind = kind || "ok";
    renderAll();
  }

  function api(path, opts) {
    opts = opts || {};
    var method = opts.method || "GET";
    var headers = { Accept: "application/json" };
    if (opts.body) headers["Content-Type"] = "application/json";
    if (method !== "GET") {
      var csrf = csrfToken();
      if (csrf) headers["x-csrf-token"] = csrf;
    }
    return fetch(API_BASE + path, {
      method: method,
      credentials: "include",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
      return res.text().then(function (text) {
        var body = {};
        try {
          body = text ? JSON.parse(text) : {};
        } catch (err) {
          body = { ok: false, error: text || res.statusText };
        }
        rememberCsrf(body);
        if (!res.ok) {
          var message = body.message || body.error || res.statusText || "Request failed";
          var e = new Error(message);
          e.status = res.status;
          e.body = body;
          throw e;
        }
        return body;
      });
    });
  }

  function apiMessage(err) {
    if (!err) return "Request failed.";
    if (err.body && (err.body.error === "character_not_found" || err.body.error === "not_found")) {
      return "This character is not available on the signed-in account. Sign in again or select an account-owned character.";
    }
    if (err.status === 401) return "Sign in first.";
    if (err.status === 403 && err.body && err.body.error === "csrf_failed") return "Security token expired. Sign in again.";
    if (err.status === 403 && err.body && err.body.error === "email_unverified") return "Verify your email before creating a character.";
    if (err.status === 403 && err.body && err.body.error === "not_owner") return "Only the account-owned character that owns this property can change it.";
    if (err.status === 400 && err.body && err.body.error === "unknown_shop_item") return "That shop item is not available.";
    if (err.status === 400 && err.body && err.body.error === "invalid_price") return "Enter a positive gold price.";
    if (err.status === 404 && err.body && err.body.error === "unknown_plot") return "That property plot was not found.";
    if (err.status === 409 && err.body && err.body.error === "already_listed") return "This property is already listed. Unlist it before listing again.";
    if (err.status === 409 && err.body && err.body.error === "not_listed") return "This property is not currently listed.";
    if (err.status === 409 && err.body && err.body.error === "not_for_sale") return "This property is not currently for sale.";
    if (err.status === 409 && err.body && err.body.error === "cannot_buy_own") return "You already own this property.";
    if (err.status === 409 && err.body && err.body.error === "already_active") return "Finish the current work contract before starting another.";
    if (err.status === 409 && err.body && err.body.error === "on_cooldown") return "Work is cooling down. Try again later.";
    if (err.status === 409 && err.body && err.body.error === "invalid_contract") return "Start work again. This contract is no longer active.";
    if (err.status === 409 && err.body && err.body.error === "insufficient_presence") return "Stay present in the world before ticking work again.";
    if (err.status === 402 && err.body && err.body.error === "insufficient_gold") return "Not enough earned gold for this action.";
    if (err.status === 404) return "That server record was not found.";
    return err.message || "Request failed.";
  }
  function accountActionBlockedMessage() {
    if (!state.account) return "Sign in first.";
    if (!csrfReady()) return "Security token missing. Sign in again before account character or gameplay actions.";
    return "";
  }
  function accountCharacterActionBlockedMessage() {
    if (!state.account) return "Sign in with an account session before creating or selecting a character.";
    if (!csrfReady()) return "Security token missing. Sign in again before creating or selecting a character.";
    return "";
  }

  // ---- Tabs (index page only) ----------------------------------------------
  function syncNavActive(name) {
    $all(".tab-btn[data-nav]").forEach(function (link) {
      var active = link.getAttribute("data-nav") === name;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }
  function activateTab(name) {
    if (!name || !document.getElementById(name)) return;
    $all(".tab-panel").forEach(function (panel) {
      var active = panel.id === name;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
    syncNavActive(name);
    if (window.location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
    var main = $("#main");
    if (main) main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function initTabs() {
    var panels = $all(".tab-panel");
    if (!panels.length) return;
    $all("[data-nav]").forEach(function (el) {
      var name = el.getAttribute("data-nav");
      if (document.getElementById(name)) {
        el.addEventListener("click", function (e) {
          e.preventDefault();
          activateTab(name);
        });
      }
    });
    window.addEventListener("hashchange", function () {
      activateTab(window.location.hash.replace("#", ""));
    });
    var initial = (window.location.hash || "").replace("#", "");
    var valid = panels.map(function (p) { return p.id; });
    activateTab(valid.indexOf(initial) !== -1 ? initial : "home");
  }

  // ---- Portal state --------------------------------------------------------
  function selectedCharacter() {
    if (!state.characters.length) return null;
    for (var i = 0; i < state.characters.length; i++) {
      if (state.characters[i].character_id === state.selectedCharacterId) return state.characters[i];
    }
    rememberSelectedCharacter(state.characters[0].character_id);
    return state.characters[0];
  }
  function worldName(id) {
    for (var i = 0; i < state.worlds.length; i++) {
      if (state.worlds[i].world_id === id) return state.worlds[i].name;
    }
    return id || "-";
  }
  function outfitName(id) {
    for (var i = 0; i < state.outfits.length; i++) {
      if (state.outfits[i].outfit_id === id) return state.outfits[i].name;
    }
    return id || "-";
  }

  function loadCatalogs() {
    return Promise.all([
      api("/v1/worlds").then(function (body) {
        var worlds = (body.worlds || []).filter(validWorld);
        if (worlds.length) state.worlds = worlds;
      }).catch(function () {}),
      api("/v1/outfits").then(function (body) {
        var outfits = (body.outfits || []).filter(validOutfit);
        if (outfits.length) state.outfits = outfits;
      }).catch(function () {}),
      api("/v1/shop/catalog").then(function (body) {
        if (body.items && body.items.length) {
          state.shopItems = body.items.map(function (item) {
            return {
              id: item.shop_key,
              name: item.name,
              tag: item.tag,
              desc: item.description,
              gold: item.price_gold,
            };
          });
        }
      }).catch(function () {}),
    ]);
  }

  function loadAccountState() {
    return api("/v1/accounts/me")
      .then(function (body) {
        state.apiOnline = true;
        state.account = body.account || null;
        return api("/v1/characters").then(function (chars) {
          state.characters = (chars.characters || []).filter(validCharacter);
          selectedCharacter();
        });
      })
      .catch(function (err) {
        if (err && err.status === 401) {
          state.apiOnline = true;
          clearAccountScopedUiState();
          return;
        }
        state.apiOnline = false;
        clearAccountScopedUiState();
      });
  }

  function loadWalletState() {
    var character = selectedCharacter();
    state.goldBalance = null;
    if (!state.account || !character) return Promise.resolve();
    return api("/v1/wallet?character_id=" + encodeURIComponent(character.character_id))
      .then(function (body) {
        state.goldBalance = typeof body.balance_gold === "number" ? body.balance_gold : null;
      })
      .catch(function () {
        state.goldBalance = null;
      });
  }

  function refreshPortal() {
    return loadCatalogs()
      .then(loadAccountState)
      .then(loadWalletState)
      .then(function () {
        renderAll();
      });
  }

  // ---- Shared chrome -------------------------------------------------------
  function renderHoldings() {
    var panel = $("#holdings-panel");
    if (!panel) return;
    var empty = $("#holdings-empty");
    var body = $("#holdings-body");
    var character = selectedCharacter();
    if (state.account && character) {
      if (empty) empty.hidden = true;
      if (body) body.hidden = false;
      setText("#holdings-name", character.name || character.character_id);
      setText("#holdings-world", worldName(character.world_id));
      setText("#holdings-gold", state.goldBalance == null ? "server" : fmt(state.goldBalance));
      setText("#holdings-premium", "Not in V1");
      renderWorkControls(body, character);
    } else {
      if (empty) empty.hidden = false;
      if (body) body.hidden = true;
    }
  }
  function workStatusText() {
    if (!state.workContract) return "Earn gold through server work contracts.";
    if (state.workContract.error) return "Work: " + state.workContract.error;
    if (state.workContract.completed) return "Work complete: +" + fmt(state.workContract.credited_gold || state.workContract.payout_gold || 0) + " gold.";
    if (state.workContract.ticks_required) return "Work: " + fmt(state.workContract.ticks_observed || 0) + "/" + fmt(state.workContract.ticks_required) + " ticks.";
    return "Work started: +" + fmt(state.workContract.payout_gold || 0) + " gold available.";
  }
  function renderWorkControls(body, character) {
    if (!body || !character) return;
    var controls = $("#work-controls", body);
    if (!controls) {
      body.insertAdjacentHTML(
        "beforeend",
        '<div class="work-controls" id="work-controls">' +
          '<p class="muted small" id="work-status"></p>' +
          '<button class="btn btn-ghost btn-block" type="button" id="work-start-btn">Start work</button>' +
          '<button class="btn btn-gold btn-block" type="button" id="work-tick-btn">Tick work</button>' +
          "</div>"
      );
      controls = $("#work-controls", body);
      $("#work-start-btn", body)?.addEventListener("click", startWork);
      $("#work-tick-btn", body)?.addEventListener("click", tickWork);
    }
    setText("#work-status", workStatusText());
  }
  function startWork() {
    var character = selectedCharacter();
    var blocked = accountActionBlockedMessage();
    if (blocked || !character) {
      state.workContract = { error: blocked || "Select a character before starting work." };
      renderHoldings();
      return;
    }
    api("/v1/work/start", { method: "POST", body: { character_id: character.character_id } })
      .then(function (body) {
        state.workContract = {
          contract_id: body.contract_id,
          payout_gold: body.payout_gold,
          ticks_observed: 0,
          ticks_required: 0,
          completed: false,
        };
        renderHoldings();
      })
      .catch(function (err) {
        state.workContract = { error: apiMessage(err) };
        renderHoldings();
      });
  }
  function tickWork() {
    var character = selectedCharacter();
    var blocked = accountActionBlockedMessage();
    if (blocked) {
      state.workContract = { contract_id: state.workContract && state.workContract.contract_id, error: blocked };
      renderHoldings();
      return;
    }
    if (!character || !state.workContract || !state.workContract.contract_id) {
      state.workContract = { error: "Start work before ticking." };
      renderHoldings();
      return;
    }
    api("/v1/work/tick", { method: "POST", body: { character_id: character.character_id, contract_id: state.workContract.contract_id } })
      .then(function (body) {
        state.workContract = {
          contract_id: body.contract_id,
          payout_gold: state.workContract && state.workContract.payout_gold,
          ticks_observed: body.ticks_observed,
          ticks_required: body.ticks_required,
          completed: body.completed === true,
          credited_gold: body.credited_gold,
        };
        if (typeof body.balance_gold === "number") state.goldBalance = body.balance_gold;
        renderHoldings();
      })
      .catch(function (err) {
        state.workContract = { contract_id: state.workContract && state.workContract.contract_id, error: apiMessage(err) };
        renderHoldings();
      });
  }
  function applyAccountGates() {
    var hasCharacter = !!(state.account && selectedCharacter());
    $all(".requires-account").forEach(function (el) {
      el.hidden = !hasCharacter;
    });
    if (document.body && document.body.hasAttribute("data-requires-account")) {
      var gate = $("#account-required");
      var content = $("#gated-content");
      if (gate) gate.hidden = hasCharacter;
      if (content) content.hidden = !hasCharacter;
    }
  }
  function renderApiStatus(root) {
    if (state.apiOnline === false) {
      root.insertAdjacentHTML(
        "afterbegin",
        '<article class="parchment portal-message portal-message--warn"><p class="lede">API unavailable</p><p>The static site loaded, but it could not reach ' +
          escapeHtml(API_BASE) +
          ". Start the local server or use the production API.</p></article>"
      );
    }
  }

  function renderBetaStatus() {
    var root = $("#beta-account-status");
    if (!root) return;
    var character = selectedCharacter();
    if (state.apiOnline === false) {
      root.innerHTML =
        '<p class="lede">API unavailable</p>' +
        '<p>The beta download is available, but this browser could not confirm your account character against ' +
        escapeHtml(API_BASE) +
        '.</p>' +
        '<p class="muted small">Account and character authority stay on the Akalynth API; no local beta readiness is assumed here.</p>';
      return;
    }
    if (state.account && character) {
      root.innerHTML =
        '<p class="lede">Ready for Android beta</p>' +
        '<p>Selected character: <strong>' +
        escapeHtml(character.name || character.character_id) +
        '</strong> in ' +
        escapeHtml(worldName(character.world_id)) +
        '.</p>' +
        '<p class="muted small">Install the Android beta, sign in with this account, and select this character to play.</p>' +
        '<a class="btn btn-gold btn-block" href="https://beta.akalynth.com/download/akalynth-beta.apk" rel="noopener" download>Download Android APK</a>';
      return;
    }
    if (state.account) {
      root.innerHTML =
        '<p class="lede">Account signed in; character still required</p>' +
        '<p>Create or select a server-backed account character before installing the beta.</p>' +
        '<a class="btn btn-gold btn-block" href="account.html">Create or select character</a>';
      return;
    }
    root.innerHTML =
      '<p class="lede">Account character required</p>' +
      '<p>Create an account, verify email, then create or select a character before entering the Android beta.</p>' +
      '<a class="btn btn-gold btn-block" href="account.html">Create account character</a>';
  }

  // ---- Account page --------------------------------------------------------
  function accountMessageHtml() {
    if (!state.message) return "";
    return '<p class="portal-inline portal-inline--' + escapeHtml(state.messageKind) + '">' + escapeHtml(state.message) + "</p>";
  }
  function authFormsHtml() {
    return (
      '<div class="portal-grid">' +
      '<article class="parchment"><p class="lede">Create account</p>' +
      '<form class="account-form" id="register-form" novalidate>' +
      '<div class="field"><label for="reg-email">Email</label><input type="email" id="reg-email" name="email" autocomplete="email" required /></div>' +
      '<div class="field"><label for="reg-password">Password</label><input type="password" id="reg-password" name="password" autocomplete="new-password" minlength="8" required /></div>' +
      '<button class="btn btn-gold btn-block" type="submit">Create account</button>' +
      '<p class="muted small">A verification link is required before character creation.</p>' +
      "</form></article>" +
      '<article class="parchment"><p class="lede">Sign in</p>' +
      '<form class="account-form" id="login-form" novalidate>' +
      '<div class="field"><label for="login-email">Email</label><input type="email" id="login-email" name="email" autocomplete="email" required /></div>' +
      '<div class="field"><label for="login-password">Password</label><input type="password" id="login-password" name="password" autocomplete="current-password" required /></div>' +
      '<button class="btn btn-gold btn-block" type="submit">Sign in</button>' +
      "</form></article>" +
      '<article class="parchment"><p class="lede">Verify email</p>' +
      '<form class="account-form" id="verify-form" novalidate>' +
      '<div class="field"><label for="verify-token">Verification token</label><input type="text" id="verify-token" name="token" autocomplete="off" /></div>' +
      '<button class="btn btn-ghost btn-block" type="submit">Verify</button>' +
      "</form></article>" +
      '<article class="parchment"><p class="lede">Reset password</p>' +
      '<form class="account-form" id="reset-request-form" novalidate>' +
      '<div class="field"><label for="reset-email">Email</label><input type="email" id="reset-email" name="email" autocomplete="email" required /></div>' +
      '<button class="btn btn-ghost btn-block" type="submit">Send reset link</button>' +
      "</form></article>" +
      "</div>"
    );
  }
  function resetConfirmHtml(token) {
    return (
      '<article class="parchment"><p class="lede">Set a new password</p>' +
      '<form class="account-form" id="reset-confirm-form" novalidate>' +
      '<input type="hidden" name="token" value="' + escapeHtml(token) + '" />' +
      '<div class="field"><label for="reset-new-password">New password</label><input type="password" id="reset-new-password" name="password" autocomplete="new-password" minlength="8" required /></div>' +
      '<button class="btn btn-gold btn-block" type="submit">Update password</button>' +
      "</form></article>"
    );
  }
  function characterCardsHtml() {
    if (!state.characters.length) {
      return '<p class="muted">No characters yet.</p>';
    }
    return (
      '<div class="character-list">' +
      state.characters
        .map(function (c) {
          var selected = selectedCharacter() && selectedCharacter().character_id === c.character_id;
          return (
            '<article class="character-card' + (selected ? " is-selected" : "") + '">' +
            '<h3 class="news-title">' + escapeHtml(c.name || c.character_id) + "</h3>" +
            '<dl class="summary-list">' +
            "<div><dt>World</dt><dd>" + escapeHtml(worldName(c.world_id)) + "</dd></div>" +
            "<div><dt>Sex</dt><dd>" + escapeHtml(c.sex || "-") + "</dd></div>" +
            "<div><dt>Outfit</dt><dd>" + escapeHtml(outfitName(c.outfit_id)) + "</dd></div>" +
            "</dl>" +
            '<button class="btn ' + (selected ? "btn-ghost" : "btn-gold") + ' btn-block" data-select-character="' + escapeHtml(c.character_id) + '">' +
            (selected ? "Selected" : "Select character") +
            "</button>" +
            (selected ? '<a class="btn btn-gold btn-block character-play-link" href="beta.html">Download Android beta</a>' : "") +
            "</article>"
          );
        })
        .join("") +
      "</div>"
    );
  }
  function createCharacterHtml() {
    if (!state.account || !state.account.email_verified) return "";
    return (
      '<article class="parchment"><p class="lede">Create character</p>' +
      '<form class="account-form" id="character-form" novalidate>' +
      '<div class="field"><label for="char-name">Character name</label><input type="text" id="char-name" name="name" maxlength="20" autocomplete="off" required /></div>' +
      '<div class="field"><label for="char-world">World</label><select id="char-world" name="world_id">' +
      state.worlds.map(function (w) { return '<option value="' + escapeHtml(w.world_id) + '">' + escapeHtml(w.name) + "</option>"; }).join("") +
      "</select></div>" +
      '<div class="field"><label for="char-sex">Sex</label><select id="char-sex" name="sex"><option value="male">Male</option><option value="female">Female</option></select></div>' +
      '<div class="field"><label for="char-outfit">Outfit</label><select id="char-outfit" name="outfit_id"></select></div>' +
      '<button class="btn btn-gold btn-block" type="submit">Create character</button>' +
      '<p class="muted small">Female outfit sprites are still pending the art lane; the server catalog already reserves the IDs.</p>' +
      "</form></article>"
    );
  }
  function dashboardHtml() {
    return (
      '<article class="parchment portal-status"><p class="lede">Signed in</p>' +
      '<dl class="summary-list">' +
      "<div><dt>Account</dt><dd>" + escapeHtml(state.account.account_id) + "</dd></div>" +
      "<div><dt>Email</dt><dd>" + (state.account.email_verified ? "Verified" : "Verification required") + "</dd></div>" +
      "<div><dt>Status</dt><dd>" + escapeHtml(state.account.status || "active") + "</dd></div>" +
      "</dl>" +
      '<button class="btn btn-ghost" id="logout-btn" type="button">Sign out</button>' +
      "</article>" +
      (!state.account.email_verified
        ? '<article class="parchment notice"><p>Verify your email before creating a character. Use the link from your email, or paste the token here.</p><form class="account-form" id="verify-form"><div class="field"><label for="verify-token">Verification token</label><input type="text" id="verify-token" name="token" /></div><button class="btn btn-gold btn-block" type="submit">Verify email</button></form></article>'
        : "") +
      '<article class="parchment"><p class="lede">Characters</p>' + characterCardsHtml() + "</article>" +
      createCharacterHtml()
    );
  }
  function renderAccountPortal() {
    var root = $("#account-portal-root");
    if (!root) return;
    root.innerHTML =
      accountMessageHtml() +
      (state.resetToken ? resetConfirmHtml(state.resetToken) : state.account ? dashboardHtml() : authFormsHtml());
    renderApiStatus(root);
    wireAccountForms(root);
  }
  function outfitOptionsFor(sex) {
    return state.outfits.filter(function (o) { return o.sex === sex; });
  }
  function syncOutfitSelect() {
    var sexEl = $("#char-sex");
    var outfitEl = $("#char-outfit");
    if (!sexEl || !outfitEl) return;
    outfitEl.innerHTML = outfitOptionsFor(sexEl.value)
      .map(function (o) {
        return '<option value="' + escapeHtml(o.outfit_id) + '">' + escapeHtml(o.name) + (o.sprite_id ? "" : " (art pending)") + "</option>";
      })
      .join("");
  }
  function formData(form) {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.name) data[el.name] = el.value;
    });
    return data;
  }
  function wireAccountForms(root) {
    var register = $("#register-form", root);
    if (register) register.addEventListener("submit", function (e) {
      e.preventDefault();
      api("/v1/accounts/register", { method: "POST", body: formData(register) })
        .then(function (body) {
          var msg = body.message || "If the account can be registered, a verification link has been sent.";
          if (body.dev_verification_token) msg += " Dev token: " + body.dev_verification_token;
          setMessage(msg, "ok");
        })
        .catch(function (err) { setMessage(apiMessage(err), "error"); });
    });

    var login = $("#login-form", root);
    if (login) login.addEventListener("submit", function (e) {
      e.preventDefault();
      api("/v1/accounts/login", { method: "POST", body: formData(login) })
        .then(function () {
          state.message = "Signed in.";
          state.messageKind = "ok";
          return refreshPortal();
        })
        .catch(function (err) { setMessage(apiMessage(err), "error"); });
    });

    var verify = $("#verify-form", root);
    if (verify) verify.addEventListener("submit", function (e) {
      e.preventDefault();
      api("/v1/accounts/verify-email", { method: "POST", body: formData(verify) })
        .then(function () {
          state.message = "Email verified.";
          state.messageKind = "ok";
          return refreshPortal();
        })
        .catch(function (err) { setMessage(apiMessage(err), "error"); });
    });

    var resetReq = $("#reset-request-form", root);
    if (resetReq) resetReq.addEventListener("submit", function (e) {
      e.preventDefault();
      api("/v1/accounts/password-reset/request", { method: "POST", body: formData(resetReq) })
        .then(function (body) {
          var msg = body.message || "If this email has an account, a reset link has been sent.";
          if (body.dev_reset_token) msg += " Dev token: " + body.dev_reset_token;
          setMessage(msg, "ok");
        })
        .catch(function (err) { setMessage(apiMessage(err), "error"); });
    });

    var resetConfirm = $("#reset-confirm-form", root);
    if (resetConfirm) resetConfirm.addEventListener("submit", function (e) {
      e.preventDefault();
      api("/v1/accounts/password-reset/confirm", { method: "POST", body: formData(resetConfirm) })
        .then(function () {
          state.resetToken = "";
          setMessage("Password updated. Sign in with the new password.", "ok");
        })
        .catch(function (err) { setMessage(apiMessage(err), "error"); });
    });

    var logout = $("#logout-btn", root);
    if (logout) logout.addEventListener("click", function () {
      api("/v1/accounts/logout", { method: "POST", body: {} })
        .then(function () {
          clearLocalSessionUi("Signed out.", "ok");
        })
        .catch(function (err) {
          clearLocalSessionUi("Signed out locally. Server logout could not be confirmed: " + apiMessage(err), "warn");
        });
    });

    $all("[data-select-character]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-select-character");
        var blocked = accountCharacterActionBlockedMessage();
        if (blocked) {
          setMessage(blocked, "error");
          return;
        }
        api("/v1/characters/select", { method: "POST", body: { character_id: id } })
          .then(function (body) {
            if (!body || body.ok !== true || !validCharacter(body.character) || typeof body.token !== "string" || !body.token) {
              throw new Error("Server returned an invalid character response.");
            }
            rememberSelectedCharacter(body.character.character_id);
            setMessage("Character selected. Download the Android beta to play.", "ok");
            return loadWalletState().then(renderAll);
          })
          .catch(function (err) { setMessage(apiMessage(err), "error"); });
      });
    });

    var sex = $("#char-sex", root);
    if (sex) {
      sex.addEventListener("change", syncOutfitSelect);
      syncOutfitSelect();
    }
    var characterForm = $("#character-form", root);
    if (characterForm) characterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = formData(characterForm);
      if (!validWorldId(data.world_id) || !validSex(data.sex) || !validOutfitId(data.outfit_id)) {
        setMessage("Select a valid world, sex, and outfit from the server catalog.", "error");
        return;
      }
      var blocked = accountCharacterActionBlockedMessage();
      if (blocked) {
        setMessage(blocked, "error");
        return;
      }
      api("/v1/characters", { method: "POST", body: data })
        .then(function (body) {
          if (!body || body.ok !== true || !validCharacter(body.character) || typeof body.token !== "string" || !body.token) {
            throw new Error("Server returned an invalid character response.");
          }
          rememberSelectedCharacter(body.character.character_id);
          state.message = "Character created. Download the Android beta to play.";
          state.messageKind = "ok";
          return refreshPortal();
        })
        .catch(function (err) { setMessage(apiMessage(err), "error"); });
    });
  }

  function handleAccountQuery() {
    var params = new URLSearchParams(location.search);
    var verify = params.get("verify");
    var reset = params.get("reset");
    if (reset) state.resetToken = reset;
    if (verify && pageName() === "account") {
      api("/v1/accounts/verify-email", { method: "POST", body: { token: verify } })
        .then(function () {
          history.replaceState(null, "", "account.html");
          state.message = "Email verified. Sign in to continue.";
          state.messageKind = "ok";
          return refreshPortal();
        })
        .catch(function (err) {
          state.message = apiMessage(err);
          state.messageKind = "error";
          renderAccountPortal();
        });
    }
  }

  // ---- Shop page -----------------------------------------------------------
  function renderShop() {
    var grid = $("#shop-grid");
    if (!grid) return;
    grid.innerHTML = state.shopItems.map(function (item) {
      return (
        '<article class="shop-card">' +
        '<div class="shop-card-art" aria-hidden="true">' + escapeHtml(item.tag.charAt(0)) + "</div>" +
        '<div class="shop-card-body">' +
        '<span class="shop-tag">' + escapeHtml(item.tag) + "</span>" +
        '<h3 class="shop-card-name">' + escapeHtml(item.name) + "</h3>" +
        '<p class="shop-card-desc">' + escapeHtml(item.desc) + "</p>" +
        '<div class="shop-card-price">' + fmt(item.gold) + ' gold<span class="usd">In-game currency only</span></div>' +
        '<button class="btn btn-gold" data-shop-buy="' + escapeHtml(item.id) + '"' + (selectedCharacter() ? "" : " disabled") + ">Buy with gold</button>" +
        '<p class="field-error" id="shop-error-' + escapeHtml(item.id) + '" aria-live="polite"></p>' +
        "</div></article>"
      );
    }).join("");
    var list = $("#cart-items");
    if (list) list.innerHTML = '<li class="cart-empty">Purchases are submitted directly to the server. No browser cart is authoritative.</li>';
    setText("#cart-count", "0");
    setText("#cart-total", "0");
    setText("#purchase-authority", "Server");
    if (grid.dataset.wired !== "1") {
      grid.addEventListener("click", function (e) {
        var btn = e.target.closest ? e.target.closest("[data-shop-buy]") : null;
        if (!btn) return;
        var itemId = btn.getAttribute("data-shop-buy");
        var character = selectedCharacter();
        var err = $("#shop-error-" + itemId);
        if (err) err.textContent = "";
        var blocked = accountActionBlockedMessage();
        if (blocked || !character) {
          if (err) err.textContent = blocked || "Select a character before buying.";
          return;
        }
        api("/v1/shop/purchase", { method: "POST", body: { character_id: character && character.character_id, shop_key: itemId } })
          .then(function (body) {
            if (typeof body.balance_gold === "number") state.goldBalance = body.balance_gold;
            if (err) err.textContent = "Purchase accepted by server.";
            renderHoldings();
          })
          .catch(function (ex) {
            if (err) err.textContent = apiMessage(ex);
          });
      });
      grid.dataset.wired = "1";
    }
  }

  // ---- Houses page ---------------------------------------------------------
  function blankHouse(plot) {
    return {
      property_id: plot.property_id,
      zone: plot.zone,
      plot_id: plot.plot_id,
      district: plot.district,
      status: plot.status,
      owner_name: plot.owner_name,
      owned_by_character: false,
      primary_price_gold: plot.primary_price_gold,
      listed_price_gold: plot.listed_price_gold,
      sale_count: plot.sale_count,
    };
  }
  function mergeHouse(target, source) {
    if (!source) return target;
    ["property_id", "zone", "plot_id", "district", "status", "owner_name", "primary_price_gold", "listed_price_gold", "sale_count", "owned_by_character"].forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(source, key) && source[key] != null) target[key] = source[key];
    });
    return target;
  }
  function rememberHouseOverride(property) {
    if (!property || typeof property.property_id !== "string" || !property.property_id) return;
    state.propertyOverrides[property.property_id] = property;
  }
  function loadHouseCards() {
    var byId = {};
    HOUSE_PLOTS.forEach(function (plot) {
      byId[plot.property_id] = blankHouse(plot);
    });

    return api("/v1/property/market")
      .then(function (body) {
        (body.listings || []).forEach(function (listing) {
          if (!byId[listing.property_id]) byId[listing.property_id] = blankHouse(listing);
          mergeHouse(byId[listing.property_id], listing);
        });
      })
      .catch(function () {})
      .then(function () {
        return Promise.all(HOUSE_PLOTS.map(function (plot) {
          return api("/v1/property/ledger?property_id=" + encodeURIComponent(plot.property_id))
            .then(function (ledger) {
              var card = byId[plot.property_id];
              if (!card) return;
              card.owner_name = ledger.owner_name || null;
              card.sale_count = typeof ledger.sale_count === "number" ? ledger.sale_count : card.sale_count;
              card.district = ledger.district || card.district;
              if (card.status === "unknown") card.status = ledger.owner_name ? "owned" : "unowned";
            })
            .catch(function () {});
        }));
      })
      .then(function () {
        Object.keys(state.propertyOverrides).forEach(function (id) {
          if (!byId[id]) byId[id] = blankHouse(state.propertyOverrides[id]);
          mergeHouse(byId[id], state.propertyOverrides[id]);
        });
        return HOUSE_PLOTS.map(function (plot) { return byId[plot.property_id]; });
      });
  }
  function houseIsMine(h) {
    var character = selectedCharacter();
    return !!(h.owned_by_character || (character && h.owner_name && h.owner_name === character.name));
  }
  function housePrice(h) {
    return h.status === "listed" && h.listed_price_gold != null ? h.listed_price_gold : h.primary_price_gold;
  }
  function houseStatusLabel(h) {
    if (houseIsMine(h) && h.status === "listed") return "Listed by you";
    if (houseIsMine(h)) return "Owned by you";
    if (h.status === "listed") return "Listed";
    if (h.status === "unowned") return "Available";
    if (h.owner_name) return "Owned";
    return "Server status pending";
  }
  function houseActionsHtml(h) {
    var character = selectedCharacter();
    var mine = houseIsMine(h);
    var price = housePrice(h);
    if (!character) {
      return '<button class="btn btn-gold btn-block" disabled>Choose a character</button>';
    }
    if ((h.status === "unowned" || h.status === "listed") && !mine) {
      return '<button class="btn btn-gold btn-block" data-house-buy="' + attr(h.property_id) + '">Buy - ' + fmt(price) + " gold</button>";
    }
    if (mine && h.status === "listed") {
      return '<button class="btn btn-ghost btn-block" data-house-unlist="' + attr(h.property_id) + '">Unlist</button>';
    }
    if (mine) {
      return (
        '<form class="resale-row" data-house-list="' + attr(h.property_id) + '" novalidate>' +
        '<label class="resale-label" for="price-' + attr(h.plot_id || h.property_id) + '">Resale price (gold)</label>' +
        '<div class="resale-controls">' +
        '<input class="resale-input" type="number" id="price-' + attr(h.plot_id || h.property_id) + '" name="price" min="1" inputmode="numeric" placeholder="e.g. ' + fmt(h.primary_price_gold) + '" />' +
        '<button class="btn btn-gold" type="submit">List</button>' +
        "</div></form>"
      );
    }
    return '<p class="resale-note">Owned' + (h.owner_name ? " by " + escapeHtml(h.owner_name) : "") + ".</p>";
  }
  function houseCardHtml(h) {
    var price = housePrice(h);
    return (
      '<header class="house-head"><h3 class="house-name">' + escapeHtml(h.district || h.plot_id || h.property_id) + '</h3><span class="house-world">' +
      escapeHtml(h.zone || "High City") + " · " + escapeHtml(h.property_id) + "</span></header>" +
      '<dl class="house-meta">' +
      "<div><dt>Plot</dt><dd>" + escapeHtml(h.plot_id || "-") + "</dd></div>" +
      "<div><dt>Price</dt><dd><span class=\"gold\">" + fmt(price) + "</span> gold</dd></div>" +
      "<div><dt>Status</dt><dd>" + escapeHtml(houseStatusLabel(h)) + "</dd></div>" +
      "<div><dt>Sales</dt><dd>" + fmt(h.sale_count || 0) + "</dd></div>" +
      "</dl>" +
      '<div class="house-bid">' + houseActionsHtml(h) + '<p class="field-error" id="house-error-' + attr(h.property_id) + '" aria-live="polite"></p></div>'
    );
  }
  function renderHouses() {
    var grid = $("#houses-grid");
    if (!grid) return;
    grid.innerHTML = '<article class="parchment"><p class="muted">Loading house market...</p></article>';
    loadHouseCards()
      .then(function (houses) {
        if (!houses.length) {
          grid.innerHTML = '<article class="parchment"><p class="muted">No server property listings are available yet.</p></article>';
          return;
        }
        grid.innerHTML = houses.map(function (h) {
          return '<article class="house-card" data-house="' + attr(h.property_id) + '">' + houseCardHtml(h) + "</article>";
        }).join("");
      })
      .catch(function () {
        grid.innerHTML = '<article class="parchment"><p class="muted">Could not reach the server property market. No local ownership preview is used.</p></article>';
      });
    if (grid.dataset.wired !== "1") {
      grid.addEventListener("click", function (e) {
        var buy = e.target.closest ? e.target.closest("[data-house-buy]") : null;
        var unlist = e.target.closest ? e.target.closest("[data-house-unlist]") : null;
        var id = buy ? buy.getAttribute("data-house-buy") : unlist ? unlist.getAttribute("data-house-unlist") : "";
        if (!id) return;
        var err = $("#house-error-" + id);
        if (err) err.textContent = "";
        var character = selectedCharacter();
        var blocked = accountActionBlockedMessage();
        if (blocked || !character) {
          if (err) err.textContent = blocked || "Select a character before changing property.";
          return;
        }
        api(buy ? "/v1/property/buy" : "/v1/property/unlist", {
          method: "POST",
          body: { character_id: character.character_id, property_id: id },
        })
          .then(function (body) {
            if (typeof body.balance_gold === "number") state.goldBalance = body.balance_gold;
            rememberHouseOverride(body.property);
            if (err) err.textContent = buy ? "Purchase accepted by server." : "Unlisted by server.";
            renderHoldings();
            renderHouses();
          })
          .catch(function (ex) {
            if (err) err.textContent = apiMessage(ex);
          });
      });
      grid.addEventListener("submit", function (e) {
        var form = e.target.closest ? e.target.closest("[data-house-list]") : null;
        if (!form) return;
        e.preventDefault();
        var id = form.getAttribute("data-house-list");
        var input = form.querySelector('input[name="price"]');
        var price = input ? parseInt(input.value, 10) : NaN;
        var err = $("#house-error-" + id);
        if (err) err.textContent = "";
        if (!Number.isInteger(price) || price < 1) {
          if (err) err.textContent = "Enter a positive gold price.";
          return;
        }
        var character = selectedCharacter();
        var blocked = accountActionBlockedMessage();
        if (blocked || !character) {
          if (err) err.textContent = blocked || "Select a character before listing property.";
          return;
        }
        api("/v1/property/list", {
          method: "POST",
          body: { character_id: character.character_id, property_id: id, price_gold: price },
        })
          .then(function (body) {
            rememberHouseOverride(body && body.property);
            if (err) err.textContent = "Listed by server.";
            renderHouses();
          })
          .catch(function (ex) {
            if (err) err.textContent = apiMessage(ex);
          });
      });
      grid.dataset.wired = "1";
    }
  }

  function renderAll() {
    renderHoldings();
    applyAccountGates();
    renderAccountPortal();
    renderBetaStatus();
    renderShop();
    renderHouses();
  }

  function initMisc() {
    var y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
  }

  // Mobile nav: close the hamburger menu after a selection or Escape.
  // No-ops where the toggle is absent (re-added after the PR #19 app.js rewrite).
  function initNav() {
    var toggle = document.getElementById("nav-toggle");
    if (!toggle) return;
    var nav = document.querySelector(".top-nav");
    if (nav) {
      nav.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest("a")) toggle.checked = false;
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") toggle.checked = false;
    });
  }

  function boot() {
    initTabs();
    initNav();
    initMisc();
    handleAccountQuery();
    refreshPortal();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
