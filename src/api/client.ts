import type {
  CaseDetailPayload,
  CaseRecord,
  CaseStatus,
  ComplaintDraftRecord,
  DocumentRecord,
  PolicyRecord,
  ResolutionStep,
  UserProfile,
  WorkflowEventRecord,
  WorkflowRunRecord,
} from '../types';

// Keep auth token strictly in memory (never localStorage or sessionStorage)
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    throw new Error(String(data.error || `Request failed (${res.status})`));
  }

  return data as T;
}

export interface HealthResponse {
  status: string;
  geminiConfigured: boolean;
  mcpServers: Array<{
    key: 'evidence' | 'policy' | 'resolution';
    connected: boolean;
    tools: string[];
    error?: string;
  }>;
}

export const api = {
  health: () => apiFetch<HealthResponse>('/api/health'),

  register: (payload: { name: string; email: string; password: string }) =>
    apiFetch<{ user: UserProfile; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    apiFetch<{ user: UserProfile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  loginDemo: () =>
    apiFetch<{ user: UserProfile; token: string; isDemoSession: boolean }>('/api/auth/demo', {
      method: 'POST',
    }),

  me: () => apiFetch<{ user: UserProfile }>('/api/auth/me'),

  listPolicies: () => apiFetch<{ policies: PolicyRecord[] }>('/api/policies'),

  listCases: () =>
    apiFetch<{
      cases: CaseRecord[];
      recentActivity: Array<{
        id: string;
        caseId: string;
        caseTitle: string;
        action: string;
        description: string;
        timestamp: string;
      }>;
    }>('/api/cases'),

  createCase: (payload: {
    title: string;
    category: string;
    description: string;
    company: string;
    productName: string;
    isDemo?: boolean;
  }) =>
    apiFetch<{ caseRecord: CaseRecord }>('/api/cases', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCase: (caseId: string) => apiFetch<CaseDetailPayload>(`/api/cases/${encodeURIComponent(caseId)}`),

  deleteCase: (caseId: string) =>
    apiFetch<{ deleted: boolean; caseId: string }>(`/api/cases/${encodeURIComponent(caseId)}`, {
      method: 'DELETE',
    }),

  uploadDocuments: (caseId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return apiFetch<{ documents: DocumentRecord[] }>(
      `/api/cases/${encodeURIComponent(caseId)}/documents`,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  attachDemoDocuments: (caseId: string) =>
    apiFetch<{ documents: DocumentRecord[] }>(
      `/api/cases/${encodeURIComponent(caseId)}/demo-documents`,
      {
        method: 'POST',
      }
    ),

  startAnalysis: (caseId: string, demoMode?: boolean) =>
    apiFetch<{ status: string; mode: 'live_ai' | 'demo_deterministic' }>(
      `/api/cases/${encodeURIComponent(caseId)}/analyze`,
      {
        method: 'POST',
        body: JSON.stringify({ demoMode: Boolean(demoMode) }),
      }
    ),

  updateDraft: (
    caseId: string,
    payload: {
      draftContent?: string;
      approve?: boolean;
      checklist?: ResolutionStep[];
    }
  ) =>
    apiFetch<{ complaintDraft: ComplaintDraftRecord }>(
      `/api/cases/${encodeURIComponent(caseId)}/draft`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  regenerateDraft: (caseId: string) =>
    apiFetch<{ complaintDraft: ComplaintDraftRecord }>(
      `/api/cases/${encodeURIComponent(caseId)}/draft/regenerate`,
      {
        method: 'POST',
      }
    ),

  updateStatus: (caseId: string, status: CaseStatus, createFollowUpReminder = false) =>
    apiFetch<{ caseRecord: CaseRecord; followUpNote: string | null }>(
      `/api/cases/${encodeURIComponent(caseId)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, createFollowUpReminder }),
      }
    ),

  exportUserData: () => apiFetch<Record<string, unknown>>('/api/users/me/export'),
};

/**
 * Subscribe to real SSE workflow events using fetch() + ReadableStream so the Bearer token
 * remains securely inside the Authorization header (never exposed in URL query strings).
 */
export function subscribeCaseWorkflowEvents(
  caseId: string,
  handlers: {
    onSnapshot: (run: WorkflowRunRecord | null) => void;
    onEvent: (event: WorkflowEventRecord, run: WorkflowRunRecord) => void;
    onState: (run: WorkflowRunRecord) => void;
    onComplete: (run: WorkflowRunRecord) => void;
    onError: (message: string) => void;
  }
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const headers: Record<string, string> = {
        Accept: 'text/event-stream',
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/events`, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE stream failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
          const lines = chunk.split('\n');
          let eventType = 'message';
          const dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith(':')) continue;
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trim());
            }
          }

          if (dataLines.length === 0) continue;
          const parsed = JSON.parse(dataLines.join('\n'));

          if (eventType === 'snapshot') {
            handlers.onSnapshot(parsed.run || null);
          } else if (eventType === 'event') {
            handlers.onEvent(parsed.event, parsed.run);
          } else if (eventType === 'state') {
            handlers.onState(parsed.run);
          } else if (eventType === 'complete') {
            handlers.onComplete(parsed.run);
          } else if (eventType === 'error') {
            handlers.onError(parsed.error || 'Workflow failed.');
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        handlers.onError(err instanceof Error ? err.message : 'Stream disconnected');
      }
    }
  })();

  return () => controller.abort();
}
