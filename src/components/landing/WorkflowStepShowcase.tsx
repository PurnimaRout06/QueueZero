import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, CheckCircle2, FileText, Lock, ShieldAlert, UploadCloud } from 'lucide-react';

const UPLOAD_FILES = [
  { name: 'invoice-novatech-88412.pdf', size: '420 KB', status: 'SHA-256 verified' },
  { name: 'warranty-card-scan.png', size: '1.4 MB', status: 'OCR ready' },
  { name: 'charging-port-photo.jpg', size: '890 KB', status: 'Attached' },
];

const EVIDENCE_FIELDS = [
  { key: 'Invoice #', val: 'INV-2026-88412', ref: 'Line 2' },
  { key: 'Purchase Date', val: 'May 18, 2026', ref: 'Line 3' },
  { key: 'Device Model', val: 'ApexBook 14 Pro', ref: 'Line 5' },
  { key: 'Seller', val: 'Apex Digital Retail', ref: 'Line 4' },
  { key: 'Policy Scope', val: '12-Month Hardware', ref: 'Clause NT-1.1' },
  { key: 'Gap Check', val: 'Chassis S/N Photo', ref: 'Flagged' },
];

const CLAUSE_CARDS = [
  { code: 'NT-1.1', title: 'Power & Charging IC', scope: '12-month coverage' },
  { code: 'NT-2.4', title: 'OEM & Liquid Exclusions', scope: 'Condition check' },
  { code: 'NT-3.2', title: 'Authorized Reseller', scope: 'Receipt required' },
  { code: 'ZN-1.2', title: 'USB-C PD Failure', scope: 'Zenith ProBook' },
  { code: 'LM-1.0', title: 'Hardware Warranty', scope: 'LumenBook Studio' },
  { code: 'KB-004', title: 'Consumer Escalation', scope: 'Statutory notice' },
];

const AUDIT_RULES = [
  { label: 'Purchase window <= 12 months', time: '0.3s', outcome: 'Supported' as const },
  { label: 'USB-C charging controller defect', time: '0.4s', outcome: 'Supported' as const },
  { label: 'Authorized seller verification', time: '0.2s', outcome: 'Supported' as const },
  { label: 'Underside chassis serial photo', time: '0.5s', outcome: 'Verify' as const },
];

const APPROVAL_STAGES = [
  {
    state: 'Draft Composed',
    detail: 'Grounded strictly on Line 2–4 facts and Clause NT-1.1.',
  },
  {
    state: '5-Step Checklist Ready',
    detail: 'Prompts user to attach serial photo before sending RMA.',
  },
  {
    state: 'Awaiting User Sign-Off',
    detail: 'Human approval required before Copy, Download, or Track.',
  },
];

export const WorkflowStepShowcase: React.FC = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 1500);
    return () => window.clearInterval(id);
  }, []);

  const activeFileIdx = tick % UPLOAD_FILES.length;
  const activeFieldIdx = tick % EVIDENCE_FIELDS.length;
  const activeClauseIdx = tick % CLAUSE_CARDS.length;
  const activeRuleIdx = tick % AUDIT_RULES.length;
  const activeApprovalIdx = tick % APPROVAL_STAGES.length;

  return (
    <section id="how-it-works" className="border-t border-slate-200 bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            How it works
          </p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            A continuous loop from invoice upload to approved resolution.
          </h2>
          <p className="mt-3 text-slate-600 text-base leading-relaxed">
            Built for transparency rather than guesswork. Every conclusion runs across three independent MCP servers and separates verified facts from unconfirmed claims.
          </p>
        </div>

        <div className="mt-14 divide-y divide-slate-200">
          {/* STEP 01: UPLOAD */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center py-12 first:pt-0"
          >
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-15px_rgba(15,23,42,0.1)] overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="ml-2 font-mono text-[11px] text-slate-500">
                    upload · evidence-intake.pdf
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center">
                    <UploadCloud className="mx-auto h-6 w-6 text-blue-700 mb-2" aria-hidden="true" />
                    <p className="text-xs font-semibold text-slate-900">
                      Drop invoice, warranty card, or defect photos
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      PDF, PNG, JPG · Untrusted data sandbox · Max 10 MB
                    </p>
                  </div>

                  <div className="space-y-2 overflow-hidden">
                    {UPLOAD_FILES.map((file, idx) => {
                      const active = idx === activeFileIdx;
                      return (
                        <div
                          key={file.name}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-xs transition-colors duration-300 ${
                            active
                              ? 'border-blue-300 bg-blue-50/70'
                              : 'border-slate-200 bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                            <span className="font-mono text-slate-800 truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                            <span className="text-slate-500">{file.size}</span>
                            <span className={active ? 'text-blue-700 font-semibold' : 'text-emerald-700'}>
                              {file.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-medium text-slate-400">01</span>
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                  Upload
                </span>
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold text-slate-900">
                Ingest invoices and receipts safely.
              </h3>
              <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
                Upload PDF invoices or receipt photos. QueueZero parses text deterministically, routes scanned images through OCR fallback, and isolates all uploaded content as untrusted data.
              </p>
              <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>Deterministic PDF parsing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>Vision OCR for receipt scans</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>Prompt-injection sanitized</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>Path-confined storage</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* STEP 02: EXTRACT (EVIDENCE MCP) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center py-12"
          >
            <div className="lg:col-span-6">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-medium text-slate-400">02</span>
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                  Extract · Evidence MCP
                </span>
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold text-slate-900">
                Pinpoint every fact with a source line.
              </h3>
              <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
                The independent Evidence MCP Server extracts purchase date, invoice number, model, seller, and serial number—returning explicit source line numbers and flagging gaps without guessing.
              </p>
              <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>extract_invoice_details</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>get_document_evidence</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>Line-level provenance</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>identify_missing_information</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-15px_rgba(15,23,42,0.1)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="ml-2 font-mono text-[11px] text-slate-500">
                      evidence-mcp · structured fields
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-blue-700 font-semibold">
                    STDIO MCP
                  </span>
                </div>
                <div className="p-5 grid grid-cols-2 gap-2.5">
                  {EVIDENCE_FIELDS.map((item, idx) => {
                    const active = idx === activeFieldIdx;
                    const isFlagged = item.ref === 'Flagged';
                    return (
                      <div
                        key={item.key}
                        className={`rounded-xl border p-3 transition-all duration-300 ${
                          active
                            ? isFlagged
                              ? 'border-amber-400 bg-amber-50/80 shadow-xs'
                              : 'border-blue-400 bg-blue-50/80 shadow-xs'
                            : 'border-slate-200 bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                          <span className="text-slate-500 uppercase">{item.key}</span>
                          <span
                            className={
                              isFlagged
                                ? 'text-amber-700 font-semibold'
                                : 'text-blue-700 font-semibold'
                            }
                          >
                            {item.ref}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-xs font-semibold text-slate-900 truncate">
                          {item.val}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* STEP 03: RETRIEVE (POLICY MCP) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center py-12"
          >
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-15px_rgba(15,23,42,0.1)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="ml-2 font-mono text-[11px] text-slate-500">
                      policy-mcp · curated warranty KB
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-blue-700 font-semibold">
                    CURATED KB
                  </span>
                </div>
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {CLAUSE_CARDS.map((clause, idx) => {
                    const active = idx === activeClauseIdx;
                    return (
                      <div
                        key={clause.code}
                        className={`rounded-xl border p-3 transition-all duration-300 ${
                          active
                            ? 'border-blue-500 bg-blue-50/90 -translate-y-0.5 shadow-sm'
                            : 'border-slate-200 bg-slate-50/60'
                        }`}
                      >
                        <p className="font-mono text-xs font-bold text-blue-700">{clause.code}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-900 leading-snug">
                          {clause.title}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">{clause.scope}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-medium text-slate-400">03</span>
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                  Map · Policy MCP
                </span>
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold text-slate-900">
                Retrieve the exact clauses that govern your device.
              </h3>
              <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
                The Policy MCP Server searches curated manufacturer warranties and consumer statutory guides—explicitly disclosing when an unverified brand lacks a matching entry in the knowledge base.
              </p>
              <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>search_warranty_policy</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>get_policy_clause</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>check_warranty_conditions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>Zero invented clauses</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* STEP 04: ANALYZE (PROOF-CARRYING AUDIT) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center py-12"
          >
            <div className="lg:col-span-6">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-medium text-slate-400">04</span>
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                  Analyze · Proof-Carrying Audit
                </span>
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold text-slate-900">
                Compare evidence against exclusions, honestly.
              </h3>
              <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
                QueueZero evaluates coverage conditions, defect descriptions, and exclusions side by side—marking every claim Supported, Unsupported, or Needs Verification with clear limitations.
              </p>
              <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>Date &amp; seller validation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>Negation-safe exclusion scan</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>Gemini + Deterministic mode</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>Explicit uncertainty flags</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-15px_rgba(15,23,42,0.1)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="ml-2 font-mono text-[11px] text-slate-500">
                      ai-engine · condition audit
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">SSE STREAM</span>
                </div>
                <div className="p-5 space-y-2.5">
                  {AUDIT_RULES.map((rule, idx) => {
                    const active = idx === activeRuleIdx;
                    return (
                      <div
                        key={rule.label}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-xs transition-all duration-300 ${
                          active
                            ? 'border-blue-400 bg-blue-50/70'
                            : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {rule.outcome === 'Supported' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                          )}
                          <span className="font-medium text-slate-800 truncate">{rule.label}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                          <span
                            className={
                              rule.outcome === 'Supported'
                                ? 'text-emerald-700 font-semibold'
                                : 'text-amber-700 font-semibold'
                            }
                          >
                            {rule.outcome}
                          </span>
                          <span className="text-slate-400 tabular-nums">{rule.time}</span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-100">
                    <span>Proof-Carrying Reasoning</span>
                    <span>
                      <strong className="text-slate-900">4 checks</strong> audited
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* STEP 05: APPROVE & TRACK (RESOLUTION MCP) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center py-12 pb-0"
          >
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-15px_rgba(15,23,42,0.1)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="ml-2 font-mono text-[11px] text-slate-500">
                      resolution-mcp · complaint-draft.txt
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-700 font-semibold">
                    <Lock className="h-3 w-3" />
                    APPROVAL GATE
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="font-display text-slate-900">
                        Warranty RMA &amp; Consumer Request
                      </strong>
                      <span className="font-mono text-[11px] text-blue-700 font-semibold">
                        Verified Facts Only
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-[11px] text-slate-600 leading-relaxed">
                      Ref: INV-2026-88412 · Purchased May 18, 2026 via Apex Digital Retail · Issue: USB-C PD charging failure (Clause NT-1.1). Attachment needed: [Underside S/N Photo].
                    </p>
                  </div>

                  <div className="space-y-2">
                    {APPROVAL_STAGES.map((st, idx) => {
                      const active = idx === activeApprovalIdx;
                      return (
                        <div
                          key={st.state}
                          className={`rounded-lg border px-3 py-2 text-xs transition-all duration-300 ${
                            active
                              ? 'border-emerald-400 bg-emerald-50/70'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{st.state}</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              0{idx + 1}/03
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-600">{st.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-medium text-slate-400">05</span>
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                  Approve &amp; Track · Resolution MCP
                </span>
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold text-slate-900">
                Edit, approve, export, and track follow-ups.
              </h3>
              <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
                The Resolution MCP Server drafts a factual complaint with bracketed placeholders for any missing details—locking Copy and Download behind your explicit human approval.
              </p>
              <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>generate_complaint_draft</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>create_resolution_checklist</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>Human sign-off required</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-700 shrink-0" />
                  <span>Follow-up reminder timeline</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
