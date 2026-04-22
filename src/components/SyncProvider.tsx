"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { syncAllQueuedTasks, getPendingTasks } from "@/lib/offlineSync";
import { CloudOff, CloudSync, Wifi } from "lucide-react";
import { toast } from "react-hot-toast";

interface SyncContextType {
  isOnline: boolean;
  pendingCount: number;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isOnline: true,
  pendingCount: 0,
  triggerSync: async () => {},
});

export const useSync = () => useContext(SyncContext);

export default function SyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const updatePendingCount = async () => {
    const tasks = await getPendingTasks();
    setPendingCount(tasks.length);
  };

  const triggerSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    
    const tasks = await getPendingTasks();
    if (tasks.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;

    await syncAllQueuedTasks((success) => {
      if (success) successCount++;
    });

    await updatePendingCount();
    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`${successCount} données mises en cache synchronisées avec succès !`);
    }
  };

  useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine);
    updatePendingCount();

    // Setup event listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Réseau rétabli. Synchronisation en cours...");
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Mode hors-ligne activé. Vos requêtes seront temporairement mises en attente.");
    };

    // Update pending count periodically in case local logic adds tasks
    const interval = setInterval(updatePendingCount, 3000);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ isOnline, pendingCount, triggerSync }}>
      <div className="relative">
        {/* NETWORK STATUS BADGE */}
        {(!isOnline || pendingCount > 0) && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`px-4 py-2 rounded-full border shadow-lg shadow-black/20 flex items-center gap-2 backdrop-blur-md ${
              !isOnline 
                ? "bg-orange-500/90 text-white border-orange-400" 
                : "bg-blue-600/90 text-white border-blue-500"
            }`}>
              {!isOnline ? (
                <>
                  <CloudOff className="w-4 h-4 animate-pulse" />
                  <span className="text-xs font-bold tracking-wide">HORS-LIGNE</span>
                  {pendingCount > 0 && (
                    <span className="bg-white text-orange-600 px-2 rounded-full text-[10px] font-black ml-1">
                      {pendingCount} en attente
                    </span>
                  )}
                </>
              ) : (
                <>
                  <CloudSync className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="text-xs font-bold tracking-wide">
                    {isSyncing ? 'SYNCHRONISATION...' : `${pendingCount} TÂCHES EN ATTENTE`}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    </SyncContext.Provider>
  );
}
