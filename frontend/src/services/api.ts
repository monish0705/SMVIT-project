import { 
  IncidentStats, 
  IncidentSummary, 
  IncidentDetailResponse, 
  GeoProofPreview, 
  AnalyticsResponse,
  UserRole,
  User 
} from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('civicpulse_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('civicpulse_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('civicpulse_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'API Request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch (_) {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    return request<{ access_token: string; token_type: string; role: UserRole; user_id: string; full_name: string }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe() {
    return request<User>('/auth/me');
  },

  // Incidents
  async getStats() {
    return request<IncidentStats>('/incidents/stats');
  },

  async getAnalytics() {
    return request<AnalyticsResponse>('/incidents/analytics');
  },

  async getMapIncidents(category?: string, status?: string, minPriority?: number) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    if (minPriority !== undefined) params.append('min_priority', minPriority.toString());
    return request<any[]>(`/incidents/map?${params.toString()}`);
  },

  async getIncidents(filters?: {
    search?: string;
    category?: string;
    status?: string;
    min_priority?: number;
    assigned_team?: string;
    submitted_by?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.min_priority !== undefined) params.append('min_priority', filters.min_priority.toString());
    if (filters?.assigned_team) params.append('assigned_team', filters.assigned_team);
    if (filters?.submitted_by) params.append('submitted_by', filters.submitted_by);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    return request<IncidentSummary[]>(`/incidents?${params.toString()}`);
  },

  async updateIncidentLocation(id: string, data: { latitude: number; longitude: number; accuracy_m?: number; source?: string; reason?: string }) {
    return request<{ status: string; latitude: number; longitude: number; readable_address: string; current_status: string }>(`/incidents/${id}/location`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async getIncidentDetail(id: string) {
    return request<IncidentDetailResponse>(`/incidents/${id}`);
  },

  async getIncidentEvidenceGraph(id: string) {
    return request<{ nodes: any[]; edges: any[] }>(`/incidents/${id}/evidence-graph`);
  },

  async reviewIncident(id: string, data: { decision: string; reason: string; notes?: string; new_status?: string }) {
    return request<{ status: string; message: string; new_status: string }>(`/incidents/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async assignIncident(id: string, data: { assigned_team: string; assigned_to?: string; notes?: string }) {
    return request<{ status: string; assigned_team: string; incident_status: string }>(`/incidents/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async createWorkOrder(id: string, data: { title: string; assigned_team: string; assigned_inspector?: string; notes?: string }) {
    return request<{ status: string; work_order_number: string; work_order_id: string }>(`/incidents/${id}/work-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async uploadResolutionEvidence(id: string, formData: FormData) {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/incidents/${id}/resolution-evidence`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async verifyResolution(id: string, decision: string, reason: string, notes?: string) {
    const formData = new FormData();
    formData.append('decision', decision);
    formData.append('reason', reason);
    if (notes) formData.append('notes', notes);

    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/incidents/${id}/verify-resolution`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Verification failed' }));
      throw new Error(err.detail || 'Verification failed');
    }
    return res.json();
  },

  async updateIncidentLinkStatus(linkId: string, action: 'confirm' | 'reject', reason?: string) {
    const formData = new FormData();
    formData.append('action', action);
    if (reason) formData.append('reason', reason);

    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/incidents/links/${linkId}/status`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Link update failed' }));
      throw new Error(err.detail || 'Link update failed');
    }
    return res.json();
  },

  // Reports Intake
  async precheckMetadata(imageFile: File) {
    const formData = new FormData();
    formData.append('image', imageFile);
    const res = await fetch(`${API_BASE}/reports/analyze-metadata`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Metadata analysis failed' }));
      throw new Error(err.detail || 'Metadata analysis failed');
    }
    return res.json() as Promise<GeoProofPreview>;
  },

  async submitReport(formData: FormData) {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Report submission failed' }));
      throw new Error(err.detail || 'Report submission failed');
    }
    return res.json();
  },

  async reverseGeocode(latitude: number, longitude: number) {
    return request<{ latitude: number; longitude: number; readable_address: string }>('/location/reverse-geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    });
  },

  // Work Orders
  async getWorkOrders(status?: string, team?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status_filter', status);
    if (team) params.append('team', team);
    return request<any[]>(`/work-orders?${params.toString()}`);
  },

  async updateWorkOrder(id: string, data: any) {
    return request<any>(`/work-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // AI Copilot
  async queryCopilot(query: string, context_incident_id?: string) {
    return request<{
      query: string;
      answer: string;
      tools_executed: any[];
      referenced_incidents: string[];
      suggested_actions: string[];
    }>('/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, context_incident_id }),
    });
  },

  // Audit
  async getAuditLogs(incident_id?: string) {
    const params = new URLSearchParams();
    if (incident_id) params.append('incident_id', incident_id);
    return request<any[]>(`/audit?${params.toString()}`);
  },

  // Settings
  async getSettingsStatus() {
    return request<any>('/settings/status');
  },

  async getDemoUsers() {
    return request<User[]>('/settings/users');
  },

  async createUser(data: { email: string; full_name: string; password: string; role: string; organization?: string }) {
    return request<any>('/settings/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteUser(userId: string) {
    return request<any>(`/settings/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async updateRiskWeights(data: { severity: number; exposure: number; criticality: number; hazard: number; time_unresolved: number; recalculate_open?: boolean }) {
    return request<{ status: string; recalculated: number }>('/settings/risk-weights', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }
};

