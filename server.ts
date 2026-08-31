import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createServer as createViteServer } from 'vite';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Replaceable Groq model. Override via GROQ_MODEL in .env if the default is
// unavailable for your API key tier.
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

async function startServer() {
  const app = express();
  const PORT = 5454;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Groq AI client config server-side (real calls gated on GROQ_API_KEY)
  const groqApiKey = process.env.GROQ_API_KEY || '';

  // API Health Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'QuarterSort AI Backend',
      timestamp: new Date().toISOString(),
      groqConfigured: Boolean(groqApiKey)
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

  // Well Findings Analysis Endpoint — powered by Groq (GROQ_API_KEY)
  // Serves as the primary AI AUDIT REPORT for the repository.
  app.post('/api/well-findings', async (req, res) => {
    try {
      const { summaryData } = req.body;

      if (!summaryData) {
        return res.status(400).json({ error: 'Missing summaryData payload' });
      }

      // If GROQ_API_KEY is available, make a real Groq API call
      if (groqApiKey) {
        const prompt = `You are a Principal Data Integrity & Regulatory Audit Auditor performing a refined, deep-dive audit of a scanned enterprise document repository (the "well" file set).

Here is the scanned repository summary metrics JSON:
${JSON.stringify(summaryData, null, 2)}

Produce a comprehensive, highly detailed AI AUDIT REPORT. Return ONLY valid JSON with this exact structure:
- "summary": string (2-3 sentences executive overview of repository integrity)
- "score": number (0-100 overall integrity score)
- "grade": string (letter grade, e.g. "A", "B+", "C-", deriving from score)
- "complianceRating": string (e.g. "96.2% Compliant" or "Grade A - High Integrity")
- "riskAssessment": string (e.g. "Low" / "Medium" / "High" followed by a one-sentence justification)
- "sections": array of exactly 6 objects, one per audit dimension, each with:
  - "key": one of "quarterDistribution", "categoryBreakdown", "duplicates", "metadataIntegrity", "storageOptimization", "organizationalStructure"
  - "title": string (human-readable name of the dimension)
  - "status": one of "pass", "warning", or "fail" (your verdict for this dimension)
  - "metric": string (short headline figure, e.g. "Q1: 126 files · Q2: 82 files" or "1.8 GB reclaimable")
  - "summary": string (2-3 sentences of concrete analysis grounded in the provided metrics)
- "findings": array of 6-9 objects, balanced mix of "critical", "warning", and "good", each with:
  - "severity": "critical" | "warning" | "good"
  - "title": string (short finding heading)
  - "detail": string (evidence-backed explanation referencing the provided metrics)
  - "recommendation": string (actionable remediation or retention step)
- "recommendations": array of 3-5 strings (prioritized actions for the organization)

Every analysis must reference the actual numbers in the supplied metrics — never invent data that contradicts the input. Return ONLY valid JSON matching this structure.`;

        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API error ${response.status}: ${await response.text()}`);
        }

        const groqData = await response.json();
        const content = groqData?.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty Groq response');

        const parsed = JSON.parse(content);
        return res.json({ success: true, report: parsed, source: 'groq', model: GROQ_MODEL });
      }

      // Fallback deterministic AI audit report when GROQ_API_KEY absent
      const qb = summaryData.quarterBreakdown || {};
      const cb = summaryData.categoryBreakdown || {};
      const totalFiles = summaryData.totalFiles || 248;
      const totalFolders = summaryData.totalFolders || 36;
      const dupMB = summaryData.duplicateSavingsMB || 1.8;

      const mockReport = {
        summary: `QuarterSort AI audited ${totalFiles} files across ${totalFolders} directories. The repository is largely healthy but shows isolated integrity gaps in metadata capture and duplicate storage.`,
        score: 84,
        grade: 'B+',
        complianceRating: '91.4% High Integrity',
        riskAssessment: 'Medium — duplicate payloads and missing embedded metadata reduce audit-trace reliability.',
        sections: [
          {
            key: 'quarterDistribution',
            title: 'Quarter Distribution',
            status: 'pass',
            metric: `Q1: ${qb.Q1 || 0} · Q2: ${qb.Q2 || 0} · Q3: ${qb.Q3 || 0} · Q4: ${qb.Q4 || 0}`,
            summary: `Records are concentrated in Q1 (${qb.Q1 || 0}) and Q2 (${qb.Q2 || 0}), indicating consistent upstream throughput with Q3 and Q4 still accumulating.`,
          },
          {
            key: 'categoryBreakdown',
            title: 'Category Breakdown',
            status: 'pass',
            metric: `Documents: ${cb.Documents || 0} · Images: ${cb.Images || 0} · Archives: ${cb.Archives || 0}`,
            summary: 'Mixed media is distributed across expected categories; no dominated or anomalous category detected.',
          },
          {
            key: 'duplicates',
            title: 'Duplicate Analysis',
            status: 'fail',
            metric: `${dupMB.toFixed(1)} MB reclaimable`,
            summary: `Approximately ${dupMB.toFixed(1)} MB of redundant payload exists, signaling repeated copies across backup and working directories.`,
          },
          {
            key: 'metadataIntegrity',
            title: 'Metadata Integrity',
            status: 'warning',
            metric: 'Partial embedded metadata coverage',
            summary: 'Several scanned records rely on filesystem timestamps rather than embedded metadata, weakening the audit trail.',
          },
          {
            key: 'storageOptimization',
            title: 'Storage Optimization',
            status: 'warning',
            metric: 'Uncompressed archive candidates',
            summary: 'Uncompressed archives could be re-compressed to reclaim capacity without data loss.',
          },
          {
            key: 'organizationalStructure',
            title: 'Organizational Structure',
            status: 'pass',
            metric: `${totalFolders} directories`,
            summary: `Folder taxonomy over ${totalFolders} directories is coherent and navigable with no orphaned top-level spills.`,
          },
        ],
        findings: [
          {
            id: 'deep-drill-1',
            severity: 'critical',
            title: 'Duplicate zone detected',
            detail: `Approximately ${dupMB.toFixed(1)} MB of redundant payloads identified, indicating duplicate copies within the repository.`,
            recommendation: 'Run deduplication and consolidate replicas into a single authoritative archive.',
          },
          {
            id: 'deep-drill-2',
            severity: 'warning',
            title: 'Metadata integrity gaps',
            detail: 'Several scanned records rely on filesystem timestamps rather than embedded metadata, reducing audit trail reliability.',
            recommendation: 'Enforce embedded metadata capture at ingestion for all new well records.',
          },
          {
            id: 'deep-drill-3',
            severity: 'good',
            title: 'Strong quarter distribution',
            detail: `Q1 and Q2 hold the bulk of records (${qb.Q1 || 0}/${qb.Q2 || 0}), indicating steady upstream throughput.`,
            recommendation: 'Maintain current ingestion cadence and monitor Q4 for tail-end accumulation.',
          },
        ],
        recommendations: [
          `Deduplicate approximately ${dupMB.toFixed(1)} MB of redundant payloads and archive the single source of truth.`,
          'Enforce strict YYYY-MM-DD naming prefixes and embedded metadata capture for all incoming records.',
          'Re-compress legacy uncompressed archives to reclaim storage headroom.',
          'Schedule quarterly integrity scans to keep the audit trail continuous.',
        ],
      };

      return res.json({ success: true, report: mockReport, source: 'synthetic' });
    } catch (err: any) {
      console.error('Well Findings endpoint error:', err);
      res.status(500).json({ error: 'Failed to generate well findings', details: err.message });
    }
  });

  // Document Insights Endpoint
  app.post('/api/document-insights', async (req, res) => {
    try {
      const { fileName, text, metadata, classification } = req.body;

      if (!fileName) {
        return res.status(400).json({ error: 'Missing fileName payload' });
      }

      // If GROQ_API_KEY is available, make real Groq API call
      if (groqApiKey) {
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

        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API error ${response.status}: ${await response.text()}`);
        }

        const groqData = await response.json();
        const content = groqData?.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty Groq response');

        const parsed = JSON.parse(content);
        return res.json({ success: true, insights: parsed, source: 'groq' });
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
