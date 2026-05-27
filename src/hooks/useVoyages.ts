"use client";

import { useState, useEffect, useCallback } from "react";
import { IVoyageWithBLs } from "@/lib/types";
import { logger } from "@/lib/logger";

const CONTEXT = "HOOK_VOYAGES";

interface UseVoyagesReturn {
  voyages: IVoyageWithBLs[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useVoyages(): UseVoyagesReturn {
  const [voyages, setVoyages] = useState<IVoyageWithBLs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVoyages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/voyages");

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const responseData: unknown = await res.json();

      // Validate response structure
      if (!responseData || typeof responseData !== "object") {
        throw new Error("Format de réponse invalide");
      }

      const data = responseData as Record<string, unknown>;
      
      let voyagesList: IVoyageWithBLs[] = [];
      if (data.data && typeof data.data === "object" && "data" in data.data && Array.isArray((data.data as any).data)) {
        voyagesList = (data.data as any).data as IVoyageWithBLs[];
      } else if (Array.isArray(data.data)) {
        voyagesList = data.data as IVoyageWithBLs[];
      } else if (Array.isArray(data)) {
        // Fallback for old API format
        voyagesList = data as IVoyageWithBLs[];
      } else {
        throw new Error(
          data.error ? String(data.error) : "Format de données invalide"
        );
      }

      setVoyages(voyagesList);
      logger.debug(CONTEXT, `Loaded ${voyagesList.length} voyages`);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Erreur de chargement inconnue";
      setError(errorMsg);
      setVoyages([]);
      logger.error(CONTEXT, "Failed to load voyages", err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVoyages();

    const handleGlobalRefresh = () => {
      logger.debug(CONTEXT, "Global refresh event triggered");
      void fetchVoyages();
    };

    window.addEventListener("refresh-data", handleGlobalRefresh);

    return () => {
      window.removeEventListener("refresh-data", handleGlobalRefresh);
    };
  }, [fetchVoyages]);

  return {
    voyages,
    loading,
    error,
    refresh: fetchVoyages,
  };
}
