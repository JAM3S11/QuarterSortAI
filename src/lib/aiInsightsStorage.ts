import type { WellFindingsReport } from '../types';

const STORAGE_KEY = 'quartersort.lastAIAuditReport';

// Persist the most recent AI audit report so it survives navigation and page
// reloads. Cleared only when a new USB scan round begins.
export function saveLastAIAuditReport(report: WellFindingsReport | null): void {
  try {
    if (!report) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
  } catch (err) {
    console.warn('Unable to persist AI audit report to localStorage:', err);
  }
}

export function loadLastAIAuditReport(): WellFindingsReport | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sections) || !Array.isArray(parsed.findings)) {
      return null;
    }
    return parsed as WellFindingsReport;
  } catch (err) {
    console.warn('Unable to read cached AI audit report from localStorage:', err);
    return null;
  }
}

export function clearLastAIAuditReport(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Unable to clear cached AI audit report from localStorage:', err);
  }
}
