import { useState, useEffect } from 'react';
import api from '../services/apiWithCache';
import { Plus, Edit, Trash2, Calendar, BarChart3 } from 'lucide-react';

interface Rendimiento {
  id: string;
  campoId: string;
  loteId?: string;
  cultivo: string;
  fechaCosecha: string;
  cantidad: number;
  unidad: string;
  superficie: number;
  unidadSuperficie: string;
  rendimientoHa?: number;
  observaciones?: string;
  createdAt: string;
}

interface Campo {
  id: string;
  nombre: string;
  hectareas: number;
  lotes: Lote[];
}

interface Lote {
  id: string;
  nombre: string;
  hectareas: number;
  cultivo?: string;
}

export default function Rendimientos() {
  const [rendimientos, setRendimientos] = useState<Rendimiento[]>([]);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [selectedCampo, setSelectedCampo] = useState<Campo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    campoId: '',
    loteId: '',
    cultivo: '',
    fechaCosecha: new Date().toISOString().split('T')[0],
    cantidad: '',
    unidad: 'tn',
    superficie: '',
    unidadSuperficie: 'ha',
    observaciones: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rendimientosRes, camposRes] = await Promise.all([
        api.get('/rendimientos'),
        api.get('/campos'),
      ]);
      setRendimientos(rendimientosRes.data);
      setCampos(camposRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCampoChange = (campoId: string) => {
    setFormData({ ...formData, campoId, loteId: '' });
    const campo = campos.find(c => c.id === campoId);
    setSelectedCampo(campo || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        cantidad: parseFloat(formData.cantidad),
        superficie: parseFloat(formData.superficie),
        fechaCosecha: new Date(formData.fechaCosecha).toISOString(),
        loteId: formData.loteId || undefined,
        observaciones: formData.observaciones || undefined,
      };

      if (editingId) {
        await api.put(`/rendimientos/${editingId}`, data);
      } else {
        await api.post('/rendimientos', data);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        campoId: '',
        loteId: '',
        cultivo: '',
        fechaCosecha: new Date().toISOString().split('T')[0],
        cantidad: '',
        unidad: 'tn',
        superficie: '',
        unidadSuperficie: 'ha',
        observaciones: '',
      });
      setSelectedCampo(null);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || `Error al ${editingId ? 'actualizar' : 'crear'} rendimiento`);
    }
  };

  const handleEdit = (rendimiento: Rendimiento) => {
    setEditingId(rendimiento.id);
    setFormData({
      campoId: rendimiento.campoId,
      loteId: rendimiento.loteId || '',
      cultivo: rendimiento.cultivo,
      fechaCosecha: new Date(rendimiento.fechaCosecha).toISOString().split('T')[0],
      cantidad: rendimiento.cantidad.toString(),
      unidad: rendimiento.unidad,
      superficie: rendimiento.superficie.toString(),
      unidadSuperficie: rendimiento.unidadSuperficie,
      observaciones: rendimiento.observaciones || '',
    });
    const campo = campos.find(c => c.id === rendimiento.campoId);
    setSelectedCampo(campo || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este rendimiento?')) return;
    try {
      await api.delete(`/rendimientos/${id}`);
      fetchData();
    } catch (error) {
      alert('Error al eliminar rendimiento');
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getCampoNombre = (campoId: string) => {
    return campos.find(c => c.id === campoId)?.nombre || 'N/A';
  };

  const getLoteNombre = (campoId: string, loteId?: string) => {
    if (!loteId) return '-';
    const campo = campos.find(c => c.id === campoId);
    return campo?.lotes.find(l => l.id === loteId)?.nombre || '-';
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rendimientos</h1>
          <p className="text-gray-600 mt-1">Registro de cosechas por campo y lote</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Rendimiento</span>
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Editar Rendimiento' : 'Nuevo Rendimiento'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campo *
                </label>
                <select
                  value={formData.campoId}
                  onChange={(e) => handleCampoChange(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Seleccionar campo...</option>
                  {campos.map((campo) => (
                    <option key={campo.id} value={campo.id}>
                      {campo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lote (opcional)
                </label>
                <select
                  value={formData.loteId}
                  onChange={(e) => setFormData({ ...formData, loteId: e.target.value })}
                  className="input"
                  disabled={!selectedCampo}
                >
                  <option value="">Sin lote específico</option>
                  {selectedCampo?.lotes.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cultivo *
                </label>
                <input
                  type="text"
                  value={formData.cultivo}
                  onChange={(e) => setFormData({ ...formData, cultivo: e.target.value })}
                  className="input"
                  required
                  placeholder="Ej: Soja, Maíz, Trigo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Cosecha *
                </label>
                <input
                  type="date"
                  value={formData.fechaCosecha}
                  onChange={(e) => setFormData({ ...formData, fechaCosecha: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad Cosechada *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    className="input flex-1"
                    required
                    placeholder="0.00"
                  />
                  <select
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                    className="input w-24"
                  >
                    <option value="kg">kg</option>
                    <option value="tn">tn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Superficie Cosechada *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.superficie}
                    onChange={(e) => setFormData({ ...formData, superficie: e.target.value })}
                    className="input flex-1"
                    required
                    placeholder="0.00"
                  />
                  <select
                    value={formData.unidadSuperficie}
                    onChange={(e) => setFormData({ ...formData, unidadSuperficie: e.target.value })}
                    className="input w-28"
                  >
                    <option value="ha">ha</option>
                    <option value="surco">surco</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Información adicional sobre la cosecha..."
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button type="submit" className="btn-primary">
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    campoId: '',
                    loteId: '',
                    cultivo: '',
                    fechaCosecha: new Date().toISOString().split('T')[0],
                    cantidad: '',
                    unidad: 'tn',
                    superficie: '',
                    unidadSuperficie: 'ha',
                    observaciones: '',
                  });
                  setSelectedCampo(null);
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Historial de Cosechas</h2>

        {rendimientos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay rendimientos registrados. Crea uno para comenzar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lote
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cultivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Superficie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rendimiento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rendimientos.map((rendimiento) => (
                  <tr key={rendimiento.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatFecha(rendimiento.fechaCosecha)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {getCampoNombre(rendimiento.campoId)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getLoteNombre(rendimiento.campoId, rendimiento.loteId)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {rendimiento.cultivo}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-yellow-600">
                      {rendimiento.cantidad.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {rendimiento.unidad}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {rendimiento.superficie.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {rendimiento.unidadSuperficie}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {rendimiento.rendimientoHa ? (
                        <div className="flex items-center space-x-1">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-blue-600">
                            {rendimiento.rendimientoHa.toLocaleString('es-AR', { minimumFractionDigits: 2 })} tn/ha
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(rendimiento)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rendimiento.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
