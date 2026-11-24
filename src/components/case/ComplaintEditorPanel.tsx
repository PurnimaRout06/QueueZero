import React, { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Download, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import type { ComplaintDraftRecord } from '../../types';

interface ComplaintEditorPanelProps {
  caseTitle: string;
  complaintDraft: ComplaintDraftRecord | null;
  onSaveDraft: (content: string, approve: boolean) => Promise<void>;
  onRegenerate: () => Promise<void>;
}

export const ComplaintEditorPanel: React.FC<ComplaintEditorPanelProps> = ({
  caseTitle,
  complaintDraft,
  onSaveDraft,
  onRegenerate,
}) => {
  const [content, setContent] = useState(complaintDraft?.draftContent || '');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setContent(complaintDraft?.draftContent || '');
  }, [complaintDraft?.draftContent, complaintDraft?.updatedAt]);

  if (!complaintDraft) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
        No complaint draft exists yet. Run the AI workflow first to generate a grounded complaint draft.
      </div>
    );
  }

  const isDirty = content !== complaintDraft.draftContent;
  const isApproved = complaintDraft.approvalStatus === 'approved' && !isDirty;

  const handleSaveOnly = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await onSaveDraft(content, false);
      setFeedback('Draft changes saved. Review and click Approve Draft when ready.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await onSaveDraft(content, true);
      setFeedback('Draft approved. You can now copy or download and update your case submission status.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setFeedback(null);
    try {
      await onRegenerate();
      setFeedback('Draft regenerated via Resolution MCP Server.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = caseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    a.download = `queuezero-complaint-${slug || 'draft'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Human Approval Gate</span>
            <span aria-hidden="true">·</span>
            <span className={isApproved ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
              {isApproved ? 'Approved by User' : 'Pending User Review & Approval'}
            </span>
          </div>
          <h2 className="mt-1 font-display text-lg font-semibold text-slate-900">
            Complaint Letter Editor
          </h2>
          <p className="text-xs text-slate-500">
            QueueZero never sends complaints automatically. Replace any bracketed placeholders before approving.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download .txt
          </button>

          <button
            type="button"
            disabled={regenerating || saving}
            onClick={handleRegenerate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-900">
          {feedback}
        </div>
      )}

      <div>
        <label htmlFor="complaint-draft-editor" className="sr-only">
          Complaint letter content
        </label>
        <textarea
          id="complaint-draft-editor"
          rows={16}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-slate-50/40 p-4 font-mono text-xs sm:text-sm text-slate-900 leading-relaxed focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          {isApproved ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Approved. You may now send this externally and mark the case as Submitted.</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Approval is required before marking the case as Submitted by User.</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isDirty && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveOnly}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Save Edits
            </button>
          )}
          <button
            type="button"
            disabled={saving || isApproved}
            onClick={handleApprove}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isApproved ? 'Draft Approved' : saving ? 'Approving...' : 'Approve Draft'}
          </button>
        </div>
      </div>
    </div>
  );
};
