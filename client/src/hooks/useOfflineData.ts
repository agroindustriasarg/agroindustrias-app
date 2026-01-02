import { useState, useEffect, useCallback } from 'react';
import offlineApi, { EntityType } from '../services/offlineApi';

interface UseOfflineDataOptions {
  endpoint: string;
  entityType: EntityType;
  dependencies?: any[];
}

export function useOfflineData<T>({ endpoint, entityType, dependencies = [] }: UseOfflineDataOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Primero intentar con offlineApi (intenta online, luego offline)
      const response = await offlineApi.get<T[]>(endpoint, {
        entityType,
        allowOffline: true,
      });

      setData(Array.isArray(response) ? response : [response]);
    } catch (err: any) {
      console.error(`Error fetching ${entityType}:`, err);
      setError(err.message || 'Error al cargar datos');

      // Si falla, intentar cargar desde caché offline de IndexedDB
      try {
        const dbManager = await import('../services/indexedDB').then(m => m.default);
        await dbManager.init();
        const cachedData = await dbManager.getOfflineData(entityType);

        if (cachedData.length > 0) {
          setData(cachedData.map(item => item.data));
          setError(null); // Limpiar error si tenemos datos en caché
        }
      } catch (cacheErr) {
        console.error('Error loading from cache:', cacheErr);
        // No hay datos en caché o error al cargar
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, entityType, ...dependencies]);

  useEffect(() => {
    fetchData();

    // Escuchar evento de sincronización completada para recargar datos
    const handleSyncCompleted = () => {
      fetchData();
    };

    window.addEventListener('sync-completed', handleSyncCompleted);

    return () => {
      window.removeEventListener('sync-completed', handleSyncCompleted);
    };
  }, [fetchData]);

  const create = async (newData: Partial<T>): Promise<T> => {
    const result = await offlineApi.post<T>(endpoint, newData, {
      entityType,
      allowOffline: true,
    });

    // Actualizar lista local inmediatamente
    setData(prev => [...prev, result]);

    return result;
  };

  const update = async (id: string, updatedData: Partial<T>): Promise<T> => {
    const result = await offlineApi.put<T>(`${endpoint}/${id}`, updatedData, {
      entityType,
      allowOffline: true,
    });

    // Actualizar lista local inmediatamente
    setData(prev => prev.map((item: any) => item.id === id ? result : item));

    return result;
  };

  const remove = async (id: string): Promise<void> => {
    await offlineApi.delete(`${endpoint}/${id}`, {
      entityType,
      allowOffline: true,
    });

    // Actualizar lista local inmediatamente
    setData(prev => prev.filter((item: any) => item.id !== id));
  };

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    create,
    update,
    remove,
  };
}
