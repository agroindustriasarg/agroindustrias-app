import { useState, useEffect } from 'react';
import api from '../services/api';
import { Campo } from '../types';
import { Plus, MapPin, Trash2, Edit, Layers, Wheat } from 'lucide-react';

export default function Campos() {
  const [campos, setCampos] = useState<Campo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showLotesModal, setShowLotesModal] = useState<string | null>(null);
  const [showLoteForm, setShowLoteForm] = useState(false);
  const [editingCampo, setEditingCampo] = useState<string | null>(null);
  const [editingLote, setEditingLote] = useState<string | null>(null);
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

  const [campanas, setCampanas] = useState<any[]>([]);
  const [showCampanaForm, setShowCampanaForm] = useState(false);
  const [campanaFormData, setCampanaFormData] = useState({ cultivo: '', anio: '' });

  useEffect(() => {
    fetchCampos();
    fetchCampanas();
  }, []);

  const fetchCampanas = async () => {
    try {
      const res = await api.get('/campanas');
      setCampanas(res.data);
    } catch (error) {
      console.error('Error al cargar campañas:', error);
    }
  };

  const handleAddCampana = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/campanas', campanaFormData);
      setCampanaFormData({ cultivo: '', anio: '' });
      setShowCampanaForm(false);
      fetchCampanas();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al crear campaña');
    }
  };

  const handleDeleteCampana = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña?')) return;
    try {
      await api.delete(`/campanas/${id}`);
      fetchCampanas();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al eliminar campaña');
    }
  };

  const fetchCampos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/campos');
      setCampos(response.data);
    } catch (error) {
      console.error('Error al cargar campos:', error);
      alert('Error al cargar campos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const campoData = {
        ...formData,
        hectareas: parseFloat(formData.hectareas),
      };

      if (editingCampo) {
        await api.put(`/campos/${editingCampo}`, campoData);
      } else {
        await api.post('/campos', campoData);
      }
      setShowForm(false);
      setEditingCampo(null);
      setFormData({ nombre: '', ubicacion: '', hectareas: '', descripcion: '' });
      fetchCampos();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al guardar campo');
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
      await api.delete(`/campos/${id}`);
      fetchCampos();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al eliminar campo');
    }
  };

  const handleAddLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLotesModal) return;

    try {
      if (editingLote) {
        await api.put(`/campos/lotes/${editingLote}`, {
          nombre: loteFormData.nombre,
          hectareas: parseFloat(loteFormData.superficie),
        });
      } else {
        await api.post(`/campos/${showLotesModal}/lotes`, {
          nombre: loteFormData.nombre,
          hectareas: parseFloat(loteFormData.superficie),
        });
      }
      setShowLoteForm(false);
      setEditingLote(null);
      setLoteFormData({ nombre: '', superficie: '' });
      fetchCampos();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al guardar lote');
    }
  };

  const handleEditLote = (lote: any) => {
    setLoteFormData({
      nombre: lote.nombre,
      superficie: lote.hectareas.toString(),
    });
    setEditingLote(lote.id);
    setShowLoteForm(true);
  };

  const handleDeleteLote = async (loteId: string) => {
    if (!confirm('¿Estás seguro de eliminar este lote?')) return;
    try {
      await api.delete(`/campos/lotes/${loteId}`);
      fetchCampos();
    } catch (error) {
      alert('Error al eliminar lote');
    }
  };

  const getCurrentCampo = () => {
    return campos.find(c => c.id === showLotesModal);
  };

  const calcularHectareasTotales = (campo: Campo) => {
    if (!campo.lotes || campo.lotes.length === 0) {
      return campo.hectareas;
    }
    const total = campo.lotes.reduce((sum, lote: any) => {
      console.log('Lote:', lote.nombre, 'Hectareas:', lote.hectareas);
      return sum + (Number(lote.hectareas) || 0);
    }, 0);
    console.log('Total calculado para', campo.nombre, ':', total);
    return total;
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
                <span className="font-medium">{calcularHectareasTotales(campo).toFixed(2)} ha</span>
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

      {/* ===== SECCIÓN CAMPAÑAS ===== */}
      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Wheat className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Campañas</h2>
              <p className="text-gray-600 text-sm">Campañas agrícolas por cultivo y año</p>
            </div>
          </div>
          <button
            onClick={() => setShowCampanaForm(!showCampanaForm)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Campaña</span>
          </button>
        </div>

        {showCampanaForm && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">Nueva Campaña</h3>
            <form onSubmit={handleAddCampana} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cultivo *
                  </label>
                  <input
                    type="text"
                    list="cultivos-sugeridos"
                    value={campanaFormData.cultivo}
                    onChange={(e) => setCampanaFormData({ ...campanaFormData, cultivo: e.target.value })}
                    className="input"
                    required
                    placeholder="Ej: Soja, Maíz, Poroto"
                  />
                  <datalist id="cultivos-sugeridos">
                    {[...new Set(campanas.map(c => c.cultivo))].map(cultivo => (
                      <option key={cultivo} value={cultivo} />
                    ))}
                    {['Soja', 'Maíz', 'Poroto', 'Trigo', 'Sorgo'].map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año *
                  </label>
                  <input
                    type="text"
                    list="anios-sugeridos"
                    value={campanaFormData.anio}
                    onChange={(e) => setCampanaFormData({ ...campanaFormData, anio: e.target.value })}
                    className="input"
                    required
                    placeholder="Ej: 25 o 25/26"
                  />
                  <datalist id="anios-sugeridos">
                    {[...new Set(campanas.map(c => c.anio))].map(anio => (
                      <option key={anio} value={anio} />
                    ))}
                    {['24', '24/25', '25', '25/26', '26', '26/27'].map(a => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                  {campanaFormData.cultivo && campanaFormData.anio && (
                    <p className="text-xs text-gray-500 mt-1">
                      Se creará: <span className="font-medium text-gray-700">{campanaFormData.cultivo} {campanaFormData.anio}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn-primary">
                  Crear Campaña
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCampanaForm(false);
                    setCampanaFormData({ cultivo: '', anio: '' });
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
          {campanas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay campañas registradas. Crea una para comenzar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Campaña</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Cultivo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Año</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {campanas.map((campana) => (
                    <tr key={campana.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{campana.nombre}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{campana.cultivo}</td>
                      <td className="py-3 px-4 text-gray-600">{campana.anio}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteCampana(campana.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
                    setEditingLote(null);
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
                  <h3 className="font-semibold mb-3">{editingLote ? 'Editar Lote' : 'Nuevo Lote'}</h3>
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
                          setEditingLote(null);
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
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditLote(lote)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLote(lote.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
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
