export * from '@watchtowerobservability/react-native';
import type { Client, InitOptions } from '@watchtowerobservability/react-native';

/** Options come from `expoConfig.extra.watchtower` (the config plugin); `overrides` win. Returns null (with a warning) when there is no key. */
export function init(overrides?: Partial<InitOptions>): Client | null;
/** Render once in the root layout: `<ExpoRouterTracking />`. */
export function ExpoRouterTracking(): null;
