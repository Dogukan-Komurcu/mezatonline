import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('./check-version.js', import.meta.url), 'utf8');
const current = 'a'.repeat(40);
const next = 'b'.repeat(40);
const marker = (sourceCommit = current) => ({ ok: true, json: async () => ({ sourceCommit }) });

function browser({ href = 'https://preview.example/', commit = current, responses = [], online = true, storage = new Map() } = {}) {
  let now = 1000000;
  let timerId = 0;
  const timers = new Map();
  const requests = [];
  const navigations = [];
  const windowListeners = new Map();
  const documentListeners = new Map();
  const listen = (collection) => (name, callback) => {
    if (!collection.has(name)) collection.set(name, []);
    collection.get(name).push(callback);
  };
  const location = new URL(href);
  location.replace = (destination) => navigations.push(destination);
  const document = {
    visibilityState: 'visible',
    querySelector: () => ({ content: commit }),
    addEventListener: listen(documentListeners),
  };
  const navigator = { onLine: online };
  const sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const window = { location, sessionStorage, addEventListener: listen(windowListeners) };
  const schedule = (callback, delay, interval = null) => {
    const id = ++timerId;
    timers.set(id, { callback, at: now + delay, interval });
    return id;
  };
  const context = vm.createContext({
    window, document, navigator, URL, AbortController,
    Date: { now: () => now },
    setTimeout: (callback, delay) => schedule(callback, delay),
    clearTimeout: (id) => timers.delete(id),
    setInterval: (callback, delay) => schedule(callback, delay, delay),
    fetch: (url, options) => {
      requests.push({ url, options });
      const response = responses.length ? responses.shift() : marker();
      if (typeof response === 'function') return response(url, options);
      if (response instanceof Error) return Promise.reject(response);
      return Promise.resolve(response);
    },
  });
  vm.runInContext(source, context, { filename: 'check-version.js' });
  const flush = async () => {
    for (let index = 0; index < 10; index++) await Promise.resolve();
  };
  const emit = async (name, event = {}) => {
    const listeners = name === 'visibilitychange' ? documentListeners : windowListeners;
    for (const callback of listeners.get(name) ?? []) callback(event);
    await flush();
  };
  const advance = async (milliseconds) => {
    await flush();
    const end = now + milliseconds;
    while (true) {
      const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      const [id, timer] = due;
      now = timer.at;
      if (timer.interval === null) timers.delete(id);
      else timer.at += timer.interval;
      timer.callback();
      await flush();
    }
    now = end;
    await flush();
  };
  return { requests, navigations, timers, storage, document, navigator, location, sessionStorage, emit, flush, advance };
}

test('same version checks without cache and leaves the current page running', async () => {
  const page = browser();
  await page.flush();
  assert.equal(page.requests.length, 1);
  assert.equal(page.requests[0].options.cache, 'no-store');
  const url = new URL(page.requests[0].url);
  assert.equal(url.pathname, '/version.json');
  assert.equal(url.searchParams.get('check'), '1000000');
  assert.deepEqual(page.navigations, []);
});

test('a warm visible tab discovers a publication on its periodic check', async () => {
  const page = browser({ responses: [marker(), marker(next)] });
  await page.advance(60000);
  assert.equal(page.requests.length, 2);
  assert.deepEqual(page.navigations, [`https://preview.example/?v=${next}`]);
});

test('returning from the background checks the version and preserves the URL', async () => {
  const page = browser({ href: 'https://preview.example/demo/?friend=1&friend=2#auction', responses: [marker(), marker(next)] });
  await page.flush();
  page.document.visibilityState = 'hidden';
  await page.advance(60000);
  assert.equal(page.requests.length, 1);
  page.document.visibilityState = 'visible';
  await page.emit('visibilitychange');
  const destination = new URL(page.navigations[0]);
  assert.equal(destination.pathname, '/demo/');
  assert.deepEqual(destination.searchParams.getAll('friend'), ['1', '2']);
  assert.equal(destination.searchParams.get('v'), next);
  assert.equal(destination.hash, '#auction');
});

test('BFCache restoration also discovers a new version', async () => {
  const page = browser({ responses: [marker(), marker(next)] });
  await page.advance(15000);
  await page.emit('pageshow', { persisted: true });
  assert.equal(page.navigations.length, 1);
});

test('focus/pageshow bursts share one throttled follow-up request', async () => {
  const page = browser();
  await page.flush();
  await page.advance(1000);
  await page.emit('focus');
  await page.emit('pageshow', { persisted: true });
  await page.emit('focus');
  assert.equal(page.requests.length, 1);
  await page.advance(14000);
  assert.equal(page.requests.length, 2);
  assert.deepEqual(page.navigations, []);
});

test('concurrent events reuse the in-flight request', async () => {
  let resolve;
  const page = browser({ responses: [() => new Promise((done) => { resolve = done; })] });
  await page.emit('focus');
  await page.emit('pageshow', { persisted: true });
  assert.equal(page.requests.length, 1);
  resolve(marker());
  await page.flush();
  assert.deepEqual(page.navigations, []);
});

test('a failed request leaves the app running and later checks still work', async () => {
  const page = browser({ responses: [new Error('offline'), marker()] });
  await page.flush();
  assert.deepEqual(page.navigations, []);
  await page.advance(60000);
  assert.equal(page.requests.length, 2);
  assert.deepEqual(page.navigations, []);
});

test('offline tabs wait until the online event', async () => {
  const page = browser({ online: false });
  await page.advance(60000);
  assert.equal(page.requests.length, 0);
  page.navigator.onLine = true;
  await page.emit('online');
  assert.equal(page.requests.length, 1);
  assert.deepEqual(page.navigations, []);
});

test('a timed-out fetch aborts without navigation or unhandled rejection', async () => {
  let signal;
  const page = browser({ responses: [(_url, options) => new Promise((_resolve, reject) => {
    signal = options.signal;
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  }), marker()] });
  await page.advance(8000);
  assert.equal(signal.aborted, true);
  assert.deepEqual(page.navigations, []);
  await page.advance(52000);
  assert.equal(page.requests.length, 2);
});

test('a response completing after the tab hides does not interrupt it', async () => {
  let resolve;
  const page = browser({ responses: [() => new Promise((done) => { resolve = done; })] });
  page.document.visibilityState = 'hidden';
  resolve(marker(next));
  await page.flush();
  assert.deepEqual(page.navigations, []);
});

test('a repeated target in the URL prevents a reload loop even with stale HTML', async () => {
  const page = browser({ href: `https://preview.example/?v=${next}`, responses: [marker(next), marker(next)] });
  await page.advance(60000);
  assert.equal(page.requests.length, 2);
  assert.deepEqual(page.navigations, []);
});

test('the session guard prevents loops if an upstream redirect drops the version query', async () => {
  const storage = new Map();
  const first = browser({ storage, responses: [marker(next)] });
  await first.flush();
  assert.equal(first.navigations.length, 1);
  const repeated = browser({ storage, responses: [marker(next)] });
  await repeated.flush();
  assert.deepEqual(repeated.navigations, []);
  const recovered = browser({ storage, commit: next, responses: [marker(next)] });
  await recovered.flush();
  assert.equal(storage.size, 0);
});

test('blocked sessionStorage still permits one guarded URL navigation', async () => {
  const page = browser({ responses: [marker(), marker(next)] });
  page.sessionStorage.getItem = () => { throw new Error('blocked'); };
  page.sessionStorage.setItem = () => { throw new Error('blocked'); };
  await page.advance(60000);
  assert.equal(page.navigations.length, 1);
});

test('malformed markers and failed JSON cannot trigger navigation', async () => {
  for (const response of [marker('latest'), { ok: false }, { ok: true, json: async () => { throw new Error('not JSON'); } }, marker(null)]) {
    const page = browser({ responses: [response] });
    await page.flush();
    assert.deepEqual(page.navigations, []);
  }
});

test('local file previews and missing canonical commit start no checks or timers', async () => {
  for (const options of [{ href: 'file:///Users/friend/DogukanMezatonline/Mezatonline-Ac.html' }, { commit: 'unknown' }, { commit: null }]) {
    const page = browser(options);
    await page.flush();
    assert.equal(page.requests.length, 0);
    assert.equal(page.timers.size, 0);
  }
});
