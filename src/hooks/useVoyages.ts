"use client";

import { useState, useEffect } from "react";

export function useVoyages() {
  const [voyages, setVoyages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVoyages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/voyages");
      const data = await res.json();
      if (Array.isArray(data)) {
        setVoyages(data);
      } else {
        setError(data.error || "Format de données invalide");
        setVoyages([]);
      }
    } catch (err) {
      setError("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoyages();
    
    const handleGlobalRefresh = () => fetchVoyages();
    window.addEventListener("refresh-data", handleGlobalRefresh);
    return () => window.removeEventListener("refresh-data", handleGlobalRefresh);
  }, []);

  return { voyages, loading, error, refresh: fetchVoyages };
}
