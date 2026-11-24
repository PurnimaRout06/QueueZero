# QueueZero

**Less paperwork. More progress.**

QueueZero is an AI-powered administrative resolution agent with **Proof-Carrying Automation** and real **Model Context Protocol (MCP)** tool orchestration. The MVP focuses on **Laptop Warranty & Consumer Complaint Resolution**, helping everyday users inspect purchase invoices, retrieve curated warranty clauses, identify missing evidence, generate grounded complaints, and track resolution steps with explicit human approval gates.

## Architecture

- **Frontend (`src/`)**: React 19, Vite, TypeScript, Tailwind CSS v4, Lucide icons, Motion (`motion/react`), and React Flow (`@xyflow/react`) for the interactive Live AI Resolution Workflow UI.
- **Backend (`server.ts`, `server/`)**: Express REST + Server-Sent Events (SSE) server mounted alongside Vite middleware in development on port `3000`.
- **Database (`server/db.ts`)**: SQLite (`node:sqlite` `DatabaseSync`) with foreign keys and relational tables (`users`, `cases`, `documents`, `evidence`, `policies`, `assessments`, `complaint_drafts`, `case_activity`, `workflow_runs`) structured for straightforward PostgreSQL migration.
- **Three Independent MCP Servers (`server/mcp/`)** connected over stdio via `@modelcontextprotocol/sdk`:
  1. `evidenceServer.ts` (`queuezero-evidence-mcp`): `extract_invoice_details`, `analyze_uploaded_document`, `get_document_evidence`, `identify_missing_information`
  2. `policyServer.ts` (`queuezero-policy-mcp`): `search_warranty_policy`, `get_policy_clause`, `check_warranty_conditions`, `get_policy_source`
  3. `resolutionServer.ts` (`queuezero-resolution-mcp`): `generate_complaint_draft`, `create_resolution_checklist`, `update_case_status`, `get_next_action`, `create_followup`
- **AI Orchestration (`server/services/`)**: Server-side `@google/genai` (`gemini-4-hydrogen`) structured JSON analysis + vision OCR when `GEMINI_API_KEY` is configured, with a clearly labeled **Demo Deterministic Mode** fallback when no API key is present.

## Prerequisites

- Node.js 22+
- npm 10+

## Installation

```bash
npm install
```

## Environment Variables

Configure via `.env` or runtime secrets (see `.env.example`):

- `GEMINI_API_KEY`: Optional for Demo Deterministic Mode; required for live Gemini 4 Hydrogen structured reasoning and image OCR.
- `PORT`: Defaults to `3000`.

## Running the Application

Start the full-stack server (Express API + Vite frontend + automatic stdio MCP server spawning):

```bash
npm run dev
```

Open `http://localhost:3000`.

To run the three MCP servers manually for standalone inspection:

```bash
npx tsx server/mcp/evidenceServer.ts
npx tsx server/mcp/policyServer.ts
npx tsx server/mcp/resolutionServer.ts
```

## Running Tests & Verification

```bash
npx --yes tsx --test server/core/rules.test.ts
npm run lint
npm run build
```

## Demo Access

Click **Resolve My Issue** or **Sign In** and choose **Continue with Demo Account** (`demo@queuezero.app`) to inspect the pre-seeded sample laptop charging case, or click **Load Demo Laptop Scenario** inside **Start New Case** to run a full live SSE + MCP workflow end-to-end.

## Known MVP Limitations

- **Curated Sample Policy KB**: Policies in `server/core/policyLogic.ts` are curated sample policies for demonstration; QueueZero does not query external manufacturer warranty databases live.
- **Manual Submission Tracking**: QueueZero never sends emails or submits claims externally; users review, approve, copy/download the draft, and manually update submission/response statuses.
- **Image OCR in Demo Mode**: Without `GEMINI_API_KEY`, PNG/JPG uploads are stored safely as visual evidence while full text extraction works directly for PDFs and text files.
