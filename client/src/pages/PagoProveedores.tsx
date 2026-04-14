import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/apiWithCache';
import { CreditCard, ArrowLeft, DollarSign, Calendar, CheckCircle, FileText, Building2 } from 'lucide-react';

interface PagoFactura {
  id: string;
  monto: number;
  monedaPago: string;
  tipoCambio?: number;
  montoUSD?: number;
  createdAt: string;
  pago: {
    id: string;
    formaPago: string;
    fechaPago: string;
    observaciones?: string;
    cuenta: { id: string; nombre: string };
  };
}

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
  pagos?: PagoFactura[];
}

interface Cuenta {
  id: string;
  nombre: string;
  tipo: string;
  titular?: string;
  activo: boolean;
}

export default function PagoProveedores() {
  const navigate = useNavigate();
  const [facturasPendientes, setFacturasPendientes] = useState<Factura[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState<Set<string>>(new Set());
  const [mostrarFormularioPago, setMostrarFormularioPago] = useState(false);

  // Montos por factura (en la moneda que corresponda)
  const [montosPorFactura, setMontosPorFactura] = useState<{ [id: string]: string }>({});
  // Para facturas USD: si el usuario quiere pagar en ARS
  const [pagarEnARS, setPagarEnARS] = useState<{ [id: string]: boolean }>({});
  // TC por factura (solo facturas USD pagadas en ARS)
  const [tipoCambioPorFactura, setTipoCambioPorFactura] = useState<{ [id: string]: string }>({});

  // Datos del pago
  const [cuentaId, setCuentaId] = useState('');
  const [formaPago, setFormaPago] = useState('Transferencia');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [facturasRes, cuentasRes] = await Promise.all([
        api.get('/facturas'),
        api.get('/cuentas')
      ]);
      const pendientes = facturasRes.data.filter(
        (f: Factura) => f.estado === 'PENDIENTE' || f.estado === 'PAGO PARCIAL'
      );
      setFacturasPendientes(pendientes);
      const cuentasActivas = cuentasRes.data.filter((c: Cuenta) => c.activo);
      setCuentas(cuentasActivas);
      if (cuentasActivas.length > 0) setCuentaId(cuentasActivas[0].id);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Saldo siempre en la moneda de la factura
  const getSaldoRestante = (factura: Factura) => {
    const totalPagado = (factura.pagos || []).reduce((sum, pf) => {
      // Si hubo pago en ARS con TC, usamos montoUSD; si no, monto directo
      return sum + (pf.montoUSD !== undefined && pf.montoUSD !== null ? pf.montoUSD : (pf.monto || 0));
    }, 0);
    return factura.total - totalPagado;
  };

  const handleToggleFactura = (facturaId: string) => {
    const newSelection = new Set(facturasSeleccionadas);
    if (newSelection.has(facturaId)) {
      newSelection.delete(facturaId);
      const nm = { ...montosPorFactura }; delete nm[facturaId]; setMontosPorFactura(nm);
      const np = { ...pagarEnARS }; delete np[facturaId]; setPagarEnARS(np);
      const nt = { ...tipoCambioPorFactura }; delete nt[facturaId]; setTipoCambioPorFactura(nt);
    } else {
      newSelection.add(facturaId);
      const factura = facturasPendientes.find(f => f.id === facturaId);
      if (factura) {
        setMontosPorFactura(prev => ({ ...prev, [facturaId]: getSaldoRestante(factura).toFixed(2) }));
      }
    }
    setFacturasSeleccionadas(newSelection);
  };

  const handleSeleccionarTodas = () => {
    if (facturasSeleccionadas.size === facturasPendientes.length) {
      setFacturasSeleccionadas(new Set());
      setMontosPorFactura({});
      setPagarEnARS({});
      setTipoCambioPorFactura({});
    } else {
      setFacturasSeleccionadas(new Set(facturasPendientes.map(f => f.id)));
      const nm: { [id: string]: string } = {};
      facturasPendientes.forEach(f => { nm[f.id] = getSaldoRestante(f).toFixed(2); });
      setMontosPorFactura(nm);
    }
  };

  const getEquivalenteUSD = (facturaId: string) => {
    const monto = parseFloat(montosPorFactura[facturaId] || '0');
    const tc = parseFloat(tipoCambioPorFactura[facturaId] || '0');
    if (monto > 0 && tc > 0) return monto / tc;
    return null;
  };

  const getTotalSeleccionadoLabel = () => {
    // Agrupar por moneda efectiva
    let totalARS = 0;
    let totalUSD = 0;
    facturasSeleccionadas.forEach(id => {
      const factura = facturasPendientes.find(f => f.id === id);
      if (!factura) return;
      const monto = parseFloat(montosPorFactura[id] || '0');
      if (factura.moneda === 'USD' && pagarEnARS[id]) {
        totalARS += monto;
      } else if (factura.moneda === 'USD') {
        totalUSD += monto;
      } else {
        totalARS += monto;
      }
    });
    const partes = [];
    if (totalARS > 0) partes.push(`ARS ${totalARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    if (totalUSD > 0) partes.push(`USD ${totalUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    return partes.join(' + ') || '0';
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
    if (!cuentaId) { alert('Debes seleccionar una cuenta'); return; }

    const facturaIds = Array.from(facturasSeleccionadas);

    for (const facturaId of facturaIds) {
      const factura = facturasPendientes.find(f => f.id === facturaId);
      if (!factura) continue;
      const monto = parseFloat(montosPorFactura[facturaId] || '0');
      const saldo = getSaldoRestante(factura);

      if (monto <= 0) {
        alert(`El monto para la factura ${factura.numeroFactura} debe ser mayor a 0`);
        return;
      }

      if (factura.moneda === 'USD' && pagarEnARS[facturaId]) {
        const tc = parseFloat(tipoCambioPorFactura[facturaId] || '0');
        if (tc <= 0) {
          alert(`Debés ingresar el tipo de cambio para la factura ${factura.numeroFactura}`);
          return;
        }
        const montoUSD = monto / tc;
        if (montoUSD > saldo + 0.01) {
          alert(`El equivalente USD ${montoUSD.toFixed(2)} supera el saldo USD ${saldo.toFixed(2)} de la factura ${factura.numeroFactura}`);
          return;
        }
      } else {
        if (monto > saldo + 0.01) {
          alert(`El monto supera el saldo restante de la factura ${factura.numeroFactura}`);
          return;
        }
      }
    }

    try {
      const montosParsed: { [id: string]: number } = {};
      const monedaPagoMap: { [id: string]: string } = {};
      const tipoCambioMap: { [id: string]: number } = {};

      facturaIds.forEach(id => {
        const factura = facturasPendientes.find(f => f.id === id);
        montosParsed[id] = parseFloat(montosPorFactura[id] || '0');
        if (factura?.moneda === 'USD' && pagarEnARS[id]) {
          monedaPagoMap[id] = 'ARS';
          tipoCambioMap[id] = parseFloat(tipoCambioPorFactura[id] || '0');
        } else {
          monedaPagoMap[id] = factura?.moneda || 'ARS';
        }
      });

      await api.post('/pagos', {
        facturaIds,
        montosPorFactura: montosParsed,
        monedaPagoMap,
        tipoCambioMap,
        cuentaId,
        formaPago,
        fechaPago,
        observaciones
      });

      alert('Pago registrado correctamente');
      resetFormulario();
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al procesar el pago');
    }
  };

  const resetFormulario = () => {
    setMostrarFormularioPago(false);
    setFacturasSeleccionadas(new Set());
    setMontosPorFactura({});
    setPagarEnARS({});
    setTipoCambioPorFactura({});
    setFormaPago('Transferencia');
    setFechaPago(new Date().toISOString().split('T')[0]);
    setObservaciones('');
    if (cuentas.length > 0) setCuentaId(cuentas[0].id);
  };

  const formatFecha = (fecha: string) => new Date(fecha).toLocaleDateString('es-AR');
  const formatMoneda = (valor: number, moneda: string) =>
    `${moneda} ${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) return <div className="text-center py-12">Cargando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/contabilidad')} className="btn-secondary flex items-center space-x-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Contabilidad</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <CreditCard className="w-8 h-8" />
            <span>Pago a Proveedores</span>
          </h1>
          <p className="text-gray-600 mt-1">Registro y seguimiento de pagos a proveedores</p>
        </div>
        {facturasSeleccionadas.size > 0 && (
          <button onClick={handleProcesarPago} className="btn-primary flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>Procesar Pago ({facturasSeleccionadas.size})</span>
          </button>
        )}
      </div>

      {facturasSeleccionadas.size > 0 && (
        <div className="card mb-6 bg-primary-50 border-primary-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Facturas seleccionadas: {facturasSeleccionadas.size}</h3>
          <p className="text-xl font-bold text-primary-700">Total a pagar: {getTotalSeleccionadoLabel()}</p>
        </div>
      )}

      {/* Formulario de Pago */}
      {mostrarFormularioPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Registrar Pago</h2>
              <form onSubmit={handleConfirmarPago}>
                {/* Facturas y montos */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Facturas a pagar:</h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-4 max-h-72 overflow-y-auto">
                    {facturasPendientes.filter(f => facturasSeleccionadas.has(f.id)).map(factura => {
                      const saldo = getSaldoRestante(factura);
                      const esUSD = factura.moneda === 'USD';
                      const enARS = esUSD && pagarEnARS[factura.id];
                      const equivUSD = enARS ? getEquivalenteUSD(factura.id) : null;

                      return (
                        <div key={factura.id} className="border-b pb-3 last:border-0">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">{factura.numeroFactura} - {factura.proveedor}</span>
                            <span className="text-gray-500">Saldo: {formatMoneda(saldo, factura.moneda)}</span>
                          </div>

                          {/* Checkbox pagar en ARS (solo para facturas USD) */}
                          {esUSD && (
                            <label className="flex items-center space-x-2 text-sm text-gray-600 mb-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!pagarEnARS[factura.id]}
                                onChange={(e) => {
                                  setPagarEnARS(prev => ({ ...prev, [factura.id]: e.target.checked }));
                                  // Resetear monto al cambiar modo
                                  setMontosPorFactura(prev => ({ ...prev, [factura.id]: saldo.toFixed(2) }));
                                  setTipoCambioPorFactura(prev => { const n = { ...prev }; delete n[factura.id]; return n; });
                                }}
                                className="rounded"
                              />
                              <span>Pagar en pesos (ARS)</span>
                            </label>
                          )}

                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-600 w-24">
                              Monto {enARS ? '(ARS)' : esUSD ? '(USD)' : '($)'}:
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={montosPorFactura[factura.id] || ''}
                              onChange={(e) => setMontosPorFactura(prev => ({ ...prev, [factura.id]: e.target.value }))}
                              className="input text-sm flex-1"
                              required
                            />
                          </div>

                          {/* Campo TC si paga en ARS */}
                          {enARS && (
                            <div className="flex items-center space-x-2 mt-2">
                              <label className="text-xs text-gray-600 w-24">Tipo de cambio:</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={tipoCambioPorFactura[factura.id] || ''}
                                onChange={(e) => setTipoCambioPorFactura(prev => ({ ...prev, [factura.id]: e.target.value }))}
                                className="input text-sm flex-1"
                                placeholder="Ej: 1400"
                                required
                              />
                            </div>
                          )}

                          {/* Equivalente en USD */}
                          {equivUSD !== null && equivUSD > 0 && (
                            <p className="text-xs text-primary-600 mt-1 ml-26">
                              ≈ USD {equivUSD.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cancelados
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 p-2 bg-primary-50 rounded">
                    <p className="text-lg font-bold text-primary-700">Total a pagar: {getTotalSeleccionadoLabel()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">Cuenta de Pago *</label>
                    <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className="input" required>
                      {cuentas.map(cuenta => (
                        <option key={cuenta.id} value={cuenta.id}>
                          {cuenta.nombre} {cuenta.titular ? `(${cuenta.titular})` : ''} - {cuenta.tipo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Forma de Pago *</label>
                    <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="input" required>
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
                    <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="input" required />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="label">Observaciones</label>
                  <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="input" rows={3} placeholder="Notas adicionales sobre el pago..." />
                </div>

                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={resetFormulario} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="btn-primary">Confirmar Pago</button>
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
            <button onClick={handleSeleccionarTodas} className="btn-secondary text-sm">
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
                    <input type="checkbox" checked={facturasSeleccionadas.size === facturasPendientes.length && facturasPendientes.length > 0} onChange={handleSeleccionarTodas} className="rounded" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo Restante</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facturasPendientes.map((factura) => {
                  const saldo = getSaldoRestante(factura);
                  return (
                    <tr key={factura.id} className={`hover:bg-gray-50 cursor-pointer ${facturasSeleccionadas.has(factura.id) ? 'bg-primary-50' : ''}`} onClick={() => handleToggleFactura(factura.id)}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={facturasSeleccionadas.has(factura.id)} onChange={() => handleToggleFactura(factura.id)} className="rounded" onClick={(e) => e.stopPropagation()} />
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span>{formatMoneda(factura.total, factura.moneda)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-orange-600">
                        {formatMoneda(saldo, factura.moneda)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          factura.estado === 'PAGO PARCIAL' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {factura.estado === 'PAGO PARCIAL' ? 'Pago Parcial' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {factura.fechaPago ? (
                          <span className={`${new Date(factura.fechaPago) < new Date() ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                            {formatFecha(factura.fechaPago)}
                            {new Date(factura.fechaPago) < new Date() && ' (Vencida)'}
                          </span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
