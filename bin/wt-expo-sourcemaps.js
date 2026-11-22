#!/usr/bin/env node
'use strict';
// Uploads the source maps of an `expo export --source-maps` directory (EAS Update or EAS Build hook).
//   wt-expo-sourcemaps [--from-eas-update update.json] [--expo-export dist] --api URL --project P [--release V]
// Thin wrapper over wt-rn-sourcemaps --expo-export: the update group id from `eas update --json` becomes the dist.
// Secret API key from WT_API_KEY only (the upload script enforces it).
const fs = require('node:fs');
const path = require('node:path');

/** The update group id of `eas update --json` output (an array of per-platform updates, or one object). */
function updateIdFromEas(json) {
  const first = Array.isArray(json) ? json[0] : json;
  const id = first && (first.group || first.id);
  if (!id) throw new Error('no update group id in the eas update JSON');
  return id;
}

async function run(argv, env = process.env, deps = {}) {
  // the RN package's `exports` map hides scripts/, so go through its (exported) package.json
  const script = deps.script || require(path.join(path.dirname(require.resolve('@watchtowerobservability/react-native/package.json')), 'scripts', 'upload-sourcemaps.js'));
  const o = script.parseArgs(argv);
  if (o.fromEasUpdate) o.updateId = o.updateId || updateIdFromEas(JSON.parse(fs.readFileSync(o.fromEasUpdate, 'utf8')));
  o.expoExport = o.expoExport || 'dist';
  o.api = o.api || env.WT_API_URL;
  o.project = o.project || env.WT_PROJECT;
  return script.uploadExpoExport(o, env);
}

module.exports = { updateIdFromEas, run };

if (require.main === module) {
  run(process.argv.slice(2))
    .then((rs) => rs.forEach((r) => console.log(`watchtower: uploaded ${r.name}${r.release ? ` (release ${r.release})` : ''}`)))
    .catch((e) => { console.error(`watchtower: ${e.message}`); process.exit(1); });
}
