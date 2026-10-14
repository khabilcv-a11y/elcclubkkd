// Photos/media live in Google Drive, saved by the same Apps Script that fronts the database sheet.
import { callScript } from './store.js';
import { HttpError } from './util.js';

export const driveConfigured = env => !!(env.SCRIPT_URL && env.SCRIPT_SECRET);

async function call(env, payload) {
  if (!driveConfigured(env)) throw new HttpError(503, 'Photo storage is not set up yet. Ask the admin to connect Google Drive.');
  return callScript(env, payload);
}
export const driveUpload = (env, { name, mime, data, folder }) => call(env, { action: 'upload', name, mime, data, folder });
export const driveGet = (env, id) => call(env, { action: 'get', id });
export const driveDelete = (env, id) => call(env, { action: 'delete', id });
