import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CURATED_SAMPLE_POLICIES } from '../core/policyLogic';
import {
  buildResolutionChecklist,
  canTransitionCaseStatus,
  composeDeterministicComplaintDraft,
} from '../core/resolutionLogic';

const server = new McpServer({
  name: 'queuezero-resolution-mcp',
  version: '1.0.0',
});

const FieldsSchema = z.object({
  productName: z.string().nullable(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  serialNumber: z.string().nullable(),
  purchaseDate: z.string().nullable(),
  seller: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  purchaseAmount: z.string().nullable(),
  warrantySummaryInDoc: z.string().nullable(),
});

server.registerTool(
  'generate_complaint_draft',
  {
    title: 'Generate Complaint Draft',
    description:
      'Composes a structured, proof-carrying complaint draft strictly from verified extracted facts, user-supplied details, and retrieved policy references.',
    inputSchema: {
      userName: z.string(),
      userEmail: z.string(),
      company: z.string(),
      productName: z.string(),
      description: z.string(),
      fields: FieldsSchema,
      matchedPolicyIds: z.array(z.string()).default([]),
      assessmentStatus: z.enum(['Supported', 'Unsupported', 'Unknown / Needs verification']),
      missingInformation: z.array(z.string()).default([]),
    },
  },
  async ({
    userName,
    userEmail,
    company,
    productName,
    description,
    fields,
    matchedPolicyIds,
    assessmentStatus,
    missingInformation,
  }) => {
    const matchedPolicies = CURATED_SAMPLE_POLICIES.filter((p) =>
      matchedPolicyIds.includes(p.id)
    );
    const draftContent = composeDeterministicComplaintDraft({
      userName,
      userEmail,
      company,
      productName,
      description,
      fields,
      matchedPolicies,
      assessmentStatus,
      missingInformation,
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            draftContent,
            approvalRequiredBeforeExternalAction: true,
          }),
        },
      ],
    };
  }
);

server.registerTool(
  'create_resolution_checklist',
  {
    title: 'Create Resolution Checklist',
    description:
      'Generates an actionable 5-step resolution checklist covering missing evidence, attachments, support channels, and escalation options.',
    inputSchema: {
      fields: FieldsSchema,
      missingInformation: z.array(z.string()).default([]),
      matchedPolicyIds: z.array(z.string()).default([]),
      assessmentStatus: z.enum(['Supported', 'Unsupported', 'Unknown / Needs verification']),
    },
  },
  async ({ fields, missingInformation, matchedPolicyIds, assessmentStatus }) => {
    const matchedPolicies = CURATED_SAMPLE_POLICIES.filter((p) =>
      matchedPolicyIds.includes(p.id)
    );
    const checklist = buildResolutionChecklist({
      fields,
      missingInformation,
      matchedPolicies,
      assessmentStatus,
    });
    return {
      content: [{ type: 'text', text: JSON.stringify({ checklist }) }],
    };
  }
);

server.registerTool(
  'update_case_status',
  {
    title: 'Validate Case Status Transition',
    description:
      'Validates a proposed case status transition and enforces human approval before submission.',
    inputSchema: {
      fromStatus: z.enum([
        'draft',
        'under_review',
        'ready_to_submit',
        'submitted_by_user',
        'awaiting_response',
        'resolved',
        'closed',
      ]),
      toStatus: z.enum([
        'draft',
        'under_review',
        'ready_to_submit',
        'submitted_by_user',
        'awaiting_response',
        'resolved',
        'closed',
      ]),
      approvalStatus: z.enum(['pending_approval', 'approved']).nullable(),
    },
  },
  async ({ fromStatus, toStatus, approvalStatus }) => {
    const validation = canTransitionCaseStatus({ fromStatus, toStatus, approvalStatus });
    return {
      content: [{ type: 'text', text: JSON.stringify(validation) }],
    };
  }
);

server.registerTool(
  'get_next_action',
  {
    title: 'Get Next Action',
    description: 'Determines the highest-priority next human action based on case status and draft approval.',
    inputSchema: {
      status: z.string(),
      approvalStatus: z.enum(['pending_approval', 'approved']).nullable(),
      missingCount: z.number().int().nonnegative(),
    },
  },
  async ({ status, approvalStatus, missingCount }) => {
    let nextAction = 'Review the assessment and complete the resolution checklist.';
    if (approvalStatus !== 'approved') {
      nextAction =
        missingCount > 0
          ? `Review ${missingCount} missing verification item(s), edit the complaint draft, and click Approve Draft.`
          : 'Review the complaint draft for accuracy and click Approve Draft before sending externally.';
    } else if (status === 'ready_to_submit') {
      nextAction = 'Copy or download the approved complaint, send it to the support channel, then mark as Submitted by User.';
    } else if (status === 'submitted_by_user' || status === 'awaiting_response') {
      nextAction = 'Track manufacturer RMA response and record follow-up reminders if 5 business days elapse.';
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ nextAction }) }],
    };
  }
);

server.registerTool(
  'create_followup',
  {
    title: 'Create Follow-up Schedule',
    description: 'Generates a structured follow-up reminder template and escalation timeline.',
    inputSchema: {
      company: z.string(),
      submittedAtIso: z.string(),
      daysToWait: z.number().int().min(1).max(30).default(5),
    },
  },
  async ({ company, submittedAtIso, daysToWait }) => {
    const baseTime = Date.parse(submittedAtIso) || Date.now();
    const followUpDate = new Date(baseTime + daysToWait * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const note = `Follow up with ${company || 'support desk'} on ${followUpDate} if no written RMA or acknowledgement has arrived.`;
    return {
      content: [{ type: 'text', text: JSON.stringify({ followUpDate, note }) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Resolution MCP Server fatal error:', err);
  process.exit(1);
});
