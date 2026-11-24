import type { AssessmentStatus, PolicyClause, PolicyRecord } from '../../src/types';
import type { ExtractedInvoiceFields } from './evidenceLogic';

export const CURATED_SAMPLE_POLICIES: PolicyRecord[] = [
  {
    id: 'pol-novatech-laptop-2025',
    brand: 'NovaTech',
    policyName: 'NovaTech ApexBook Limited Hardware Warranty (Curated Sample KB)',
    policyVersion: '2025.1-sample',
    sourceType: 'curated_sample_kb',
    sourceReference: 'Curated Policy KB · NovaTech Hardware Warranty Terms v2025.1 (Sample)',
    supportChannel: 'support@novatech-devices.example · NovaTech Authorized Care Portal',
    policyContent:
      'NovaTech warrants ApexBook laptops against defects in materials and workmanship under normal use for 12 months from the original retail purchase date by an end-user from an authorized reseller. Internal power delivery circuitry, DC-in/USB-C charging ports, and motherboard charging controllers are covered when free of physical or liquid damage. Consumable battery capacity wear after 6 months and third-party adapters are excluded unless a manufacturing defect is verified. Proof of purchase showing seller, date, and model is mandatory.',
    clauses: [
      {
        clauseId: 'NT-1.1',
        title: '12-Month Hardware Defect Coverage',
        excerpt:
          'Covers defects in materials and workmanship under normal use for 12 months from original retail purchase date from an authorized reseller.',
        appliesTo: 'Laptop motherboard, charging IC, USB-C/DC power delivery ports',
        conditions: [
          'Original dated proof of purchase from an authorized seller',
          'Device serial number matches warranty registration or invoice',
        ],
        exclusions: [
          'Purchases from unauthorized third-party marketplaces without valid invoice',
          'Cosmetic wear that does not affect hardware function',
        ],
      },
      {
        clauseId: 'NT-2.4',
        title: 'Power Adapter, Battery & Charging Exclusions',
        excerpt:
          'Charging subsystem failures caused by non-certified third-party chargers, liquid ingress, bent port pins, or electrical surges are excluded. Standard battery capacity degradation is covered separately for 6 months unless cell failure prevents charging.',
        appliesTo: 'Charging failure, battery cells, external power adapter',
        conditions: [
          'Diagnostic check confirming failure occurs with OEM power adapter',
          'No evidence of liquid spill, bent pins, or physical impact around charging port',
        ],
        exclusions: [
          'Damage caused by non-OEM power adapters',
          'Liquid ingress or accidental physical port damage',
        ],
      },
      {
        clauseId: 'NT-3.2',
        title: 'RMA & Escalation Procedure',
        excerpt:
          'Customers must submit invoice number, serial number, and fault description before an RMA authorization is issued. Standard turnaround is 10 business days after depot receipt.',
        appliesTo: 'Claim submission and service escalation',
        conditions: [
          'Provide invoice number, purchase date, model, and serial number',
          'Obtain written RMA ticket prior to shipping hardware',
        ],
        exclusions: ['Unclaimed shipments without an approved RMA number'],
      },
    ],
    updatedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'pol-zenith-laptop-2025',
    brand: 'Zenith',
    policyName: 'Zenith Systems ProBook Standard Warranty (Curated Sample KB)',
    policyVersion: '2025.3-sample',
    sourceType: 'curated_sample_kb',
    sourceReference: 'Curated Policy KB · Zenith ProBook Warranty Terms v2025.3 (Sample)',
    supportChannel: 'warranty@zenith-systems.example · Zenith Hardware Desk',
    policyContent:
      'Zenith Systems warrants ProBook laptops for 12 months (24 months in EU jurisdictions) against hardware manufacturing defects. Charging circuitry and OEM power bricks carry 12-month replacement coverage upon presentation of a serialized invoice.',
    clauses: [
      {
        clauseId: 'ZN-1.0',
        title: 'Standard 12-Month Carry-In / Mail-In Coverage',
        excerpt:
          'Manufacturing defects in system board, power management IC, and OEM charger are covered for 12 months from invoice date.',
        appliesTo: 'System board, power management, OEM AC adapter',
        conditions: ['Valid serialized invoice from authorized retailer', 'Defect occurs under normal operation'],
        exclusions: ['Physical breakage of DC jack from drop/strain', 'Unauthorized disassembly'],
      },
    ],
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'pol-consumer-statutory-guide',
    brand: 'General Consumer Law',
    policyName: 'Consumer Electronics Implied Warranty & Documentation Standard (Curated Reference)',
    policyVersion: '2025.0-reference',
    sourceType: 'curated_sample_kb',
    sourceReference: 'Curated Policy KB · Consumer Protection Baseline Reference (Sample)',
    supportChannel: 'Retailer Customer Care / Consumer Protection Escalation Desk',
    policyContent:
      'When manufacturer warranty terms are unavailable or incomplete in user documentation, consumer protection baselines generally require goods to remain fit for ordinary purpose and free from latent defects, provided the buyer supplies verifiable proof of purchase, date, seller identity, and a clear defect timeline.',
    clauses: [
      {
        clauseId: 'GEN-1.0',
        title: 'Proof of Purchase & Defect Notification Baseline',
        excerpt:
          'A valid claim requires verifiable proof of transaction (date, seller, product, amount) and a factual description of the malfunction.',
        appliesTo: 'All consumer electronics disputes when OEM policy text is not confirmed',
        conditions: [
          'Dated invoice or transaction record',
          'Prompt notice to seller or manufacturer upon defect discovery',
        ],
        exclusions: [
          'User-inflicted physical or liquid damage',
          'Claims lacking verifiable purchase documentation',
        ],
      },
    ],
    updatedAt: '2026-01-10T00:00:00.000Z',
  },
];

export function searchCuratedPolicies(
  policies: PolicyRecord[],
  query: { brand?: string; issueKeywords?: string }
): {
  matched: PolicyRecord[];
  exactBrandMatch: boolean;
  note: string;
} {
  const brandLower = (query.brand || '').trim().toLowerCase();
  const keywordsLower = (query.issueKeywords || '').trim().toLowerCase();

  const brandMatches = brandLower
    ? policies.filter(
        (p) =>
          p.brand.toLowerCase().includes(brandLower) ||
          brandLower.includes(p.brand.toLowerCase()) ||
          p.policyName.toLowerCase().includes(brandLower)
      )
    : [];

  if (brandMatches.length > 0) {
    return {
      matched: brandMatches,
      exactBrandMatch: true,
      note: `Matched ${brandMatches.length} curated sample policy record(s) for brand "${query.brand}".`,
    };
  }

  // Fallback only to the explicitly labeled general reference policy — never pretend an unverified brand policy exists
  const baseline = policies.filter((p) => p.brand === 'General Consumer Law');
  return {
    matched: baseline,
    exactBrandMatch: false,
    note: query.brand
      ? `No manufacturer-specific policy for "${query.brand}" exists in the curated MVP knowledge base. Returning baseline consumer documentation guidance only; verify the manufacturer's official warranty terms directly.`
      : 'No brand specified; returning baseline consumer documentation guidance only.',
  };
}

export interface PolicyEvaluationResult {
  assessmentStatus: AssessmentStatus;
  relevantClauses: Array<{
    clauseId: string;
    title: string;
    sourceDocument: string;
    relevance: string;
    conditions: string[];
    exclusions: string[];
  }>;
  missingPolicyInfo: string[];
  limitations: string[];
  reasoningSummary: string;
}

export function evaluateEvidenceAgainstPolicies(params: {
  fields: ExtractedInvoiceFields;
  description: string;
  matchedPolicies: PolicyRecord[];
  exactBrandMatch: boolean;
  missingItems: string[];
}): PolicyEvaluationResult {
  const { fields, description, matchedPolicies, exactBrandMatch, missingItems } = params;
  const relevantClauses: PolicyEvaluationResult['relevantClauses'] = [];
  const missingPolicyInfo: string[] = [];
  const limitations: string[] = [
    'QueueZero evaluates claims against uploaded files and its curated MVP policy knowledge base; it does not have live access to external manufacturer warranty databases.',
  ];

  const descLower = description.toLowerCase();

  for (const policy of matchedPolicies) {
    for (const clause of policy.clauses) {
      relevantClauses.push({
        clauseId: clause.clauseId,
        title: clause.title,
        sourceDocument: policy.policyName,
        relevance: clause.excerpt,
        conditions: clause.conditions,
        exclusions: clause.exclusions,
      });
    }
  }

  if (!exactBrandMatch) {
    missingPolicyInfo.push(
      'Manufacturer-specific warranty terms for this brand/model are not in the curated knowledge base and were not confirmed in uploaded files.'
    );
    limitations.push(
      'Without the exact OEM warranty document, coverage length and specific exclusions remain unverified.'
    );
  }

  if (!fields.warrantySummaryInDoc) {
    missingPolicyInfo.push('Uploaded files do not contain the specific point-of-sale warranty certificate or regional coverage addendum.');
  }

  // Check explicit exclusion triggers in user description (ignoring negated confirmations like "no liquid spill")
  const normalizedDesc = descLower
    .replace(/\b(?:no|not|without|free of|zero|never)\s+(?:any\s+)?(?:liquid|water|coffee|physical|port)?\s*(?:spill|damage|dropped|drop|ingress)\b/gi, '')
    .trim();
  const hasExplicitExclusionMention =
    /\b(dropped|cracked port|water spill|liquid spill|coffee spill|third[- ]party charger damaged)\b/i.test(
      normalizedDesc
    );

  if (hasExplicitExclusionMention) {
    return {
      assessmentStatus: 'Unsupported',
      relevantClauses,
      missingPolicyInfo,
      limitations,
      reasoningSummary:
        'The issue description mentions a condition (liquid ingress or physical port damage) that standard hardware warranty exclusion clauses explicitly exclude.',
    };
  }

  // Check whether we have verifiable core purchase facts + matching brand policy
  const hasVerifiableInvoiceBasics = Boolean(
    fields.purchaseDate && fields.invoiceNumber && (fields.productName || fields.model)
  );

  // Validate purchase date is not obviously > 12 months ago relative to current date (2026-11-23)
  let withinSample12Months: boolean | null = null;
  if (fields.purchaseDate) {
    const parsed = Date.parse(fields.purchaseDate);
    if (!Number.isNaN(parsed)) {
      const diffDays = (Date.now() - parsed) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= 365) {
        withinSample12Months = true;
      } else if (diffDays > 365) {
        withinSample12Months = false;
      }
    }
  }

  if (withinSample12Months === false && exactBrandMatch) {
    return {
      assessmentStatus: 'Unsupported',
      relevantClauses,
      missingPolicyInfo,
      limitations,
      reasoningSummary:
        'Extracted purchase date appears more than 12 months prior to today, which exceeds the 12-month standard coverage window in the matched sample policy unless an extended warranty document is provided.',
    };
  }

  if (!exactBrandMatch || !hasVerifiableInvoiceBasics || missingItems.length >= 3) {
    return {
      assessmentStatus: 'Unknown / Needs verification',
      relevantClauses,
      missingPolicyInfo,
      limitations,
      reasoningSummary:
        'Available evidence is incomplete or lacks a confirmed manufacturer policy match. Key facts or policy conditions still require verification before eligibility can be supported.',
    };
  }

  return {
    assessmentStatus: 'Supported',
    relevantClauses,
    missingPolicyInfo,
    limitations,
    reasoningSummary:
      'Verified invoice facts (purchase date, invoice number, and product details) align with the matched sample warranty clauses for power/charging defects, subject to physical inspection confirming no liquid or port damage.',
  };
}
