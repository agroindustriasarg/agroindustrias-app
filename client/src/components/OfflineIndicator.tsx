import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import syncService from '../services/syncService';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleOfflineOperation = () => {
      updatePendingCount();
    };

    const handleSyncCompleted = () => {
      setIsSyncing(false);
      updatePendingCount();
    };

    const updatePendingCount = async () => {
      const count = await syncService.getPendingCount();
      setPendingCount(count);
    };

    // Listeners de eventos
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-operation', handleOfflineOperation);
    window.addEventListener('sync-completed', handleSyncCompleted);

    // Actualizar contador inicial
    updatePendingCount();

    // Intervalo para actualizar el contador
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-operation', handleOfflineOperation);
      window.removeEventListener('sync-completed', handleSyncCompleted);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncService.syncPendingOperations();
    } catch (error) {
      console.error('Error en sincronización manual:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // No mostrar nada si estamos online y no hay operaciones pendientes
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
          isOnline
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}
      >
        {isOnline ? (
          <Wifi className="w-5 h-5" />
        ) : (
          <WifiOff className="w-5 h-5" />
        )}

        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>

          {pendingCount > 0 && (
            <span className="text-xs">
              {pendingCount} operación{pendingCount !== 1 ? 'es' : ''} pendiente
              {pendingCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isOnline && pendingCount > 0 && (
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="ml-2 p-1 hover:bg-green-100 rounded transition-colors"
            title="Sincronizar ahora"
          >
            <RefreshCw
              className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
