# Changelog

## 0.1.0

- Config plugin `@watchtowerobservability/expo` (delegates to the React Native plugin; `key` defaults to `EXPO_PUBLIC_WT_KEY`).
- `init(overrides?)` reads `expoConfig.extra.watchtower`; release from `expo-application`, dist from `expo-updates`, channel, runtime version, device and OS tags; Expo Go detected and tagged `expo.go`.
- `ExpoRouterTracking` component and `useExpoRouterTracking`.
- `wt-expo-sourcemaps --from-eas-update update.json` uploads `eas update` source maps.
