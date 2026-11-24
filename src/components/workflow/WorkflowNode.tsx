import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileSearch,
  FileText,
  Loader2,
  Scale,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { WorkflowNodeId, WorkflowNodeState } from '../../types';

export interface WorkflowNodeFlowData extends Record<string, unknown> {
  nodeState: WorkflowNodeState;
  selected: boolean;
  onSelect: (id: WorkflowNodeId) => void;
}

const NODE_ICONS: Record<WorkflowNodeId, React.ComponentType<{ className?: string }>> = {
  document_upload: FileText,
  evidence_mcp: FileSearch,
  policy_mcp: Scale,
  ai_engine: BrainCircuit,
  resolution_mcp: ShieldCheck,
  user_approval: UserCheck,
};

export const WorkflowNode: React.FC<NodeProps> = ({ data }) => {
  const { nodeState, selected, onSelect } = data as WorkflowNodeFlowData;
  const [expanded, setExpanded] = useState(false);
  const Icon = NODE_ICONS[nodeState.id];

  const statusStyles = {
    idle: 'border-slate-700/80 bg-slate-900/90 text-slate-300',
    running:
      'border-blue-400 bg-slate-900 text-white shadow-[0_0_24px_rgba(59,130,246,0.45)] ring-1 ring-blue-400/50',
    completed: 'border-emerald-500/70 bg-slate-900/95 text-slate-100',
    failed: 'border-red-500/80 bg-red-950/60 text-red-100',
    waiting: 'border-amber-400/80 bg-slate-900/95 text-amber-50',
  }[nodeState.status];

  const statusLabel = {
    idle: 'Idle',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    waiting: 'Awaiting Approval',
  }[nodeState.status];

  const renderStatusIcon = () => {
    switch (nodeState.status) {
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin shrink-0" aria-hidden="true" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-400 shrink-0" aria-hidden="true" />;
      case 'waiting':
        return <Clock className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500 shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0.9, scale: 0.98 }}
      animate={{
        opacity: 1,
        scale: nodeState.status === 'running' ? 1.02 : 1,
      }}
      transition={{ duration: 0.2 }}
      className={`w-[264px] rounded-xl border transition-all ${statusStyles} ${
        selected ? 'ring-2 ring-blue-300 ring-offset-2 ring-offset-slate-950' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-slate-900"
      />

      <div className="p-3.5">
        <button
          type="button"
          onClick={() => onSelect(nodeState.id)}
          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${
                  nodeState.status === 'running'
                    ? 'border-blue-400/50 bg-blue-500/20 text-blue-300 qz-motion-pulse animate-pulse'
                    : nodeState.status === 'completed'
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : nodeState.status === 'failed'
                    ? 'border-red-500/40 bg-red-500/15 text-red-300'
                    : nodeState.status === 'waiting'
                    ? 'border-amber-400/40 bg-amber-500/15 text-amber-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-white truncate">
                  {nodeState.label}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{nodeState.subtitle}</p>
              </div>
            </div>
            {renderStatusIcon()}
          </div>

          <p className="mt-2.5 text-xs text-slate-300 leading-snug line-clamp-2">
            {nodeState.description}
          </p>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span
              className={`font-medium ${
                nodeState.status === 'running'
                  ? 'text-blue-300'
                  : nodeState.status === 'completed'
                  ? 'text-emerald-300'
                  : nodeState.status === 'failed'
                  ? 'text-red-300'
                  : nodeState.status === 'waiting'
                  ? 'text-amber-300'
                  : 'text-slate-400'
              }`}
            >
              {statusLabel}
            </span>
            <span className="font-mono tabular-nums text-slate-400">
              {nodeState.durationMs !== null ? `${nodeState.durationMs} ms` : '—'}
            </span>
          </div>
        </button>

        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-200"
          >
            {expanded ? (
              <>
                Hide details <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Quick details <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelect(nodeState.id)}
            className="text-[11px] font-medium text-blue-300 hover:text-blue-200"
          >
            Inspect
          </button>
        </div>

        {expanded && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-[11px] text-slate-300 space-y-1.5">
            {nodeState.toolInvoked && (
              <p className="font-mono text-[10px] text-blue-300 break-all">
                Tool: {nodeState.toolInvoked}
              </p>
            )}
            {nodeState.references.length > 0 && (
              <p className="text-slate-400">
                Refs: {nodeState.references.slice(0, 2).join(' · ')}
              </p>
            )}
            {nodeState.error && <p className="text-red-300">Error: {nodeState.error}</p>}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-slate-900"
      />
    </motion.div>
  );
};
