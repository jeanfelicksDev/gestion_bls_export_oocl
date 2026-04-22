import { openDB } from 'idb';

const DB_NAME = 'oocl-offline-db';
const STORE_NAME = 'sync-queue';

// Interface pour nos requêtes stockées
export interface SyncTask {
  id: string;          // UUID unique
  url: string;         // Point de terminaison API
  method: string;      // POST, PUT, DELETE, etc.
  body: string | null;        // Charge utile stringifiée
  timestamp: number;
  status: 'pending' | 'failed';
}

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

export const enqueueTask = async (url: string, method: string, bodyObj: any) => {
  const db = await initDB();
  const task: SyncTask = {
    id: crypto.randomUUID(),
    url,
    method,
    body: bodyObj !== null ? JSON.stringify(bodyObj) : null,
    timestamp: Date.now(),
    status: 'pending',
  };
  await db.add(STORE_NAME, task);
  return task;
};

export const getPendingTasks = async (): Promise<SyncTask[]> => {
  const db = await initDB();
  // On récupère toutes les tâches
  const all = await db.getAll(STORE_NAME);
  return all.sort((a, b) => a.timestamp - b.timestamp);
};

export const removeTask = async (id: string) => {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
};

export const markTaskFailed = async (id: string) => {
  const db = await initDB();
  const task = await db.get(STORE_NAME, id);
  if (task) {
    task.status = 'failed';
    await db.put(STORE_NAME, task);
  }
};

/**
 * Exécute la synchronisation:
 * Dépile les requêtes et les exécute.
 */
export const syncAllQueuedTasks = async (onTaskFinish?: (success: boolean) => void) => {
  if (typeof window === 'undefined' || !navigator.onLine) return; // Impossible sans réseau

  const tasks = await getPendingTasks();
  if (tasks.length === 0) return;

  for (const task of tasks) {
    try {
      const response = await fetch(task.url, {
        method: task.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: task.body,
      });

      if (response.ok) {
        // Succès, on l'enlève de la file
        await removeTask(task.id);
        if (onTaskFinish) onTaskFinish(true);
      } else {
        // Erreur réseau mais le backend a répondu, cela signifie un echec API (validation?)
        // Peut nécessiter une attention, mais on le retire si c'est une 4xx ou on la garde pour 5xx.
        if (response.status >= 500) {
          throw new Error('Server error');
        } else {
           // Si 4xx (Bad Request, etc), la donnée est très probablement cassée, on supprime.
           await removeTask(task.id);
        }
      }
    } catch (error) {
      // Echec de connexion durant le déversement
      console.error('Echec synchronisation tâche', task.id, error);
      await markTaskFailed(task.id);
      if (onTaskFinish) onTaskFinish(false);
      break; // On stoppe la chaîne si on perd la connexion pour conserver l'ordre
    }
  }
};
