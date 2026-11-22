'use strict';
// Delegates to the React Native plugin. `key` falls back to EXPO_PUBLIC_WT_KEY at config time, so `["@watchtowerobservability/expo"]` alone works.
const withWatchtower = require('@watchtowerobservability/react-native/app.plugin');

module.exports = (config, options = {}) =>
  withWatchtower(config, { ...options, key: options.key || process.env.EXPO_PUBLIC_WT_KEY });
