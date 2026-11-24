import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from '@xyflow/react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  GitBranch,
  ListTree,
  Play,
  RefreshCw,
} from 'lucide-react';
import type {
  AssessmentRecord,
  ComplaintDraftRecord,
  WorkflowNodeId,
  WorkflowNodeState,
  WorkflowRunRecord,
} from '../../types';
import { AnimatedFlowEdge } from './AnimatedFlowEdge';
import { NodeInspectorPanel } from './NodeInspectorPanel';
import { WorkflowNode } from './WorkflowNode';

interface LiveWorkflowViewProps {
  workflowRun: WorkflowRunRecord | null;
  assessment: AssessmentRecord | null;
  complaintDraft: ComplaintDraftRecord | null;
  geminiConfigured: boolean;
  isRunning: boolean;
  onRunAnalysis: (demoMode: boolean) => void;
  onOpenTab: (tab: 'assessment' | 'complaint') => void;
}

const nodeTypes = { workflowNode: WorkflowNode };
const edgeTypes = { animatedFlow: AnimatedFlowEdge };

const DEFAULT_POSITIONS: Record<WorkflowNodeId, { x: number; y: number }> = {
  document_upload: { x: 10, y: 120 },
  evidence_mcp: { x: 300, y: 30 },
  policy_mcp: { x: 300, y: 230 },
  ai_engine: { x: 595, y: 130 },
  resolution_mcp: { x: 885, y: 130 },
  user_approval: { x: 1175, y: 130 },
};

const EDGE_CONNECTIONS: Array<{ id: string; source: WorkflowNodeId; target: WorkflowNodeId }> = [
  { id: 'e-doc-ev', source: 'document_upload', target: 'evidence_mcp' },
  { id: 'e-doc-pol', source: 'document_upload', target: 'policy_mcp' },
  { id: 'e-ev-ai', source: 'evidence_mcp', target: 'ai_engine' },
  { id: 'e-pol-ai', source: 'policy_mcp', target: 'ai_engine' },
  { id: 'e-ai-res', source: 'ai_engine', target: 'resolution_mcp' },
  { id: 'e-res-app', source: 'resolution_mcp', target: 'user_approval' },
];

export const LiveWorkflowView: React.FC<LiveWorkflowViewProps> = ({
  workflowRun,
  assessment,
  complaintDraft,
  geminiConfigured,
  isRunning,
  onRunAnalysis,
  onOpenTab,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'timeline'>('visual');
  const [selectedNodeId, setSelectedNodeId] = useState<WorkflowNodeId | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      rfInstanceRef.current?.fitView({ padding: 0.14, duration: 220 });
    }, 60);
    return () => clearTimeout(timer);
  }, [selectedNodeId, viewMode]);

  useEffect(() => {
    const el = canvasWrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      rfInstanceRef.current?.fitView({ padding: 0.14, duration: 180 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode]);

  const nodesList: WorkflowNodeState[] = useMemo(() => {
    if (workflowRun?.nodes && workflowRun.nodes.length > 0) return workflowRun.nodes;
    return [
      {
        id: 'document_upload',
        label: 'Document Upload',
        subtitle: 'PDF / Image Ingestion',
        description: 'Reads uploaded invoices and warranty documents.',
        status: 'idle',
        durationMs: null,
        startedAt: null,
        completedAt: null,
        toolInvoked: null,
        inputSummary: null,
        outputSummary: null,
        references: [],
        limitations: [],
        error: null,
      },
      {
        id: 'evidence_mcp',
        label: 'Evidence MCP Server',
        subtitle: 'queuezero-evidence-mcp',
        description: 'Extracts invoice details and identifies missing fields.',
        status: 'idle',
        durationMs: null,
        startedAt: null,
        completedAt: null,
        toolInvoked: null,
        inputSummary: null,
        outputSummary: null,
        references: [],
        limitations: [],
        error: null,
      },
      {
        id: 'policy_mcp',
        label: 'Policy MCP Server',
        subtitle: 'queuezero-policy-mcp',
        description: 'Searches curated warranty KB and evaluates clauses.',
        status: 'idle',
        durationMs: null,
        startedAt: null,
        completedAt: null,
        toolInvoked: null,
        inputSummary: null,
        outputSummary: null,
        references: [],
        limitations: [],
        error: null,
      },
      {
        id: 'ai_engine',
        label: 'AI Resolution Engine',
        subtitle: 'Proof-Carrying Reasoning',
        description: 'Compares verified evidence against retrieved policies.',
        status: 'idle',
        durationMs: null,
        startedAt: null,
        completedAt: null,
        toolInvoked: null,
        inputSummary: null,
        outputSummary: null,
        references: [],
        limitations: [],
        error: null,
      },
      {
        id: 'resolution_mcp',
        label: 'Resolution MCP Server',
        subtitle: 'queuezero-resolution-mcp',
        description: 'Generates checklist and complaint draft.',
        status: 'idle',
        durationMs: null,
        startedAt: null,
        completedAt: null,
        toolInvoked: null,
        inputSummary: null,
        outputSummary: null,
        references: [],
        limitations: [],
        error: null,
      },
      {
        id: 'user_approval',
        label: 'User Approval',
        subtitle: 'Human-in-the-Loop Gate',
        description: 'Requires user review and approval before external action.',
        status: 'idle',
        durationMs: null,
        startedAt: null,
        completedAt: null,
        toolInvoked: null,
        inputSummary: null,
        outputSummary: null,
        references: [],
        limitations: [],
        error: null,
      },
    ];
  }, [workflowRun]);

  const selectedNode = useMemo(
    () => nodesList.find((n) => n.id === selectedNodeId) || null,
    [nodesList, selectedNodeId]
  );

  const flowNodes: Node[] = useMemo(
    () =>
      nodesList.map((n) => ({
        id: n.id,
        type: 'workflowNode',
        position: DEFAULT_POSITIONS[n.id],
        data: {
          nodeState: n,
          selected: selectedNodeId === n.id,
          onSelect: (id: WorkflowNodeId) => setSelectedNodeId(id),
        },
        draggable: false,
      })),
    [nodesList, selectedNodeId]
  );

  const flowEdges: Edge[] = useMemo(() => {
    const byId = new Map(nodesList.map((n) => [n.id, n]));
    return EDGE_CONNECTIONS.map((conn) => {
      const src = byId.get(conn.source);
      const tgt = byId.get(conn.target);
      const active =
        src?.status === 'running' ||
        tgt?.status === 'running' ||
        (src?.status === 'completed' && tgt?.status === 'waiting');
      const completed = src?.status === 'completed' && tgt?.status === 'completed';
      const failed = src?.status === 'failed' || tgt?.status === 'failed';
      return {
        id: conn.id,
        source: conn.source,
        target: conn.target,
        type: 'animatedFlow',
        data: { active, completed, failed },
      };
    });
  }, [nodesList]);

  const stats = useMemo(() => {
    const completedCount = nodesList.filter(
      (n) => n.status === 'completed' || n.status === 'waiting'
    ).length;
    const progressPct = Math.round((completedCount / nodesList.length) * 100);
    const totalMs = nodesList.reduce((acc, n) => acc + (n.durationMs || 0), 0);
    const runningNode = nodesList.find((n) => n.status === 'running');
    const currentStage = runningNode
      ? `Running: ${runningNode.label}`
      : workflowRun?.status === 'completed'
      ? 'Pipeline complete · Awaiting user approval'
      : workflowRun?.status === 'failed'
      ? 'Pipeline stopped with error'
      : 'Ready to run analysis';
    return { completedCount, progressPct, totalMs, currentStage };
  }, [nodesList, workflowRun]);

  const events = workflowRun?.events || [];

  return (
    <div className="space-y-5">
      {/* Workflow Header & Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 text-slate-100 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
              <span className="font-semibold text-blue-300">Live AI Resolution Workflow</span>
              <span aria-hidden="true">·</span>
              <span>
                {workflowRun?.mode === 'live_ai'
                  ? 'Live Gemini 4 Hydrogen + 3 Stdio MCP Servers'
                  : 'Demo Mode (Deterministic Sample Engine) + 3 Stdio MCP Servers'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{stats.totalMs} ms total tool time</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-semibold text-white">
              {stats.currentStage}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher */}
            <div className="inline-flex items-center rounded-lg bg-slate-900 border border-slate-800 p-1">
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  viewMode === 'visual'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                Visual Workflow
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  viewMode === 'timeline'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
                Execution Timeline
              </button>
            </div>

            <button
              type="button"
              disabled={isRunning}
              onClick={() => onRunAnalysis(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 hover:bg-blue-50 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Executing MCP Pipeline...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  {geminiConfigured ? 'Run Live AI' : 'Run Pipeline'}
                </>
              )}
            </button>

            {geminiConfigured && (
              <button
                type="button"
                disabled={isRunning}
                onClick={() => onRunAnalysis(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                Run Demo Mode
              </button>
            )}
          </div>
        </div>

        {workflowRun?.status === 'failed' && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-xs text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              AI step encountered an upstream service error. You can retry Live AI or run the 3 MCP servers with Demo Deterministic Mode right now.
            </span>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => onRunAnalysis(true)}
              className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-950 hover:bg-white shrink-0"
            >
              Run with Demo Mode
            </button>
          </div>
        )}

        {/* Overall Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Pipeline Progress</span>
            <span className="font-mono tabular-nums">
              {stats.completedCount}/{nodesList.length} stages ({stats.progressPct}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${stats.progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Main Visualization Canvas or Execution Timeline */}
      {viewMode === 'visual' ? (
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          <div
            ref={canvasWrapperRef}
            data-testid="workflow-canvas"
            className="qz-workflow-canvas flex-1 h-[460px] sm:h-[520px] rounded-xl border border-slate-800 bg-[#0B1120] overflow-hidden relative"
          >
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onInit={(inst) => {
                rfInstanceRef.current = inst;
              }}
              fitView
              fitViewOptions={{ padding: 0.14 }}
              minZoom={0.4}
              maxZoom={1.35}
              nodesDraggable={false}
              nodesConnectable={false}
            >
              <Background color="#1e293b" gap={20} size={1} />
              <Controls showInteractive={false} />
            </ReactFlow>

            <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-1.5 text-[11px] text-slate-300">
              Click any node to inspect MCP inputs, outputs, and evidence citations.
            </div>
          </div>

          <AnimatePresence>
            {selectedNode && (
              <NodeInspectorPanel
                node={selectedNode}
                onClose={() => setSelectedNodeId(null)}
              />
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-950 text-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-semibold text-white">
              Chronological Execution Timeline
            </h3>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {events.length} SSE event(s)
            </span>
          </div>

          {events.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No execution events recorded yet. Click &quot;Run Analysis&quot; to invoke the 3 MCP servers.
            </p>
          ) : (
            <ol className="space-y-3">
              {events.map((evt) => {
                const isExpanded = Boolean(expandedEvents[evt.id]);
                return (
                  <li
                    key={evt.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/80 p-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {evt.type === 'workflow_failed' ? (
                          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                        ) : evt.type === 'awaiting_user_approval' ? (
                          <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-white">{evt.title}</span>
                        <span className="font-mono text-[11px] text-blue-300">{evt.type}</span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 tabular-nums">
                        {evt.durationMs != null && <span>{evt.durationMs} ms</span>}
                        <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <p className="mt-1.5 text-xs text-slate-300">{evt.detail}</p>

                    {(evt.toolName || evt.payload !== undefined) && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedEvents((prev) => ({ ...prev, [evt.id]: !isExpanded }))
                          }
                          className="text-[11px] font-medium text-blue-300 hover:text-blue-200"
                        >
                          {isExpanded ? 'Hide tool payload' : 'View tool & payload'}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 rounded bg-slate-950 border border-slate-800 p-2.5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                            {evt.toolName && <p className="text-blue-300 mb-1">Tool: {evt.toolName}</p>}
                            {evt.payload !== undefined && (
                              <pre>{JSON.stringify(evt.payload, null, 2)}</pre>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {/* Live Activity Feed + Final Output Summary Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-blue-700" aria-hidden="true" />
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Live Execution Feed &amp; Completed Tool Calls
            </h3>
          </div>
          {events.length === 0 ? (
            <p className="text-xs text-slate-500">Waiting for workflow start...</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {[...events].reverse().slice(0, 8).map((e) => (
                <li key={e.id} className="text-xs border-b border-slate-100 pb-2 last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">{e.title}</span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{e.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Final Assessment &amp; Draft Preview
            </h3>
            {assessment ? (
              <div className="mt-2.5 space-y-2">
                <p className="text-xs font-semibold text-slate-800">
                  Assessment Status:{' '}
                  <span
                    className={
                      assessment.assessmentStatus === 'Supported'
                        ? 'text-emerald-700'
                        : assessment.assessmentStatus === 'Unsupported'
                        ? 'text-red-700'
                        : 'text-amber-700'
                    }
                  >
                    {assessment.assessmentStatus}
                  </span>
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{assessment.findings.summary}</p>
                {complaintDraft && (
                  <p className="text-xs text-slate-500">
                    Complaint draft generated ({complaintDraft.approvalStatus.replace(/_/g, ' ')}).
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Run the workflow to generate the evidence assessment and complaint draft.
              </p>
            )}
          </div>

          {assessment && (
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => onOpenTab('assessment')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                Inspect Evidence Assessment
              </button>
              <button
                type="button"
                onClick={() => onOpenTab('complaint')}
                className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Review &amp; Approve Complaint
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
