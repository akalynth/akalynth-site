import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const appSource = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const requests = [];
let hooks;

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
    replaceState() {},
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
    return { items: [] };
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
    return { balance_gold: 5, property: { property_id: request.body.property_id, status: request.path.endsWith('/buy') ? 'owned' : 'unowned' } };
  }
  if (request.path === '/v1/property/list') {
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

await hooks.createAccountCharacter(validCreateBody());
hooks.state.characters = [validCharacter()];
hooks.rememberSelectedCharacter('char-site-e2d');
await hooks.selectAccountCharacter('char-site-e2d');
await hooks.startWork();
hooks.state.workContract = { contract_id: 'contract-site-e2d' };
await hooks.tickWork();
await hooks.buyShopItem('healing_herb', noopElement);
await hooks.changeProperty('Azura:H1', true, noopElement);
await hooks.changeProperty('Azura:H1', false, noopElement);
await hooks.listProperty('Azura:H1', 77, noopElement);

assertRequest('/v1/characters', { name: 'CreatedSiteProof', world_id: 'high_city', sex: 'female', outfit_id: 'female_guard' });
assertRequest('/v1/characters/select', { character_id: 'char-site-e2d' });
assertRequest('/v1/work/start', { character_id: 'char-site-e2d' });
assertRequest('/v1/work/tick', { character_id: 'char-site-e2d', contract_id: 'contract-site-e2d' });
assertRequest('/v1/shop/purchase', { character_id: 'char-site-e2d', shop_key: 'healing_herb' });
assertRequest('/v1/property/buy', { character_id: 'char-site-e2d', property_id: 'Azura:H1' });
assertRequest('/v1/property/unlist', { character_id: 'char-site-e2d', property_id: 'Azura:H1' });
assertRequest('/v1/property/list', { character_id: 'char-site-e2d', property_id: 'Azura:H1', price_gold: 77 });

console.log('site e2d character/gameplay verifier passed');
