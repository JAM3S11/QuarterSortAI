import React from 'react';
import { AnimatePresence, motion, MotionConfig, useInView, useReducedMotion, useSpring } from 'motion/react';
import { UilSorting } from '@iconscout/react-unicons';
import { ArrowRight, ArrowUp, Plus, HardDrive, Laptop, Database } from 'lucide-react';

interface LandingPageProps {
  onConnectUSB: () => void;
}

/* --------------------------------------------------------------------------
   Editorial palette (warm paper + oxblood ink)
     paper  #faf9f7   ink    #542b2b   body  #705957
     rule   #d8ceca   curve  #9d8580   ring  #805d59
   -------------------------------------------------------------------------- */

const EASE = [0.22, 1, 0.36, 1] as const;

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};
const inView = { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '-80px' } } as const;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#542b2b] focus-visible:ring-offset-4 focus-visible:ring-offset-[#faf9f7]';

/* --------------------------------------------------------------------------
   Content
   -------------------------------------------------------------------------- */

const NAV_LEFT = [
  { href: '#get-started', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#privacy', label: 'Privacy' },
];

const STEPS = [
  { number: '1', title: 'Connect a drive', description: 'Insert a USB drive and choose the folder. Access is read-only and limited to what you select.' },
  { number: '2', title: 'Index automatically', description: 'Every file is fingerprinted with SHA-256 and placed in a fiscal quarter from its metadata, name and dates.' },
  { number: '3', title: 'Review by quarter', description: 'Browse Q1–Q4, resolve duplicates and explore where your storage actually goes.' },
  { number: '4', title: 'Generate the audit', description: 'Produce a structured report with anomaly flags, a compliance score and clear next steps.' },
];

const FEATURES = [
  { title: 'Quarter classification', desc: 'Files are assigned to Q1–Q4 on a July–June fiscal year, with low-confidence items set aside for review.' },
  { title: 'SHA-256 integrity', desc: 'Each file carries a content fingerprint for reliable deduplication and a verifiable chain of custody.' },
  { title: 'Duplicate forensics', desc: 'Exact copies are grouped by hash, with their locations and the space you would reclaim.' },
  { title: 'Storage analytics', desc: 'Charts break volume down by quarter, category and folder — no spreadsheet export needed.' },
  { title: 'AI audit report', desc: 'A structured audit of every scan with anomaly flags, scoring and prioritised recommendations.' },
  { title: 'Document preview', desc: 'Open PDF, Word, Excel, PowerPoint and image files in place, without leaving the index.' },
];

const PRIVACY = [
  { title: 'Read-only', desc: 'Nothing on the source drive is moved, renamed or deleted.' },
  { title: 'Never uploaded', desc: 'Hashing and classification run in your browser; the index lives in IndexedDB.' },
  { title: 'AI on request', desc: 'AI features run only when invoked, sending just what that request needs.' },
  { title: 'Verifiable', desc: 'Every file carries a SHA-256 digest, so any report can be checked against the original media.' },
];

const DATA_PATH = [
  { icon: HardDrive, title: 'Your drive', meta: 'Opened read-only' },
  { icon: Laptop, title: 'Your browser', meta: 'Hash · classify · preview' },
  { icon: Database, title: 'Local index', meta: 'IndexedDB on this device' },
];

const FAQS = [
  {
    q: 'Are my files uploaded anywhere?',
    a: 'No. Scanning, hashing and classification happen in your browser and the index is stored locally. Only when you explicitly run an AI feature — an audit report or document insights — is the relevant summary or text sent for analysis.',
  },
  {
    q: 'How are files assigned to a quarter?',
    a: 'QuarterSort reads embedded metadata first, then filename conventions such as “Q3” or “2025-02”, then modification dates. Quarters follow a July–June fiscal year, and conflicting signals are flagged for review rather than guessed.',
  },
  {
    q: 'Which browsers are supported?',
    a: 'Chromium browsers (Chrome, Edge, Brave, Arc) give the best experience with native folder access. Other modern browsers fall back to a standard folder selector.',
  },
  {
    q: 'Can it change or delete files on my drive?',
    a: 'No. The drive is opened read-only. Duplicate detection shows you exact matches so you can decide what to clean up yourself.',
  },
  {
    q: 'Does it work with folders that aren’t on a USB drive?',
    a: 'Yes. Any local or mounted folder you can select in the file picker — external disks, SD cards or synced cloud folders — is scanned the same way.',
  },
];

/* --------------------------------------------------------------------------
   Primitives
   -------------------------------------------------------------------------- */

const Dot: React.FC = () => <span aria-hidden className="select-none text-[#9d8580]">•</span>;

const NavLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} className={`transition-opacity hover:opacity-60 ${focusRing}`}>
    {children}
  </a>
);

const Logo: React.FC<{ size?: 'md' | 'lg' }> = ({ size = 'lg' }) => (
  <a href="#top" className={`flex items-center gap-2.5 ${focusRing}`} aria-label="QuarterSort AI home">
    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#542b2b]">
      <UilSorting size={14} color="currentColor" />
    </span>
    <span className={`font-display font-normal tracking-tight ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}>
      quartersort
    </span>
  </a>
);

const CtaButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'solid' | 'outline';
  shape?: 'rounded' | 'square';
}> = ({
  onClick, children, variant = 'solid', shape = 'rounded',
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`group inline-flex h-12 items-center gap-3 px-7 text-sm transition-colors ${focusRing} ${
      shape === 'rounded' ? 'rounded-full' : 'rounded-sm'
    } ${
      variant === 'solid'
        ? 'bg-[#542b2b] text-[#faf9f7] hover:bg-[#6b3a3a]'
        : 'border border-[#542b2b] text-[#542b2b] hover:bg-[#542b2b] hover:text-[#faf9f7]'
    }`}
  >
    {children}
    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
  </button>
);

const SectionLabel: React.FC<{ index: string; children: React.ReactNode }> = ({ index, children }) => (
  <p className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[#705957]">
    <span className="font-mono">({index})</span>
    <span className="h-px w-8 bg-[#d8ceca]" aria-hidden />
    {children}
  </p>
);

/* --------------------------------------------------------------------------
   Illustration: laptop + USB drive sorting files into quarters (line art)
   -------------------------------------------------------------------------- */

const FOLDERS = [
  { x: 48, label: 'Q1' },
  { x: 148, label: 'Q2' },
  { x: 248, label: 'Q3' },
  { x: 348, label: 'Q4' },
];

// Curved link from a folder's base down to its slot on the laptop screen.
const linkPath = (x: number, i: number) => {
  const target = 215 + (i - 1.5) * 18;
  return `M${x + 32} 66 C${x + 32} 82 ${target} 80 ${target} 98`;
};

const SortingIllustration: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      viewBox="0 0 460 300"
      className="w-[430px] max-w-full"
      fill="none"
      stroke="#542b2b"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Line drawing of a laptop with a USB drive attached, sorting files into four quarterly folders"
    >
      {/* Quarter folders, each fed by a data line from the screen */}
      {FOLDERS.map((f, i) => {
        const link = linkPath(f.x, i);
        return (
          <motion.g
            key={f.label}
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 + i * 0.12, ease: EASE }}
          >
            <path d={`M${f.x} 26 h20 l6 -7 h38 v44 h-64 z`} fill="#faf9f7" />
            <text x={f.x + 32} y={50} textAnchor="middle" fontSize="13" fill="#542b2b" stroke="none" fontFamily="inherit">
              {f.label}
            </text>

            {/* Dashed line: dashes march from the screen up into the folder.
                The path runs folder -> screen, so a growing offset moves them upward. */}
            <motion.path
              d={link}
              strokeDasharray="3 4"
              stroke="#9d8580"
              animate={reduceMotion ? undefined : { strokeDashoffset: [0, 14] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
            />

            {/* Pulse of current travelling screen -> folder, staggered per quarter */}
            {!reduceMotion && (
              <circle r="2.25" fill="#542b2b" stroke="none" opacity="0">
                <animateMotion
                  path={link}
                  dur="1.8s"
                  begin={`${i * 0.45}s`}
                  repeatCount="indefinite"
                  keyPoints="1;0"
                  keyTimes="0;1"
                  calcMode="linear"
                />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.15;0.8;1"
                  dur="1.8s"
                  begin={`${i * 0.45}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )}
          </motion.g>
        );
      })}

      {/* Screen */}
      <rect x="100" y="98" width="230" height="142" rx="8" fill="#faf9f7" />
      <rect x="112" y="110" width="206" height="118" rx="3" stroke="#9d8580" />
      {/* File rows */}
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          <rect x="124" y={124 + r * 24} width="10" height="12" rx="1.5" />
          <line x1="142" y1={130 + r * 24} x2={214 - r * 8} y2={130 + r * 24} />
          <rect x="236" y={125 + r * 24} width="22" height="10" rx="5" stroke="#9d8580" />
        </g>
      ))}
      {/* Quarter bars */}
      {[34, 22, 44, 30].map((h, i) => (
        <motion.rect
          key={i}
          x={272 + i * 10}
          width="6"
          rx="1"
          fill="#542b2b"
          stroke="none"
          initial={{ height: 0, y: 214 }}
          whileInView={{ height: h, y: 214 - h }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.8 + i * 0.1, ease: EASE }}
        />
      ))}

      {/* Laptop base */}
      <path d="M70 240 H360 L392 262 H38 Z" fill="#faf9f7" />
      <line x1="190" y1="251" x2="240" y2="251" stroke="#9d8580" />

      {/* USB drive plugged into the side */}
      <path d="M392 262 v-10 h14" />
      <rect x="406" y="244" width="14" height="14" rx="1" />
      <rect x="420" y="241" width="30" height="20" rx="4" fill="#faf9f7" />
      <line x1="428" y1="251" x2="442" y2="251" stroke="#9d8580" />

      {/* Ground rule */}
      <line x1="20" y1="262" x2="440" y2="262" strokeWidth={2} />
    </svg>
  );
};

// Background "bar chart" texture, mirrored either side of the torso (x 111–349)
// so no bar pokes out beneath the body.
const ROBOT_BARS = [
  { x: 22, h: 30 }, { x: 49, h: 52 }, { x: 76, h: 74 }, { x: 103, h: 40 },
  { x: 357, h: 62 }, { x: 384, h: 84 }, { x: 411, h: 48 }, { x: 438, h: 26 },
];

// "Thinking" bits that rise off the helmet. Positions and timing are fixed so
// the layout is stable; only the 0/1 values flip, like data being decrypted.
const RISING_BITS = [176, 196, 214, 232, 250, 268, 188, 222, 258, 204, 240, 276].map((x, i) => ({
  x,
  value: (i * 5) % 3 === 0 ? '1' : '0',
  delay: (i * 0.55) % 6,
  duration: 3.2 + (i % 4) * 0.5,
}));

// Extra, faster bits layered on while the robot is in scan mode.
const BURST_BITS = [166, 182, 198, 216, 234, 252, 270, 286, 206, 262].map((x, i) => ({
  x,
  delay: (i * 0.17) % 1.2,
  duration: 1.5 + (i % 3) * 0.3,
}));

// Short hash fragments that drift up beside the head in scan mode.
const HASH_FRAGMENTS = [
  { x: 106, text: '9f2c', delay: 0 },
  { x: 354, text: 'a41e', delay: 0.7 },
  { x: 112, text: 'c07a', delay: 1.4 },
  { x: 348, text: '7d15', delay: 2.1 },
];

const VISOR_READOUT = '01101001 0011 0101';
const MONO = 'JetBrains Mono, ui-monospace, monospace';

const flipBits = (values: string[], chance: number) =>
  values.map((v) => (Math.random() < chance ? (v === '1' ? '0' : '1') : v));

const BinaryStream: React.FC<{ active: boolean; running: boolean }> = ({ active, running }) => {
  const [values, setValues] = React.useState(() => RISING_BITS.map((b) => b.value));

  // Scramble the digits; faster and more often while scanning. Paused off-screen.
  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(
      () => setValues((v) => flipBits(v, active ? 0.5 : 0.2)),
      active ? 90 : 350,
    );
    return () => window.clearInterval(id);
  }, [active, running]);

  return (
    <g aria-hidden fontFamily={MONO} stroke="none">
      <g fontSize="11" fill={active ? '#805d59' : '#9d8580'} style={{ transition: 'fill 300ms' }}>
        {RISING_BITS.map((b, i) => (
          <motion.text
            key={b.x}
            x={b.x}
            y={44}
            textAnchor="middle"
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -58, opacity: [0, 0.85, 0] }}
            transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: 'easeOut' }}
          >
            {values[i]}
          </motion.text>
        ))}
      </g>

      <AnimatePresence>
        {active && (
          <motion.g
            key="burst"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <g fontSize="10" fill="#542b2b">
              {BURST_BITS.map((b, i) => (
                <motion.text
                  key={b.x}
                  x={b.x}
                  y={50}
                  textAnchor="middle"
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: -76, opacity: [0, 0.9, 0] }}
                  transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: 'easeOut' }}
                >
                  {values[i % values.length]}
                </motion.text>
              ))}
            </g>
            <g fontSize="9" fill="#9d8580" letterSpacing="1">
              {HASH_FRAGMENTS.map((h) => (
                <motion.text
                  key={h.text}
                  x={h.x}
                  y={110}
                  textAnchor="middle"
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: -80, opacity: [0, 0.8, 0] }}
                  transition={{ duration: 2.8, delay: h.delay, repeat: Infinity, ease: 'linear' }}
                >
                  {h.text}
                </motion.text>
              ))}
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  );
};

// Geometry is symmetric about x = 230. The viewBox ends at the robot's base
// (y = 376) so it sits directly on the highlights strip's top border; it starts
// above y = 0 to leave headroom for the rising bits.
const HeroRobotIllustration: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef);
  const animated = !reduceMotion;

  // "Scan mode": hover with a mouse, or tap on touch screens (auto-ends).
  const [active, setActive] = React.useState(false);
  const tapTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(tapTimer.current), []);

  // Eyes follow the pointer anywhere on the page while the hero is visible.
  const gazeX = useSpring(0, { stiffness: 120, damping: 18 });
  const gazeY = useSpring(0, { stiffness: 120, damping: 18 });
  React.useEffect(() => {
    if (!animated || !inView) return;
    const onMove = (e: PointerEvent) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Eye line sits at ~40% of the drawing's height (y = 128 in a -36..377 viewBox).
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.4;
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      gazeX.set(clamp((e.clientX - cx) / (rect.width / 2)) * 4);
      gazeY.set(clamp((e.clientY - cy) / (rect.height / 2)) * 2.5);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [animated, inView, gazeX, gazeY]);

  const pointerHandlers = animated
    ? {
        onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') setActive(true); },
        onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') setActive(false); },
        onPointerDown: (e: React.PointerEvent) => {
          if (e.pointerType === 'mouse') return;
          setActive(true);
          window.clearTimeout(tapTimer.current);
          tapTimer.current = window.setTimeout(() => setActive(false), 2600);
        },
      }
    : {};

  return (
    <div
      ref={wrapRef}
      className={`w-full max-w-[400px] sm:max-w-[460px] lg:max-w-[500px] ${animated ? 'cursor-crosshair' : ''}`}
      {...pointerHandlers}
    >
      <svg
        viewBox="0 -36 460 413"
        className="block w-full"
        fill="none"
        stroke="#542b2b"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="Line illustration of a friendly robot assistant"
      >
        <g stroke="#d8ceca" strokeWidth="5" strokeDasharray="3 7">
          {ROBOT_BARS.map(({ x, h }) => (
            <line key={x} x1={x} x2={x} y1={376 - h} y2="376" />
          ))}
        </g>

        {/* Torso, arms, neck and collar */}
        <path d="M111 376v-43c0-33 24-61 57-67l24-5h78l24 5c33 6 57 34 57 67v43" fill="#faf9f7" />
        <path d="M167 271c-17 5-30 17-36 33l-7 19h52v53" />
        <path d="M293 271c17 5 30 17 36 33l7 19h-52v53" />
        <path d="M191 256v-39h78v39c0 12-10 21-22 21h-34c-12 0-22-9-22-21Z" fill="#faf9f7" />
        <path d="M186 253c18 10 70 10 88 0v14c-16 11-72 11-88 0Z" fill="#542b2b" />

        {/* Ears (drawn before the head and visor so both overlap them cleanly) */}
        <path d="M144 118c-12 0-20 11-20 25s8 25 20 25" fill="#faf9f7" />
        <ellipse cx="141" cy="143" rx="9" ry="15" fill="#faf9f7" />
        <path d="M316 118c12 0 20 11 20 25s-8 25-20 25" fill="#faf9f7" />
        <ellipse cx="319" cy="143" rx="9" ry="15" fill="#faf9f7" />

        {/* Head and helmet */}
        <path d="M151 119c0-48 28-79 79-79s79 31 79 79v67c0 31-25 56-56 56h-46c-31 0-56-25-56-56v-67Z" fill="#faf9f7" />
        <path d="M158 107c5-51 31-75 73-75 42 0 69 24 73 75l-146-7Z" fill="#faf9f7" stroke="none" />
        <path d="M158 107c5-51 31-75 73-75 42 0 69 24 73 75" />
        <path d="M171 106c9-34 30-53 60-53 30 0 51 19 60 53" />

        {animated && <BinaryStream active={active} running={inView} />}

        {/* Antenna, rooted on the helmet surface; blinks while scanning */}
        <path d="M285 54V30" />
        <motion.circle
          cx="285"
          cy="26"
          r="4"
          fill="#542b2b"
          animate={active ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
          transition={active ? { duration: 0.5, repeat: Infinity } : { duration: 0.2 }}
        />

        {/* Visor, eyes (following the pointer) and mouth */}
        <path d="M143 112c0-7 5-12 12-12h151c7 0 12 5 12 12v31c0 7-5 12-12 12H155c-7 0-12-5-12-12v-31Z" fill="#542b2b" />
        <motion.g style={animated ? { x: gazeX, y: gazeY } : undefined}>
          {[183, 230, 277].map((cx, i) => (
            <motion.circle
              key={cx}
              cx={cx}
              cy="128"
              r="5"
              fill="#faf9f7"
              stroke="none"
              animate={animated ? { opacity: [1, 0.35, 1] } : undefined}
              transition={{ duration: active ? 0.6 : 1.8, delay: i * (active ? 0.1 : 0.25), repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </motion.g>

        {/* Data readout scrolling along the lower edge of the visor */}
        {animated && (
          <g aria-hidden>
            <clipPath id="qs-visor-readout">
              <rect x="151" y="137" width="159" height="15" />
            </clipPath>
            <g clipPath="url(#qs-visor-readout)">
              <motion.text
                key={active ? 'fast' : 'slow'}
                x={318}
                y={148}
                fontFamily={MONO}
                fontSize="8"
                fill="#faf9f7"
                fillOpacity={active ? 0.8 : 0.55}
                stroke="none"
                initial={{ x: 0 }}
                animate={{ x: -260 }}
                transition={
                  active
                    ? { duration: 1.4, repeat: Infinity, repeatDelay: 0.2, ease: 'linear' }
                    : { duration: 3.5, repeat: Infinity, repeatDelay: 2.5, ease: 'linear' }
                }
              >
                {VISOR_READOUT}
              </motion.text>
            </g>
          </g>
        )}

        <path d="M212 196q18 12 36 0" />

        {/* Security scan: a line with a soft trailing band sweeps down the robot */}
        <AnimatePresence>
          {active && (
            <motion.g
              key="scan"
              aria-hidden
              stroke="none"
              pointerEvents="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <defs>
                <linearGradient id="qs-scan-band" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#805d59" stopOpacity="0" />
                  <stop offset="1" stopColor="#805d59" stopOpacity="0.14" />
                </linearGradient>
              </defs>
              <motion.g
                initial={{ y: 20 }}
                animate={{ y: [20, 360] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              >
                <rect x="104" y="-22" width="252" height="22" fill="url(#qs-scan-band)" />
                <rect x="104" y="0" width="252" height="1.5" fill="#805d59" opacity="0.6" />
              </motion.g>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
};

/* --------------------------------------------------------------------------
   Steps timeline: a smooth curve threaded through the centre of every step
   circle. Positions are measured from layout (offsetLeft/Top ignore the entry
   transforms), so the curve stays attached at every breakpoint and on resize.
   -------------------------------------------------------------------------- */

type Point = { x: number; y: number };

// Catmull-Rom spline through the points, expressed as cubic Béziers.
const smoothPath = (pts: Point[]) => {
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
  }
  return d;
};

// Horizontal offset of each step as a fraction of --bow. The tails sit at 0, so
// the steps trace one continuous arc that bows out and returns: (0) · · · · (0).
const arcOffset = (i: number, n: number) => Math.sin((Math.PI * (i + 1)) / (n + 1));

const StepsTimeline: React.FC = () => {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const circleRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [curve, setCurve] = React.useState<{ d: string; w: number; h: number; fade: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const gradientId = `steps-curve-${React.useId().replace(/[^\w-]/g, '')}`;

  React.useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const measure = () => {
      let baseX = 0;
      const centers = circleRefs.current.flatMap((el) => {
        const li = el?.parentElement;
        const ol = li?.parentElement;
        if (!el || !li || !ol) return [];
        // x of a circle with no arc offset — where the tails attach.
        baseX = ol.offsetLeft + el.offsetLeft + el.offsetWidth / 2;
        return [{
          x: ol.offsetLeft + li.offsetLeft + el.offsetLeft + el.offsetWidth / 2,
          y: ol.offsetTop + li.offsetTop + el.offsetTop + el.offsetHeight / 2,
        }];
      });
      if (centers.length < 2) return;

      const w = wrap.offsetWidth;
      const h = wrap.offsetHeight;
      const first = centers[0];
      const last = centers[centers.length - 1];
      // Tails roughly match the step spacing so the spline stays evenly curved,
      // but never reach more than 24px beyond the wrapper.
      const spacing = (last.y - first.y) / (centers.length - 1);
      const tailTop = Math.min(spacing * 0.7, first.y + 24);
      const tailBottom = Math.min(spacing * 0.7, h - last.y + 24);
      const start = { x: baseX, y: first.y - tailTop };
      const end = { x: baseX, y: last.y + tailBottom };
      const fade = Math.min(tailTop, tailBottom) * 0.8 / (end.y - start.y);
      setCurve({ d: smoothPath([start, ...centers, end]), w, h, fade });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      {curve && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${curve.w} ${curve.h}`}
          fill="none"
        >
          {/* Fade both tails out so the line starts and ends softly. */}
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#9d8580" stopOpacity="0" />
              <stop offset={curve.fade} stopColor="#9d8580" />
              <stop offset={1 - curve.fade} stopColor="#9d8580" />
              <stop offset="1" stopColor="#9d8580" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={curve.d}
            stroke={`url(#${gradientId})`}
            strokeWidth="1"
            initial={reduceMotion ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.8, ease: 'easeInOut' }}
          />
        </svg>
      )}

      <motion.ol
        variants={stagger}
        {...inView}
        className="relative flex flex-col gap-12 py-10 [--bow:20px] sm:[--bow:36px] lg:gap-16 lg:py-12 lg:[--bow:64px]"
      >
        {STEPS.map((step, i) => (
          <motion.li
            key={step.number}
            variants={rise}
            className="relative flex items-start gap-6 sm:gap-8"
            style={{ marginLeft: `calc(var(--bow) * ${arcOffset(i, STEPS.length).toFixed(3)})` }}
          >
            <div
              ref={(el) => { circleRefs.current[i] = el; }}
              className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#805d59] bg-[#faf9f7] font-display text-lg sm:h-14 sm:w-14 sm:text-xl"
            >
              {step.number}
            </div>
            <div className="max-w-md pt-1">
              <h3 className="font-display text-xl font-normal sm:text-2xl">{step.title}</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#705957]">{step.description}</p>
            </div>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  );
};

/* --------------------------------------------------------------------------
   Page
   -------------------------------------------------------------------------- */

export const LandingPage: React.FC<LandingPageProps> = ({ onConnectUSB }) => {
  const year = new Date().getFullYear();

  return (
    <MotionConfig reducedMotion="user">
      <div id="top" className="min-h-screen bg-[#faf9f7] text-[#542b2b] antialiased selection:bg-[#542b2b] selection:text-[#faf9f7]">
        {/* ================= HEADER ================= */}
        <header className="sticky top-0 z-40 border-b border-[#d8ceca] bg-[#faf9f7]/90 backdrop-blur">
          <div className="mx-auto grid max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center lg:grid-cols-3">
            <nav aria-label="Sections" className="hidden items-center gap-4 whitespace-nowrap px-8 py-5 text-sm lg:flex">
              {NAV_LEFT.map((l, i) => (
                <React.Fragment key={l.href}>
                  {i > 0 && <Dot />}
                  <NavLink href={l.href}>{l.label}</NavLink>
                </React.Fragment>
              ))}
            </nav>

            <div className="col-start-2 flex justify-center border-x border-[#d8ceca] px-5 py-5 sm:px-6 lg:col-start-auto">
              <Logo />
            </div>

            <nav aria-label="Actions" className="flex items-center justify-end gap-4 whitespace-nowrap px-4 py-5 text-sm sm:px-8">
              <span className="hidden items-center gap-4 lg:flex">
                <NavLink href="#faq">FAQ</NavLink>
                <Dot />
              </span>
              <button type="button" onClick={onConnectUSB} className={`underline-offset-4 transition-opacity hover:opacity-60 hover:underline ${focusRing}`}>
                <span className="sm:hidden">Scan</span>
                <span className="hidden sm:inline">Scan a drive</span>
              </button>
            </nav>
          </div>
        </header>

        <main>
          {/* ================= HERO ================= */}
          <section className="border-b border-[#d8ceca]">
            <div className="mx-auto max-w-[1200px] border-x border-[#d8ceca]">
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="grid lg:min-h-[440px] lg:grid-cols-2"
              >
                <div className="flex flex-col justify-center px-8 pb-6 pt-16 sm:px-12 lg:border-r lg:border-[#d8ceca] lg:px-16 lg:py-20">
                  <motion.div variants={rise}>
                    <SectionLabel index="00">Local-first file intelligence</SectionLabel>
                  </motion.div>
                  <motion.h1
                    variants={rise}
                    className="mt-6 max-w-xl font-display text-5xl font-normal leading-[1.05] tracking-tight sm:text-6xl lg:text-[4rem]"
                  >
                    Every file,
                    <br />
                    sorted by
                    <br />
                    quarter.
                  </motion.h1>
                  <motion.p variants={rise} className="mt-5 max-w-md font-mono text-xs leading-relaxed text-[#705957] sm:text-sm">
                    Index USB drives and folders locally, fingerprint every document, and find duplicates — right in your browser.
                  </motion.p>
                  <motion.div variants={rise} className="mt-6">
                    <CtaButton onClick={onConnectUSB} variant="outline" shape="square">Scan a drive</CtaButton>
                  </motion.div>
                </div>

                <motion.div
                  variants={rise}
                  className="flex items-end justify-center overflow-hidden px-6 pt-4 lg:min-h-[440px] lg:px-8 lg:pt-10"
                >
                  <HeroRobotIllustration />
                </motion.div>
              </motion.div>

              <ul aria-label="QuarterSort highlights" className="grid grid-cols-2 gap-px border-t border-[#d8ceca] bg-[#d8ceca] lg:grid-cols-5 [&>li:last-child]:col-span-2 lg:[&>li:last-child]:col-span-1">
                {[
                  'Read-only access',
                  'SHA-256 fingerprints',
                  'Fiscal quarter sorting',
                  'Runs in your browser',
                  'No uploads required',
                ].map((highlight, i) => (
                  <li
                    key={highlight}
                    className="flex min-h-14 items-center justify-center gap-2 bg-[#faf9f7] px-3 py-3 text-center text-xs text-[#705957] sm:px-4"
                  >
                    <span aria-hidden className="font-mono text-[10px] text-[#9d8580]">{String(i + 1).padStart(2, '0')}</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ================= GET STARTED ================= */}
          <section id="get-started" className="scroll-mt-20 overflow-hidden border-b border-[#d8ceca]">
            <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 lg:py-20">
              <div className="mx-auto grid max-w-xl grid-cols-1 gap-12 lg:max-w-none lg:grid-cols-[5fr_6fr] lg:gap-20">
                {/* Left: heading on top, illustration anchored to the bottom of the column */}
                <motion.div variants={stagger} {...inView} className="flex flex-col lg:py-12">
                  <motion.div variants={rise}>
                    <SectionLabel index="01">How it works</SectionLabel>
                  </motion.div>
                  <motion.h2 variants={rise} className="mt-6 max-w-md font-display text-4xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
                    Get Started In
                    <br />
                    Minutes.
                  </motion.h2>
                  <motion.div variants={rise} className="mt-12 flex justify-center lg:mt-auto lg:justify-start lg:pt-12">
                    <SortingIllustration />
                  </motion.div>
                </motion.div>

                {/* Right: steps on a curve drawn through each circle */}
                <StepsTimeline />
              </div>
            </div>
          </section>

          {/* ================= FEATURES ================= */}
          <section id="features" className="scroll-mt-20 border-b border-[#d8ceca]">
            <div className="mx-auto max-w-[1200px]">
              <motion.div variants={stagger} {...inView} className="flex flex-col gap-5 px-5 pb-9 pt-12 sm:px-8 sm:pb-12 sm:pt-16 md:flex-row md:items-end md:justify-between md:gap-8 lg:pb-14 lg:pt-20">
                <motion.div variants={rise} className="max-w-xl">
                  <SectionLabel index="02">Features</SectionLabel>
                  <h2 className="mt-4 max-w-lg font-display text-3xl font-normal leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
                    Everything you need to trust your records.
                  </h2>
                </motion.div>
                <motion.p variants={rise} className="max-w-sm text-sm leading-relaxed text-[#705957] md:shrink-0 md:pb-1">
                  Built for finance, compliance and audit teams who inherit drives full of undocumented files.
                </motion.p>
              </motion.div>

              <motion.ul
                variants={stagger}
                {...inView}
                className="grid gap-px border-t border-[#d8ceca] bg-[#d8ceca] sm:grid-cols-2 lg:grid-cols-3"
              >
                {FEATURES.map((f, i) => (
                  <motion.li key={f.title} variants={rise} className="bg-[#faf9f7] px-5 py-6 transition-colors hover:bg-[#f3efeb] sm:px-6 sm:py-7 lg:px-7">
                    <span className="font-mono text-xs text-[#9d8580]">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="mt-3 font-display text-lg font-normal leading-snug sm:text-xl">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#705957]">{f.desc}</p>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </section>

          {/* ================= PRIVACY ================= */}
          <section id="privacy" className="scroll-mt-20 border-b border-[#d8ceca]">
            <motion.div variants={stagger} {...inView} className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 lg:py-24">
              <div className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-16">
                <div className="lg:col-span-7 xl:col-span-8">
                  <motion.div variants={rise}>
                    <SectionLabel index="03">Privacy</SectionLabel>
                  </motion.div>
                  <motion.p
                    variants={rise}
                    className="mt-8 text-balance font-display text-2xl font-normal leading-[1.3] tracking-tight sm:text-4xl sm:leading-[1.25] lg:text-[2.5rem]"
                  >
                    Sensitive records deserve better than an upload form. QuarterSort does the heavy lifting{' '}
                    <span className="italic text-[#805d59]">on your machine</span> — and leaves your drive exactly as it found it.
                  </motion.p>
                </div>

                {/* Where your data goes during a scan */}
                <motion.figure
                  variants={rise}
                  className="rounded-sm border border-[#d8ceca] p-6 sm:max-w-md lg:col-span-5 lg:max-w-none xl:col-span-4"
                  aria-label="During a scan, files move from your drive to your browser and into a local index. Nothing is uploaded."
                >
                  <figcaption className="text-xs uppercase tracking-[0.2em] text-[#705957]">During a scan</figcaption>
                  <ol className="relative mt-5 space-y-4" aria-hidden>
                    <span className="absolute bottom-5 left-5 top-5 w-px bg-[#d8ceca]" />
                    {DATA_PATH.map(({ icon: Icon, title, meta }) => (
                      <li key={title} className="relative flex items-center gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#805d59] bg-[#faf9f7]">
                          <Icon className="h-4 w-4" strokeWidth={1.5} />
                        </span>
                        <span>
                          <span className="block font-display text-base">{title}</span>
                          <span className="block font-mono text-xs text-[#705957]">{meta}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-6 flex items-baseline justify-between border-t border-dashed border-[#d8ceca] pt-4 text-sm text-[#705957]">
                    Bytes uploaded
                    <span className="font-display text-2xl text-[#542b2b]">0</span>
                  </p>
                </motion.figure>
              </div>

              <motion.dl
                variants={stagger}
                className="mt-14 grid gap-px border border-[#d8ceca] bg-[#d8ceca] sm:grid-cols-2 lg:mt-16 lg:grid-cols-4"
              >
                {PRIVACY.map((p, i) => (
                  <motion.div key={p.title} variants={rise} className="bg-[#faf9f7] p-6 lg:p-7">
                    <span aria-hidden className="font-mono text-xs text-[#9d8580]">{String(i + 1).padStart(2, '0')}</span>
                    <dt className="mt-4 font-display text-lg">{p.title}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-[#705957]">{p.desc}</dd>
                  </motion.div>
                ))}
              </motion.dl>
            </motion.div>
          </section>

          {/* ================= FAQ ================= */}
          <section id="faq" className="scroll-mt-20 border-b border-[#d8ceca]">
            <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-16 sm:px-8 lg:grid-cols-[1fr_2fr] lg:gap-16 lg:py-24">
              <div>
                <SectionLabel index="04">FAQ</SectionLabel>
                <h2 className="mt-6 font-display text-4xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
                  Questions,
                  <br />
                  answered.
                </h2>
                <p className="mt-5 max-w-xs text-sm leading-relaxed text-[#705957]">
                  Everything you need to know before plugging in your first drive.
                </p>
                <button
                  type="button"
                  onClick={onConnectUSB}
                  className={`group mt-6 inline-flex items-center gap-2 border-b border-[#542b2b] pb-1 text-sm transition-opacity hover:opacity-70 ${focusRing}`}
                >
                  Try it on a drive
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                </button>
              </div>

              <div className="border-t border-[#d8ceca]">
                {FAQS.map((f, i) => (
                  <details
                    key={f.q}
                    open={i === 0}
                    className="group border-b border-[#d8ceca] [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary
                      className={`flex cursor-pointer list-none items-start gap-4 py-5 transition-colors hover:text-[#805d59] sm:gap-6 sm:py-6 ${focusRing}`}
                    >
                      <span aria-hidden className="w-6 shrink-0 pt-1 font-mono text-xs text-[#9d8580]">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="flex-1 font-display text-base leading-snug sm:text-lg">{f.q}</span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d8ceca] transition-colors group-open:border-[#542b2b] group-open:bg-[#542b2b] group-open:text-[#faf9f7]">
                        <Plus className="h-3.5 w-3.5 transition-transform duration-300 group-open:rotate-45" aria-hidden />
                      </span>
                    </summary>
                    <p className="-mt-1 max-w-xl pb-6 pl-10 pr-12 text-sm leading-relaxed text-[#705957] sm:pl-12 sm:pr-14">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>

        </main>

        {/* ================= FOOTER ================= */}
        <footer>
          <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:py-14">
            <div className="sm:col-span-2 lg:col-span-6">
              <Logo size="md" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#705957]">
                Scan, classify and audit USB drives by fiscal quarter — locally, in your browser.
              </p>
            </div>

            <nav aria-label="Footer" className="lg:col-span-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[#705957]">Explore</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {[...NAV_LEFT, { href: '#faq', label: 'FAQ' }].map((l) => (
                  <li key={l.href}>
                    <NavLink href={l.href}>{l.label}</NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="lg:col-span-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[#705957]">Get started</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={onConnectUSB}
                    className={`group inline-flex items-center gap-1.5 transition-opacity hover:opacity-60 ${focusRing}`}
                  >
                    Scan a drive
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </button>
                </li>
                <li>
                  <NavLink href="#privacy">How your data is handled</NavLink>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar mirrors the header's three bordered cells */}
          <div className="border-t border-[#d8ceca]">
            <div className="mx-auto grid max-w-[1200px] grid-cols-2 text-xs text-[#705957] sm:grid-cols-[1fr_auto_1fr]">
              <p className="px-6 py-5 sm:px-8">© {year} QuarterSort AI</p>
              <p className="order-first col-span-2 flex items-center justify-center gap-2 border-b border-[#d8ceca] px-6 py-5 sm:order-none sm:col-span-1 sm:border-x sm:border-b-0">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#805d59]" />
                Files stay on your device during scans
              </p>
              <div className="flex justify-end px-6 py-5 sm:px-8">
                <a href="#top" className={`group inline-flex items-center gap-1.5 transition-opacity hover:opacity-60 ${focusRing}`}>
                  Back to top
                  <ArrowUp className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" aria-hidden />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
};
