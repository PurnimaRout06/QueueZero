export type CaseStatus =
  | 'draft'
  | 'under_review'
  | 'ready_to_submit'
  | 'submitted_by_user'
  | 'awaiting_response'
  | 'resolved'
  | 'closed';

export type AssessmentStatus =
  | 'Supported'
  | 'Unsupported'
  | 'Unknown / Needs verification';

export type WorkflowNodeId =
  | 'document_upload'
  | 'evidence_mcp'
  | 'policy_mcp'
  | 'ai_engine'
  | 'resolution_mcp'
  | 'user_approval';

export type WorkflowNodeStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'waiting';

export type WorkflowEventType =
  | 'document_uploaded'
  | 'extraction_started'
  | 'extraction_completed'
  | 'evidence_mcp_called'
  | 'evidence_mcp_completed'
  | 'policy_mcp_called'
  | 'policy_mcp_completed'
  | 'assessment_started'
  | 'assessment_completed'
  | 'resolution_mcp_called'
  | 'complaint_generated'
  | 'awaiting_user_approval'
  | 'workflow_failed';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CaseRecord {
  id: string;
  userId: string;
  title: string;
  category: string;
  description: string;
  company: string;
  productName: string;
  status: CaseStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  documentCount?: number;
  assessmentStatus?: AssessmentStatus | null;
}

export interface DocumentRecord {
  id: string;
  caseId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  extractionStatus: 'pending' | 'completed' | 'partial' | 'failed';
  uploadedAt: string;
}

export interface EvidenceRecord {
  id: string;
  caseId: string;
  documentId: string | null;
  evidenceType: string;
  extractedValue: string;
  sourceReference: string;
  confidence: 'High' | 'Moderate' | 'Low';
  confidenceReason: string;
  verificationStatus: 'verified_from_document' | 'user_supplied' | 'missing' | 'needs_verification';
}

export interface PolicyClause {
  clauseId: string;
  title: string;
  excerpt: string;
  appliesTo: string;
  conditions: string[];
  exclusions: string[];
}

export interface PolicyRecord {
  id: string;
  brand: string;
  policyName: string;
  policyVersion: string;
  sourceType: 'curated_sample_kb' | 'uploaded_document';
  sourceReference: string;
  supportChannel: string;
  policyContent: string;
  clauses: PolicyClause[];
  updatedAt: string;
}

export interface AssessmentFindings {
  summary: string;
  supportedPoints: Array<{
    claim: string;
    evidenceRef: string;
    policyRef: string;
  }>;
  uncertainOrMissingPoints: Array<{
    topic: string;
    reason: string;
  }>;
  relevantClauses: Array<{
    clauseId: string;
    title: string;
    sourceDocument: string;
    relevance: string;
    conditions: string[];
    exclusions: string[];
  }>;
  missingPolicyInfo: string[];
  evidenceQualitySummary: string;
  analysisMode: 'live_ai' | 'demo_deterministic';
}

export interface AssessmentRecord {
  id: string;
  caseId: string;
  assessmentStatus: AssessmentStatus;
  findings: AssessmentFindings;
  missingInformation: string[];
  limitations: string[];
  createdAt: string;
}

export interface ResolutionStep {
  id: string;
  title: string;
  description: string;
  category: 'immediate' | 'attachments' | 'contact' | 'include' | 'escalation';
  completed: boolean;
}

export interface ComplaintDraftRecord {
  id: string;
  caseId: string;
  draftContent: string;
  approvalStatus: 'pending_approval' | 'approved';
  checklist: ResolutionStep[];
  followUpNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseActivityRecord {
  id: string;
  caseId: string;
  action: string;
  description: string;
  timestamp: string;
}

export interface WorkflowNodeState {
  id: WorkflowNodeId;
  label: string;
  subtitle: string;
  description: string;
  status: WorkflowNodeStatus;
  durationMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
  toolInvoked: string | null;
  inputSummary: unknown;
  outputSummary: unknown;
  references: string[];
  limitations: string[];
  error: string | null;
}

export interface WorkflowEventRecord {
  id: string;
  type: WorkflowEventType;
  nodeId: WorkflowNodeId;
  timestamp: string;
  durationMs?: number | null;
  title: string;
  detail: string;
  toolName?: string;
  payload?: unknown;
}

export interface WorkflowRunRecord {
  id: string;
  caseId: string;
  mode: 'live_ai' | 'demo_deterministic';
  status: 'idle' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  nodes: WorkflowNodeState[];
  events: WorkflowEventRecord[];
}

export interface CaseDetailPayload {
  caseRecord: CaseRecord;
  documents: DocumentRecord[];
  evidence: EvidenceRecord[];
  assessment: AssessmentRecord | null;
  complaintDraft: ComplaintDraftRecord | null;
  activity: CaseActivityRecord[];
  workflowRun: WorkflowRunRecord | null;
  matchedPolicies: PolicyRecord[];
}
