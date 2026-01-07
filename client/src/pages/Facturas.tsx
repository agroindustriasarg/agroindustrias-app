import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/apiWithCache';
import { FileText, Plus, ArrowLeft, DollarSign, Calendar, CheckCircle, XCircle, Trash2, Edit2, Receipt } from 'lucide-react';

interface MovimientoStock {
  id: string;
  stockId: string;
  cantidad: number;
  proveedor?: string;
  numeroRemito?: string;
  fecha: string;
  stock: {
    id: string;
    nombre: string;
    unidad: string;
  };
}

interface FacturaItem {
  id: string;
  movimientoStockId: string;
  precioUnitario: number;
  precioTotal: number;
  movimientoStock: MovimientoStock;
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
  items: FacturaItem[];
  createdAt: string;
}

export default function Facturas() {
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [remitosSinFactura, setRemitosSinFactura] = useState<MovimientoStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'PENDIENTE' | 'PAGADA'>('TODAS');

  // Estado del formulario
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [proveedor, setProveedor] = useState('');
  const [tipoFactura, setTipoFactura] = useState('A');
  const [moneda, setMoneda] = useState('ARS');
  const [formaPago, setFormaPago] = useState('Contado');
  const [fechaPago, setFechaPago] = useState('');
  const [estado, setEstado] = useState('PENDIENTE');
  const [observaciones, setObservaciones] = useState('');
  const [remitosSeleccionados, setRemitosSeleccionados] = useState<{[key: string]: number}>({});

  useEffect(() => {
    fetchFacturas();
    fetchRemitosSinFactura();
  }, []);

  const fetchFacturas = async () => {
    try {
      const response = await api.get('/facturas');
      setFacturas(response.data);
    } catch (error) {
      console.error('Error al cargar facturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRemitosSinFactura = async () => {
    try {
      const response = await api.get('/facturas/remitos/sin-factura');
      setRemitosSinFactura(response.data);
    } catch (error) {
      console.error('Error al cargar remitos sin factura:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Object.keys(remitosSeleccionados).length === 0) {
      alert('Debes seleccionar al menos un remito');
      return;
    }

    const totalCalculado = Object.values(remitosSeleccionados).reduce((sum, val) => sum + val, 0);

    const items = Object.entries(remitosSeleccionados).map(([movimientoStockId, precioTotal]) => ({
      movimientoStockId,
      precioTotal
    }));

    const data = {
      numeroFactura,
      fechaEmision,
      proveedor,
      tipoFactura,
      moneda,
      total: totalCalculado,
      formaPago,
      fechaPago: formaPago === 'A pagar en fecha' ? fechaPago : null,
      estado,
      observaciones,
      items
    };

    try {
      if (editando) {
        await api.put(`/facturas/${editando}`, data);
      } else {
        await api.post('/facturas', data);
      }
      resetFormulario();
      fetchFacturas();
      fetchRemitosSinFactura();
    } catch (error) {
      alert('Error al guardar factura');
      console.error('Error al guardar factura:', error);
    }
  };

  const handleEditar = (factura: Factura) => {
    setEditando(factura.id);
    setNumeroFactura(factura.numeroFactura);
    setFechaEmision(factura.fechaEmision.split('T')[0]);
    setProveedor(factura.proveedor);
    setTipoFactura(factura.tipoFactura);
    setMoneda(factura.moneda);
    setFormaPago(factura.formaPago);
    setFechaPago(factura.fechaPago ? factura.fechaPago.split('T')[0] : '');
    setEstado(factura.estado);
    setObservaciones(factura.observaciones || '');

    const remitos: {[key: string]: number} = {};
    factura.items.forEach(item => {
      remitos[item.movimientoStockId] = item.precioTotal;
    });
    setRemitosSeleccionados(remitos);

    setMostrarFormulario(true);
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta factura?')) return;

    try {
      await api.delete(`/facturas/${id}`);
      fetchFacturas();
      fetchRemitosSinFactura();
    } catch (error) {
      alert('Error al eliminar factura');
      console.error('Error al eliminar factura:', error);
    }
  };

  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      const factura = facturas.find(f => f.id === id);
      if (!factura) return;

      await api.put(`/facturas/${id}`, {
        ...factura,
        estado: nuevoEstado
      });
      fetchFacturas();
    } catch (error) {
      alert('Error al cambiar estado');
      console.error('Error al cambiar estado:', error);
    }
  };

  const resetFormulario = () => {
    setMostrarFormulario(false);
    setEditando(null);
    setNumeroFactura('');
    setFechaEmision(new Date().toISOString().split('T')[0]);
    setProveedor('');
    setTipoFactura('A');
    setMoneda('ARS');
    setFormaPago('Contado');
    setFechaPago('');
    setEstado('PENDIENTE');
    setObservaciones('');
    setRemitosSeleccionados({});
  };

  const handleToggleRemito = (remitoId: string, precioInicial: number = 0) => {
    setRemitosSeleccionados(prev => {
      if (prev[remitoId]) {
        const { [remitoId]: _, ...rest } = prev;
        return rest;
      } else {
        return { ...prev, [remitoId]: precioInicial };
      }
    });
  };

  const handleCambiarPrecio = (remitoId: string, precio: number) => {
    setRemitosSeleccionados(prev => ({
      ...prev,
      [remitoId]: precio
    }));
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const formatMoneda = (valor: number, moneda: string) => {
    return `${moneda} ${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const facturasFiltradas = filtroEstado === 'TODAS'
    ? facturas
    : facturas.filter(f => f.estado === filtroEstado);

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
            <FileText className="w-8 h-8" />
            <span>Facturas</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Gestión de facturas de compra
          </p>
        </div>
        <button
          onClick={() => setMostrarFormulario(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Factura</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="card mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filtrar por estado:</span>
          <div className="flex space-x-2">
            {(['TODAS', 'PENDIENTE', 'PAGADA'] as const).map(est => (
              <button
                key={est}
                onClick={() => setFiltroEstado(est)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroEstado === est
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {est === 'TODAS' ? 'Todas' : est === 'PENDIENTE' ? 'Pendientes' : 'Pagadas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editando ? 'Editar Factura' : 'Nueva Factura'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">Número de Factura</label>
                    <input
                      type="text"
                      value={numeroFactura}
                      onChange={(e) => setNumeroFactura(e.target.value)}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Fecha de Emisión</label>
                    <input
                      type="date"
                      value={fechaEmision}
                      onChange={(e) => setFechaEmision(e.target.value)}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Proveedor</label>
                    <input
                      type="text"
                      value={proveedor}
                      onChange={(e) => setProveedor(e.target.value)}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Tipo de Factura</label>
                    <select
                      value={tipoFactura}
                      onChange={(e) => setTipoFactura(e.target.value)}
                      className="input"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Moneda</label>
                    <select
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value)}
                      className="input"
                    >
                      <option value="ARS">ARS (Pesos)</option>
                      <option value="USD">USD (Dólares)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Forma de Pago</label>
                    <select
                      value={formaPago}
                      onChange={(e) => setFormaPago(e.target.value)}
                      className="input"
                    >
                      <option value="Contado">Contado</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Canje de granos">Canje de granos</option>
                      <option value="A pagar en fecha">A pagar en fecha</option>
                    </select>
                  </div>

                  {formaPago === 'A pagar en fecha' && (
                    <div>
                      <label className="label">Fecha de Pago</label>
                      <input
                        type="date"
                        value={fechaPago}
                        onChange={(e) => setFechaPago(e.target.value)}
                        className="input"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="label">Estado</label>
                    <select
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      className="input"
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="PAGADA">Pagada</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="label">Observaciones</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="input"
                    rows={2}
                  />
                </div>

                {/* Selección de Remitos */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <Receipt className="w-5 h-5" />
                    <span>Remitos a incluir</span>
                  </h3>

                  {remitosSinFactura.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No hay remitos sin factura asignada
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {remitosSinFactura.map(remito => (
                        <div
                          key={remito.id}
                          className={`p-3 border rounded-lg transition-colors ${
                            remitosSeleccionados[remito.id]
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              checked={!!remitosSeleccionados[remito.id]}
                              onChange={() => handleToggleRemito(remito.id, 0)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{remito.stock.nombre}</p>
                                  <p className="text-sm text-gray-600">
                                    Remito: {remito.numeroRemito} | Proveedor: {remito.proveedor}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Cantidad: {remito.cantidad} {remito.stock.unidad}
                                  </p>
                                </div>
                                {remitosSeleccionados[remito.id] !== undefined && (
                                  <div className="w-48">
                                    <label className="text-xs text-gray-600">Precio Total</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={remitosSeleccionados[remito.id]}
                                      onChange={(e) => handleCambiarPrecio(remito.id, parseFloat(e.target.value) || 0)}
                                      className="input mt-1"
                                      placeholder="0.00"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {Object.keys(remitosSeleccionados).length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-semibold text-gray-900">
                        Total de la Factura: {formatMoneda(
                          Object.values(remitosSeleccionados).reduce((sum, val) => sum + val, 0),
                          moneda
                        )}
                      </p>
                    </div>
                  )}
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
                    {editando ? 'Actualizar' : 'Crear'} Factura
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Facturas */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Facturas Registradas</h2>

        {facturasFiltradas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay facturas registradas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Número
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
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
                    Forma de Pago
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Remitos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facturasFiltradas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      {factura.numeroFactura}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatFecha(factura.fechaEmision)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {factura.proveedor}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {factura.tipoFactura}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                      {formatMoneda(factura.total, factura.moneda)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {factura.formaPago}
                      {factura.fechaPago && (
                        <div className="text-xs text-gray-500">
                          Vence: {formatFecha(factura.fechaPago)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleCambiarEstado(
                          factura.id,
                          factura.estado === 'PENDIENTE' ? 'PAGADA' : 'PENDIENTE'
                        )}
                        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          factura.estado === 'PAGADA'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {factura.estado === 'PAGADA' ? (
                          <><CheckCircle className="w-3 h-3" /><span>Pagada</span></>
                        ) : (
                          <><XCircle className="w-3 h-3" /><span>Pendiente</span></>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="space-y-1">
                        {factura.items.map(item => (
                          <div key={item.id} className="text-xs">
                            <span className="font-medium">{item.movimientoStock.stock.nombre}</span>
                            <span className="text-gray-500"> (Remito: {item.movimientoStock.numeroRemito})</span>
                            <div className="text-gray-600">
                              {item.movimientoStock.cantidad} {item.movimientoStock.stock.unidad} × {formatMoneda(item.precioUnitario, factura.moneda)} = {formatMoneda(item.precioTotal, factura.moneda)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditar(factura)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(factura.id)}
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
