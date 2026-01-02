// Wrapper simple de API que agrega caché offline automático
import api from './api';
import offlineApi, { EntityType } from './offlineApi';

// Mapeo de endpoints a entity types
const endpointToEntityType: Record<string, EntityType> = {
  '/campos': EntityType.CAMPO,
  '/maquinarias': EntityType.MAQUINARIA,
  '/contratistas': EntityType.CONTRATISTA,
  '/servicios': EntityType.SERVICIO,
  '/stock': EntityType.STOCK,
  '/compras': EntityType.COMPRA,
  '/gastos': EntityType.GASTO,
  '/cuentas': EntityType.CUENTA,
  '/rendimientos': EntityType.RENDIMIENTO,
};

class ApiWithCache {
  // GET con caché automático
  async get<T = any>(endpoint: string): Promise<{ data: T }> {
    const entityType = endpointToEntityType[endpoint];

    if (entityType) {
      try {
        const data = await offlineApi.get<T>(endpoint, {
          entityType,
          allowOffline: true,
        });
        return { data };
      } catch (error) {
        // Si falla offline, intentar con API normal
        console.warn(`Offline get failed for ${endpoint}, trying online...`);
        return await api.get<T>(endpoint);
      }
    }

    // Si no está en el mapeo, usar API normal
    return await api.get<T>(endpoint);
  }

  // POST con soporte offline
  async post<T = any>(endpoint: string, data: any): Promise<{ data: T }> {
    // Intentar obtener el entity type del endpoint base
    const baseEndpoint = '/' + endpoint.split('/')[1];
    const entityType = endpointToEntityType[baseEndpoint];

    if (entityType) {
      try {
        const result = await offlineApi.post<T>(endpoint, data, {
          entityType,
          allowOffline: true,
        });
        return { data: result };
      } catch (error) {
        console.warn(`Offline post failed for ${endpoint}:`, error);
        return await api.post<T>(endpoint, data);
      }
    }

    return await api.post<T>(endpoint, data);
  }

  // PUT con soporte offline
  async put<T = any>(endpoint: string, data: any): Promise<{ data: T }> {
    const baseEndpoint = '/' + endpoint.split('/')[1];
    const entityType = endpointToEntityType[baseEndpoint];

    if (entityType) {
      try {
        const result = await offlineApi.put<T>(endpoint, data, {
          entityType,
          allowOffline: true,
        });
        return { data: result };
      } catch (error) {
        console.warn(`Offline put failed for ${endpoint}:`, error);
        return await api.put<T>(endpoint, data);
      }
    }

    return await api.put<T>(endpoint, data);
  }

  // DELETE con soporte offline
  async delete<T = any>(endpoint: string): Promise<{ data: T }> {
    const baseEndpoint = '/' + endpoint.split('/')[1];
    const entityType = endpointToEntityType[baseEndpoint];

    if (entityType) {
      try {
        const result = await offlineApi.delete<T>(endpoint, {
          entityType,
          allowOffline: true,
        });
        return { data: result };
      } catch (error) {
        console.warn(`Offline delete failed for ${endpoint}:`, error);
        return await api.delete<T>(endpoint);
      }
    }

    return await api.delete<T>(endpoint);
  }

  // PATCH para actualizaciones parciales (usado en cambio de estado)
  async patch<T = any>(endpoint: string, data: any): Promise<{ data: T }> {
    // PATCH se usa típicamente para cambios de estado, delegamos al API normal
    // ya que no queremos cachear esto offline
    return await api.patch<T>(endpoint, data);
  }
}

const apiWithCache = new ApiWithCache();
export default apiWithCache;
