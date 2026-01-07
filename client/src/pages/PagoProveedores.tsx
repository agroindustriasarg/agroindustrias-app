import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/apiWithCache';
import { CreditCard, ArrowLeft, DollarSign, Calendar, CheckCircle, FileText, Building2 } from 'lucide-react';

interface Factura {
  id: string;
  numeroFactura: string;
  fechaEmision: string;
  proveedor: string;
  tipoFactura: string;
  moneda: string;
  total: number;
  formaPago: string;
  fechaPago?: string;
  estado: string;
  observaciones?: string;
}

interface Cuenta {
  id: string;
  nombre: string;
  tipo: string;
  titular?: string;
  activo: boolean;
}

interface PagoFormData {
  facturaIds: string[];
  cuentaId: string;
  formaPago: string;
  fechaPago: string;
  observaciones: string;
}

export default function PagoProveedores() {
  const navigate = useNavigate();
  const [facturasPendientes, setFacturasPendientes] = useState<Factura[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState<Set<string>>(new Set());
  const [mostrarFormularioPago, setMostrarFormularioPago] = useState(false);

  // Datos del pago
  const [cuentaId, setCuentaId] = useState('');
  const [formaPago, setFormaPago] = useState('Transferencia');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [facturasRes, cuentasRes] = await Promise.all([
        api.get('/facturas'),
        api.get('/cuentas')
      ]);

      // Filtrar solo facturas pendientes
      const pendientes = facturasRes.data.filter((f: Factura) => f.estado === 'PENDIENTE');
      setFacturasPendientes(pendientes);

      // Filtrar solo cuentas activas
      const cuentasActivas = cuentasRes.data.filter((c: Cuenta) => c.activo);
      setCuentas(cuentasActivas);

      if (cuentasActivas.length > 0) {
        setCuentaId(cuentasActivas[0].id);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFactura = (facturaId: string) => {
    const newSelection = new Set(facturasSeleccionadas);
    if (newSelection.has(facturaId)) {
      newSelection.delete(facturaId);
    } else {
      newSelection.add(facturaId);
    }
    setFacturasSeleccionadas(newSelection);
  };

  const handleSeleccionarTodas = () => {
    if (facturasSeleccionadas.size === facturasPendientes.length) {
      setFacturasSeleccionadas(new Set());
    } else {
      setFacturasSeleccionadas(new Set(facturasPendientes.map(f => f.id)));
    }
  };

  const handleProcesarPago = () => {
    if (facturasSeleccionadas.size === 0) {
      alert('Debes seleccionar al menos una factura para pagar');
      return;
    }
    setMostrarFormularioPago(true);
  };

  const handleConfirmarPago = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cuentaId) {
      alert('Debes seleccionar una cuenta');
      return;
    }

    try {
      const facturaIds = Array.from(facturasSeleccionadas);

      // Actualizar cada factura a estado PAGADA
      await Promise.all(
        facturaIds.map(facturaId => {
          const factura = facturasPendientes.find(f => f.id === facturaId);
          if (!factura) return Promise.resolve();

          return api.put(`/facturas/${facturaId}`, {
            ...factura,
            estado: 'PAGADA'
          });
        })
      );

      // Registrar el pago
      await api.post('/pagos', {
        facturaIds,
        cuentaId,
        formaPago,
        fechaPago,
        observaciones
      });

      alert('Pago registrado correctamente');
      resetFormulario();
      fetchData();
    } catch (error) {
      alert('Error al procesar el pago');
      console.error('Error al procesar pago:', error);
    }
  };

  const resetFormulario = () => {
    setMostrarFormularioPago(false);
    setFacturasSeleccionadas(new Set());
    setFormaPago('Transferencia');
    setFechaPago(new Date().toISOString().split('T')[0]);
    setObservaciones('');
    if (cuentas.length > 0) {
      setCuentaId(cuentas[0].id);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const formatMoneda = (valor: number, moneda: string) => {
    return `${moneda} ${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calcularTotalSeleccionado = () => {
    return facturasPendientes
      .filter(f => facturasSeleccionadas.has(f.id))
      .reduce((total, f) => {
        // Agrupar por moneda
        return total + f.total;
      }, 0);
  };

  const agruparPorMoneda = () => {
    const agrupado: { [key: string]: number } = {};
    facturasPendientes
      .filter(f => facturasSeleccionadas.has(f.id))
      .forEach(f => {
        agrupado[f.moneda] = (agrupado[f.moneda] || 0) + f.total;
      });
    return agrupado;
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate('/contabilidad')}
            className="btn-secondary flex items-center space-x-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Contabilidad</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <CreditCard className="w-8 h-8" />
            <span>Pago a Proveedores</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Registro y seguimiento de pagos a proveedores
          </p>
        </div>
        {facturasSeleccionadas.size > 0 && (
          <button
            onClick={handleProcesarPago}
            className="btn-primary flex items-center space-x-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Procesar Pago ({facturasSeleccionadas.size})</span>
          </button>
        )}
      </div>

      {/* Resumen de selección */}
      {facturasSeleccionadas.size > 0 && (
        <div className="card mb-6 bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Facturas seleccionadas: {facturasSeleccionadas.size}
              </h3>
              <div className="space-y-1">
                {Object.entries(agruparPorMoneda()).map(([moneda, total]) => (
                  <p key={moneda} className="text-xl font-bold text-primary-700">
                    Total en {moneda}: {formatMoneda(total, moneda)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de Pago */}
      {mostrarFormularioPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Registrar Pago
              </h2>

              <form onSubmit={handleConfirmarPago}>
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Facturas a pagar:
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                    {facturasPendientes
                      .filter(f => facturasSeleccionadas.has(f.id))
                      .map(factura => (
                        <div key={factura.id} className="flex justify-between text-sm">
                          <span>{factura.numeroFactura} - {factura.proveedor}</span>
                          <span className="font-semibold">{formatMoneda(factura.total, factura.moneda)}</span>
                        </div>
                      ))}
                  </div>
                  <div className="mt-2 p-2 bg-primary-50 rounded">
                    {Object.entries(agruparPorMoneda()).map(([moneda, total]) => (
                      <p key={moneda} className="text-lg font-bold text-primary-700">
                        Total en {moneda}: {formatMoneda(total, moneda)}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">Cuenta de Pago *</label>
                    <select
                      value={cuentaId}
                      onChange={(e) => setCuentaId(e.target.value)}
                      className="input"
                      required
                    >
                      {cuentas.map(cuenta => (
                        <option key={cuenta.id} value={cuenta.id}>
                          {cuenta.nombre} {cuenta.titular ? `(${cuenta.titular})` : ''} - {cuenta.tipo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Forma de Pago *</label>
                    <select
                      value={formaPago}
                      onChange={(e) => setFormaPago(e.target.value)}
                      className="input"
                      required
                    >
                      <option value="Transferencia">Transferencia</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Débito automático">Débito automático</option>
                      <option value="Tarjeta de crédito">Tarjeta de crédito</option>
                      <option value="Canje de granos">Canje de granos</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Fecha de Pago *</label>
                    <input
                      type="date"
                      value={fechaPago}
                      onChange={(e) => setFechaPago(e.target.value)}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="label">Observaciones</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="input"
                    rows={3}
                    placeholder="Notas adicionales sobre el pago..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetFormulario}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Confirmar Pago
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Facturas Pendientes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Facturas Pendientes de Pago</h2>
          {facturasPendientes.length > 0 && (
            <button
              onClick={handleSeleccionarTodas}
              className="btn-secondary text-sm"
            >
              {facturasSeleccionadas.size === facturasPendientes.length ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
            </button>
          )}
        </div>

        {facturasPendientes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-semibold">No hay facturas pendientes</p>
            <p className="text-sm">Todas las facturas han sido pagadas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={facturasSeleccionadas.size === facturasPendientes.length}
                      onChange={handleSeleccionarTodas}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Número
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha Emisión
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Proveedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Forma de Pago Original
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vencimiento
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facturasPendientes.map((factura) => (
                  <tr
                    key={factura.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      facturasSeleccionadas.has(factura.id) ? 'bg-primary-50' : ''
                    }`}
                    onClick={() => handleToggleFactura(factura.id)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={facturasSeleccionadas.has(factura.id)}
                        onChange={() => handleToggleFactura(factura.id)}
                        className="rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>{factura.numeroFactura}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatFecha(factura.fechaEmision)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-1">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{factura.proveedor}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {factura.tipoFactura}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span>{formatMoneda(factura.total, factura.moneda)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {factura.formaPago}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {factura.fechaPago ? (
                        <span className={`${
                          new Date(factura.fechaPago) < new Date()
                            ? 'text-red-600 font-semibold'
                            : 'text-gray-600'
                        }`}>
                          {formatFecha(factura.fechaPago)}
                          {new Date(factura.fechaPago) < new Date() && ' (Vencida)'}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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
