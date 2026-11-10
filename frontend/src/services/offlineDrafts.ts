import { api } from './api';

export interface OfflineDraft {
  id: string;
  fileName: string;
  mimeType: string;
  imageDataUrl: string;
  captureMode: 'camera' | 'gallery';
  description: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  locationSource: string;
  isManualPin: boolean;
  addressLabel: string;
  createdAt: string;
}

const DB_NAME = 'civicpulse_offline_db';
const STORE_NAME = 'report_drafts';
const FALLBACK_KEY = 'civicpulse_offline_drafts_fallback';
const MY_REPORTS_KEY = 'civicpulse_my_submitted_incidents';

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to encode photo for offline storage.'));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string, fallbackType = 'image/jpeg'): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : fallbackType;
  const bin = atob(parts[1] || '');
  const len = bin.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

export async function getOfflineDrafts(): Promise<OfflineDraft[]> {
  const db = await openDB();
  if (!db) {
    try {
      return JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
    } catch {
      return [];
    }
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result as OfflineDraft[]) || [];
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(list);
    };
    req.onerror = () => resolve([]);
  });
}

export async function saveOfflineDraft(draft: Omit<OfflineDraft, 'id' | 'createdAt'>): Promise<OfflineDraft> {
  const record: OfflineDraft = {
    ...draft,
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const db = await openDB();
  if (!db) {
    const current = await getOfflineDrafts();
    localStorage.setItem(FALLBACK_KEY, JSON.stringify([record, ...current]));
    return record;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(new Error('Failed to write offline draft.'));
  });
}

export async function deleteOfflineDraft(id: string): Promise<void> {
  const db = await openDB();
  if (!db) {
    const current = await getOfflineDrafts();
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(current.filter((d) => d.id !== id)));
    return;
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function syncSingleDraft(draft: OfflineDraft): Promise<any> {
  const blob = dataUrlToBlob(draft.imageDataUrl, draft.mimeType);
  const file = new File([blob], draft.fileName || 'offline_capture.jpg', { type: draft.mimeType || 'image/jpeg' });
  const formData = new FormData();
  formData.append('image', file);
  formData.append('capture_mode', draft.captureMode);
  if (draft.description) formData.append('description', draft.description);
  if (draft.isManualPin && draft.latitude && draft.longitude) {
    formData.append('user_selected_latitude', draft.latitude.toString());
    formData.append('user_selected_longitude', draft.longitude.toString());
  } else if (draft.latitude && draft.longitude) {
    formData.append('device_latitude', draft.latitude.toString());
    formData.append('device_longitude', draft.longitude.toString());
    if (draft.accuracy) formData.append('device_accuracy_m', draft.accuracy.toString());
  }
  const receipt = await api.submitReport(formData);
  if (receipt?.incident_number) {
    recordSubmittedIncidentNumber(receipt.incident_number);
  }
  await deleteOfflineDraft(draft.id);
  return receipt;
}

export function recordSubmittedIncidentNumber(incidentNumber: string) {
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(MY_REPORTS_KEY) || '[]');
    if (!existing.includes(incidentNumber)) {
      localStorage.setItem(MY_REPORTS_KEY, JSON.stringify([incidentNumber, ...existing]));
    }
  } catch {
    // Ignore storage restriction
  }
}

export function getRecordedSubmittedIncidentNumbers(): string[] {
  try {
    return JSON.parse(localStorage.getItem(MY_REPORTS_KEY) || '[]');
  } catch {
    return [];
  }
}

