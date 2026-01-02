# Guía de Uso - Modo Offline

## 📱 Cómo usar la API Offline

La aplicación ahora soporta operaciones offline que se sincronizarán automáticamente cuando vuelva la conexión.

### Importar la API Offline

```typescript
import offlineApi, { EntityType } from '../services/offlineApi';
```

### Ejemplo: Crear Cliente Offline

```typescript
// En lugar de usar api.post directamente:
// const response = await api.post('/clientes', nuevoCliente);

// Usa offlineApi con soporte offline:
const cliente = await offlineApi.post('/clientes', nuevoCliente, {
  entityType: EntityType.CLIENTE,
  allowOffline: true, // Permite guardar offline si no hay conexión
});

// Si estás ONLINE: Se crea en el servidor inmediatamente
// Si estás OFFLINE: Se guarda en IndexedDB y se sincroniza después
```

### Ejemplo: Actualizar Venta Offline

```typescript
const ventaActualizada = await offlineApi.put(
  `/ventas/${id}`,
  datosVenta,
  {
    entityType: EntityType.VENTA,
    allowOffline: true,
  }
);
```

### Ejemplo: Obtener Datos con Caché Offline

```typescript
// Al hacer GET, los datos se cachean automáticamente
const clientes = await offlineApi.get('/clientes', {
  entityType: EntityType.CLIENTE,
  allowOffline: true,
});

// Si estás ONLINE: Obtiene datos frescos del servidor
// Si estás OFFLINE: Retorna los datos del último GET exitoso
```

### Ejemplo: Eliminar Offline

```typescript
await offlineApi.delete(`/clientes/${id}`, {
  entityType: EntityType.CLIENTE,
  allowOffline: true,
});
```

## 🔄 Sincronización Automática

La sincronización ocurre automáticamente:

1. **Cada 30 segundos** cuando hay conexión
2. **Inmediatamente** cuando vuelve la conexión (evento 'online')
3. **Manualmente** haciendo click en el botón de sincronización

### Sincronización Manual

```typescript
import syncService from '../services/syncService';

// Forzar sincronización
await syncService.syncPendingOperations();
```

## 📊 Verificar Estado Offline

```typescript
import offlineApi from '../services/offlineApi';
import syncService from '../services/syncService';

// Verificar si estamos offline
const isOffline = offlineApi.isOffline();

// Ver cuántas operaciones están pendientes
const pendingCount = await syncService.getPendingCount();

// Verificar si hay operaciones pendientes
const hasPending = await syncService.hasPendingOperations();
```

## 🎯 Tipos de Entidades Disponibles

```typescript
export enum EntityType {
  CLIENTE = 'cliente',
  VENTA = 'venta',
  PRODUCTO = 'producto',
  USUARIO = 'usuario',
}
```

## ⚠️ Consideraciones Importantes

### 1. **IDs Temporales**

Cuando creas algo offline, se le asigna un ID temporal que comienza con `offline-`:

```typescript
const nuevoCliente = await offlineApi.post('/clientes', data, {
  entityType: EntityType.CLIENTE,
  allowOffline: true,
});

// nuevoCliente.id puede ser "offline-1234567890-abc123"
// Al sincronizar, el servidor asignará el ID real
```

### 2. **Conflictos de Sincronización**

Si dos dispositivos editan el mismo dato offline, **el último en sincronizar gana**. No hay resolución automática de conflictos.

### 3. **Límite de Reintentos**

Si una operación falla 5 veces al sincronizar, se descarta automáticamente.

### 4. **Almacenamiento Limitado**

IndexedDB tiene límite de almacenamiento (~50-500 MB según el dispositivo). No guardes datos masivos offline.

### 5. **Borrar Caché**

Si el usuario borra el caché del navegador, se pierden los datos offline no sincronizados.

## 🔔 Eventos Personalizados

Puedes escuchar eventos de operaciones offline:

```typescript
// Cuando se guarda algo offline
window.addEventListener('offline-operation', (event) => {
  console.log('Operación offline:', event.detail);
  // { type: 'create', entityType: 'cliente' }
});

// Cuando se completa la sincronización
window.addEventListener('sync-completed', () => {
  console.log('Sincronización completada');
  // Actualizar UI
});
```

## 📱 Indicador Visual

El componente `<OfflineIndicator />` muestra:

- 🟢 **Verde**: En línea
- 🔴 **Rojo**: Sin conexión
- **Número**: Operaciones pendientes de sincronizar
- **Botón de sincronización**: Para forzar sincronización manual

## 🧪 Probar Modo Offline

### En Chrome DevTools:

1. Abre DevTools (F12)
2. Ve a la pestaña **Network**
3. Selecciona **Offline** en el dropdown
4. Ahora puedes probar la funcionalidad offline

### En el navegador:

1. Desactiva Wi-Fi y datos móviles
2. Prueba crear/editar datos
3. Reactiva la conexión
4. Verás que se sincronizan automáticamente

## 💡 Mejores Prácticas

1. **Siempre habilita offline en operaciones importantes**:
   ```typescript
   allowOffline: true
   ```

2. **Maneja errores apropiadamente**:
   ```typescript
   try {
     await offlineApi.post('/clientes', data, {
       entityType: EntityType.CLIENTE,
       allowOffline: true,
     });
   } catch (error) {
     console.error('Error:', error);
     // Mostrar mensaje al usuario
   }
   ```

3. **Indica al usuario cuando está offline**:
   - El componente `<OfflineIndicator />` ya lo hace
   - Considera deshabilitar operaciones críticas offline

4. **Actualiza la UI después de sincronizar**:
   ```typescript
   window.addEventListener('sync-completed', () => {
     // Recargar datos
     fetchData();
   });
   ```
