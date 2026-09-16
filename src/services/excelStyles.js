import XLSX from 'xlsx-js-style';
import { formatDateDDMMMYYYY } from './api';

// Professional Color Palette
const COLORS = {
  NAVY_DARK: '0D1B2A',      // Project Title Banner
  NAVY_LIGHT: '1E3A5F',     // Sub-banner
  HEADER_BLUE: '1D68E2',    // Column Headers
  HEADER_DARK_BLUE: '14428B',
  ZEBRA_LIGHT: 'F8FAFC',    // Soft row striping
  WHITE: 'FFFFFF',
  BORDER_COLOR: 'CBD5E1',   // Crisp cell borders
  BORDER_HEADER: '0B2556',
  SUCCESS_BG: 'DCFCE7',     // Soft emerald for Completed
  SUCCESS_TEXT: '166534',
  PENDING_BG: 'FEF3C7',     // Soft amber for Pending
  PENDING_TEXT: '92400E',
  ACCENT_TEXT: '1E293B'
};

const BORDER_ALL = {
  top: { style: 'thin', color: { rgb: COLORS.BORDER_COLOR } },
  bottom: { style: 'thin', color: { rgb: COLORS.BORDER_COLOR } },
  left: { style: 'thin', color: { rgb: COLORS.BORDER_COLOR } },
  right: { style: 'thin', color: { rgb: COLORS.BORDER_COLOR } }
};

const BORDER_HEADER = {
  top: { style: 'thin', color: { rgb: COLORS.BORDER_HEADER } },
  bottom: { style: 'medium', color: { rgb: COLORS.BORDER_HEADER } },
  left: { style: 'thin', color: { rgb: COLORS.BORDER_HEADER } },
  right: { style: 'thin', color: { rgb: COLORS.BORDER_HEADER } }
};

/**
 * Builds a styled Worksheet with Banner, Header, and Data Rows
 */
function createStyledSheet({ title, subtitle, headers, rows, colWidths = [] }) {
  const wsData = [];

  // Row 0: Main Banner Title
  wsData.push([title]);
  // Row 1: Subtitle / Timestamp
  wsData.push([subtitle]);
  // Row 2: Empty separator
  wsData.push([]);
  // Row 3: Column Headers
  wsData.push(headers);

  // Rows 4+: Data Rows
  rows.forEach((r) => {
    wsData.push(r);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const numCols = headers.length;

  // Merges for Banner
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } }
  ];

  // Row heights
  ws['!rows'] = [
    { hpt: 32 }, // Main title
    { hpt: 20 }, // Subtitle
    { hpt: 8 },  // Gap
    { hpt: 26 }, // Headers
  ];

  // Apply Styles
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) {
        ws[cellAddress] = { t: 's', v: '' };
      }
      const cell = ws[cellAddress];

      // 1. Row 0: Banner Title
      if (R === 0) {
        cell.s = {
          font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: COLORS.WHITE } },
          fill: { fgColor: { rgb: COLORS.NAVY_DARK } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      // 2. Row 1: Subtitle
      else if (R === 1) {
        cell.s = {
          font: { name: 'Calibri', sz: 10, italic: true, color: { rgb: 'E2E8F0' } },
          fill: { fgColor: { rgb: COLORS.NAVY_LIGHT } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      // 3. Row 2: Gap
      else if (R === 2) {
        cell.s = {
          fill: { fgColor: { rgb: COLORS.WHITE } }
        };
      }
      // 4. Row 3: Column Headers
      else if (R === 3) {
        cell.s = {
          font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: COLORS.WHITE } },
          fill: { fgColor: { rgb: COLORS.HEADER_BLUE } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: BORDER_HEADER
        };
      }
      // 5. Data Rows (R >= 4)
      else {
        const isZebra = R % 2 === 1;
        const baseBg = isZebra ? COLORS.ZEBRA_LIGHT : COLORS.WHITE;
        const valStr = String(cell.v !== undefined && cell.v !== null ? cell.v : '').trim();

        // Check if status cell
        if (valStr === 'Completed') {
          cell.s = {
            font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.SUCCESS_TEXT } },
            fill: { fgColor: { rgb: COLORS.SUCCESS_BG } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: BORDER_ALL
          };
        } else if (valStr === 'Pending') {
          cell.s = {
            font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.PENDING_TEXT } },
            fill: { fgColor: { rgb: COLORS.PENDING_BG } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: BORDER_ALL
          };
        } else {
          // General cell
          const isNumeric = typeof cell.v === 'number';
          cell.s = {
            font: { name: 'Calibri', sz: 10, color: { rgb: COLORS.ACCENT_TEXT } },
            fill: { fgColor: { rgb: baseBg } },
            alignment: {
              horizontal: isNumeric || valStr.length <= 5 ? 'center' : 'left',
              vertical: 'center',
              wrapText: false
            },
            border: BORDER_ALL
          };
        }
      }
    }
  }

  // Column Widths
  if (colWidths.length > 0) {
    ws['!cols'] = colWidths.map((w) => ({ wch: w }));
  } else {
    const autoCols = [];
    for (let C = 0; C < numCols; C++) {
      autoCols.push({ wch: 18 });
    }
    ws['!cols'] = autoCols;
  }

  return ws;
}

/**
 * 1. Export Full Project Excel (Device Serial Register + School Status Summary)
 */
export const exportFullProjectToExcel = (inventoryRows, schoolsMaster, statusMap) => {
  const wb = XLSX.utils.book_new();
  const dateStr = formatDateDDMMMYYYY(new Date());

  // Sheet 1: Device Serial Inventory Register
  const invHeaders = [
    'SL No',
    'Submission ID',
    'UDISE Code',
    'SNIL Code',
    'School Name',
    'District',
    'Block Name',
    'Lab Category',
    'Device / Item Name',
    'Make & Model',
    'Serial Number',
    'Installed',
    'Working',
    'Installation Date',
    'Installed By',
    'Mobile Number',
    'Submission Timestamp'
  ];

  const invRows = (inventoryRows || []).map((row, idx) => [
    idx + 1,
    row.Submission_ID || `SUB-${idx + 1}`,
    row.UDISE_Code,
    row.SNIL_Code,
    row.School_Name,
    row.District,
    row.Block_Name,
    row.Lab_Category,
    row.Item_Name,
    row.Make_And_Model,
    row.Serial_Number,
    row.Installed_Status || 'Yes',
    row.Working_Status || 'Yes',
    formatDateDDMMMYYYY(row.Installation_Date),
    row.Installed_By || row.Updated_By_Name || '',
    row.Updated_By_Mobile || '',
    row.Submission_Timestamp || ''
  ]);

  const wsInventory = createStyledSheet({
    title: 'JHARKHAND EDUCATION PROJECT COUNCIL — ICT 108 & SC 664 PROJECT',
    subtitle: `DEVICE SERIAL INVENTORY ASSET REGISTER | Generated on ${dateStr}`,
    headers: invHeaders,
    rows: invRows,
    colWidths: [8, 18, 14, 18, 38, 16, 18, 25, 28, 22, 22, 10, 10, 16, 22, 16, 24]
  });
  XLSX.utils.book_append_sheet(wb, wsInventory, 'Device_Serial_Register');

  // Sheet 2: School Summary Status (All 679)
  const sumHeaders = [
    'SL No',
    'UDISE Code',
    'SNIL Code',
    'School Name',
    'District',
    'Block Name',
    'Lab Category',
    'Total Devices',
    'Status',
    'Installed By',
    'Mobile Number',
    'Installation Date',
    'Submission Timestamp'
  ];

  const sumRows = (schoolsMaster || []).map((sch, idx) => {
    const statusInfo = (statusMap && statusMap[String(sch.udise)]) || {};
    const isCompleted = statusInfo.status === 'Completed';

    return [
      idx + 1,
      sch.udise,
      sch.snil,
      sch.school_name,
      sch.district,
      sch.block,
      sch.category,
      sch.device_count,
      isCompleted ? 'Completed' : 'Pending',
      statusInfo.installedBy || statusInfo.updatedBy || '-',
      statusInfo.mobile || '-',
      statusInfo.date ? formatDateDDMMMYYYY(statusInfo.date) : '-',
      statusInfo.timestamp || '-'
    ];
  });

  const wsSummary = createStyledSheet({
    title: 'JHARKHAND EDUCATION PROJECT COUNCIL — ICT 108 & SC 664 PROJECT',
    subtitle: `MASTER SCHOOL INSTALLATION STATUS SUMMARY (679 SCHOOLS) | Generated on ${dateStr}`,
    headers: sumHeaders,
    rows: sumRows,
    colWidths: [8, 14, 18, 38, 16, 18, 25, 14, 14, 22, 16, 16, 24]
  });
  XLSX.utils.book_append_sheet(wb, wsSummary, 'School_Status_Summary');

  XLSX.writeFile(wb, `ICR_Device_Serial_Register_Jharkhand_${dateStr}.xlsx`);
};

/**
 * 2. Export Single School ICR Sheet
 */
export const exportSingleSchoolICRToExcel = ({
  school,
  devices = [],
  serialValues = {},
  installedBy = '',
  technicianMobile = '',
  installDate = '',
  submissionId = ''
}) => {
  if (!school) return;
  const wb = XLSX.utils.book_new();
  const dateStr = formatDateDDMMMYYYY(installDate || new Date());

  const headers = [
    'SL No',
    'Device / Hardware Item',
    'Model & Specification',
    'Physical Serial Number',
    'Installed Status',
    'Working Status',
    'School Name',
    'UDISE Code',
    'SNIL Code',
    'District',
    'Block',
    'Installed By',
    'Mobile',
    'Installation Date'
  ];

  const rows = devices.map((d, idx) => [
    idx + 1,
    d.label || d.name,
    d.specs || d.make || '-',
    serialValues[d.id] || d.serial || '-',
    'Yes',
    'Yes',
    school.school_name,
    school.udise,
    school.snil,
    school.district,
    school.block,
    installedBy,
    technicianMobile,
    dateStr
  ]);

  const ws = createStyledSheet({
    title: `INSTALLATION COMPLETION CERTIFICATE (ICR) — ${school.school_name.toUpperCase()}`,
    subtitle: `UDISE: ${school.udise} | SNIL: ${school.snil} | District: ${school.district} | Ref: ${submissionId || 'SUB-COMPLETED'}`,
    headers,
    rows,
    colWidths: [8, 30, 24, 24, 14, 14, 38, 15, 18, 16, 18, 22, 16, 16]
  });

  XLSX.utils.book_append_sheet(wb, ws, 'School_ICR_Record');
  XLSX.writeFile(wb, `ICR_${school.udise}_${school.school_name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.xlsx`);
};

/**
 * 3. Export District Analytics Report
 */
export const exportDistrictReportToExcel = (districtAnalytics) => {
  const wb = XLSX.utils.book_new();
  const dateStr = formatDateDDMMMYYYY(new Date());

  const headers = [
    'SL No',
    'District Name',
    'Total Allocated Labs',
    'Completed (Digitized)',
    'Pending Digitization',
    'Progress Percentage'
  ];

  const rows = (districtAnalytics || []).map((d, idx) => [
    idx + 1,
    d.district,
    d.total,
    d.completed,
    d.pending,
    `${d.percent}%`
  ]);

  const ws = createStyledSheet({
    title: 'JHARKHAND EDUCATION PROJECT COUNCIL — ICT 108 & SC 664 PROJECT',
    subtitle: `DISTRICT-WISE IMPLEMENTATION PROGRESS REPORT | Generated on ${dateStr}`,
    headers,
    rows,
    colWidths: [8, 24, 22, 22, 22, 20]
  });

  XLSX.utils.book_append_sheet(wb, ws, 'District_Progress');
  XLSX.writeFile(wb, `District_Wise_Progress_Report_${dateStr}.xlsx`);
};

/**
 * 4. Export Category Analytics Report
 */
export const exportCategoryReportToExcel = (categoryAnalytics) => {
  const wb = XLSX.utils.book_new();
  const dateStr = formatDateDDMMMYYYY(new Date());

  const headers = [
    'SL No',
    'Lab Allocation Category',
    'Category Code',
    'Total Target Labs',
    'Completed (Digitized)',
    'Pending Digitization',
    'Progress Percentage'
  ];

  const rows = (categoryAnalytics || []).map((c, idx) => [
    idx + 1,
    c.label,
    c.category,
    c.total,
    c.completed,
    c.pending,
    `${c.percent}%`
  ]);

  const ws = createStyledSheet({
    title: 'JHARKHAND EDUCATION PROJECT COUNCIL — ICT 108 & SC 664 PROJECT',
    subtitle: `LAB ALLOCATION CATEGORY BREAKDOWN REPORT | Generated on ${dateStr}`,
    headers,
    rows,
    colWidths: [8, 38, 22, 18, 22, 22, 20]
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Category_Breakdown');
  XLSX.writeFile(wb, `Category_Breakdown_Report_${dateStr}.xlsx`);
};

/**
 * 5. Export Filtered Schools Directory
 */
export const exportFilteredSchoolsToExcel = (filteredSchools, statusMap, filterTitle = 'Master Schools') => {
  const wb = XLSX.utils.book_new();
  const dateStr = formatDateDDMMMYYYY(new Date());

  const headers = [
    'SL No',
    'UDISE Code',
    'SNIL Code',
    'School Name',
    'District',
    'Block Name',
    'Lab Category',
    'Status',
    'Installed By',
    'Technician Mobile',
    'Installation Date'
  ];

  const rows = (filteredSchools || []).map((sch, idx) => {
    const info = (statusMap && statusMap[sch.udise]) || {};
    const isDone = info.status === 'Completed';

    return [
      idx + 1,
      sch.udise,
      sch.snil,
      sch.school_name,
      sch.district,
      sch.block,
      sch.category,
      isDone ? 'Completed' : 'Pending',
      info.installedBy || info.updatedBy || '-',
      info.mobile || '-',
      info.date ? formatDateDDMMMYYYY(info.date) : '-'
    ];
  });

  const ws = createStyledSheet({
    title: 'JHARKHAND EDUCATION PROJECT COUNCIL — ICT 108 & SC 664 PROJECT',
    subtitle: `${filterTitle.toUpperCase()} REPORT (${filteredSchools.length} Schools) | Generated on ${dateStr}`,
    headers,
    rows,
    colWidths: [8, 14, 18, 38, 16, 18, 24, 14, 22, 18, 16]
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Schools_Directory');
  XLSX.writeFile(wb, `Schools_Directory_Report_${dateStr}.xlsx`);
};
