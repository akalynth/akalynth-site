import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const appSource = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const requests = [];
let hooks;
let betaStatusMode = 'success';
const deferredBetaStatusResponses = [];
let shopPurchaseMode = 'success';
const deferredShopPurchaseResponses = [];
let shopCatalogMode = 'valid';
let marketPayloadMode = 'valid';
let marketMode = 'listed';
let ledgerOwnerName = 'player_private-site-e2d';
const replacedUrls = [];

const store = new Map();
const noopElement = {
  hidden: false,
  dataset: {},
  textContent: '',
  innerHTML: '',
  classList: { toggle() {} },
  addEventListener() {},
  insertAdjacentHTML() {},
  setAttribute() {},
  removeAttribute() {},
  getAttribute() { return ''; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
};

const document = {
  readyState: 'loading',
  cookie: 'akalynth_csrf=csrf-site-e2d',
  body: {
    getAttribute() { return ''; },
    hasAttribute() { return false; },
  },
  addEventListener() {},
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
};

const context = {
  console,
  URLSearchParams,
  Number,
  Promise,
  Error,
  JSON,
  Array,
  Object,
  String,
  parseInt,
  encodeURIComponent,
  sessionStorage: {
    getItem(key) { return store.get(key) || ''; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
  },
  location: {
    hostname: '127.0.0.1',
    search: '',
    hash: '',
  },
  history: {
    replaceState(_state, _title, url) {
      replacedUrls.push(url);
      context.location.search = '';
      context.location.hash = '';
    },
  },
  window: {
    AKALYNTH_API_BASE: 'https://api.example.test',
    __AKALYNTH_SITE_E2D_TEST_HOOKS__: {
      install(installed) {
        hooks = installed;
      },
    },
    addEventListener() {},
    scrollTo() {},
    location: {
      hash: '',
    },
  },
  document,
  fetch: async (url, options = {}) => {
    const request = {
      path: String(url).replace('https://api.example.test', ''),
      method: options.method || 'GET',
      credentials: options.credentials,
      csrf: options.headers && options.headers['x-csrf-token'],
      body: options.body ? JSON.parse(options.body) : null,
    };
    requests.push(request);
    if (request.path === '/v1/beta/me' && betaStatusMode === 'transport-error') {
      throw new Error('simulated optional beta-status transport failure');
    }
    if (request.path === '/v1/beta/me' && betaStatusMode === 'deferred') {
      return new Promise((resolve) => {
        deferredBetaStatusResponses.push({
          resolve(body) {
            resolve({
              ok: true,
              status: 200,
              statusText: 'OK',
              text: async () => JSON.stringify(body),
            });
          },
        });
      });
    }
    if (request.path === '/v1/shop/purchase' && shopPurchaseMode === 'deferred') {
      return new Promise((resolve) => {
        deferredShopPurchaseResponses.push({
          resolve(body) {
            resolve({
              ok: true,
              status: 200,
              statusText: 'OK',
              text: async () => JSON.stringify(body),
            });
          },
        });
      });
    }
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify(responseFor(request)),
    };
  },
};
context.window.window = context.window;
context.window.document = document;
context.window.sessionStorage = context.sessionStorage;
context.window.fetch = context.fetch;
context.window.location = context.location;
context.document.defaultView = context.window;
context.globalThis = context.window;

function responseFor(request) {
  if (request.path === '/v1/characters' && request.method === 'POST') {
    return {
      ok: true,
      character: {
        character_id: 'char-created-site-e2d',
        name: request.body.name,
        world_id: request.body.world_id,
        sex: request.body.sex,
        outfit_id: request.body.outfit_id,
      },
      token: 'play-created-site-e2d',
      expires_at: 1800000000000,
    };
  }
  if (request.path === '/v1/characters/select') {
    return {
      ok: true,
      character: {
        character_id: request.body.character_id,
        name: 'SiteProof',
        world_id: 'high_city',
        sex: 'female',
        outfit_id: 'female_guard',
      },
      token: 'play-selected-site-e2d',
      expires_at: 1800000000000,
    };
  }
  if (request.path === '/v1/accounts/me') {
    return { account: { account_id: 'acc-site-e2d', email_verified: true, status: 'active' } };
  }
  if (request.path === '/v1/beta/me') {
    return {
      cohort: {
        cohort_id: 'rookguard-blind-01',
        release_commit: '0123456789abcdef0123456789abcdef01234567',
      },
    };
  }
  if (request.path === '/v1/characters' && request.method === 'GET') {
    return { characters: hooks ? hooks.state.characters : [] };
  }
  if (request.path.startsWith('/v1/wallet')) {
    return { balance_gold: 15 };
  }
  if (request.path === '/v1/worlds') {
    return { worlds: [{ world_id: 'high_city', name: 'High City' }, { world_id: 'rookguard', name: 'Rookguard' }] };
  }
  if (request.path === '/v1/outfits') {
    return { outfits: [{ outfit_id: 'female_guard', sex: 'female', name: 'City Guard' }] };
  }
  if (request.path === '/v1/shop/catalog') {
    if (shopCatalogMode === 'invalid') return { items: [{ shop_key: 'broken' }] };
    return {
      items: [{
        shop_key: 'pilgrim_mark',
        item_type: 'pilgrim_mark',
        name: 'Pilgrim Mark',
        tag: 'Cosmetic',
        description: 'A non-power mark for identity and memory.',
        price_gold: 10,
        currency: 'gold',
      }],
    };
  }
  if (request.path === '/v1/property/market') {
    if (marketPayloadMode === 'invalid') return { listings: { not: 'an array' } };
    return {
      listings: marketMode === 'listed' ? [{
        property_id: 'Azura:H1',
        zone: 'high_city',
        plot_id: 'H1',
        district: 'Azura',
        status: 'listed',
        owner_name: 'player_private-site-e2d',
        primary_price_gold: 20,
        listed_price_gold: 77,
      }] : [],
      total: marketMode === 'listed' ? 1 : 0,
    };
  }
  if (request.path.startsWith('/v1/property/ledger?')) {
    const propertyId = new URLSearchParams(request.path.split('?')[1]).get('property_id');
    return {
      property_id: propertyId,
      district: propertyId === 'Azura:H1' ? 'Azura' : null,
      owner_name: propertyId === 'Azura:H1' ? ledgerOwnerName : null,
      sale_count: propertyId === 'Azura:H1' ? 2 : 0,
      owner_count: propertyId === 'Azura:H1' ? 2 : 0,
      last_sale: null,
      owner_history: [],
    };
  }
  if (request.path === '/v1/work/start') {
    return { contract_id: 'contract-site-e2d', payout_gold: 5 };
  }
  if (request.path === '/v1/work/tick') {
    return { contract_id: 'contract-site-e2d', ticks_observed: 1, ticks_required: 1, completed: true, credited_gold: 5, balance_gold: 15 };
  }
  if (request.path === '/v1/shop/purchase') {
    return { balance_gold: 10, item: { item_id: 'item-site-e2d' } };
  }
  if (request.path === '/v1/property/buy' || request.path === '/v1/property/unlist') {
    marketMode = 'owned';
    ledgerOwnerName = 'SiteProof';
    return { balance_gold: 5, property: { property_id: request.body.property_id, status: 'owned' } };
  }
  if (request.path === '/v1/property/list') {
    marketMode = 'listed';
    ledgerOwnerName = 'SiteProof';
    return { property: { property_id: request.body.property_id, status: 'listed', listed_price_gold: request.body.price_gold } };
  }
  return {};
}

function fail(message) {
  console.error(`site e2d character/gameplay verifier failed: ${message}`);
  process.exit(1);
}

function assertRequest(path, expectedBody) {
  const request = requests.find((entry) => entry.path === path);
  if (!request) fail(`missing request ${path}`);
  if (request.method !== 'POST') fail(`${path} must use POST`);
  if (request.credentials !== 'include') fail(`${path} must include account session cookies`);
  if (request.csrf !== 'csrf-site-e2d') fail(`${path} must carry CSRF header`);
  for (const [key, value] of Object.entries(expectedBody)) {
    if (!request.body || request.body[key] !== value) {
      fail(`${path} body ${key} expected ${value}, got ${request.body && request.body[key]}`);
    }
  }
}

async function assertNoNewRequests(label, action) {
  const before = requests.length;
  await action();
  if (requests.length !== before) {
    fail(`${label} must block before calling the API`);
  }
}

function assertMessage(label, expected) {
  if (hooks.state.message !== expected) {
    fail(`${label} expected message "${expected}", got "${hooks.state.message}"`);
  }
}

function errorElement() {
  return {
    textContent: '',
  };
}

function validCharacter() {
  return {
    character_id: 'char-site-e2d',
    name: 'SiteProof',
    world_id: 'high_city',
    sex: 'female',
    outfit_id: 'female_guard',
  };
}

function validCreateBody() {
  return {
    name: 'CreatedSiteProof',
    world_id: 'high_city',
    sex: 'female',
    outfit_id: 'female_guard',
  };
}

vm.runInNewContext(appSource, context, { filename: 'js/app.js' });
if (!hooks) fail('test hooks were not installed');

await hooks.loadCatalogs();
if (
  hooks.state.shopStatus !== 'ready' ||
  hooks.state.shopItems.length !== 1 ||
  hooks.state.shopItems[0].id !== 'pilgrim_mark' ||
  hooks.state.shopItems[0].gold !== 10
) {
  fail('shop UI state must come from the server catalog without a local product fallback');
}
shopCatalogMode = 'invalid';
await hooks.loadCatalogs();
if (hooks.state.shopStatus !== 'error' || hooks.state.shopItems.length !== 0) {
  fail('malformed shop catalog items must fail closed instead of reaching the renderer');
}
shopCatalogMode = 'valid';
await hooks.loadCatalogs();
await hooks.loadHouseCards();
if (
  hooks.state.marketStatus !== 'ready' ||
  hooks.state.currentHouses.length !== 1 ||
  hooks.state.currentHouses[0].property_id !== 'Azura:H1' ||
  hooks.state.currentHouses[0].owner_name !== 'Private owner' ||
  hooks.state.currentHouses[0].sale_count !== 2
) {
  fail('house registry must use public market/ledger data and mask raw-looking owner identifiers');
}
marketPayloadMode = 'invalid';
let malformedMarketRejected = false;
try {
  await hooks.loadHouseCards();
} catch {
  malformedMarketRejected = true;
}
if (!malformedMarketRejected || hooks.state.marketStatus !== 'error' || hooks.state.currentHouses.length !== 0) {
  fail('malformed market payloads must fail closed instead of becoming a successful empty registry');
}
marketPayloadMode = 'valid';
await hooks.loadHouseCards();
for (const path of ['/v1/shop/catalog', '/v1/property/market']) {
  const request = requests.find((entry) => entry.path === path);
  if (!request || request.method !== 'GET' || request.credentials !== 'include') {
    fail(`${path} must be fetched from the API with the account session policy`);
  }
}
if (hooks.safeOwnerName('guest_secret-id') !== 'Private owner') {
  fail('raw-looking public owner identifiers must not be rendered');
}
if (
  hooks.projectedBalanceText(5, 10) !== 'Insufficient by 5 gold' ||
  hooks.projectedBalanceText(15, 10) !== '5 gold'
) {
  fail('purchase review must show an honest balance or shortfall');
}

const registrationWithoutInvite = hooks.registrationPayload({
  handle: 'NoInvite',
  email: '',
  password: 'correct horse battery staple',
  invite_code: '   ',
});
if (Object.prototype.hasOwnProperty.call(registrationWithoutInvite, 'invite_code')) {
  fail('empty invite must be omitted from registration payload');
}
const registrationWithInvite = hooks.registrationPayload({
  handle: 'Invited',
  email: 'invited@example.test',
  password: 'correct horse battery staple',
  invite_code: '  BETA-PASTE-ONLY  ',
});
if (
  registrationWithInvite.invite_code !== 'BETA-PASTE-ONLY' ||
  Object.keys(registrationWithInvite).filter((key) => key === 'invite_code').length !== 1
) {
  fail('pasted invite must be trimmed and included exactly once');
}

document.body.getAttribute = (name) => name === 'data-page' ? 'account' : '';
context.location.search = '?invite=URL-INJECTION&view=register';
hooks.state.accountView = '';
hooks.state.resetToken = '';
hooks.handleAccountQuery();
if (
  hooks.state.accountView !== 'register' ||
  hooks.state.resetToken !== '' ||
  replacedUrls.at(-1) !== 'account.html'
) {
  fail('registration route must not consume an invite from the query string');
}
const querySafeRegistration = hooks.registrationPayload({
  handle: 'QuerySafe',
  email: '',
  password: 'correct horse battery staple',
});
if (Object.prototype.hasOwnProperty.call(querySafeRegistration, 'invite_code')) {
  fail('registration payload must not inherit a query-string invite');
}

context.location.hash = '#reset=reset-token-site-e2d';
hooks.state.resetToken = '';
hooks.handleAccountQuery();
if (
  hooks.state.resetToken !== 'reset-token-site-e2d' ||
  context.location.hash !== '' ||
  replacedUrls.at(-1) !== 'account.html'
) {
  fail('reset fragment token must bind and scrub from the account URL');
}
context.location.search = '';

hooks.state.account = { account_id: 'acc-site-e2d', email_verified: true, status: 'active' };
betaStatusMode = 'success';
await hooks.refreshControlledBetaStatus();
if (
  !hooks.state.betaCohort ||
  hooks.state.betaCohort.cohort_id !== 'rookguard-blind-01' ||
  hooks.state.betaCohort.release_commit !== '0123456789abcdef0123456789abcdef01234567'
) {
  fail('controlled beta status must retain the authorized cohort projection');
}
betaStatusMode = 'transport-error';
await hooks.refreshControlledBetaStatus();
if (hooks.state.betaCohort !== null) {
  fail('beta status transport failure must clear the optional projection');
}

hooks.state.account = { account_id: 'acc-old-site-e2d', email_verified: true, status: 'active' };
betaStatusMode = 'deferred';
const oldAccountStatus = hooks.refreshControlledBetaStatus();
hooks.state.account = { account_id: 'acc-current-site-e2d', email_verified: true, status: 'active' };
const currentAccountStatus = hooks.refreshControlledBetaStatus();
if (deferredBetaStatusResponses.length !== 2) {
  fail('controlled beta race proof must hold two out-of-order account responses');
}
deferredBetaStatusResponses[1].resolve({
  cohort: {
    cohort_id: 'current-account-cohort',
    release_commit: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  },
});
await currentAccountStatus;
deferredBetaStatusResponses[0].resolve({
  cohort: {
    cohort_id: 'old-account-cohort',
    release_commit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
});
await oldAccountStatus;
if (
  !hooks.state.betaCohort ||
  hooks.state.betaCohort.cohort_id !== 'current-account-cohort' ||
  hooks.state.betaCohort.release_commit !== 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
) {
  fail('stale controlled beta response must not overwrite the current account projection');
}
betaStatusMode = 'success';

hooks.state.account = null;
hooks.state.characters = [];
hooks.rememberSelectedCharacter('');
await assertNoNewRequests('create character without account session', () => hooks.createAccountCharacter(validCreateBody()));
assertMessage('create character without account session', 'Sign in with an account session before creating or selecting a character.');
await assertNoNewRequests('select character without account session', () => hooks.selectAccountCharacter('char-site-e2d'));
assertMessage('select character without account session', 'Sign in with an account session before creating or selecting a character.');
await assertNoNewRequests('start work without account session', () => hooks.startWork());
if (!hooks.state.workContract || hooks.state.workContract.error !== 'Sign in first.') {
  fail('start work without account session must show inline sign-in helper');
}
const shopNoAccount = errorElement();
await assertNoNewRequests('shop purchase without account session', () => hooks.buyShopItem('healing_herb', shopNoAccount));
if (shopNoAccount.textContent !== 'Sign in first.') fail('shop purchase without account session must show inline sign-in helper');
const buyNoAccount = errorElement();
await assertNoNewRequests('property buy without account session', () => hooks.changeProperty('Azura:H1', true, buyNoAccount));
if (buyNoAccount.textContent !== 'Sign in first.') fail('property buy without account session must show inline sign-in helper');
const listNoAccount = errorElement();
await assertNoNewRequests('property list without account session', () => hooks.listProperty('Azura:H1', 77, listNoAccount));
if (listNoAccount.textContent !== 'Sign in first.') fail('property list without account session must show inline sign-in helper');

document.cookie = '';
store.delete('akalynth.csrf.v1');
hooks.state.account = { account_id: 'acc-site-e2d', email_verified: true, status: 'active' };
hooks.state.characters = [validCharacter()];
hooks.rememberSelectedCharacter('char-site-e2d');
hooks.state.workContract = { contract_id: 'contract-site-e2d' };
await assertNoNewRequests('create character without csrf', () => hooks.createAccountCharacter(validCreateBody()));
assertMessage('create character without csrf', 'Security token missing. Sign in again before creating or selecting a character.');
await assertNoNewRequests('select character without csrf', () => hooks.selectAccountCharacter('char-site-e2d'));
assertMessage('select character without csrf', 'Security token missing. Sign in again before creating or selecting a character.');
await assertNoNewRequests('start work without csrf', () => hooks.startWork());
if (!hooks.state.workContract || hooks.state.workContract.error !== 'Security token missing. Sign in again before account character or gameplay actions.') {
  fail('start work without csrf must show inline session helper');
}
const shopNoCsrf = errorElement();
await assertNoNewRequests('shop purchase without csrf', () => hooks.buyShopItem('healing_herb', shopNoCsrf));
if (shopNoCsrf.textContent !== 'Security token missing. Sign in again before account character or gameplay actions.') {
  fail('shop purchase without csrf must show inline session helper');
}
const buyNoCsrf = errorElement();
await assertNoNewRequests('property buy without csrf', () => hooks.changeProperty('Azura:H1', true, buyNoCsrf));
if (buyNoCsrf.textContent !== 'Security token missing. Sign in again before account character or gameplay actions.') {
  fail('property buy without csrf must show inline session helper');
}
const listNoCsrf = errorElement();
await assertNoNewRequests('property list without csrf', () => hooks.listProperty('Azura:H1', 77, listNoCsrf));
if (listNoCsrf.textContent !== 'Security token missing. Sign in again before account character or gameplay actions.') {
  fail('property list without csrf must show inline session helper');
}

document.cookie = 'akalynth_csrf=csrf-site-e2d';
hooks.state.account = { account_id: 'acc-site-e2d', email_verified: true, status: 'active' };
hooks.state.characters = [validCharacter()];
hooks.rememberSelectedCharacter('char-site-e2d');
hooks.state.workContract = { contract_id: 'contract-site-e2d' };

shopPurchaseMode = 'deferred';
const purchasesBeforeDuplicateProof = requests.filter((entry) => entry.path === '/v1/shop/purchase').length;
const firstPendingPurchase = hooks.buyShopItem('pilgrim_mark', noopElement);
const duplicatePurchaseError = errorElement();
await hooks.buyShopItem('pilgrim_mark', duplicatePurchaseError);
const purchasesAfterDuplicateProof = requests.filter((entry) => entry.path === '/v1/shop/purchase').length;
if (
  purchasesAfterDuplicateProof !== purchasesBeforeDuplicateProof + 1 ||
  duplicatePurchaseError.textContent !== 'This purchase is already pending.' ||
  deferredShopPurchaseResponses.length !== 1
) {
  fail('duplicate shop submissions must be blocked while the server mutation is pending');
}
shopPurchaseMode = 'success';
deferredShopPurchaseResponses[0].resolve({
  ok: true,
  balance_gold: 10,
  item: { item_id: 'item-site-e2d', item_type: 'pilgrim_mark', shop_key: 'pilgrim_mark' },
});
await firstPendingPurchase;

await hooks.createAccountCharacter(validCreateBody());
hooks.state.characters = [validCharacter()];
hooks.rememberSelectedCharacter('char-site-e2d');
await hooks.selectAccountCharacter('char-site-e2d');
await hooks.startWork();
hooks.state.workContract = { contract_id: 'contract-site-e2d' };
await hooks.tickWork();
await hooks.buyShopItem('pilgrim_mark', noopElement);
await hooks.changeProperty('Azura:H1', true, noopElement);
let ownedHouse = hooks.state.currentHouses.find((entry) => entry.property_id === 'Azura:H1');
if (!ownedHouse || ownedHouse.status !== 'owned' || !hooks.houseIsMine(ownedHouse) || !hooks.houseActionsHtml(ownedHouse).includes('data-house-list')) {
  fail('an accepted property purchase must remain discoverable from its source-backed ledger and expose listing review');
}
await hooks.changeProperty('Azura:H1', false, noopElement);
ownedHouse = hooks.state.currentHouses.find((entry) => entry.property_id === 'Azura:H1');
if (!ownedHouse || ownedHouse.status !== 'owned' || !hooks.houseActionsHtml(ownedHouse).includes('data-house-list')) {
  fail('an accepted unlist must remain discoverable and expose relisting review');
}
await hooks.listProperty('Azura:H1', 77, noopElement);
const listedHouse = hooks.state.currentHouses.find((entry) => entry.property_id === 'Azura:H1');
if (!listedHouse || listedHouse.status !== 'listed' || !hooks.houseActionsHtml(listedHouse).includes('data-house-unlist')) {
  fail('an accepted listing must refresh to the server-listed state and expose unlist');
}

assertRequest('/v1/characters', { name: 'CreatedSiteProof', world_id: 'high_city', sex: 'female', outfit_id: 'female_guard' });
assertRequest('/v1/characters/select', { character_id: 'char-site-e2d' });
assertRequest('/v1/work/start', { character_id: 'char-site-e2d' });
assertRequest('/v1/work/tick', { character_id: 'char-site-e2d', contract_id: 'contract-site-e2d' });
assertRequest('/v1/shop/purchase', { character_id: 'char-site-e2d', shop_key: 'pilgrim_mark' });
assertRequest('/v1/property/buy', { character_id: 'char-site-e2d', property_id: 'Azura:H1' });
assertRequest('/v1/property/unlist', { character_id: 'char-site-e2d', property_id: 'Azura:H1' });
assertRequest('/v1/property/list', { character_id: 'char-site-e2d', property_id: 'Azura:H1', price_gold: 77 });

console.log('site e2d Android companion authority verifier passed');
