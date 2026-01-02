// Utilidad para manejar IndexedDB (almacenamiento local offline)

const DB_NAME = 'AgroindustriasDB';
const DB_VERSION = 1;

// Stores (tablas) de IndexedDB
export const STORES = {
  PENDING_SYNC: 'pendingSync',
  OFFLINE_DATA: 'offlineData',
};

export interface PendingSyncItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: any;
  timestamp: number;
  entityType: string;
  retries: number;
}

export interface OfflineDataItem {
  id: string;
  entityType: string;
  data: any;
  timestamp: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
          const pendingStore = db.createObjectStore(STORES.PENDING_SYNC, {
            keyPath: 'id',
          });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
          pendingStore.createIndex('entityType', 'entityType', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.OFFLINE_DATA)) {
          const offlineStore = db.createObjectStore(STORES.OFFLINE_DATA, {
            keyPath: 'id',
          });
          offlineStore.createIndex('entityType', 'entityType', { unique: false });
          offlineStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private getObjectStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async addPendingSync(item: Omit<PendingSyncItem, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pendingItem: PendingSyncItem = {
      ...item,
      id,
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.PENDING_SYNC, 'readwrite');
      const request = store.add(pendingItem);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSync(): Promise<PendingSyncItem[]> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.PENDING_SYNC, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingSync(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.PENDING_SYNC, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async incrementRetries(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.PENDING_SYNC, 'readwrite');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.retries += 1;
          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async saveOfflineData(entityType: string, data: any): Promise<string> {
    const id = data.id || `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const item: OfflineDataItem = {
      id,
      entityType,
      data: { ...data, id },
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.OFFLINE_DATA, 'readwrite');
      const request = store.put(item);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineData(entityType: string): Promise<OfflineDataItem[]> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.OFFLINE_DATA, 'readonly');
      const index = store.index('entityType');
      const request = index.getAll(entityType);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllOfflineData(): Promise<OfflineDataItem[]> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.OFFLINE_DATA, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeOfflineData(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.OFFLINE_DATA, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearOfflineDataByType(entityType: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.OFFLINE_DATA, 'readwrite');
      const index = store.index('entityType');
      const request = index.openCursor(IDBKeyRange.only(entityType));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.clearStore(STORES.PENDING_SYNC),
      this.clearStore(STORES.OFFLINE_DATA),
    ]);
  }

  private async clearStore(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(storeName, 'readwrite');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const dbManager = new IndexedDBManager();
export default dbManager;
