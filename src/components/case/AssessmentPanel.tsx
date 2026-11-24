import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  HelpCircle,
  Scale,
  XCircle,
} from 'lucide-react';
import type { AssessmentRecord, EvidenceRecord, PolicyRecord } from '../../types';

interface AssessmentPanelProps {
  assessment: AssessmentRecord | null;
  evidence: EvidenceRecord[];
  matchedPolicies: PolicyRecord[];
  onGoToWorkflow: () => void;
}

export const AssessmentPanel: React.FC<AssessmentPanelProps> = ({
  assessment,
  evidence,
  matchedPolicies,
  onGoToWorkflow,
}) => {
  if (!assessment) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <HelpCircle className="h-8 w-8 text-slate-400 mx-auto" />
        <h2 className="mt-3 font-display text-lg font-semibold text-slate-900">
          No assessment generated yet
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Run the Live AI Resolution Workflow to extract invoice evidence and compare policy clauses.
        </p>
        <button
          type="button"
          onClick={onGoToWorkflow}
          className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Go to Live Workflow
        </button>
      </div>
    );
  }

  const statusMeta = {
    Supported: {
      icon: CheckCircle2,
      container: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
      iconColor: 'text-emerald-700',
      label: 'Supported — Evidence aligns with available policy criteria',
    },
    Unsupported: {
      icon: XCircle,
      container: 'border-red-200 bg-red-50/70 text-red-950',
      iconColor: 'text-red-700',
      label: 'Unsupported — Conflict or exclusion identified in available evidence',
    },
    'Unknown / Needs verification': {
      icon: AlertCircle,
      container: 'border-amber-200 bg-amber-50/70 text-amber-950',
      iconColor: 'text-amber-700',
      label: 'Unknown / Needs verification — Incomplete evidence or unverified manufacturer policy',
    },
  }[assessment.assessmentStatus];

  const StatusIcon = statusMeta.icon;

  return (
    <div className="space-y-6">
      {/* Assessment Status Banner (never color-only: explicit icon + label + rationale) */}
      <div className={`rounded-xl border p-5 ${statusMeta.container}`}>
        <div className="flex items-start gap-3.5">
          <StatusIcon className={`h-6 w-6 shrink-0 mt-0.5 ${statusMeta.iconColor}`} aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 text-xs font-medium opacity-80">
              <span>Assessment Status</span>
              <span aria-hidden="true">·</span>
              <span>
                {assessment.findings.analysisMode === 'live_ai'
                  ? 'Evaluated by Gemini 4 Hydrogen + MCP Tools'
                  : 'Evaluated by Demo Deterministic Mode + MCP Tools'}
              </span>
            </div>
            <h2 className="mt-1 font-display text-lg font-bold">{statusMeta.label}</h2>
            <p className="mt-2 text-sm leading-relaxed">{assessment.findings.summary}</p>
          </div>
        </div>
      </div>

      {/* Extracted Facts & Evidence Citations */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-blue-700" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-slate-900">
              Extracted Facts &amp; Source References
            </h3>
          </div>
          <p className="text-xs text-slate-500">{assessment.findings.evidenceQualitySummary}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Fact</th>
                <th className="px-6 py-3">Extracted Value</th>
                <th className="px-6 py-3">Verification &amp; Source</th>
                <th className="px-6 py-3">Evidence Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {evidence.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                    {ev.evidenceType}
                  </td>
                  <td className="px-6 py-3.5 font-mono text-xs text-slate-800">
                    {ev.extractedValue}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-600">
                    <p className="font-medium text-slate-800">
                      {ev.verificationStatus === 'verified_from_document'
                        ? 'Document Verified'
                        : ev.verificationStatus === 'user_supplied'
                        ? 'User Supplied'
                        : 'Missing from Documents'}
                    </p>
                    <p className="mt-0.5 text-slate-500">{ev.sourceReference}</p>
                  </td>
                  <td className="px-6 py-3.5 text-xs">
                    <span
                      className={`font-semibold ${
                        ev.confidence === 'High'
                          ? 'text-emerald-700'
                          : ev.confidence === 'Moderate'
                          ? 'text-blue-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {ev.confidence}
                    </span>
                    <p className="mt-0.5 text-slate-500 max-w-xs">{ev.confidenceReason}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Policy Assessment */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-700" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-slate-900">
              Policy Assessment (Retrieved via Policy MCP)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {matchedPolicies.length} curated policy source(s) referenced
          </span>
        </div>

        <div className="space-y-4">
          {assessment.findings.relevantClauses.map((clause) => (
            <div key={clause.clauseId} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-sm font-semibold text-slate-900">
                  <span className="font-mono text-blue-700 mr-2">{clause.clauseId}</span>
                  {clause.title}
                </p>
                <span className="text-xs text-slate-500">{clause.sourceDocument}</span>
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed">{clause.relevance}</p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-slate-800">Required Conditions</p>
                  <ul className="mt-1 space-y-1 text-slate-600 list-disc pl-4">
                    {clause.conditions.map((cond, idx) => (
                      <li key={idx}>{cond}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Potential Exclusions</p>
                  <ul className="mt-1 space-y-1 text-slate-600 list-disc pl-4">
                    {clause.exclusions.map((ex, idx) => (
                      <li key={idx}>{ex}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {assessment.findings.missingPolicyInfo.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
            <h4 className="text-xs font-semibold text-amber-900">Missing Policy Information</h4>
            <ul className="mt-1.5 space-y-1 text-xs text-amber-800 list-disc pl-4">
              {assessment.findings.missingPolicyInfo.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Missing Information & Analytical Limitations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Missing Information to Strengthen Claim
          </h3>
          {assessment.missingInformation.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-700">
              All core invoice and diagnostic fields are present.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc pl-5">
              {assessment.missingInformation.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Assessment Limitations &amp; Transparency
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc pl-5">
            {assessment.limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
