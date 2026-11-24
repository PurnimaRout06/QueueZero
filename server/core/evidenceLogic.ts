export interface ExtractedInvoiceFields {
  productName: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  seller: string | null;
  invoiceNumber: string | null;
  purchaseAmount: string | null;
  warrantySummaryInDoc: string | null;
}

export interface ExtractedEvidenceItem {
  evidenceType: string;
  extractedValue: string;
  sourceReference: string;
  confidence: 'High' | 'Moderate' | 'Low';
  confidenceReason: string;
  verificationStatus: 'verified_from_document' | 'user_supplied' | 'missing' | 'needs_verification';
}

export interface MissingInfoReport {
  missingItems: string[];
  recommendations: string[];
}

/**
 * Treat document text strictly as untrusted data.
 * Strips common prompt-injection directives if echoed into structured prompts.
 */
export function sanitizeUntrustedDocumentText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/\u0000/g, '')
    .replace(/ignore (all )?previous instructions/gi, '[filtered-directive]')
    .replace(/system:\s*/gi, '[filtered-prefix] ')
    .slice(0, 35000)
    .trim();
}

function matchField(text: string, patterns: RegExp[]): { value: string; lineRef: string } | null {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    for (const pattern of patterns) {
      const m = line.match(pattern);
      if (m && m[1]) {
        const cleaned = m[1].trim().replace(/[|]+$/, '').trim();
        if (cleaned.length > 0 && cleaned.length < 180) {
          return {
            value: cleaned,
            lineRef: `Line ${i + 1}: "${line.slice(0, 90)}"`,
          };
        }
      }
    }
  }
  return null;
}

export function extractStructuredInvoiceFacts(
  documents: Array<{ id: string; filename: string; extractedText: string }>,
  userCaseInput: { company: string; productName: string; description: string }
): {
  fields: ExtractedInvoiceFields;
  evidenceItems: ExtractedEvidenceItem[];
} {
  const evidenceItems: ExtractedEvidenceItem[] = [];
  const fields: ExtractedInvoiceFields = {
    productName: null,
    brand: null,
    model: null,
    serialNumber: null,
    purchaseDate: null,
    seller: null,
    invoiceNumber: null,
    purchaseAmount: null,
    warrantySummaryInDoc: null,
  };

  const docMatchers: Array<{
    key: keyof ExtractedInvoiceFields;
    label: string;
    patterns: RegExp[];
  }> = [
    {
      key: 'invoiceNumber',
      label: 'Invoice Number',
      patterns: [
        /(?:invoice\s*(?:no\.?|number|#)|receipt\s*(?:no\.?|#)|order\s*(?:id|no\.?|#))\s*[:\-]\s*([A-Z0-9\-\/]{4,40})/i,
      ],
    },
    {
      key: 'purchaseDate',
      label: 'Purchase Date',
      patterns: [
        /(?:purchase\s*date|invoice\s*date|date\s*of\s*purchase|order\s*date|date)\s*[:\-]\s*([A-Za-z0-9,\-\/\s]{6,32})/i,
      ],
    },
    {
      key: 'seller',
      label: 'Seller / Retailer',
      patterns: [
        /(?:seller|retailer|sold\s*by|merchant|vendor|store)\s*[:\-]\s*(.+)/i,
      ],
    },
    {
      key: 'brand',
      label: 'Brand / Manufacturer',
      patterns: [
        /(?:brand|manufacturer|make)\s*[:\-]\s*(.+)/i,
      ],
    },
    {
      key: 'model',
      label: 'Model Identifier',
      patterns: [
        /(?:model(?:\s*(?:no\.?|number|name))?|sku|part\s*no\.?)\s*[:\-]\s*(.+)/i,
      ],
    },
    {
      key: 'productName',
      label: 'Product Name',
      patterns: [
        /(?:product(?:\s*name)?|item(?:\s*description)?|device)\s*[:\-]\s*(.+)/i,
      ],
    },
    {
      key: 'serialNumber',
      label: 'Serial Number',
      patterns: [
        /(?:serial\s*(?:no\.?|number|#)|s\/n)\s*[:\-]\s*([A-Z0-9\-]{5,40})/i,
      ],
    },
    {
      key: 'purchaseAmount',
      label: 'Purchase Total',
      patterns: [
        /(?:total\s*(?:paid|amount)?|grand\s*total|amount)\s*[:\-]\s*([$€£₹]?\s?[0-9,]+(?:\.[0-9]{2})?(?:\s*[A-Z]{3})?)/i,
      ],
    },
    {
      key: 'warrantySummaryInDoc',
      label: 'Document Warranty Statement',
      patterns: [
        /(?:warranty(?:\s*period|\s*terms|\s*coverage)?|coverage)\s*[:\-]\s*(.+)/i,
      ],
    },
  ];

  for (const doc of documents) {
    const cleanText = sanitizeUntrustedDocumentText(doc.extractedText);
    if (!cleanText) continue;

    for (const matcher of docMatchers) {
      if (fields[matcher.key]) continue;
      const hit = matchField(cleanText, matcher.patterns);
      if (hit) {
        fields[matcher.key] = hit.value;
        evidenceItems.push({
          evidenceType: matcher.label,
          extractedValue: hit.value,
          sourceReference: `${doc.filename} (${hit.lineRef})`,
          confidence: 'High',
          confidenceReason: `Direct labeled field match extracted verbatim from ${doc.filename}.`,
          verificationStatus: 'verified_from_document',
        });
      }
    }
  }

  // Corroborate missing fields with user-supplied input clearly marked as user_supplied (not document-verified)
  if (!fields.brand && userCaseInput.company.trim()) {
    evidenceItems.push({
      evidenceType: 'Brand / Manufacturer',
      extractedValue: userCaseInput.company.trim(),
      sourceReference: 'User Case Form (not independently verified in uploaded documents)',
      confidence: 'Moderate',
      confidenceReason: 'Provided by user in case intake form; no explicit manufacturer label matched in documents.',
      verificationStatus: 'user_supplied',
    });
  }

  if (!fields.productName && userCaseInput.productName.trim()) {
    evidenceItems.push({
      evidenceType: 'Product Name',
      extractedValue: userCaseInput.productName.trim(),
      sourceReference: 'User Case Form (not independently verified in uploaded documents)',
      confidence: 'Moderate',
      confidenceReason: 'Provided by user in case intake form; verify model matches invoice item description.',
      verificationStatus: 'user_supplied',
    });
  }

  // Record explicit missing critical evidence items
  const criticalChecks: Array<{ key: keyof ExtractedInvoiceFields; label: string }> = [
    { key: 'invoiceNumber', label: 'Invoice Number' },
    { key: 'purchaseDate', label: 'Purchase Date' },
    { key: 'seller', label: 'Seller / Retailer' },
    { key: 'serialNumber', label: 'Serial Number' },
    { key: 'warrantySummaryInDoc', label: 'Document Warranty Statement' },
  ];

  for (const check of criticalChecks) {
    if (!fields[check.key]) {
      evidenceItems.push({
        evidenceType: check.label,
        extractedValue: 'Not found in uploaded documents',
        sourceReference: documents.length > 0 ? `Checked ${documents.length} uploaded document(s)` : 'No documents uploaded',
        confidence: 'Low',
        confidenceReason: `No verifiable ${check.label.toLowerCase()} was located in extracted text.`,
        verificationStatus: 'missing',
      });
    }
  }

  return { fields, evidenceItems };
}

export function identifyMissingInformation(
  fields: ExtractedInvoiceFields,
  userDescription: string,
  documentCount: number
): MissingInfoReport {
  const missingItems: string[] = [];
  const recommendations: string[] = [];

  if (documentCount === 0) {
    missingItems.push('No purchase invoice or warranty document has been uploaded.');
    recommendations.push('Upload the original PDF or photo of the purchase receipt/invoice.');
  }
  if (!fields.invoiceNumber) {
    missingItems.push('Invoice or order reference number is missing from extracted evidence.');
    recommendations.push('Provide the full invoice header or order confirmation number.');
  }
  if (!fields.purchaseDate) {
    missingItems.push('Verifiable purchase date is missing, so warranty eligibility timeframe cannot be confirmed.');
    recommendations.push('Include a dated receipt or bank/order confirmation showing the exact purchase date.');
  }
  if (!fields.serialNumber) {
    missingItems.push('Device serial number (S/N) is missing from the uploaded documentation.');
    recommendations.push('Locate the serial number on the laptop underside label or BIOS and add it before submitting.');
  }
  if (!fields.seller) {
    missingItems.push('Authorized seller / retailer name is missing from the extracted invoice text.');
    recommendations.push('Confirm whether the seller was an authorized dealer (required by most OEM warranties).');
  }
  if (!fields.warrantySummaryInDoc) {
    missingItems.push('No manufacturer warranty certificate or terms sheet was found inside the uploaded files.');
    recommendations.push('Attach the warranty card or download the official warranty PDF for your exact model.');
  }

  const lowerDesc = userDescription.toLowerCase();
  if (!lowerDesc.includes('charger') && !lowerDesc.includes('adapter') && !lowerDesc.includes('usb-c') && !lowerDesc.includes('cable')) {
    missingItems.push('Diagnostic detail missing: whether charging fails with an alternate known-good power adapter/cable.');
    recommendations.push('Note whether the laptop fails to charge with a second compatible power adapter and whether the charging LED illuminates.');
  }
  if (!lowerDesc.includes('damage') && !lowerDesc.includes('spill') && !lowerDesc.includes('liquid') && !lowerDesc.includes('drop')) {
    missingItems.push('Physical condition confirmation missing: no explicit statement confirming absence of liquid or physical port damage.');
    recommendations.push('State clearly whether the device and USB-C/DC charging port are free of physical or liquid damage.');
  }

  return { missingItems, recommendations };
}
