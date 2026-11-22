'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

// Replace modules by name (the expo ones are not installed here); MISSING simulates "not installed".
const MISSING = Symbol('missing');
const OPTIONAL = ['expo-constants', 'expo-application', 'expo-updates', 'expo-device'];
let mocks = {};
const orig = Module._load;
Module._load = function (req, ...rest) {
  if (req in mocks) { if (mocks[req] === MISSING) throw new Error(`Cannot find module '${req}'`); return mocks[req]; }
  return orig.call(this, req, ...rest);
};

function load(extra = {}) {
  const calls = { init: [], ctx: [], router: 0 };
  mocks = {
    ...Object.fromEntries(OPTIONAL.map((n) => [n, MISSING])),
    '@watchtowerobservability/react-native': {
      init: (o) => { calls.init.push(o); return { client: true }; },
      setContext: (a) => calls.ctx.push(a),
      useExpoRouterTracking: () => { calls.router++; },
      captureMessage: () => 'cm',
    },
    '@watchtowerobservability/react-native/app.plugin': (c, o) => { calls.plugin = o; return c; },
    ...extra,
  };
  for (const k of Object.keys(require.cache)) if (/expo[\\/]+(src|app\.plugin)/.test(k)) delete require.cache[k];
  return { calls, wt: require('../src/index.js'), plugin: require('../app.plugin.js') };
}
const consts = (env, extra) => ({ default: { executionEnvironment: env, expoConfig: { version: '1.0.0', extra: { watchtower: { key: 'wtp_a', service: 'shop' } }, ...extra } } });

test('init merges extra.watchtower with overrides and adds expo context', () => {
  const { calls, wt } = load({
    'expo-constants': consts('standalone'),
    'expo-application': { nativeApplicationVersion: '2.3.4' },
    'expo-updates': { updateId: 'u-1', channel: 'prod', runtimeVersion: '2' },
    'expo-device': { modelName: 'Pixel 8', osName: 'Android', osVersion: '15' },
  });
  assert.deepStrictEqual(wt.init({ service: 'override' }), { client: true });
  assert.deepStrictEqual(calls.init[0], { key: 'wtp_a', service: 'override', release: '2.3.4', dist: 'u-1' });
  assert.deepStrictEqual(calls.ctx[0], { 'expo.channel': 'prod', 'expo.runtime_version': '2', 'device.model.name': 'Pixel 8', 'os.name': 'Android', 'os.version': '15' });
});

test('missing optional modules are fine; release falls back to expoConfig.version; explicit release wins', () => {
  let r = load({ 'expo-constants': consts('standalone') });
  r.wt.init();
  assert.deepStrictEqual(r.calls.init[0], { key: 'wtp_a', service: 'shop', release: '1.0.0' });
  r = load({ 'expo-constants': consts('standalone'), 'expo-application': { nativeApplicationVersion: '9' } });
  r.wt.init({ release: 'custom' });
  assert.strictEqual(r.calls.init[0].release, 'custom');
});

test('no key: warns, returns null, does not init', () => {
  const { calls, wt } = load();
  const warns = [];
  const w = console.warn; console.warn = (m) => warns.push(m);
  try { assert.strictEqual(wt.init(), null); } finally { console.warn = w; }
  assert.strictEqual(calls.init.length, 0);
  assert.match(warns[0], /no key/);
});

test('Expo Go is detected, tagged and runs JS-only', () => {
  const { calls, wt } = load({ 'expo-constants': consts('storeClient') });
  wt.init();
  assert.strictEqual(calls.init[0].startNative, false);
  assert.strictEqual(calls.ctx[0]['expo.go'], true);
  const b = load({ 'expo-constants': consts('bare') });
  b.wt.init();
  assert.strictEqual(b.calls.init[0].startNative, undefined);
  assert.strictEqual('expo.go' in b.calls.ctx[0], false);
});

test('re-exports the RN SDK and ExpoRouterTracking calls the hook', () => {
  const { calls, wt } = load();
  assert.strictEqual(wt.captureMessage(), 'cm');
  assert.strictEqual(wt.ExpoRouterTracking(), null);
  assert.strictEqual(calls.router, 1);
});

test('plugin: key from options, else EXPO_PUBLIC_WT_KEY, same options passed through', () => {
  const { calls, plugin } = load();
  const saved = process.env.EXPO_PUBLIC_WT_KEY;
  try {
    process.env.EXPO_PUBLIC_WT_KEY = 'wtp_env';
    plugin({}, { endpoint: 'e' });
    assert.deepStrictEqual(calls.plugin, { endpoint: 'e', key: 'wtp_env' });
    plugin({}, { key: 'wtp_opt' });
    assert.strictEqual(calls.plugin.key, 'wtp_opt');
    plugin({});
    assert.strictEqual(calls.plugin.key, 'wtp_env');
  } finally { if (saved === undefined) delete process.env.EXPO_PUBLIC_WT_KEY; else process.env.EXPO_PUBLIC_WT_KEY = saved; }
});

test('wt-expo-sourcemaps: update id from eas JSON, default export dir, env fallbacks', async () => {
  const { run, updateIdFromEas } = require('../bin/wt-expo-sourcemaps.js');
  assert.strictEqual(updateIdFromEas([{ group: 'g1', id: 'x' }]), 'g1');
  assert.strictEqual(updateIdFromEas({ id: 'i2' }), 'i2');
  assert.throws(() => updateIdFromEas([]), /group id/);
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wtx-')), 'update.json');
  fs.writeFileSync(f, JSON.stringify([{ group: 'g1' }]));
  let got;
  const script = {
    parseArgs: (a) => ({ fromEasUpdate: a[1], project: a[3] }),
    uploadExpoExport: async (o) => { got = o; return []; },
  };
  await run(['--from-eas-update', f, '--project', 'p'], { WT_API_URL: 'https://api.x' }, { script });
  assert.strictEqual(got.updateId, 'g1');
  assert.strictEqual(got.expoExport, 'dist');
  assert.strictEqual(got.api, 'https://api.x');
});
