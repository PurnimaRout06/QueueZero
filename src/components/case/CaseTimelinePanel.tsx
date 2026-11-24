import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, FileText, Upload } from 'lucide-react';
import type {
  CaseActivityRecord,
  CaseRecord,
  CaseStatus,
  ComplaintDraftRecord,
  DocumentRecord,
} from '../../types';

interface CaseTimelinePanelProps {
  caseRecord: CaseRecord;
  documents: DocumentRecord[];
  complaintDraft: ComplaintDraftRecord | null;
  activity: CaseActivityRecord[];
  onUpdateStatus: (status: CaseStatus, createReminder: boolean) => Promise<void>;
  onUploadFiles: (files: File[]) => Promise<void>;
}

const TIMELINE_STAGES: Array<{ id: CaseStatus; label: string; description: string }> = [
  { id: 'draft', label: 'Draft', description: 'Case created; awaiting document review.' },
  { id: 'under_review', label: 'Under review', description: 'Evidence & policy analysis active.' },
  { id: 'ready_to_submit', label: 'Ready to submit', description: 'Assessment & draft generated.' },
  {
    id: 'submitted_by_user',
    label: 'Submitted by user',
    description: 'Approved draft manually sent by user.',
  },
  { id: 'awaiting_response', label: 'Awaiting response', description: 'Waiting for company RMA reply.' },
  { id: 'resolved', label: 'Resolved', description: 'Warranty repair or refund confirmed.' },
  { id: 'closed', label: 'Closed', description: 'Case archived.' },
];

export const CaseTimelinePanel: React.FC<CaseTimelinePanelProps> = ({
  caseRecord,
  documents,
  complaintDraft,
  activity,
  onUpdateStatus,
  onUploadFiles,
}) => {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createReminder, setCreateReminder] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleStageSelect = async (nextStatus: CaseStatus) => {
    setError(null);
    setUpdatingStatus(true);
    try {
      await onUpdateStatus(nextStatus, createReminder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update case status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAdditionalUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      await onUploadFiles(Array.from(files));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const currentIndex = TIMELINE_STAGES.findIndex((s) => s.id === caseRecord.status);

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Manual Case Status Progression */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Case Tracking Timeline
            </h2>
            <p className="text-xs text-slate-500">
              Update your submission and response milestones manually. QueueZero never marks a complaint submitted unless you approve and confirm it.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={createReminder}
              onChange={(e) => setCreateReminder(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-700"
            />
            Generate 5-day follow-up reminder
          </label>
        </div>

        {complaintDraft?.followUpNote && (
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-900">
            <CalendarClock className="h-4 w-4 text-blue-700 shrink-0" />
            <span>{complaintDraft.followUpNote}</span>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TIMELINE_STAGES.map((stage, idx) => {
            const isCurrent = stage.id === caseRecord.status;
            const isPast = currentIndex > idx;
            const requiresApproval =
              (stage.id === 'submitted_by_user' || stage.id === 'awaiting_response') &&
              complaintDraft?.approvalStatus !== 'approved';

            return (
              <button
                key={stage.id}
                type="button"
                disabled={updatingStatus || isCurrent}
                onClick={() => handleStageSelect(stage.id)}
                className={`text-left rounded-lg border p-3.5 transition-colors ${
                  isCurrent
                    ? 'border-blue-600 bg-blue-50/70'
                    : isPast
                    ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                } disabled:cursor-default`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{stage.label}</span>
                  {(isCurrent || isPast) && (
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${
                        isCurrent ? 'text-blue-700' : 'text-emerald-600'
                      }`}
                    />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{stage.description}</p>
                {requiresApproval && (
                  <p className="mt-1.5 text-[10px] font-medium text-amber-700">
                    Requires draft approval first
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Documents & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Uploaded Documents ({documents.length})
            </h3>
            <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? 'Uploading...' : 'Add File'}
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => handleAdditionalUpload(e.target.files)}
                className="sr-only"
              />
            </label>
          </div>

          {documents.length === 0 ? (
            <p className="text-sm text-slate-500">No documents attached to this case.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {documents.map((doc) => (
                <li key={doc.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-2.5">
                    <FileText className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.filename}</p>
                      <p className="text-xs text-slate-500">
                        {doc.fileType} · {Math.max(1, Math.round(doc.fileSize / 1024))} KB · Extraction:{' '}
                        {doc.extractionStatus}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-display text-base font-semibold text-slate-900 mb-4">
            Case Audit Activity Log
          </h3>
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">No activity entries yet.</p>
          ) : (
            <ol className="space-y-3">
              {activity.map((act) => (
                <li key={act.id} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0">
                  <div>
                    <p className="text-xs font-mono font-semibold text-blue-700">{act.action}</p>
                    <p className="mt-0.5 text-sm text-slate-700">{act.description}</p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                    {new Date(act.timestamp).toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
};
