import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/apiWithCache';
import { Cuenta } from '../types';
import { Plus, Wallet, Trash2, Edit, DollarSign } from 'lucide-react';

export default function Cuentas() {
  const navigate = useNavigate();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'EMPRESA' as 'EMPRESA' | 'PERSONAL' | 'TERCEROS',
    titular: '',
    descripcion: '',
  });

  useEffect(() => {
    fetchCuentas();
  }, []);

  const fetchCuentas = async () => {
    try {
      const response = await api.get('/cuentas');
      setCuentas(response.data);
    } catch (error) {
      console.error('Error al cargar cuentas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cuenta: Cuenta) => {
    setFormData({
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      titular: cuenta.titular || '',
      descripcion: cuenta.descripcion || '',
    });
    setEditingCuenta(cuenta.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCuenta) {
        await api.put(`/cuentas/${editingCuenta}`, formData);
      } else {
        await api.post('/cuentas', formData);
      }
      setShowForm(false);
      setEditingCuenta(null);
      setFormData({
        nombre: '',
        tipo: 'EMPRESA',
        titular: '',
        descripcion: '',
      });
      fetchCuentas();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al guardar cuenta');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar/desactivar esta cuenta?')) return;
    try {
      await api.delete(`/cuentas/${id}`);
      fetchCuentas();
    } catch (error) {
      alert('Error al eliminar cuenta');
    }
  };

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      EMPRESA: 'bg-blue-100 text-blue-800',
      PERSONAL: 'bg-purple-100 text-purple-800',
      TERCEROS: 'bg-orange-100 text-orange-800',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cuentas</h1>
          <p className="text-gray-600 mt-2">Gestiona las cuentas de gastos</p>
        </div>
        <button
          onClick={() => {
            setEditingCuenta(null);
            setFormData({
              nombre: '',
              tipo: 'EMPRESA',
              titular: '',
              descripcion: '',
            });
            setShowForm(!showForm);
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Cuenta</span>
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingCuenta ? 'Editar Cuenta' : 'Nueva Cuenta'}
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
                  placeholder="Ej: Cuenta Principal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'EMPRESA' | 'PERSONAL' | 'TERCEROS' })}
                  className="input"
                  required
                >
                  <option value="EMPRESA">Empresa</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="TERCEROS">Terceros</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titular
                </label>
                <input
                  type="text"
                  value={formData.titular}
                  onChange={(e) => setFormData({ ...formData, titular: e.target.value })}
                  className="input"
                  placeholder="Nombre del titular (opcional)"
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
                  placeholder="Descripción (opcional)"
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
                  setEditingCuenta(null);
                  setFormData({
                    nombre: '',
                    tipo: 'EMPRESA',
                    titular: '',
                    descripcion: '',
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cuentas.map((cuenta) => (
          <div
            key={cuenta.id}
            className="card cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/cuentas/${cuenta.id}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`${cuenta.tipo === 'EMPRESA' ? 'bg-blue-100' : cuenta.tipo === 'PERSONAL' ? 'bg-purple-100' : 'bg-orange-100'} p-2 rounded-lg`}>
                  <Wallet className={`w-5 h-5 ${cuenta.tipo === 'EMPRESA' ? 'text-blue-600' : cuenta.tipo === 'PERSONAL' ? 'text-purple-600' : 'text-orange-600'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg break-words">
                    {cuenta.nombre}
                  </h3>
                </div>
              </div>
              <div className="flex space-x-2 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(cuenta);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(cuenta.id);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tipo:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(cuenta.tipo)}`}>
                  {cuenta.tipo}
                </span>
              </div>

              {cuenta.titular && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Titular:</span>
                  <span className="font-medium">{cuenta.titular}</span>
                </div>
              )}

              {cuenta._count && cuenta._count.gastos > 0 && (
                <div className="flex justify-between text-sm mt-3 pt-3 border-t">
                  <span className="text-gray-600 flex items-center">
                    <DollarSign className="w-3 h-3 mr-1" />
                    Gastos:
                  </span>
                  <span className="font-medium text-green-600">{cuenta._count.gastos}</span>
                </div>
              )}

              {cuenta.descripcion && (
                <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
                  {cuenta.descripcion}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {cuentas.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No hay cuentas registradas. Crea una para comenzar.
        </div>
      )}
    </div>
  );
}
