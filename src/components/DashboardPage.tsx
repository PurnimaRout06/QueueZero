import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  FolderOpen,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { CaseRecord } from '../types';

interface DashboardPageProps {
  userName: string;
  isDemoSession: boolean;
  cases: CaseRecord[];
  recentActivity: Array<{
    id: string;
    caseId: string;
    caseTitle: string;
    action: string;
    description: string;
    timestamp: string;
  }>;
  loading: boolean;
  onStartNewCase: () => void;
  onOpenCase: (caseId: string) => void;
  onDeleteCase: (caseId: string) => Promise<void>;
}

const STATUS_LABELS: Record<CaseRecord['status'], string> = {
  draft: 'Draft',
  under_review: 'Under review',
  ready_to_submit: 'Ready to submit',
  submitted_by_user: 'Submitted by user',
  awaiting_response: 'Awaiting response',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  userName,
  isDemoSession,
  cases,
  recentActivity,
  loading,
  onStartNewCase,
  onOpenCase,
  onDeleteCase,
}) => {
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'ready' | 'completed'>('all');
  const [query, setQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const metrics = useMemo(() => {
    const total = cases.length;
    const completed = cases.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
    const inProgress = cases.filter((c) => c.status !== 'resolved' && c.status !== 'closed').length;
    return { total, inProgress, completed };
  }, [cases]);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (filter === 'in_progress' && (c.status === 'resolved' || c.status === 'closed')) {
        return false;
      }
      if (filter === 'ready' && c.status !== 'ready_to_submit') {
        return false;
      }
      if (filter === 'completed' && c.status !== 'resolved' && c.status !== 'closed') {
        return false;
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.productName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cases, filter, query]);

  const casePendingDelete = cases.find((c) => c.id === confirmDeleteId);

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await onDeleteCase(confirmDeleteId);
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Resolution Workspace
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Signed in as {userName}
            {isDemoSession ? ' · Demo Session (Sample data clearly labeled)' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewCase}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Start New Case
        </button>
      </div>

      {/* Summary Metric Strip (Single-Elevation Hairline Grid) */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 rounded-xl border border-slate-200 bg-white divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Total Cases</p>
          <p className="mt-1 font-display text-3xl font-bold text-slate-900 tabular-nums">
            {metrics.total}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Cases In Progress</p>
          <p className="mt-1 font-display text-3xl font-bold text-blue-700 tabular-nums">
            {metrics.inProgress}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Completed Cases</p>
          <p className="mt-1 font-display text-3xl font-bold text-emerald-700 tabular-nums">
            {metrics.completed}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cases List */}
        <div className="lg:col-span-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'in_progress', label: 'In Progress' },
                  { id: 'ready', label: 'Ready to Submit' },
                  { id: 'completed', label: 'Completed' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    filter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Search cases"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, brand, product..."
                className="w-full sm:w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="p-10 text-center">
                <FolderOpen className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="mt-3 font-display text-base font-semibold text-slate-900">
                  {cases.length === 0 ? 'No resolution cases yet' : 'No matching cases found'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {cases.length === 0
                    ? 'Start a new laptop warranty or consumer complaint case to inspect evidence and policies.'
                    : 'Try clearing your search filter or creating a new case.'}
                </p>
                <button
                  type="button"
                  onClick={onStartNewCase}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Start New Case
                </button>
              </div>
            ) : (
              filteredCases.map((c) => (
                <div
                  key={c.id}
                  className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenCase(c.id)}
                        className="text-left font-display text-base font-semibold text-slate-900 hover:text-blue-700 transition-colors truncate"
                      >
                        {c.title}
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{c.company}</span>
                      <span aria-hidden="true">·</span>
                      <span>{c.productName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{c.documentCount ?? 0} doc(s)</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">{STATUS_LABELS[c.status]}</span>
                      {c.assessmentStatus && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              c.assessmentStatus === 'Supported'
                                ? 'text-emerald-700 font-medium'
                                : c.assessmentStatus === 'Unsupported'
                                ? 'text-red-700 font-medium'
                                : 'text-amber-700 font-medium'
                            }
                          >
                            Assessment: {c.assessmentStatus}
                          </span>
                        </>
                      )}
                      {c.isDemo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-blue-700 font-medium">Demo Data</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenCase(c.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors whitespace-nowrap"
                    >
                      Open Case
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete case ${c.title}`}
                      onClick={() => setConfirmDeleteId(c.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Recent Activity */}
        <aside className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-base font-semibold text-slate-900">Recent Activity</h2>
          <p className="mt-0.5 text-xs text-slate-500">Latest logged actions across your cases</p>

          {recentActivity.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No activity recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {recentActivity.slice(0, 7).map((act) => (
                <li key={act.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => onOpenCase(act.caseId)}
                    className="text-left text-xs font-semibold text-slate-800 hover:text-blue-700"
                  >
                    {act.caseTitle}
                  </button>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{act.description}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono tabular-nums">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    <span>{new Date(act.timestamp).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* Delete Confirmation Dialog */}
      {casePendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 id="delete-dialog-title" className="font-display text-base font-bold text-slate-900">
                  Delete case and uploaded documents?
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">
                  This permanently removes <span className="font-semibold">{casePendingDelete.title}</span> along with its uploaded files, extracted evidence, and drafts.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
