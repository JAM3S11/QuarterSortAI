import React from 'react';
import { motion } from 'motion/react';
import { UilSorting } from '@iconscout/react-unicons';
import {
  FolderTree, BarChart3, Copy, BrainCircuit, ShieldCheck,
  HardDrive, ChevronRight, Hash, Layers, ArrowRight, Lock,
} from 'lucide-react';

interface LandingPageProps {
  onConnectUSB: () => void;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

const features = [
  { icon: FolderTree, title: 'Quarter Classification', desc: 'Files are automatically assigned to Q1–Q4 based on embedded metadata, filename conventions, and modification dates.' },
  { icon: Hash, title: 'SHA-256 Integrity', desc: 'Every file is content-addressed with SHA-256 hashing to enable reliable duplicate detection and integrity verification.' },
  { icon: BarChart3, title: 'Analytics Engine', desc: 'Interactive charts reveal storage distribution across quarters, categories, and folders — no spreadsheet export needed.' },
  { icon: Copy, title: 'Duplicate Forensics', desc: 'Hash-grouped duplicate view shows exact matches, potential savings, and lets you review before any cleanup action.' },
  { icon: BrainCircuit, title: 'AI Audit Report', desc: 'Generates a structured audit with anomaly flags, compliance scoring, and actionable recommendations per scan.' },
  { icon: ShieldCheck, title: 'Read-Only Indexing', desc: 'The scanner never writes to the source drive. All classification data lives in IndexedDB in the browser.' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onConnectUSB }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/20">

      <header className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-lg shrink-0">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <UilSorting size={18} color="currentColor" />
            </div>
            <span className="text-sm font-semibold tracking-tight">QuarterSort<span className="text-emerald-400">AI</span></span>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden flex-1 flex items-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.06),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="mx-auto w-full max-w-6xl px-6 py-24 lg:py-32">
          <div className="grid gap-16 lg:grid-cols-5 lg:gap-20">
            <motion.div className="lg:col-span-3" variants={container} initial="hidden" animate="show">
              <motion.h1 variants={item} className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-5xl xl:text-6xl leading-[1.1]">
                Every file,<br />classified and<br /><span className="text-emerald-400">audit-ready.</span>
              </motion.h1>

              <motion.p variants={item} className="mt-5 max-w-lg text-base leading-relaxed text-slate-400">
                Plug in any USB drive or folder. QuarterSort AI scans every file, assigns it to the correct financial quarter, and builds a tamper-proof index — all without a single byte leaving your machine.
              </motion.p>

              <motion.div variants={item} className="mt-8">
                <button onClick={onConnectUSB} className="group inline-flex h-12 items-center gap-2.5 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.97]">
                  <HardDrive className="h-4 w-4" />
                  Scan my USB drive
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </motion.div>

              <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500/60" /> Read-only</span>
                <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-emerald-500/60" /> Zero network access</span>
                <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-emerald-500/60" /> SHA-256 integrity</span>
                <span className="flex items-center gap-1.5"><FolderTree className="h-3.5 w-3.5 text-emerald-500/60" /> Q1–Q4 auto-classified</span>
              </motion.div>
            </motion.div>

            <motion.div className="lg:col-span-2 flex items-center justify-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}>
              <div className="relative w-full max-w-sm">
                <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-emerald-500/5 backdrop-blur-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-500">Quarter Summary</span>
                    <span className="flex items-center gap-1.5 text-[0.625rem] text-emerald-500/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      local scan
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { label: 'Q1 · Jul–Sep', pct: 43, count: 43, color: 'bg-emerald-500/70' },
                      { label: 'Q2 · Oct–Dec', pct: 28, count: 28, color: 'bg-cyan-500/70' },
                      { label: 'Q3 · Jan–Mar', pct: 52, count: 52, color: 'bg-blue-500/70' },
                      { label: 'Q4 · Apr–Jun', pct: 41, count: 41, color: 'bg-violet-500/70' },
                    ].map((q) => (
                      <div key={q.label} className="space-y-1">
                        <div className="flex items-center justify-between text-[0.625rem]">
                          <span className="text-slate-400 font-medium">{q.label}</span>
                          <span className="font-mono text-slate-500">{q.count} files</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800">
                          <motion.div
                            className={`h-full rounded-full ${q.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${q.pct}%` }}
                            transition={{ duration: 1.2, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[0.625rem] text-slate-500">
                    <span>164 files · 36 folders</span>
                    <span className="flex items-center gap-1 text-emerald-500/70">
                      <ShieldCheck className="w-3 h-3" />
                      SHA-256 verified
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800/60 bg-slate-900/20">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="grid gap-10 md:grid-cols-3">
            {[
              { step: '01', title: 'Plug in & connect', desc: 'Insert your USB drive and click the button. Your browser will ask you to select the drive folder.', icon: HardDrive },
              { step: '02', title: 'Automatic indexing', desc: 'Every file is hashed (SHA-256), classified by financial quarter, and organized into a searchable tree.', icon: Layers },
              { step: '03', title: 'Explore & analyze', desc: 'Browse files by quarter, detect duplicates, view analytics, and generate AI audit reports instantly.', icon: BarChart3 },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.step} className="relative" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.12, ease: [0.25, 0.1, 0.25, 1] }}>
                  {i < 2 && <div className="pointer-events-none absolute -right-4 top-8 hidden text-slate-800 md:block"><ArrowRight className="h-5 w-5" /></div>}
                  <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-[0.6875rem] font-mono font-semibold text-slate-600">{s.step}</span>
                      <div className="h-px flex-1 bg-slate-800/60" />
                    </div>
                    <Icon className="mb-3 h-5 w-5 text-emerald-400/70" />
                    <h3 className="mb-1 text-sm font-semibold text-slate-200">{s.title}</h3>
                    <p className="text-xs leading-relaxed text-slate-500">{s.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800/60">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <motion.div className="text-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}>
            <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-500">Built for compliance</p>
            <h2 className="text-2xl font-bold sm:text-3xl">What happens after you connect.</h2>
          </motion.div>

          <motion.div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title} variants={item} className="group rounded-xl border border-slate-800/80 bg-slate-900/30 p-5 transition-all hover:border-slate-700 hover:bg-slate-900/60">
                  <Icon className="mb-3 h-4 w-4 text-emerald-400/70 group-hover:text-emerald-400 transition-colors" />
                  <h3 className="mb-1 text-sm font-semibold text-slate-200">{f.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">{f.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-slate-800/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-center px-6 text-[0.6875rem] text-slate-600">
          <span>QuarterSort AI — scan, classify, analyze. All local.</span>
        </div>
      </footer>
    </div>
  );
};
