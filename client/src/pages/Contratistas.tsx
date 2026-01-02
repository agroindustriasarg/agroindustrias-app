import { useState } from 'react';
import { useOfflineData } from '../hooks/useOfflineData';
import { EntityType } from '../services/offlineApi';
import { Contratista } from '../types';
import { Plus, User, Trash2, Edit, Phone, Mail, Briefcase } from 'lucide-react';

export default function Contratistas() {
  const {
    data: contratistas,
    loading,
    create,
    update,
    remove,
  } = useOfflineData<Contratista>({
    endpoint: '/contratistas',
    entityType: EntityType.CONTRATISTA,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingContratista, setEditingContratista] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    empresa: '',
    telefono: '',
    email: '',
    especialidad: '',
  });

  const handleEdit = (contratista: Contratista) => {
    setFormData({
      nombre: contratista.nombre,
      apellido: contratista.apellido || '',
      empresa: contratista.empresa || '',
      telefono: contratista.telefono || '',
      email: contratista.email || '',
      especialidad: contratista.especialidad || '',
    });
    setEditingContratista(contratista.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContratista) {
        await update(editingContratista, formData);
      } else {
        await create(formData);
      }
      setShowForm(false);
      setEditingContratista(null);
      setFormData({
        nombre: '',
        apellido: '',
        empresa: '',
        telefono: '',
        email: '',
        especialidad: '',
      });
    } catch (error: any) {
      alert(error.message || 'Error al guardar contratista');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este contratista?')) return;
    try {
      await remove(id);
    } catch (error: any) {
      alert(error.message || 'Error al eliminar contratista');
    }
  };

  const getEspecialidadColor = (especialidad?: string) => {
    const colors: Record<string, string> = {
      Siembra: 'bg-green-100 text-green-800',
      Fumigación: 'bg-yellow-100 text-yellow-800',
      Cosecha: 'bg-orange-100 text-orange-800',
      Fertilización: 'bg-indigo-100 text-indigo-800',
      Riego: 'bg-cyan-100 text-cyan-800',
      Arado: 'bg-slate-100 text-slate-800',
    };
    return especialidad ? colors[especialidad] || 'bg-gray-100 text-gray-800' : '';
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contratistas</h1>
          <p className="text-gray-600 mt-2">Gestiona tus contratistas y prestadores de servicios</p>
        </div>
        <button
          onClick={() => {
            setEditingContratista(null);
            setFormData({
              nombre: '',
              apellido: '',
              empresa: '',
              telefono: '',
              email: '',
              especialidad: '',
            });
            setShowForm(!showForm);
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Contratista</span>
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingContratista ? 'Editar Contratista' : 'Nuevo Contratista'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  Apellido
                </label>
                <input
                  type="text"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa
                </label>
                <input
                  type="text"
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  className="input"
                  placeholder="Nombre de empresa (opcional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="input"
                  placeholder="+54 9 11 1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  placeholder="ejemplo@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especialidad
                </label>
                <select
                  value={formData.especialidad}
                  onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                  className="input"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Siembra">Siembra</option>
                  <option value="Fumigación">Fumigación</option>
                  <option value="Cosecha">Cosecha</option>
                  <option value="Fertilización">Fertilización</option>
                  <option value="Riego">Riego</option>
                  <option value="Arado">Arado</option>
                  <option value="Clasificación">Clasificación</option>
                  <option value="Trabajos manuales">Trabajos manuales</option>
                  <option value="Otro">Otro</option>
                </select>
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
                  setEditingContratista(null);
                  setFormData({
                    nombre: '',
                    apellido: '',
                    empresa: '',
                    telefono: '',
                    email: '',
                    especialidad: '',
                  });
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
        {contratistas.map((contratista) => (
          <div key={contratista.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {contratista.nombre} {contratista.apellido}
                  </h3>
                  {contratista.empresa && (
                    <p className="text-sm text-gray-600 flex items-center mt-1">
                      <Briefcase className="w-3 h-3 mr-1" />
                      {contratista.empresa}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(contratista)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(contratista.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {contratista.especialidad && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Especialidad:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEspecialidadColor(contratista.especialidad)}`}>
                    {contratista.especialidad}
                  </span>
                </div>
              )}

              {contratista.telefono && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    Teléfono:
                  </span>
                  <a href={`tel:${contratista.telefono}`} className="font-medium text-blue-600 hover:underline">
                    {contratista.telefono}
                  </a>
                </div>
              )}

              {contratista.email && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center">
                    <Mail className="w-3 h-3 mr-1" />
                    Email:
                  </span>
                  <a href={`mailto:${contratista.email}`} className="font-medium text-blue-600 hover:underline truncate max-w-[180px]">
                    {contratista.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {contratistas.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No hay contratistas registrados. Crea uno para comenzar.
        </div>
      )}
    </div>
  );
}
