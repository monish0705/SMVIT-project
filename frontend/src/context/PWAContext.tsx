import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getOfflineDrafts, OfflineDraft, syncSingleDraft } from '../services/offlineDrafts';

interface PWAContextType {
  isOnline: boolean;
  drafts: OfflineDraft[];
  pendingDraftCount: number;
  canInstall: boolean;
  isInstalled: boolean;
  syncing: boolean;
  refreshDrafts: () => Promise<void>;
  syncAllDrafts: () => Promise<{ synced: number; failed: number }>;
  promptInstall: () => Promise<boolean>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(
    typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches
  );
  const [syncing, setSyncing] = useState<boolean>(false);

  const refreshDrafts = useCallback(async () => {
    const list = await getOfflineDrafts();
    setDrafts(list);
  }, []);

  const syncAllDrafts = useCallback(async () => {
    const current = await getOfflineDrafts();
    if (current.length === 0 || !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }
    setSyncing(true);
    let synced = 0;
    let failed = 0;
    for (const draft of current) {
      try {
        await syncSingleDraft(draft);
        synced += 1;
      } catch {
        failed += 1;
      }
    }
    await refreshDrafts();
    setSyncing(false);
    return { synced, failed };
  }, [refreshDrafts]);

  useEffect(() => {
    refreshDrafts();

    const handleOnline = () => {
      setIsOnline(true);
      syncAllDrafts();
    };
    const handleOffline = () => setIsOnline(false);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [refreshDrafts, syncAllDrafts]);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === 'accepted') {
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return (
    <PWAContext.Provider
      value={{
        isOnline,
        drafts,
        pendingDraftCount: drafts.length,
        canInstall: !!deferredPrompt && !isInstalled,
        isInstalled,
        syncing,
        refreshDrafts,
        syncAllDrafts,
        promptInstall,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export function usePWA() {
  const ctx = useContext(PWAContext);
  if (!ctx) throw new Error('usePWA must be used inside PWAProvider');
  return ctx;
}

