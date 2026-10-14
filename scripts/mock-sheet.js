// A local stand-in for Google Sheets + Apps Script, so you can run and test the portal without any Google setup.
// It runs the REAL apps-script/Code.gs against a small fake of SpreadsheetApp/DriveApp (strict about sheet bounds).
//   npm run mock        -> http://127.0.0.1:8799   (put SCRIPT_URL=http://127.0.0.1:8799/ and SCRIPT_SECRET=dev-secret in .dev.vars)
// Data is kept in data/mock-sheet.json. Set MOCK_LATENCY_MS=800 to feel what real Apps Script latency is like.
import http from 'node:http';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data'), FILE = path.join(DATA, 'mock-sheet.json');
const SECRET = process.env.MOCK_SECRET || 'dev-secret', LATENCY = Number(process.env.MOCK_LATENCY_MS || 0);
const persist = process.env.MOCK_PERSIST !== 'off';
fs.mkdirSync(DATA, { recursive: true });

// ---------- fake Google services ----------
const BOOK_ID = 'mock-book';
const state = persist && fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { sheets: {}, order: [], props: {}, files: {}, folders: {} };
state.updated ||= Date.now();
const touch = () => { state.updated = Date.now() + (state.bump = (state.bump || 0) + 1); };   // strictly increasing, like Drive's modified time
const save = () => { if (persist) fs.writeFileSync(FILE, JSON.stringify(state)); };
const A1 = s => { const m = /^([A-Z]+)(\d+)$/.exec(s); let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return [Number(m[2]), c]; };
const fail = m => { throw new Error('Mock Sheets: ' + m); };

function makeSheet(name) {
  const sh = state.sheets[name];
  const cell = (r, c) => (sh.grid[r - 1] && sh.grid[r - 1][c - 1] !== undefined ? sh.grid[r - 1][c - 1] : '');
  const chk = (r, c, nr, nc) => { if (r < 1 || c < 1 || r + nr - 1 > sh.maxRows || c + nc - 1 > sh.maxCols) fail(`range outside the grid: row ${r}+${nr} col ${c}+${nc} (grid ${sh.maxRows}x${sh.maxCols}) in "${name}"`); };
  const range = (r, c, nr = 1, nc = 1) => {
    chk(r, c, nr, nc);
    const rg = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => {
        const v = cell(r + i, c + j), f = sh.fmt[c + j];
        return f === '@' && v !== '' ? String(v) : v;
      })),
      getValue: () => cell(r, c),
      setValues: vals => {
        touch();
        if (vals.length !== nr || vals.some(row => row.length !== nc)) fail(`setValues size mismatch (${vals.length}x${vals[0]?.length} into ${nr}x${nc})`);
        vals.forEach((row, i) => row.forEach((v, j) => {
          if (v === undefined) fail('undefined cell value');
          const f = sh.fmt[c + j];
          (sh.grid[r + i - 1] ||= [])[c + j - 1] = f === '@' && v !== '' ? String(v) : v;     // text columns stay text, even "=1+1"
        }));
        return rg;
      },
      setValue: v => rg.setValues([[v]]),
      clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (sh.grid[r + i - 1]) sh.grid[r + i - 1][c + j - 1] = ''; return rg; },
      setNumberFormat: f => { for (let j = 0; j < nc; j++) sh.fmt[c + j] = f; return rg; },
      setFontWeight: () => rg, setBackground: () => rg,
    };
    return rg;
  };
  return {
    getRange: (a, b, c, d) => (typeof a === 'string' ? (([r, cc]) => range(r, cc))(A1(a)) : range(a, b, c, d)),
    getLastRow: () => { for (let i = sh.grid.length; i > 0; i--) if ((sh.grid[i - 1] || []).some(v => v !== '' && v !== undefined)) return i; return 0; },
    getMaxRows: () => sh.maxRows, getMaxColumns: () => sh.maxCols,
    insertRowsAfter: (_, n) => { sh.maxRows += n; }, insertColumnsAfter: (_, n) => { sh.maxCols += n; },
    setFrozenRows: () => {}, hideSheet: () => {},
  };
}
const SpreadsheetApp = { getActiveSpreadsheet: () => ({
  getSheetByName: n => (state.sheets[n] ? makeSheet(n) : null),
  insertSheet: n => { state.sheets[n] = { grid: [], fmt: {}, maxRows: 1000, maxCols: 26 }; state.order.push(n); return makeSheet(n); },
  getSheets: () => state.order.map(makeSheet),
  getId: () => BOOK_ID,
  deleteSheet: () => {},
}) };
const LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
const PropertiesService = { getScriptProperties: () => ({ getProperty: k => state.props[k] ?? null, setProperty: (k, v) => { state.props[k] = v; } }) };
const ContentService = { MimeType: { JSON: 'json' }, createTextOutput: t => ({ text: t, setMimeType() { return this; } }) };
const Utilities = {
  base64Decode: s => [...Buffer.from(s, 'base64')], base64Encode: b => Buffer.from(b).toString('base64'),
  newBlob: (bytes, mime, name) => ({ bytes, mime, name, getBytes: () => bytes, getContentType: () => mime }),
};
const DriveApp = {
  getFolderById: () => folder('root'),
  getFileById: id => id === BOOK_ID ? { getLastUpdated: () => new Date(state.updated) } : ({ getMimeType: () => state.files[id].mime, getBlob: () => ({ getBytes: () => [...Buffer.from(state.files[id].b64, 'base64')] }), setTrashed: () => { delete state.files[id]; } }),
};
function folder(id) {
  return { getFoldersByName: name => { const f = Object.entries(state.folders).find(([, v]) => v === name); let used = false; return { hasNext: () => !!f && !used, next: () => { used = true; return folder(f[0]); } }; },
    createFolder: name => { const nid = randomUUID(); state.folders[nid] = name; return folder(nid); },
    createFile: blob => { const fid = randomUUID(); state.files[fid] = { mime: blob.mime, b64: Buffer.from(blob.bytes).toString('base64') }; return { getId: () => fid }; } };
}

// ---------- run the real Code.gs ----------
const src = fs.readFileSync(path.join(ROOT, 'apps-script', 'Code.gs'), 'utf8')
  .replace(/var SECRET = '[^']*';/, `var SECRET = '${SECRET}';`).replace(/var PHOTO_FOLDER_ID = '[^']*';/, "var PHOTO_FOLDER_ID = 'mock-folder';");
const sandbox = { SpreadsheetApp, LockService, PropertiesService, ContentService, Utilities, DriveApp, console, JSON, Date, Error, String, Number, Object, Array, Math };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

let busy = Promise.resolve();       // one request at a time, like a script lock
http.createServer((req, res) => {
  let body = '';
  req.on('data', d => { body += d; });
  req.on('end', () => {
    busy = busy.then(async () => {
      if (LATENCY) await new Promise(r => setTimeout(r, LATENCY));
      let out;
      if (req.url === '/__edit' && req.method === 'POST') {          // test helper: change a cell "by hand" (no version bump)
        const { sheet, row, col, value } = JSON.parse(body);
        makeSheet(sheet).getRange(row, col).setValue(value); out = JSON.stringify({ ok: true }); save();
      } else if (req.method !== 'POST') out = sandbox.doGet().text;
      else { out = sandbox.doPost({ postData: { contents: body } }).text; save(); }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(out);
    }).catch(e => { res.writeHead(500); res.end(JSON.stringify({ error: String(e) })); });
  });
}).listen(Number(process.env.MOCK_PORT || 8799), '127.0.0.1', () => console.log(`Mock Google Sheet service on http://127.0.0.1:${process.env.MOCK_PORT || 8799}/  (secret: ${SECRET})`));
