import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Lock,
  Play,
  Scale,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { HeroLiveScanDemo } from './landing/HeroLiveScanDemo';
import { WorkflowStepShowcase } from './landing/WorkflowStepShowcase';

interface LandingPageProps {
  onResolveIssue: () => void;
  onOpenAuth: () => void;
}

const COVERAGE_ITEMS: Array<{ label: string; status: 'Live' | 'Rolling out' }> = [
  { label: 'NovaTech ApexBook KB', status: 'Live' },
  { label: 'Zenith ProBook KB', status: 'Live' },
  { label: 'LumenBook Studio KB', status: 'Live' },
  { label: 'USB-C PD Charging Policy', status: 'Live' },
  { label: 'Authorized Reseller Audit', status: 'Live' },
  { label: 'Consumer Statutory Guide', status: 'Live' },
  { label: 'Evidence MCP Server', status: 'Live' },
  { label: 'Policy MCP Server', status: 'Live' },
  { label: 'Resolution MCP Server', status: 'Live' },
  { label: 'Refund Requests', status: 'Rolling out' },
  { label: 'Service Complaints', status: 'Rolling out' },
  { label: 'Subscription Cancellation', status: 'Rolling out' },
  { label: 'Billing Disputes', status: 'Rolling out' },
  { label: 'Consumer Grievances', status: 'Rolling out' },
];

const HERO_VERBS = [
  { verb: 'Upload', rest: 'your invoice and warranty documentation.' },
  { verb: 'Extract', rest: 'line-cited facts via Evidence MCP.' },
  { verb: 'Map', rest: 'the exact policy clauses that apply.' },
  { verb: 'Audit', rest: 'missing evidence and exclusions honestly.' },
  { verb: 'Approve', rest: 'your formal complaint with full control.' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onResolveIssue, onOpenAuth }) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="bg-slate-50 overflow-x-hidden">
      {/* Hero Section with Animated Live Scan Stage */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-22">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 mb-3">
              QueueZero · Proof-Carrying Administrative Resolution
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.08] [text-wrap:balance]">
              Less paperwork. More progress.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              Every conclusion is linked to the exact invoice line and policy clause it relies on—so you prepare defensible warranty claims and consumer complaints without guesswork.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={onResolveIssue}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Resolve My Issue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center px-5 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                Sign In or Create Account
              </button>
            </div>

            {/* Staggered 5-Verb Architectural List */}
            <ol className="mt-8 pt-6 border-t border-slate-200 space-y-2.5">
              {HERO_VERBS.map((item, idx) => (
                <motion.li
                  key={item.verb}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.12 + idx * 0.07 }}
                  className="text-sm sm:text-[15px] text-slate-600 flex items-baseline gap-2"
                >
                  <span className="font-semibold text-blue-700 shrink-0">{item.verb}</span>
                  <span>{item.rest}</span>
                </motion.li>
              ))}
            </ol>
          </motion.div>

          <div className="lg:col-span-6">
            <HeroLiveScanDemo />
          </div>
        </div>
      </section>

      {/* Continuous Horizontal Coverage Marquee */}
      <section
        aria-label="Warranty policy and workflow coverage"
        className="border-t border-b border-slate-200 bg-white py-12 overflow-hidden"
      >
        <div className="mx-auto max-w-3xl px-4 text-center mb-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Curated policy knowledge base · extensible MCP architecture
          </p>
          <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
            MVP built for Laptop Warranty &amp; Consumer Complaint resolution across curated policies, with modular MCP servers ready for additional consumer workflows.
          </p>
        </div>

        <div className="qz-marquee-viewport relative w-full overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-white to-transparent z-10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-white to-transparent z-10"
          />

          <div className="qz-marquee-track gap-3.5">
            {[0, 1].map((dup) => (
              <ul
                key={dup}
                aria-hidden={dup === 1}
                className="flex items-center gap-3.5 pr-3.5"
              >
                {COVERAGE_ITEMS.map((item) => (
                  <li
                    key={`${dup}-${item.label}`}
                    className="inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/90 px-4 py-2.5 font-mono text-xs text-slate-800 whitespace-nowrap transition-colors hover:border-slate-300"
                  >
                    <span
                      className={`h-2 w-2 rounded-xs shrink-0 ${
                        item.status === 'Live' ? 'bg-emerald-600' : 'bg-slate-400'
                      }`}
                    />
                    <span className="font-medium">{item.label}</span>
                    <span className="border-l border-slate-200 pl-2.5 text-[10px] uppercase tracking-wider text-slate-500">
                      {item.status}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 px-4">
          <strong className="text-slate-800">9</strong> live MVP modules &amp; curated policies ·{' '}
          <strong className="text-slate-800">5</strong> extensible workflows on the roadmap
        </p>
      </section>

      {/* Live Workflow Preview Frame with Sweeping Corner Brackets */}
      <section className="bg-slate-50 py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            See it in action
          </p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Watch the 3-MCP resolution pipeline run step by step.
          </h2>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-[0_32px_70px_-20px_rgba(15,23,42,0.18)] overflow-hidden text-left">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <div className="ml-3 flex-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-center font-mono text-[11px] text-slate-500 truncate">
                queuezero.app / case / QZ-2026-88412 / live-workflow
              </div>
            </div>

            <div className="relative aspect-[16/9] bg-slate-950 overflow-hidden flex items-center justify-center p-6 sm:p-10">
              {!imgFailed && (
                <img
                  src="/src/assets/images/hero_warranty_desk_1795449485199.jpg"
                  alt="Laptop beside printed purchase invoice and warranty policy sheets"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="absolute inset-0 h-full w-full object-cover opacity-25"
                />
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-blue-950/85"
              />

              {/* Sweeping Corner Scan Brackets */}
              <div
                aria-hidden="true"
                className="qz-bracket-tl pointer-events-none absolute top-5 left-5 h-8 w-8 border-t-2 border-l-2 border-slate-300/45"
              />
              <div
                aria-hidden="true"
                className="qz-bracket-tr pointer-events-none absolute top-5 right-5 h-8 w-8 border-t-2 border-r-2 border-slate-300/45"
              />
              <div
                aria-hidden="true"
                className="qz-bracket-bl pointer-events-none absolute bottom-5 left-5 h-8 w-8 border-b-2 border-l-2 border-slate-300/45"
              />
              <div
                aria-hidden="true"
                className="qz-bracket-br pointer-events-none absolute bottom-5 right-5 h-8 w-8 border-b-2 border-r-2 border-slate-300/45"
              />

              <div className="relative z-10 max-w-2xl w-full text-center space-y-5">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px] font-mono text-slate-200">
                  {[
                    'Upload',
                    'Evidence MCP',
                    'Policy MCP',
                    'AI Audit',
                    'Resolution MCP',
                    'Approval',
                  ].map((node, idx) => (
                    <div
                      key={node}
                      className="rounded-lg border border-slate-700/90 bg-slate-900/90 px-2 py-2.5 text-center"
                    >
                      <span className="block text-[9px] text-blue-400 mb-0.5">0{idx + 1}</span>
                      <span className="font-semibold">{node}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={onResolveIssue}
                    className="group inline-flex items-center gap-3 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(37,99,235,0.45)] hover:bg-blue-500 transition-colors cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    Launch Interactive Sample Workflow
                  </button>
                  <p className="text-xs text-slate-300">
                    Inspect real stdio MCP tool calls, SSE node timings, and approval-gated drafts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Stage Continuous Loop Showcase */}
      <WorkflowStepShowcase />

      {/* Sample Use Case Section */}
      <section id="sample-case" className="border-t border-slate-200 bg-slate-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                Sample MVP Workflow
              </p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                6-month-old laptop stops charging
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                Instead of guessing whether power delivery defects are covered or missing a required serial number, QueueZero audits your documentation step by step before you contact support.
              </p>
              <button
                type="button"
                onClick={onResolveIssue}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors"
              >
                Try the Sample Warranty Case
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
              <div className="p-5 flex items-start gap-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Verified from Purchase Invoice
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Invoice <span className="font-mono text-slate-800">INV-2026-88412</span> · Purchase Date <span className="font-mono text-slate-800">May 18, 2026</span> · Authorized Reseller confirmed on Line 4.
                  </p>
                </div>
              </div>

              <div className="p-5 flex items-start gap-4">
                <Scale className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Matched Policy Clauses via Policy MCP
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Clause <span className="font-mono text-slate-800">NT-1.1</span> covers USB-C/motherboard charging controllers for 12 months; Clause <span className="font-mono text-slate-800">NT-2.4</span> excludes non-OEM chargers and liquid ingress.
                  </p>
                </div>
              </div>

              <div className="p-5 flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Flagged Limitations &amp; Next Step
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Notes that depot physical inspection is still required and prompts the user to attach underside serial label photo before approving the generated RMA complaint.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Privacy Section */}
      <section id="trust-privacy" className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Built around safety, honesty, and your control
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                QueueZero treats every uploaded document as untrusted data, never executes uploaded files, never invents missing invoice numbers or policy clauses, and never sends complaints without your explicit approval.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <ShieldCheck className="h-5 w-5 text-blue-700" />
                <p className="mt-2 text-sm font-semibold text-slate-900">Zero Fabricated Facts</p>
                <p className="mt-1 text-xs text-slate-600">
                  Missing fields become bracketed placeholders and explicit verification items.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <Lock className="h-5 w-5 text-blue-700" />
                <p className="mt-2 text-sm font-semibold text-slate-900">Full Deletion Control</p>
                <p className="mt-1 text-xs text-slate-600">
                  Delete any case at any time to purge its database records and uploaded files.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="font-medium text-slate-700 flex items-center gap-2">
            <FileSearch className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
            QueueZero · Less paperwork. More progress.
          </p>
          <p>MVP Scope: Laptop Warranty &amp; Consumer Complaint Resolution · Curated Sample Policy KB</p>
        </div>
      </footer>
    </div>
  );
};
