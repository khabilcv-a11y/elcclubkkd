export class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
export const bad = (m, extra) => new HttpError(400, m, extra);

export function fmtDate(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// the programme runs on Indian time regardless of where the Worker executes
export const todayStr = () => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
export const nowIso = () => new Date().toISOString();
export const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z'));
const toUtc = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };

export function dateRange(start, end, skipSundays) {
  const out = [];
  const e = toUtc(end);
  for (let d = toUtc(start); d <= e; d = new Date(d.getTime() + 864e5)) {
    if (skipSundays && d.getUTCDay() === 0) continue;
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function haversine(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v == null || isNaN(v))) return null;
  const R = 6371, rad = x => x * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)) * 10) / 10;
}

// ---- hashing with Web Crypto (works in Workers and Node) ----
const enc = new TextEncoder();
const toHex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const fromHex = h => Uint8Array.from(h.match(/../g) || [], x => parseInt(x, 16));
async function pbkdf2(secret, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}
// Passwords: 100k rounds. Random passcodes are protected by rate limiting, so fewer rounds keep logins quick.
export async function hashSecret(secret, iterations = 100000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${iterations}$${toHex(salt)}$${toHex(await pbkdf2(secret, salt, iterations))}`;
}
export async function verifySecret(secret, stored) {
  const [alg, it, salt, hash] = String(stored || '').split('$');
  if (alg !== 'pbkdf2' || !hash) return false;
  const got = await pbkdf2(String(secret), fromHex(salt), Number(it)), want = fromHex(hash);
  let diff = got.length ^ want.length;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newPasscode() {
  let s = '';
  for (const b of crypto.getRandomValues(new Uint8Array(8))) s += ALPHA[b % ALPHA.length];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
export const normPasscode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const token = (n = 24) => {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export function str(v, max = 200) {
  if (v == null) return '';
  return String(v).trim().slice(0, max);
}
export function reqStr(v, label, max = 200) {
  const s = str(v, max);
  if (!s) throw bad(`${label} is required`);
  return s;
}
export function int(v, label, { min = 0, max = 1e7 } = {}) {
  const n = Number(v === '' || v == null ? 0 : v);
  if (!Number.isInteger(n) || n < min || n > max) throw bad(`${label} must be a whole number between ${min} and ${max}`);
  return n;
}
export function num(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
export function phone(v, label = 'Contact number') {
  const s = String(v || '').replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(s)) throw bad(`${label} must be a valid 10-digit mobile number`);
  return s;
}
export function emailOk(v, label = 'Email') {
  const s = str(v, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw bad(`${label} is not a valid email address`);
  return s;
}

export function csv(rows, cols) {
  const cell = v => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.map(c => cell(c.label)).join(','),
    ...rows.map(r => cols.map(c => cell(r[c.key])).join(','))].join('\r\n');
}
// unique-violation (local SQLite or the sheet's lock-protected check)
export const isDup = e => !!e && (/UNIQUE constraint failed/i.test(e.message || '') || e.extra?.code === 'conflict');
