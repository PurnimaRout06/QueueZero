import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  appendCaseActivity,
  db,
  DEMO_USER_EMAIL,
  getAllPolicies,
  getCaseActivity,
  getCaseDocuments,
  getCaseEvidence,
  getCaseForUser,
  getLatestAssessment,
  getLatestComplaintDraft,
  getLatestWorkflowRun,
  getUserById,
  hashPassword,
  listCasesForUser,
  UPLOADS_DIR,
  verifyPassword,
} from './db';
import { requireAuth, signAuthToken, type AuthenticatedRequest } from './auth';
import { mcpManager } from './mcp/mcpClientManager';
import { extractDocumentText, hasConfiguredGeminiKey } from './services/documentProcessor';
import {
  executeCaseWorkflow,
  getActiveWorkflowRun,
  workflowBus,
} from './services/workflowOrchestrator';
import type { CaseDetailPayload, CaseStatus } from '../src/types';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg']);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '';
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: 5 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error('Only PDF, PNG, and JPG files up to 10 MB are permitted.'));
      return;
    }
    cb(null, true);
  },
});

function safeDeleteUploadedFile(storagePath: string): void {
  if (!storagePath || storagePath.startsWith('demo://')) return;
  const resolved = path.resolve(storagePath);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
    return;
  }
  if (fs.existsSync(resolved)) {
    fs.unlinkSync(resolved);
  }
}

export function createApiRouter(): express.Router {
  const router = express.Router();

  // Health & runtime capabilities (no sensitive data)
  router.get('/health', async (_req, res) => {
    const mcpServers = await mcpManager.getHealthStatus();
    res.json({
      status: 'ok',
      geminiConfigured: hasConfiguredGeminiKey(),
      mcpServers,
    });
  });

  // ---------------------------------------------------------------------------
  // Authentication Routes
  // ---------------------------------------------------------------------------
  const RegisterSchema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().trim().email('Valid email is required').max(120),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  });

  router.post('/auth/register', (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration input.' });
      return;
    }

    const emailLower = parsed.data.email.toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailLower);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const id = `user-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const passwordHash = hashPassword(parsed.data.password);

    db.prepare(
      'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, parsed.data.name, emailLower, passwordHash, createdAt);

    const user = { id, name: parsed.data.name, email: emailLower, createdAt };
    const token = signAuthToken(user);
    res.status(201).json({ user, token });
  });

  const LoginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
  });

  router.post('/auth/login', (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Valid email and password are required.' });
      return;
    }

    const emailLower = parsed.data.email.toLowerCase();
    const row = db
      .prepare('SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?')
      .get(emailLower) as Record<string, unknown> | undefined;

    if (!row || !verifyPassword(parsed.data.password, String(row.password_hash))) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const user = {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      createdAt: String(row.created_at),
    };
    const token = signAuthToken(user);
    res.json({ user, token });
  });

  router.post('/auth/demo', (_req, res) => {
    const row = db
      .prepare('SELECT id, name, email, created_at FROM users WHERE email = ?')
      .get(DEMO_USER_EMAIL) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(500).json({ error: 'Demo user is not initialized.' });
      return;
    }

    const user = {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      createdAt: String(row.created_at),
    };
    const token = signAuthToken(user);
    res.json({ user, token, isDemoSession: true });
  });

  router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // ---------------------------------------------------------------------------
  // Policies
  // ---------------------------------------------------------------------------
  router.get('/policies', requireAuth, (_req, res) => {
    res.json({ policies: getAllPolicies() });
  });

  // ---------------------------------------------------------------------------
  // Cases CRUD
  // ---------------------------------------------------------------------------
  router.get('/cases', requireAuth, (req: AuthenticatedRequest, res) => {
    const cases = listCasesForUser(req.user!.id);
    const recentActivity = db
      .prepare(`
        SELECT a.id, a.case_id, a.action, a.description, a.timestamp, c.title AS case_title
        FROM case_activity a
        JOIN cases c ON c.id = a.case_id
        WHERE c.user_id = ?
        ORDER BY a.timestamp DESC
        LIMIT 12
      `)
      .all(req.user!.id) as Array<Record<string, unknown>>;

    res.json({
      cases,
      recentActivity: recentActivity.map((r) => ({
        id: String(r.id),
        caseId: String(r.case_id),
        caseTitle: String(r.case_title),
        action: String(r.action),
        description: String(r.description),
        timestamp: String(r.timestamp),
      })),
    });
  });

  const CreateCaseSchema = z.object({
    title: z.string().trim().min(3, 'Case title must be at least 3 characters').max(140),
    category: z.string().trim().min(2).max(80).default('Laptop Warranty & Consumer Complaint'),
    description: z.string().trim().min(10, 'Please describe the issue (at least 10 characters)').max(4000),
    company: z.string().trim().min(1, 'Company / Brand name is required').max(100),
    productName: z.string().trim().min(1, 'Product name is required').max(120),
    isDemo: z.boolean().optional(),
  });

  router.post('/cases', requireAuth, (req: AuthenticatedRequest, res) => {
    const parsed = CreateCaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid case data.' });
      return;
    }

    const id = `case-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO cases (id, user_id, title, category, description, company, product_name, status, is_demo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
    `).run(
      id,
      req.user!.id,
      parsed.data.title,
      parsed.data.category,
      parsed.data.description,
      parsed.data.company,
      parsed.data.productName,
      parsed.data.isDemo ? 1 : 0,
      now,
      now
    );

    appendCaseActivity(id, 'case_created', `Case "${parsed.data.title}" opened for ${parsed.data.company}.`);
    const created = getCaseForUser(id, req.user!.id);
    res.status(201).json({ caseRecord: created });
  });

  router.get('/cases/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const caseId = String(req.params.id);
    const caseRecord = getCaseForUser(caseId, req.user!.id);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    const documents = getCaseDocuments(caseId).map(({ storagePath: _hidden, ...rest }) => rest);
    const evidence = getCaseEvidence(caseId);
    const assessment = getLatestAssessment(caseId);
    const complaintDraft = getLatestComplaintDraft(caseId);
    const activity = getCaseActivity(caseId);
    const workflowRun = getActiveWorkflowRun(caseId) || getLatestWorkflowRun(caseId);

    const allPolicies = getAllPolicies();
    const companyLower = caseRecord.company.toLowerCase();
    const matchedPolicies = allPolicies.filter(
      (p) =>
        p.brand.toLowerCase().includes(companyLower) ||
        companyLower.includes(p.brand.toLowerCase()) ||
        p.brand === 'General Consumer Law'
    );

    const payload: CaseDetailPayload = {
      caseRecord,
      documents,
      evidence,
      assessment,
      complaintDraft,
      activity,
      workflowRun,
      matchedPolicies,
    };

    res.json(payload);
  });

  router.delete('/cases/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const caseId = String(req.params.id);
    const caseRecord = getCaseForUser(caseId, req.user!.id);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    const docs = getCaseDocuments(caseId);
    for (const doc of docs) {
      safeDeleteUploadedFile(doc.storagePath);
    }

    db.prepare('DELETE FROM cases WHERE id = ? AND user_id = ?').run(caseId, req.user!.id);
    res.json({ deleted: true, caseId });
  });

  // ---------------------------------------------------------------------------
  // Document Upload & Demo Document Loader
  // ---------------------------------------------------------------------------
  router.post('/cases/:id/documents', requireAuth, (req: AuthenticatedRequest, res) => {
    const caseId = String(req.params.id);
    const caseRecord = getCaseForUser(caseId, req.user!.id);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    upload.array('files', 5)(req, res, async (uploadErr) => {
      if (uploadErr) {
        res.status(400).json({
          error: uploadErr instanceof Error ? uploadErr.message : 'File upload failed.',
        });
        return;
      }

      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        res.status(400).json({ error: 'Please select at least one PDF, PNG, or JPG file.' });
        return;
      }

      const uploadedDocs = [];
      for (const file of files) {
        const extraction = await extractDocumentText({
          filePath: file.path,
          mimeType: file.mimetype,
          originalName: file.originalname,
        });

        const docId = `doc-${crypto.randomUUID()}`;
        const uploadedAt = new Date().toISOString();
        db.prepare(`
          INSERT INTO documents (id, case_id, filename, file_type, file_size, storage_path, extracted_text, extraction_status, uploaded_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          docId,
          caseId,
          file.originalname,
          file.mimetype,
          file.size,
          file.path,
          extraction.extractedText,
          extraction.extractionStatus,
          uploadedAt
        );

        appendCaseActivity(
          caseId,
          'document_uploaded',
          `Uploaded "${file.originalname}" (${Math.round(file.size / 1024)} KB, extraction: ${extraction.extractionStatus}).`
        );

        uploadedDocs.push({
          id: docId,
          caseId,
          filename: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          extractedText: extraction.extractedText,
          extractionStatus: extraction.extractionStatus,
          uploadedAt,
          note: extraction.note,
        });
      }

      db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(
        new Date().toISOString(),
        caseId
      );

      res.status(201).json({ documents: uploadedDocs });
    });
  });

  router.post('/cases/:id/demo-documents', requireAuth, (req: AuthenticatedRequest, res) => {
    const caseId = String(req.params.id);
    const caseRecord = getCaseForUser(caseId, req.user!.id);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    const now = new Date().toISOString();
    const invoiceText = [
      'HORIZON TECH RETAIL LLC — DEMO SAMPLE PURCHASE INVOICE',
      'Invoice No: INV-2026-90415',
      'Purchase Date: May 22, 2026',
      'Seller: Horizon Tech Retail LLC (Authorized NovaTech Partner)',
      `Brand: ${caseRecord.company || 'NovaTech'}`,
      `Product Name: ${caseRecord.productName || 'ApexBook Pro 14'}`,
      'Model: NB-APX14-M4',
      'Serial Number: SN-NT8831049',
      'Total Paid: $1,349.00 USD',
      'Warranty Terms: 12-Month Limited Hardware Warranty',
    ].join('\n');

    const warrantyCardText = [
      'DEMO SAMPLE MANUFACTURER WARRANTY CARD',
      `Manufacturer: ${caseRecord.company || 'NovaTech'}`,
      'Coverage: 12 Months Hardware & Charging Subsystem',
      'Exclusions: Liquid ingress, physical port impact, non-OEM chargers',
    ].join('\n');

    const docs = [
      {
        id: `doc-${crypto.randomUUID()}`,
        filename: 'demo_sample_invoice.txt',
        text: invoiceText,
      },
      {
        id: `doc-${crypto.randomUUID()}`,
        filename: 'demo_sample_warranty_card.txt',
        text: warrantyCardText,
      },
    ];

    const insertDoc = db.prepare(`
      INSERT INTO documents (id, case_id, filename, file_type, file_size, storage_path, extracted_text, extraction_status, uploaded_at)
      VALUES (?, ?, ?, 'text/plain', ?, 'demo://sample', ?, 'completed', ?)
    `);

    for (const d of docs) {
      insertDoc.run(d.id, caseId, d.filename, Buffer.byteLength(d.text), d.text, now);
    }

    db.prepare('UPDATE cases SET is_demo = 1, updated_at = ? WHERE id = ?').run(now, caseId);
    appendCaseActivity(
      caseId,
      'demo_documents_attached',
      'Attached clearly labeled Demo Sample Invoice & Warranty Card.'
    );

    res.status(201).json({
      documents: docs.map((d) => ({
        id: d.id,
        caseId,
        filename: d.filename,
        fileType: 'text/plain',
        fileSize: Buffer.byteLength(d.text),
        extractedText: d.text,
        extractionStatus: 'completed',
        uploadedAt: now,
      })),
    });
  });

  // ---------------------------------------------------------------------------
  // AI & MCP Workflow Execution + SSE Stream
  // ---------------------------------------------------------------------------
  router.post('/cases/:id/analyze', requireAuth, (req: AuthenticatedRequest, res) => {
    const caseId = String(req.params.id);
    const caseRecord = getCaseForUser(caseId, req.user!.id);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    const existingActive = getActiveWorkflowRun(caseId);
    if (existingActive && existingActive.status === 'running') {
      res.json({ runId: existingActive.id, status: 'running', mode: existingActive.mode });
      return;
    }

    const forceDemoMode = Boolean(req.body?.demoMode);
    const useDemoMode = forceDemoMode || !hasConfiguredGeminiKey();

    // Launch workflow asynchronously so SSE subscribers observe every real MCP stage transition
    executeCaseWorkflow({
      caseId,
      userId: req.user!.id,
      forceDemoMode: useDemoMode,
    }).catch((err) => {
      console.error(`Workflow error for case ${caseId}:`, err instanceof Error ? err.message : err);
    });

    res.status(202).json({
      status: 'started',
      mode: useDemoMode ? 'demo_deterministic' : 'live_ai',
    });
  });

  router.get('/cases/:id/events', requireAuth, (req: AuthenticatedRequest, res) => {
    const caseId = String(req.params.id);
    const caseRecord = getCaseForUser(caseId, req.user!.id);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendPacket = (eventName: string, data: unknown) => {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const currentRun = getActiveWorkflowRun(caseId) || getLatestWorkflowRun(caseId);
    sendPacket('snapshot', { run: currentRun });

    const onUpdate = (payload: { kind: string; event?: unknown; run: unknown; error?: string }) => {
      sendPacket(payload.kind, payload);
      if (payload.kind === 'complete' || payload.kind === 'error') {
        setTimeout(() => {
          if (!res.writableEnded) res.end();
        }, 150);
      }
    };

    workflowBus.on(`case:${caseId}`, onUpdate);

    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': ping\n\n');
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      workflowBus.off(`case:${caseId}`, onUpdate);
    });
  });

  // ---------------------------------------------------------------------------
  // Complaint Draft Edit, Approval, Regenerate & Case Tracking
  // ---------------------------------------------------------------------------
  const UpdateDraftSchema = z.object({
    draftContent: z.string().min(10).max(20000).optional(),
    approve: z.boolean().optional(),
    checklist: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          category: z.enum(['immediate', 'attachments', 'contact', 'include', 'escalation']),
          completed: z.boolean(),
        })
      )
      .optional(),
  });

  router.patch('/cases/:id/draft', requireAuth, (req: AuthenticatedRequest, res) => {
    const caseId = String(req.params.id);
    const caseRecord = getCaseForUser(caseId, req.user!.id);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    const parsed = UpdateDraftSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid draft update.' });
      return;
    }

    const existing = getLatestComplaintDraft(caseId);
    if (!existing) {
      res.status(404).json({ error: 'No complaint draft exists yet. Run analysis first.' });
      return;
    }

    const now = new Date().toISOString();
    const nextContent = parsed.data.draftContent ?? existing.draftContent;
    const nextChecklist = parsed.data.checklist ?? existing.checklist;
    const nextApproval =
      parsed.data.approve === true
        ? 'approved'
        : parsed.data.draftContent !== undefined
        ? 'pending_approval'
        : existing.approvalStatus;

    db.prepare(`
      UPDATE complaint_drafts
      SET draft_content = ?, approval_status = ?, checklist_json = ?, updated_at = ?
      WHERE id = ?
    `).run(nextContent, nextApproval, JSON.stringify(nextChecklist), now, existing.id);

    if (parsed.data.approve === true) {
      appendCaseActivity(
        caseId,
        'draft_approved',
        'User reviewed and explicitly approved the complaint draft for submission.'
      );
      // Mark User Approval workflow node completed if a workflow run exists
      const latestRun = getLatestWorkflowRun(caseId);
      if (latestRun) {
        const updatedNodes = latestRun.nodes.map((n) =>
          n.id === 'user_approval'
            ? {
                ...n,
                status: 'completed',
                completedAt: now,
                outputSummary: { approvalStatus: 'approved', approvedBy: req.user!.email },
              }
            : n
        );
        db.prepare('UPDATE workflow_runs SET nodes_json = ? WHERE id = ?').run(
          JSON.stringify(updatedNodes),
          latestRun.id
        );
      }
    } else if (parsed.data.draftContent !== undefined) {
      appendCaseActivity(caseId, 'draft_edited', 'User edited the complaint draft text.');
    }

    db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(now, caseId);
    res.json({ complaintDraft: getLatestComplaintDraft(caseId) });
  });

  router.post('/cases/:id/draft/regenerate', requireAuth, async (req: AuthenticatedRequest, res) => {
    const caseId = String(req.params.id);
    const caseRecord = getCaseForUser(caseId, req.user!.id);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    const documents = getCaseDocuments(caseId).map((d) => ({
      id: d.id,
      filename: d.filename,
      extractedText: d.extractedText,
    }));
    const assessment = getLatestAssessment(caseId);

    const extractRes = await mcpManager.callTool<{ fields: Record<string, string | null> }>(
      'evidence',
      'extract_invoice_details',
      {
        documents,
        userCaseInput: {
          company: caseRecord.company,
          productName: caseRecord.productName,
          description: caseRecord.description,
        },
      }
    );

    const searchRes = await mcpManager.callTool<{ matched: Array<{ id: string }> }>(
      'policy',
      'search_warranty_policy',
      {
        brand: extractRes.data.fields.brand || caseRecord.company,
        issueKeywords: caseRecord.description,
      }
    );

    const draftRes = await mcpManager.callTool<{ draftContent: string }>(
      'resolution',
      'generate_complaint_draft',
      {
        userName: req.user!.name,
        userEmail: req.user!.email,
        company: caseRecord.company,
        productName: caseRecord.productName,
        description: caseRecord.description,
        fields: extractRes.data.fields,
        matchedPolicyIds: searchRes.data.matched.map((p) => p.id),
        assessmentStatus: assessment?.assessmentStatus || 'Unknown / Needs verification',
        missingInformation: assessment?.missingInformation || [],
      }
    );

    const existing = getLatestComplaintDraft(caseId);
    const now = new Date().toISOString();
    if (existing) {
      db.prepare(
        'UPDATE complaint_drafts SET draft_content = ?, approval_status = ?, updated_at = ? WHERE id = ?'
      ).run(draftRes.data.draftContent, 'pending_approval', now, existing.id);
    }

    appendCaseActivity(
      caseId,
      'draft_regenerated',
      'Complaint draft regenerated via Resolution MCP Server (requires re-approval).'
    );

    res.json({ complaintDraft: getLatestComplaintDraft(caseId) });
  });

  const UpdateStatusSchema = z.object({
    status: z.enum([
      'draft',
      'under_review',
      'ready_to_submit',
      'submitted_by_user',
      'awaiting_response',
      'resolved',
      'closed',
    ]),
    createFollowUpReminder: z.boolean().optional(),
  });

  router.patch('/cases/:id/status', requireAuth, async (req: AuthenticatedRequest, res) => {
    const caseId = String(req.params.id);
    const caseRecord = getCaseForUser(caseId, req.user!.id);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    const parsed = UpdateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid status value.' });
      return;
    }

    const draft = getLatestComplaintDraft(caseId);
    const validationRes = await mcpManager.callTool<{ allowed: boolean; reason?: string }>(
      'resolution',
      'update_case_status',
      {
        fromStatus: caseRecord.status,
        toStatus: parsed.data.status,
        approvalStatus: draft ? draft.approvalStatus : null,
      }
    );

    if (!validationRes.data.allowed) {
      res.status(400).json({ error: validationRes.data.reason || 'Status transition not allowed.' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE cases SET status = ?, updated_at = ? WHERE id = ?').run(
      parsed.data.status,
      now,
      caseId
    );

    let followUpNote: string | null = draft?.followUpNote || null;
    if (
      parsed.data.createFollowUpReminder ||
      parsed.data.status === 'submitted_by_user' ||
      parsed.data.status === 'awaiting_response'
    ) {
      const followRes = await mcpManager.callTool<{ followUpDate: string; note: string }>(
        'resolution',
        'create_followup',
        {
          company: caseRecord.company,
          submittedAtIso: now,
          daysToWait: 5,
        }
      );
      followUpNote = followRes.data.note;
      if (draft) {
        db.prepare('UPDATE complaint_drafts SET follow_up_note = ?, updated_at = ? WHERE id = ?').run(
          followUpNote,
          now,
          draft.id
        );
      }
    }

    appendCaseActivity(
      caseId,
      'status_updated',
      `Case status manually updated to "${parsed.data.status.replace(/_/g, ' ')}".`
    );

    res.json({
      caseRecord: getCaseForUser(caseId, req.user!.id),
      followUpNote,
    });
  });

  // ---------------------------------------------------------------------------
  // User-triggered Case + Account Cleanup (Privacy)
  // ---------------------------------------------------------------------------
  router.get('/users/me/export', requireAuth, (req: AuthenticatedRequest, res) => {
    const cases = listCasesForUser(req.user!.id);
    res.json({
      exportedAt: new Date().toISOString(),
      user: getUserById(req.user!.id),
      casesCount: cases.length,
      cases,
    });
  });

  return router;
}
