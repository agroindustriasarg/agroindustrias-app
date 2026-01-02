# 📱 Guía de Migración a Modo Offline

## Cómo hacer que tus componentes funcionen offline

### ❌ ANTES (solo online):

```typescript
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Campos() {
  const [campos, setCampos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampos();
  }, []);

  const fetchCampos = async () => {
    try {
      const response = await api.get('/campos');
      setCampos(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    await api.post('/campos', data);
    fetchCampos();
  };

  const handleUpdate = async (id, data) => {
    await api.put(`/campos/${id}`, data);
    fetchCampos();
  };

  const handleDelete = async (id) => {
    await api.delete(`/campos/${id}`);
    fetchCampos();
  };

  // ... resto del componente
}
```

---

### ✅ DESPUÉS (con soporte offline):

```typescript
import { useState } from 'react';
import { useOfflineData } from '../hooks/useOfflineData';
import { EntityType } from '../services/offlineApi';
import { Campo } from '../types';

export default function Campos() {
  const {
    data: campos,
    loading,
    error,
    create,
    update,
    remove,
    refetch
  } = useOfflineData<Campo>({
    endpoint: '/campos',
    entityType: EntityType.CAMPO,
  });

  const handleCreate = async (data: Partial<Campo>) => {
    try {
      await create(data);
      // No necesitas refetch, se actualiza automáticamente
    } catch (error: any) {
      alert(error.message || 'Error al crear campo');
    }
  };

  const handleUpdate = async (id: string, data: Partial<Campo>) => {
    try {
      await update(id, data);
      // No necesitas refetch, se actualiza automáticamente
    } catch (error: any) {
      alert(error.message || 'Error al actualizar campo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro?')) return;
    try {
      await remove(id);
      // No necesitas refetch, se actualiza automáticamente
    } catch (error: any) {
      alert(error.message || 'Error al eliminar campo');
    }
  };

  // Mostrar error si hay
  if (error && campos.length === 0) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  // ... resto del componente
}
```

---

## 📋 Resumen de cambios:

### 1. **Cambiar el import:**

```diff
- import api from '../services/api';
+ import { useOfflineData } from '../hooks/useOfflineData';
+ import { EntityType } from '../services/offlineApi';
```

### 2. **Reemplazar useState y useEffect:**

```diff
- const [campos, setCampos] = useState([]);
- const [loading, setLoading] = useState(true);
-
- useEffect(() => {
-   fetchCampos();
- }, []);
-
- const fetchCampos = async () => {
-   try {
-     const response = await api.get('/campos');
-     setCampos(response.data);
-   } catch (error) {
-     console.error('Error:', error);
-   } finally {
-     setLoading(false);
-   }
- };

+ const {
+   data: campos,
+   loading,
+   error,
+   create,
+   update,
+   remove,
+   refetch
+ } = useOfflineData({
+   endpoint: '/campos',
+   entityType: EntityType.CAMPO,
+ });
```

### 3. **Actualizar operaciones CRUD:**

```diff
- await api.post('/campos', data);
- fetchCampos();
+ await create(data);
```

```diff
- await api.put(`/campos/${id}`, data);
- fetchCampos();
+ await update(id, data);
```

```diff
- await api.delete(`/campos/${id}`);
- fetchCampos();
+ await remove(id);
```

---

## 🎯 Entidades disponibles:

```typescript
EntityType.CAMPO        // Campos
EntityType.LOTE         // Lotes
EntityType.MAQUINARIA   // Maquinarias
EntityType.SERVICIO     // Servicios
EntityType.CONTRATISTA  // Contratistas
EntityType.STOCK        // Stock
EntityType.COMPRA       // Compras
EntityType.GASTO        // Gastos
EntityType.CUENTA       // Cuentas
EntityType.RENDIMIENTO  // Rendimientos
EntityType.CLIENTE      // Clientes
EntityType.VENTA        // Ventas
EntityType.PRODUCTO     // Productos
EntityType.USUARIO      // Usuarios
```

---

## 💡 Ventajas del hook `useOfflineData`:

✅ **Automático**: Carga datos al montar el componente
✅ **Offline**: Funciona sin internet usando caché
✅ **Sincronización**: Recarga automáticamente al sincronizar
✅ **Optimista**: Actualiza UI inmediatamente
✅ **Simple**: Menos código, más limpio
✅ **Error handling**: Maneja errores automáticamente

---

## 🔄 Sincronización automática:

Cuando haces `create`, `update` o `remove`:

1. **Online**: Se envía al servidor inmediatamente
2. **Offline**: Se guarda en IndexedDB y se agrega a la cola
3. **UI**: Se actualiza inmediatamente (optimista)
4. **Sincronización**: Al volver internet, se envía al servidor
5. **Actualización**: Después de sincronizar, recarga datos frescos

---

## 📝 Ejemplo completo de migración:

**Archivo a modificar**: `client/src/pages/Campos.tsx`

Reemplaza las primeras líneas del componente con:

```typescript
import { useState } from 'react';
import { useOfflineData } from '../hooks/useOfflineData';
import { EntityType } from '../services/offlineApi';
import { Campo } from '../types';
import { Plus, MapPin, Trash2, Edit, Layers } from 'lucide-react';

export default function Campos() {
  const {
    data: campos,
    loading,
    error,
    create,
    update,
    remove,
  } = useOfflineData<Campo>({
    endpoint: '/campos',
    entityType: EntityType.CAMPO,
  });

  const [showForm, setShowForm] = useState(false);
  // ... resto de tus estados locales

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCampo) {
        await update(editingCampo, {
          ...formData,
          hectareas: parseFloat(formData.hectareas),
        });
      } else {
        await create({
          ...formData,
          hectareas: parseFloat(formData.hectareas),
        });
      }
      setShowForm(false);
      setEditingCampo(null);
      setFormData({ nombre: '', ubicacion: '', hectareas: '', descripcion: '' });
    } catch (error: any) {
      alert(error.message || 'Error al guardar campo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este campo?')) return;
    try {
      await remove(id);
    } catch (error: any) {
      alert(error.message || 'Error al eliminar campo');
    }
  };

  // ... resto del componente igual
}
```

---

## ⚡ ¿Necesitas ayuda?

Si tienes dudas sobre cómo migrar un componente específico, avísame y te ayudo con ese componente en particular.

Componentes que necesitan migración:
- ✅ Campos
- ⬜ Maquinarias
- ⬜ Servicios
- ⬜ Contratistas
- ⬜ Stock
- ⬜ Compras
- ⬜ Gastos
- ⬜ Cuentas
- ⬜ Rendimientos
