import crypto from 'crypto';
import { EventEmitter } from 'events';
import {
  appendCaseActivity,
  db,
  getCaseDocuments,
  getCaseForUser,
  getUserById,
} from '../db';
import type { ExtractedEvidenceItem, ExtractedInvoiceFields } from '../core/evidenceLogic';
import type { PolicyEvaluationResult } from '../core/policyLogic';
import { mcpManager } from '../mcp/mcpClientManager';
import { hasConfiguredGeminiKey } from './documentProcessor';
import { runAiResolutionEngine } from './aiClient';
import type {
  PolicyRecord,
  ResolutionStep,
  WorkflowEventRecord,
  WorkflowEventType,
  WorkflowNodeId,
  WorkflowNodeState,
  WorkflowRunRecord,
} from '../../src/types';

class WorkflowEventBus extends EventEmitter {}

export const workflowBus = new WorkflowEventBus();
workflowBus.setMaxListeners(100);

function createInitialNodes(): WorkflowNodeState[] {
  return [
    {
      id: 'document_upload',
      label: 'Document Upload',
      subtitle: 'PDF / Image Ingestion & Sanitization',
      description: 'Validates uploaded invoices/warranty files and reads extracted untrusted text safely.',
      status: 'idle',
      durationMs: null,
      startedAt: null,
      completedAt: null,
      toolInvoked: 'documentProcessor.extractDocumentText',
      inputSummary: null,
      outputSummary: null,
      references: [],
      limitations: [],
      error: null,
    },
    {
      id: 'evidence_mcp',
      label: 'Evidence MCP Server',
      subtitle: 'queuezero-evidence-mcp (stdio)',
      description: 'Calls MCP tools extract_invoice_details & identify_missing_information to verify facts and citations.',
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
      subtitle: 'queuezero-policy-mcp (stdio)',
      description: 'Searches curated warranty KB via search_warranty_policy & check_warranty_conditions.',
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
      subtitle: 'Proof-Carrying Reasoning & Gap Check',
      description: 'Compares verified evidence against policy clauses and flags unsupported or missing claims.',
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
      subtitle: 'queuezero-resolution-mcp (stdio)',
      description: 'Generates actionable checklist and grounded complaint draft via MCP tools.',
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
      description: 'Pauses all external action until the user reviews, edits, and approves the complaint draft.',
      status: 'idle',
      durationMs: null,
      startedAt: null,
      completedAt: null,
      toolInvoked: 'human_approval_gate',
      inputSummary: null,
      outputSummary: null,
      references: [],
      limitations: [],
      error: null,
    },
  ];
}

// Track active in-flight runs in memory so newly attached SSE listeners immediately receive snapshot state
const activeRuns = new Map<string, WorkflowRunRecord>();

export function getActiveWorkflowRun(caseId: string): WorkflowRunRecord | undefined {
  return activeRuns.get(caseId);
}

export async function executeCaseWorkflow(params: {
  caseId: string;
  userId: string;
  forceDemoMode?: boolean;
}): Promise<WorkflowRunRecord> {
  const { caseId, userId, forceDemoMode } = params;
  const caseRecord = getCaseForUser(caseId, userId);
  if (!caseRecord) {
    throw new Error('Case not found or access denied.');
  }
  const user = getUserById(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  const useDemoMode = Boolean(forceDemoMode || !hasConfiguredGeminiKey());
  const mode: WorkflowRunRecord['mode'] = useDemoMode ? 'demo_deterministic' : 'live_ai';
  const runId = `run-${crypto.randomUUID()}`;

  const run: WorkflowRunRecord = {
    id: runId,
    caseId,
    mode,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    nodes: createInitialNodes(),
    events: [],
  };

  activeRuns.set(caseId, run);
  db.prepare(`UPDATE cases SET status = 'under_review', updated_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    caseId
  );

  const emitEvent = (
    type: WorkflowEventType,
    nodeId: WorkflowNodeId,
    title: string,
    detail: string,
    extra?: { durationMs?: number; toolName?: string; payload?: unknown }
  ) => {
    const evt: WorkflowEventRecord = {
      id: `evt-${crypto.randomUUID()}`,
      type,
      nodeId,
      timestamp: new Date().toISOString(),
      durationMs: extra?.durationMs ?? null,
      title,
      detail,
      toolName: extra?.toolName,
      payload: extra?.payload,
    };
    run.events.push(evt);
    workflowBus.emit(`case:${caseId}`, { kind: 'event', event: evt, run });
  };

  const updateNode = (nodeId: WorkflowNodeId, patch: Partial<WorkflowNodeState>) => {
    run.nodes = run.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n));
    workflowBus.emit(`case:${caseId}`, { kind: 'state', run });
  };

  const persistRun = () => {
    db.prepare(`
      INSERT INTO workflow_runs (id, case_id, mode, status, started_at, completed_at, nodes_json, events_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        completed_at = excluded.completed_at,
        nodes_json = excluded.nodes_json,
        events_json = excluded.events_json
    `).run(
      run.id,
      run.caseId,
      run.mode,
      run.status,
      run.startedAt,
      run.completedAt,
      JSON.stringify(run.nodes),
      JSON.stringify(run.events)
    );
  };

  persistRun();

  try {
    // -------------------------------------------------------------------------
    // STAGE 1: Document Upload & Text Inspection
    // -------------------------------------------------------------------------
    const docStart = performance.now();
    updateNode('document_upload', {
      status: 'running',
      startedAt: new Date().toISOString(),
      inputSummary: { caseId, category: caseRecord.category },
    });

    const documents = getCaseDocuments(caseId);
    emitEvent(
      'document_uploaded',
      'document_upload',
      'Documents loaded from case vault',
      `${documents.length} document(s) queued for untrusted-data inspection.`,
      { payload: documents.map((d) => ({ filename: d.filename, fileType: d.fileType, status: d.extractionStatus })) }
    );

    emitEvent(
      'extraction_started',
      'document_upload',
      'Inspecting document text layers',
      documents.length > 0
        ? `Reading sanitized text from ${documents.map((d) => d.filename).join(', ')}.`
        : 'No files attached; continuing with user-supplied case description only.'
    );

    const docDuration = Math.max(1, Math.round(performance.now() - docStart));
    updateNode('document_upload', {
      status: 'completed',
      durationMs: docDuration,
      completedAt: new Date().toISOString(),
      outputSummary: {
        documentCount: documents.length,
        files: documents.map((d) => ({
          filename: d.filename,
          fileType: d.fileType,
          extractedChars: d.extractedText.length,
          extractionStatus: d.extractionStatus,
        })),
      },
      references: documents.map((d) => `${d.filename} (${d.extractionStatus})`),
      limitations:
        documents.length === 0
          ? ['No invoice or warranty documents uploaded; evidence confidence will be limited.']
          : [],
    });

    emitEvent(
      'extraction_completed',
      'document_upload',
      'Document ingestion complete',
      `Prepared ${documents.length} document payload(s) in ${docDuration} ms.`,
      { durationMs: docDuration }
    );

    // -------------------------------------------------------------------------
    // STAGE 2: Evidence MCP Server
    // -------------------------------------------------------------------------
    const evStart = performance.now();
    updateNode('evidence_mcp', {
      status: 'running',
      startedAt: new Date().toISOString(),
      toolInvoked: 'extract_invoice_details + identify_missing_information',
      inputSummary: {
        documentCount: documents.length,
        company: caseRecord.company,
        productName: caseRecord.productName,
      },
    });

    emitEvent(
      'evidence_mcp_called',
      'evidence_mcp',
      'Calling Evidence MCP Server',
      'Invoking MCP tools extract_invoice_details and identify_missing_information over stdio.',
      { toolName: 'queuezero-evidence-mcp::extract_invoice_details' }
    );

    const mcpDocInputs = documents.map((d) => ({
      id: d.id,
      filename: d.filename,
      extractedText: d.extractedText,
    }));
    const userCaseInput = {
      company: caseRecord.company,
      productName: caseRecord.productName,
      description: caseRecord.description,
    };

    const extractRes = await mcpManager.callTool<{
      fields: ExtractedInvoiceFields;
      evidenceItems: ExtractedEvidenceItem[];
    }>('evidence', 'extract_invoice_details', {
      documents: mcpDocInputs,
      userCaseInput,
    });

    const missingRes = await mcpManager.callTool<{
      fields: ExtractedInvoiceFields;
      missingItems: string[];
      recommendations: string[];
    }>('evidence', 'identify_missing_information', {
      documents: mcpDocInputs,
      userCaseInput,
    });

    const evDuration = Math.max(1, Math.round(performance.now() - evStart));

    // Persist extracted evidence rows cleanly
    db.prepare('DELETE FROM evidence WHERE case_id = ?').run(caseId);
    const insertEv = db.prepare(`
      INSERT INTO evidence (id, case_id, document_id, evidence_type, extracted_value, source_reference, confidence, confidence_reason, verification_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of extractRes.data.evidenceItems) {
      const matchedDoc = documents.find((d) => item.sourceReference.startsWith(d.filename));
      insertEv.run(
        `ev-${crypto.randomUUID()}`,
        caseId,
        matchedDoc ? matchedDoc.id : null,
        item.evidenceType,
        item.extractedValue,
        item.sourceReference,
        item.confidence,
        item.confidenceReason,
        item.verificationStatus
      );
    }

    updateNode('evidence_mcp', {
      status: 'completed',
      durationMs: evDuration,
      completedAt: new Date().toISOString(),
      outputSummary: {
        extractedFields: extractRes.data.fields,
        verifiedCount: extractRes.data.evidenceItems.filter(
          (i) => i.verificationStatus === 'verified_from_document'
        ).length,
        missingCount: missingRes.data.missingItems.length,
        missingItems: missingRes.data.missingItems,
      },
      references: extractRes.data.evidenceItems
        .filter((i) => i.verificationStatus === 'verified_from_document')
        .map((i) => `${i.evidenceType}: ${i.sourceReference}`),
      limitations: missingRes.data.missingItems,
    });

    emitEvent(
      'evidence_mcp_completed',
      'evidence_mcp',
      'Evidence MCP extraction completed',
      `Extracted ${extractRes.data.evidenceItems.length} evidence entries and flagged ${missingRes.data.missingItems.length} missing item(s) in ${evDuration} ms.`,
      {
        durationMs: evDuration,
        toolName: 'queuezero-evidence-mcp::identify_missing_information',
        payload: extractRes.data.fields,
      }
    );

    // -------------------------------------------------------------------------
    // STAGE 3: Policy MCP Server
    // -------------------------------------------------------------------------
    const polStart = performance.now();
    const brandQuery = extractRes.data.fields.brand || caseRecord.company;
    updateNode('policy_mcp', {
      status: 'running',
      startedAt: new Date().toISOString(),
      toolInvoked: 'search_warranty_policy + check_warranty_conditions',
      inputSummary: { brandQuery, issueExcerpt: caseRecord.description.slice(0, 120) },
    });

    emitEvent(
      'policy_mcp_called',
      'policy_mcp',
      'Calling Policy MCP Server',
      `Searching curated warranty knowledge base for "${brandQuery || 'General'}" and checking conditions.`,
      { toolName: 'queuezero-policy-mcp::search_warranty_policy' }
    );

    const searchRes = await mcpManager.callTool<{
      matched: PolicyRecord[];
      exactBrandMatch: boolean;
      note: string;
    }>('policy', 'search_warranty_policy', {
      brand: brandQuery,
      issueKeywords: caseRecord.description,
    });

    const condRes = await mcpManager.callTool<{
      exactBrandMatch: boolean;
      searchNote: string;
      matchedPolicyIds: string[];
      evaluation: PolicyEvaluationResult;
    }>('policy', 'check_warranty_conditions', {
      fields: extractRes.data.fields,
      description: caseRecord.description,
      brandQuery: caseRecord.company,
      missingItems: missingRes.data.missingItems,
    });

    const polDuration = Math.max(1, Math.round(performance.now() - polStart));
    updateNode('policy_mcp', {
      status: 'completed',
      durationMs: polDuration,
      completedAt: new Date().toISOString(),
      outputSummary: {
        exactBrandMatch: searchRes.data.exactBrandMatch,
        searchNote: searchRes.data.note,
        matchedPolicies: searchRes.data.matched.map((p) => p.policyName),
        preliminaryStatus: condRes.data.evaluation.assessmentStatus,
        clauseCount: condRes.data.evaluation.relevantClauses.length,
      },
      references: searchRes.data.matched.map((p) => p.sourceReference),
      limitations: condRes.data.evaluation.limitations,
    });

    emitEvent(
      'policy_mcp_completed',
      'policy_mcp',
      'Policy MCP retrieval completed',
      `${searchRes.data.note} Evaluated ${condRes.data.evaluation.relevantClauses.length} policy clause(s) in ${polDuration} ms.`,
      {
        durationMs: polDuration,
        toolName: 'queuezero-policy-mcp::check_warranty_conditions',
        payload: {
          exactBrandMatch: searchRes.data.exactBrandMatch,
          clauses: condRes.data.evaluation.relevantClauses.map((c) => `${c.clauseId}: ${c.title}`),
        },
      }
    );

    // -------------------------------------------------------------------------
    // STAGE 4: AI Resolution Engine
    // -------------------------------------------------------------------------
    const aiStart = performance.now();
    updateNode('ai_engine', {
      status: 'running',
      startedAt: new Date().toISOString(),
      toolInvoked: useDemoMode ? 'deterministic_demo_evaluator' : 'gemini-4-hydrogen (structured JSON)',
      inputSummary: {
        mode,
        evidenceItemsCount: extractRes.data.evidenceItems.length,
        matchedPoliciesCount: searchRes.data.matched.length,
      },
    });

    emitEvent(
      'assessment_started',
      'ai_engine',
      useDemoMode ? 'Running Demo Mode evaluation engine' : 'Running Gemini 4 Hydrogen resolution analysis',
      useDemoMode
        ? 'Synthesizing deterministic proof-carrying assessment (Demo Mode clearly labeled).'
        : 'Evaluating evidence against retrieved policy clauses using Gemini 4 Hydrogen structured JSON.',
      { toolName: useDemoMode ? 'demo_deterministic_engine' : 'gemini-4-hydrogen' }
    );

    const aiResult = await runAiResolutionEngine({
      caseTitle: caseRecord.title,
      category: caseRecord.category,
      description: caseRecord.description,
      company: caseRecord.company,
      productName: caseRecord.productName,
      userName: user.name,
      userEmail: user.email,
      fields: extractRes.data.fields,
      evidenceItems: extractRes.data.evidenceItems,
      missingItems: missingRes.data.missingItems,
      matchedPolicies: searchRes.data.matched,
      exactBrandMatch: searchRes.data.exactBrandMatch,
      forceDemoMode: useDemoMode,
    });

    const aiDuration = Math.max(1, Math.round(performance.now() - aiStart));

    // Persist Assessment in SQLite
    db.prepare('DELETE FROM assessments WHERE case_id = ?').run(caseId);
    db.prepare(`
      INSERT INTO assessments (id, case_id, assessment_status, findings, missing_information, limitations, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `assess-${crypto.randomUUID()}`,
      caseId,
      aiResult.assessmentStatus,
      JSON.stringify(aiResult.findings),
      JSON.stringify(aiResult.missingInformation),
      JSON.stringify(aiResult.limitations),
      new Date().toISOString()
    );

    updateNode('ai_engine', {
      status: 'completed',
      durationMs: aiDuration,
      completedAt: new Date().toISOString(),
      outputSummary: {
        assessmentStatus: aiResult.assessmentStatus,
        summary: aiResult.findings.summary,
        supportedClaimsCount: aiResult.findings.supportedPoints.length,
        missingInfoCount: aiResult.missingInformation.length,
      },
      references: aiResult.findings.supportedPoints.map((p) => `${p.evidenceRef} -> ${p.policyRef}`),
      limitations: aiResult.limitations,
    });

    emitEvent(
      'assessment_completed',
      'ai_engine',
      `Assessment: ${aiResult.assessmentStatus}`,
      aiResult.findings.summary,
      {
        durationMs: aiDuration,
        toolName: useDemoMode ? 'demo_deterministic_engine' : 'gemini-4-hydrogen',
        payload: {
          assessmentStatus: aiResult.assessmentStatus,
          missingCount: aiResult.missingInformation.length,
        },
      }
    );

    // -------------------------------------------------------------------------
    // STAGE 5: Resolution MCP Server
    // -------------------------------------------------------------------------
    const resStart = performance.now();
    updateNode('resolution_mcp', {
      status: 'running',
      startedAt: new Date().toISOString(),
      toolInvoked: 'create_resolution_checklist + generate_complaint_draft',
      inputSummary: {
        assessmentStatus: aiResult.assessmentStatus,
        matchedPolicyIds: searchRes.data.matched.map((p) => p.id),
      },
    });

    emitEvent(
      'resolution_mcp_called',
      'resolution_mcp',
      'Calling Resolution MCP Server',
      'Generating actionable resolution checklist and proof-carrying complaint draft via stdio MCP.',
      { toolName: 'queuezero-resolution-mcp::generate_complaint_draft' }
    );

    const checklistRes = await mcpManager.callTool<{ checklist: ResolutionStep[] }>(
      'resolution',
      'create_resolution_checklist',
      {
        fields: extractRes.data.fields,
        missingInformation: aiResult.missingInformation,
        matchedPolicyIds: searchRes.data.matched.map((p) => p.id),
        assessmentStatus: aiResult.assessmentStatus,
      }
    );

    const draftRes = await mcpManager.callTool<{
      draftContent: string;
      approvalRequiredBeforeExternalAction: boolean;
    }>('resolution', 'generate_complaint_draft', {
      userName: user.name,
      userEmail: user.email,
      company: caseRecord.company,
      productName: caseRecord.productName,
      description: caseRecord.description,
      fields: extractRes.data.fields,
      matchedPolicyIds: searchRes.data.matched.map((p) => p.id),
      assessmentStatus: aiResult.assessmentStatus,
      missingInformation: aiResult.missingInformation,
    });

    const finalDraftText = aiResult.complaintDraftOverride || draftRes.data.draftContent;
    const resDuration = Math.max(1, Math.round(performance.now() - resStart));

    // Persist Complaint Draft & Checklist in SQLite
    const nowIso = new Date().toISOString();
    db.prepare('DELETE FROM complaint_drafts WHERE case_id = ?').run(caseId);
    db.prepare(`
      INSERT INTO complaint_drafts (id, case_id, draft_content, approval_status, checklist_json, follow_up_note, created_at, updated_at)
      VALUES (?, ?, ?, 'pending_approval', ?, NULL, ?, ?)
    `).run(
      `draft-${crypto.randomUUID()}`,
      caseId,
      finalDraftText,
      JSON.stringify(checklistRes.data.checklist),
      nowIso,
      nowIso
    );

    updateNode('resolution_mcp', {
      status: 'completed',
      durationMs: resDuration,
      completedAt: new Date().toISOString(),
      outputSummary: {
        checklistSteps: checklistRes.data.checklist.length,
        draftCharLength: finalDraftText.length,
        approvalStatus: 'pending_approval',
      },
      references: checklistRes.data.checklist.map((s) => s.title),
      limitations: ['Complaint draft is strictly held in pending_approval until reviewed by the user.'],
    });

    emitEvent(
      'complaint_generated',
      'resolution_mcp',
      'Resolution plan & complaint draft ready',
      `Created ${checklistRes.data.checklist.length} action steps and formal complaint draft in ${resDuration} ms.`,
      {
        durationMs: resDuration,
        toolName: 'queuezero-resolution-mcp::create_resolution_checklist',
      }
    );

    // -------------------------------------------------------------------------
    // STAGE 6: User Approval Gate
    // -------------------------------------------------------------------------
    updateNode('user_approval', {
      status: 'waiting',
      startedAt: new Date().toISOString(),
      inputSummary: {
        draftStatus: 'pending_approval',
        externalActionBlocked: true,
      },
      outputSummary: {
        nextStep: 'Review evidence assessment, customize complaint text if needed, and click Approve Draft.',
      },
      limitations: ['QueueZero never sends external emails or submits claims automatically.'],
    });

    emitEvent(
      'awaiting_user_approval',
      'user_approval',
      'Awaiting explicit user approval',
      'Pipeline paused safely at Human Approval Gate. No external submission has occurred.'
    );

    db.prepare(`UPDATE cases SET status = 'ready_to_submit', updated_at = ? WHERE id = ?`).run(
      new Date().toISOString(),
      caseId
    );
    appendCaseActivity(
      caseId,
      'analysis_completed',
      `AI & MCP workflow completed (${mode === 'live_ai' ? 'Gemini 4 Hydrogen' : 'Demo Deterministic Mode'}). Assessment: ${aiResult.assessmentStatus}.`
    );

    run.status = 'completed';
    run.completedAt = new Date().toISOString();
    persistRun();
    workflowBus.emit(`case:${caseId}`, { kind: 'complete', run });
    return run;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Workflow execution failed';
    // Mark whichever node was running as failed
    run.nodes = run.nodes.map((n) =>
      n.status === 'running' ? { ...n, status: 'failed', error: message } : n
    );
    run.status = 'failed';
    run.completedAt = new Date().toISOString();
    emitEvent('workflow_failed', 'ai_engine', 'Workflow execution failed', message);
    persistRun();
    appendCaseActivity(caseId, 'analysis_failed', `Workflow failed: ${message}`);
    workflowBus.emit(`case:${caseId}`, { kind: 'error', error: message, run });
    throw err;
  } finally {
    // Keep final state briefly then rely on persisted DB record
    setTimeout(() => activeRuns.delete(caseId), 30000);
  }
}
