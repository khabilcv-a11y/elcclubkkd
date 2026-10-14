// Prepare/upgrade the sheet tabs after the table definitions changed:  npm run migrate
// (the deployed portal also does this by itself on its first request after a new deployment)
import { loadEnv } from './_node-env.js';
import { callScript } from '../src/lib/store.js';
import { sheetSchema } from '../src/lib/schema.js';
const env = loadEnv();
console.log('Preparing sheet tabs (can take up to a minute)...');
await callScript(env, { action: 'setup', schema: sheetSchema() });
console.log('Done.');
