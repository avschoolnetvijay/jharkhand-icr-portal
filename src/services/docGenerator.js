import PizZip from 'pizzip';

/**
 * XML Character Escaping for WordprocessingML
 */
export const xmlEscape = (str) => {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Helper to build an inline Word XML text run (<w:r>)
 */
const makeRun = (text, { bold = true, sz = 20, font = 'Bookman Old Style' } = {}) => {
  return (
    '<w:r>' +
    '<w:rPr>' +
    '<w:rFonts w:ascii="' + font + '" w:hAnsi="' + font + '"/>' +
    (bold ? '<w:b/><w:bCs/>' : '') +
    '<w:sz w:val="' + sz + '"/>' +
    '<w:szCs w:val="' + sz + '"/>' +
    '</w:rPr>' +
    '<w:t xml:space="preserve">' +
    xmlEscape(text) +
    '</w:t>' +
    '</w:r>'
  );
};

/**
 * Populate Table 1 (School Details: District, Block, School Name, UDISE, SNIL)
 */
const fillSchoolHeaderTable = (xmlStr, school) => {
  let res = xmlStr;
  const district = school.district || '';
  const block = school.block || '';
  const schoolName = school.school_name || '';
  const udise = school.udise || '';
  const snil = school.snil || '';

  // Name of District
  res = res.replace(
    /(Name of District[\s\S]*?<\/w:tc>\s*<w:tc[^>]*>[\s\S]*?<w:p[^>]*><w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    (_, p1, p2) => p1 + makeRun(district, { bold: true, sz: 20 }) + p2
  );

  // Name of Block
  res = res.replace(
    /(Name of Block[\s\S]*?<\/w:tc>\s*<w:tc[^>]*>[\s\S]*?<w:p[^>]*><w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    (_, p1, p2) => p1 + makeRun(block, { bold: true, sz: 20 }) + p2
  );

  // Name of School
  res = res.replace(
    /(Name of School[\s\S]*?<\/w:tc>\s*<w:tc[^>]*>[\s\S]*?<w:p[^>]*><w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    (_, p1, p2) => p1 + makeRun(schoolName, { bold: true, sz: 20 }) + p2
  );

  // UDISE Code
  res = res.replace(
    /(UDISE Code[\s\S]*?<\/w:tc>\s*<w:tc[^>]*>[\s\S]*?<w:p[^>]*><w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    (_, p1, p2) => p1 + makeRun(udise, { bold: true, sz: 20 }) + p2
  );

  // Agency School Code (SNIL)
  res = res.replace(
    /(Agency School Code[\s\S]*?<\/w:tc>\s*<w:tc[^>]*>[\s\S]*?<w:p[^>]*><w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    (_, p1, p2) => p1 + makeRun(snil, { bold: true, sz: 20 }) + p2
  );

  return res;
};

/**
 * Populate Hardware Serial Number Rows in Table 2
 */
const fillSerialRows = (docXml, serialList) => {
  let res = docXml;
  let sIdx = 0;
  const snRegex = /(?:^|\s)(?:\d+\s*\.\s*)?SN\s*[:\-]/;
  const rowPattern = /(<w:tr[\s\S]*?<\/w:tr>)/g;

  res = res.replace(rowPattern, (fullRowXml) => {
    const plainText = fullRowXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (
      snRegex.test(plainText) &&
      !plainText.includes('SN: NA') &&
      !plainText.includes('SN. of the Product')
    ) {
      const serialVal = serialList[sIdx] || '';
      sIdx++;
      if (serialVal) {
        return fullRowXml.replace(
          /(<w:tc[^>]*>[\s\S]*?SN[\s\S]*?<\/w:tc>\s*<w:tc[^>]*>[\s\S]*?<w:p[^>]*><w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
          (_, p1, p2) => p1 + makeRun(serialVal, { bold: true, sz: 20, font: 'Arial' }) + p2
        );
      }
    }
    return fullRowXml;
  });

  return res;
};

/**
 * Populate Installation Date and Agency Sign-off details
 */
const fillInstallationMetadata = (docXml, school, statusInfo) => {
  let res = docXml;
  const installDate = statusInfo?.date || statusInfo?.installation_date || '';
  const installedBy = statusInfo?.installedBy || statusInfo?.installed_by || '';
  const mobile = statusInfo?.mobile || statusInfo?.technician_mobile || '';
  const schoolName = school.school_name || '';

  // 1. Fill installation date
  if (installDate) {
    // Replace "/ /202 6" or "/ 09 /202 6" or "/ /2026"
    res = res.replace(
      /(installed on\s*)([\/0-9\s]+)(\.)/gi,
      `$1 ${installDate} $3`
    );
    res = res.replace(
      /(completed on\s*)([\/0-9\s]+)(\.)/gi,
      `$1 ${installDate} $3`
    );
    res = res.replace(
      /(demonstrated on\s*)([\/0-9\s]+)(to)/gi,
      `$1 ${installDate} $3`
    );
  }

  // 2. Fill Agency Representative name & contact if available
  if (installedBy) {
    const repInfo = mobile ? `${installedBy} (Ph: ${mobile})` : installedBy;
    res = res.replace(
      /__________________________________\s*\(Name of Agency Representative\)/g,
      `${repInfo} — (Name of Agency Representative)`
    );
  }

  // 3. Fill school name in DEO certification statement
  if (schoolName) {
    res = res.replace(
      /established in\s*_{10,}\s*\(name of School\)/gi,
      `established in ${schoolName} (name of School)`
    );
    res = res.replace(
      /established in\s*_{10,}\s*and all the hardware/gi,
      `established in ${schoolName} and all the hardware`
    );
  }

  return res;
};

/**
 * Determine template configuration, template path, and extract ordered serials
 */
export const getTemplateConfig = (school, statusInfo, targetType = 'AUTO') => {
  const category = school.category || '';
  let templateFile = '';
  let headerInDoc = false;
  let docType = 'ICT'; // 'ICT' or 'SMART'

  // Extract raw device records
  let rawDevices = [];
  try {
    if (statusInfo?.devicesJson) {
      rawDevices =
        typeof statusInfo.devicesJson === 'string'
          ? JSON.parse(statusInfo.devicesJson)
          : statusInfo.devicesJson;
    }
  } catch (e) {
    console.error('Failed to parse devicesJson:', e);
  }

  if (category === 'SMART_ONLY' || targetType === 'SMART') {
    templateFile = 'ICR_Format_Smart_571.docx';
    headerInDoc = true;
    docType = 'SMART';
  } else if (category === 'ICT_05_INCS_ONLY' || (category === 'ICT_05_INCS_WITH_SMART' && targetType === 'ICT')) {
    templateFile = 'ICR_Format_ICT_101_5_INCS.docx';
    headerInDoc = false;
    docType = 'ICT';
  } else if (category === 'ICT_05_NODES') {
    templateFile = 'ICR_Format_ICT_5_5_Nods.docx';
    headerInDoc = false;
    docType = 'ICT';
  } else if (category === 'ICT_10_NODES') {
    templateFile = 'ICR_Format_ICT_2_10_Nods.docx';
    headerInDoc = false;
    docType = 'ICT';
  } else {
    // Default fallback
    templateFile = 'ICR_Format_ICT_101_5_INCS.docx';
    headerInDoc = false;
    docType = 'ICT';
  }

  // Extract and order serials for this template
  let orderedSerials = [];

  if (docType === 'SMART') {
    // For Smart Classroom: 4 devices: KYAN 1, KYAN 2, UPS 1, UPS 2
    // Search within rawDevices for matching items
    const findSerial = (predicates) => {
      for (const pred of predicates) {
        const d = rawDevices.find((item) => {
          const id = (item.id || '').toLowerCase();
          const name = (item.name || item.item_name || item.itemName || '').toLowerCase();
          return id.includes(pred) || name.includes(pred);
        });
        if (d && (d.serial || d.serial_number)) {
          return String(d.serial || d.serial_number).trim().toUpperCase();
        }
      }
      return '';
    };

    const kyan1 = findSerial(['smart_kyan_01', 'projector unit 1', 'kyan unit 1', 'kyan 1']);
    const kyan2 = findSerial(['smart_kyan_02', 'projector unit 2', 'kyan unit 2', 'kyan 2']);
    const ups1 = findSerial(['smart_ups_01', 'ups unit 1', 'ups 1']);
    const ups2 = findSerial(['smart_ups_02', 'ups unit 2', 'ups 2']);

    orderedSerials = [kyan1, kyan2, ups1, ups2];

    // Fallback if devices had generic naming: take last 4 or first 4
    if (!orderedSerials.some(Boolean)) {
      const smartDevs = rawDevices.filter(d => (d.id || '').startsWith('smart_'));
      orderedSerials = (smartDevs.length === 4 ? smartDevs : rawDevices.slice(-4)).map(
        d => String(d.serial || d.serial_number || '').trim().toUpperCase()
      );
    }
  } else if (category === 'ICT_05_INCS_WITH_SMART' && docType === 'ICT') {
    // Take the 8 ICT devices: 5 chromebooks, INCS hub, Printer, UPS
    const ictDevs = rawDevices.filter(d => !(d.id || '').startsWith('smart_'));
    orderedSerials = (ictDevs.length >= 8 ? ictDevs.slice(0, 8) : rawDevices.slice(0, 8)).map(
      d => String(d.serial || d.serial_number || '').trim().toUpperCase()
    );
  } else {
    // ICT_05_INCS_ONLY (8), ICT_05_NODES (17), ICT_10_NODES (27)
    orderedSerials = rawDevices.map(
      d => String(d.serial || d.serial_number || '').trim().toUpperCase()
    );
  }

  return {
    templateFile,
    headerInDoc,
    docType,
    orderedSerials
  };
};

/**
 * Fetch static template from public directory
 */
const fetchTemplateArrayBuffer = async (templateFileName) => {
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.BASE_URL) ? import.meta.env.BASE_URL : '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const url = `${cleanBase}templates/${templateFileName}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load template ${templateFileName} (${res.status} ${res.statusText})`);
  }
  return await res.arrayBuffer();
};

/**
 * Generate a filled official ICR Word (.docx) document
 * @param {Object} school - Master school object (school_name, udise, snil, district, block, category)
 * @param {Object} statusInfo - Status object from statusMap (installedBy, mobile, date, devicesJson)
 * @param {'AUTO'|'ICT'|'SMART'} targetType - Target document type
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export const generateIcrDocx = async (school, statusInfo, targetType = 'AUTO') => {
  const config = getTemplateConfig(school, statusInfo, targetType);
  const templateBuffer = await fetchTemplateArrayBuffer(config.templateFile);

  const zip = new PizZip(templateBuffer);

  // 1. Populate Table 1 (School Details)
  if (config.headerInDoc) {
    // In Smart Class, Table 1 is in word/document.xml
    let docXml = zip.files['word/document.xml'].asText();
    docXml = fillSchoolHeaderTable(docXml, school);
    docXml = fillSerialRows(docXml, config.orderedSerials);
    docXml = fillInstallationMetadata(docXml, school, statusInfo);
    zip.file('word/document.xml', docXml);
  } else {
    // In ICT files, Table 1 is in word/header1.xml
    if (zip.files['word/header1.xml']) {
      let hdrXml = zip.files['word/header1.xml'].asText();
      hdrXml = fillSchoolHeaderTable(hdrXml, school);
      zip.file('word/header1.xml', hdrXml);
    }

    let docXml = zip.files['word/document.xml'].asText();
    docXml = fillSerialRows(docXml, config.orderedSerials);
    docXml = fillInstallationMetadata(docXml, school, statusInfo);
    zip.file('word/document.xml', docXml);
  }

  const outBuffer = zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  // Construct clean, professional filename
  const cleanSchoolName = (school.school_name || 'School')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30);
  const typeTag = config.docType === 'SMART' ? 'SmartClass' : 'ICT';
  const filename = `ICR_${typeTag}_${school.udise}_${cleanSchoolName}.docx`;

  return {
    blob: outBuffer,
    filename,
    docType: config.docType
  };
};

/**
 * Trigger immediate browser download of a Blob
 */
export const triggerBrowserDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * High-level helper: Generate and Download ICR in one call
 */
export const downloadIcrDocument = async (school, statusInfo, targetType = 'AUTO') => {
  const result = await generateIcrDocx(school, statusInfo, targetType);
  triggerBrowserDownload(result.blob, result.filename);
  return result;
};
