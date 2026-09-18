/**
 * Google Apps Script for ICR Digitization Portal
 * Synchronizes with Google Sheets in real-time.
 * Manages Master School List, Row-Wise Device Serial Inventory, Status Tracking, and Concurrency-Safe Duplicate Prevention.
 */

// Global Sheet Names
const SHEET_INVENTORY = 'Device_Serial_Inventory';
const SHEET_STATUS = 'School_Status';
const SHEET_MASTER = 'Master_Schools';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Utility: Format date to dd-mmm-yyyy (e.g. 13-Sep-2026)
 */
function formatDDMMMYYYY(input) {
  if (!input) return '';
  const str = String(input).trim();
  if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(str)) {
    return str;
  }

  let d;
  if (input instanceof Date) {
    d = input;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  } else {
    d = new Date(str);
  }

  if (isNaN(d.getTime())) return str;

  const day = ('0' + d.getDate()).slice(-2);
  const mon = MONTH_NAMES[d.getMonth()];
  const yr = d.getFullYear();
  return day + '-' + mon + '-' + yr;
}

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Ensure all 3 core sheets exist
    getOrCreateSheet(ss, SHEET_MASTER);
    getOrCreateSheet(ss, SHEET_STATUS);
    getOrCreateSheet(ss, SHEET_INVENTORY);

    // 1. Fetch Dynamic Master School List directly from Google Sheet
    if (action === 'getMasterSchools') {
      const sheet = getOrCreateSheet(ss, SHEET_MASTER);
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return jsonResponse({ success: true, data: [] });
      }
      const headers = data[0];
      const rows = data.slice(1).map(r => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = r[idx];
        });
        
        const incSmart = String(obj['Including_Smart'] || obj['Including Smart'] || 'No').trim();
        const rawType = String(obj['Raw_Type'] || obj['ICT Type'] || 'Smart_Class').trim();
        const isIncSmart = (incSmart.toLowerCase() === 'yes');

        let calcCat = String(obj['Category'] || '').trim();
        let devCount = Number(obj['Device_Count']) || 0;

        if (!calcCat) {
          if (rawType === 'ICT_05_Nods_INCS') {
            calcCat = isIncSmart ? 'ICT_05_INCS_WITH_SMART' : 'ICT_05_INCS_ONLY';
            devCount = isIncSmart ? 12 : 8;
          } else if (rawType === 'ICT_05_Nods') {
            calcCat = 'ICT_05_NODES';
            devCount = 17;
          } else if (rawType === 'ICT_10_Nods') {
            calcCat = 'ICT_10_NODES';
            devCount = 27;
          } else {
            calcCat = 'SMART_ONLY';
            devCount = 4;
          }
        }

        return {
          udise: String(obj['UDISE_CODE'] || obj['UDISE Code'] || obj['udise'] || '').trim(),
          snil: String(obj['SNIL_CODE'] || obj['SNIL Code'] || obj['snil'] || '').trim(),
          school_name: String(obj['School_Name'] || obj['School Name'] || obj['school_name'] || '').trim(),
          district: String(obj['District'] || obj['district'] || '').trim(),
          block: String(obj['Block_Name'] || obj['Block Name'] || obj['block'] || '').trim(),
          raw_type: rawType,
          including_smart: isIncSmart ? 'Yes' : 'No',
          category: calcCat,
          device_count: devCount
        };
      }).filter(s => s.udise && s.school_name);

      return jsonResponse({ success: true, count: rows.length, data: rows });
    }

    // 2. Fetch Completion Status for all schools
    if (action === 'getAllStatus') {
      const sheet = getOrCreateSheet(ss, SHEET_STATUS);
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return jsonResponse({ success: true, data: [] });
      }
      const headers = data[0];
      const rows = data.slice(1).map(r => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = r[idx];
        });
        // Format date to dd-mmm-yyyy
        if (obj['Installation_Date']) {
          obj['Installation_Date'] = formatDDMMMYYYY(obj['Installation_Date']);
        }
        return obj;
      });
      return jsonResponse({ success: true, data: rows });
    }

    // 3. Fetch Full Row-Wise Inventory for Excel Export
    if (action === 'getInventory') {
      const sheet = getOrCreateSheet(ss, SHEET_INVENTORY);
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return jsonResponse({ success: true, data: [] });
      }
      const headers = data[0];
      const rows = data.slice(1).map(r => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = r[idx];
        });
        if (obj['Installation_Date']) {
          obj['Installation_Date'] = formatDDMMMYYYY(obj['Installation_Date']);
        }
        return obj;
      });
      return jsonResponse({ success: true, data: rows });
    }

    // 4. Real-time Single Serial Lookup
    if (action === 'checkSerial') {
      const serial = (e.parameter.serial || '').trim().toUpperCase();
      if (!serial) {
        return jsonResponse({ success: true, exists: false });
      }

      const match = findSerialInInventory(ss, serial);
      if (match) {
        return jsonResponse({
          success: true,
          exists: true,
          match: match
        });
      }
      return jsonResponse({ success: true, exists: false });
    }

    // 5. Real-time Batch Serial Lookup (Verify all form serials in 1 fast call)
    if (action === 'checkBatchSerials') {
      const serialsParam = (e.parameter.serials || '').trim();
      const list = serialsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const inventorySheet = getOrCreateSheet(ss, SHEET_INVENTORY);
      const data = inventorySheet.getDataRange().getValues();
      const matches = [];

      if (data.length > 1 && list.length > 0) {
        // Use header-based lookup for robustness
        const headers = data[0];
        const colIdx = {};
        headers.forEach(function(h, i) { colIdx[String(h).trim()] = i; });

        var serialCol = colIdx['Serial_Number'] !== undefined ? colIdx['Serial_Number'] : 9;
        var udiseCol = colIdx['UDISE_Code'] !== undefined ? colIdx['UDISE_Code'] : 1;
        var snilCol = colIdx['SNIL_Code'] !== undefined ? colIdx['SNIL_Code'] : 2;
        var schoolCol = colIdx['School_Name'] !== undefined ? colIdx['School_Name'] : 3;
        var distCol = colIdx['District'] !== undefined ? colIdx['District'] : 4;
        var blockCol = colIdx['Block_Name'] !== undefined ? colIdx['Block_Name'] : 5;
        var catCol = colIdx['Lab_Category'] !== undefined ? colIdx['Lab_Category'] : 6;
        var itemCol = colIdx['Item_Name'] !== undefined ? colIdx['Item_Name'] : 7;
        var makeCol = colIdx['Make_And_Model'] !== undefined ? colIdx['Make_And_Model'] : 8;
        var dateCol = colIdx['Installation_Date'] !== undefined ? colIdx['Installation_Date'] : 12;
        // Handle both old and new header names for installer
        var installerCol = colIdx['Installed_By'] !== undefined ? colIdx['Installed_By'] : (colIdx['Updated_By_Name'] !== undefined ? colIdx['Updated_By_Name'] : 13);
        var mobileCol = colIdx['Updated_By_Mobile'] !== undefined ? colIdx['Updated_By_Mobile'] : 14;
        var tsCol = colIdx['Submission_Timestamp'] !== undefined ? colIdx['Submission_Timestamp'] : 15;

        const serialSet = new Set(list);
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const sn = String(row[serialCol] || '').trim().toUpperCase();
          if (serialSet.has(sn)) {
            matches.push({
              serialNumber: sn,
              udise: row[udiseCol],
              snil: row[snilCol],
              schoolName: row[schoolCol],
              district: row[distCol],
              block: row[blockCol],
              category: row[catCol],
              itemName: row[itemCol],
              makeModel: row[makeCol],
              installDate: formatDDMMMYYYY(row[dateCol]),
              installedBy: row[installerCol] || '',
              updatedByName: row[installerCol] || '',
              mobile: row[mobileCol],
              timestamp: row[tsCol]
            });
          }
        }
      }

      return jsonResponse({
        success: true,
        exists: matches.length > 0,
        matches: matches
      });
    }

    return jsonResponse({
      success: true,
      message: 'ICR Digitization Portal Google Apps Script API is Live!'
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Handle POST requests (Batch Insert & Seeding)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    getOrCreateSheet(ss, SHEET_MASTER);
    getOrCreateSheet(ss, SHEET_STATUS);
    getOrCreateSheet(ss, SHEET_INVENTORY);

    // Action: Seed Master Schools
    if (payload.action === 'seedMasterSchools') {
      const masterSheet = getOrCreateSheet(ss, SHEET_MASTER);
      const schools = payload.schools || [];
      if (schools.length > 0) {
        const lastRow = masterSheet.getLastRow();
        if (lastRow > 1) {
          masterSheet.getRange(2, 1, lastRow - 1, masterSheet.getLastColumn()).clearContent();
        }
        const rows = schools.map((s, idx) => [
          idx + 1,
          s.raw_type || '',
          s.district || '',
          s.block || '',
          s.snil || '',
          s.udise || '',
          s.school_name || '',
          s.including_smart || 'No',
          s.category || '',
          s.device_count || 4
        ]);
        masterSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
        return jsonResponse({
          success: true,
          message: `Successfully seeded ${rows.length} master schools into Google Sheet!`
        });
      }
    }

    const udise = String(payload.udise || '').trim();
    const snil = String(payload.snil || '').trim();
    const schoolName = String(payload.school_name || '').trim();
    const district = String(payload.district || '').trim();
    const block = String(payload.block || '').trim();
    const category = String(payload.category || '').trim();
    const installedBy = String(payload.installed_by || payload.technician_name || '').trim();
    const techMobile = String(payload.technician_mobile || '').trim();
    const installDate = formatDDMMMYYYY(payload.installation_date || ''); // Format: dd-mmm-yyyy (e.g. 13-Sep-2026)
    const devices = payload.devices || [];

    if (!udise || !installedBy || !techMobile || devices.length === 0) {
      return jsonResponse({
        success: false,
        error: 'Missing mandatory fields (UDISE, Installed By, Mobile, or Devices).'
      });
    }

    const inventorySheet = getOrCreateSheet(ss, SHEET_INVENTORY);
    const statusSheet = getOrCreateSheet(ss, SHEET_STATUS);

    // 1. Verify that school is not already completed
    const existingStatus = findSchoolStatus(statusSheet, udise);
    if (existingStatus && existingStatus.Status === 'Completed') {
      return jsonResponse({
        success: false,
        error: `School ${schoolName} (UDISE: ${udise}) has already been completed by ${existingStatus.Installed_By || existingStatus.Updated_By_Name}.`
      });
    }

    // 2. Real-time duplicate verification
    const currentInventory = inventorySheet.getDataRange().getValues();
    const serialIndex = 9; // Serial_Number column index
    const existingSerialsMap = new Map();

    for (let i = 1; i < currentInventory.length; i++) {
      const row = currentInventory[i];
      const sn = String(row[serialIndex] || '').trim().toUpperCase();
      if (sn) {
        existingSerialsMap.set(sn, {
          schoolName: row[3],
          udise: row[1],
          itemName: row[7],
          installedBy: row[13],
          mobile: row[14],
          installDate: formatDDMMMYYYY(row[12])
        });
      }
    }

    const payloadSeen = new Set();
    for (let d of devices) {
      const sn = String(d.serial_number || d.serial || '').trim().toUpperCase();
      if (!sn) continue;

      if (payloadSeen.has(sn)) {
        return jsonResponse({
          success: false,
          error: `Duplicate serial number detected in form: ${sn}`
        });
      }
      payloadSeen.add(sn);

      if (existingSerialsMap.has(sn)) {
        const exist = existingSerialsMap.get(sn);
        return jsonResponse({
          success: false,
          duplicate_detected: true,
          error: `Serial Number "${sn}" is already registered!`,
          details: {
            serial: sn,
            schoolName: exist.schoolName,
            udise: exist.udise,
            itemName: exist.itemName,
            installedBy: exist.installedBy,
            mobile: exist.mobile,
            date: exist.installDate
          }
        });
      }
    }

    // 3. ROW-WISE INSERTION into Device_Serial_Inventory
    const submissionId = 'SUB-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();
    const nowTimestamp = formatDDMMMYYYY(now) + ' ' + Utilities.formatDate(now, 'Asia/Kolkata', 'HH:mm:ss');

    const newInventoryRows = devices.map(d => {
      return [
        submissionId,
        udise,
        snil,
        schoolName,
        district,
        block,
        category,
        d.item_name || d.name || '',
        d.make_model || d.make || '',
        String(d.serial_number || d.serial || '').trim().toUpperCase(),
        'Yes', // Installed
        'Yes', // Working
        installDate, // dd-mmm-yyyy format
        installedBy, // Installed_By
        techMobile,
        nowTimestamp
      ];
    });

    if (newInventoryRows.length > 0) {
      const nextRow = inventorySheet.getLastRow() + 1;
      inventorySheet.getRange(nextRow, 1, newInventoryRows.length, newInventoryRows[0].length)
        .setValues(newInventoryRows);
    }

    // 4. Update / Insert in School_Status Sheet
    upsertSchoolStatus(statusSheet, {
      udise: udise,
      snil: snil,
      schoolName: schoolName,
      district: district,
      block: block,
      category: category,
      status: 'Completed',
      totalDevices: devices.length,
      installedBy: installedBy,
      mobile: techMobile,
      installDate: installDate, // dd-mmm-yyyy
      timestamp: nowTimestamp,
      devicesJson: JSON.stringify(devices)
    });

    return jsonResponse({
      success: true,
      message: `Successfully recorded ${newInventoryRows.length} device serials for ${schoolName}!`,
      submissionId: submissionId,
      timestamp: nowTimestamp
    });

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Helper: Find serial in inventory
 */
function findSerialInInventory(ss, serial) {
  const sheet = getOrCreateSheet(ss, SHEET_INVENTORY);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  // Header-based lookup
  const headers = data[0];
  const colIdx = {};
  headers.forEach(function(h, i) { colIdx[String(h).trim()] = i; });

  var serialCol = colIdx['Serial_Number'] !== undefined ? colIdx['Serial_Number'] : 9;
  var installerCol = colIdx['Installed_By'] !== undefined ? colIdx['Installed_By'] : (colIdx['Updated_By_Name'] !== undefined ? colIdx['Updated_By_Name'] : 13);
  var mobileCol = colIdx['Updated_By_Mobile'] !== undefined ? colIdx['Updated_By_Mobile'] : 14;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const sn = String(row[serialCol] || '').trim().toUpperCase();
    if (sn === serial) {
      return {
        serialNumber: sn,
        udise: row[colIdx['UDISE_Code'] !== undefined ? colIdx['UDISE_Code'] : 1],
        snil: row[colIdx['SNIL_Code'] !== undefined ? colIdx['SNIL_Code'] : 2],
        schoolName: row[colIdx['School_Name'] !== undefined ? colIdx['School_Name'] : 3],
        district: row[colIdx['District'] !== undefined ? colIdx['District'] : 4],
        block: row[colIdx['Block_Name'] !== undefined ? colIdx['Block_Name'] : 5],
        category: row[colIdx['Lab_Category'] !== undefined ? colIdx['Lab_Category'] : 6],
        itemName: row[colIdx['Item_Name'] !== undefined ? colIdx['Item_Name'] : 7],
        makeModel: row[colIdx['Make_And_Model'] !== undefined ? colIdx['Make_And_Model'] : 8],
        installDate: formatDDMMMYYYY(row[colIdx['Installation_Date'] !== undefined ? colIdx['Installation_Date'] : 12]),
        installedBy: row[installerCol] || '',
        updatedByName: row[installerCol] || '',
        mobile: row[mobileCol],
        timestamp: row[colIdx['Submission_Timestamp'] !== undefined ? colIdx['Submission_Timestamp'] : 15]
      };
    }
  }
  return null;

}

/**
 * Helper: Find school status
 */
function findSchoolStatus(sheet, udise) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;
  const headers = data[0];
  const udiseIdx = headers.indexOf('UDISE_Code');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][udiseIdx]) === String(udise)) {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = data[i][idx];
      });
      return obj;
    }
  }
  return null;
}

/**
 * Helper: Upsert School Status
 */
function upsertSchoolStatus(sheet, s) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const udiseIdx = headers.indexOf('UDISE_Code');
  let targetRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][udiseIdx]) === String(s.udise)) {
      targetRow = i + 1;
      break;
    }
  }

  const rowValues = [
    s.udise,
    s.snil,
    s.schoolName,
    s.district,
    s.block,
    s.category,
    s.status,
    s.totalDevices,
    s.installedBy,
    s.mobile,
    s.installDate, // dd-mmm-yyyy
    s.timestamp,
    s.devicesJson
  ];

  if (targetRow !== -1) {
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

/**
 * Get sheet or create with formatted headers
 */
function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_INVENTORY) {
      const headers = [
        'Submission_ID', 'UDISE_Code', 'SNIL_Code', 'School_Name', 'District',
        'Block_Name', 'Lab_Category', 'Item_Name', 'Make_And_Model', 'Serial_Number',
        'Installed_Status', 'Working_Status', 'Installation_Date', 'Installed_By',
        'Updated_By_Mobile', 'Submission_Timestamp'
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e0effe');
      sheet.setFrozenRows(1);
    } else if (name === SHEET_STATUS) {
      const headers = [
        'UDISE_Code', 'SNIL_Code', 'School_Name', 'District', 'Block_Name',
        'Lab_Category', 'Status', 'Total_Devices', 'Installed_By',
        'Updated_By_Mobile', 'Installation_Date', 'Last_Updated_Timestamp', 'Device_Serials_JSON'
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fef3c7');
      sheet.setFrozenRows(1);
    } else if (name === SHEET_MASTER) {
      const headers = [
        'SL', 'Raw_Type', 'District', 'Block_Name', 'SNIL_CODE', 'UDISE_CODE',
        'School_Name', 'Including_Smart', 'Category', 'Device_Count'
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#dcfce7');
      sheet.setFrozenRows(1);
    }
  } else {
    // If sheet exists with old header name, update header row
    const firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const oldIdx = firstRow.indexOf('Updated_By_Name');
    if (oldIdx !== -1) {
      sheet.getRange(1, oldIdx + 1).setValue('Installed_By');
    }
  }
  return sheet;
}

/**
 * Utility: JSON response output with CORS headers
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
