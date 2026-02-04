import { useState, useEffect } from 'react';
import { BookCheck, Plus, Search, X, Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Cheque {
  id: string;
  numeroCheque: string;
  fechaEmision: string;
  fechaVencimiento: string;
  monto: number;
  moneda: string;
  banco: string;
  beneficiario: string;
  cruzado: boolean;
  estado: string;
  observaciones?: string;
}

export default function Chequera() {
  const navigate = useNavigate();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [filteredCheques, setFilteredCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
  const [vistaActiva, setVistaActiva] = useState<'PENDIENTE' | 'PAGADO'>('PENDIENTE');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    numeroCheque: '',
    fechaEmision: '',
    fechaVencimiento: '',
    monto: '',
    moneda: 'ARS',
    banco: '',
    beneficiario: '',
    cruzado: false,
    observaciones: ''
  });

  useEffect(() => {
    cargarCheques();
  }, []);

  useEffect(() => {
    filtrarCheques();
  }, [cheques, vistaActiva, searchTerm]);

  const cargarCheques = async () => {
    try {
      const response = await api.get('/cheques');
      setCheques(response.data);
    } catch (error) {
      console.error('Error al cargar cheques:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtrarCheques = () => {
    let filtered = cheques.filter(cheque => cheque.estado === vistaActiva);

    if (searchTerm) {
      filtered = filtered.filter(cheque =>
        cheque.numeroCheque.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cheque.beneficiario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cheque.banco.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCheques(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        monto: parseFloat(formData.monto)
      };

      if (editingCheque) {
        await api.put(`/cheques/${editingCheque.id}`, data);
      } else {
        await api.post('/cheques', data);
      }

      await cargarCheques();
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Error al guardar cheque:', error);
    }
  };

  const handleEdit = (cheque: Cheque) => {
    setEditingCheque(cheque);
    setFormData({
      numeroCheque: cheque.numeroCheque,
      fechaEmision: cheque.fechaEmision.split('T')[0],
      fechaVencimiento: cheque.fechaVencimiento.split('T')[0],
      monto: cheque.monto.toString(),
      moneda: cheque.moneda,
      banco: cheque.banco,
      beneficiario: cheque.beneficiario,
      cruzado: cheque.cruzado,
      observaciones: cheque.observaciones || ''
    });
    setShowForm(true);
  };

  const handleMarcarPagado = async (id: string) => {
    try {
      await api.patch(`/cheques/${id}/pagar`, {});
      await cargarCheques();
    } catch (error) {
      console.error('Error al marcar cheque como pagado:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este cheque?')) return;

    try {
      await api.delete(`/cheques/${id}`);
      await cargarCheques();
    } catch (error) {
      console.error('Error al eliminar cheque:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      numeroCheque: '',
      fechaEmision: '',
      fechaVencimiento: '',
      monto: '',
      moneda: 'ARS',
      banco: '',
      beneficiario: '',
      cruzado: false,
      observaciones: ''
    });
    setEditingCheque(null);
  };

  const getAlertaColor = (fechaVencimiento: string) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);

    const diffTime = vencimiento.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'bg-gray-100'; // Vencido
    if (diffDays === 0) return 'bg-red-100'; // Vence hoy
    if (diffDays <= 2) return 'bg-orange-100'; // Vence en 2 días o menos
    return 'bg-white';
  };

  const getAlertaBadge = (fechaVencimiento: string) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);

    const diffTime = vencimiento.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return <span className="badge bg-gray-500 text-white">Vencido</span>;
    if (diffDays === 0) return <span className="badge bg-red-500 text-white">Vence Hoy</span>;
    if (diffDays === 1) return <span className="badge bg-orange-500 text-white">Vence Mañana</span>;
    if (diffDays === 2) return <span className="badge bg-orange-500 text-white">Vence en 2 días</span>;
    return null;
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    return currency === 'USD' ? `USD ${formatted}` : `$ ${formatted}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <BookCheck className="w-8 h-8" />
            <span>Chequera</span>
          </h1>
          <p className="text-gray-600 mt-1">Gestión y control de cheques</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/contabilidad')}
            className="btn-secondary flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Contabilidad</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Cheque</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setVistaActiva('PENDIENTE')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            vistaActiva === 'PENDIENTE'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Cheques Pendientes
        </button>
        <button
          onClick={() => setVistaActiva('PAGADO')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            vistaActiva === 'PAGADO'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Cheques Pagados
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por número, beneficiario o banco..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Modal Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {editingCheque ? 'Editar Cheque' : 'Nuevo Cheque'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Número de Cheque</label>
                    <input
                      type="text"
                      value={formData.numeroCheque}
                      onChange={(e) => setFormData({ ...formData, numeroCheque: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Banco</label>
                    <input
                      type="text"
                      value={formData.banco}
                      onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Beneficiario</label>
                    <input
                      type="text"
                      value={formData.beneficiario}
                      onChange={(e) => setFormData({ ...formData, beneficiario: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Monto</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monto}
                      onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Moneda</label>
                    <select
                      value={formData.moneda}
                      onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                      className="input"
                    >
                      <option value="ARS">ARS (Pesos)</option>
                      <option value="USD">USD (Dólares)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Fecha de Emisión</label>
                    <input
                      type="date"
                      value={formData.fechaEmision}
                      onChange={(e) => setFormData({ ...formData, fechaEmision: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      value={formData.fechaVencimiento}
                      onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.cruzado}
                        onChange={(e) => setFormData({ ...formData, cruzado: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Cheque Cruzado</span>
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Observaciones</label>
                    <textarea
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      className="input"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingCheque ? 'Actualizar' : 'Crear'} Cheque
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Cheques */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Cargando cheques...</p>
        </div>
      ) : filteredCheques.length === 0 ? (
        <div className="text-center py-12">
          <BookCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm
              ? 'No se encontraron cheques con ese criterio de búsqueda'
              : vistaActiva === 'PENDIENTE'
              ? 'No hay cheques pendientes'
              : 'No hay cheques pagados'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCheques.map((cheque) => (
            <div
              key={cheque.id}
              className={`card ${vistaActiva === 'PENDIENTE' ? getAlertaColor(cheque.fechaVencimiento) : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Cheque N° {cheque.numeroCheque}
                    </h3>
                    {cheque.cruzado && (
                      <span className="badge bg-blue-100 text-blue-800">Cruzado</span>
                    )}
                    {vistaActiva === 'PENDIENTE' && getAlertaBadge(cheque.fechaVencimiento)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Banco</p>
                      <p className="font-medium">{cheque.banco}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Beneficiario</p>
                      <p className="font-medium">{cheque.beneficiario}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Monto</p>
                      <p className="font-medium text-lg">{formatCurrency(cheque.monto, cheque.moneda)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Fecha de Emisión</p>
                      <p className="font-medium">
                        {new Date(cheque.fechaEmision).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Fecha de Vencimiento</p>
                      <p className="font-medium">
                        {new Date(cheque.fechaVencimiento).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                    {cheque.observaciones && (
                      <div className="md:col-span-3">
                        <p className="text-gray-600">Observaciones</p>
                        <p className="font-medium">{cheque.observaciones}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  {vistaActiva === 'PENDIENTE' && (
                    <button
                      onClick={() => handleMarcarPagado(cheque.id)}
                      className="btn-success flex items-center space-x-1 text-sm"
                      title="Marcar como pagado"
                    >
                      <Check className="w-4 h-4" />
                      <span>Pagado</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(cheque)}
                    className="btn-secondary text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(cheque.id)}
                    className="btn-danger text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
