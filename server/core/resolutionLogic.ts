import type { AssessmentStatus, CaseStatus, PolicyRecord, ResolutionStep } from '../../src/types';
import type { ExtractedInvoiceFields } from './evidenceLogic';

export const ALLOWED_CASE_STATUSES: CaseStatus[] = [
  'draft',
  'under_review',
  'ready_to_submit',
  'submitted_by_user',
  'awaiting_response',
  'resolved',
  'closed',
];

export function canTransitionCaseStatus(params: {
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  approvalStatus: 'pending_approval' | 'approved' | null;
}): { allowed: boolean; reason?: string } {
  const { toStatus, approvalStatus } = params;
  if (!ALLOWED_CASE_STATUSES.includes(toStatus)) {
    return { allowed: false, reason: `Unsupported case status: ${toStatus}` };
  }

  // Enforce human-in-the-loop approval before user marks complaint as submitted or awaiting response
  if (
    (toStatus === 'submitted_by_user' || toStatus === 'awaiting_response') &&
    approvalStatus !== 'approved'
  ) {
    return {
      allowed: false,
      reason: 'You must explicitly approve the complaint draft before marking the case as submitted.',
    };
  }

  return { allowed: true };
}

export function buildResolutionChecklist(params: {
  fields: ExtractedInvoiceFields;
  missingInformation: string[];
  matchedPolicies: PolicyRecord[];
  assessmentStatus: AssessmentStatus;
}): ResolutionStep[] {
  const { fields, missingInformation, matchedPolicies, assessmentStatus } = params;
  const primaryPolicy = matchedPolicies[0];
  const supportChannel =
    primaryPolicy?.supportChannel || 'Official manufacturer warranty portal or original retailer support desk';

  const steps: ResolutionStep[] = [
    {
      id: 'step-verify-missing',
      title:
        missingInformation.length > 0
          ? `Gather ${missingInformation.length} missing verification detail(s)`
          : 'Confirm device serial number and diagnostic check',
      description:
        missingInformation.length > 0
          ? `Address before filing: ${missingInformation.slice(0, 2).join(' ')}`
          : 'Verify the laptop charging port has no debris/physical damage and test with an alternate known-good USB-C/AC adapter if available.',
      category: 'immediate',
      completed: false,
    },
    {
      id: 'step-attach-docs',
      title: 'Prepare required supporting attachments',
      description: `Attach original purchase invoice${fields.invoiceNumber ? ` (${fields.invoiceNumber})` : ''}, clear photo of the underside serial number label${fields.serialNumber ? ` (${fields.serialNumber})` : ''}, and a short video/photo showing the charging LED failing to light.`,
      category: 'attachments',
      completed: false,
    },
    {
      id: 'step-contact-channel',
      title: 'Contact the designated warranty support channel',
      description: `Submit your approved complaint via: ${supportChannel}. Request a written RMA or case reference number.`,
      category: 'contact',
      completed: false,
    },
    {
      id: 'step-include-facts',
      title: 'Include verified facts without speculation',
      description: `Reference purchase date (${fields.purchaseDate || 'to be verified by user'}), seller (${fields.seller || 'to be verified by user'}), model (${fields.model || fields.productName || 'to be specified'}), and exact charging symptom timeline.`,
      category: 'include',
      completed: false,
    },
    {
      id: 'step-escalation',
      title:
        assessmentStatus === 'Unsupported'
          ? 'Explore out-of-warranty repair quote or retailer goodwill escalation'
          : 'Follow escalation path if initial claim is rejected or delayed',
      description:
        'If no response is received within 5 business days or the claim is denied without inspection, escalate to the retailer customer relations desk, payment card purchase-protection team, or local consumer protection agency with your case log.',
      category: 'escalation',
      completed: false,
    },
  ];

  return steps;
}

export function composeDeterministicComplaintDraft(params: {
  userName: string;
  userEmail: string;
  company: string;
  productName: string;
  description: string;
  fields: ExtractedInvoiceFields;
  matchedPolicies: PolicyRecord[];
  assessmentStatus: AssessmentStatus;
  missingInformation: string[];
}): string {
  const {
    userName,
    userEmail,
    company,
    productName,
    description,
    fields,
    matchedPolicies,
    assessmentStatus,
    missingInformation,
  } = params;

  const brand = fields.brand || company || '[Manufacturer / Company Name]';
  const device = fields.productName || productName || '[Product Name]';
  const modelLine = fields.model ? `Model: ${fields.model}` : 'Model: [Please insert exact model number]';
  const serialLine = fields.serialNumber
    ? `Serial Number: ${fields.serialNumber}`
    : 'Serial Number: [Please insert serial number from device label]';
  const invoiceLine = fields.invoiceNumber
    ? `Invoice / Order Reference: ${fields.invoiceNumber}`
    : 'Invoice / Order Reference: [Please attach or enter invoice number]';
  const dateLine = fields.purchaseDate
    ? `Purchase Date: ${fields.purchaseDate}`
    : 'Purchase Date: [Please insert verified purchase date]';
  const sellerLine = fields.seller
    ? `Seller / Retailer: ${fields.seller}`
    : 'Seller / Retailer: [Please insert authorized seller name]';

  const primaryPolicy = matchedPolicies[0];
  const policyNote = primaryPolicy
    ? `Relevant Policy Reference: ${primaryPolicy.policyName} (${primaryPolicy.policyVersion}) — ${primaryPolicy.clauses
        .map((c) => `${c.clauseId}: ${c.title}`)
        .join('; ')}.`
    : 'Relevant Policy Reference: Applicable standard hardware warranty / consumer protection terms (to be confirmed upon policy verification).';

  const verificationCaveat =
    assessmentStatus === 'Unknown / Needs verification' && missingInformation.length > 0
      ? `\nNote to Sender (Review before sending):\nPlease complete the bracketed items above. Missing items flagged during review: ${missingInformation.slice(0, 3).join(' ')}\n`
      : '';

  return `Subject: Warranty Service & Charging Defect Claim — ${brand} ${device}${fields.invoiceNumber ? ` (Ref: ${fields.invoiceNumber})` : ''}

Dear ${brand} Customer Support & Warranty Team,

I am writing to formally request warranty evaluation and repair/replacement support for my ${brand} laptop, which has developed a charging failure during normal use.

Verified Device & Purchase Details:
- Product: ${device}
- ${modelLine}
- ${serialLine}
- ${invoiceLine}
- ${dateLine}
- ${sellerLine}

Description of Issue:
${description.trim()}

${policyNote}

Requested Resolution:
Please review the attached purchase documentation and issue a written warranty claim / RMA ticket number along with instructions for diagnostic inspection and repair or replacement under the applicable warranty terms. If any additional diagnostic detail is required prior to shipment, please notify me in writing at ${userEmail}.
${verificationCaveat}
Sincerely,
${userName}
${userEmail}`;
}
