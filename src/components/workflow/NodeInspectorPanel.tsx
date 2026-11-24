import React from 'react';
import { X, AlertTriangle, CheckCircle2, Clock, Loader2, Terminal } from 'lucide-react';
import type { WorkflowNodeState } from '../../types';

interface NodeInspectorPanelProps {
  node: WorkflowNodeState | null;
  onClose: () => void;
}

export const NodeInspectorPanel: React.FC<NodeInspectorPanelProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <aside
      aria-label={`${node.label} inspector`}
      className="w-full lg:w-[380px] shrink-0 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 p-5 flex flex-col gap-4 max-h-[620px] overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-blue-300">
            Node Inspector
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-white">{node.label}</h3>
          <p className="text-xs text-slate-400">{node.subtitle}</p>
        </div>
        <button
          type="button"
          aria-label="Close node inspector"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Execution Status */}
      <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          {node.status === 'running' && <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />}
          {node.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          {node.status === 'failed' && <AlertTriangle className="h-4 w-4 text-red-400" />}
          {(node.status === 'idle' || node.status === 'waiting') && (
            <Clock className="h-4 w-4 text-amber-400" />
          )}
          <span className="font-semibold capitalize">{node.status}</span>
        </div>
        <span className="font-mono tabular-nums text-slate-400">
          {node.durationMs !== null ? `${node.durationMs} ms` : 'Pending'}
        </span>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300">What this component does</h4>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">{node.description}</p>
      </div>

      {node.toolInvoked && (
        <div>
          <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-blue-300" />
            Tool Invoked
          </h4>
          <p className="mt-1 rounded-md bg-slate-950 border border-slate-800 px-3 py-2 font-mono text-[11px] text-blue-300 break-all">
            {node.toolInvoked}
          </p>
        </div>
      )}

      {node.inputSummary !== null && node.inputSummary !== undefined && (
        <div>
          <h4 className="text-xs font-semibold text-slate-300">Input Received</h4>
          <pre className="mt-1 rounded-md bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-36">
            {JSON.stringify(node.inputSummary, null, 2)}
          </pre>
        </div>
      )}

      {node.outputSummary !== null && node.outputSummary !== undefined && (
        <div>
          <h4 className="text-xs font-semibold text-slate-300">Output Generated</h4>
          <pre className="mt-1 rounded-md bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] text-emerald-200 overflow-x-auto max-h-48">
            {JSON.stringify(node.outputSummary, null, 2)}
          </pre>
        </div>
      )}

      {node.references.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-300">Evidence / Policy References</h4>
          <ul className="mt-1.5 space-y-1.5 text-xs text-slate-400">
            {node.references.map((ref, idx) => (
              <li key={idx} className="rounded bg-slate-950/60 border border-slate-800 px-2.5 py-1.5">
                {ref}
              </li>
            ))}
          </ul>
        </div>
      )}

      {node.limitations.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-300">Limitations &amp; Missing Info</h4>
          <ul className="mt-1.5 space-y-1.5 text-xs text-amber-100/80 list-disc pl-4">
            {node.limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      )}

      {node.error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200">
          <p className="font-semibold">Execution Error</p>
          <p className="mt-1">{node.error}</p>
        </div>
      )}
    </aside>
  );
};
