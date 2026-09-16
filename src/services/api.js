import * as XLSX from 'xlsx';
import defaultSchools from '../data/schools_master.json';

// Storage keys
const STORAGE_API_URL = 'icr_google_script_url';
const STORAGE_INVENTORY = 'icr_local_inventory';
const STORAGE_STATUS = 'icr_local_status';
const STORAGE_STATUS_CACHE = 'icr_cached_status_map';
const STORAGE_MASTER_SCHOOLS = 'icr_cached_master_schools';

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

/**
 * Real-time lookup: Check if a serial number is already registered across any school
 */
export const checkSerialDuplicate = async (serialNumber, currentUdise) => {
  const cleanSerial = (serialNumber || '').trim().toUpperCase();
  if (!cleanSerial) return { exists: false };

  // 1. Check local storage inventory first
  const localInventory = JSON.parse(localStorage.getItem(STORAGE_INVENTORY) || '[]');
  const localMatch = localInventory.find(
    item => (item.Serial_Number || '').toUpperCase() === cleanSerial
  );

  if (localMatch) {
    const matchedUdise = String(localMatch.UDISE_Code || '');
    const matchedSchool = defaultSchools.find(s => String(s.udise) === matchedUdise);
    const statusCache = getCachedStatusMap();
    const statusInfo = statusCache[matchedUdise] || {};

    return {
      exists: true,
      match: {
        serialNumber: localMatch.Serial_Number,
        udise: matchedUdise || localMatch.UDISE_Code,
        schoolName: localMatch.School_Name || matchedSchool?.school_name || 'School',
        district: localMatch.District || matchedSchool?.district || '-',
        block: localMatch.Block_Name || matchedSchool?.block || '-',
        itemName: localMatch.Item_Name,
        installedBy: localMatch.Installed_By || localMatch.Updated_By_Name || statusInfo.installedBy || '-',
        mobile: localMatch.Updated_By_Mobile || statusInfo.mobile || '-',
        date: formatDateDDMMMYYYY(localMatch.Installation_Date || statusInfo.date),
        timestamp: localMatch.Submission_Timestamp || statusInfo.timestamp || ''
      }
    };
  }

  // 2. Check remote Google Sheet API if configured
  const url = getApiUrl();
  if (url) {
    try {
      const res = await fetch(`${url}?action=checkSerial&serial=${encodeURIComponent(cleanSerial)}`);
      const json = await res.json();
      if (json.success && json.exists && json.match) {
        const m = json.match;
        const matchedUdise = String(m.udise || m.UDISE_Code || '');
        const matchedSchool = defaultSchools.find(s => String(s.udise) === matchedUdise);
        const statusCache = getCachedStatusMap();
        const statusInfo = statusCache[matchedUdise] || {};

        return {
          exists: true,
          match: {
            serialNumber: cleanSerial,
            udise: matchedUdise || m.udise,
            schoolName: m.schoolName || m.school_name || m.School_Name || matchedSchool?.school_name || 'School',
            district: m.district || m.District || matchedSchool?.district || '-',
            block: m.block || m.Block || matchedSchool?.block || '-',
            itemName: m.itemName || m.item_name || m.Item_Name || 'Hardware Asset',
            installedBy: m.installedBy || m.updatedBy || m.Installed_By || m.Updated_By_Name || statusInfo.installedBy || '-',
            mobile: m.mobile || m.Updated_By_Mobile || m.technician_mobile || statusInfo.mobile || '-',
            date: formatDateDDMMMYYYY(m.installDate || m.date || m.Installation_Date || statusInfo.date),
            timestamp: m.timestamp || m.Submission_Timestamp || statusInfo.timestamp || ''
          }
        };
      }
    } catch (err) {
      console.warn('Error checking remote serial:', err);
    }
  }

  return { exists: false };
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

  const normalizedPayload = {
    ...submissionPayload,
    installed_by: installed_by,
    technician_name: installed_by,
    installation_date: formattedInstallDate
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
  const newRowItems = devices.map(d => ({
    Submission_ID: submissionId,
    UDISE_Code: udise,
    SNIL_Code: snil,
    School_Name: school_name,
    District: district,
    Block_Name: block,
    Lab_Category: category,
    Item_Name: d.item_name,
    Make_And_Model: d.make_model,
    Serial_Number: String(d.serial_number || '').trim().toUpperCase(),
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
    totalDevices: devices.length,
    devicesJson: JSON.stringify(devices)
  };
  localStatus[String(udise)] = statusEntry;
  localStorage.setItem(STORAGE_STATUS, JSON.stringify(localStatus));

  const cachedStatus = getCachedStatusMap();
  cachedStatus[String(udise)] = statusEntry;
  try {
    localStorage.setItem(STORAGE_STATUS_CACHE, JSON.stringify(cachedStatus));
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

