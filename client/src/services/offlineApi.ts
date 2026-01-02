// Wrapper de API con soporte offline
import api from './api';
import dbManager from './indexedDB';

// Tipos de entidades que se pueden manejar offline
export enum EntityType {
  CLIENTE = 'cliente',
  VENTA = 'venta',
  PRODUCTO = 'producto',
  USUARIO = 'usuario',
}

interface OfflineApiOptions {
  entityType: EntityType;
  allowOffline?: boolean;
}

class OfflineApi {
  // Verificar si estamos offline
  isOffline(): boolean {
    return !navigator.onLine;
  }

  // POST con soporte offline
  async post<T>(
    endpoint: string,
    data: any,
    options: OfflineApiOptions
  ): Promise<T> {
    // Si estamos online, hacer request normal
    if (!this.isOffline()) {
      try {
        const response = await api.post<T>(endpoint, data);
        return response.data;
      } catch (error) {
        // Si falla por conexión, intentar modo offline
        if (this.isNetworkError(error) && options.allowOffline) {
          return this.handleOfflinePost(endpoint, data, options);
        }
        throw error;
      }
    }

    // Si estamos offline y está permitido
    if (options.allowOffline) {
      return this.handleOfflinePost(endpoint, data, options);
    }

    throw new Error('Sin conexión a internet. Esta operación requiere conexión.');
  }

  // PUT con soporte offline
  async put<T>(
    endpoint: string,
    data: any,
    options: OfflineApiOptions
  ): Promise<T> {
    if (!this.isOffline()) {
      try {
        const response = await api.put<T>(endpoint, data);
        return response.data;
      } catch (error) {
        if (this.isNetworkError(error) && options.allowOffline) {
          return this.handleOfflinePut(endpoint, data, options);
        }
        throw error;
      }
    }

    if (options.allowOffline) {
      return this.handleOfflinePut(endpoint, data, options);
    }

    throw new Error('Sin conexión a internet. Esta operación requiere conexión.');
  }

  // DELETE con soporte offline
  async delete<T>(
    endpoint: string,
    options: OfflineApiOptions
  ): Promise<T> {
    if (!this.isOffline()) {
      try {
        const response = await api.delete<T>(endpoint);
        return response.data;
      } catch (error) {
        if (this.isNetworkError(error) && options.allowOffline) {
          return this.handleOfflineDelete(endpoint, options);
        }
        throw error;
      }
    }

    if (options.allowOffline) {
      return this.handleOfflineDelete(endpoint, options);
    }

    throw new Error('Sin conexión a internet. Esta operación requiere conexión.');
  }

  // GET con soporte de caché offline
  async get<T>(
    endpoint: string,
    options: OfflineApiOptions
  ): Promise<T> {
    if (!this.isOffline()) {
      try {
        const response = await api.get<T>(endpoint);

        // Guardar en caché para uso offline
        if (options.allowOffline) {
          await dbManager.saveOfflineData(options.entityType, response.data);
        }

        return response.data;
      } catch (error) {
        if (this.isNetworkError(error) && options.allowOffline) {
          return this.handleOfflineGet(options);
        }
        throw error;
      }
    }

    if (options.allowOffline) {
      return this.handleOfflineGet(options);
    }

    throw new Error('Sin conexión a internet. Esta operación requiere conexión.');
  }

  // Manejar POST offline
  private async handleOfflinePost<T>(
    endpoint: string,
    data: any,
    options: OfflineApiOptions
  ): Promise<T> {
    // Guardar en IndexedDB local
    const id = await dbManager.saveOfflineData(options.entityType, data);

    // Agregar a la cola de sincronización
    await dbManager.addPendingSync({
      endpoint,
      method: 'POST',
      data,
      entityType: options.entityType,
    });

    console.log(`📱 Guardado offline: ${options.entityType}`);

    // Emitir evento personalizado
    window.dispatchEvent(new CustomEvent('offline-operation', {
      detail: { type: 'create', entityType: options.entityType }
    }));

    // Retornar los datos con el ID temporal
    return { ...data, id } as T;
  }

  // Manejar PUT offline
  private async handleOfflinePut<T>(
    endpoint: string,
    data: any,
    options: OfflineApiOptions
  ): Promise<T> {
    // Actualizar en IndexedDB local
    await dbManager.saveOfflineData(options.entityType, data);

    // Agregar a la cola de sincronización
    await dbManager.addPendingSync({
      endpoint,
      method: 'PUT',
      data,
      entityType: options.entityType,
    });

    console.log(`📱 Actualizado offline: ${options.entityType}`);

    window.dispatchEvent(new CustomEvent('offline-operation', {
      detail: { type: 'update', entityType: options.entityType }
    }));

    return data as T;
  }

  // Manejar DELETE offline
  private async handleOfflineDelete<T>(
    endpoint: string,
    options: OfflineApiOptions
  ): Promise<T> {
    // Agregar a la cola de sincronización
    await dbManager.addPendingSync({
      endpoint,
      method: 'DELETE',
      data: {},
      entityType: options.entityType,
    });

    console.log(`📱 Eliminación pendiente offline: ${options.entityType}`);

    window.dispatchEvent(new CustomEvent('offline-operation', {
      detail: { type: 'delete', entityType: options.entityType }
    }));

    return {} as T;
  }

  // Manejar GET offline (retornar datos en caché)
  private async handleOfflineGet<T>(options: OfflineApiOptions): Promise<T> {
    const cachedData = await dbManager.getOfflineData(options.entityType);

    if (cachedData.length === 0) {
      throw new Error('No hay datos disponibles offline para esta operación.');
    }

    console.log(`📱 Datos cargados desde caché offline: ${options.entityType}`);

    // Si hay múltiples items, retornar array; si hay uno solo, retornar el objeto
    if (cachedData.length === 1) {
      return cachedData[0].data as T;
    }

    return cachedData.map(item => item.data) as T;
  }

  // Verificar si un error es de red
  private isNetworkError(error: any): boolean {
    return (
      !error.response ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error'
    );
  }
}

const offlineApi = new OfflineApi();
export default offlineApi;
