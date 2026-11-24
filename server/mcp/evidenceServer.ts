import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  extractStructuredInvoiceFacts,
  identifyMissingInformation,
  sanitizeUntrustedDocumentText,
} from '../core/evidenceLogic';

const server = new McpServer({
  name: 'queuezero-evidence-mcp',
  version: '1.0.0',
});

const DocumentInputSchema = z.object({
  id: z.string(),
  filename: z.string(),
  extractedText: z.string(),
});

const CaseInputSchema = z.object({
  company: z.string().default(''),
  productName: z.string().default(''),
  description: z.string().default(''),
});

server.registerTool(
  'extract_invoice_details',
  {
    title: 'Extract Invoice Details',
    description:
      'Reads uploaded document text and extracts structured invoice metadata (invoice number, purchase date, seller, brand, model, serial number) with line-level source citations.',
    inputSchema: {
      documents: z.array(DocumentInputSchema),
      userCaseInput: CaseInputSchema,
    },
  },
  async ({ documents, userCaseInput }) => {
    const result = extractStructuredInvoiceFacts(documents, userCaseInput);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  }
);

server.registerTool(
  'analyze_uploaded_document',
  {
    title: 'Analyze Uploaded Document',
    description:
      'Inspects a single uploaded document as untrusted data, sanitizes prompt-injection patterns, and returns line count, character count, and detected administrative markers.',
    inputSchema: {
      filename: z.string(),
      rawText: z.string(),
    },
  },
  async ({ filename, rawText }) => {
    const sanitized = sanitizeUntrustedDocumentText(rawText);
    const lines = sanitized ? sanitized.split(/\r?\n/).filter((l) => l.trim().length > 0) : [];
    const hasInvoiceMarker = /invoice|receipt|order\s*(id|no|#)/i.test(sanitized);
    const hasWarrantyMarker = /warranty|guarantee|coverage|rma/i.test(sanitized);
    const payload = {
      filename,
      charCount: sanitized.length,
      nonEmptyLineCount: lines.length,
      hasInvoiceMarker,
      hasWarrantyMarker,
      sanitizedPreview: lines.slice(0, 5),
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(payload) }],
    };
  }
);

server.registerTool(
  'get_document_evidence',
  {
    title: 'Get Document Evidence',
    description:
      'Returns verified evidence entries and source citations extracted from uploaded case documents.',
    inputSchema: {
      documents: z.array(DocumentInputSchema),
      userCaseInput: CaseInputSchema,
    },
  },
  async ({ documents, userCaseInput }) => {
    const { evidenceItems } = extractStructuredInvoiceFacts(documents, userCaseInput);
    const verified = evidenceItems.filter((item) => item.verificationStatus === 'verified_from_document');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            totalEvidenceItems: evidenceItems.length,
            verifiedFromDocumentsCount: verified.length,
            evidenceItems,
          }),
        },
      ],
    };
  }
);

server.registerTool(
  'identify_missing_information',
  {
    title: 'Identify Missing Information',
    description:
      'Compares extracted invoice facts and user description against required administrative evidence to identify missing fields and next evidence recommendations.',
    inputSchema: {
      documents: z.array(DocumentInputSchema),
      userCaseInput: CaseInputSchema,
    },
  },
  async ({ documents, userCaseInput }) => {
    const { fields } = extractStructuredInvoiceFacts(documents, userCaseInput);
    const report = identifyMissingInformation(
      fields,
      userCaseInput.description,
      documents.length
    );
    return {
      content: [{ type: 'text', text: JSON.stringify({ fields, ...report }) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Evidence MCP Server fatal error:', err);
  process.exit(1);
});
