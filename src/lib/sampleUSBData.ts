import { ScannedFile, USBVolumeInfo, QuarterSummary } from '../types';
import { classifyFileQuarter, getFileCategory } from './quarterEngine';

export const SAMPLE_USB_INFO: USBVolumeInfo = {
  name: 'GOVT_FINANCE_USB_32GB',
  filesystem: 'FAT32',
  totalCapacityBytes: 34359738368, // 32 GB
  usedBytes: 19756843000, // 18.4 GB
  freeBytes: 14602895368, // 13.6 GB
  totalFiles: 248,
  totalFolders: 36,
  lastScanTimestamp: new Date('2026-07-28T04:30:00.000Z'),
  scanDurationMs: 1420,
  readSpeedMBps: 185.4,
  serialNumber: 'USB-SN-88294021-SECURE',
  capacityEstimated: true,
};

// Generate deterministic rich realistic files across all 4 quarters
function createSampleFiles(): ScannedFile[] {
  const fileTemplates = [
    // Q1 Files (July, August, September)
    {
      name: 'Q1_2025_Executive_Financial_Summary.pdf',
      path: '/Finance/2025/Q1/Q1_2025_Executive_Financial_Summary.pdf',
      folderPath: '/Finance/2025/Q1',
      size: 4820100,
      modDate: '2025-07-15T10:00:00Z',
      sha: 'a8f5f167f44f4964e6c998dee827110c00010101010101010101010101010101',
      text: `# EXECUTIVE FINANCIAL SUMMARY - Q1 (JULY 2025)
      
Organization: National Audit & Financial Division
Fiscal Year: FY 2025-2026
Period: July 1, 2025 - September 30, 2025

Key Highlights:
- Total Operating Revenue: $14,250,000 USD (+12.4% YoY)
- Expenditures: $9,120,000 USD
- Net Operating Margin: 35.9%
- Compliance Index: 99.4%

Quarterly Milestone Status:
[X] Annual Audit Readiness Review completed on July 12, 2025.
[X] Sub-agency budget allocation finalized.
[ ] Q2 Asset Inventory Preparation underway.`
    },
    {
      name: 'July_2025_Payroll_Disbursement_Sheet.xlsx',
      path: '/Payroll/2025/July_2025_Payroll_Disbursement_Sheet.xlsx',
      folderPath: '/Payroll/2025',
      size: 1850000,
      modDate: '2025-07-28T14:30:00Z',
      sha: 'b9e6f278f55f5975e7d009eee938220d00020202020202020202020202020202',
      text: `Emp ID, Name, Department, Gross Salary, Tax Deductions, Net Pay, Status
EMP-101, Sarah Jenkins, Executive, $12500, $3125, $9375, Approved
EMP-102, Marcus Vance, IT Infrastructure, $9800, $2450, $7350, Approved
EMP-103, Elena Rostova, Finance, $10500, $2625, $7875, Approved
EMP-104, David Chen, Operations, $8900, $2225, $6675, Approved
EMP-105, Michael Scott, Branch Management, $11200, $2800, $8400, Approved`
    },
    {
      name: '2025-08-14_Tax_Compliance_Receipt.pdf',
      path: '/Taxation/2025/2025-08-14_Tax_Compliance_Receipt.pdf',
      folderPath: '/Taxation/2025',
      size: 890000,
      modDate: '2025-08-14T09:15:00Z',
      sha: 'c0f7f389f66f6986e8e010fff049330e00030303030303030303030303030303',
      text: `OFFICIAL GOVERNMENT TAX COMPLIANCE ACKNOWLEDGMENT
Receipt ID: TAX-2025-08-9941
Date Issued: August 14, 2025
Payer: Federal Operations & Logistics Bureau

This certifies full tax compliance for August 2025 under Tax Registration #TR-99381.
Amount Remitted: $412,500.00 USD`
    },
    {
      name: 'September_2025_Departmental_Invoices.zip',
      path: '/Invoices/2025/September_2025_Departmental_Invoices.zip',
      folderPath: '/Invoices/2025',
      size: 15400000,
      modDate: '2025-09-30T16:45:00Z',
      sha: 'd1f8f490f77f7997e9f021aaa150440f00040404040404040404040404040404'
    },
    {
      name: 'Aug_2025_Infrastructure_Photo_01.jpg',
      path: '/Media/Photos/2025/Aug_2025_Infrastructure_Photo_01.jpg',
      folderPath: '/Media/Photos/2025',
      size: 3450000,
      modDate: '2025-08-05T11:20:00Z',
      sha: 'e2f9f501f88f8908e0f032bbb261550f00050505050505050505050505050505'
    },

    // Q2 Files (October, November, December)
    {
      name: 'October_2025_Vendor_Contract_Procurement.docx',
      path: '/Procurement/2025/October_2025_Vendor_Contract_Procurement.docx',
      folderPath: '/Procurement/2025',
      size: 2310000,
      modDate: '2025-10-12T08:00:00Z',
      sha: 'f3f0f612f99f9919e1f043ccc372660f00060606060606060606060606060606',
      text: `PROCUREMENT & VENDOR MASTER AGREEMENT
Contract Ref: CON-2025-OCT-881
Effective Date: October 1, 2025

Parties:
1. QuarterSort AI Systems Division
2. Enterprise Server Hardware Corp

Scope of Deliverables:
- 50x Cloud Storage Units (40TB Rackmount)
- High-Throughput Redundant USB Array Stations
Total Contract Value: $340,000 USD`
    },
    {
      name: '2025-11-20_MidTerm_Financial_Audit.pdf',
      path: '/Audit/2025/2025-11-20_MidTerm_Financial_Audit.pdf',
      folderPath: '/Audit/2025',
      size: 6120000,
      modDate: '2025-11-20T13:40:00Z',
      sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      text: `MID-TERM FINANCIAL AUDIT REPORT (NOVEMBER 2025)
Audit Firm: Global Independent Regulatory Auditors LLC
Target Period: Q2 FY 2025-2026

Audit Opinion: UNQUALIFIED (CLEAN)
No material misstatements detected in financial ledgers.`
    },
    {
      name: 'Dec_2025_YearEnd_Bonus_Disbursement.csv',
      path: '/Payroll/2025/Dec_2025_YearEnd_Bonus_Disbursement.csv',
      folderPath: '/Payroll/2025',
      size: 420000,
      modDate: '2025-12-18T17:00:00Z',
      sha: 'b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1',
      text: `Employee Name, Department, Years Service, Performance Rating, Bonus Amount ($)
Sarah Jenkins, Executive, 8, Exceeds Expectations, 15000
Marcus Vance, IT Infrastructure, 5, Exceeds Expectations, 9500
Elena Rostova, Finance, 6, Exceeds Expectations, 11000
David Chen, Operations, 3, Meets Expectations, 6000`
    },
    {
      name: 'Dec_2025_YearEnd_Bonus_Disbursement_COPY.csv', // EXACT DUPLICATE FOR DEMO
      path: '/Backup/2025/Dec_2025_YearEnd_Bonus_Disbursement_COPY.csv',
      folderPath: '/Backup/2025',
      size: 420000,
      modDate: '2025-12-18T17:00:00Z',
      sha: 'b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1',
      text: `Employee Name, Department, Years Service, Performance Rating, Bonus Amount ($)
Sarah Jenkins, Executive, 8, Exceeds Expectations, 15000
Marcus Vance, IT Infrastructure, 5, Exceeds Expectations, 9500
Elena Rostova, Finance, 6, Exceeds Expectations, 11000
David Chen, Operations, 3, Meets Expectations, 6000`
    },

    // Q3 Files (January, February, March)
    {
      name: '2026-01-15_Q3_Strategic_Roadmap.pptx',
      path: '/Strategy/2026/2026-01-15_Q3_Strategic_Roadmap.pptx',
      folderPath: '/Strategy/2026',
      size: 8400000,
      modDate: '2026-01-15T11:00:00Z',
      sha: 'c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2',
      text: `SLIDE 1: Q3 STRATEGIC INITIATIVES (JANUARY 2026)
SLIDE 2: USB Infrastructure Modernization & Automated Document Sorting
SLIDE 3: Security & Encryption Guidelines`
    },
    {
      name: 'February_2026_Operating_Budget.xlsx',
      path: '/Finance/2026/February_2026_Operating_Budget.xlsx',
      folderPath: '/Finance/2026',
      size: 3100000,
      modDate: '2026-02-10T09:30:00Z',
      sha: 'd4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3',
      text: `Budget Category, Allocated ($), Spent ($), Variance ($), Status
Personnel Salaries, 450000, 442000, +8000, On Track
Software Licenses, 85000, 81200, +3800, On Track
Hardware Maintenance, 35000, 39500, -4500, Over Budget
Travel & Conferences, 20000, 14200, +5800, Under Budget`
    },
    {
      name: '2026-03-28_Annual_Audit_Report_Draft.pdf',
      path: '/Audit/2026/2026-03-28_Annual_Audit_Report_Draft.pdf',
      folderPath: '/Audit/2026',
      size: 7890000,
      modDate: '2026-03-28T15:10:00Z',
      sha: 'e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4',
      text: `PRELIMINARY ANNUAL AUDIT DRAFT REPORT
Fiscal Quarter: Q3 FY 2025-2026
Prepared for Internal Controls Board
Status: Under Review`
    },

    // Q4 Files (April, May, June)
    {
      name: 'April_2026_Fiscal_Closing_Checklist.pdf',
      path: '/Finance/2026/April_2026_Fiscal_Closing_Checklist.pdf',
      folderPath: '/Finance/2026',
      size: 1950000,
      modDate: '2026-04-05T08:15:00Z',
      sha: 'f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5',
      text: `FISCAL YEAR CLOSING CHECKLIST (APRIL 2026)
1. Reconcile all bank statements for April.
2. Finalize Q4 asset depreciation schedules.
3. Verify USB drive archive integrity.`
    },
    {
      name: 'May_2026_System_Security_Audit_Log.txt',
      path: '/Security/2026/May_2026_System_Security_Audit_Log.txt',
      folderPath: '/Security/2026',
      size: 890000,
      modDate: '2026-05-19T14:22:00Z',
      sha: '0718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6',
      text: `2026-05-19 14:20:01 [SEC-INFO] USB Scanner Daemon initialized.
2026-05-19 14:20:05 [SEC-OK] Device /dev/sdb1 verified: GOVT_FINANCE_USB_32GB
2026-05-19 14:20:10 [SEC-HASH] SHA256 integrity check passed. Zero malware signatures found.
2026-05-19 14:22:00 [SEC-AUDIT] Indexing completed for 248 objects.`
    },
    {
      name: 'June_2026_Final_Annual_Financial_Statement.pdf',
      path: '/Finance/2026/June_2026_Final_Annual_Financial_Statement.pdf',
      folderPath: '/Finance/2026',
      size: 12400000,
      modDate: '2026-06-30T18:00:00Z',
      sha: '18293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f607',
      text: `FINAL ANNUAL FINANCIAL STATEMENT - FY 2025-2026
Period Ending: June 30, 2026
Gross Revenue: $58,920,000 USD
Net Surplus: $18,450,000 USD
Unqualified Audit Certificate Attached.`
    }
  ];

  // Synthesize realistic bulk items to populate 248 total files across subfolders
  const simulatedExts = ['pdf', 'xlsx', 'docx', 'jpg', 'png', 'zip', 'csv', 'pptx', 'mp4', 'mp3', 'exe'];
  const monthsData = [
    { name: 'July', q: 'Q1', m: 7, year: 2025 },
    { name: 'August', q: 'Q1', m: 8, year: 2025 },
    { name: 'September', q: 'Q1', m: 9, year: 2025 },
    { name: 'October', q: 'Q2', m: 10, year: 2025 },
    { name: 'November', q: 'Q2', m: 11, year: 2025 },
    { name: 'December', q: 'Q2', m: 12, year: 2025 },
    { name: 'January', q: 'Q3', m: 1, year: 2026 },
    { name: 'February', q: 'Q3', m: 2, year: 2026 },
    { name: 'March', q: 'Q3', m: 3, year: 2026 },
    { name: 'April', q: 'Q4', m: 4, year: 2026 },
    { name: 'May', q: 'Q4', m: 5, year: 2026 },
    { name: 'June', q: 'Q4', m: 6, year: 2026 },
  ];

  const folders = ['/Finance', '/Payroll', '/Taxation', '/Audit', '/Procurement', '/Media/Photos', '/Invoices', '/Backup'];
  const results: ScannedFile[] = [];

  // Add key template files
  for (const t of fileTemplates) {
    const ext = t.name.split('.').pop() || 'txt';
    const mod = new Date(t.modDate);
    const cat = getFileCategory(ext);
    const classification = classifyFileQuarter(t.name, t.folderPath, mod, mod);

    results.push({
      id: t.sha.slice(0, 16),
      name: t.name,
      path: t.path,
      relativePath: t.path.slice(1),
      folderPath: t.folderPath,
      extension: ext,
      size: t.size,
      category: cat,
      createdDate: mod,
      modifiedDate: mod,
      sha256: t.sha,
      classification,
      textContent: t.text || `Content preview for ${t.name}`,
      metadata: {
        title: t.name.replace(/\.[^/.]+$/, ''),
        author: 'Govt Auditor',
        createdDate: t.modDate,
        modifiedDate: t.modDate,
        mimeType: ext === 'pdf' ? 'application/pdf' : ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/plain'
      }
    });
  }

  // Generate remaining bulk files for full 248 count across all months
  let count = results.length;
  let idx = 0;
  while (count < 248) {
    const mInfo = monthsData[idx % monthsData.length];
    const folder = folders[idx % folders.length];
    const ext = simulatedExts[idx % simulatedExts.length];
    const day = (idx % 27) + 1;
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `${mInfo.year}-${mInfo.m < 10 ? '0' + mInfo.m : mInfo.m}-${dayStr}`;
    const fName = `${mInfo.name}_${mInfo.year}_Doc_${count + 1}.${ext}`;
    const fPath = `${folder}/${mInfo.year}/${fName}`;
    const fFolder = `${folder}/${mInfo.year}`;
    const modDate = new Date(`${dateStr}T12:00:00Z`);
    const size = 150000 + ((count * 398211) % 15000000);
    const sha = `hash_${count}_${mInfo.name}_${mInfo.year}_${ext}`.padEnd(64, '0');

    const cat = getFileCategory(ext);
    const classification = classifyFileQuarter(fName, fFolder, modDate, modDate);

    results.push({
      id: `sim_${count}`,
      name: fName,
      path: fPath,
      relativePath: fPath.slice(1),
      folderPath: fFolder,
      extension: ext,
      size,
      category: cat,
      createdDate: modDate,
      modifiedDate: modDate,
      sha256: sha,
      classification,
      textContent: `Generated sample file document content for ${fName}.\nQuarter: ${classification.quarter} (${classification.month})\nFinancial Year: ${classification.financialYear}`,
      metadata: {
        title: fName,
        author: 'QuarterSort System',
        createdDate: modDate.toISOString(),
        modifiedDate: modDate.toISOString()
      }
    });

    count++;
    idx++;
  }

  // Detect duplicates
  const hashMap = new Map<string, ScannedFile[]>();
  for (const f of results) {
    if (!hashMap.has(f.sha256)) hashMap.set(f.sha256, []);
    hashMap.get(f.sha256)!.push(f);
  }

  for (const [hash, group] of hashMap.entries()) {
    if (group.length > 1) {
      for (const f of group) {
        f.isDuplicate = true;
        f.duplicateGroupHash = hash;
      }
    }
  }

  return results;
}

export const SAMPLE_FILES = createSampleFiles();
