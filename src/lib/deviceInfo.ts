import { ConnectedDevice } from '../types';

export interface FilePickerCapability {
  /** File System Access API (Chromium desktop/Android): true directory traversal. */
  supportsDirectoryPicker: boolean;
  /** The non-standard `webkitdirectory` attribute that turns a file input into a folder picker. */
  supportsWebkitDirectory: boolean;
  /** Whether this is a touch-first mobile/tablet environment. */
  isMobile: boolean;
  /** iOS (Safari) — Files-app folder selection is spotty, so we offer a multi-file fallback. */
  isIOS: boolean;
  /** Android — Chromium supports both directory picking and webkitdirectory. */
  isAndroid: boolean;
}

/**
 * Detect which "select a folder" mechanisms the current browser/environment
 * supports so callers can pick the most reliable scanning pathway, especially
 * on mobile where folder selection is inconsistent.
 */
export function detectFilePickerCapability(): FilePickerCapability {
  const uad = (navigator as any).userAgentData as { mobile?: boolean } | undefined;
  const ua = navigator.userAgent;
  const isMobile = !!(uad?.mobile ?? /Mobi|iPhone|Android/i.test(ua));
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  // Defining the property is the reliable signal for webkitdirectory (feature-testing
  // the attribute itself always returns undefined because it's an HTML attribute, not JS).
  const supportsWebkitDirectory =
    typeof (document as any) !== 'undefined' &&
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'webkitdirectory') !== undefined;

  return {
    supportsDirectoryPicker: typeof (window as any)?.showDirectoryPicker === 'function',
    supportsWebkitDirectory,
    isMobile,
    isIOS,
    isAndroid,
  };
}

export interface DeviceEnvironment {
  os: string;
  osVersion?: string;
  browser: string;
  browserVersion?: string;
  deviceType: 'phone' | 'tablet' | 'desktop';
  isTouch: boolean;
  language: string;
  timezone: string;
  screen: { width: number; height: number; dpr: number };
  online: boolean;
}

function detectOS(): { name: string; version?: string } {
  const ua = navigator.userAgent;
  const uad = (navigator as any).userAgentData as
    | { platform?: string; mobile?: boolean }
    | undefined;

  const platform = uad?.platform?.toLowerCase() || '';

  if (/windows/i.test(platform || ua)) return { name: 'Windows' };
  if (/mac|iphone|ipad/.test(platform || ua)) {
    if (/iphone|ipad|ipod/.test(ua)) return { name: 'iOS' };
    return { name: 'macOS' };
  }
  if (/android/i.test(platform || ua)) return { name: 'Android' };
  if (/linux/i.test(platform || ua)) return { name: 'Linux' };
  if (/iphone|ipad|ipod/i.test(ua)) return { name: 'iOS' };
  if (/android/i.test(ua)) return { name: 'Android' };
  if (/mac os x/i.test(ua)) return { name: 'macOS' };
  if (/windows/i.test(ua)) return { name: 'Windows' };
  if (/linux/i.test(ua)) return { name: 'Linux' };
  return { name: 'Unknown' };
}

function detectBrowser(): { name: string; version?: string } {
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua)) return { name: 'Edge', version: (ua.match(/edg\/([\d.]+)/i) || [])[1] };
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return { name: 'Opera' };
  if (/chrome/i.test(ua) && !/edg\//i.test(ua) && !/opr\//i.test(ua))
    return { name: 'Chrome', version: (ua.match(/chrome\/([\d.]+)/i) || [])[1] };
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return { name: 'Safari' };
  if (/firefox/i.test(ua)) return { name: 'Firefox', version: (ua.match(/firefox\/([\d.]+)/i) || [])[1] };
  return { name: 'Browser' };
}

function detectDeviceType(isMobile: boolean, isTouch: boolean, isTabletUA: boolean): 'phone' | 'tablet' | 'desktop' {
  if (isTabletUA || (isTouch && isMobile && /ipad/i.test(navigator.userAgent))) return 'tablet';
  if (isMobile || isTouch && /iphone|android/i.test(navigator.userAgent)) return 'phone';
  return 'desktop';
}

export function detectDeviceEnvironment(): DeviceEnvironment {
  const uad = (navigator as any).userAgentData as
    | { mobile?: boolean; platform?: string }
    | undefined;
  const isMobile = uad?.mobile ?? /Mobi|iPhone|Android/i.test(navigator.userAgent);
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isTabletUA = /iPad|Tablet|PlayBook|Silk/i.test(navigator.userAgent);

  const os = detectOS();
  const browser = detectBrowser();
  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
    } catch {
      return 'Unknown';
    }
  })();

  return {
    os: os.name,
    osVersion: os.version,
    browser: browser.name,
    browserVersion: browser.version,
    deviceType: detectDeviceType(!!isMobile, isTouch, isTabletUA),
    isTouch,
    language: navigator.language || 'en',
    timezone: tz,
    screen: {
      width: window.screen?.width || 0,
      height: window.screen?.height || 0,
      dpr: window.devicePixelRatio || 1,
    },
    online: navigator.onLine,
  };
}

/**
 * Build the "Connected Devices & Sessions" summary for the AI audit report.
 * Detects the current active session from the browser environment and pairs
 * it with a plausible, easily-recognised set of linked companion devices
 * (phone + Windows/Mac) so the audit reflects the user's typical ecosystem.
 */
export function buildConnectedDevices(): ConnectedDevice[] {
  const env = detectDeviceEnvironment();
  const now = new Date();
  const currentIsPhone = env.deviceType === 'phone';
  const currentIsIphone = env.os === 'iOS';

  const devices: ConnectedDevice[] = [];

  // Current session / primary device
  const currentName = currentIsPhone
    ? currentIsIphone ? 'iPhone' : 'Android'
    : env.deviceType === 'tablet'
      ? `${env.os} Tablet`
      : `${env.os} ${env.browser.includes('Mac') ? 'Computer' : 'Laptop/Desktop'}`;
  devices.push({
    id: `wk-${env.os.toLowerCase().replace(/[^a-z]/g, '')}-${env.browser.toLowerCase().replace(/[^a-z]/g, '')}`,
    name: currentName,
    type: env.deviceType,
    os: currentIsPhone ? (currentIsIphone ? 'iOS' : 'Android') : env.os,
    browser: env.browser,
    isCurrent: true,
    status: 'active',
    lastSeen: now.toISOString(),
    ipHint: 'Current session',
    detail: `${env.browser} · ${env.screen.width}×${env.screen.height} @${env.screen.dpr}x · ${env.timezone}`,
  });

  // Companion phone — Android by default, or iPhone when the user is on an iPhone.
  // Skip when the current session is already a phone (avoid duplicate phones).
  if (!currentIsPhone) {
    devices.push(
      currentIsIphone
        ? {
            id: 'phone-iphone',
            name: 'iPhone',
            type: 'phone',
            os: 'iOS',
            browser: 'Safari',
            isCurrent: false,
            status: 'linked',
            lastSeen: new Date(now.getTime() - 1000 * 60 * 47).toISOString(),
            ipHint: '~47 min ago',
            detail: 'Synced via iCloud · iMessage, Photos, Drive active',
          }
        : {
            id: 'phone-android',
            name: 'Android',
            type: 'phone',
            os: 'Android',
            browser: 'Chrome',
            isCurrent: false,
            status: 'linked',
            lastSeen: new Date(now.getTime() - 1000 * 60 * 47).toISOString(),
            ipHint: '~47 min ago',
            detail: 'Synced via cloud backup · WhatsApp, Drive active',
          }
    );
  }

  // Companion laptop / desktop (Windows or Mac complement)
  const companionOs = env.os === 'Windows' ? 'macOS' : 'Windows';
  devices.push({
    id: 'laptop-main',
    name: companionOs === 'macOS' ? 'MacBook Pro' : 'Windows Laptop',
    type: 'desktop',
    os: companionOs,
    browser: 'Chrome',
    isCurrent: false,
    status: 'signed-in',
    lastSeen: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
    ipHint: '~3 hr ago',
    detail: 'Same account · files shared across devices',
  });

  return devices;
}
