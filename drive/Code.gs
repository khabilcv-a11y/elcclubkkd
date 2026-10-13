/**
 * ELC Portal - Google Drive photo store.
 * Deploy: Extensions > Apps Script, paste this file, set the two values below,
 * then Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.
 * Copy the web-app URL into the portal's DRIVE_SCRIPT_URL, and SECRET into DRIVE_SCRIPT_SECRET.
 */
var ROOT_FOLDER_ID = 'PASTE_YOUR_DRIVE_FOLDER_ID_HERE';   // the folder URL ends with /folders/<this id>
var SECRET = 'PASTE_A_LONG_RANDOM_SECRET_HERE';

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    if (req.secret !== SECRET) return out({ error: 'Unauthorized' });
    if (req.action === 'upload') {
      var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
      var folder = sub(root, String(req.folder || 'general').slice(0, 100));
      var blob = Utilities.newBlob(Utilities.base64Decode(req.data), req.mime || 'image/jpeg', String(req.name || 'photo.jpg').slice(0, 120));
      return out({ id: folder.createFile(blob).getId() });
    }
    if (req.action === 'get') {
      var f = DriveApp.getFileById(req.id);
      return out({ mime: f.getMimeType(), data: Utilities.base64Encode(f.getBlob().getBytes()) });
    }
    if (req.action === 'delete') { DriveApp.getFileById(req.id).setTrashed(true); return out({ ok: true }); }
    return out({ error: 'Unknown action' });
  } catch (err) { return out({ error: String(err) }); }
}
function sub(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
