/**
 * ELC Portal - Google Sheet database + Drive photo service.
 *
 * Setup (once):
 *  1. Open your Google Sheet -> Extensions -> Apps Script. Delete the sample code and paste this whole file.
 *  2. Set SECRET (a long random string) and PHOTO_FOLDER_ID (id of a Drive folder for photos) below.
 *  3. Deploy -> New deployment -> type "Web app" -> Execute as: Me -> Who has access: Anyone -> Deploy. Authorise when asked.
 *  4. Copy the Web app URL. Give it to the portal as SCRIPT_URL, and SECRET as SCRIPT_SECRET.
 * The tabs and headings are created automatically the first time the portal connects. Don't rename tabs or headings.
 * Every write takes a lock, so two colleges saving at the same moment queue up instead of overwriting each other.
 */
var SECRET = 'PASTE_A_LONG_RANDOM_SECRET_HERE';
var PHOTO_FOLDER_ID = 'PASTE_YOUR_DRIVE_FOLDER_ID_HERE';

var RECENT = { logs: 600, outbox: 250 };   // the portal only shows the latest of these; older rows stay in the sheet

function doGet() { return ContentService.createTextOutput('ELC database service is running.'); }

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    if (!req.secret || req.secret !== SECRET) return out({ error: 'Unauthorized' });
    switch (req.action) {
      case 'ping': return out({ ok: true, version: getVersion(), stamp: stamp(), setup: !!getSchema() });
      case 'load': return out(load(req));
      case 'setup': return out(locked(function () { return setup(req.schema); }));
      case 'apply': return out(locked(function () { return apply(req.ops || []); }));
      case 'upload': return out(upload(req));
      case 'get': return out(getFile(req));
      case 'delete': return out(deleteFile(req));
      default: return out({ error: 'Unknown action' });
    }
  } catch (err) { return out({ error: String(err && err.message ? err.message : err), conflict: !!(err && err.conflict) }); }
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function locked(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// ---------- bookkeeping ----------
function props() { return PropertiesService.getScriptProperties(); }
function getVersion() { return Number(props().getProperty('version') || 0); }
// changes whenever the portal writes OR someone edits the sheet by hand
function stamp() { return getVersion() + ':' + DriveApp.getFileById(ss().getId()).getLastUpdated().getTime(); }
function getSchema() {
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('_meta');
  if (!s) return null;
  var v = s.getRange('B1').getValue();
  return v ? JSON.parse(v) : null;
}
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

// ---------- setup: create one tab per table ----------
function setup(schema) {
  var book = ss();
  Object.keys(schema).forEach(function (name) {
    var t = schema[name], cols = t.cols, sh = book.getSheetByName(name) || book.insertSheet(name);
    var width = cols.length;
    if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
    cols.forEach(function (c, i) {
      var col = sh.getRange(1, i + 1, sh.getMaxRows(), 1);
      col.setNumberFormat(c[1] === 'TEXT' ? '@' : c[1] === 'REAL' ? '0.######' : '0');
    });
    sh.getRange(1, 1, 1, width).setValues([cols.map(function (c) { return c[0]; })]).setFontWeight('bold').setBackground('#eeeeee');
    sh.setFrozenRows(1);
  });
  var meta = book.getSheetByName('_meta') || book.insertSheet('_meta');
  meta.getRange('A1').setValue('schema');
  meta.getRange('B1').setNumberFormat('@').setValue(JSON.stringify(schema));
  meta.hideSheet();
  var first = book.getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && book.getSheets().length > 1) book.deleteSheet(first);
  return { ok: true, version: getVersion() };
}

// ---------- read everything (one call, used to refresh the portal's fast copy) ----------
function readTable(sh, ncols, pkIdx, lastN) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  var from = lastN ? Math.max(2, last - lastN + 1) : 2;          // big append-only tabs: only the newest rows are needed
  var vals = sh.getRange(from, 1, last - from + 1, ncols).getValues(), rows = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i], empty = true;
    for (var p = 0; p < pkIdx.length; p++) if (r[pkIdx[p]] !== '' && r[pkIdx[p]] !== null) empty = false;
    if (empty) continue;
    for (var c = 0; c < r.length; c++) if (r[c] instanceof Date) r[c] = r[c].toISOString();
    rows.push(r);
  }
  return rows;
}
function pkIndexes(t) { return t.pk.map(function (k) { return t.cols.findIndex(function (c) { return c[0] === k; }); }); }

function load(req) {
  if (req.since != null && String(req.since) === stamp() && getSchema()) return { same: true, version: getVersion(), stamp: String(req.since) };
  return locked(function () {
    var schema = getSchema(), version = getVersion();
    if (!schema) return { init: false, version: version, stamp: stamp() };
    var tables = {};
    Object.keys(schema).forEach(function (name) {
      var sh = ss().getSheetByName(name);
      tables[name] = sh ? readTable(sh, schema[name].cols.length, pkIndexes(schema[name]), RECENT[name]) : [];
    });
    return { init: tables.villages.length > 0, version: getVersion(), stamp: stamp(), tables: tables };
  });
}

// ---------- write only the rows that changed ----------
function keyOf(row, idx) { return idx.map(function (i) { return String(row[i]); }).join('|'); }
function cellsOut(row) { return row.map(function (v) { return v === null || v === undefined ? '' : v; }); }
function ensureRows(sh, upto) {
  if (sh.getMaxRows() < upto) sh.insertRowsAfter(sh.getMaxRows(), upto - sh.getMaxRows() + 200);
}

function apply(ops) {
  var schema = getSchema();
  if (!schema) throw new Error('Not set up yet');
  var byTable = {};
  ops.forEach(function (o) {
    if (!schema[o.t]) throw new Error('Unknown table ' + o.t);
    (byTable[o.t] = byTable[o.t] || []).push(o);
  });
  var plans = [];
  // phase 1: work out the new state of every touched table and check uniqueness BEFORE writing anything
  Object.keys(byTable).forEach(function (name) {
    var t = schema[name], list = byTable[name], ncols = t.cols.length, idx = pkIndexes(t), sh = ss().getSheetByName(name);
    if (!sh) throw new Error('Missing tab ' + name);
    var needRead = (t.unique && t.unique.length > 0) || list.some(function (o) { return o.op !== 'i'; });
    if (!needRead) { plans.push({ name: name, sh: sh, ncols: ncols, append: list.map(function (o) { return cellsOut(o.row); }), mode: 'append' }); return; }
    var rows = readTable(sh, ncols, idx), map = {};
    rows.forEach(function (r, i) { map[keyOf(r, idx)] = i; });
    var changed = {}, appended = [], deletes = 0, deleted = {};
    list.forEach(function (o) {
      var key = o.pk.map(String).join('|'), at = map[key];
      if (o.op === 'd') { if (at !== undefined) { deleted[key] = true; deletes++; } return; }
      var row = cellsOut(o.row);
      if (o.op === 'u' && (at === undefined || deleted[key])) {      // the portal's copy was out of date: refuse instead of re-creating a removed row
        var ce = new Error('That record was changed or removed by someone else. Please refresh the page and try again.'); ce.conflict = true; throw ce;
      }
      if (at !== undefined && !deleted[key]) { rows[at] = row; changed[key] = at; }
      else { map[key] = rows.length; rows.push(row); appended.push(rows.length - 1); if (deleted[key]) { delete deleted[key]; deletes--; changed[key] = rows.length - 1; } }
    });
    var live = rows.filter(function (r) { return !deleted[keyOf(r, idx)]; });
    (t.unique || []).forEach(function (cols) {
      var ci = cols.map(function (c) { return t.cols.findIndex(function (x) { return x[0] === c; }); }), seen = {};
      live.forEach(function (r) {
        var vals = ci.map(function (i) { return r[i]; });
        if (vals.some(function (v) { return v === '' || v === null; })) return;
        var k = vals.map(function (v) { return String(v).toLowerCase(); }).join('|');
        if (seen[k]) { var e = new Error('Duplicate value for ' + name + '.' + cols.join('+') + ' (' + vals.join(', ') + ')'); e.conflict = true; throw e; }
        seen[k] = true;
      });
    });
    var nChanged = Object.keys(changed).length;
    plans.push({ name: name, sh: sh, ncols: ncols, live: live, oldCount: readCount(sh), rows: rows, changed: changed, appended: appended, deletes: deletes,
      mode: (deletes === 0 && nChanged <= 6) ? 'targeted' : 'rewrite' });
  });
  // phase 2: write
  plans.forEach(function (p) {
    var sh = p.sh;
    if (p.mode === 'append') {
      if (!p.append.length) return;
      var last = Math.max(sh.getLastRow(), 1);
      ensureRows(sh, last + p.append.length);
      sh.getRange(last + 1, 1, p.append.length, p.ncols).setValues(p.append);
    } else if (p.mode === 'targeted') {
      Object.keys(p.changed).forEach(function (k) {
        var at = p.changed[k];
        if (p.appended.indexOf(at) >= 0) return;
        sh.getRange(at + 2, 1, 1, p.ncols).setValues([p.rows[at]]);
      });
      var news = p.appended.map(function (i) { return p.rows[i]; });
      if (news.length) { var l = Math.max(sh.getLastRow(), 1); ensureRows(sh, l + news.length); sh.getRange(l + 1, 1, news.length, p.ncols).setValues(news); }
    } else {
      ensureRows(sh, p.live.length + 1);
      if (p.oldCount > 0) sh.getRange(2, 1, p.oldCount, p.ncols).clearContent();
      if (p.live.length) sh.getRange(2, 1, p.live.length, p.ncols).setValues(p.live);
    }
  });
  var v = getVersion() + 1;
  props().setProperty('version', String(v));
  return { ok: true, version: v, stamp: stamp() };
}
function readCount(sh) { return Math.max(sh.getLastRow() - 1, 0); }

// ---------- photos in Drive ----------
function folderFor(path) {
  var cur = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  String(path).split('/').forEach(function (part) {
    part = part.trim();
    if (!part) return;
    var it = cur.getFoldersByName(part);
    cur = it.hasNext() ? it.next() : cur.createFolder(part);
  });
  return cur;
}
function upload(req) {
  if (PHOTO_FOLDER_ID.indexOf('PASTE') === 0) return { error: 'PHOTO_FOLDER_ID is not set in the Apps Script' };
  var blob = Utilities.newBlob(Utilities.base64Decode(req.data), req.mime || 'image/jpeg', String(req.name || 'photo.jpg').slice(0, 120));
  return { id: folderFor(String(req.folder || 'general').slice(0, 100)).createFile(blob).getId() };
}
function getFile(req) {
  var f = DriveApp.getFileById(req.id);
  return { mime: f.getMimeType(), data: Utilities.base64Encode(f.getBlob().getBytes()) };
}
function deleteFile(req) { DriveApp.getFileById(req.id).setTrashed(true); return { ok: true }; }
