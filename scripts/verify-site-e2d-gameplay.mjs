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
  console.error(`site e2d gameplay verifier failed: ${message}`);
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

vm.runInNewContext(appSource, context, { filename: 'js/app.js' });
if (!hooks) fail('test hooks were not installed');

hooks.state.account = { account_id: 'acc-site-e2d', email_verified: true, status: 'active' };
hooks.state.characters = [{
  character_id: 'char-site-e2d',
  name: 'SiteProof',
  world_id: 'high_city',
  sex: 'female',
  outfit_id: 'female_guard',
}];
hooks.rememberSelectedCharacter('char-site-e2d');
hooks.state.workContract = { contract_id: 'contract-site-e2d' };

await hooks.startWork();
hooks.state.workContract = { contract_id: 'contract-site-e2d' };
await hooks.tickWork();
await hooks.buyShopItem('healing_herb', noopElement);
await hooks.changeProperty('Azura:H1', true, noopElement);
await hooks.changeProperty('Azura:H1', false, noopElement);
await hooks.listProperty('Azura:H1', 77, noopElement);

assertRequest('/v1/work/start', { character_id: 'char-site-e2d' });
assertRequest('/v1/work/tick', { character_id: 'char-site-e2d', contract_id: 'contract-site-e2d' });
assertRequest('/v1/shop/purchase', { character_id: 'char-site-e2d', shop_key: 'healing_herb' });
assertRequest('/v1/property/buy', { character_id: 'char-site-e2d', property_id: 'Azura:H1' });
assertRequest('/v1/property/unlist', { character_id: 'char-site-e2d', property_id: 'Azura:H1' });
assertRequest('/v1/property/list', { character_id: 'char-site-e2d', property_id: 'Azura:H1', price_gold: 77 });

console.log('site e2d gameplay verifier passed');
