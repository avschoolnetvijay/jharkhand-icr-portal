import * as XLSX from 'xlsx';
import defaultSchools from '../data/schools_master.json';
import { supabase, SUPABASE_URL } from './supabaseClient';

// Storage keys
const STORAGE_INVENTORY = 'icr_local_inventory';
const STORAGE_STATUS = 'icr_local_status';
const STORAGE_STATUS_CACHE = 'icr_cached_status_map';
const STORAGE_MASTER_SCHOOLS = 'icr_cached_master_schools';
const STORAGE_SERIAL_REGISTRY = 'icr_registered_serials_registry';

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
  return SUPABASE_URL;
};

export const setApiUrl = () => {};

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
 * Instant retrieve cached status map (from Supabase cache)
 */
export const getCachedStatusMap = () => {
  try {
    const cached = localStorage.getItem(STORAGE_STATUS_CACHE);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

/**
 * Broadcast synchronization event across tabs in real-time
 */
export const broadcastPortalSync = (type, data = {}) => {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('icr_portal_sync');
      channel.postMessage({ type, ...data, timestamp: Date.now() });
      channel.close();
    } catch (e) {}
  }
};

/**
 * Fetch Master School List directly from Supabase (or fallback to schools_master.json)
 */
export const fetchMasterSchools = async () => {
  const cached = getCachedMasterSchools();
  try {
    const { data, error } = await supabase
      .from('master_schools')
      .select('*');

    if (!error && Array.isArray(data) && data.length > 0) {
      const normalized = data.map(s => ({
        ...s,
        district: s.district === 'PAKAUR' ? 'PAKUR' : (s.district || '').trim().toUpperCase()
      }));
      localStorage.setItem(STORAGE_MASTER_SCHOOLS, JSON.stringify(normalized));
      return normalized;
    }
  } catch (err) {
    console.warn('Could not fetch Master_Schools from Supabase:', err);
  }

  return cached;
};

/**
 * Seed 679 master schools directly into Supabase master_schools table
 */
export const seedMasterSchoolsToGoogleSheet = async () => {
  return seedMasterSchoolsToSupabase();
};

export const seedMasterSchoolsToDatabase = async () => {
  return seedMasterSchoolsToSupabase();
};

export const seedMasterSchoolsToSupabase = async () => {
  try {
    const rows = defaultSchools.map(s => ({
      udise: String(s.udise),
      snil: s.snil || '',
      school_name: s.school_name || '',
      district: s.district || '',
      block: s.block || '',
      raw_type: s.raw_type || '',
      including_smart: s.including_smart || 'No',
      category: s.category || '',
      device_count: s.device_count || 4
    }));

    const { error } = await supabase
      .from('master_schools')
      .upsert(rows, { onConflict: 'udise' });

    if (error) throw new Error(error.message);

    localStorage.setItem(STORAGE_MASTER_SCHOOLS, JSON.stringify(defaultSchools));
    return { success: true, count: rows.length };
  } catch (err) {
    console.error('Failed to seed master schools to Supabase:', err);
    throw err;
  }
};

/**
 * Fetch all school completion statuses directly from Supabase (Supabase is single source of truth)
 */
export const fetchSchoolStatusMap = async () => {
  const cachedMap = getCachedStatusMap();

  try {
    const { data, error } = await supabase
      .from('school_status')
      .select('*');

    if (error) {
      console.warn('Supabase fetchSchoolStatusMap error:', error.message);
      return cachedMap;
    }

    if (Array.isArray(data)) {
      const remoteMap = {};
      data.forEach(item => {
        const udise = String(item.udise || '').trim();
        if (udise) {
          remoteMap[udise] = {
            status: item.status || 'Completed',
            installedBy: item.installed_by || '',
            mobile: String(item.mobile || '').trim(),
            date: formatDateDDMMMYYYY(item.installation_date || ''),
            rawDate: item.installation_date || '',
            timestamp: item.submission_timestamp || '',
            totalDevices: Number(item.total_devices) || 0,
            devicesJson: typeof item.devices_json === 'string' ? item.devices_json : JSON.stringify(item.devices_json || [])
          };
        }
      });

      // Supabase is the single source of truth!
      try {
        localStorage.setItem(STORAGE_STATUS_CACHE, JSON.stringify(remoteMap));
        localStorage.removeItem(STORAGE_STATUS);

        if (Object.keys(remoteMap).length === 0) {
          localStorage.removeItem(STORAGE_INVENTORY);
          localStorage.removeItem(STORAGE_SERIAL_REGISTRY);
          inMemorySerialMap = {};
        }
      } catch (e) {}

      broadcastPortalSync('STATUS_MAP_UPDATED', { statusMap: remoteMap });
      return remoteMap;
    }
  } catch (err) {
    console.warn('Could not connect to Supabase. Falling back to cached status:', err);
  }

  return cachedMap;
};

let inMemorySerialMap = null;

/**
 * Synchronous in-memory lookup map of all registered serials.
 */
export const getRegisteredSerialsMap = () => {
  if (inMemorySerialMap) return inMemorySerialMap;

  const map = {};
  try {
    const cached = JSON.parse(localStorage.getItem(STORAGE_SERIAL_REGISTRY) || '{}');
    Object.assign(map, cached);
  } catch (e) {}

  inMemorySerialMap = map;
  return map;
};

/**
 * Clear in-memory and local storage serial caches
 */
export const clearLocalSerialCache = () => {
  inMemorySerialMap = null;
  try {
    localStorage.removeItem(STORAGE_SERIAL_REGISTRY);
    localStorage.removeItem(STORAGE_INVENTORY);
  } catch (e) {}
};

/**
 * Background / on-demand synchronization of the registered serials registry.
 */
export const syncRegisteredSerials = async (forceRemote = false) => {
  try {
    const { data, error } = await supabase
      .from('device_inventory')
      .select('*');

    if (!error && Array.isArray(data)) {
      const freshMap = {};
      data.forEach(r => {
        const sn = String(r.serial_number || '').trim().toUpperCase();
        if (sn) {
          freshMap[sn] = {
            serialNumber: sn,
            udise: String(r.udise || ''),
            schoolName: r.school_name || 'School',
            district: r.district || '-',
            block: r.block || '-',
            itemName: r.item_name || 'Hardware Asset',
            installedBy: r.installed_by || 'Not recorded',
            mobile: r.mobile || '-',
            date: formatDateDDMMMYYYY(r.installation_date),
            timestamp: r.submission_timestamp || ''
          };
        }
      });

      inMemorySerialMap = freshMap;
      try {
        localStorage.setItem(STORAGE_SERIAL_REGISTRY, JSON.stringify(freshMap));
      } catch (e) {}

      return freshMap;
    }
  } catch (err) {
    console.warn('Could not sync remote serial registry:', err);
  }

  return getRegisteredSerialsMap();
};

/**
 * Check if a device is exempt from duplicate serial number checking.
 * "Web Cam With Microphone" and "Speaker" share common batch serial numbers
 * and must be excluded from duplicate blocking.
 */
export const isExcludedFromDuplicateCheck = (itemName, deviceId = '') => {
  const name = String(itemName || '').toLowerCase();
  const id = String(deviceId || '').toLowerCase();
  return (
    name.includes('web cam') ||
    name.includes('webcam') ||
    name.includes('microphone') ||
    name.includes('speaker') ||
    id.includes('webcam') ||
    id.includes('speaker')
  );
};

/**
 * Real-time Single Serial Live Check against Supabase
 */
export const checkSerialLive = async (serialNumber, itemName = '', deviceId = '') => {
  if (isExcludedFromDuplicateCheck(itemName, deviceId)) return { exists: false };
  const sn = (serialNumber || '').trim().toUpperCase();
  if (!sn) return { exists: false };

  try {
    const { data, error } = await supabase
      .from('device_inventory')
      .select('*')
      .ilike('serial_number', sn)
      .maybeSingle();

    if (!error && data) {
      if (isExcludedFromDuplicateCheck(data.item_name)) {
        return { exists: false };
      }

      const matchData = {
        serialNumber: sn,
        udise: String(data.udise || ''),
        schoolName: data.school_name || 'School',
        district: data.district || '-',
        block: data.block || '-',
        itemName: data.item_name || 'Hardware Asset',
        installedBy: data.installed_by || 'Not recorded',
        mobile: data.mobile || '-',
        date: formatDateDDMMMYYYY(data.installation_date),
        timestamp: data.submission_timestamp || ''
      };

      const reg = getRegisteredSerialsMap();
      reg[sn] = matchData;
      try { localStorage.setItem(STORAGE_SERIAL_REGISTRY, JSON.stringify(reg)); } catch (e) {}

      return { exists: true, match: matchData };
    } else {
      if (inMemorySerialMap) delete inMemorySerialMap[sn];
      try {
        const reg = JSON.parse(localStorage.getItem(STORAGE_SERIAL_REGISTRY) || '{}');
        delete reg[sn];
        localStorage.setItem(STORAGE_SERIAL_REGISTRY, JSON.stringify(reg));
      } catch (e) {}

      return { exists: false };
    }
  } catch (err) {
    console.warn('Live serial check error:', err);
  }

  return { exists: false };
};

/**
 * Instant local lookup
 */
export const checkSerialDuplicate = (serialNumber, currentUdise, itemName = '', deviceId = '') => {
  if (isExcludedFromDuplicateCheck(itemName, deviceId)) {
    return { exists: false };
  }
  const cleanSerial = (serialNumber || '').trim().toUpperCase();
  if (!cleanSerial) {
    return { exists: false };
  }

  const map = getRegisteredSerialsMap();
  const match = map[cleanSerial];

  if (match) {
    if (isExcludedFromDuplicateCheck(match.itemName)) {
      return { exists: false };
    }
    return {
      exists: true,
      match: match
    };
  }

  return { exists: false };
};

/**
 * Comprehensive Pre-Submission Verification
 */
export const verifyAllSerialsBeforeSubmit = async (deviceList, serialValues, selectedSchool) => {
  // 1. Intra-form duplicate check (mutually exclusive within current form)
  const serialToDevices = new Map();
  const intraConflicts = [];
  const conflictIds = new Set();

  for (const d of deviceList) {
    if (isExcludedFromDuplicateCheck(d.itemName || d.item_name || d.label, d.id)) {
      continue;
    }
    const sn = String(serialValues[d.id] || '').trim().toUpperCase();
    if (!sn) continue;

    if (serialToDevices.has(sn)) {
      const others = serialToDevices.get(sn);
      others.forEach(other => {
        intraConflicts.push({
          id1: d.id,
          id2: other.id,
          serial: sn,
          name1: d.itemName || d.item_name || d.label || 'Device',
          name2: other.name
        });
        conflictIds.add(d.id);
        conflictIds.add(other.id);
      });
      others.push({ id: d.id, name: d.itemName || d.item_name || d.label || 'Device' });
    } else {
      serialToDevices.set(sn, [{ id: d.id, name: d.itemName || d.item_name || d.label || 'Device' }]);
    }
  }

  if (intraConflicts.length > 0) {
    const first = intraConflicts[0];
    return {
      valid: false,
      type: 'intra_form',
      conflicts: intraConflicts,
      conflictIds: Array.from(conflictIds),
      message: `Duplicate serial number within this form! Serial "${first.serial}" is assigned to both "${first.name1}" and "${first.name2}". Every hardware device must have a unique serial number.`
    };
  }

  // 2. Fast batch check against Supabase database (excluding Web Cam and Speaker)
  const checkableDevices = deviceList.filter(
    d => !isExcludedFromDuplicateCheck(d.itemName || d.item_name || d.label, d.id)
  );
  const serialList = checkableDevices
    .map(d => String(serialValues[d.id] || '').trim().toUpperCase())
    .filter(Boolean);

  if (serialList.length > 0) {
    try {
      const { data: duplicates, error } = await supabase
        .from('device_inventory')
        .select('*')
        .in('serial_number', serialList);

      const filteredDuplicates = (duplicates || []).filter(
        dup => !isExcludedFromDuplicateCheck(dup.item_name)
      );

      if (!error && filteredDuplicates.length > 0) {
        const verifiedDuplicates = filteredDuplicates.map(dup => {
          const matchingDevice = checkableDevices.find(
            d => String(serialValues[d.id] || '').trim().toUpperCase() === dup.serial_number.toUpperCase()
          );
          return {
            id: matchingDevice?.id || dup.serial_number,
            deviceName: matchingDevice?.itemName || matchingDevice?.label || dup.item_name,
            serialNumber: dup.serial_number,
            match: {
              serialNumber: dup.serial_number,
              udise: String(dup.udise),
              schoolName: dup.school_name,
              district: dup.district || '-',
              block: dup.block || '-',
              itemName: dup.item_name,
              installedBy: dup.installed_by || 'Not recorded',
              mobile: dup.mobile || '-',
              date: formatDateDDMMMYYYY(dup.installation_date),
              timestamp: dup.submission_timestamp || ''
            }
          };
        });

        return {
          valid: false,
          type: 'already_registered',
          duplicates: verifiedDuplicates,
          message: `Duplicate Serial Detected! ${verifiedDuplicates.length} serial number(s) are already registered in Supabase.`
        };
      }
    } catch (err) {
      console.warn('Batch duplicate verification error:', err);
    }
  }

  return { valid: true };
};

/**
 * Submit School ICR Data to Supabase (Ultra-fast, 100% reliable)
 */
export const submitICR = async (submissionPayload) => {
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

  // 1. Check if school is already completed in Supabase
  const { data: existingSchool, error: schoolCheckErr } = await supabase
    .from('school_status')
    .select('udise, school_name, installed_by')
    .eq('udise', String(udise))
    .maybeSingle();

  if (existingSchool) {
    throw new Error(`School "${existingSchool.school_name}" (UDISE: ${udise}) has already been completed by ${existingSchool.installed_by || 'another user'}.`);
  }

  // 2. Real-time Live Duplicate Check across all serials in this form (excluding Web Cam and Speaker)
  const checkableDevices = normalizedDevices.filter(
    d => !isExcludedFromDuplicateCheck(d.item_name, d.id)
  );
  const allSerials = checkableDevices.map(d => d.serial_number).filter(Boolean);
  if (allSerials.length > 0) {
    const { data: duplicates, error: dupErr } = await supabase
      .from('device_inventory')
      .select('*')
      .in('serial_number', allSerials);

    const filteredDuplicates = (duplicates || []).filter(
      dup => !isExcludedFromDuplicateCheck(dup.item_name)
    );

    if (filteredDuplicates.length > 0) {
      const firstDup = filteredDuplicates[0];
      const installerName = firstDup.installed_by || 'Not recorded';
      const err = new Error(
        `DUPLICATE ERROR: Serial "${firstDup.serial_number}" is already registered in "${firstDup.school_name}" (UDISE: ${firstDup.udise}) — Installed by: ${installerName}`
      );
      err.duplicateDetails = {
        serial: firstDup.serial_number,
        schoolName: firstDup.school_name,
        udise: String(firstDup.udise),
        district: firstDup.district || '-',
        block: firstDup.block || '-',
        itemName: firstDup.item_name,
        installedBy: installerName,
        mobile: firstDup.mobile || '-',
        date: formatDateDDMMMYYYY(firstDup.installation_date),
        allMatches: duplicates
      };
      throw err;
    }
  }

  // 3. Insert into school_status table
  const { error: statusInsertErr } = await supabase
    .from('school_status')
    .insert({
      udise: String(udise),
      snil: snil || '',
      school_name: school_name,
      district: district,
      block: block,
      category: category,
      status: 'Completed',
      total_devices: normalizedDevices.length,
      installed_by: installed_by,
      mobile: technician_mobile,
      installation_date: formattedInstallDate,
      submission_timestamp: nowTimestamp,
      devices_json: normalizedDevices
    });

  if (statusInsertErr) {
    if (statusInsertErr.code === '23505') {
      throw new Error(`School "${school_name}" (UDISE: ${udise}) was already submitted!`);
    }
    throw new Error(`Failed to save school status: ${statusInsertErr.message}`);
  }

  // 4. Insert row-wise items into device_inventory table
  const inventoryRows = normalizedDevices.map(d => ({
    submission_id: submissionId,
    udise: String(udise),
    snil: snil || '',
    school_name: school_name,
    district: district,
    block: block,
    category: category,
    item_name: d.item_name,
    make_model: d.make_model,
    serial_number: d.serial_number,
    installed_status: 'Yes',
    working_status: 'Yes',
    installation_date: formattedInstallDate,
    installed_by: installed_by,
    mobile: technician_mobile,
    submission_timestamp: nowTimestamp
  }));

  const { error: invInsertErr } = await supabase
    .from('device_inventory')
    .insert(inventoryRows);

  if (invInsertErr) {
    // Rollback school_status if device insertion fails
    await supabase.from('school_status').delete().eq('udise', String(udise));

    if (invInsertErr.code === '23505') {
      throw new Error(`DUPLICATE ERROR: One of the hardware serial numbers was just registered by another user! Database unique constraint prevented duplicate.`);
    }
    throw new Error(`Failed to save device inventory: ${invInsertErr.message}`);
  }

  // 5. Success Confirmed! Update local caches
  const statusEntry = {
    status: 'Completed',
    installedBy: installed_by,
    mobile: technician_mobile,
    date: formattedInstallDate,
    timestamp: nowTimestamp,
    totalDevices: normalizedDevices.length,
    devicesJson: JSON.stringify(normalizedDevices)
  };

  const cachedStatus = getCachedStatusMap();
  cachedStatus[String(udise)] = statusEntry;
  try {
    localStorage.setItem(STORAGE_STATUS_CACHE, JSON.stringify(cachedStatus));
    localStorage.removeItem(STORAGE_STATUS);
  } catch (e) {}

  // Update in-memory registry
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

  broadcastPortalSync('STATUS_MAP_UPDATED', { statusMap: cachedStatus, udise: String(udise) });

  return {
    success: true,
    message: `Successfully digitized ${normalizedDevices.length} devices for ${school_name} into Supabase!`,
    submissionId: submissionId,
    timestamp: nowTimestamp,
    totalDevices: normalizedDevices.length
  };
};

/**
 * Get all inventory records from Supabase (Row-wise for Excel export)
 */
export const getAllInventoryRows = async () => {
  const localInventory = JSON.parse(localStorage.getItem(STORAGE_INVENTORY) || '[]');

  try {
    const { data, error } = await supabase
      .from('device_inventory')
      .select('*')
      .order('id', { ascending: true });

    if (!error && Array.isArray(data)) {
      const formatted = data.map(r => ({
        Submission_ID: r.submission_id,
        UDISE_Code: r.udise,
        SNIL_Code: r.snil,
        School_Name: r.school_name,
        District: r.district,
        Block_Name: r.block,
        Lab_Category: r.category,
        Item_Name: r.item_name,
        Make_And_Model: r.make_model,
        Serial_Number: r.serial_number,
        Installed_Status: r.installed_status || 'Yes',
        Working_Status: r.working_status || 'Yes',
        Installation_Date: formatDateDDMMMYYYY(r.installation_date),
        Installed_By: r.installed_by,
        Updated_By_Name: r.installed_by,
        Updated_By_Mobile: r.mobile,
        Submission_Timestamp: r.submission_timestamp
      }));

      localStorage.setItem(STORAGE_INVENTORY, JSON.stringify(formatted));
      return formatted;
    }
  } catch (err) {
    console.warn('Error fetching Supabase inventory:', err);
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

export const exportInventoryToExcel = (inventoryRows, schoolsMaster, statusMap) => {
  return exportFullProjectToExcel(inventoryRows, schoolsMaster, statusMap);
};

/**
 * Super Admin: Update/Edit Hardware Serial Numbers for a School
 */
export const updateSchoolSerials = async (udise, updatedDevices, statusMetadata = {}) => {
  const cleanUdise = String(udise).trim();
  if (!cleanUdise) throw new Error('UDISE code is required to update serials.');

  // 1. Normalize updated devices
  const normalizedDevices = (updatedDevices || []).map(d => ({
    id: d.id,
    name: d.name || d.item_name || d.itemName || d.label || 'Device',
    item_name: d.item_name || d.name || d.itemName || d.label || 'Device',
    make: d.make || d.make_model || '',
    make_model: d.make_model || d.make || '',
    serial: String(d.serial || d.serial_number || '').trim().toUpperCase(),
    serial_number: String(d.serial_number || d.serial || '').trim().toUpperCase()
  }));

  // 2. Intra-form duplicate check (excluding Web Cam and Speaker)
  const serialToDevices = new Map();
  const intraConflicts = [];
  for (const d of normalizedDevices) {
    if (isExcludedFromDuplicateCheck(d.item_name, d.id)) continue;
    const sn = d.serial_number;
    if (!sn) continue;
    if (serialToDevices.has(sn)) {
      const other = serialToDevices.get(sn);
      intraConflicts.push({ serial: sn, name1: d.item_name, name2: other.item_name });
    } else {
      serialToDevices.set(sn, d);
    }
  }

  if (intraConflicts.length > 0) {
    const first = intraConflicts[0];
    throw new Error(`Duplicate serial in form: "${first.serial}" assigned to both "${first.name1}" and "${first.name2}".`);
  }

  // 3. Check for duplicates in other schools (neq('udise', cleanUdise))
  const checkableSerials = normalizedDevices
    .filter(d => !isExcludedFromDuplicateCheck(d.item_name, d.id))
    .map(d => d.serial_number)
    .filter(Boolean);

  if (checkableSerials.length > 0) {
    const { data: dups, error: dupErr } = await supabase
      .from('device_inventory')
      .select('*')
      .neq('udise', cleanUdise)
      .in('serial_number', checkableSerials);

    const filteredDups = (dups || []).filter(d => !isExcludedFromDuplicateCheck(d.item_name));
    if (filteredDups.length > 0) {
      const firstDup = filteredDups[0];
      throw new Error(`Duplicate detected! Serial "${firstDup.serial_number}" is already registered in another school: "${firstDup.school_name}" (UDISE: ${firstDup.udise}).`);
    }
  }

  // 4. Fetch existing school_status row to preserve metadata if not passed
  const { data: existingStatus, error: fetchErr } = await supabase
    .from('school_status')
    .select('*')
    .eq('udise', cleanUdise)
    .maybeSingle();

  if (!existingStatus) {
    throw new Error(`School with UDISE ${cleanUdise} not found in database.`);
  }

  const installedBy = statusMetadata.installed_by || existingStatus.installed_by || 'Admin Update';
  const mobile = statusMetadata.mobile || existingStatus.mobile || '';
  const installDate = statusMetadata.installation_date || existingStatus.installation_date || '';
  const schoolName = existingStatus.school_name || '';
  const snil = existingStatus.snil || '';
  const district = existingStatus.district || '';
  const block = existingStatus.block || '';
  const category = existingStatus.category || '';
  const submissionId = existingStatus.submission_id || ('SUB-' + Date.now());
  const now = new Date();
  const updateTimestamp = `${formatDateDDMMMYYYY(now)} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;

  // 5. Update school_status table
  const { error: statusUpdateErr } = await supabase
    .from('school_status')
    .update({
      devices_json: JSON.stringify(normalizedDevices),
      installed_by: installedBy,
      mobile: mobile,
      installation_date: installDate,
      submission_timestamp: updateTimestamp
    })
    .eq('udise', cleanUdise);

  if (statusUpdateErr) {
    throw new Error(`Failed to update school status: ${statusUpdateErr.message}`);
  }

  // 6. Resynchronize device_inventory table: Delete previous rows for this school and insert updated rows
  await supabase.from('device_inventory').delete().eq('udise', cleanUdise);

  const inventoryRows = normalizedDevices.map(d => ({
    submission_id: submissionId,
    udise: cleanUdise,
    snil: snil,
    school_name: schoolName,
    district: district,
    block: block,
    category: category,
    item_name: d.item_name,
    make_model: d.make_model,
    serial_number: d.serial_number,
    installed_status: 'Yes',
    working_status: 'Yes',
    installation_date: installDate,
    installed_by: installedBy,
    mobile: mobile,
    submission_timestamp: updateTimestamp
  }));

  const { error: invInsertErr } = await supabase
    .from('device_inventory')
    .insert(inventoryRows);

  if (invInsertErr) {
    console.error('Failed to re-insert device inventory:', invInsertErr);
  }

  // 7. Refresh local caches
  await fetchSchoolStatusMap();
  await syncRegisteredSerials(true);
  broadcastPortalSync('STATUS_MAP_UPDATED', { udise: cleanUdise });

  return { success: true, count: normalizedDevices.length };
};

/**
 * Super Admin: Delete School Submission (Reset back to Pending)
 */
export const deleteSchoolSubmission = async (udise) => {
  const cleanUdise = String(udise).trim();
  if (!cleanUdise) throw new Error('UDISE code is required to delete school submission.');

  // 1. Delete from device_inventory in Supabase
  const { error: invErr } = await supabase
    .from('device_inventory')
    .delete()
    .eq('udise', cleanUdise);

  if (invErr) {
    throw new Error(`Failed to delete devices from inventory: ${invErr.message}`);
  }

  // 2. Delete from school_status in Supabase
  const { error: statusErr } = await supabase
    .from('school_status')
    .delete()
    .eq('udise', cleanUdise);

  if (statusErr) {
    throw new Error(`Failed to delete school status record: ${statusErr.message}`);
  }

  // 3. Clear local storage caches
  try {
    const cachedStatus = JSON.parse(localStorage.getItem(STORAGE_STATUS_CACHE) || '{}');
    delete cachedStatus[cleanUdise];
    localStorage.setItem(STORAGE_STATUS_CACHE, JSON.stringify(cachedStatus));

    const reg = JSON.parse(localStorage.getItem(STORAGE_SERIAL_REGISTRY) || '{}');
    Object.keys(reg).forEach(sn => {
      if (reg[sn]?.udise === cleanUdise) {
        delete reg[sn];
      }
    });
    localStorage.setItem(STORAGE_SERIAL_REGISTRY, JSON.stringify(reg));
    inMemorySerialMap = reg;
  } catch (e) {}

  // 4. Force background sync
  broadcastPortalSync('STATUS_MAP_UPDATED', { udise: cleanUdise, deleted: true });
  broadcastPortalSync('FORCE_REFRESH');

  return { success: true };
};
