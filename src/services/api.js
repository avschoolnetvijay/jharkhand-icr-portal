import * as XLSX from 'xlsx';
import defaultSchools from '../data/schools_master.json';

// Storage keys
const STORAGE_API_URL = 'icr_google_script_url';
const STORAGE_INVENTORY = 'icr_local_inventory';
const STORAGE_STATUS = 'icr_local_status';
const STORAGE_STATUS_CACHE = 'icr_cached_status_map';
const STORAGE_MASTER_SCHOOLS = 'icr_cached_master_schools';
const STORAGE_SERIAL_REGISTRY = 'icr_registered_serials_registry';

// Permanent default Google Apps Script Web App URL for Jharkhand ICT & Smart Class Project
const PERMANENT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxsfUCtKWIanqeBdfdcQpkGAxo03F6KjoNp_eDfmWld1UgxjpDqUdd1mxLv9afIu9VP/exec';

const DEFAULT_API_URL = import.meta.env?.VITE_GOOGLE_SCRIPT_URL || PERMANENT_SCRIPT_URL;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format any date string or Date object to dd-mmm-yyyy (e.g. 13-Sep-2026)
 */
export const formatDateDDMMMYYYY = (input) => {
  if (!input) return '';
  const str = String(input).trim();
  if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(str)) {
    return str;
  }

  let d;
  if (input instanceof Date) {
    d = input;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, day] = str.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [day, m, y] = str.split('/').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(str);
  }

  if (isNaN(d.getTime())) return str;

  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const getApiUrl = () => {
  return localStorage.getItem(STORAGE_API_URL) || DEFAULT_API_URL;
};

export const setApiUrl = (url) => {
  if (url) {
    localStorage.setItem(STORAGE_API_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_API_URL);
  }
};

/**
 * Instant retrieve cached master schools
 */
export const getCachedMasterSchools = () => {
  try {
    const cached = localStorage.getItem(STORAGE_MASTER_SCHOOLS);
    return cached ? JSON.parse(cached) : defaultSchools;
  } catch {
    return defaultSchools;
  }
};

/**
 * Instant retrieve cached status map
 */
export const getCachedStatusMap = () => {
  try {
    const cached = localStorage.getItem(STORAGE_STATUS_CACHE);
    const local = localStorage.getItem(STORAGE_STATUS);
    const cachedObj = cached ? JSON.parse(cached) : {};
    const localObj = local ? JSON.parse(local) : {};
    return { ...cachedObj, ...localObj };
  } catch {
    return {};
  }
};

/**
 * Fetch Master School List directly from Google Sheet (Master_Schools tab)
 */
export const fetchMasterSchools = async () => {
  const url = getApiUrl();
  const cached = getCachedMasterSchools();

  if (!url) {
    return cached;
  }

  try {
    const res = await fetch(`${url}?action=getMasterSchools`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      localStorage.setItem(STORAGE_MASTER_SCHOOLS, JSON.stringify(json.data));
      return json.data;
    }
  } catch (err) {
    console.warn('Could not fetch Master_Schools from Google Sheets. Using cached/local list:', err);
  }

  return cached;
};

/**
 * One-click helper: Seed / push the 679 master schools directly into Google Sheet
 */
export const seedMasterSchoolsToGoogleSheet = async () => {
  const url = getApiUrl();
  if (!url) throw new Error('Please configure Google Apps Script Web App URL first.');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      action: 'seedMasterSchools',
      schools: defaultSchools
    })
  });

  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to seed master schools');
  
  localStorage.setItem(STORAGE_MASTER_SCHOOLS, JSON.stringify(defaultSchools));
  return json;
};

/**
 * Fetch all school completion statuses with instant cache persistence
 */
export const fetchSchoolStatusMap = async () => {
  const url = getApiUrl();
  const cachedMap = getCachedStatusMap();

  if (!url) {
    return cachedMap;
  }

  try {
    const res = await fetch(`${url}?action=getAllStatus`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      const remoteMap = {};
      json.data.forEach(item => {
        if (item.UDISE_Code) {
          remoteMap[String(item.UDISE_Code)] = {
            status: item.Status || 'Completed',
            installedBy: item.Installed_By || item.Updated_By_Name || '',
            mobile: item.Updated_By_Mobile || '',
            date: formatDateDDMMMYYYY(item.Installation_Date || ''),
            timestamp: item.Last_Updated_Timestamp || '',
            totalDevices: item.Total_Devices || 0,
            devicesJson: item.Device_Serials_JSON || '[]'
          };
        }
      });
      const merged = { ...cachedMap, ...remoteMap };
      try {
        localStorage.setItem(STORAGE_STATUS_CACHE, JSON.stringify(merged));
      } catch (e) {
        console.warn('Could not cache status map:', e);
      }
      return merged;
    }
  } catch (err) {
    console.warn('Could not connect to Google Apps Script. Falling back to cached status:', err);
  }

  return cachedMap;
};

let inMemorySerialMap = null;

/**
 * Synchronous in-memory lookup map of all registered serials.
 * Built from persistent registry cache, local inventory rows, and completed status entries.
 * Runs in 0ms!
 */
export const getRegisteredSerialsMap = () => {
  if (inMemorySerialMap) return inMemorySerialMap;

  const map = {};

  // 1. From persistent registry cache
  try {
    const cached = JSON.parse(localStorage.getItem(STORAGE_SERIAL_REGISTRY) || '{}');
    Object.assign(map, cached);
  } catch (e) {}

  // 2. Merge local inventory
  try {
    const localInv = JSON.parse(localStorage.getItem(STORAGE_INVENTORY) || '[]');
    localInv.forEach(item => {
      const sn = (item.Serial_Number || '').trim().toUpperCase();
      if (sn) {
        const matchedUdise = String(item.UDISE_Code || '');
        const matchedSchool = defaultSchools.find(s => String(s.udise) === matchedUdise);
        map[sn] = {
          serialNumber: sn,
          udise: matchedUdise || item.UDISE_Code,
          schoolName: item.School_Name || matchedSchool?.school_name || 'School',
          district: item.District || matchedSchool?.district || '-',
          block: item.Block_Name || matchedSchool?.block || '-',
          itemName: item.Item_Name || 'Hardware Asset',
          installedBy: item.Installed_By || item.Updated_By_Name || '-',
          mobile: item.Updated_By_Mobile || '-',
          date: formatDateDDMMMYYYY(item.Installation_Date),
          timestamp: item.Submission_Timestamp || ''
        };
      }
    });
  } catch (e) {}

  // 3. Merge status map (which contains devicesJson for completed schools)
  try {
    const statusCache = getCachedStatusMap();
    Object.keys(statusCache).forEach(udise => {
      const entry = statusCache[udise];
      if (entry && entry.devicesJson) {
        try {
          const devs = typeof entry.devicesJson === 'string' ? JSON.parse(entry.devicesJson) : entry.devicesJson;
          if (Array.isArray(devs)) {
            const matchedSchool = defaultSchools.find(s => String(s.udise) === String(udise));
            devs.forEach(d => {
              const sn = String(d.serial || d.serial_number || '').trim().toUpperCase();
              if (sn) {
                map[sn] = {
                  serialNumber: sn,
                  udise: String(udise),
                  schoolName: entry.schoolName || matchedSchool?.school_name || 'School',
                  district: entry.district || matchedSchool?.district || '-',
                  block: entry.block || matchedSchool?.block || '-',
                  itemName: d.name || d.item_name || 'Hardware Asset',
                  installedBy: entry.installedBy || '-',
                  mobile: entry.mobile || '-',
                  date: formatDateDDMMMYYYY(entry.date),
                  timestamp: entry.timestamp || ''
                };
              }
            });
          }
        } catch (err) {}
      }
    });
  } catch (e) {}

  inMemorySerialMap = map;
  return map;
};

/**
 * Background / on-demand synchronization of the registered serials registry.
 */
export const syncRegisteredSerials = async (forceRemote = false) => {
  const currentMap = { ...getRegisteredSerialsMap() };
  const url = getApiUrl();

  if (!url) {
    inMemorySerialMap = currentMap;
    return currentMap;
  }

  try {
    const res = await fetch(`${url}?action=getInventory`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      json.data.forEach(r => {
        const sn = String(r.Serial_Number || '').trim().toUpperCase();
        if (sn) {
          const matchedUdise = String(r.UDISE_Code || '');
          const matchedSchool = defaultSchools.find(s => String(s.udise) === matchedUdise);
          currentMap[sn] = {
            serialNumber: sn,
            udise: matchedUdise || r.UDISE_Code,
            schoolName: r.School_Name || matchedSchool?.school_name || 'School',
            district: r.District || matchedSchool?.district || '-',
            block: r.Block_Name || matchedSchool?.block || '-',
            itemName: r.Item_Name || 'Hardware Asset',
            installedBy: r.Installed_By || r.Updated_By_Name || '-',
            mobile: r.Updated_By_Mobile || '-',
            date: formatDateDDMMMYYYY(r.Installation_Date),
            timestamp: r.Submission_Timestamp || ''
          };
        }
      });

      inMemorySerialMap = currentMap;
      try {
        localStorage.setItem(STORAGE_SERIAL_REGISTRY, JSON.stringify(currentMap));
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Could not sync remote serial registry:', err);
  }

  inMemorySerialMap = currentMap;
  return currentMap;
};

/**
 * Instant local lookup: Check if a serial number is already registered across any school.
 * Operates synchronously in 0ms so typing & blur is 100% fluid with zero lag.
 */
export const checkSerialDuplicate = (serialNumber, currentUdise) => {
  const cleanSerial = (serialNumber || '').trim().toUpperCase();
  // Don't trigger on incomplete input (less than 3 characters, e.g. "J")
  if (!cleanSerial || cleanSerial.length < 3) {
    return { exists: false };
  }

  const map = getRegisteredSerialsMap();
  const match = map[cleanSerial];

  if (match) {
    return {
      exists: true,
      match: match
    };
  }

  return { exists: false };
};

/**
 * Comprehensive Pre-Submission Verification
 * Ensures ZERO duplicate serial numbers can ever be submitted to Google Sheets.
 */
export const verifyAllSerialsBeforeSubmit = async (deviceList, serialValues, selectedSchool) => {
  // 1. Intra-form duplicate check (mutually exclusive within current form)
  const seenInForm = new Map();
  for (const d of deviceList) {
    const sn = String(serialValues[d.id] || '').trim().toUpperCase();
    if (!sn) continue;

    if (seenInForm.has(sn)) {
      const other = seenInForm.get(sn);
      return {
        valid: false,
        type: 'intra_form',
        conflicts: [d.id, other.id],
        message: `Duplicate serial number within this form! Serial "${sn}" is assigned to both "${other.name}" and "${d.itemName || d.label}".`
      };
    }
    seenInForm.set(sn, { id: d.id, name: d.itemName || d.label });
  }

  // 2. Fresh background sync with Google Sheets to get absolute latest inventory
  try {
    await syncRegisteredSerials(true);
  } catch (err) {
    console.warn('Pre-submit live inventory sync note:', err);
  }

  // 3. Database duplicate check against all registered serials
  const registry = getRegisteredSerialsMap();
  const duplicates = [];

  for (const d of deviceList) {
    const sn = String(serialValues[d.id] || '').trim().toUpperCase();
    if (!sn) continue;

    const match = registry[sn];
    if (match) {
      duplicates.push({
        id: d.id,
        deviceName: d.itemName || d.item_name || d.label || 'Device',
        serialNumber: sn,
        match: match
      });
    }
  }

  if (duplicates.length > 0) {
    return {
      valid: false,
      type: 'already_registered',
      duplicates: duplicates,
      message: `Duplicate Serial Detected! ${duplicates.length} serial number(s) are already registered in Google Sheets.`
    };
  }

  return { valid: true };
};

/**
 * Submit School ICR Data
 */
export const submitICR = async (submissionPayload) => {
  const url = getApiUrl();
  
  if (!url) {
    throw new Error(
      'Google Sheets is NOT connected! Please enter your Google Apps Script Web App URL first.'
    );
  }

  const {
    udise,
    snil,
    school_name,
    district,
    block,
    category,
    installed_by,
    technician_mobile,
    installation_date,
    devices
  } = submissionPayload;

  // Enforce dd-mmm-yyyy format (e.g. 13-Sep-2026)
  const formattedInstallDate = formatDateDDMMMYYYY(installation_date);

  const now = new Date();
  const nowTimestamp = `${formatDateDDMMMYYYY(now)} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;

  const submissionId = 'SUB-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

  const normalizedDevices = (devices || []).map(d => ({
    id: d.id,
    name: d.name || d.item_name || d.itemName || d.label || 'Device',
    item_name: d.item_name || d.name || d.itemName || d.label || 'Device',
    make: d.make || d.make_model || '',
    make_model: d.make_model || d.make || '',
    serial: String(d.serial || d.serial_number || '').trim().toUpperCase(),
    serial_number: String(d.serial_number || d.serial || '').trim().toUpperCase()
  }));

  const normalizedPayload = {
    ...submissionPayload,
    installed_by: installed_by,
    technician_name: installed_by,
    installation_date: formattedInstallDate,
    devices: normalizedDevices
  };

  // 1. Submit directly to Google Apps Script Web App API
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(normalizedPayload)
    });
    
    const json = await res.json();
    if (!json.success) {
      if (json.duplicate_detected && json.details) {
        throw new Error(
          `DUPLICATE ERROR: Serial number "${json.details.serial}" already registered in ${json.details.schoolName} (${json.details.udise}) by ${json.details.installedBy || json.details.updatedBy}!`
        );
      }
      throw new Error(json.error || 'Google Sheets rejected the submission.');
    }
  } catch (err) {
    console.error('Google Sheet Sync Error:', err);
    throw new Error(`Google Sheet Sync Failed: ${err.message}. Please check if the Web App URL is active with "Anyone" access.`);
  }

  // Prepare Local Row-Wise Records for fast local cache
  const newRowItems = normalizedDevices.map(d => ({
    Submission_ID: submissionId,
    UDISE_Code: udise,
    SNIL_Code: snil,
    School_Name: school_name,
    District: district,
    Block_Name: block,
    Lab_Category: category,
    Item_Name: d.item_name,
    Make_And_Model: d.make_model,
    Serial_Number: d.serial_number,
    Installed_Status: 'Yes',
    Working_Status: 'Yes',
    Installation_Date: formattedInstallDate,
    Installed_By: installed_by,
    Updated_By_Name: installed_by,
    Updated_By_Mobile: technician_mobile,
    Submission_Timestamp: nowTimestamp
  }));

  const localInventory = JSON.parse(localStorage.getItem(STORAGE_INVENTORY) || '[]');
  const updatedInventory = [...localInventory, ...newRowItems];
  localStorage.setItem(STORAGE_INVENTORY, JSON.stringify(updatedInventory));

  const localStatus = JSON.parse(localStorage.getItem(STORAGE_STATUS) || '{}');
  const statusEntry = {
    status: 'Completed',
    installedBy: installed_by,
    mobile: technician_mobile,
    date: formattedInstallDate,
    timestamp: nowTimestamp,
    totalDevices: normalizedDevices.length,
    devicesJson: JSON.stringify(normalizedDevices)
  };
  localStatus[String(udise)] = statusEntry;
  localStorage.setItem(STORAGE_STATUS, JSON.stringify(localStatus));

  const cachedStatus = getCachedStatusMap();
  cachedStatus[String(udise)] = statusEntry;
  try {
    localStorage.setItem(STORAGE_STATUS_CACHE, JSON.stringify(cachedStatus));
  } catch (e) {}

  // Update in-memory and persistent serial registry with newly submitted serials
  try {
    const reg = getRegisteredSerialsMap();
    normalizedDevices.forEach(d => {
      if (d.serial_number) {
        reg[d.serial_number] = {
          serialNumber: d.serial_number,
          udise: String(udise),
          schoolName: school_name,
          district: district,
          block: block,
          itemName: d.item_name,
          installedBy: installed_by,
          mobile: technician_mobile,
          date: formattedInstallDate,
          timestamp: nowTimestamp
        };
      }
    });
    localStorage.setItem(STORAGE_SERIAL_REGISTRY, JSON.stringify(reg));
  } catch (e) {}

  return {
    success: true,
    message: `Successfully digitized ${newRowItems.length} devices for ${school_name} into Google Sheets!`,
    submissionId: submissionId,
    timestamp: nowTimestamp,
    totalDevices: devices.length
  };
};

/**
 * Get all inventory records (Row-wise)
 */
export const getAllInventoryRows = async () => {
  const url = getApiUrl();
  const localInventory = JSON.parse(localStorage.getItem(STORAGE_INVENTORY) || '[]');

  if (!url) {
    return localInventory;
  }

  try {
    const res = await fetch(`${url}?action=getInventory`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      const remoteRows = json.data;
      const seen = new Set();
      const combined = [];

      remoteRows.forEach(r => {
        const key = `${r.UDISE_Code}_${r.Item_Name}_${r.Serial_Number}`;
        seen.add(key);
        combined.push({
          ...r,
          Installed_By: r.Installed_By || r.Updated_By_Name,
          Installation_Date: formatDateDDMMMYYYY(r.Installation_Date)
        });
      });

      localInventory.forEach(r => {
        const key = `${r.UDISE_Code}_${r.Item_Name}_${r.Serial_Number}`;
        if (!seen.has(key)) {
          combined.push({
            ...r,
            Installed_By: r.Installed_By || r.Updated_By_Name,
            Installation_Date: formatDateDDMMMYYYY(r.Installation_Date)
          });
        }
      });

      return combined;
    }
  } catch (err) {
    console.warn('Error fetching remote inventory:', err);
  }

  return localInventory;
};

/**
 * Export Styled Reports using excelStyles.js
 */
export {
  exportFullProjectToExcel,
  exportSingleSchoolICRToExcel,
  exportDistrictReportToExcel,
  exportCategoryReportToExcel,
  exportFilteredSchoolsToExcel
} from './excelStyles';

import { exportFullProjectToExcel } from './excelStyles';

/**
 * Backwards compatible export function using new styled Excel engine
 */
export const exportInventoryToExcel = (inventoryRows, schoolsMaster, statusMap) => {
  return exportFullProjectToExcel(inventoryRows, schoolsMaster, statusMap);
};

