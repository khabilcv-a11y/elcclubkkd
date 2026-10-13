// Photos/media live in Google Drive. A small Google Apps Script (drive/Code.gs) running as the Drive owner
// does the saving, so no Google Cloud project or service account is needed.
import { HttpError } from './util.js';

export const driveConfigured = env => !!(env.DRIVE_SCRIPT_URL && env.DRIVE_SCRIPT_SECRET);

async function call(env, payload) {
  if (!driveConfigured(env)) throw new HttpError(503, 'Photo storage is not set up yet. Ask the admin to connect Google Drive.');
  const r = await fetch(env.DRIVE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ secret: env.DRIVE_SCRIPT_SECRET, ...payload }) });
  let d; try { d = await r.json(); } catch { throw new HttpError(502, 'Google Drive did not respond properly'); }
  if (d.error) throw new HttpError(502, 'Google Drive: ' + d.error);
  return d;
}
export const driveUpload = (env, { name, mime, data, folder }) => call(env, { action: 'upload', name, mime, data, folder });
export const driveGet = (env, id) => call(env, { action: 'get', id });
export const driveDelete = (env, id) => call(env, { action: 'delete', id });
