import { enqueueTask } from "./offlineSync";
import { toast } from "react-hot-toast";

/**
 * Wrapper de fetch qui gère le mode hors-ligne pour les mutations.
 * Si le navigateur est offline, la requête est mise en pile (IndexedDB)
 * et une réponse Mock 200 OK est retournée pour laisser l'UI continuer.
 */
export const fetchSync = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (typeof window !== "undefined" && !navigator.onLine) {
    const method = init?.method?.toUpperCase() || "GET";
    
    // Si c'est une mutation, on empile
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      const url = typeof input === "string" ? input : input.toString();
      
      let bodyObj = null;
      if (init?.body) {
        try {
          bodyObj = JSON.parse(init.body as string);
        } catch (e) {
          bodyObj = init.body; // fallback if it's not JSON
        }
      }

      await enqueueTask(url, method, bodyObj);
      toast("Enregistré hors-ligne. Synchronisation programmée.", {
        icon: '📡',
      });
      
      // On mock une réponse de succès pour que handleSubmit / onSuccess puisse s'exécuter
      return new Response(JSON.stringify({ success: true, offline: true, data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Pour les GET
      toast.error("Vous êtes hors-ligne. Impossible de charger cette donnée.");
      throw new Error("Offline fetch failed");
    }
  }

  // Comportement classique
  return fetch(input, init);
};
