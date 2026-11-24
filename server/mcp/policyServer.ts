import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  CURATED_SAMPLE_POLICIES,
  evaluateEvidenceAgainstPolicies,
  searchCuratedPolicies,
} from '../core/policyLogic';

const server = new McpServer({
  name: 'queuezero-policy-mcp',
  version: '1.0.0',
});

server.registerTool(
  'search_warranty_policy',
  {
    title: 'Search Warranty Policy',
    description:
      'Searches the curated QueueZero warranty and consumer-policy knowledge base by brand and issue keywords, explicitly distinguishing verified sample policies from unavailable manufacturer policies.',
    inputSchema: {
      brand: z.string().default(''),
      issueKeywords: z.string().default(''),
    },
  },
  async ({ brand, issueKeywords }) => {
    const result = searchCuratedPolicies(CURATED_SAMPLE_POLICIES, { brand, issueKeywords });
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  }
);

server.registerTool(
  'get_policy_clause',
  {
    title: 'Get Policy Clause',
    description: 'Retrieves a specific clause by clauseId from the curated warranty knowledge base.',
    inputSchema: {
      clauseId: z.string(),
    },
  },
  async ({ clauseId }) => {
    for (const policy of CURATED_SAMPLE_POLICIES) {
      const found = policy.clauses.find(
        (c) => c.clauseId.toLowerCase() === clauseId.trim().toLowerCase()
      );
      if (found) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                found: true,
                policyId: policy.id,
                policyName: policy.policyName,
                sourceReference: policy.sourceReference,
                clause: found,
              }),
            },
          ],
        };
      }
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ found: false, clauseId }) }],
    };
  }
);

server.registerTool(
  'check_warranty_conditions',
  {
    title: 'Check Warranty Conditions',
    description:
      'Evaluates extracted invoice fields and problem description against matched curated warranty policy clauses, conditions, and exclusions.',
    inputSchema: {
      fields: z.object({
        productName: z.string().nullable(),
        brand: z.string().nullable(),
        model: z.string().nullable(),
        serialNumber: z.string().nullable(),
        purchaseDate: z.string().nullable(),
        seller: z.string().nullable(),
        invoiceNumber: z.string().nullable(),
        purchaseAmount: z.string().nullable(),
        warrantySummaryInDoc: z.string().nullable(),
      }),
      description: z.string(),
      brandQuery: z.string().default(''),
      missingItems: z.array(z.string()).default([]),
    },
  },
  async ({ fields, description, brandQuery, missingItems }) => {
    const search = searchCuratedPolicies(CURATED_SAMPLE_POLICIES, {
      brand: fields.brand || brandQuery,
      issueKeywords: description,
    });
    const evaluation = evaluateEvidenceAgainstPolicies({
      fields,
      description,
      matchedPolicies: search.matched,
      exactBrandMatch: search.exactBrandMatch,
      missingItems,
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            exactBrandMatch: search.exactBrandMatch,
            searchNote: search.note,
            matchedPolicyIds: search.matched.map((p) => p.id),
            evaluation,
          }),
        },
      ],
    };
  }
);

server.registerTool(
  'get_policy_source',
  {
    title: 'Get Policy Source',
    description: 'Returns source provenance and support channel metadata for a curated policy ID.',
    inputSchema: {
      policyId: z.string(),
    },
  },
  async ({ policyId }) => {
    const found = CURATED_SAMPLE_POLICIES.find((p) => p.id === policyId);
    if (!found) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ found: false, policyId }) }],
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            found: true,
            id: found.id,
            brand: found.brand,
            policyName: found.policyName,
            policyVersion: found.policyVersion,
            sourceType: found.sourceType,
            sourceReference: found.sourceReference,
            supportChannel: found.supportChannel,
          }),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Policy MCP Server fatal error:', err);
  process.exit(1);
});
