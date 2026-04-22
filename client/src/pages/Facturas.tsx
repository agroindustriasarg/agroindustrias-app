import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/apiWithCache';
import { FileText, Plus, ArrowLeft, Calendar, CheckCircle, XCircle, Trash2, Edit2, Receipt } from 'lucide-react';

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

interface Servicio {
  id: string;
  tipo: string;
  fecha: string;
  descripcion?: string;
  hectareas?: number;
  costoPorHa?: number;
  total?: number;
  moneda: string;
  estado: string;
  campo: {
    id: string;
    nombre: string;
  };
  lote?: {
    id: string;
    nombre: string;
  };
  contratista?: {
    id: string;
    nombre: string;
    apellido?: string;
  };
}

interface FacturaItem {
  id: string;
  movimientoStockId?: string;
  stockId?: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
  movimientoStock?: MovimientoStock;
  stock?: {
    id: string;
    nombre: string;
    unidad: string;
  };
}

interface PagoFactura {
  id: string;
  monto: number;
  createdAt: string;
  pago: {
    id: string;
    formaPago: string;
    fechaPago: string;
    observaciones?: string;
    cuenta: {
      id: string;
      nombre: string;
    };
  };
}

interface Factura {
  id: string;
  numeroFactura: string;
  fechaEmision: string;
  proveedor: string;
  tipoFactura: string;
  moneda: string;
  subtotal: number;
  iva105: number;
  iva21: number;
  otrosCargos: number;
  total: number;
  formaPago: string;
  fechaPago?: string;
  estado: string;
  tieneRemitos: boolean;
  tipoCambio?: number;
  observaciones?: string;
  items: FacturaItem[];
  servicios?: Servicio[];
  pagos?: PagoFactura[];
  createdAt: string;
}

interface ProductoPrecio {
  stockId: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
}

export default function Facturas() {
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [remitosSinFactura, setRemitosSinFactura] = useState<MovimientoStock[]>([]);
  const [serviciosSinFactura, setServiciosSinFactura] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'PENDIENTE' | 'PAGO PARCIAL' | 'PAGADA'>('TODAS');

  // Modo de factura: 'remitos', 'servicios', o 'simple'
  const [modoFactura, setModoFactura] = useState<'remitos' | 'servicios' | 'simple'>('simple');

  // Estado del formulario
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [proveedor, setProveedor] = useState('');
  const [proveedoresList, setProveedoresList] = useState<string[]>([]);
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState('');

  const agregarProveedor = async () => {
    const nombre = nuevoProveedor.trim();
    if (!nombre) return;
    try {
      await api.post('/proveedores', { nombre });
      const res = await api.get('/proveedores');
      setProveedoresList(res.data.map((p: any) => p.nombre));
      setProveedor(nombre);
      setNuevoProveedor('');
      setMostrarNuevoProveedor(false);
    } catch (error) {
      console.error('Error al agregar proveedor:', error);
    }
  };

  const [tipoFactura, setTipoFactura] = useState('A');
  const [moneda, setMoneda] = useState('ARS');
  const [formaPago, setFormaPago] = useState('Contado');
  const [fechaPago, setFechaPago] = useState('');
  const [estado, setEstado] = useState('PENDIENTE');
  const [observaciones, setObservaciones] = useState('');

  // Para facturas con remitos
  const [remitosSeleccionados, setRemitosSeleccionados] = useState<string[]>([]);
  const [productosPrecios, setProductosPrecios] = useState<{[remitoId: string]: {[stockId: string]: ProductoPrecio}}>({});

  // Para facturas con servicios
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([]);

  // Para facturas simples (sin remitos ni servicios)
  const [subtotal, setSubtotal] = useState('');
  const [tipoIva, setTipoIva] = useState<'SIN_IVA' | 'IVA_105' | 'IVA_21'>('SIN_IVA');
  const [tipoCambio, setTipoCambio] = useState('');
  const [otrosCargos, setOtrosCargos] = useState('');

  useEffect(() => {
    fetchFacturas();
    fetchRemitosSinFactura();
    fetchServiciosSinFactura();
    api.get('/proveedores').then(res => setProveedoresList(res.data.map((p: any) => p.nombre))).catch(() => {});
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

  const fetchServiciosSinFactura = async () => {
    try {
      const response = await api.get('/facturas/servicios/sin-factura');
      setServiciosSinFactura(response.data);
    } catch (error) {
      console.error('Error al cargar servicios sin factura:', error);
    }
  };

  const handleToggleRemito = (remitoId: string) => {
    setRemitosSeleccionados(prev => {
      if (prev.includes(remitoId)) {
        // Remover remito
        const newProductosPrecios = { ...productosPrecios };
        delete newProductosPrecios[remitoId];
        setProductosPrecios(newProductosPrecios);
        return prev.filter(id => id !== remitoId);
      } else {
        // Agregar remito e inicializar sus productos
        const remito = remitosSinFactura.find(r => r.id === remitoId);
        if (remito) {
          const newProductosPrecios = { ...productosPrecios };
          newProductosPrecios[remitoId] = {
            [remito.stockId]: {
              stockId: remito.stockId,
              nombre: remito.stock.nombre,
              cantidad: remito.cantidad,
              unidad: remito.stock.unidad,
              precioUnitario: 0
            }
          };
          setProductosPrecios(newProductosPrecios);
        }
        return [...prev, remitoId];
      }
    });
  };

  const handleCambiarPrecioProducto = (remitoId: string, stockId: string, precioUnitario: number) => {
    setProductosPrecios(prev => ({
      ...prev,
      [remitoId]: {
        ...prev[remitoId],
        [stockId]: {
          ...prev[remitoId][stockId],
          precioUnitario
        }
      }
    }));
  };

  const handleToggleServicio = (servicioId: string) => {
    setServiciosSeleccionados(prev => {
      if (prev.includes(servicioId)) {
        return prev.filter(id => id !== servicioId);
      } else {
        return [...prev, servicioId];
      }
    });
  };

  const calcularIva = (subtotalBase: number) => {
    if (tipoIva === 'IVA_105') {
      return subtotalBase * 0.105;
    } else if (tipoIva === 'IVA_21') {
      return subtotalBase * 0.21;
    }
    return 0;
  };

  const calcularTotalFactura = () => {
    const extras = parseFloat(otrosCargos) || 0;
    if (modoFactura === 'remitos') {
      let total = 0;
      Object.entries(productosPrecios).forEach(([_, productos]) => {
        Object.values(productos).forEach(prod => {
          total += prod.cantidad * prod.precioUnitario;
        });
      });
      const iva = calcularIva(total);
      return total + iva + extras;
    } else if (modoFactura === 'servicios') {
      let totalServicios = 0;
      serviciosSeleccionados.forEach(servicioId => {
        const servicio = serviciosSinFactura.find(s => s.id === servicioId);
        if (servicio && servicio.total) {
          totalServicios += servicio.total;
        }
      });

      // Si es USD, aplicar tipo de cambio al total de servicios
      if (moneda === 'USD') {
        const tc = parseFloat(tipoCambio) || 0;
        totalServicios = totalServicios * tc;
      }

      const iva = calcularIva(totalServicios);
      return totalServicios + iva + extras;
    } else {
      let sub = parseFloat(subtotal) || 0;
      const tcSimple = parseFloat(tipoCambio) || 0;

      // Solo convertir a ARS si hay tipo de cambio
      if (moneda === 'USD' && tcSimple > 0) {
        sub = sub * tcSimple;
      }

      const iva = calcularIva(sub);
      return sub + iva + extras;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tc = parseFloat(tipoCambio) || 0;
    // Si hay tipo de cambio, la factura se convierte a ARS
    const monedaFinal = (moneda === 'USD' && tc > 0) ? 'ARS' : moneda;

    let data: any = {
      numeroFactura,
      fechaEmision,
      proveedor,
      tipoFactura,
      moneda: monedaFinal,
      tipoCambio: moneda === 'USD' && tc > 0 ? tc : null,
      otrosCargos: parseFloat(otrosCargos) || 0,
      formaPago,
      fechaPago: formaPago === 'A pagar en fecha' ? fechaPago : null,
      estado,
      observaciones,
      tieneRemitos: modoFactura === 'remitos',
      serviciosIds: []
    };

    if (modoFactura === 'remitos') {
      // Factura con remitos
      if (remitosSeleccionados.length === 0) {
        alert('Debes seleccionar al menos un remito');
        return;
      }

      const items: any[] = [];
      Object.entries(productosPrecios).forEach(([remitoId, productos]) => {
        Object.values(productos).forEach(prod => {
          items.push({
            movimientoStockId: remitoId,
            stockId: prod.stockId,
            cantidad: prod.cantidad,
            precioUnitario: prod.precioUnitario
          });
        });
      });

      let subtotalRemitos = 0;
      Object.entries(productosPrecios).forEach(([_, productos]) => {
        Object.values(productos).forEach(prod => {
          subtotalRemitos += prod.cantidad * prod.precioUnitario;
        });
      });
      // Si es USD con TC, convertir a ARS
      let subtotalRemitosFinal = subtotalRemitos;
      if (moneda === 'USD' && tc > 0) {
        subtotalRemitosFinal = subtotalRemitos * tc;
      }
      const ivaRemitosFinal = calcularIva(subtotalRemitosFinal);

      data.items = items;
      data.subtotal = subtotalRemitosFinal;
      data.iva105 = tipoIva === 'IVA_105' ? ivaRemitosFinal : 0;
      data.iva21 = tipoIva === 'IVA_21' ? ivaRemitosFinal : 0;
      data.total = subtotalRemitosFinal + ivaRemitosFinal + (parseFloat(otrosCargos) || 0);
    } else if (modoFactura === 'servicios') {
      // Factura con servicios
      if (serviciosSeleccionados.length === 0) {
        alert('Debes seleccionar al menos un servicio');
        return;
      }

      let totalServicios = 0;
      serviciosSeleccionados.forEach(servicioId => {
        const servicio = serviciosSinFactura.find(s => s.id === servicioId);
        if (servicio && servicio.total) {
          totalServicios += servicio.total;
        }
      });

      // Si es USD, aplicar tipo de cambio
      let subtotalFinal = totalServicios;
      if (moneda === 'USD') {
        const tc = parseFloat(tipoCambio) || 0;
        subtotalFinal = totalServicios * tc;
      }

      const ivaCalculado = calcularIva(subtotalFinal);

      data.items = [];
      data.serviciosIds = serviciosSeleccionados;
      data.subtotal = subtotalFinal;
      data.iva105 = tipoIva === 'IVA_105' ? ivaCalculado : 0;
      data.iva21 = tipoIva === 'IVA_21' ? ivaCalculado : 0;
      data.total = calcularTotalFactura();
    } else {
      // Factura simple (sin remitos ni servicios)
      let sub = parseFloat(subtotal) || 0;

      // Si es USD, aplicar tipo de cambio
      if (moneda === 'USD') {
        const tc = parseFloat(tipoCambio) || 0;
        sub = sub * tc;
      }

      const ivaCalculado = calcularIva(sub);

      data.items = [];
      data.subtotal = sub;
      data.iva105 = tipoIva === 'IVA_105' ? ivaCalculado : 0;
      data.iva21 = tipoIva === 'IVA_21' ? ivaCalculado : 0;
      data.total = calcularTotalFactura();
    }

    try {
      if (editando) {
        await api.put(`/facturas/${editando}`, data);
      } else {
        await api.post('/facturas', data);
      }
      resetFormulario();
      fetchFacturas();
      fetchRemitosSinFactura();
      fetchServiciosSinFactura();
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

    // Determinar el modo según el contenido de la factura
    if (factura.tieneRemitos && factura.items && factura.items.length > 0) {
      setModoFactura('remitos');
      // Reconstruir remitos seleccionados y precios
      const remitosIds: string[] = [];
      const productosData: {[remitoId: string]: {[stockId: string]: ProductoPrecio}} = {};

      factura.items.forEach(item => {
        if (item.movimientoStockId && item.stockId && item.stock) {
          if (!remitosIds.includes(item.movimientoStockId)) {
            remitosIds.push(item.movimientoStockId);
          }

          if (!productosData[item.movimientoStockId]) {
            productosData[item.movimientoStockId] = {};
          }

          productosData[item.movimientoStockId][item.stockId] = {
            stockId: item.stockId,
            nombre: item.stock.nombre,
            cantidad: item.cantidad,
            unidad: item.stock.unidad,
            precioUnitario: item.precioUnitario
          };
        }
      });

      setRemitosSeleccionados(remitosIds);
      setProductosPrecios(productosData);

      if (factura.iva105 > 0) {
        setTipoIva('IVA_105');
      } else if (factura.iva21 > 0) {
        setTipoIva('IVA_21');
      } else {
        setTipoIva('SIN_IVA');
      }
    } else if (factura.servicios && factura.servicios.length > 0) {
      setModoFactura('servicios');
      setServiciosSeleccionados(factura.servicios.map(s => s.id));
      setSubtotal(factura.subtotal ? factura.subtotal.toString() : '');
      setTipoCambio(factura.tipoCambio ? factura.tipoCambio.toString() : '');
      setOtrosCargos(factura.otrosCargos ? factura.otrosCargos.toString() : '');

      // Determinar tipo de IVA
      if (factura.iva105 > 0) {
        setTipoIva('IVA_105');
      } else if (factura.iva21 > 0) {
        setTipoIva('IVA_21');
      } else {
        setTipoIva('SIN_IVA');
      }
    } else {
      setModoFactura('simple');
      setSubtotal(factura.subtotal ? factura.subtotal.toString() : '');
      setTipoCambio(factura.tipoCambio ? factura.tipoCambio.toString() : '');
      setOtrosCargos(factura.otrosCargos ? factura.otrosCargos.toString() : '');

      // Determinar tipo de IVA
      if (factura.iva105 > 0) {
        setTipoIva('IVA_105');
      } else if (factura.iva21 > 0) {
        setTipoIva('IVA_21');
      } else {
        setTipoIva('SIN_IVA');
      }
    }

    setMostrarFormulario(true);
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta factura?')) return;

    try {
      await api.delete(`/facturas/${id}`);
      fetchFacturas();
      fetchRemitosSinFactura();
      fetchServiciosSinFactura();
    } catch (error) {
      alert('Error al eliminar factura');
      console.error('Error al eliminar factura:', error);
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
    setRemitosSeleccionados([]);
    setProductosPrecios({});
    setServiciosSeleccionados([]);
    setModoFactura('simple');
    setSubtotal('');
    setTipoIva('SIN_IVA');
    setTipoCambio('');
    setOtrosCargos('');
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' });
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
            {(['TODAS', 'PENDIENTE', 'PAGO PARCIAL', 'PAGADA'] as const).map(est => (
              <button
                key={est}
                onClick={() => setFiltroEstado(est)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroEstado === est
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {est === 'TODAS' ? 'Todas' : est === 'PENDIENTE' ? 'Pendientes' : est === 'PAGO PARCIAL' ? 'Pago Parcial' : 'Pagadas'}
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
                {/* Selector de modo */}
                {!editando && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <label className="label">Tipo de Factura</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={modoFactura === 'remitos'}
                          onChange={() => setModoFactura('remitos')}
                          className="form-radio"
                        />
                        <span>Con Remitos (agroquímicos)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={modoFactura === 'servicios'}
                          onChange={() => setModoFactura('servicios')}
                          className="form-radio"
                        />
                        <span>Con Servicios (siembra, pulverización, etc.)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={modoFactura === 'simple'}
                          onChange={() => setModoFactura('simple')}
                          className="form-radio"
                        />
                        <span>Simple (sin vincular)</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">Número de Factura</label>
                    <input
                      type="text"
                      value={numeroFactura}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        if (raw.length <= 5) {
                          setNumeroFactura(raw);
                        } else {
                          setNumeroFactura(raw.slice(0, 5) + '-' + raw.slice(5, 13));
                        }
                      }}
                      className="input"
                      placeholder="00001-00000001"
                      maxLength={14}
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
                    <div className="flex items-center space-x-2">
                      <select
                        value={proveedor}
                        onChange={(e) => setProveedor(e.target.value)}
                        className="input flex-1"
                        required
                      >
                        <option value="">Seleccionar proveedor...</option>
                        {proveedoresList.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setMostrarNuevoProveedor(true)}
                        className="btn-secondary px-3 py-2 text-lg font-bold" title="Agregar proveedor">
                        +
                      </button>
                    </div>
                    {mostrarNuevoProveedor && (
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="text"
                          value={nuevoProveedor}
                          onChange={(e) => setNuevoProveedor(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarProveedor())}
                          className="input flex-1"
                          placeholder="Nombre del nuevo proveedor"
                          autoFocus
                        />
                        <button type="button" onClick={agregarProveedor} className="btn-primary px-3 py-2">✓</button>
                        <button type="button" onClick={() => { setMostrarNuevoProveedor(false); setNuevoProveedor(''); }} className="btn-secondary px-3 py-2">✕</button>
                      </div>
                    )}
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
                      <option value="COMPROBANTE INTERNO">COMPROBANTE INTERNO</option>
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
                    <div className={`inline-flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium ${
                      estado === 'PAGADA'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {estado === 'PAGADA' ? 'Pagada' : 'Pendiente'}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Se actualiza automáticamente al registrar el pago</p>
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

                {/* Tipo de Cambio (solo para USD) */}
                {moneda === 'USD' && (
                  <div className="mb-4">
                    <label className="label">Tipo de Cambio (USD → ARS)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tipoCambio}
                      onChange={(e) => setTipoCambio(e.target.value)}
                      className="input"
                      placeholder="Dejar vacío para mantener en USD"
                    />
                    {parseFloat(tipoCambio) > 0 && (
                      <p className="text-xs text-primary-600 mt-1">
                        La factura se convertirá a ARS al guardar (USD × {parseFloat(tipoCambio).toLocaleString('es-AR')})
                      </p>
                    )}
                  </div>
                )}

                {/* Contenido según el modo */}
                {modoFactura === 'remitos' ? (
                  // MODO CON REMITOS
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                      <Receipt className="w-5 h-5" />
                      <span>Remitos y Productos a incluir</span>
                    </h3>

                    {remitosSinFactura.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No hay remitos sin factura asignada
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
                        {remitosSinFactura.map(remito => (
                          <div
                            key={remito.id}
                            className={`p-3 border rounded-lg transition-colors ${
                              remitosSeleccionados.includes(remito.id)
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                checked={remitosSeleccionados.includes(remito.id)}
                                onChange={() => handleToggleRemito(remito.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      Remito: {remito.numeroRemito}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Proveedor: {remito.proveedor} | Fecha: {formatFecha(remito.fecha)}
                                    </p>
                                  </div>
                                </div>

                                {remitosSeleccionados.includes(remito.id) && productosPrecios[remito.id] && (
                                  <div className="mt-3 space-y-2 bg-white rounded p-3 border border-gray-200">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Productos en este remito:</p>
                                    {Object.values(productosPrecios[remito.id]).map(producto => (
                                      <div key={producto.stockId} className="flex items-center space-x-3 bg-gray-50 p-2 rounded">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-900">{producto.nombre}</p>
                                          <p className="text-xs text-gray-600">
                                            Cantidad: {producto.cantidad} {producto.unidad}
                                          </p>
                                        </div>
                                        <div className="w-32">
                                          <label className="text-xs text-gray-600">Precio Unitario</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={producto.precioUnitario}
                                            onChange={(e) => handleCambiarPrecioProducto(
                                              remito.id,
                                              producto.stockId,
                                              parseFloat(e.target.value) || 0
                                            )}
                                            className="input mt-1 text-sm"
                                            placeholder="0.00"
                                          />
                                        </div>
                                        <div className="w-32 text-right">
                                          <p className="text-xs text-gray-600">Total</p>
                                          <p className="text-sm font-semibold text-gray-900">
                                            {formatMoneda(producto.cantidad * producto.precioUnitario, moneda)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {remitosSeleccionados.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-md font-semibold text-gray-900 mb-2">Montos de la Factura</h4>

                        <div className="mb-4">
                          <label className="label">Tipo de IVA</label>
                          <select
                            value={tipoIva}
                            onChange={(e) => setTipoIva(e.target.value as 'SIN_IVA' | 'IVA_105' | 'IVA_21')}
                            className="input"
                          >
                            <option value="SIN_IVA">Sin IVA</option>
                            <option value="IVA_105">IVA 10.5%</option>
                            <option value="IVA_21">IVA 21%</option>
                          </select>
                        </div>

                        <div className="border-t pt-3">
                          {(() => {
                            let subtotalRemitos = 0;
                            Object.entries(productosPrecios).forEach(([_, productos]) => {
                              Object.values(productos).forEach(prod => {
                                subtotalRemitos += prod.cantidad * prod.precioUnitario;
                              });
                            });
                            const ivaCalculado = calcularIva(subtotalRemitos);
                            return (
                              <>
                                <div className="flex justify-between items-center text-sm mb-1">
                                  <span className="text-gray-600">Subtotal:</span>
                                  <span className="font-medium">{formatMoneda(subtotalRemitos, moneda)}</span>
                                </div>
                                {tipoIva !== 'SIN_IVA' && (
                                  <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="text-gray-600">
                                      {tipoIva === 'IVA_105' ? 'IVA 10.5%:' : 'IVA 21%:'}
                                    </span>
                                    <span className="font-medium">{formatMoneda(ivaCalculado, moneda)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                                  <span>Total:</span>
                                  <span className="text-primary-600">{formatMoneda(calcularTotalFactura(), moneda)}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ) : modoFactura === 'servicios' ? (
                  // MODO CON SERVICIOS
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                      <Receipt className="w-5 h-5" />
                      <span>Servicios Realizados a Facturar</span>
                    </h3>

                    {serviciosSinFactura.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No hay servicios realizados sin facturar
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
                        {serviciosSinFactura.map(servicio => (
                          <div
                            key={servicio.id}
                            className={`p-3 border rounded-lg transition-colors ${
                              serviciosSeleccionados.includes(servicio.id)
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                checked={serviciosSeleccionados.includes(servicio.id)}
                                onChange={() => handleToggleServicio(servicio.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {servicio.tipo}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Campo: {servicio.campo.nombre} {servicio.lote ? `| Lote: ${servicio.lote.nombre}` : ''}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Fecha: {formatFecha(servicio.fecha)}
                                      {servicio.contratista && ` | Contratista: ${servicio.contratista.nombre} ${servicio.contratista.apellido || ''}`}
                                    </p>
                                    {servicio.hectareas && servicio.costoPorHa && (
                                      <p className="text-sm text-gray-600">
                                        {servicio.hectareas} ha × {formatMoneda(servicio.costoPorHa, servicio.moneda)}/ha
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-gray-900">
                                      {servicio.total ? formatMoneda(servicio.total, servicio.moneda) : 'Sin precio'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {serviciosSeleccionados.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-md font-semibold text-gray-900 mb-2">Desglose de Facturación</h4>

                        <div className="mb-4">
                          <label className="label">Tipo de IVA</label>
                          <select
                            value={tipoIva}
                            onChange={(e) => setTipoIva(e.target.value as 'SIN_IVA' | 'IVA_105' | 'IVA_21')}
                            className="input"
                          >
                            <option value="SIN_IVA">Sin IVA</option>
                            <option value="IVA_105">IVA 10.5%</option>
                            <option value="IVA_21">IVA 21%</option>
                          </select>
                        </div>

                        <div className="border-t pt-3">
                          {(() => {
                            let totalServicios = 0;
                            serviciosSeleccionados.forEach(servicioId => {
                              const servicio = serviciosSinFactura.find(s => s.id === servicioId);
                              if (servicio && servicio.total) {
                                totalServicios += servicio.total;
                              }
                            });

                            const tcVal2 = parseFloat(tipoCambio) || 0;
                            let subtotalFinal = totalServicios;
                            if (moneda === 'USD' && tcVal2 > 0) {
                              subtotalFinal = totalServicios * tcVal2;
                            }
                            const monedaDisplay2 = (moneda === 'USD' && tcVal2 > 0) ? 'ARS' : moneda;

                            const ivaCalculado = calcularIva(subtotalFinal);

                            return (
                              <>
                                <div className="flex justify-between items-center text-sm mb-1">
                                  <span className="text-gray-600">Subtotal:</span>
                                  <span className="font-medium">{formatMoneda(subtotalFinal, monedaDisplay2)}</span>
                                </div>
                                {tipoIva !== 'SIN_IVA' && (
                                  <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="text-gray-600">
                                      {tipoIva === 'IVA_105' ? 'IVA 10.5%:' : 'IVA 21%:'}
                                    </span>
                                    <span className="font-medium">{formatMoneda(ivaCalculado, monedaDisplay2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                                  <span>Total:</span>
                                  <span className="text-primary-600">{formatMoneda(calcularTotalFactura(), monedaDisplay2)}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // MODO SIMPLE (SIN REMITOS NI SERVICIOS)
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Montos de la Factura</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="label">Subtotal (sin IVA)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={subtotal}
                          onChange={(e) => setSubtotal(e.target.value)}
                          className="input"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="label">Tipo de IVA</label>
                        <select
                          value={tipoIva}
                          onChange={(e) => setTipoIva(e.target.value as 'SIN_IVA' | 'IVA_105' | 'IVA_21')}
                          className="input"
                        >
                          <option value="SIN_IVA">Sin IVA</option>
                          <option value="IVA_105">IVA 10.5%</option>
                          <option value="IVA_21">IVA 21%</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      {(() => {
                        let sub = parseFloat(subtotal) || 0;
                        const tcVal = parseFloat(tipoCambio) || 0;

                        // Solo convertir a ARS si hay TC
                        const monedaDisplay = (moneda === 'USD' && tcVal > 0) ? 'ARS' : moneda;
                        if (moneda === 'USD' && tcVal > 0) {
                          sub = sub * tcVal;
                        }

                        const ivaCalculado = calcularIva(sub);

                        return (
                          <>
                            <div className="flex justify-between items-center text-sm mb-1">
                              <span className="text-gray-600">Subtotal:</span>
                              <span className="font-medium">{formatMoneda(sub, monedaDisplay)}</span>
                            </div>
                            {tipoIva !== 'SIN_IVA' && (
                              <div className="flex justify-between items-center text-sm mb-1">
                                <span className="text-gray-600">
                                  {tipoIva === 'IVA_105' ? 'IVA 10.5%:' : 'IVA 21%:'}
                                </span>
                                <span className="font-medium">{formatMoneda(ivaCalculado, monedaDisplay)}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                              <span>Total:</span>
                              <span className="text-primary-600">{formatMoneda(calcularTotalFactura(), monedaDisplay)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Otros cargos (percepciones, retenciones, etc.) */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <label className="label">Otros cargos (percepciones, retenciones, etc.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={otrosCargos}
                    onChange={(e) => setOtrosCargos(e.target.value)}
                    className="input"
                    placeholder="0.00 (opcional)"
                  />
                  {parseFloat(otrosCargos) > 0 && (
                    <p className="text-xs text-gray-500 mt-1">Se suma al total: subtotal + IVA + {parseFloat(otrosCargos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
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
                    Montos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Forma de Pago
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
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
                      {factura.tieneRemitos && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Con Remitos
                        </span>
                      )}
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
                    <td className="px-4 py-3 text-sm">
                      <div className="space-y-1">
                        {factura.subtotal > 0 && (
                          <div className="text-xs text-gray-600">
                            Subtotal: {formatMoneda(factura.subtotal, factura.moneda)}
                          </div>
                        )}
                        {factura.iva105 > 0 && (
                          <div className="text-xs text-gray-600">
                            IVA 10.5%: {formatMoneda(factura.iva105, factura.moneda)}
                          </div>
                        )}
                        {factura.iva21 > 0 && (
                          <div className="text-xs text-gray-600">
                            IVA 21%: {formatMoneda(factura.iva21, factura.moneda)}
                          </div>
                        )}
                        {factura.otrosCargos > 0 && (
                          <div className="text-xs text-gray-600">
                            Otros cargos: {formatMoneda(factura.otrosCargos, factura.moneda)}
                          </div>
                        )}
                        <div className="font-semibold">
                          Total: {formatMoneda(factura.total, factura.moneda)}
                        </div>
                      </div>
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
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          factura.estado === 'PAGADA'
                            ? 'bg-green-100 text-green-800'
                            : factura.estado === 'PAGO PARCIAL'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {factura.estado === 'PAGADA' ? (
                          <><CheckCircle className="w-3 h-3" /><span>Pagada</span></>
                        ) : factura.estado === 'PAGO PARCIAL' ? (
                          <><XCircle className="w-3 h-3" /><span>Pago Parcial</span></>
                        ) : (
                          <><XCircle className="w-3 h-3" /><span>Pendiente</span></>
                        )}
                      </span>
                      {factura.estado === 'PAGO PARCIAL' && factura.pagos && (
                        <div className="text-xs text-orange-600 mt-1">
                          Saldo: {(() => {
                            const pagado = factura.pagos.reduce((s, p) => s + (p.monto || 0), 0);
                            return (factura.total - pagado).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </div>
                      )}
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
