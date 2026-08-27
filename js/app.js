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
      : /(^|\.)(beta|staging|sim)\.akalynth\.com$/.test(location.hostname)
        ? location.origin // lane sites talk to their own same-origin /v1 (proxied to the lane server)
        : "https://" + "api." + "akalynth.com");
  var DOWNLOAD_URL = "/download/akalynth-beta-v12.apk";
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
    { outfit_id: "male_wanderer", sex: "male", name: "Wanderer", sprite_id: "base_human_male_02" },
    { outfit_id: "male_guard", sex: "male", name: "City Guard", sprite_id: "guard_city_02" },
    { outfit_id: "male_mage", sex: "male", name: "Apprentice Mage", sprite_id: "mage_apprentice_02" },
    { outfit_id: "female_wanderer", sex: "female", name: "Wanderer", sprite_id: "base_human_female_01" },
    { outfit_id: "female_guard", sex: "female", name: "City Guard", sprite_id: "guard_city_female_01" },
    { outfit_id: "female_mage", sex: "female", name: "Apprentice Mage", sprite_id: "mage_apprentice_female_01" },
  ];
  // Source-backed by the current High City map contract. The public market omits
  // owned, unlisted plots, so their public ledgers are queried by these stable
  // property ids. Fixture fields are rendered only after the market request and
  // matching ledger request both succeed; they are never an offline ownership
  // fallback.
  var KNOWN_PROPERTY_FIXTURES = [
    { property_id: "Azura:H1", zone: "Azura", plot_id: "H1", district: "Harbor Edge", primary_price_gold: 500 },
    { property_id: "Azura:H2", zone: "Azura", plot_id: "H2", district: "Market Quarter", primary_price_gold: 1000 },
    { property_id: "Azura:H3", zone: "Azura", plot_id: "H3", district: "South Gate", primary_price_gold: 2000 },
  ];

  var state = {
    account: null,
    characters: [],
    selectedCharacterId: sessionStorage.getItem(SELECTED_CHARACTER_STORE) || "",
    worlds: FALLBACK_WORLDS.slice(),
    outfits: FALLBACK_OUTFITS.slice(),
    shopItems: [],
    shopStatus: "loading",
    purchaseStatus: "",
    purchaseStatusKind: "info",
    marketStatus: "idle",
    marketMessage: "",
    marketMessageKind: "info",
    marketRequest: 0,
    pendingMutations: {},
    currentHouses: [],
    workContract: null,
    goldBalance: null,
    apiOnline: null,
    message: "",
    messageKind: "info",
    resetToken: "",
    accountView: "",
    betaCohort: null,
  };
  var betaStatusRequestGeneration = 0;

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
    var nextId = id || "";
    if (nextId !== state.selectedCharacterId) {
      state.purchaseStatus = "";
      state.purchaseStatusKind = "info";
      state.marketMessage = "";
      state.marketMessageKind = "info";
    }
    state.selectedCharacterId = nextId;
    if (state.selectedCharacterId) sessionStorage.setItem(SELECTED_CHARACTER_STORE, state.selectedCharacterId);
    else sessionStorage.removeItem(SELECTED_CHARACTER_STORE);
  }
  function clearAccountScopedUiState() {
    betaStatusRequestGeneration += 1;
    state.account = null;
    state.characters = [];
    state.goldBalance = null;
    state.workContract = null;
    state.betaCohort = null;
    state.purchaseStatus = "";
    state.purchaseStatusKind = "info";
    state.marketMessage = "";
    state.marketMessageKind = "info";
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
    if ((err.status === 402 || err.status === 409) && err.body && err.body.error === "insufficient_gold") return "Not enough earned gold for this action.";
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
  function mutationKey(kind, id) {
    return kind + ":" + id;
  }
  function mutationPending(kind, id) {
    return state.pendingMutations[mutationKey(kind, id)] === true;
  }
  function beginMutation(kind, id) {
    var key = mutationKey(kind, id);
    if (state.pendingMutations[key]) return false;
    state.pendingMutations[key] = true;
    return true;
  }
  function endMutation(kind, id) {
    delete state.pendingMutations[mutationKey(kind, id)];
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
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    wireReveals();
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
    state.shopStatus = "loading";
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
        if (!Array.isArray(body.items)) throw new Error("invalid_shop_catalog");
        var items = body.items.map(function (item) {
          return {
            id: item && item.shop_key,
            name: item && item.name,
            tag: item && item.tag,
            desc: item && item.description,
            gold: item && item.price_gold,
            currency: item && item.currency,
          };
        });
        var validItems = items.filter(function (item) {
          return !!(
            typeof item.id === "string" && item.id &&
            typeof item.name === "string" && item.name &&
            typeof item.tag === "string" && item.tag &&
            typeof item.desc === "string" && item.desc &&
            item.currency === "gold" &&
            Number.isInteger(item.gold) && item.gold >= 0
          );
        });
        if (validItems.length !== items.length) throw new Error("invalid_shop_catalog_item");
        state.shopItems = validItems;
        state.shopStatus = "ready";
      }).catch(function () {
        state.shopItems = [];
        state.shopStatus = "error";
      }),
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
    if (!state.account || !character) return Promise.resolve(false);
    return api("/v1/wallet?character_id=" + encodeURIComponent(character.character_id))
      .then(function (body) {
        state.goldBalance = typeof body.balance_gold === "number" ? body.balance_gold : null;
        return state.goldBalance != null;
      })
      .catch(function () {
        state.goldBalance = null;
        return false;
      });
  }

  function refreshLibraryDiscovery() {
    if (pageName() !== "library") return Promise.resolve();
    if (!state.account || !state.selectedCharacterId) return Promise.resolve();
    return api("/v1/library/discovery?character_id=" + encodeURIComponent(state.selectedCharacterId))
      .then(function (body) {
        if (window.AKALYNTH_APPLY_LIBRARY_DISCOVERY) window.AKALYNTH_APPLY_LIBRARY_DISCOVERY(body);
      })
      .catch(function () {});
  }

  function refreshPortal() {
    return loadCatalogs()
      .then(loadAccountState)
      .then(loadWalletState)
      .then(function () {
        renderAll();
        void refreshControlledBetaStatus();
        return refreshLibraryDiscovery();
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
      setText("#holdings-premium", "Not connected");
    } else {
      if (empty) empty.hidden = false;
      if (body) body.hidden = true;
    }
  }
  function renderIdentityControls() {
    var character = selectedCharacter();
    var label = state.account && character
      ? character.name
      : state.account
        ? (state.account.handle || "ACCOUNT")
        : "SIGN IN";
    $all("#account-summary").forEach(function (summary) {
      summary.textContent = label;
      summary.setAttribute("aria-label", state.account ? "Open account menu for " + label : "Open sign in menu");
    });
    $all("#chrome-signout").forEach(function (button) {
      button.hidden = !state.account;
    });
    setText("#community-identity", state.account && character
      ? "Reading as " + character.name + ". Posting remains locked."
      : "Sign in to show your selected companion identity.");
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
  function signOut() {
    if (!state.account) {
      location.href = "account.html";
      return Promise.resolve(null);
    }
    return api("/v1/accounts/logout", { method: "POST", body: {} })
      .then(function () {
        clearLocalSessionUi("Signed out.", "ok");
        return true;
      })
      .catch(function (err) {
        clearLocalSessionUi("Signed out locally. Server logout could not be confirmed: " + apiMessage(err), "warn");
        return null;
      });
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
  function buyShopItem(itemId, err) {
    var character = selectedCharacter();
    if (err) err.textContent = "";
    state.purchaseStatus = "";
    state.purchaseStatusKind = "info";
    var blocked = accountActionBlockedMessage();
    if (blocked || !character) {
      if (err) err.textContent = blocked || "Select a character before buying.";
      return Promise.resolve(null);
    }
    if (!beginMutation("shop", itemId)) {
      if (err) err.textContent = "This purchase is already pending.";
      return Promise.resolve(null);
    }
    renderShop();
    var accepted = null;
    return api("/v1/shop/purchase", { method: "POST", body: { character_id: character.character_id, shop_key: itemId } })
      .then(function (body) {
        accepted = body;
        if (typeof body.balance_gold === "number") state.goldBalance = body.balance_gold;
        return loadWalletState();
      })
      .then(function (refreshed) {
        state.purchaseStatus = refreshed
          ? "Purchase accepted by the server; balance refreshed."
          : "The server accepted the purchase, but the balance refresh failed. Do not submit it again; refresh the page.";
        state.purchaseStatusKind = refreshed ? "ok" : "warn";
        if (err) err.textContent = state.purchaseStatus;
        var status = $("#cart-items");
        if (status) status.innerHTML = '<li class="cart-empty">' + escapeHtml(state.purchaseStatus) + ' Inventory authority remains in the Android client.</li>';
        return accepted;
      })
      .catch(function (ex) {
        state.purchaseStatus = apiMessage(ex);
        state.purchaseStatusKind = "error";
        if (err) err.textContent = state.purchaseStatus;
        return null;
      })
      .then(function (result) {
        endMutation("shop", itemId);
        renderHoldings();
        renderShop();
        return result;
      });
  }
  function changeProperty(id, buy, err) {
    var character = selectedCharacter();
    if (err) err.textContent = "";
    state.marketMessage = "";
    state.marketMessageKind = "info";
    var blocked = accountActionBlockedMessage();
    if (blocked || !character) {
      if (err) err.textContent = blocked || "Select a character before changing property.";
      return Promise.resolve(null);
    }
    var kind = buy ? "property-buy" : "property-unlist";
    if (!beginMutation(kind, id)) {
      if (err) err.textContent = "This property change is already pending.";
      return Promise.resolve(null);
    }
    var accepted = null;
    return api(buy ? "/v1/property/buy" : "/v1/property/unlist", {
      method: "POST",
      body: { character_id: character.character_id, property_id: id },
    })
      .then(function (body) {
        accepted = body;
        if (typeof body.balance_gold === "number") state.goldBalance = body.balance_gold;
        return Promise.all([loadWalletState(), loadHouseCards()])
          .then(function (results) { return results[0] === true; })
          .catch(function () { return false; });
      })
      .then(function (refreshed) {
        state.marketMessage = refreshed
          ? (buy ? "Purchase accepted; balance and registry refreshed." : "Listing removed; registry refreshed.")
          : "The server accepted the change, but the balance or registry refresh failed. Do not submit it again; refresh the page.";
        state.marketMessageKind = refreshed ? "ok" : "warn";
        if (err) err.textContent = refreshed
          ? (buy ? "Purchase accepted; registry refreshed." : "Unlisted; registry refreshed.")
          : "The server accepted the change, but the balance or registry refresh failed. Do not submit it again; refresh the page.";
        return accepted;
      })
      .catch(function (ex) {
        state.marketMessage = apiMessage(ex);
        state.marketMessageKind = "error";
        if (err) err.textContent = state.marketMessage;
        return null;
      })
      .then(function (result) {
        endMutation(kind, id);
        renderHoldings();
        renderHouses();
        return result;
      });
  }
  function listProperty(id, price, err) {
    if (err) err.textContent = "";
    state.marketMessage = "";
    state.marketMessageKind = "info";
    if (!Number.isInteger(price) || price < 1 || price > 1000000) {
      if (err) err.textContent = "Enter a whole-gold price from 1 to 1,000,000.";
      return Promise.resolve(null);
    }
    var character = selectedCharacter();
    var blocked = accountActionBlockedMessage();
    if (blocked || !character) {
      if (err) err.textContent = blocked || "Select a character before listing property.";
      return Promise.resolve(null);
    }
    if (!beginMutation("property-list", id)) {
      if (err) err.textContent = "This listing is already pending.";
      return Promise.resolve(null);
    }
    var accepted = null;
    return api("/v1/property/list", {
      method: "POST",
      body: { character_id: character.character_id, property_id: id, price_gold: price },
    })
      .then(function (body) {
        accepted = body;
        return loadHouseCards()
          .then(function () { return true; })
          .catch(function () { return false; });
      })
      .then(function (refreshed) {
        state.marketMessage = refreshed
          ? "Listing accepted; registry refreshed."
          : "The server accepted the listing, but the registry refresh failed. Do not submit it again; refresh the page.";
        state.marketMessageKind = refreshed ? "ok" : "warn";
        if (err) err.textContent = refreshed
          ? "Listed; registry refreshed."
          : "The server accepted the listing, but the registry refresh failed. Do not submit it again; refresh the page.";
        return accepted;
      })
      .catch(function (ex) {
        state.marketMessage = apiMessage(ex);
        state.marketMessageKind = "error";
        if (err) err.textContent = state.marketMessage;
        return null;
      })
      .then(function (result) {
        endMutation("property-list", id);
        renderHouses();
        return result;
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

  // ---- Account page --------------------------------------------------------
  function accountMessageHtml() {
    if (!state.message) return "";
    return '<p class="portal-inline portal-inline--' + escapeHtml(state.messageKind) + '">' + escapeHtml(state.message) + "</p>";
  }
  function registrationPayload(data) {
    var payload = {
      handle: data.handle,
      email: data.email,
      password: data.password,
    };
    var invite = typeof data.invite_code === "string" ? data.invite_code.trim() : "";
    if (invite) payload.invite_code = invite;
    return payload;
  }
  function registerCardHtml() {
    return (
      '<article class="parchment"><p class="lede">Create account</p>' +
      '<form class="account-form" id="register-form" novalidate>' +
      '<div class="field"><label for="reg-invite">Invite code <span class="muted small">(if provided)</span></label><input type="text" id="reg-invite" name="invite_code" autocomplete="off" spellcheck="false" placeholder="Paste your invite code" /></div>' +
      '<div class="field"><label for="reg-handle">Nickname</label><input type="text" id="reg-handle" name="handle" autocomplete="username" minlength="3" maxlength="32" required /></div>' +
      '<div class="field"><label for="reg-email">Email <span class="muted small">(optional)</span></label><input type="email" id="reg-email" name="email" autocomplete="email" /></div>' +
      '<div class="field"><label for="reg-password">Password</label><input type="password" id="reg-password" name="password" autocomplete="new-password" minlength="8" required /></div>' +
      '<button class="btn btn-gold btn-block" type="submit">Create account</button>' +
      '<p class="muted small">Pick a unique nickname. Email is optional and can be verified later for password recovery — without an email there is no recovery.</p>' +
      "</form></article>"
    );
  }
  function resetRequestCardHtml() {
    return (
      '<article class="parchment"><p class="lede">Reset password</p>' +
      '<form class="account-form" id="reset-request-form" novalidate>' +
      '<div class="field"><label for="reset-email">Email</label><input type="email" id="reset-email" name="email" autocomplete="email" required /></div>' +
      '<button class="btn btn-ghost btn-block" type="submit">Send reset link</button>' +
      "</form></article>"
    );
  }
  function authRouteLinksHtml() {
    return (
      '<article class="parchment"><p class="muted small"><a href="account.html">Sign in</a> · ' +
      '<a href="register.html">Create account</a> · <a href="forgot.html">Forgot password</a></p></article>'
    );
  }
  function authFormsHtml() {
    var registerCard = registerCardHtml();
    var resetCard = resetRequestCardHtml();
    if (state.accountView === "register") {
      return '<div class="portal-grid">' + registerCard + authRouteLinksHtml() + "</div>";
    }
    if (state.accountView === "forgot") {
      return '<div class="portal-grid">' + resetCard + authRouteLinksHtml() + "</div>";
    }
    return (
      '<div class="portal-grid">' +
      registerCard +
      '<article class="parchment"><p class="lede">Sign in</p>' +
      '<form class="account-form" id="login-form" novalidate>' +
      '<div class="field"><label for="login-identifier">Nickname or email</label><input type="text" id="login-identifier" name="identifier" autocomplete="username" required /></div>' +
      '<div class="field"><label for="login-password">Password</label><input type="password" id="login-password" name="password" autocomplete="current-password" required /></div>' +
      '<button class="btn btn-gold btn-block" type="submit">Sign in</button>' +
      "</form></article>" +
      '<article class="parchment"><p class="lede">Verify email</p>' +
      '<form class="account-form" id="verify-form" novalidate>' +
      '<div class="field"><label for="verify-token">Verification token</label><input type="text" id="verify-token" name="token" autocomplete="off" /></div>' +
      '<button class="btn btn-ghost btn-block" type="submit">Verify</button>' +
      "</form></article>" +
      resetCard +
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
            (selected
              ? '<a class="btn btn-gold btn-block character-play-link" href="' + DOWNLOAD_URL + '" download>Download / open Akalynth on Android</a>' +
                '<a class="btn btn-ghost btn-block" href="download.html">Android install notes</a>'
              : "") +
            "</article>"
          );
        })
        .join("") +
      "</div>"
    );
  }
  function createCharacterHtml() {
    // Email verification is a later, non-blocking lane — characters can be created
    // on an unverified or email-less (nickname-only) account.
    if (!state.account) return "";
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
      '<p class="muted small">World and outfit choices are limited to the source-backed catalog.</p>' +
      "</form></article>"
    );
  }
  function dashboardHtml() {
    var hasEmail = !!state.account.has_email;
    var emailStatus = !hasEmail ? "None (no recovery)" : state.account.email_verified ? "Verified" : "Unverified";
    var nicknameRow = state.account.handle
      ? "<div><dt>Nickname</dt><dd>" + escapeHtml(state.account.handle) + "</dd></div>"
      : "";
    var verifyNotice = "";
    if (hasEmail && !state.account.email_verified) {
      verifyNotice = '<article class="parchment notice"><p>Optional: verify your email to enable password recovery. Use the link from your email, or paste the token here.</p><form class="account-form" id="verify-form"><div class="field"><label for="verify-token">Verification token</label><input type="text" id="verify-token" name="token" /></div><button class="btn btn-gold btn-block" type="submit">Verify email</button></form></article>';
    } else if (!hasEmail) {
      verifyNotice = '<article class="parchment notice"><p class="muted small">No email is set on this account, so password recovery is unavailable. Keep your password safe.</p></article>';
    }
    return (
      '<article class="parchment portal-status"><p class="lede">Signed in</p>' +
      '<dl class="summary-list">' +
      nicknameRow +
      "<div><dt>Account</dt><dd>" + escapeHtml(state.account.account_id) + "</dd></div>" +
      "<div><dt>Email</dt><dd>" + escapeHtml(emailStatus) + "</dd></div>" +
      "<div><dt>Status</dt><dd>" + escapeHtml(state.account.status || "active") + "</dd></div>" +
      "</dl>" +
      '<button class="btn btn-ghost" id="logout-btn" type="button">Sign out</button>' +
      "</article>" +
      verifyNotice +
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
  function renderControlledBetaStatus() {
    // The cohort endpoint is retained for operational compatibility, but it is
    // intentionally not a public product or distribution surface.
  }
  function refreshControlledBetaStatus() {
    var requestGeneration = ++betaStatusRequestGeneration;
    var accountId =
      state.account && typeof state.account.account_id === "string"
        ? state.account.account_id
        : "";
    state.betaCohort = null;
    renderControlledBetaStatus();
    if (!accountId) {
      return Promise.resolve(null);
    }
    return api("/v1/beta/me")
      .then(function (body) {
        if (
          requestGeneration !== betaStatusRequestGeneration ||
          !state.account ||
          state.account.account_id !== accountId
        ) {
          return;
        }
        var cohort = body && body.cohort;
        if (
          cohort &&
          typeof cohort.cohort_id === "string" &&
          typeof cohort.release_commit === "string"
        ) {
          state.betaCohort = {
            cohort_id: cohort.cohort_id,
            release_commit: cohort.release_commit,
          };
        }
      })
      .catch(function () {
        if (
          requestGeneration === betaStatusRequestGeneration &&
          state.account &&
          state.account.account_id === accountId
        ) {
          state.betaCohort = null;
        }
      })
      .then(function () {
        if (
          requestGeneration !== betaStatusRequestGeneration ||
          !state.account ||
          state.account.account_id !== accountId
        ) {
          return null;
        }
        renderControlledBetaStatus();
        return state.betaCohort;
      });
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
  function lockForm(form) {
    if (!form || form.dataset.pending === "1") return false;
    form.dataset.pending = "1";
    var submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    return true;
  }
  function unlockForm(form) {
    if (!form) return;
    delete form.dataset.pending;
    var submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = false;
  }
  function selectAccountCharacter(id) {
    var blocked = accountCharacterActionBlockedMessage();
    if (blocked) {
      setMessage(blocked, "error");
      return Promise.resolve(null);
    }
    if (!beginMutation("character-select", id)) return Promise.resolve(null);
    return api("/v1/characters/select", { method: "POST", body: { character_id: id } })
      .then(function (body) {
        if (!body || body.ok !== true || !validCharacter(body.character) || typeof body.token !== "string" || !body.token) {
          throw new Error("Server returned an invalid character response.");
        }
        rememberSelectedCharacter(body.character.character_id);
        setMessage("Character selected. Continue in Akalynth on Android.", "ok");
        return loadWalletState().then(function () {
          renderAll();
          return body;
        });
      })
      .catch(function (err) {
        setMessage(apiMessage(err), "error");
        return null;
      })
      .then(function (result) {
        endMutation("character-select", id);
        return result;
      });
  }
  function createAccountCharacter(data) {
    if (!validWorldId(data.world_id) || !validSex(data.sex) || !validOutfitId(data.outfit_id)) {
      setMessage("Select a valid world, sex, and outfit from the server catalog.", "error");
      return Promise.resolve(null);
    }
    var blocked = accountCharacterActionBlockedMessage();
    if (blocked) {
      setMessage(blocked, "error");
      return Promise.resolve(null);
    }
    var createKey = typeof data.name === "string" ? data.name : "new";
    if (!beginMutation("character-create", createKey)) return Promise.resolve(null);
    return api("/v1/characters", { method: "POST", body: data })
      .then(function (body) {
        if (!body || body.ok !== true || !validCharacter(body.character) || typeof body.token !== "string" || !body.token) {
          throw new Error("Server returned an invalid character response.");
        }
        rememberSelectedCharacter(body.character.character_id);
        state.message = "Character created. Continue in Akalynth on Android.";
        state.messageKind = "ok";
        return refreshPortal().then(function () {
          return body;
        });
      })
      .catch(function (err) {
        setMessage(apiMessage(err), "error");
        return null;
      })
      .then(function (result) {
        endMutation("character-create", createKey);
        return result;
      });
  }
  function wireAccountForms(root) {
    var register = $("#register-form", root);
    if (register) register.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!lockForm(register)) return;
      api("/v1/accounts/register", { method: "POST", body: registrationPayload(formData(register)) })
        .then(function (body) {
          var msg;
          if (body.account && body.account.handle) {
            msg = "Account created — nickname " + body.account.handle + ". Sign in to continue.";
            if (body.recovery === "none") msg += " No email set, so there is no password recovery.";
          } else {
            msg = body.message || "If the account can be registered, a verification link has been sent.";
          }
          if (body.dev_verification_token) msg += " Dev token: " + body.dev_verification_token;
          setMessage(msg, "ok");
        })
        .catch(function (err) { setMessage(apiMessage(err), "error"); })
        .then(function () { unlockForm(register); });
    });

    var login = $("#login-form", root);
    if (login) login.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!lockForm(login)) return;
      api("/v1/accounts/login", { method: "POST", body: formData(login) })
        .then(function () {
          state.message = "Signed in.";
          state.messageKind = "ok";
          return refreshPortal();
        })
        .catch(function (err) { setMessage(apiMessage(err), "error"); })
        .then(function () { unlockForm(login); });
    });

    var verify = $("#verify-form", root);
    if (verify) verify.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!lockForm(verify)) return;
      api("/v1/accounts/verify-email", { method: "POST", body: formData(verify) })
        .then(function () {
          state.message = "Email verified.";
          state.messageKind = "ok";
          return refreshPortal();
        })
        .catch(function (err) { setMessage(apiMessage(err), "error"); })
        .then(function () { unlockForm(verify); });
    });

    var resetReq = $("#reset-request-form", root);
    if (resetReq) resetReq.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!lockForm(resetReq)) return;
      api("/v1/accounts/password-reset/request", { method: "POST", body: formData(resetReq) })
        .then(function (body) {
          var msg = body.message || "If this email has an account, a reset link has been sent.";
          if (body.dev_reset_token) msg += " Dev token: " + body.dev_reset_token;
          setMessage(msg, "ok");
        })
        .catch(function (err) { setMessage(apiMessage(err), "error"); })
        .then(function () { unlockForm(resetReq); });
    });

    var resetConfirm = $("#reset-confirm-form", root);
    if (resetConfirm) resetConfirm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!lockForm(resetConfirm)) return;
      api("/v1/accounts/password-reset/confirm", { method: "POST", body: formData(resetConfirm) })
        .then(function () {
          state.resetToken = "";
          setMessage("Password updated. Sign in with the new password.", "ok");
        })
        .catch(function (err) { setMessage(apiMessage(err), "error"); })
        .then(function () { unlockForm(resetConfirm); });
    });

    var logout = $("#logout-btn", root);
    if (logout) logout.addEventListener("click", function () {
      logout.disabled = true;
      signOut().then(function () { logout.disabled = false; });
    });

    $all("[data-select-character]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-select-character");
        selectAccountCharacter(id);
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
      if (!lockForm(characterForm)) return;
      createAccountCharacter(formData(characterForm)).then(function () { unlockForm(characterForm); });
    });
  }

  function handleAccountQuery() {
    var params = new URLSearchParams(location.search);
    var fragment = location.hash && location.hash.charAt(0) === "#"
      ? new URLSearchParams(location.hash.slice(1))
      : new URLSearchParams();
    var verify = params.get("verify");
    var reset = fragment.get("reset");
    var view = params.get("view");
    if (view === "register" || view === "forgot") state.accountView = view;
    if (reset) state.resetToken = reset;
    if (
      pageName() === "account" &&
      (verify || reset || view || params.has("invite") || params.has("reset"))
    ) {
      history.replaceState(null, "", "account.html");
    }
    if (verify && pageName() === "account") {
      api("/v1/accounts/verify-email", { method: "POST", body: { token: verify } })
        .then(function () {
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
  function findShopItem(itemId) {
    for (var i = 0; i < state.shopItems.length; i++) {
      if (state.shopItems[i].id === itemId) return state.shopItems[i];
    }
    return null;
  }
  function openShopConfirmation(itemId) {
    var item = findShopItem(itemId);
    var character = selectedCharacter();
    var dialog = $("#shop-confirm-dialog");
    if (!item || !dialog || !character) return;
    dialog.dataset.itemId = itemId;
    setText("#shop-confirm-character", character.name);
    setText("#shop-confirm-item", item.name);
    setText("#shop-confirm-price", fmt(item.gold) + " gold");
    setText("#shop-confirm-balance", state.goldBalance == null ? "Server will confirm" : fmt(state.goldBalance) + " gold");
    setText("#shop-confirm-result", projectedBalanceText(state.goldBalance, item.gold));
    setText("#shop-confirm-error", "");
    if (typeof dialog.showModal === "function") dialog.showModal();
  }
  function renderShop() {
    var grid = $("#shop-grid");
    if (!grid) return;
    var status = $("#shop-status");
    if (state.shopStatus === "loading") {
      grid.innerHTML = '<article class="parchment"><p class="muted">Loading the server catalog…</p></article>';
      if (status) { status.textContent = "Loading the server catalog…"; status.dataset.kind = "info"; }
      return;
    }
    if (state.shopStatus === "error") {
      grid.innerHTML = '<article class="parchment"><p class="lede">Catalog unavailable</p><p>No local products or prices are substituted.</p></article>';
      if (status) { status.textContent = "The Coin Exchange could not reach the server catalog."; status.dataset.kind = "error"; }
      return;
    }
    if (!state.shopItems.length) {
      grid.innerHTML = '<article class="parchment"><p class="muted">The server catalog is currently empty.</p></article>';
      if (status) { status.textContent = "The server returned an empty catalog."; status.dataset.kind = "ok"; }
      return;
    }
    var character = selectedCharacter();
    if (status) {
      status.textContent = state.purchaseStatus || (character
        ? "Catalog loaded. Purchases use " + character.name + " and require server acceptance."
        : "Catalog loaded. Sign in and select a character to purchase.");
      status.dataset.kind = state.purchaseStatus ? state.purchaseStatusKind : "info";
    }
    grid.innerHTML = state.shopItems.map(function (item) {
      var pending = mutationPending("shop", item.id);
      return (
        '<article class="shop-card">' +
        '<div class="shop-card-art" aria-hidden="true">' + escapeHtml(item.tag.charAt(0)) + "</div>" +
        '<div class="shop-card-body">' +
        '<span class="shop-tag">' + escapeHtml(item.tag) + "</span>" +
        '<h3 class="shop-card-name">' + escapeHtml(item.name) + "</h3>" +
        '<p class="shop-card-desc">' + escapeHtml(item.desc) + "</p>" +
        '<div class="shop-card-price">' + fmt(item.gold) + ' gold<span class="usd">In-game currency only</span></div>' +
        '<button class="btn btn-gold" data-shop-review="' + escapeHtml(item.id) + '"' + (character && !pending ? "" : " disabled") + ">" +
        (pending ? "Awaiting server…" : character ? "Review purchase" : "Select a character") + "</button>" +
        '<p class="field-error" id="shop-error-' + escapeHtml(item.id) + '" aria-live="polite"></p>' +
        "</div></article>"
      );
    }).join("");
    wireReveals();
    var list = $("#cart-items");
    if (list) list.innerHTML = '<li class="cart-empty">' + escapeHtml(state.purchaseStatus || "No purchase submitted. No browser cart is authoritative.") + "</li>";
    setText("#cart-count", "0");
    setText("#cart-total", "0");
    setText("#purchase-authority", "Server");
    if (grid.dataset.wired !== "1") {
      grid.addEventListener("click", function (e) {
        var btn = e.target.closest ? e.target.closest("[data-shop-review]") : null;
        if (!btn) return;
        openShopConfirmation(btn.getAttribute("data-shop-review"));
      });
      grid.dataset.wired = "1";
    }
    var confirm = $("#shop-confirm-submit");
    if (confirm && confirm.dataset.wired !== "1") {
      confirm.addEventListener("click", function () {
        var dialog = $("#shop-confirm-dialog");
        var itemId = dialog ? dialog.dataset.itemId : "";
        var err = $("#shop-confirm-error");
        if (!itemId || mutationPending("shop", itemId)) return;
        confirm.disabled = true;
        buyShopItem(itemId, err).then(function (body) {
          confirm.disabled = false;
          if (body) {
            if (dialog && dialog.open) dialog.close();
          }
        });
      });
      confirm.dataset.wired = "1";
    }
  }

  // ---- House Registry ------------------------------------------------------
  function safeOwnerName(value) {
    if (typeof value !== "string") return null;
    var owner = value.trim();
    if (!owner) return null;
    if (/^(p_|player_|guest_|acct_|account_)/i.test(owner)) return "Private owner";
    return owner.slice(0, 64);
  }
  function projectedBalanceText(balance, price) {
    if (balance == null) return "Server will confirm";
    if (balance < price) return "Insufficient by " + fmt(price - balance) + " gold";
    return fmt(balance - price) + " gold";
  }
  function validMarketListing(listing) {
    return !!(
      listing &&
      typeof listing.property_id === "string" && listing.property_id &&
      typeof listing.zone === "string" &&
      typeof listing.plot_id === "string" &&
      (listing.status === "unowned" || listing.status === "owned" || listing.status === "listed") &&
      Number.isInteger(listing.primary_price_gold) && listing.primary_price_gold >= 0 &&
      (listing.listed_price_gold == null || (Number.isInteger(listing.listed_price_gold) && listing.listed_price_gold >= 0))
    );
  }
  function blankHouse(source) {
    return {
      property_id: source.property_id,
      zone: source.zone,
      plot_id: source.plot_id,
      district: typeof source.district === "string" ? source.district : null,
      status: source.status,
      owner_name: safeOwnerName(source.owner_name),
      owned_by_character: source.owned_by_character === true,
      primary_price_gold: source.primary_price_gold,
      listed_price_gold: Number.isFinite(source.listed_price_gold) ? source.listed_price_gold : null,
      sale_count: Number.isFinite(source.sale_count) ? source.sale_count : null,
    };
  }
  function loadHouseCards() {
    state.marketStatus = "loading";
    return api("/v1/property/market")
      .then(function (body) {
        if (!Array.isArray(body.listings)) throw new Error("invalid_property_market");
        var validListings = body.listings.filter(validMarketListing);
        if (validListings.length !== body.listings.length) throw new Error("invalid_property_market_listing");
        var byId = {};
        validListings.map(blankHouse).forEach(function (house) { byId[house.property_id] = house; });
        var ids = KNOWN_PROPERTY_FIXTURES.map(function (fixture) { return fixture.property_id; });
        validListings.forEach(function (listing) {
          if (ids.indexOf(listing.property_id) === -1) ids.push(listing.property_id);
        });
        return Promise.all(ids.map(function (propertyId) {
          return api("/v1/property/ledger?property_id=" + encodeURIComponent(propertyId))
            .then(function (ledger) {
              if (!ledger || ledger.property_id !== propertyId) throw new Error("invalid_property_ledger");
              var house = byId[propertyId];
              if (!house) {
                var fixture = KNOWN_PROPERTY_FIXTURES.filter(function (entry) { return entry.property_id === propertyId; })[0];
                var owner = safeOwnerName(ledger.owner_name);
                if (!fixture || !owner) return null;
                house = blankHouse({
                  property_id: fixture.property_id,
                  zone: fixture.zone,
                  plot_id: fixture.plot_id,
                  district: fixture.district,
                  status: "owned",
                  owner_name: owner,
                  primary_price_gold: fixture.primary_price_gold,
                  listed_price_gold: null,
                });
              }
              house.owner_name = safeOwnerName(ledger.owner_name);
              house.sale_count = Number.isInteger(ledger.sale_count) && ledger.sale_count >= 0 ? ledger.sale_count : null;
              house.district = typeof ledger.district === "string" ? ledger.district : house.district;
              return house;
            })
            .catch(function () { return byId[propertyId] || null; });
        })).then(function (houses) {
          return houses.filter(Boolean);
        });
      })
      .then(function (houses) {
        state.currentHouses = houses;
        state.marketStatus = "ready";
        return houses;
      })
      .catch(function (err) {
        state.currentHouses = [];
        state.marketStatus = "error";
        throw err;
      });
  }
  function houseIsMine(h) {
    var character = selectedCharacter();
    // Public market data exposes the resolved character name, not a player id.
    // Character names are globally unique in the authoritative player schema;
    // this controls presentation only. Every mutation is re-authorized by the
    // account-scoped server route before ownership can change.
    return !!(h.owned_by_character || (character && h.owner_name && h.owner_name !== "Private owner" && h.owner_name === character.name));
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
      return '<a class="btn btn-ghost btn-block" href="account.html#characters">Choose a character</a>';
    }
    if ((h.status === "unowned" || h.status === "listed") && !mine) {
      var buying = mutationPending("property-buy", h.property_id);
      return '<button class="btn btn-gold btn-block" data-house-review="' + attr(h.property_id) + '"' + (buying ? " disabled" : "") + ">" + (buying ? "Awaiting server…" : "Review · " + fmt(price) + " gold") + "</button>";
    }
    if (mine && h.status === "listed") {
      var unlisting = mutationPending("property-unlist", h.property_id);
      return '<button class="btn btn-ghost btn-block" data-house-unlist="' + attr(h.property_id) + '"' + (unlisting ? " disabled" : "") + ">" + (unlisting ? "Awaiting server…" : "Unlist") + "</button>";
    }
    if (mine) {
      return (
        '<form class="resale-row" data-house-list="' + attr(h.property_id) + '" novalidate>' +
        '<label class="resale-label" for="price-' + attr(h.plot_id || h.property_id) + '">Resale price (gold)</label>' +
        '<div class="resale-controls">' +
        '<input class="resale-input" type="number" id="price-' + attr(h.plot_id || h.property_id) + '" name="price" min="1" max="1000000" inputmode="numeric" placeholder="e.g. ' + fmt(h.primary_price_gold) + '" />' +
        '<button class="btn btn-gold" type="submit">Review listing</button>' +
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
      "<div><dt>Owner</dt><dd>" + escapeHtml(h.owner_name || "None") + "</dd></div>" +
      "<div><dt>Sales</dt><dd>" + (h.sale_count == null ? "History unavailable" : fmt(h.sale_count)) + "</dd></div>" +
      "</dl>" +
      '<div class="house-bid">' + houseActionsHtml(h) + '<p class="field-error" id="house-error-' + attr(h.property_id) + '" aria-live="polite"></p></div>'
    );
  }
  function openMarketConfirmation(mode, id, price) {
    var dialog = $("#market-confirm-dialog");
    var character = selectedCharacter();
    var house = state.currentHouses.filter(function (entry) { return entry.property_id === id; })[0];
    if (!dialog || !character || !house) return;
    dialog.dataset.mode = mode;
    dialog.dataset.propertyId = id;
    dialog.dataset.price = String(price);
    setText("#market-confirm-character", character.name);
    setText("#market-confirm-property", (house.district || house.plot_id) + " · " + house.property_id);
    setText("#market-confirm-price-label", mode === "list" ? "Listing price" : "Price");
    setText("#market-confirm-price", fmt(price) + " gold");
    setText("#market-confirm-kicker", mode === "list" ? "REVIEW PROPERTY LISTING" : "REVIEW PROPERTY PURCHASE");
    setText("#market-confirm-submit", mode === "list" ? "Confirm listing" : "Confirm purchase");
    var balanceRow = $("#market-confirm-balance-row");
    var resultRow = $("#market-confirm-result-row");
    if (balanceRow) balanceRow.hidden = mode === "list";
    if (resultRow) resultRow.hidden = mode === "list";
    setText("#market-confirm-balance", state.goldBalance == null ? "Server will confirm" : fmt(state.goldBalance) + " gold");
    setText("#market-confirm-result", projectedBalanceText(state.goldBalance, price));
    setText("#market-confirm-error", "");
    if (typeof dialog.showModal === "function") dialog.showModal();
  }
  function renderHouses() {
    var grid = $("#houses-grid");
    if (!grid) return Promise.resolve([]);
    var status = $("#market-status");
    var request = ++state.marketRequest;
    grid.innerHTML = '<article class="parchment"><p class="muted">Loading house market...</p></article>';
    if (status) { status.textContent = "Loading the server registry…"; status.dataset.kind = "info"; }
    var loading = loadHouseCards()
      .then(function (houses) {
        if (request !== state.marketRequest) return houses;
        if (!houses.length) {
          grid.innerHTML = '<article class="parchment"><p class="muted">No server property listings are available yet.</p></article>';
          if (status) { status.textContent = "The server registry is currently empty."; status.dataset.kind = "ok"; }
          return;
        }
        grid.innerHTML = houses.map(function (h) {
          return '<article class="house-card" data-house="' + attr(h.property_id) + '">' + houseCardHtml(h) + "</article>";
        }).join("");
        wireReveals();
        if (status) {
          status.textContent = state.marketMessage || (selectedCharacter() ? "Registry refreshed for " + selectedCharacter().name + "." : "Registry loaded. Select a character to buy or list.");
          status.dataset.kind = state.marketMessage ? state.marketMessageKind : "info";
        }
      })
      .catch(function () {
        if (request !== state.marketRequest) return;
        grid.innerHTML = '<article class="parchment"><p class="muted">Could not reach the server property market. No local ownership preview is used.</p></article>';
        if (status) { status.textContent = "The House Registry is unavailable. No local listing or ownership data is substituted."; status.dataset.kind = "error"; }
      });
    if (grid.dataset.wired !== "1") {
      grid.addEventListener("click", function (e) {
        var buy = e.target.closest ? e.target.closest("[data-house-review]") : null;
        var unlist = e.target.closest ? e.target.closest("[data-house-unlist]") : null;
        var id = buy ? buy.getAttribute("data-house-review") : unlist ? unlist.getAttribute("data-house-unlist") : "";
        if (!id) return;
        if (buy) {
          var house = state.currentHouses.filter(function (entry) { return entry.property_id === id; })[0];
          if (house) openMarketConfirmation("buy", id, housePrice(house));
          return;
        }
        unlist.disabled = true;
        var err = document.getElementById("house-error-" + id);
        changeProperty(id, false, err);
      });
      grid.addEventListener("submit", function (e) {
        var form = e.target.closest ? e.target.closest("[data-house-list]") : null;
        if (!form) return;
        e.preventDefault();
        var id = form.getAttribute("data-house-list");
        var input = form.querySelector('input[name="price"]');
        var price = input ? Number(input.value) : NaN;
        var err = document.getElementById("house-error-" + id);
        if (!Number.isInteger(price) || price < 1 || price > 1000000) {
          if (err) err.textContent = "Enter a whole-gold price from 1 to 1,000,000.";
          return;
        }
        openMarketConfirmation("list", id, price);
      });
      grid.dataset.wired = "1";
    }
    var confirm = $("#market-confirm-submit");
    if (confirm && confirm.dataset.wired !== "1") {
      confirm.addEventListener("click", function () {
        var dialog = $("#market-confirm-dialog");
        var mode = dialog ? dialog.dataset.mode : "";
        var id = dialog ? dialog.dataset.propertyId : "";
        var price = dialog ? Number(dialog.dataset.price) : NaN;
        var err = $("#market-confirm-error");
        if (!id || (mode !== "buy" && mode !== "list") || !Number.isInteger(price) || price < 1) return;
        confirm.disabled = true;
        var action = mode === "list" ? listProperty(id, price, err) : changeProperty(id, true, err);
        action.then(function (body) {
          confirm.disabled = false;
          if (body) {
            if (dialog && dialog.open) dialog.close();
          }
        });
      });
      confirm.dataset.wired = "1";
    }
    return loading;
  }

  function renderAll() {
    renderHoldings();
    renderIdentityControls();
    applyAccountGates();
    renderAccountPortal();
    renderShop();
    renderHouses();
    wireReveals();
  }

  function initMisc() {
    var y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
  }

  var revealObserver = null;
  function wireReveals() {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -6%", threshold: 0.08 });
    }
    $all(".parchment, .visual-card, .ak-card, .step-card, .shop-card, .house-card").forEach(function (el) {
      if (el.classList.contains("reveal-ready") || el.classList.contains("is-revealed")) return;
      el.classList.add("reveal-ready");
      revealObserver.observe(el);
    });
  }
  function initMotion() {
    wireReveals();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var art = $(".ak-hero__art");
    var cta = $(".ak-cta__art");
    if (!art && !cta) return;
    var queued = false;
    function paint() {
      queued = false;
      var offset = Math.min(window.scrollY || 0, 900);
      if (art) art.style.transform = "translate3d(0," + (offset * 0.06) + "px,0)";
      if (cta) cta.style.transform = "translate3d(0," + (offset * -0.025) + "px,0)";
    }
    window.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(paint);
    }, { passive: true });
  }

  // Mobile nav: close the hamburger menu after a selection or Escape.
  // No-ops where the toggle is absent (re-added after the PR #19 app.js rewrite).
  function initNav() {
    var toggle = document.getElementById("nav-toggle");
    var signout = document.getElementById("chrome-signout");
    if (signout) signout.addEventListener("click", signOut);
    if (!toggle) return;
    var nav = document.querySelector(".top-nav");
    if (nav) {
      nav.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest("a")) toggle.checked = false;
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        toggle.checked = false;
        $all(".account-control[open]").forEach(function (menu) { menu.removeAttribute("open"); });
      }
    });
  }

  function boot() {
    initTabs();
    initNav();
    initMisc();
    initMotion();
    handleAccountQuery();
    refreshPortal();
  }

  if (window.__AKALYNTH_SITE_E2D_TEST_HOOKS__) {
    window.__AKALYNTH_SITE_E2D_TEST_HOOKS__.install({
      state: state,
      rememberSelectedCharacter: rememberSelectedCharacter,
      selectAccountCharacter: selectAccountCharacter,
      createAccountCharacter: createAccountCharacter,
      startWork: startWork,
      tickWork: tickWork,
      buyShopItem: buyShopItem,
      changeProperty: changeProperty,
      listProperty: listProperty,
      accountActionBlockedMessage: accountActionBlockedMessage,
      accountCharacterActionBlockedMessage: accountCharacterActionBlockedMessage,
      registrationPayload: registrationPayload,
      refreshControlledBetaStatus: refreshControlledBetaStatus,
      handleAccountQuery: handleAccountQuery,
      loadCatalogs: loadCatalogs,
      loadHouseCards: loadHouseCards,
      safeOwnerName: safeOwnerName,
      projectedBalanceText: projectedBalanceText,
      houseIsMine: houseIsMine,
      houseActionsHtml: houseActionsHtml,
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
