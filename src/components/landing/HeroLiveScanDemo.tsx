import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ScanLine } from 'lucide-react';

interface ScanFinding {
  id: string;
  num: string;
  tag: string;
  code: string;
  detail: string;
  tone: 'blue' | 'emerald' | 'amber';
  /** Percentage coordinates on the document sheet */
  dotX: number;
  dotY: number;
  /** Callout card placement relative to sheet */
  cardSide: 'left' | 'right';
  cardTopPct: number;
  lineIndex: number;
}

const FINDINGS: ScanFinding[] = [
  {
    id: 'f1',
    num: '01',
    tag: 'EVIDENCE MCP · LINE 2',
    code: 'INV-2026-88412',
    detail: 'Invoice number extracted directly from seller header.',
    tone: 'blue',
    dotX: 83,
    dotY: 23,
    cardSide: 'right',
    cardTopPct: 8,
    lineIndex: 1,
  },
  {
    id: 'f2',
    num: '02',
    tag: 'TIMELINE AUDIT · LINE 3',
    code: 'May 18, 2026',
    detail: 'Purchase date verified within 12-month coverage window.',
    tone: 'emerald',
    dotX: 79,
    dotY: 36,
    cardSide: 'right',
    cardTopPct: 33,
    lineIndex: 2,
  },
  {
    id: 'f3',
    num: '03',
    tag: 'SELLER CHECK · LINE 4',
    code: 'Apex Digital Retail',
    detail: 'Authorized reseller matched on line 4 of receipt.',
    tone: 'emerald',
    dotX: 85,
    dotY: 49,
    cardSide: 'left',
    cardTopPct: 26,
    lineIndex: 3,
  },
  {
    id: 'f4',
    num: '04',
    tag: 'POLICY MCP · CLAUSE NT-1.1',
    code: 'USB-C PD Controller',
    detail: 'Charging port & power IC defects covered under Clause NT-1.1.',
    tone: 'blue',
    dotX: 83,
    dotY: 76,
    cardSide: 'left',
    cardTopPct: 58,
    lineIndex: 5,
  },
  {
    id: 'f5',
    num: '05',
    tag: 'GAP AUDIT · MISSING EVIDENCE',
    code: 'Serial Label Photo',
    detail: 'Underside chassis serial photo flagged before RMA approval.',
    tone: 'amber',
    dotX: 87,
    dotY: 89,
    cardSide: 'right',
    cardTopPct: 66,
    lineIndex: 6,
  },
];

const INVOICE_LINES = [
  { label: 'DOCUMENT', value: 'RETAIL TAX INVOICE & WARRANTY SUMMARY', line: 'Line 1' },
  { label: 'INVOICE NO.', value: 'INV-2026-88412', line: 'Line 2' },
  { label: 'PURCHASE DATE', value: 'May 18, 2026 (6 months elapsed)', line: 'Line 3' },
  { label: 'AUTHORIZED SELLER', value: 'Apex Digital Retail · Verified Partner #409', line: 'Line 4' },
  { label: 'DEVICE MODEL', value: 'NovaTech ApexBook 14 Pro · 65W USB-C PD', line: 'Line 5' },
  { label: 'POLICY MATCH', value: 'NT-1.1 Charging Controller · NT-2.4 Exclusions', line: 'Line 6' },
  { label: 'SERIAL / ATTACHMENTS', value: 'SN-NVT-948201-X · [Chassis Photo Pending]', line: 'Line 7' },
];

const TONE_CLASSES: Record<
  ScanFinding['tone'],
  { dot: string; line: string; border: string; code: string; tick: string; highlight: string }
> = {
  blue: {
    dot: 'bg-blue-700 text-white shadow-[0_0_0_3px_#ffffff,0_6px_14px_rgba(29,78,216,0.35)]',
    line: '#1d4ed8',
    border: 'border-blue-700',
    code: 'text-blue-800',
    tick: 'bg-blue-700',
    highlight: 'bg-blue-50/90 border-blue-200',
  },
  emerald: {
    dot: 'bg-emerald-700 text-white shadow-[0_0_0_3px_#ffffff,0_6px_14px_rgba(4,120,87,0.35)]',
    line: '#047857',
    border: 'border-emerald-700',
    code: 'text-emerald-800',
    tick: 'bg-emerald-700',
    highlight: 'bg-emerald-50/90 border-emerald-200',
  },
  amber: {
    dot: 'bg-amber-600 text-white shadow-[0_0_0_3px_#ffffff,0_6px_14px_rgba(217,119,6,0.35)]',
    line: '#d97706',
    border: 'border-amber-600',
    code: 'text-amber-800',
    tick: 'bg-amber-600',
    highlight: 'bg-amber-50/90 border-amber-200',
  },
};

export const HeroLiveScanDemo: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [typedLen, setTypedLen] = useState(0);

  const activeFinding = FINDINGS[activeIndex];

  // Auto-cycle through findings smoothly
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % FINDINGS.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, [paused]);

  // Crisp typewriter effect whenever active finding changes
  useEffect(() => {
    setTypedLen(0);
    const fullLen = activeFinding.detail.length;
    const stepMs = 16;
    const timer = window.setInterval(() => {
      setTypedLen((prev) => {
        if (prev >= fullLen) {
          window.clearInterval(timer);
          return fullLen;
        }
        return prev + 2;
      });
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [activeFinding]);

  return (
    <section
      aria-label="Live evidence verification demonstration"
      className="w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Editorial Eyebrow Header */}
      <div className="flex items-center gap-3 mb-3.5 text-[11px] font-mono font-medium uppercase tracking-[0.14em] text-slate-500">
        <ScanLine className="h-3.5 w-3.5 text-blue-700 shrink-0" aria-hidden="true" />
        <span className="truncate">Live proof-carrying audit · SHEET INV-2026-88412</span>
        <span className="h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent" />
        <span className="text-slate-700 font-semibold tabular-nums shrink-0">05 findings</span>
      </div>

      {/* Floating Sheet Stage */}
      <div className="relative">
        <div className="qz-sheet-stage relative rounded-xl border border-slate-300/90 bg-white shadow-[0_24px_50px_-14px_rgba(15,23,42,0.18),0_4px_12px_rgba(15,23,42,0.06)] overflow-hidden">
          {/* Paper Header Strip */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 text-[11px] font-mono text-slate-600">
            <span className="font-semibold text-slate-800">NOVATECH WARRANTY AUDIT · SAMPLE</span>
            <span className="tabular-nums">MCP Pipeline · Read-Only Scan</span>
          </div>

          {/* Document Body with Scanning Beam */}
          <div className="relative p-4 sm:p-5 space-y-2">
            {/* Continuous sweeping scan beam */}
            <div
              aria-hidden="true"
              className="qz-scan-line pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-500/0 via-blue-500/10 to-blue-600/20 border-b border-blue-500/40 z-10"
            />

            {INVOICE_LINES.map((row, idx) => {
              const isHighlighted = activeFinding.lineIndex === idx;
              const tone = TONE_CLASSES[activeFinding.tone];
              return (
                <div
                  key={row.label}
                  className={`relative rounded-md border px-3 py-2 transition-colors duration-300 ${
                    isHighlighted
                      ? `${tone.highlight} shadow-xs`
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                    <span>{row.label}</span>
                    <span>{row.line}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-slate-900 font-medium truncate">
                    {row.value}
                  </p>
                </div>
              );
            })}

            {/* Interactive Marker Pins overlaid on Document */}
            <div className="hidden sm:block pointer-events-none absolute inset-0 z-20">
              {FINDINGS.map((f, idx) => {
                const isActive = idx === activeIndex;
                const tone = TONE_CLASSES[f.tone];
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-label={`Inspect finding ${f.num}: ${f.code}`}
                    onClick={() => {
                      setActiveIndex(idx);
                      setPaused(true);
                    }}
                    style={{ left: `${f.dotX}%`, top: `${f.dotY}%` }}
                    className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full text-[11px] font-mono font-bold flex items-center justify-center transition-transform duration-300 cursor-pointer ${
                      isActive
                        ? `${tone.dot} scale-110`
                        : 'bg-slate-800/80 text-white hover:scale-105 scale-90 shadow-[0_0_0_2px_#ffffff]'
                    }`}
                  >
                    {f.num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Interactive Callout Stage (clean editorial drawer synced to active pin) */}
          <div className="border-t border-slate-200 bg-slate-950 text-slate-100 px-4 py-3.5">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400">
                <span
                  className={`h-2 w-2 rounded-xs ${TONE_CLASSES[activeFinding.tone].tick}`}
                  aria-hidden="true"
                />
                <span>
                  Finding {activeFinding.num} · {activeFinding.tag}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {FINDINGS.map((f, idx) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setActiveIndex(idx);
                      setPaused(true);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      idx === activeIndex
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {f.num}
                  </button>
                ))}
              </div>
            </div>

            <motion.div
              key={activeFinding.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              <p className="font-mono text-xs font-semibold text-white">
                {activeFinding.code}
              </p>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed min-h-[2.25rem]">
                {activeFinding.detail.slice(0, typedLen)}
                <span
                  aria-hidden="true"
                  className="qz-caret inline-block w-[1.5px] h-3.5 ml-0.5 bg-blue-400 align-middle"
                />
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
