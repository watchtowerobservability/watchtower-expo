'use strict';
const rn = require('@watchtowerobservability/react-native');

/** Optional peer dependency: undefined when not installed. */
function opt(name) {
  try { const m = require(name); return (m && m.default) || m; } catch (_) { return undefined; }
}

/** Expo context for `init`: options (release, dist) and context tags. Every source is optional. */
function expoContext() {
  const Constants = opt('expo-constants');
  const cfg = (Constants && Constants.expoConfig) || {};
  const app = opt('expo-application');
  const Updates = opt('expo-updates');
  const device = opt('expo-device');
  const expoGo = !!Constants && Constants.executionEnvironment === 'storeClient';
  const tags = {};
  const set = (k, v) => { if (v !== undefined && v !== null && v !== '') tags[k] = v; };
  set('expo.channel', Updates && Updates.channel);
  set('expo.runtime_version', (Updates && Updates.runtimeVersion) || cfg.runtimeVersion);
  set('device.model.name', device && device.modelName);
  set('os.name', device && device.osName);
  set('os.version', device && device.osVersion);
  if (expoGo) tags['expo.go'] = true;
  return {
    extra: (cfg.extra && cfg.extra.watchtower) || {},
    release: (app && app.nativeApplicationVersion) || cfg.version,
    dist: Updates && Updates.updateId ? String(Updates.updateId) : undefined,
    tags,
    expoGo,
  };
}

/** Start Watchtower from `expoConfig.extra.watchtower` (written by the config plugin) merged with `overrides`. No key: warns and returns null. */
function init(overrides) {
  const x = expoContext();
  const o = { ...x.extra, ...overrides };
  if (!o.key) { console.warn('watchtower: no key (add the plugin to app.json, set EXPO_PUBLIC_WT_KEY, or pass { key })'); return null; }
  if (!o.release && x.release) o.release = x.release;
  if (!o.dist && x.dist) o.dist = x.dist;
  // Expo Go has no custom native code: the RN SDK falls back to its JS transport, so skip the native start
  if (x.expoGo && o.startNative === undefined) o.startNative = false;
  const client = rn.init(o);
  rn.setContext(x.tags);
  return client;
}

/** Render once in the root layout (`app/_layout.tsx`); tracks Expo Router screens. */
function ExpoRouterTracking() { rn.useExpoRouterTracking(); return null; }

module.exports = Object.defineProperties({}, {
  ...Object.getOwnPropertyDescriptors(rn), // keeps the RN SDK's lazy getters lazy
  init: { value: init, enumerable: true },
  ExpoRouterTracking: { value: ExpoRouterTracking, enumerable: true },
});
