# QueueZero

**Less paperwork. More progress.**

QueueZero is an AI-powered administrative resolution agent built on **Proof-Carrying Automation** and real **Model Context Protocol (MCP)** orchestration.

Instead of acting like a generic chatbot that guesses whether you are covered, QueueZero reads your uploaded invoices and receipts, retrieves applicable policy clauses through independent stdio MCP servers, flags missing evidence and exclusions honestly, drafts a formal complaint grounded strictly in verified facts, and requires explicit human approval before anything leaves your workspace.

---

## Why QueueZero?

Consumers facing warranty claims, billing disputes, or formal complaints run into the same barriers:

- **Buried fine print** across multi-page warranty PDFs and vendor policies.
- **Generic AI hallucinations** that confidently say *"you're covered"* without citing a clause or checking exclusions.
- **Silent evidence gaps** (missing serial numbers, non-OEM charger questions, reseller proof) that cause preventable claim rejections.

**QueueZero's core rule is Proof-Carrying Automation:**

- Every extracted fact links back to its **exact source document and line number** (e.g., `demo_sample_invoice.txt · Line 2`).
- Every policy check cites **retrieved clauses** (`NT-1.1`, `NT-2.4`, `NT-3.2`) and marks claims **Supported**, **Unsupported**, or **Needs Verification** with explicit limitations.
- Missing facts become **bracketed placeholders** and checklist action items—never invented numbers or false guarantees.
- External action is **strictly approval-gated**: Copy, Download, and submission status updates stay locked until you explicitly review and click **Approve Draft**.

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         React 19 + Vite Frontend                          │
│  Landing Showcase · Dashboard · Intake · React Flow SSE Graph · Workspace │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │ REST + Server-Sent Events (SSE)
┌───────────────────────────────────▼───────────────────────────────────────┐
│                      Express API & Workflow Orchestrator                  │
│   Auth (HMAC) · Multer + Magic-Byte Sandbox · SQLite · SSE Event Stream   │
├───────────────────┬───────────────────────────────────┬───────────────────┤
│  Gemini 4 Engine  │     ElevenLabs Voice Briefings    │  AWS S3 Vault     │
│  (Structured JSON │     (Rachel, Sarah, Adam, Antoni  │  (AES-256 SSE-S3  │
│   + Vision OCR)   │      + Web Speech Fallback)       │   + Local Vault)  │
└─────────┬─────────┴─────────────────┬─────────────────┴─────────┬─────────┘
          │ stdio MCP                 │ stdio MCP                 │ stdio MCP
┌─────────▼─────────┐       ┌─────────▼─────────┐       ┌─────────▼─────────┐
│   Evidence MCP    │       │    Policy MCP     │       │  Resolution MCP   │
│  evidenceServer   │       │   policyServer    │       │ resolutionServer  │
└───────────────────┘       └───────────────────┘       └───────────────────┘
```

### Three Independent Stdio MCP Servers (`server/mcp/`)

Spawned automatically by `server/mcp/mcpClientManager.ts` using `@modelcontextprotocol/sdk`:

| Server | Binary / Entry | Exposed MCP Tools | Responsibility |
| :--- | :--- | :--- | :--- |
| **Evidence MCP** (`queuezero-evidence-mcp`) | `server/mcp/evidenceServer.ts` | `extract_invoice_details`, `analyze_uploaded_document`, `get_document_evidence`, `identify_missing_information` | Parses uploaded invoices/cards, maps every field to source lines, scores extraction confidence, and flags gaps. |
| **Policy MCP** (`queuezero-policy-mcp`) | `server/mcp/policyServer.ts` | `search_warranty_policy`, `get_policy_clause`, `check_warranty_conditions`, `get_policy_source` | Searches curated warranty knowledge bases, retrieves exact clause text, and checks exclusions against symptoms. |
| **Resolution MCP** (`queuezero-resolution-mcp`) | `server/mcp/resolutionServer.ts` | `generate_complaint_draft`, `create_resolution_checklist`, `update_case_status`, `get_next_action`, `create_followup` | Generates grounded complaint letters, 5-step resolution checklists, status transitions, and 5-day follow-up reminders. |

---

## Core Features

### 1. Live Visual AI Workflow (`@xyflow/react` + SSE)
- Real-time node graph streaming every stage (`Document Upload` → `Evidence MCP Server` → `Policy MCP Server` → `AI Resolution Engine` → `Resolution MCP Server` → `User Approval`).
- Click any node in **Node Inspector** to inspect tool names, execution timings (`ms`), structured inputs/outputs, references, and limitations.
- Toggle **Chronological Execution Timeline** to view raw stdio MCP tool call traces and JSON payloads.

### 2. Proof-Carrying Evidence & Policy Assessment
- Side-by-side **Extracted Facts & Source References** table with line-level provenance and confidence levels.
- **Policy Assessment** displaying matched clauses, required conditions, potential exclusions, and honest limitations.
- **Missing Information** callouts highlighting any evidence needed to strengthen the claim.

### 3. Human-in-the-Loop Complaint Editor & Action Plan
- Interactive 5-step **Actionable Resolution Plan** generated by `Resolution MCP`.
- Editable **Complaint Letter Editor** with verified facts pre-filled and missing details held as bracketed placeholders.
- **Approval Gate**: Copying, downloading `.txt`, or advancing case status to `Submitted by user` is enforced server-side and unlocked only after explicit draft approval.

### 4. Spoken Case & Draft Briefings (ElevenLabs + Browser Fallback)
- Server-side `/api/cases/:id/voice-briefing` integrates **ElevenLabs** (`eleven_multilingual_v2`) across four selectable voices (*Rachel*, *Sarah*, *Adam*, *Antoni*) to narrate case assessments or read back complaint drafts for review.
- Automatically offers a **Browser Voice Preview** (Web Speech API) when `ELEVENLABS_API_KEY` is not set.

### 5. Durable Evidence Vault & Audit Trail
- Supports **AWS S3 Evidence Vault** (`@aws-sdk/client-s3` with `SSE-S3` AES-256 encryption) and seamlessly falls back to path-confined local storage (`uploads/`) with authenticated download streaming.
- Immutable **Case Audit Activity Log**, 7-stage status tracker, 5-day follow-up reminder generator, JSON user data export, and full case + file deletion control.

### 6. Security & Untrusted-Data Guarantees
- **Magic-byte validation & extension allowlist** (`PDF`, `PNG`, `JPG`, `TXT`; 10 MB limit) — uploaded files are never executed.
- **Prompt-injection sanitization** (`sanitizeUntrustedDocumentText`) wraps document contents strictly as untrusted data.
- **HMAC-SHA256 authenticated sessions** (`SESSION_SECRET`) with user-scoped access checks on every route and file download.
- **Zero client-side secrets**: Gemini, ElevenLabs, and AWS credentials are strictly server-side.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons, Motion (`motion/react`), React Flow (`@xyflow/react`) |
| **Backend** | Node.js 22+, Express 4, Server-Sent Events (SSE), Multer, Zod, `unpdf` |
| **AI & MCP** | `@google/genai` (`gemini-4-hydrogen`), `@modelcontextprotocol/sdk` (3 stdio servers), ElevenLabs TTS API |
| **Storage & DB** | SQLite (`node:sqlite` `DatabaseSync` with WAL + foreign keys), AWS S3 (`@aws-sdk/client-s3`) |
| **Testing** | Node built-in test runner (`node:test`), TypeScript (`tsc --noEmit`) |

---

## Getting Started

### Prerequisites

- **Node.js** `22+`
- **npm** `10+`

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` (or configure secrets in your hosting environment). QueueZero runs out of the box with zero external keys using **Demo Deterministic Mode**:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `PORT` | No | Server port (defaults to `3000`). |
| `GEMINI_API_KEY` | No | Enables live `gemini-4-hydrogen` reasoning and image OCR. Without it, QueueZero uses its labeled Demo Deterministic Mode alongside all 3 real MCP servers. |
| `ELEVENLABS_API_KEY` | No | Enables server-side ElevenLabs spoken audio briefings. |
| `ELEVENLABS_VOICE_ID` | No | Default voice ID (defaults to `21m00Tcm4TlvDq8ikWAM` — Rachel). |
| `ELEVENLABS_MODEL_ID` | No | ElevenLabs model ID (defaults to `eleven_multilingual_v2`). |
| `AWS_REGION` | No | AWS region for S3 Evidence Vault (e.g., `us-east-1`). |
| `AWS_ACCESS_KEY_ID` | No | AWS IAM access key ID for S3 uploads/downloads. |
| `AWS_SECRET_ACCESS_KEY` | No | AWS IAM secret key. |
| `AWS_S3_BUCKET` | No | Target S3 bucket for AES-256 encrypted case documents. |
| `SESSION_SECRET` | No | HMAC key (min 16 chars) for persistent auth tokens across restarts. |
| `APP_URL` | No | Public deployment URL for self-referential metadata. |

### 3. Start the Application

```bash
# Development mode (Express API + Vite middleware + 3 stdio MCP servers)
npm run dev
```

Open **`http://localhost:3000`** in your browser.

For production builds:

```bash
npm run build
NODE_ENV=production npm start
```

### 4. Try the Instant Demo Walkthrough

1. On the landing page, click **Resolve My Issue** (or **Sign In**) and select **Continue with Demo Account** (`demo@queuezero.app`), or open `http://localhost:3000?autostart=1`.
2. Inspect the pre-seeded **ApexBook Pro 14 Charging Port Failure** case, or click **Start New Case** → **Load Demo Laptop Scenario** → **Create Case & Run Live MCP Analysis** to watch all 3 stdio MCP servers execute live.
3. Visit **Privacy & MCP** in the top navigation bar to inspect live server integration status (`Gemini`, `ElevenLabs`, `AWS S3 Vault`) and connected MCP server tools.

---

## Testing, Verification & Standalone MCP

```bash
# Run deterministic unit tests (evidence extraction, policy checks, state transitions)
npx tsx --test server/core/rules.test.ts

# Type-check entire frontend and backend
npm run lint

# Build production client bundle
npm run build
```

You can also launch each MCP server directly over stdio for standalone protocol inspection:

```bash
npx tsx server/mcp/evidenceServer.ts
npx tsx server/mcp/policyServer.ts
npx tsx server/mcp/resolutionServer.ts
```

---

## Project Structure

```text
├── server.ts                        # Express + Vite/static entry point (port 3000)
├── server/
│   ├── auth.ts                      # Password hashing & HMAC-SHA256 session tokens
│   ├── db.ts                        # SQLite schema initialization & demo seed data
│   ├── routes.ts                    # Authenticated REST + SSE API endpoints
│   ├── core/
│   │   ├── evidenceLogic.ts         # Deterministic invoice parser, line provenance & sanitizer
│   │   ├── policyLogic.ts           # Curated warranty KB & condition evaluation
│   │   ├── resolutionLogic.ts       # Grounded draft builder, checklist & state machine
│   │   └── rules.test.ts            # Unit tests (node:test)
│   ├── mcp/
│   │   ├── mcpClientManager.ts      # Stdio MCP client lifecycle & tool invocation wrapper
│   │   ├── evidenceServer.ts        # MCP Server 1: Evidence extraction & gap checks
│   │   ├── policyServer.ts          # MCP Server 2: Policy search & condition audit
│   │   └── resolutionServer.ts      # MCP Server 3: Drafts, checklists & follow-ups
│   └── services/
│       ├── aiClient.ts              # Server-side @google/genai (gemini-4-hydrogen) client
│       ├── awsStorage.ts            # AWS S3 Evidence Vault + path-confined local fallback
│       ├── documentProcessor.ts     # Magic-byte validation, PDF parsing (unpdf) & OCR routing
│       ├── elevenlabsClient.ts      # Server-side ElevenLabs TTS audio synthesis
│       └── workflowOrchestrator.ts  # 6-stage MCP pipeline + SSE event emitter
├── src/
│   ├── App.tsx                      # Application routing & auth session state
│   ├── types.ts                     # Shared TypeScript interfaces
│   ├── api/client.ts                # Typed API & SSE client
│   └── components/
│       ├── LandingPage.tsx          # Editorial landing page, live scan hero & workflow loop
│       ├── DashboardPage.tsx        # Case workspace, filters & activity feed
│       ├── NewCasePage.tsx          # Multi-file upload intake & demo scenario loader
│       ├── SettingsPrivacyPage.tsx  # Security guarantees, cloud integrations & MCP diagnostics
│       ├── case/                    # Assessment, Resolution Plan, Complaint Editor & Timeline
│       └── workflow/                # React Flow live canvas, Node Inspector & Execution Timeline
├── .env.example                     # Environment configuration template
└── package.json
```

---

## REST & SSE API Reference

All routes except `/api/health` and `/api/auth/*` require a valid Bearer token.

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Runtime health, AI/Voice/S3 readiness, and connected stdio MCP tool inventory |
| `POST` | `/api/auth/register` / `login` / `demo` | Account registration, sign-in, or instant Demo User session |
| `GET` | `/api/auth/me` | Current authenticated user profile |
| `GET` / `POST` | `/api/cases` | List user cases or create a new resolution case |
| `GET` / `DELETE` | `/api/cases/:id` | Fetch full case bundle (evidence, assessment, draft, activity) or purge case & files |
| `POST` | `/api/cases/:id/documents` | Upload PDF/PNG/JPG/TXT documents (magic-byte verified) |
| `POST` | `/api/cases/:id/demo-documents` | Attach clearly labeled sample invoice and warranty documents |
| `GET` | `/api/cases/:id/documents/:docId/download` | Stream stored document from S3 Vault or local storage |
| `POST` | `/api/cases/:id/analyze` | Start the 6-stage 3-MCP resolution workflow |
| `GET` | `/api/cases/:id/events` | Subscribe to real-time SSE workflow progress & node updates |
| `PATCH` | `/api/cases/:id/draft` | Save edits, toggle resolution checklist items, or approve complaint draft |
| `POST` | `/api/cases/:id/draft/regenerate` | Regenerate complaint draft via Resolution MCP |
| `PATCH` | `/api/cases/:id/status` | Update workflow status (enforces draft approval before `submitted_by_user`) |
| `POST` | `/api/cases/:id/voice-briefing` | Generate ElevenLabs spoken audio briefing for assessment or draft |
| `GET` | `/api/policies` | Retrieve curated manufacturer & consumer policy catalog |
| `GET` | `/api/users/me/export` | Export complete user case & audit JSON archive |

---

## Roadmap & Known MVP Scope

- **Current MVP Workflow:** **Laptop Warranty & Consumer Complaint Assistant** backed by curated sample warranty policies (`NovaTech`, `Zenith`, `LumenBook`, and statutory consumer escalation guides).
- **Extensible Workflows Next:** Refund Requests, Service Complaints, Subscription Cancellation, Billing Disputes, and Consumer Grievances—implemented cleanly by adding domain policy modules without altering the core 3-MCP orchestrator.
- **Database Migration:** SQLite schema in `server/db.ts` uses standard relational tables and foreign keys designed for a direct move to PostgreSQL.
- **Manual External Submission:** QueueZero intentionally does **not** transmit external emails or vendor portal forms automatically—users maintain 100% control over when and where approved drafts are sent.
