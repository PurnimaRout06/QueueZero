import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';
import { CURATED_SAMPLE_POLICIES } from './core/policyLogic';
import type {
  AssessmentRecord,
  CaseActivityRecord,
  CaseRecord,
  CaseStatus,
  ComplaintDraftRecord,
  DocumentRecord,
  EvidenceRecord,
  PolicyRecord,
  UserProfile,
  WorkflowRunRecord,
} from '../src/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'queuezero.db');
export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      company TEXT NOT NULL,
      product_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      storage_path TEXT NOT NULL,
      extracted_text TEXT NOT NULL DEFAULT '',
      extraction_status TEXT NOT NULL DEFAULT 'pending',
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      document_id TEXT,
      evidence_type TEXT NOT NULL,
      extracted_value TEXT NOT NULL,
      source_reference TEXT NOT NULL,
      confidence TEXT NOT NULL,
      confidence_reason TEXT NOT NULL DEFAULT '',
      verification_status TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      brand TEXT NOT NULL,
      policy_name TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_reference TEXT NOT NULL,
      support_channel TEXT NOT NULL DEFAULT '',
      policy_content TEXT NOT NULL,
      clauses_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      assessment_status TEXT NOT NULL,
      findings TEXT NOT NULL,
      missing_information TEXT NOT NULL,
      limitations TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS complaint_drafts (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      draft_content TEXT NOT NULL,
      approval_status TEXT NOT NULL DEFAULT 'pending_approval',
      checklist_json TEXT NOT NULL DEFAULT '[]',
      follow_up_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS case_activity (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workflow_runs (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      nodes_json TEXT NOT NULL,
      events_json TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );
  `);

  seedPolicies();
  seedDemoAccountAndCases();
}

function seedPolicies(): void {
  const upsert = db.prepare(`
    INSERT INTO policies (
      id, brand, policy_name, policy_version, source_type, source_reference,
      support_channel, policy_content, clauses_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      brand = excluded.brand,
      policy_name = excluded.policy_name,
      policy_version = excluded.policy_version,
      source_type = excluded.source_type,
      source_reference = excluded.source_reference,
      support_channel = excluded.support_channel,
      policy_content = excluded.policy_content,
      clauses_json = excluded.clauses_json,
      updated_at = excluded.updated_at
  `);

  for (const p of CURATED_SAMPLE_POLICIES) {
    upsert.run(
      p.id,
      p.brand,
      p.policyName,
      p.policyVersion,
      p.sourceType,
      p.sourceReference,
      p.supportChannel,
      p.policyContent,
      JSON.stringify(p.clauses),
      p.updatedAt
    );
  }
}

export const DEMO_USER_EMAIL = 'demo@queuezero.app';
export const DEMO_USER_PASSWORD = 'QueueZeroDemo2026!';

function seedDemoAccountAndCases(): void {
  const existingUser = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(DEMO_USER_EMAIL) as { id: string } | undefined;

  if (existingUser) return;

  const userId = 'user-demo-queuezero';
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, 'Maya Lin (Demo User)', DEMO_USER_EMAIL, hashPassword(DEMO_USER_PASSWORD), now);

  // Seed 1 sample draft case ready for the user to inspect or re-analyze
  const caseId = 'case-demo-novatech-01';
  const createdAt = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString();
  db.prepare(`
    INSERT INTO cases (id, user_id, title, category, description, company, product_name, status, is_demo, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    caseId,
    userId,
    'ApexBook Pro 14 Charging Port Failure (Demo Sample)',
    'Laptop Warranty & Consumer Complaint',
    'Purchased a NovaTech ApexBook Pro 14 laptop 6 months ago. It stopped charging over both USB-C ports yesterday even with the original OEM adapter. No liquid spill or physical damage.',
    'NovaTech',
    'ApexBook Pro 14',
    'ready_to_submit',
    createdAt,
    now
  );

  const sampleDocText = [
    'HORIZON TECH RETAIL LLC — OFFICIAL PURCHASE INVOICE (DEMO SAMPLE)',
    'Invoice No: INV-2026-88412',
    'Purchase Date: May 18, 2026',
    'Seller: Horizon Tech Retail LLC (Authorized NovaTech Reseller)',
    'Brand: NovaTech',
    'Product Name: ApexBook Pro 14',
    'Model: NB-APX14-M4',
    'Serial Number: SN-NT9948201',
    'Total Paid: $1,299.00 USD',
    'Warranty Terms: 12-Month Limited Hardware Warranty from Purchase Date',
  ].join('\n');

  const docId = 'doc-demo-invoice-01';
  db.prepare(`
    INSERT INTO documents (id, case_id, filename, file_type, file_size, storage_path, extracted_text, extraction_status, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    docId,
    caseId,
    'demo_novatech_invoice.txt',
    'text/plain',
    Buffer.byteLength(sampleDocText),
    'demo://sample-invoice',
    sampleDocText,
    'completed',
    createdAt
  );

  const evidenceRows = [
    ['Invoice Number', 'INV-2026-88412', 'demo_novatech_invoice.txt (Line 2: "Invoice No: INV-2026-88412")', 'High', 'Direct labeled field match extracted verbatim.', 'verified_from_document'],
    ['Purchase Date', 'May 18, 2026', 'demo_novatech_invoice.txt (Line 3: "Purchase Date: May 18, 2026")', 'High', 'Direct labeled field match extracted verbatim.', 'verified_from_document'],
    ['Seller / Retailer', 'Horizon Tech Retail LLC (Authorized NovaTech Reseller)', 'demo_novatech_invoice.txt (Line 4: "Seller: Horizon Tech Retail LLC...")', 'High', 'Direct labeled field match extracted verbatim.', 'verified_from_document'],
    ['Brand / Manufacturer', 'NovaTech', 'demo_novatech_invoice.txt (Line 5: "Brand: NovaTech")', 'High', 'Direct labeled field match extracted verbatim.', 'verified_from_document'],
    ['Model Identifier', 'NB-APX14-M4', 'demo_novatech_invoice.txt (Line 7: "Model: NB-APX14-M4")', 'High', 'Direct labeled field match extracted verbatim.', 'verified_from_document'],
    ['Serial Number', 'SN-NT9948201', 'demo_novatech_invoice.txt (Line 8: "Serial Number: SN-NT9948201")', 'High', 'Direct labeled field match extracted verbatim.', 'verified_from_document'],
  ];

  const insertEv = db.prepare(`
    INSERT INTO evidence (id, case_id, document_id, evidence_type, extracted_value, source_reference, confidence, confidence_reason, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  evidenceRows.forEach((row, idx) => {
    insertEv.run(`ev-demo-${idx + 1}`, caseId, docId, row[0], row[1], row[2], row[3], row[4], row[5]);
  });

  const findings = {
    summary:
      'Verified invoice facts (purchase date May 18, 2026, invoice INV-2026-88412, authorized seller) align with NovaTech ApexBook 12-month hardware defect coverage for power/charging subsystems.',
    supportedPoints: [
      {
        claim: 'Purchase is within the 12-month standard coverage window.',
        evidenceRef: 'demo_novatech_invoice.txt (Line 3: Purchase Date May 18, 2026)',
        policyRef: 'NovaTech Clause NT-1.1 (12-Month Hardware Defect Coverage)',
      },
      {
        claim: 'Purchased from an authorized reseller with serialized invoice proof.',
        evidenceRef: 'demo_novatech_invoice.txt (Line 2 & Line 4)',
        policyRef: 'NovaTech Clause NT-1.1 & NT-3.2',
      },
    ],
    uncertainOrMissingPoints: [
      {
        topic: 'Depot physical inspection confirmation',
        reason: 'Manufacturer inspection is still required to confirm absence of internal port strain or liquid residue.',
      },
    ],
    relevantClauses: CURATED_SAMPLE_POLICIES[0].clauses.map((c) => ({
      clauseId: c.clauseId,
      title: c.title,
      sourceDocument: CURATED_SAMPLE_POLICIES[0].policyName,
      relevance: c.excerpt,
      conditions: c.conditions,
      exclusions: c.exclusions,
    })),
    missingPolicyInfo: [
      'Uploaded demo file contains summary warranty line only; full regional service addendum should be verified at RMA submission.',
    ],
    evidenceQualitySummary:
      'High extraction clarity from structured invoice lines; depot hardware inspection remains an external verification step.',
    analysisMode: 'demo_deterministic',
  };

  db.prepare(`
    INSERT INTO assessments (id, case_id, assessment_status, findings, missing_information, limitations, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'assess-demo-01',
    caseId,
    'Supported',
    JSON.stringify(findings),
    JSON.stringify([
      'Confirm whether the laptop was tested with a second known-good OEM USB-C cable/adapter.',
      'Attach a photo of the laptop underside serial label and charging port.',
    ]),
    JSON.stringify([
      'Demo Sample Case: evaluated against curated sample policy KB rather than a live manufacturer warranty database.',
    ]),
    now
  );

  const sampleChecklist = [
    {
      id: 'step-1',
      title: 'Capture charging port & serial label photos',
      description: 'Photograph the underside S/N label (SN-NT9948201) and clean USB-C charging ports before packaging.',
      category: 'attachments',
      completed: true,
    },
    {
      id: 'step-2',
      title: 'Review and approve complaint draft',
      description: 'Verify every fact in the generated complaint draft and click Approve Draft before sending.',
      category: 'immediate',
      completed: false,
    },
    {
      id: 'step-3',
      title: 'Submit via NovaTech Authorized Care Portal',
      description: 'Email support@novatech-devices.example with demo_novatech_invoice.txt attached and request an RMA ticket.',
      category: 'contact',
      completed: false,
    },
  ];

  const sampleDraft = `Subject: Warranty Service & Charging Defect Claim — NovaTech ApexBook Pro 14 (Ref: INV-2026-88412)

Dear NovaTech Customer Support & Warranty Team,

I am writing to formally request warranty evaluation and repair/replacement support for my NovaTech ApexBook Pro 14, which has stopped charging under normal use.

Verified Device & Purchase Details:
- Product: ApexBook Pro 14
- Model: NB-APX14-M4
- Serial Number: SN-NT9948201
- Invoice / Order Reference: INV-2026-88412
- Purchase Date: May 18, 2026
- Seller / Retailer: Horizon Tech Retail LLC (Authorized NovaTech Reseller)

Description of Issue:
Purchased a NovaTech ApexBook Pro 14 laptop 6 months ago. It stopped charging over both USB-C ports yesterday even with the original OEM adapter. No liquid spill or physical damage.

Relevant Policy Reference: NovaTech ApexBook Limited Hardware Warranty (Curated Sample KB) (2025.1-sample) — NT-1.1: 12-Month Hardware Defect Coverage; NT-2.4: Power Adapter, Battery & Charging Exclusions; NT-3.2: RMA & Escalation Procedure.

Requested Resolution:
Please review the attached purchase documentation and issue a written warranty claim / RMA ticket number along with instructions for diagnostic inspection and repair or replacement under the applicable warranty terms.

Sincerely,
Maya Lin (Demo User)
demo@queuezero.app`;

  db.prepare(`
    INSERT INTO complaint_drafts (id, case_id, draft_content, approval_status, checklist_json, follow_up_note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'draft-demo-01',
    caseId,
    sampleDraft,
    'pending_approval',
    JSON.stringify(sampleChecklist),
    null,
    now,
    now
  );

  const insertAct = db.prepare(`
    INSERT INTO case_activity (id, case_id, action, description, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertAct.run('act-demo-1', caseId, 'case_created', 'Demo sample case created with purchase invoice evidence.', createdAt);
  insertAct.run('act-demo-2', caseId, 'analysis_completed', 'MCP Evidence & Policy evaluation completed (Status: Supported).', now);
}

export function getAllPolicies(): PolicyRecord[] {
  const rows = db.prepare('SELECT * FROM policies ORDER BY brand ASC').all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    brand: String(r.brand),
    policyName: String(r.policy_name),
    policyVersion: String(r.policy_version),
    sourceType: r.source_type as PolicyRecord['sourceType'],
    sourceReference: String(r.source_reference),
    supportChannel: String(r.support_channel || ''),
    policyContent: String(r.policy_content),
    clauses: JSON.parse(String(r.clauses_json || '[]')),
    updatedAt: String(r.updated_at),
  }));
}

export function getUserById(userId: string): UserProfile | null {
  const row = db
    .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
    .get(userId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    createdAt: String(row.created_at),
  };
}

export function listCasesForUser(userId: string): CaseRecord[] {
  const rows = db
    .prepare(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM documents d WHERE d.case_id = c.id) AS doc_count,
        (SELECT a.assessment_status FROM assessments a WHERE a.case_id = c.id ORDER BY a.created_at DESC LIMIT 1) AS latest_assessment_status
      FROM cases c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
    `)
    .all(userId) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    title: String(r.title),
    category: String(r.category),
    description: String(r.description),
    company: String(r.company),
    productName: String(r.product_name),
    status: r.status as CaseStatus,
    isDemo: Boolean(r.is_demo),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    documentCount: Number(r.doc_count || 0),
    assessmentStatus: (r.latest_assessment_status as CaseRecord['assessmentStatus']) || null,
  }));
}

export function getCaseForUser(caseId: string, userId: string): CaseRecord | null {
  const row = db
    .prepare('SELECT * FROM cases WHERE id = ? AND user_id = ?')
    .get(caseId, userId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    category: String(row.category),
    description: String(row.description),
    company: String(row.company),
    productName: String(row.product_name),
    status: row.status as CaseStatus,
    isDemo: Boolean(row.is_demo),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function getCaseDocuments(caseId: string): Array<DocumentRecord & { storagePath: string }> {
  const rows = db
    .prepare('SELECT * FROM documents WHERE case_id = ? ORDER BY uploaded_at ASC')
    .all(caseId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    caseId: String(r.case_id),
    filename: String(r.filename),
    fileType: String(r.file_type),
    fileSize: Number(r.file_size || 0),
    storagePath: String(r.storage_path),
    extractedText: String(r.extracted_text || ''),
    extractionStatus: r.extraction_status as DocumentRecord['extractionStatus'],
    uploadedAt: String(r.uploaded_at),
  }));
}

export function getCaseEvidence(caseId: string): EvidenceRecord[] {
  const rows = db
    .prepare('SELECT * FROM evidence WHERE case_id = ?')
    .all(caseId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    caseId: String(r.case_id),
    documentId: r.document_id ? String(r.document_id) : null,
    evidenceType: String(r.evidence_type),
    extractedValue: String(r.extracted_value),
    sourceReference: String(r.source_reference),
    confidence: r.confidence as EvidenceRecord['confidence'],
    confidenceReason: String(r.confidence_reason || ''),
    verificationStatus: r.verification_status as EvidenceRecord['verificationStatus'],
  }));
}

export function getLatestAssessment(caseId: string): AssessmentRecord | null {
  const row = db
    .prepare('SELECT * FROM assessments WHERE case_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(caseId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    caseId: String(row.case_id),
    assessmentStatus: row.assessment_status as AssessmentRecord['assessmentStatus'],
    findings: JSON.parse(String(row.findings)),
    missingInformation: JSON.parse(String(row.missing_information)),
    limitations: JSON.parse(String(row.limitations)),
    createdAt: String(row.created_at),
  };
}

export function getLatestComplaintDraft(caseId: string): ComplaintDraftRecord | null {
  const row = db
    .prepare('SELECT * FROM complaint_drafts WHERE case_id = ? ORDER BY updated_at DESC LIMIT 1')
    .get(caseId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    caseId: String(row.case_id),
    draftContent: String(row.draft_content),
    approvalStatus: row.approval_status as ComplaintDraftRecord['approvalStatus'],
    checklist: JSON.parse(String(row.checklist_json || '[]')),
    followUpNote: row.follow_up_note ? String(row.follow_up_note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function getCaseActivity(caseId: string): CaseActivityRecord[] {
  const rows = db
    .prepare('SELECT * FROM case_activity WHERE case_id = ? ORDER BY timestamp DESC')
    .all(caseId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    caseId: String(r.case_id),
    action: String(r.action),
    description: String(r.description),
    timestamp: String(r.timestamp),
  }));
}

export function getLatestWorkflowRun(caseId: string): WorkflowRunRecord | null {
  const row = db
    .prepare('SELECT * FROM workflow_runs WHERE case_id = ? ORDER BY started_at DESC LIMIT 1')
    .get(caseId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    caseId: String(row.case_id),
    mode: row.mode as WorkflowRunRecord['mode'],
    status: row.status as WorkflowRunRecord['status'],
    startedAt: String(row.started_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    nodes: JSON.parse(String(row.nodes_json || '[]')),
    events: JSON.parse(String(row.events_json || '[]')),
  };
}

export function appendCaseActivity(caseId: string, action: string, description: string): void {
  const id = `act-${crypto.randomUUID()}`;
  const ts = new Date().toISOString();
  db.prepare(
    'INSERT INTO case_activity (id, case_id, action, description, timestamp) VALUES (?, ?, ?, ?, ?)'
  ).run(id, caseId, action, description, ts);
}
