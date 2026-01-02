// Servicio de sincronización para modo offline
import dbManager from './indexedDB';
import api from './api';

class SyncService {
  private syncInProgress = false;
  private syncInterval: number | null = null;

  // Inicializar sincronización automática
  async init() {
    await dbManager.init();

    // Escuchar eventos de conexión
    window.addEventListener('online', () => this.syncPendingOperations());
    window.addEventListener('offline', () => this.stopAutoSync());

    // Si hay conexión, iniciar sincronización automática
    if (navigator.onLine) {
      this.startAutoSync();
      await this.syncPendingOperations();
    }
  }

  // Iniciar sincronización automática cada 30 segundos
  private startAutoSync() {
    if (this.syncInterval) return;

    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine) {
        this.syncPendingOperations();
      }
    }, 30000); // 30 segundos
  }

  private stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sincronizar todas las operaciones pendientes
  async syncPendingOperations(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;

    try {
      const pendingItems = await dbManager.getPendingSync();

      console.log(`🔄 Sincronizando ${pendingItems.length} operaciones pendientes...`);

      for (const item of pendingItems) {
        try {
          // Intentar sincronizar la operación
          await this.syncItem(item);

          // Si tuvo éxito, eliminar de la cola
          await dbManager.removePendingSync(item.id);

          console.log(`✅ Sincronizado: ${item.entityType} (${item.method} ${item.endpoint})`);
        } catch (error) {
          console.error(`❌ Error sincronizando ${item.id}:`, error);

          // Incrementar contador de reintentos
          await dbManager.incrementRetries(item.id);

          // Si ya se intentó muchas veces, eliminar
          if (item.retries >= 5) {
            console.warn(`⚠️ Descartando operación después de ${item.retries} intentos:`, item);
            await dbManager.removePendingSync(item.id);
          }
        }
      }

      // Emitir evento personalizado de sincronización completada
      window.dispatchEvent(new CustomEvent('sync-completed'));

    } catch (error) {
      console.error('Error en sincronización:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sincronizar un item individual
  private async syncItem(item: any): Promise<void> {
    const token = localStorage.getItem('token');

    const config = {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    };

    switch (item.method) {
      case 'POST':
        await api.post(item.endpoint, item.data, config);
        break;
      case 'PUT':
        await api.put(item.endpoint, item.data, config);
        break;
      case 'DELETE':
        await api.delete(item.endpoint, config);
        break;
    }
  }

  // Verificar si hay operaciones pendientes
  async hasPendingOperations(): Promise<boolean> {
    const pending = await dbManager.getPendingSync();
    return pending.length > 0;
  }

  // Obtener número de operaciones pendientes
  async getPendingCount(): Promise<number> {
    const pending = await dbManager.getPendingSync();
    return pending.length;
  }
}

const syncService = new SyncService();
export default syncService;
