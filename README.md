# @watchtowerobservability/expo

Watchtower for Expo, the way `@bugsnag/expo` works: install one package, add the plugin, call `init()`. A thin layer over
[`@watchtowerobservability/react-native`](../react-native/README.md); everything that SDK exports is re-exported here.

## Install

```sh
npx expo install @watchtowerobservability/expo
npx expo prebuild   # dev builds and EAS builds; Expo Go needs no native step
```

Optional, picked up when installed: `expo-application`, `expo-constants`, `expo-device`, `expo-updates`, `expo-router`.

## app.json

```json
{
  "expo": {
    "plugins": [
      ["@watchtowerobservability/expo", {
        "key": "wtp_...",
        "endpoint": "https://edge.example.com",
        "uploadSourceMaps": { "api": "https://api.example.com", "project": "shop" }
      }]
    ]
  }
}
```

Options are the React Native plugin's. Without `key`, the plugin reads `EXPO_PUBLIC_WT_KEY` at config time, so
`"plugins": ["@watchtowerobservability/expo"]` is enough with that variable set (a publishable `wtp_` key only).

## init

```js
import { init } from '@watchtowerobservability/expo';
init(); // top of index.js / app/_layout.tsx; init({ environment: 'staging' }) overrides
```

`init` reads `Constants.expoConfig.extra.watchtower` and merges your overrides over it. With no key it logs a `console.warn`
and does nothing. Added automatically:

| Source | Used for |
| --- | --- |
| `expo-application` `nativeApplicationVersion` (else `expoConfig.version`) | `release` |
| `expo-updates` `updateId` | `dist` |
| `expo-updates` `channel`, runtime version | tags `expo.channel`, `expo.runtime_version` |
| `expo-device` | tags `device.model.name`, `os.name`, `os.version` |

An explicit `release` / `dist` always wins.

## Expo Router

```jsx
import { ExpoRouterTracking } from '@watchtowerobservability/expo';
export default function RootLayout() { return (<><ExpoRouterTracking /><Slot /></>); }
```

`useExpoRouterTracking()` is exported too. Route patterns are sent, not concrete paths.

## EAS Update source maps

```sh
npx expo export --source-maps
eas update --json --non-interactive > update.json
WT_API_KEY=<secret api key> npx wt-expo-sourcemaps --from-eas-update update.json \
  --api https://api.example.com --project shop
```

The update group id from `update.json` is the `dist`; `--expo-export` defaults to `dist`, `--release` to `dist/expoConfig.json`
`version`. Other flags are those of `wt-rn-sourcemaps`. The secret key comes from the environment only.

### EAS Build hook

```json
{ "scripts": { "eas-build-on-success": "wt-expo-sourcemaps --api https://api.example.com --project shop --release $APP_VERSION" } }
```

Set `WT_API_KEY` as an EAS secret. Native release builds already upload through the Gradle / Xcode hooks the plugin adds (set
`uploadSourceMaps`); use the script for OTA updates.

## Expo Go limits

Expo Go cannot load custom native code. There `init` detects `executionEnvironment === 'storeClient'`, skips the native
start, uses the JS transport (JS errors, navigation, spans, fetch), and tags events `expo.go: true`. No native crashes, ANR
or replay; use a development build for those.

## License

Apache-2.0. Source of truth is the Watchtower monorepo; this repository is a published mirror.
