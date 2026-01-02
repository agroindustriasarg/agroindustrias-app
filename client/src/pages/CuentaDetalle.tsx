import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/apiWithCache';
import { ArrowLeft, Calendar, FileText, DollarSign, CreditCard, Trash2 } from 'lucide-react';

interface Cuenta {
  id: string;
  nombre: string;
  tipo: string;
  titular?: string;
  descripcion?: string;
}

interface Gasto {
  id: string;
  concepto: string;
  monto: number;
  fecha: string;
  categoria?: string;
  observaciones?: string;
  createdAt: string;
}

export default function CuentaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [pagoFormData, setPagoFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    monto: '',
    formaPago: '',
    observaciones: '',
  });

  useEffect(() => {
    fetchCuentaDetalle();
    fetchGastos();
  }, [id]);

  const fetchCuentaDetalle = async () => {
    try {
      const response = await api.get(`/cuentas/${id}`);
      setCuenta(response.data);
    } catch (error) {
      console.error('Error al cargar cuenta:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGastos = async () => {
    try {
      const response = await api.get(`/cuentas/${id}/gastos`);
      setGastos(response.data);
    } catch (error) {
      console.error('Error al cargar gastos:', error);
    }
  };

  const getTotalGastos = () => {
    return gastos.reduce((total, gasto) => total + gasto.monto, 0);
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handlePagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/cuentas/${id}/pagos`, {
        ...pagoFormData,
        monto: parseFloat(pagoFormData.monto),
        fecha: new Date(pagoFormData.fecha).toISOString(),
      });
      setShowPagoForm(false);
      setPagoFormData({
        fecha: new Date().toISOString().split('T')[0],
        monto: '',
        formaPago: '',
        observaciones: '',
      });
      fetchGastos(); // Recargar gastos para actualizar el total
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al registrar pago');
    }
  };

  const handleDelete = async (gastoId: string) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
    try {
      await api.delete(`/gastos/${gastoId}`);
      fetchGastos();
    } catch (error) {
      alert('Error al eliminar gasto');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  if (!cuenta) {
    return <div className="text-center py-12">No se encontró la cuenta</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/cuentas')}
          className="btn-secondary flex items-center space-x-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Cuentas</span>
        </button>

        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{cuenta.nombre}</h1>
          <p className="text-gray-600 mb-4">{cuenta.tipo}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total de Gastos</p>
              <p className="text-xl font-bold">{gastos.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Suma Total</p>
              <p className="text-xl font-bold text-red-600">${getTotalGastos().toFixed(2)}</p>
            </div>
            {cuenta.titular && (
              <div>
                <p className="text-sm text-gray-600">Titular</p>
                <p className="text-lg font-semibold">{cuenta.titular}</p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={() => setShowPagoForm(!showPagoForm)}
              className="btn-primary flex items-center space-x-2"
            >
              <CreditCard className="w-5 h-5" />
              <span>Pagar Cuenta</span>
            </button>
          </div>
        </div>
      </div>

      {showPagoForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Registrar Pago</h2>
          <form onSubmit={handlePagoSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={pagoFormData.fecha}
                  onChange={(e) => setPagoFormData({ ...pagoFormData, fecha: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pagoFormData.monto}
                  onChange={(e) => setPagoFormData({ ...pagoFormData, monto: e.target.value })}
                  className="input"
                  required
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forma de Pago *
                </label>
                <select
                  value={pagoFormData.formaPago}
                  onChange={(e) => setPagoFormData({ ...pagoFormData, formaPago: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                  <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={pagoFormData.observaciones}
                  onChange={(e) => setPagoFormData({ ...pagoFormData, observaciones: e.target.value })}
                  className="input"
                  rows={1}
                  placeholder="Observaciones adicionales (opcional)"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn-primary">
                Registrar Pago
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPagoForm(false);
                  setPagoFormData({
                    fecha: new Date().toISOString().split('T')[0],
                    monto: '',
                    formaPago: '',
                    observaciones: '',
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

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Historial de Gastos</h2>

        {gastos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay gastos registrados para esta cuenta
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
                    Concepto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Observaciones
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gastos.map((gasto) => (
                  <tr key={gasto.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatFecha(gasto.fecha)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {gasto.concepto}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {gasto.categoria && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {gasto.categoria}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-red-600">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4" />
                        <span>${gasto.monto.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {gasto.observaciones && (
                        <div className="flex items-start space-x-2">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div className="text-xs text-gray-500">{gasto.observaciones}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDelete(gasto.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold">
                    TOTAL:
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-red-600">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4" />
                      <span>${getTotalGastos().toFixed(2)}</span>
                    </div>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
