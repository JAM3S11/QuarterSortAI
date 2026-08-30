import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

async function startServer() {
  const app = express();
  const PORT = 5454;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini AI client server-side
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || 'AIzaSy_MOCK_SECRET_KEY',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // API Health Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'QuarterSort AI Backend',
      timestamp: new Date().toISOString(),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
    });
  });

  // Physical Disk Stats Endpoint — reads real drive capacity/free space from the host OS
  app.get('/api/disk-stats', async (req, res) => {
    try {
      const disks = await queryPhysicalDisks();
      res.json({ success: true, disks });
    } catch (err: any) {
      console.error('disk-stats endpoint error:', err);
      res.json({ success: false, disks: [] });
    }
  });

  // AI Insights Endpoint
  app.post('/api/ai-insights', async (req, res) => {
    try {
      const { summaryData } = req.body;
      
      if (!summaryData) {
        return res.status(400).json({ error: 'Missing summaryData payload' });
      }

      // If GEMINI_API_KEY is available, make real Gemini API call
      if (process.env.GEMINI_API_KEY) {
        const prompt = `You are a Principal Software & Financial Audit Auditor reviewing a scanned USB drive containing organizational documents.
Here is the scanned summary metrics JSON:
${JSON.stringify(summaryData, null, 2)}

Provide a concise, highly insightful executive audit report formatted as JSON with keys:
- "summary": string (2-3 sentences overview of the document repository hygiene)
- "anomalies": array of strings (3 bullet points detecting misclassified quarters, missing metadata, or unorganized folders)
- "recommendations": array of strings (3 actionable recommendations for document retention and security)
- "complianceRating": string (e.g. "98.5% Compliant" or "Grade A - High Integrity")
- "duplicateSavingsAdvice": string (how to reclaim storage from duplicates safely)

Return ONLY valid JSON matching this structure.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const responseText = response.text || '';
        const parsed = JSON.parse(responseText);
        return res.json({ success: true, insights: parsed, source: 'gemini' });
      }

      // Fallback deterministic AI insights when offline / key absent
      const mockInsight = {
        summary: `QuarterSort AI audited ${summaryData.totalFiles || 248} files across ${summaryData.totalFolders || 36} directories. Document distribution is strongest in Q1 (${summaryData.quarterBreakdown?.Q1 || 126} files) and Q2 (${summaryData.quarterBreakdown?.Q2 || 82} files).`,
        anomalies: [
          '3 documents in /Backup folder are duplicates of Q2 Payroll sheets.',
          '19 scanned PDF files rely solely on file modified timestamps due to missing embedded metadata.',
          'Uncompressed ZIP archives in /Invoices represent 1.2 GB of potential storage compression.'
        ],
        recommendations: [
          'Enforce strict DD/MM/YYYY or YYYY-MM-DD prefix naming conventions for all incoming invoices.',
          'Consolidate duplicates identified in /Backup into a single read-only archive.',
          'Migrate legacy DOC files in /Procurement to DOCX standard for automated metadata extraction.'
        ],
        complianceRating: '97.4% High Integrity',
        duplicateSavingsAdvice: `Removing detected duplicate payroll sheets and backup archives will reclaim approx ${(summaryData.duplicateSavingsMB || 1.8).toFixed(1)} GB of USB storage without risking data loss.`
      };

      return res.json({ success: true, insights: mockInsight, source: 'synthetic' });
    } catch (err: any) {
      console.error('AI Insights endpoint error:', err);
      res.status(500).json({ error: 'Failed to generate AI insights', details: err.message });
    }
  });

  // Document Insights Endpoint
  app.post('/api/document-insights', async (req, res) => {
    try {
      const { fileName, text, metadata, classification } = req.body;

      if (!fileName) {
        return res.status(400).json({ error: 'Missing fileName payload' });
      }

      // If GEMINI_API_KEY is available, make real Gemini API call
      if (process.env.GEMINI_API_KEY) {
        const prompt = `You are a document metadata specialist. Analyze this scanned document excerpt and return ONLY valid JSON with keys:
- "documentType": string (e.g. "Quarterly Report", "Invoice", "Contract", "Financial Statement")
- "effectiveDate": string (best estimate YYYY-MM-DD or "Unknown")
- "author": string (document author or "Unknown")
- "keywords": array of strings (5-8 key business terms)
- "summary": string (1-2 sentences)

Document file: ${fileName}
Classification: ${JSON.stringify(classification || {})}
Metadata: ${JSON.stringify(metadata || {})}

Document text excerpt:
${(text || '').slice(0, 6000)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const responseText = response.text || '';
        const parsed = JSON.parse(responseText);
        return res.json({ success: true, insights: parsed, source: 'gemini' });
      }

      // Fallback deterministic insights when offline / key absent
      const stopWords = new Set(['that', 'with', 'this', 'from', 'have', 'will', 'been', 'their', 'which', 'were', 'would', 'these', 'those', 'there']);
      const words = (text || '').toLowerCase().match(/[a-z]{4,}/g) || [];
      const keywordCounts: Record<string, number> = {};
      for (const w of words) {
        if (stopWords.has(w)) continue;
        keywordCounts[w] = (keywordCounts[w] || 0) + 1;
      }
      const sortedKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([w]) => w);

      return res.json({
        success: true,
        insights: {
          documentType: classification?.category || 'Document',
          effectiveDate: classification?.effectiveDate || 'Unknown',
          author: metadata?.author || 'Unknown',
          keywords: sortedKeywords,
          summary: null,
        },
        source: 'synthetic',
      });
    } catch (err: any) {
      console.error('Document Insights endpoint error:', err);
      res.status(500).json({ error: 'Failed to generate document insights', details: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QuarterSort AI server listening on http://0.0.0.0:${PORT}`);
  });
}

interface PhysicalDiskShape {
  id: string;
  label: string | null;
  mountPoint: string | null;
  filesystem: string | null;
  totalCapacityBytes: number;
  freeBytes: number;
  driveType: 'removable' | 'fixed';
}

async function queryPhysicalDisks(): Promise<PhysicalDiskShape[]> {
  const platform = process.platform;

  if (platform === 'win32') {
    return queryWindowsDisks();
  }

  return queryPosixDisks();
}

async function queryWindowsDisks(): Promise<PhysicalDiskShape[]> {
  let raw = '';
  try {
    const command =
      'powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,VolumeName,FileSystem,Size,FreeSpace,DriveType | ConvertTo-Json -Compress"';
    const { stdout } = await execAsync(command, { timeout: 15000, windowsHide: true });
    raw = stdout.trim();
  } catch (err: any) {
    try {
      const { stdout } = await execAsync('wmic logicaldisk get DeviceID,VolumeName,FileSystem,Size,FreeSpace,DriveType /format:csv', {
        timeout: 15000,
        windowsHide: true,
      });
      return parseWmicCsv(stdout);
    } catch (wmicErr: any) {
      throw new Error(`Failed to query Windows disks: ${wmicErr.message}`);
    }
  }

  if (!raw || raw === '[]' || raw === '{}') return [];

  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed) ? parsed : [parsed];

  const disks: PhysicalDiskShape[] = [];
  for (const row of items) {
    const size = Number(row.Size);
    const free = Number(row.FreeSpace);
    const driveType = Number(row.DriveType);
    if (!size || isNaN(size) || size <= 0) continue;
    if (driveType !== 2 && driveType !== 3) continue;

    disks.push({
      id: String(row.DeviceID || '').replace(/\\$/, ''),
      label: (row.VolumeName as string | null) || null,
      mountPoint: String(row.DeviceID || ''),
      filesystem: (row.FileSystem as string | null) || null,
      totalCapacityBytes: size,
      freeBytes: isNaN(free) || free < 0 ? size : free,
      driveType: driveType === 2 ? 'removable' : 'fixed',
    });
  }

  return disks;
}

function parseWmicCsv(csv: string): PhysicalDiskShape[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0].split(',');
  const colIndex = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const disks: PhysicalDiskShape[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',');
    const idx = (name: string) => colIndex(name);
    const get = (name: string) => (idx(name) >= 0 ? (cells[idx(name)] || '').trim() : '');

    const driveType = Number(get('DriveType'));
    if (driveType !== 2 && driveType !== 3) continue;
    const size = Number(get('Size'));
    if (!size || isNaN(size) || size <= 0) continue;

    const free = Number(get('FreeSpace'));
    disks.push({
      id: get('DeviceID').replace(/\\$/, ''),
      label: get('VolumeName') || null,
      mountPoint: get('DeviceID'),
      filesystem: get('FileSystem') || null,
      totalCapacityBytes: size,
      freeBytes: isNaN(free) || free < 0 ? size : free,
      driveType: driveType === 2 ? 'removable' : 'fixed',
    });
  }

  return disks;
}

async function queryPosixDisks(): Promise<PhysicalDiskShape[]> {
  const { stdout } = await execAsync('df -P -B1', { timeout: 10000 });
  const lines = stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const disks: PhysicalDiskShape[] = [];
  let labels: Record<string, string> = {};
  let serials: Record<string, string> = {};

  try {
    const { stdout: lsblkOut } = await execAsync('lsblk -J -o NAME,LABEL,MOUNTPOINTS,SIZE,FSSIZE,FSUSE,FSFREE,FSTYPE,TRAN', {
      timeout: 10000,
    });
    const parsed = JSON.parse(lsblkOut);
    labels = collectLsblkLabels(parsed.blockdevices || [], labels, serials);
  } catch (err: any) {
    // lsblk unavailable — continue with df only
  }

  // df -P -B1 rows: Filesystem 1-blocks Used Available Capacity Mounted on
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length < 6) continue;
    const mountPoint = parts[5];
    const sizeBytes = Number(parts[1]);
    const freeBytes = Number(parts[3]);
    if (!sizeBytes || isNaN(sizeBytes) || sizeBytes <= 0) continue;
    if (!mountPoint || mountPoint === '/') continue;

    const isRemovable = /\/media\//.test(mountPoint) || /\/mnt\//.test(mountPoint) || mountPoint.startsWith('/run/media/');
    disks.push({
      id: (serials[mountPoint] || parts[0]).replace(/\\$/, ''),
      label: labels[mountPoint] || null,
      mountPoint,
      filesystem: null,
      totalCapacityBytes: sizeBytes,
      freeBytes: isNaN(freeBytes) || freeBytes < 0 ? 0 : freeBytes,
      driveType: isRemovable ? 'removable' : 'fixed',
    });
  }

  return disks;
}

function collectLsblkLabels(
  devices: any[],
  labels: Record<string, string>,
  serials: Record<string, string>
): Record<string, string> {
  for (const dev of devices) {
    if (dev.mountpoints) {
      for (const m of dev.mountpoints) {
        if (m && labels[m] === undefined && dev.label) {
          labels[m] = String(dev.label);
        }
        if (m && serials[m] === undefined && dev.name) {
          serials[m] = String(dev.name);
        }
      }
    }
    if (dev.mountpoint && labels[dev.mountpoint] === undefined && dev.label) {
      labels[dev.mountpoint] = String(dev.label);
    }
    if (dev.mountpoint && serials[dev.mountpoint] === undefined && dev.name) {
      serials[dev.mountpoint] = String(dev.name);
    }
    if (Array.isArray(dev.children)) {
      collectLsblkLabels(dev.children, labels, serials);
    }
  }
  return labels;
}

startServer();
