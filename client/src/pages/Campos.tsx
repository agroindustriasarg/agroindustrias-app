import { useState } from 'react';
import { useOfflineData } from '../hooks/useOfflineData';
import { EntityType } from '../services/offlineApi';
import api from '../services/apiWithCache';
import { Campo } from '../types';
import { Plus, MapPin, Trash2, Edit, Layers } from 'lucide-react';

export default function Campos() {
  const {
    data: campos,
    loading,
    create,
    update,
    remove,
    refetch,
  } = useOfflineData<Campo>({
    endpoint: '/campos',
    entityType: EntityType.CAMPO,
  });
  const [showForm, setShowForm] = useState(false);
  const [showLotesModal, setShowLotesModal] = useState<string | null>(null);
  const [showLoteForm, setShowLoteForm] = useState(false);
  const [editingCampo, setEditingCampo] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    ubicacion: '',
    hectareas: '',
    descripcion: '',
  });
  const [loteFormData, setLoteFormData] = useState({
    nombre: '',
    superficie: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const campoData = {
        ...formData,
        hectareas: parseFloat(formData.hectareas),
      };

      if (editingCampo) {
        await update(editingCampo, campoData);
      } else {
        await create(campoData);
      }
      setShowForm(false);
      setEditingCampo(null);
      setFormData({ nombre: '', ubicacion: '', hectareas: '', descripcion: '' });
    } catch (error: any) {
      alert(error.message || 'Error al guardar campo');
    }
  };

  const handleEdit = (campo: Campo) => {
    setFormData({
      nombre: campo.nombre,
      ubicacion: campo.ubicacion,
      hectareas: campo.hectareas.toString(),
      descripcion: campo.descripcion || '',
    });
    setEditingCampo(campo.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este campo?')) return;
    try {
      await remove(id);
    } catch (error: any) {
      alert(error.message || 'Error al eliminar campo');
    }
  };

  const handleAddLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLotesModal) return;

    try {
      await api.post(`/campos/${showLotesModal}/lotes`, {
        nombre: loteFormData.nombre,
        hectareas: parseFloat(loteFormData.superficie),
      });
      setShowLoteForm(false);
      setLoteFormData({ nombre: '', superficie: '' });
      refetch();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al crear lote');
    }
  };

  const handleDeleteLote = async (loteId: string) => {
    if (!confirm('¿Estás seguro de eliminar este lote?')) return;
    try {
      await api.delete(`/campos/lotes/${loteId}`);
      refetch();
    } catch (error) {
      alert('Error al eliminar lote');
    }
  };

  const getCurrentCampo = () => {
    return campos.find(c => c.id === showLotesModal);
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campos</h1>
          <p className="text-gray-600 mt-2">Gestiona tus campos y lotes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Campo</span>
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingCampo ? 'Editar Campo' : 'Nuevo Campo'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ubicación *
                </label>
                <input
                  type="text"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hectáreas *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hectareas}
                  onChange={(e) => setFormData({ ...formData, hectareas: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn-primary">
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCampo(null);
                  setFormData({ nombre: '', ubicacion: '', hectareas: '', descripcion: '' });
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campos.map((campo) => (
          <div key={campo.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{campo.nombre}</h3>
                  <p className="text-sm text-gray-600">{campo.ubicacion}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(campo)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(campo.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Hectáreas:</span>
                <span className="font-medium">{campo.hectareas} ha</span>
              </div>
              {campo.lotes && campo.lotes.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Lotes:</span>
                  <span className="font-medium">{campo.lotes.length}</span>
                </div>
              )}
              {campo.descripcion && (
                <p className="text-sm text-gray-600 mt-2">{campo.descripcion}</p>
              )}
            </div>

            <button
              onClick={() => setShowLotesModal(campo.id)}
              className="btn-secondary w-full mt-4 flex items-center justify-center space-x-2"
            >
              <Layers className="w-4 h-4" />
              <span>Gestionar Lotes</span>
            </button>
          </div>
        ))}
      </div>

      {campos.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No hay campos registrados. Crea uno para comenzar.
        </div>
      )}

      {showLotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-semibold">Lotes de {getCurrentCampo()?.nombre}</h2>
                  <p className="text-gray-600 text-sm mt-1">{getCurrentCampo()?.ubicacion}</p>
                </div>
                <button
                  onClick={() => {
                    setShowLotesModal(null);
                    setShowLoteForm(false);
                    setLoteFormData({ nombre: '', superficie: '' });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!showLoteForm && (
                <button
                  onClick={() => setShowLoteForm(true)}
                  className="btn-primary flex items-center space-x-2 mb-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Lote</span>
                </button>
              )}

              {showLoteForm && (
                <div className="card mb-4 bg-gray-50">
                  <h3 className="font-semibold mb-3">Nuevo Lote</h3>
                  <form onSubmit={handleAddLote} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre del Lote *
                        </label>
                        <input
                          type="text"
                          value={loteFormData.nombre}
                          onChange={(e) => setLoteFormData({ ...loteFormData, nombre: e.target.value })}
                          className="input"
                          required
                          placeholder="Ej: Lote A, Lote 1, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Superficie (ha) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={loteFormData.superficie}
                          onChange={(e) => setLoteFormData({ ...loteFormData, superficie: e.target.value })}
                          className="input"
                          required
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button type="submit" className="btn-primary">
                        Guardar Lote
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLoteForm(false);
                          setLoteFormData({ nombre: '', superficie: '' });
                        }}
                        className="btn-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-3">
                {(getCurrentCampo()?.lotes?.length ?? 0) > 0 ? (
                  (getCurrentCampo()?.lotes || []).map((lote: any) => (
                    <div key={lote.id} className="card bg-white border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="bg-green-50 p-2 rounded-lg">
                            <Layers className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{lote.nombre}</h4>
                            <p className="text-sm text-gray-600">{lote.hectareas} ha</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteLote(lote.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay lotes registrados. Agrega uno para comenzar.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
