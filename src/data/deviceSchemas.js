// Device Specifications and Metadata for each Lab Type
// Furniture, whiteboards, loose battery quantities, headphones (NA), software licenses, and MDM are excluded.

export const CATEGORY_LABELS = {
  'ICT_05_INCS_WITH_SMART': 'ICT 5 INCS + Smart Class (12 Devices)',
  'ICT_05_INCS_ONLY': 'ICT 5 INCS Lab (8 Devices)',
  'ICT_05_NODES': 'ICT 5 Nodes Lab (17 Devices)',
  'ICT_10_NODES': 'ICT 10 Nodes Lab (27 Devices)',
  'SMART_ONLY': 'Smart Classroom (4 Devices)',
};

export const CATEGORY_BADGE_COLORS = {
  'ICT_05_INCS_WITH_SMART': 'bg-purple-100 text-purple-800 border-purple-200',
  'ICT_05_INCS_ONLY': 'bg-blue-100 text-blue-800 border-blue-200',
  'ICT_05_NODES': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'ICT_10_NODES': 'bg-amber-100 text-amber-800 border-amber-200',
  'SMART_ONLY': 'bg-teal-100 text-teal-800 border-teal-200',
};

// Helper to generate numbered devices
const generateNumbered = (count, baseName, make, model, section = 'ICT Lab') => {
  return Array.from({ length: count }, (_, i) => {
    const numStr = String(i + 1).padStart(2, '0');
    return {
      id: `${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${numStr}`,
      itemName: `${baseName} ${numStr}`,
      make: make,
      model: model,
      section: section,
      placeholder: `Enter ${baseName} ${numStr} Serial Number`
    };
  });
};

export const getCategoryDevices = (category) => {
  switch (category) {
    case 'ICT_05_INCS_ONLY':
      return [
        ...generateNumbered(5, 'Chromebook', 'ACER', 'CO731', 'ICT Lab (Chromebooks)'),
        {
          id: 'incs_geneo_hub_01',
          itemName: 'Integrated Networking Computing System (INCS)',
          make: 'Schoolnet',
          model: 'GENEO HUB',
          section: 'ICT Lab Core',
          placeholder: 'Enter INCS Hub Serial Number'
        },
        {
          id: 'printer_01',
          itemName: 'Multifunctional Printer',
          make: 'Brother',
          model: 'DCP-B7640DWB',
          section: 'ICT Lab Core',
          placeholder: 'Enter Printer Serial Number'
        },
        {
          id: 'ups_ict_01',
          itemName: '1.0 KVA Line Interactive UPS with backup battery',
          make: 'Numeric',
          model: 'Digital 1000 Plus V',
          section: 'ICT Lab Power',
          placeholder: 'Enter UPS Serial Number'
        }
      ];

    case 'ICT_05_INCS_WITH_SMART':
      return [
        // 8 ICT Devices
        ...generateNumbered(5, 'Chromebook', 'ACER', 'CO731', 'ICT Lab (Chromebooks)'),
        {
          id: 'incs_geneo_hub_01',
          itemName: 'Integrated Networking Computing System (INCS)',
          make: 'Schoolnet',
          model: 'GENEO HUB',
          section: 'ICT Lab Core',
          placeholder: 'Enter INCS Hub Serial Number'
        },
        {
          id: 'printer_01',
          itemName: 'Multifunctional Printer',
          make: 'Brother',
          model: 'DCP-B7640DWB',
          section: 'ICT Lab Core',
          placeholder: 'Enter Printer Serial Number'
        },
        {
          id: 'ups_ict_01',
          itemName: '1.0 KVA Line Interactive UPS with backup battery',
          make: 'Numeric',
          model: 'Digital 1000 Plus V',
          section: 'ICT Lab Power',
          placeholder: 'Enter UPS Serial Number'
        },
        // 4 Smart Class Devices
        {
          id: 'smart_kyan_01',
          itemName: 'Projector Unit 1 (Integrated Interactive Computer cum Projector)',
          make: 'Schoolnet',
          model: 'KYAN XG',
          section: 'Smart Classroom Unit 1',
          placeholder: 'Enter KYAN Projector Unit 1 Serial Number'
        },
        {
          id: 'smart_ups_01',
          itemName: '1.0 KVA UPS Unit 1',
          make: 'Numeric',
          model: 'Digital 1000 Plus V',
          section: 'Smart Classroom Unit 1',
          placeholder: 'Enter 1.0 KVA UPS Unit 1 Serial Number'
        },
        {
          id: 'smart_kyan_02',
          itemName: 'Projector Unit 2 (Integrated Interactive Computer cum Projector)',
          make: 'Schoolnet',
          model: 'KYAN XG',
          section: 'Smart Classroom Unit 2',
          placeholder: 'Enter KYAN Projector Unit 2 Serial Number'
        },
        {
          id: 'smart_ups_02',
          itemName: '1.0 KVA UPS Unit 2',
          make: 'Numeric',
          model: 'Digital 1000 Plus V',
          section: 'Smart Classroom Unit 2',
          placeholder: 'Enter 1.0 KVA UPS Unit 2 Serial Number'
        }
      ];

    case 'ICT_05_NODES':
      return [
        ...generateNumbered(5, 'Desktop CPU (with Keyboard & Mouse)', 'ACER', 'VeritonX M200-P500', 'Desktops'),
        ...generateNumbered(5, 'Desktop Monitor', 'ACER', 'Monitor', 'Monitors'),
        {
          id: 'webcam_01',
          itemName: 'Web Cam With Microphone (External)',
          make: 'ZEBRONIC',
          model: 'Zeb Crisp Pro',
          section: 'Peripherals',
          placeholder: 'Enter Web Cam Serial Number'
        },
        {
          id: 'printer_01',
          itemName: 'Multifunction Printer',
          make: 'Brother',
          model: 'DCP-B7640DWB',
          section: 'Peripherals',
          placeholder: 'Enter Printer Serial Number'
        },
        {
          id: 'router_01',
          itemName: 'Networking Router',
          make: 'D-LINK',
          model: 'DIR - 825',
          section: 'Peripherals',
          placeholder: 'Enter Router Serial Number'
        },
        {
          id: 'ups_2kva_01',
          itemName: 'UPS (2 KVA online UPS)',
          make: 'NUMERIC',
          model: 'Onfiniti+FM',
          section: 'Power Infrastructure',
          placeholder: 'Enter 2 KVA UPS Serial Number'
        },
        {
          id: 'stabilizer_01',
          itemName: 'Voltage Stabilizer',
          make: 'OPTO',
          model: 'VDVA 5K9L CT',
          section: 'Power Infrastructure',
          placeholder: 'Enter Stabilizer Serial Number'
        },
        {
          id: 'projector_01',
          itemName: 'Projector with Wall mount',
          make: 'Optoma',
          model: 'CX309ST',
          section: 'AV Infrastructure',
          placeholder: 'Enter Projector Serial Number'
        },
        {
          id: 'speaker_01',
          itemName: 'Speaker',
          make: 'Zebronics',
          model: 'Zeb VA100',
          section: 'AV Infrastructure',
          placeholder: 'Enter Speaker Serial Number'
        }
      ];

    case 'ICT_10_NODES':
      return [
        ...generateNumbered(10, 'Desktop CPU (with Keyboard & Mouse)', 'ACER', 'VeritonX M200-P500', 'Desktops'),
        ...generateNumbered(10, 'Desktop Monitor', 'ACER', 'Monitor', 'Monitors'),
        {
          id: 'webcam_01',
          itemName: 'Web Cam With Microphone (External)',
          make: 'ZEBRONIC',
          model: 'Zeb Crisp Pro',
          section: 'Peripherals',
          placeholder: 'Enter Web Cam Serial Number'
        },
        {
          id: 'printer_01',
          itemName: 'Multifunction Printer',
          make: 'Brother',
          model: 'DCP-B7640DWB',
          section: 'Peripherals',
          placeholder: 'Enter Printer Serial Number'
        },
        {
          id: 'router_01',
          itemName: 'Networking Router',
          make: 'D-LINK',
          model: 'DIR - 825',
          section: 'Peripherals',
          placeholder: 'Enter Router Serial Number'
        },
        {
          id: 'ups_3kva_01',
          itemName: 'UPS (3 KVA online UPS)',
          make: 'NUMERIC',
          model: 'Onfiniti+FM',
          section: 'Power Infrastructure',
          placeholder: 'Enter 3 KVA UPS Serial Number'
        },
        {
          id: 'stabilizer_01',
          itemName: 'Voltage Stabilizer',
          make: 'OPTO',
          model: 'VDVA 5K9L CT',
          section: 'Power Infrastructure',
          placeholder: 'Enter Stabilizer Serial Number'
        },
        {
          id: 'projector_01',
          itemName: 'Projector with Wall mount',
          make: 'Optoma',
          model: 'CX309ST',
          section: 'AV Infrastructure',
          placeholder: 'Enter Projector Serial Number'
        },
        {
          id: 'speaker_01',
          itemName: 'Speaker',
          make: 'Zebronics',
          model: 'Zeb VA100',
          section: 'AV Infrastructure',
          placeholder: 'Enter Speaker Serial Number'
        }
      ];

    case 'SMART_ONLY':
      return [
        {
          id: 'smart_kyan_01',
          itemName: 'Integrated Interactive Computer cum Projector Unit 1 (Android Enabled)',
          make: 'Schoolnet',
          model: 'KYAN XG',
          section: 'Smart Classroom Unit 1',
          placeholder: 'Enter KYAN Unit 1 Serial Number'
        },
        {
          id: 'smart_ups_01',
          itemName: '1.0 KVA UPS Unit 1',
          make: 'Numeric',
          model: 'Digital 1000 Plus V',
          section: 'Smart Classroom Unit 1',
          placeholder: 'Enter 1.0 KVA UPS Unit 1 Serial Number'
        },
        {
          id: 'smart_kyan_02',
          itemName: 'Integrated Interactive Computer cum Projector Unit 2 (Android Enabled)',
          make: 'Schoolnet',
          model: 'KYAN XG',
          section: 'Smart Classroom Unit 2',
          placeholder: 'Enter KYAN Unit 2 Serial Number'
        },
        {
          id: 'smart_ups_02',
          itemName: '1.0 KVA UPS Unit 2',
          make: 'Numeric',
          model: 'Digital 1000 Plus V',
          section: 'Smart Classroom Unit 2',
          placeholder: 'Enter 1.0 KVA UPS Unit 2 Serial Number'
        }
      ];

    default:
      return [];
  }
};
