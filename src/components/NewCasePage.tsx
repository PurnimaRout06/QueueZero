import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  FlaskConical,
  Upload,
  X,
} from 'lucide-react';
import { api } from '../api/client';

interface NewCasePageProps {
  geminiConfigured: boolean;
  onBack: () => void;
  onCaseLaunched: (caseId: string, demoMode: boolean) => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']);

export const NewCasePage: React.FC<NewCasePageProps> = ({
  geminiConfigured,
  onBack,
  onCaseLaunched,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Laptop Warranty & Consumer Complaint');
  const [company, setCompany] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [attachDemoDocs, setAttachDemoDocs] = useState(false);
  const [runDemoMode, setRunDemoMode] = useState(!geminiConfigured);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileAdd = (incoming: FileList | null) => {
    if (!incoming) return;
    setError(null);
    const next: File[] = [...files];

    for (const file of Array.from(incoming)) {
      const extOk = /\.(pdf|png|jpe?g)$/i.test(file.name);
      if (!ALLOWED_TYPES.has(file.type) && !extOk) {
        setError(`Unsupported file "${file.name}". Only PDF, PNG, and JPG files are allowed.`);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`File "${file.name}" exceeds the 10 MB limit.`);
        return;
      }
      if (next.length >= 5) {
        setError('Maximum 5 files per upload batch.');
        return;
      }
      next.push(file);
    }

    setFiles(next);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const loadSampleScenario = () => {
    setError(null);
    setTitle('NovaTech ApexBook Pro 14 Charging Failure (Demo Scenario)');
    setCategory('Laptop Warranty & Consumer Complaint');
    setCompany('NovaTech');
    setProductName('ApexBook Pro 14 (NB-APX14-M4)');
    setDescription(
      'I purchased my NovaTech ApexBook Pro 14 six months ago. Yesterday it suddenly stopped charging over both USB-C ports. I tested with a second compatible OEM USB-C power adapter and cable, and the charging LED does not light up. There has been no liquid spill or physical port damage.'
    );
    setAttachDemoDocs(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 3) {
      setError('Please enter a case title (at least 3 characters).');
      return;
    }
    if (!company.trim() || !productName.trim()) {
      setError('Please enter both the company/brand and product name.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Please describe the problem in at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const { caseRecord } = await api.createCase({
        title: title.trim(),
        category,
        company: company.trim(),
        productName: productName.trim(),
        description: description.trim(),
        isDemo: attachDemoDocs,
      });

      if (files.length > 0) {
        await api.uploadDocuments(caseRecord.id, files);
      }

      if (attachDemoDocs) {
        await api.attachDemoDocuments(caseRecord.id);
      }

      await api.startAnalysis(caseRecord.id, runDemoMode);
      onCaseLaunched(caseRecord.id, runDemoMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create case.');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Start New Resolution Case
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Provide your issue details and upload purchase invoices or warranty documents (PDF, PNG, JPG).
          </p>
        </div>

        <button
          type="button"
          onClick={loadSampleScenario}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
        >
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          Load Demo Laptop Scenario
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label htmlFor="case-title" className="block text-sm font-medium text-slate-700">
                Case Title
              </label>
              <input
                id="case-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Laptop stopped charging after 6 months"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label htmlFor="case-category" className="block text-sm font-medium text-slate-700">
                Workflow Category (MVP Scope)
              </label>
              <select
                id="case-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="Laptop Warranty & Consumer Complaint">
                  Laptop Warranty &amp; Consumer Complaint
                </option>
                <option value="Electronics Warranty (General)" disabled>
                  Refund Requests (Extensible — Post-MVP)
                </option>
                <option value="Billing Disputes (Post-MVP)" disabled>
                  Billing Disputes (Extensible — Post-MVP)
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="case-company" className="block text-sm font-medium text-slate-700">
                Manufacturer / Company
              </label>
              <input
                id="case-company"
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., NovaTech, Zenith, Dell, Lenovo"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="case-product" className="block text-sm font-medium text-slate-700">
                Product Name &amp; Model
              </label>
              <input
                id="case-product"
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., ApexBook Pro 14 (NB-APX14-M4)"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="case-description" className="block text-sm font-medium text-slate-700">
                Describe the Problem &amp; Timeline
              </label>
              <textarea
                id="case-description"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe when the issue started, whether you tested another charger, and whether there is any physical or liquid damage..."
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>
        </div>

        {/* Supporting Documents Upload */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Supporting Documents (Invoices, Receipts, Warranty Cards)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Accepted formats: PDF, PNG, JPG up to 10 MB per file. Documents are scanned strictly as untrusted data and never executed.
          </p>

          <label
            htmlFor="doc-upload-input"
            className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center cursor-pointer hover:border-blue-600 hover:bg-blue-50/30 transition-colors"
          >
            <Upload className="h-6 w-6 text-slate-500" aria-hidden="true" />
            <span className="mt-2 text-sm font-medium text-slate-800">
              Click to select invoice or warranty files
            </span>
            <span className="mt-1 text-xs text-slate-500">PDF, PNG, or JPG · Max 10 MB</span>
            <input
              id="doc-upload-input"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={(e) => handleFileAdd(e.target.files)}
              className="sr-only"
            />
          </label>

          {files.length > 0 && (
            <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
              {files.map((file, idx) => (
                <li key={`${file.name}-${idx}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-4 w-4 text-blue-700 shrink-0" />
                    <span className="truncate font-medium text-slate-800">{file.name}</span>
                    <span className="text-xs text-slate-400 font-mono tabular-nums shrink-0">
                      {Math.max(1, Math.round(file.size / 1024))} KB
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeFile(idx)}
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Attach Demo Sample Invoice &amp; Warranty Card
              </p>
              <p className="text-xs text-slate-500">
                Includes clearly labeled sample invoice INV-2026-90415 for testing the full MCP pipeline.
              </p>
            </div>
            <input
              id="attach-demo-docs"
              type="checkbox"
              checked={attachDemoDocs}
              onChange={(e) => setAttachDemoDocs(e.target.checked)}
              aria-label="Attach Demo Sample Invoice and Warranty Card"
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Execution Mode Transparency */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Orchestration Engine:{' '}
              {runDemoMode ? 'Demo Mode (Deterministic Sample Engine)' : 'Live Gemini 4 Hydrogen + MCP Tools'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {geminiConfigured
                ? 'Gemini API key detected on server. You may run Live AI or switch to deterministic Demo Mode.'
                : 'No live GEMINI_API_KEY detected on server; QueueZero will run in clearly labeled Demo Deterministic Mode alongside all 3 real MCP servers.'}
            </p>
          </div>
          {geminiConfigured && (
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={runDemoMode}
                onChange={(e) => setRunDemoMode(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              Use Demo Mode
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Starting Workflow...' : 'Create Case & Run Live MCP Analysis'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
};
