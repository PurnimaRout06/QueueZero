import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { api, subscribeCaseWorkflowEvents } from '../../api/client';
import type {
  CaseDetailPayload,
  CaseStatus,
  ResolutionStep,
  WorkflowRunRecord,
} from '../../types';
import { LiveWorkflowView } from '../workflow/LiveWorkflowView';
import { AssessmentPanel } from './AssessmentPanel';
import { CaseTimelinePanel } from './CaseTimelinePanel';
import { ComplaintEditorPanel } from './ComplaintEditorPanel';
import { ResolutionPlanPanel } from './ResolutionPlanPanel';

export type CaseTabId = 'workflow' | 'assessment' | 'plan' | 'complaint' | 'timeline';

interface CaseWorkspacePageProps {
  caseId: string;
  initialTab?: CaseTabId;
  geminiConfigured: boolean;
  onBack: () => void;
  onCaseDeleted: () => void;
}

export const CaseWorkspacePage: React.FC<CaseWorkspacePageProps> = ({
  caseId,
  initialTab = 'workflow',
  geminiConfigured,
  onBack,
  onCaseDeleted,
}) => {
  const [detail, setDetail] = useState<CaseDetailPayload | null>(null);
  const [liveRun, setLiveRun] = useState<WorkflowRunRecord | null>(null);
  const [activeTab, setActiveTab] = useState<CaseTabId>(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const sseAbortRef = useRef<(() => void) | null>(null);

  const loadDetail = useCallback(async () => {
    try {
      const payload = await api.getCase(caseId);
      setDetail(payload);
      if (payload.workflowRun) {
        setLiveRun(payload.workflowRun);
      }
      setError(null);
      return payload;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load case details.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const attachSseStream = useCallback(() => {
    if (sseAbortRef.current) {
      sseAbortRef.current();
    }
    sseAbortRef.current = subscribeCaseWorkflowEvents(caseId, {
      onSnapshot: (run) => {
        if (run) setLiveRun(run);
      },
      onEvent: (_evt, run) => {
        setLiveRun({ ...run });
      },
      onState: (run) => {
        setLiveRun({ ...run });
      },
      onComplete: (run) => {
        setLiveRun({ ...run });
        loadDetail();
      },
      onError: (msg) => {
        setError(msg);
        loadDetail();
      },
    });
  }, [caseId, loadDetail]);

  useEffect(() => {
    let mounted = true;
    loadDetail().then((payload) => {
      if (!mounted) return;
      if (payload?.workflowRun?.status === 'running' || payload?.caseRecord.status === 'under_review') {
        attachSseStream();
      }
    });

    return () => {
      mounted = false;
      if (sseAbortRef.current) {
        sseAbortRef.current();
      }
    };
  }, [loadDetail, attachSseStream]);

  const handleRunAnalysis = async (demoMode: boolean) => {
    setError(null);
    attachSseStream();
    await api.startAnalysis(caseId, demoMode);
  };

  const handleUpdateChecklist = async (nextChecklist: ResolutionStep[]) => {
    const res = await api.updateDraft(caseId, { checklist: nextChecklist });
    setDetail((prev) => (prev ? { ...prev, complaintDraft: res.complaintDraft } : prev));
  };

  const handleSaveDraft = async (draftContent: string, approve: boolean) => {
    const res = await api.updateDraft(caseId, { draftContent, approve });
    setDetail((prev) => (prev ? { ...prev, complaintDraft: res.complaintDraft } : prev));
    await loadDetail();
  };

  const handleRegenerateDraft = async () => {
    const res = await api.regenerateDraft(caseId);
    setDetail((prev) => (prev ? { ...prev, complaintDraft: res.complaintDraft } : prev));
    await loadDetail();
  };

  const handleUpdateStatus = async (status: CaseStatus, createReminder: boolean) => {
    await api.updateStatus(caseId, status, createReminder);
    await loadDetail();
  };

  const handleUploadFiles = async (files: File[]) => {
    await api.uploadDocuments(caseId, files);
    await loadDetail();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteCase(caseId);
      onCaseDeleted();
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-24 rounded-xl bg-slate-200/70 animate-pulse" />
        <div className="mt-6 h-96 rounded-xl bg-slate-200/50 animate-pulse" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || 'Case not found.'}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { caseRecord, documents, evidence, assessment, complaintDraft, activity, matchedPolicies } =
    detail;
  const activeRun = liveRun || detail.workflowRun;
  const isRunning = activeRun?.status === 'running';

  const tabs: Array<{ id: CaseTabId; label: string }> = [
    { id: 'workflow', label: 'Live AI Workflow' },
    { id: 'assessment', label: 'Evidence & Policy Assessment' },
    { id: 'plan', label: 'Resolution Plan' },
    { id: 'complaint', label: 'Complaint Editor' },
    { id: 'timeline', label: 'Case Timeline & Files' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 self-start"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </button>

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 self-start sm:self-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Case
        </button>
      </div>

      {/* Case Summary Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="font-medium text-blue-700">{caseRecord.category}</span>
              <span aria-hidden="true">·</span>
              <span>{caseRecord.company}</span>
              <span aria-hidden="true">·</span>
              <span>{caseRecord.productName}</span>
              {caseRecord.isDemo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-blue-700">Demo Data</span>
                </>
              )}
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900">
              {caseRecord.title}
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
              {caseRecord.description}
            </p>
          </div>

          <div className="shrink-0 text-left lg:text-right text-xs text-slate-500 space-y-1">
            <p>
              Case Status:{' '}
              <span className="font-semibold text-slate-900 capitalize">
                {caseRecord.status.replace(/_/g, ' ')}
              </span>
            </p>
            <p className="tabular-nums">{documents.length} uploaded document(s)</p>
            {assessment && (
              <p>
                Assessment:{' '}
                <span
                  className={`font-semibold ${
                    assessment.assessmentStatus === 'Supported'
                      ? 'text-emerald-700'
                      : assessment.assessmentStatus === 'Unsupported'
                      ? 'text-red-700'
                      : 'text-amber-700'
                  }`}
                >
                  {assessment.assessmentStatus}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Case sections"
          className="mt-6 flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Active Tab Content */}
      <div className="mt-6">
        {activeTab === 'workflow' && (
          <LiveWorkflowView
            workflowRun={activeRun}
            assessment={assessment}
            complaintDraft={complaintDraft}
            geminiConfigured={geminiConfigured}
            isRunning={isRunning}
            onRunAnalysis={handleRunAnalysis}
            onOpenTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === 'assessment' && (
          <AssessmentPanel
            assessment={assessment}
            evidence={evidence}
            matchedPolicies={matchedPolicies}
            onGoToWorkflow={() => setActiveTab('workflow')}
          />
        )}

        {activeTab === 'plan' && (
          <ResolutionPlanPanel
            complaintDraft={complaintDraft}
            onUpdateChecklist={handleUpdateChecklist}
            onGoToComplaint={() => setActiveTab('complaint')}
          />
        )}

        {activeTab === 'complaint' && (
          <ComplaintEditorPanel
            caseTitle={caseRecord.title}
            complaintDraft={complaintDraft}
            onSaveDraft={handleSaveDraft}
            onRegenerate={handleRegenerateDraft}
          />
        )}

        {activeTab === 'timeline' && (
          <CaseTimelinePanel
            caseRecord={caseRecord}
            documents={documents}
            complaintDraft={complaintDraft}
            activity={activity}
            onUpdateStatus={handleUpdateStatus}
            onUploadFiles={handleUploadFiles}
          />
        )}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 id="case-delete-title" className="font-display text-base font-bold text-slate-900">
              Permanently delete this case?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              All uploaded documents, extracted evidence, assessments, and complaint drafts for{' '}
              <span className="font-semibold">{caseRecord.title}</span> will be deleted.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Case'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
