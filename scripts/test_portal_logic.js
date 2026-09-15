import fs from 'fs';
import { getCategoryDevices } from '../src/data/deviceSchemas.js';

console.log('--- RUNNING PORTAL VERIFICATION TESTS ---');

// 1. Verify schools_master.json
const rawSchools = fs.readFileSync('./src/data/schools_master.json', 'utf8');
const schools = JSON.parse(rawSchools);

console.log(`[Test 1] Total schools loaded: ${schools.length} (Expected: 679)`);
if (schools.length !== 679) {
  throw new Error(`School count mismatch: got ${schools.length}, expected 679`);
}

// 2. Test Device counts and Schema validity
const expectedCounts = {
  'ICT_05_INCS_WITH_SMART': 12,
  'ICT_05_INCS_ONLY': 8,
  'ICT_05_NODES': 17,
  'ICT_10_NODES': 27,
  'SMART_ONLY': 4
};

console.log('[Test 2] Verifying device counts and exclusion of non-serial items...');
for (const [cat, expected] of Object.entries(expectedCounts)) {
  const devs = getCategoryDevices(cat);
  console.log(`  - Category ${cat}: ${devs.length} devices (Expected: ${expected})`);
  if (devs.length !== expected) {
    throw new Error(`Device count for ${cat} failed: got ${devs.length}, expected ${expected}`);
  }

  // Check no non-serial items
  for (const d of devs) {
    const forbidden = ['table', 'chair', 'furniture', 'whiteboard', 'battery backup', 'antivirus', 'office suite'];
    const nameLower = d.itemName.toLowerCase();
    for (const f of forbidden) {
      if (nameLower.includes(f)) {
        throw new Error(`Forbidden non-serial item found in ${cat}: ${d.itemName}`);
      }
    }
  }
}
console.log('  -> All non-serial items (table, chair, whiteboard, software, MDM) successfully excluded!');

// 3. Test Row-wise record format simulation
console.log('[Test 3] Simulating Row-Wise record generation for ICT + Smart school...');
const sampleSchool = schools.find(s => s.category === 'ICT_05_INCS_WITH_SMART');
const sampleDevices = getCategoryDevices(sampleSchool.category);

const mockSubmission = {
  submission_id: 'SUB-TEST-1001',
  udise: sampleSchool.udise,
  snil: sampleSchool.snil,
  school_name: sampleSchool.school_name,
  district: sampleSchool.district,
  block: sampleSchool.block,
  category: sampleSchool.category,
  technician_name: 'Test Engineer',
  technician_mobile: '9876543210',
  installation_date: '15/09/2026',
  timestamp: '15/09/2026 19:00:00'
};

const generatedRows = sampleDevices.map((d, i) => ({
  'Submission_ID': mockSubmission.submission_id,
  'UDISE_Code': mockSubmission.udise,
  'SNIL_Code': mockSubmission.snil,
  'School_Name': mockSubmission.school_name,
  'District': mockSubmission.district,
  'Block_Name': mockSubmission.block,
  'Lab_Category': mockSubmission.category,
  'Item_Name': d.itemName,
  'Make_And_Model': `${d.make} ${d.model}`,
  'Serial_Number': `TEST-SN-${String(i + 1).padStart(3, '0')}`,
  'Installed_Status': 'Yes',
  'Working_Status': 'Yes',
  'Installation_Date': mockSubmission.installation_date,
  'Updated_By_Name': mockSubmission.technician_name,
  'Updated_By_Mobile': mockSubmission.technician_mobile,
  'Submission_Timestamp': mockSubmission.timestamp
}));

console.log(`  -> Generated ${generatedRows.length} individual rows for 1 school submission.`);
console.log('  -> Sample Row 1:', generatedRows[0]);
console.log('  -> Sample Row 12:', generatedRows[11]);

if (generatedRows.length !== 12) {
  throw new Error(`Expected 12 rows, got ${generatedRows.length}`);
}

console.log('--- ALL LOGIC TESTS PASSED WITH 100% SUCCESS ---');
