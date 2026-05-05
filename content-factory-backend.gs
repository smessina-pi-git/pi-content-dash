// ================================================================
//  CONTENT FACTORY — Google Apps Script Backend
//
//  SETUP:
//  1. Go to script.google.com → New project → paste this file
//  2. Click Deploy → New Deployment → Web App
//  3. Execute as: Me
//  4. Who has access: Anyone
//  5. Click Deploy → copy the Web App URL
//  6. Paste the URL into the Content Factory dashboard Settings
// ================================================================

var SHEETS = {

  'PAN Blast': {
    id:         '1F-AbiPiQyX5vm2Bh3e9mKrLZXtQ2yDStY3174Lw6zxE',
    tab:        'Calendar: blog',
    headerRow:  4,      // row number of the column headers
    prefix:     'pan',
    fields: {
      title:           'Asset Title',
      status:          'Status',
      owner:           'Owner',
      target_pub_date: 'Target publication date',
      description:     'Description',
      notes:           'Notes and next steps',
      pillar:          'Pillar topic',
      audience:        'Target audience',
      format:          'Format',
      keywords:        'Target keywords',
      drive_link:      'Google Drive link',
      live_link:       'Live link',
      pageviews:       'Total views',
    },
    // Sheet status values → dashboard canonical
    statusIn: {
      'in review':      'In Review',
      'in draft':       'In Production',
      'scheduled':      'Upcoming',
      'published':      'Published',
      'planned':        'Planned',
    },
    // Dashboard canonical → sheet status values
    statusOut: {
      'In Production':  'In draft',
      'In Review':      'In review',
      'Upcoming':       'Scheduled',
      'Planned':        'Planned',
      'Published':      'Published',
    },
  },

  '97th Floor': {
    id:         '1QxKiWyW6t5-VhtDNVTA9z85t-5mZ8bE--ARpFQUs3Ms',
    tab:        'All Content',
    headerRow:  1,
    prefix:     '97f',
    fields: {
      title:           'Asset Title',
      status:          'Status',
      owner:           'Content Owner',
      target_pub_date: 'Publish Date (PI)',
      description:     'Description',
      notes:           'Notes and next steps',
      pillar:          'Hub Topic',
      audience:        'Target audience',
      format:          'Format',
      keywords:        'Primary Keyword',
      drive_link:      'Asset Link',
      live_link:       'Live Link',
      pageviews:       '',         // no pageviews column in this sheet
    },
    statusIn: {
      'published':      'Published',
      'planned':        'Planned',
      'in progress':    'In Production',
      'in review':      'In Review',
      'upcoming':       'Upcoming',
      'scheduled':      'Upcoming',
      'in draft':       'In Production',
    },
    statusOut: {
      'In Production':  'In Progress',
      'In Review':      'In Review',
      'Upcoming':       'Upcoming',
      'Planned':        'Planned',
      'Published':      'Published',
    },
  },

  'Internal': {
    id:         '1nE-3yPvpQEQPWnmRjZLIIbMq89vmXbUUkeqEZ0ebRc0',
    tab:        'Content',       // will be created if it doesn't exist
    headerRow:  1,
    prefix:     'int',
    fields: {
      title:           'Asset Title',
      status:          'Status',
      owner:           'Owner',
      target_pub_date: 'Target publication date',
      description:     'Description',
      notes:           'Notes and next steps',
      pillar:          'Pillar topic',
      audience:        'Target audience',
      format:          'Format',
      keywords:        'Target keywords',
      drive_link:      'Google Drive link',
      live_link:       'Live link',
      pageviews:       'Pageviews',
      progress:        'Progress',
    },
    statusIn: {
      'in production':  'In Production',
      'in review':      'In Review',
      'upcoming':       'Upcoming',
      'planned':        'Planned',
      'published':      'Published',
    },
    statusOut: {
      'In Production':  'In Production',
      'In Review':      'In Review',
      'Upcoming':       'Upcoming',
      'Planned':        'Planned',
      'Published':      'Published',
    },
  },

};

// ================================================================
//  ENTRY POINT
// ================================================================

function doGet(e) {
  var result;
  try {
    var action  = e.parameter.action || 'read';
    var payload = null;

    if (e.parameter.data) {
      var decoded = Utilities.newBlob(
        Utilities.base64Decode(e.parameter.data)
      ).getDataAsString();
      payload = JSON.parse(decoded);
    }

    if      (action === 'read')   result = readAll();
    else if (action === 'write')  result = writeItem(payload);
    else if (action === 'delete') result = deleteItem(payload);
    else if (action === 'init')   result = initInternalSheet();
    else                          result = { error: 'Unknown action: ' + action };

  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================================================
//  READ — pull all items from all three sheets
// ================================================================

function readAll() {
  var items = [];
  for (var team in SHEETS) {
    try {
      var teamItems = readTeam(team);
      items = items.concat(teamItems);
    } catch (e) {
      items.push({ _error: true, team: team, msg: e.toString() });
    }
  }
  return { ok: true, items: items, ts: new Date().toISOString() };
}

function readTeam(team) {
  var cfg      = SHEETS[team];
  var ss       = SpreadsheetApp.openById(cfg.id);
  var sh       = ss.getSheetByName(cfg.tab);
  if (!sh) throw new Error('Tab "' + cfg.tab + '" not found');

  var lastRow  = sh.getLastRow();
  var dataStart = cfg.headerRow + 1;
  if (lastRow < dataStart) return [];

  var lastCol  = Math.max(sh.getLastColumn(), 1);

  // Read header row → build name → 0-based-index map
  var rawHeaders = sh.getRange(cfg.headerRow, 1, 1, lastCol).getValues()[0];
  var hIdx = {};
  rawHeaders.forEach(function(h, i) {
    if (h) hIdx[h.toString().trim().toLowerCase()] = i;
  });

  // Map canonical field → column index
  var fIdx = {};
  for (var f in cfg.fields) {
    var hdr = cfg.fields[f];
    if (hdr && hIdx[hdr.toLowerCase()] !== undefined) {
      fIdx[f] = hIdx[hdr.toLowerCase()];
    }
  }

  // Read all data rows at once
  var numRows = lastRow - dataStart + 1;
  var rows = sh.getRange(dataStart, 1, numRows, lastCol).getValues();
  var tz   = Session.getScriptTimeZone();

  var items = [];
  rows.forEach(function(row, ri) {
    var titleIdx = fIdx['title'];
    if (titleIdx === undefined) return;
    var titleVal = row[titleIdx];
    if (!titleVal || titleVal.toString().trim() === '') return;

    var item = {
      id:   cfg.prefix + '_' + (dataStart + ri),
      team: team,
      _row: dataStart + ri,
    };

    for (var f in fIdx) {
      var raw = row[fIdx[f]];
      if (raw instanceof Date) {
        var fmt = Utilities.formatDate(raw, tz, 'yyyy-MM-dd');
        item[f] = (fmt === '1899-12-30') ? '' : fmt;
      } else {
        item[f] = (raw !== null && raw !== undefined) ? raw.toString().trim() : '';
      }
    }

    // Normalise status → canonical dashboard value
    if (item.status) {
      var canonical = cfg.statusIn[item.status.toLowerCase()];
      if (canonical) item.status = canonical;
    }

    items.push(item);
  });

  return items;
}

// ================================================================
//  WRITE — insert or update a single item
// ================================================================

function writeItem(item) {
  if (!item || !item.team) return { error: 'Missing team' };

  var cfg = SHEETS[item.team];
  if (!cfg) return { error: 'Unknown team: ' + item.team };

  var ss  = SpreadsheetApp.openById(cfg.id);
  var sh  = ss.getSheetByName(cfg.tab);
  if (!sh) {
    if (item.team === 'Internal') {
      initInternalSheet();
      sh = ss.getSheetByName(cfg.tab);
    } else {
      return { error: 'Tab not found: ' + cfg.tab };
    }
  }

  var lastCol = Math.max(sh.getLastColumn(), 1);
  var rawHeaders = sh.getRange(cfg.headerRow, 1, 1, lastCol).getValues()[0];

  // Build header name → 1-based column number
  var hCol = {};
  rawHeaders.forEach(function(h, i) {
    if (h) hCol[h.toString().trim().toLowerCase()] = i + 1;
  });

  // Map canonical field → column number
  var fCol = {};
  for (var f in cfg.fields) {
    var hdr = cfg.fields[f];
    if (hdr && hCol[hdr.toLowerCase()]) fCol[f] = hCol[hdr.toLowerCase()];
  }

  // De-normalise status back to sheet's own vocabulary
  var outStatus = (cfg.statusOut[item.status] || item.status) || '';

  if (item._row) {
    // ── UPDATE existing row ──
    for (var f in fCol) {
      var val = (f === 'status') ? outStatus : (item[f] !== undefined ? item[f] : '');
      sh.getRange(item._row, fCol[f]).setValue(val);
    }
    SpreadsheetApp.flush();
    return { ok: true, action: 'updated', row: item._row };

  } else {
    // ── INSERT new row (Internal sheet only) ──
    if (item.team !== 'Internal') {
      return { error: 'New rows can only be inserted into the Internal sheet. PAN Blast and 97th Floor rows must be added directly in those spreadsheets.' };
    }

    var newRow = sh.getLastRow() + 1;
    for (var f in fCol) {
      var val = (f === 'status') ? outStatus : (item[f] !== undefined ? item[f] : '');
      sh.getRange(newRow, fCol[f]).setValue(val);
    }
    SpreadsheetApp.flush();

    var newId = cfg.prefix + '_' + newRow;
    return { ok: true, action: 'inserted', row: newRow, id: newId };
  }
}

// ================================================================
//  DELETE — remove a row from the sheet
// ================================================================

function deleteItem(item) {
  if (!item || !item._row || !item.team) return { error: 'Missing _row or team' };

  var cfg = SHEETS[item.team];
  if (!cfg) return { error: 'Unknown team' };

  var ss = SpreadsheetApp.openById(cfg.id);
  var sh = ss.getSheetByName(cfg.tab);
  if (!sh) return { error: 'Tab not found' };

  sh.deleteRow(item._row);
  SpreadsheetApp.flush();
  return { ok: true, action: 'deleted', row: item._row };
}

// ================================================================
//  INIT — create the Internal "Content" tab with headers
//  Called automatically the first time the dashboard connects
// ================================================================

function initInternalSheet() {
  var cfg = SHEETS['Internal'];
  var ss  = SpreadsheetApp.openById(cfg.id);
  var sh  = ss.getSheetByName(cfg.tab);

  if (!sh) {
    sh = ss.insertSheet(cfg.tab);
  }

  // Only write headers if the sheet is empty
  if (sh.getRange(1, 1).getValue() !== '') {
    return { ok: true, msg: 'Already initialized' };
  }

  var headers = Object.values(cfg.fields).filter(function(h) { return !!h; });
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);

  var headerRange = sh.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#0a0a12');
  headerRange.setFontColor('#FF9933');
  headerRange.setFontWeight('bold');
  sh.setFrozenRows(1);

  SpreadsheetApp.flush();
  return { ok: true, msg: 'Internal "Content" tab created with headers' };
}
