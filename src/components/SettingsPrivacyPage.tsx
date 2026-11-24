import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, Server, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { api, type HealthResponse } from '../api/client';
import type { CaseRecord, UserProfile } from '../types';

interface SettingsPrivacyPageProps {
  user: UserProfile;
  cases: CaseRecord[];
  onDeleteCase: (caseId: string) => Promise<void>;
}

export const SettingsPrivacyPage: React.FC<SettingsPrivacyPageProps> = ({
  user,
  cases,
  onDeleteCase,
}) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  useEffect(() => {
    api
      .health()
      .then((res) => setHealth(res))
      .catch(() => setHealth(null))
      .finally(() => setLoadingHealth(false));
  }, []);

  const handleExport = async () => {
    const data = await api.exportUserData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `queuezero-export-${user.email}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus('Case metadata exported as JSON.');
  };

  const handleDelete = async (caseId: string) => {
    setDeletingId(caseId);
    try {
      await onDeleteCase(caseId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Settings, Privacy &amp; MCP Diagnostics
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Inspect how QueueZero handles uploaded files, manages your case data, and connects to its three independent MCP servers.
        </p>
      </div>

      {/* Privacy & Security Model */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Document Handling &amp; Security Guarantees
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc pl-5">
              <li>
                Uploaded PDF, PNG, and JPG files are confined to server-side storage with UUID filenames, validated extensions/MIME types, and a 10 MB size ceiling. Uploaded files are never executed.
              </li>
              <li>
                Extracted document text is sanitized and treated strictly as untrusted data—prompt-injection phrases cannot override QueueZero&apos;s evidence or policy rules.
              </li>
              <li>
                Every case belongs strictly to your authenticated account ({user.email}). API keys never enter browser code.
              </li>
              <li>
                QueueZero never contacts companies or submits complaints automatically. You must explicitly review and approve every draft.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {exportStatus || 'Download a JSON summary of your account and case records.'}
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export My Case Data
          </button>
        </div>
      </section>

      {/* Live MCP Server Connectivity */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Server className="h-5 w-5 text-slate-700" />
            <h2 className="font-display text-lg font-semibold text-slate-900">
              MCP Server Architecture Status
            </h2>
          </div>
          {health && (
            <span className="text-xs font-medium text-slate-600">
              AI Key: {health.geminiConfigured ? 'Configured on Server' : 'Demo Mode Active'}
            </span>
          )}
        </div>

        {loadingHealth ? (
          <p className="mt-4 text-sm text-slate-500">Checking stdio MCP connections...</p>
        ) : !health ? (
          <p className="mt-4 text-sm text-red-700">Unable to retrieve MCP health status.</p>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {health.mcpServers.map((srv) => (
              <div key={srv.key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold capitalize text-slate-900">
                    {srv.key} MCP Server
                  </span>
                  {srv.connected ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                      <XCircle className="h-3.5 w-3.5" />
                      Offline
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">Exposed MCP Tools:</p>
                <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-slate-700">
                  {srv.tools.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delete Stored Cases & Documents */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Stored Cases &amp; Permanent Deletion
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Deleting a case immediately removes its database entries, assessment findings, drafts, and uploaded files from disk.
        </p>

        {cases.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">You have no stored cases.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {cases.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {c.company} · {c.documentCount ?? 0} uploaded document(s)
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deletingId === c.id}
                  onClick={() => handleDelete(c.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingId === c.id ? 'Deleting...' : 'Delete Case'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
