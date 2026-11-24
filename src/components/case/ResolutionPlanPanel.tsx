import React, { useState } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import type { ComplaintDraftRecord, ResolutionStep } from '../../types';

interface ResolutionPlanPanelProps {
  complaintDraft: ComplaintDraftRecord | null;
  onUpdateChecklist: (nextChecklist: ResolutionStep[]) => Promise<void>;
  onGoToComplaint: () => void;
}

const CATEGORY_LABELS: Record<ResolutionStep['category'], string> = {
  immediate: 'First Action',
  attachments: 'Documents to Attach',
  contact: 'Support Channel',
  include: 'Required Facts',
  escalation: 'If Rejected or Delayed',
};

export const ResolutionPlanPanel: React.FC<ResolutionPlanPanelProps> = ({
  complaintDraft,
  onUpdateChecklist,
  onGoToComplaint,
}) => {
  const [savingId, setSavingId] = useState<string | null>(null);

  if (!complaintDraft) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
        No resolution plan generated yet. Run the workflow to create your actionable checklist.
      </div>
    );
  }

  const completedCount = complaintDraft.checklist.filter((s) => s.completed).length;

  const toggleStep = async (stepId: string) => {
    setSavingId(stepId);
    try {
      const next = complaintDraft.checklist.map((step) =>
        step.id === stepId ? { ...step, completed: !step.completed } : step
      );
      await onUpdateChecklist(next);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Actionable Resolution Plan
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Generated via Resolution MCP Server · {completedCount} of {complaintDraft.checklist.length} steps completed
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToComplaint}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          Open Complaint Editor
        </button>
      </div>

      <ol className="divide-y divide-slate-200">
        {complaintDraft.checklist.map((step, index) => (
          <li key={step.id} className="py-4 first:pt-0 last:pb-0">
            <button
              type="button"
              disabled={savingId === step.id}
              onClick={() => toggleStep(step.id)}
              className="w-full text-left flex items-start gap-3.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-1"
            >
              {step.completed ? (
                <CheckSquare className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Square className="h-5 w-5 text-slate-400 group-hover:text-blue-700 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-blue-700">0{index + 1}.</span>
                  <span>{CATEGORY_LABELS[step.category]}</span>
                </div>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    step.completed ? 'line-through text-slate-400' : 'text-slate-900'
                  }`}
                >
                  {step.title}
                </p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};
