import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/apiWithCache';
import { Stock } from '../types';
import { Plus, Package, Trash2, TrendingUp, AlertTriangle, Fuel, Wrench, Droplet, Sprout, Gauge, Grid3x3 } from 'lucide-react';

const categorias = [
  { nombre: 'Combustibles', icon: Fuel, color: 'bg-yellow-500' },
  { nombre: 'Repuestos', icon: Wrench, color: 'bg-blue-500' },
  { nombre: 'Agroquímicos', icon: Droplet, color: 'bg-green-500' },
  { nombre: 'Semillas', icon: Sprout, color: 'bg-emerald-500' },
  { nombre: 'Lubricantes', icon: Gauge, color: 'bg-purple-500' },
  { nombre: 'Otros', icon: Grid3x3, color: 'bg-gray-500' },
];

export default function StockPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stock, setStock] = useState<Stock[]>([]);
  const [maquinarias, setMaquinarias] = useState<any[]>([]);
  const [campos, setCampos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMovimiento, setShowMovimiento] = useState<string | null>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(
    (location.state as any)?.categoriaSeleccionada || null
  );
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    unidad: '',
  });
  const [movimientoData, setMovimientoData] = useState({
    tipo: 'ENTRADA',
    cantidad: '',
    precio: '',
    proveedor: '',
    precioUnitario: '',
    tipoFactura: '',
    numeroRemito: '',
    numeroFactura: '',
    cuentaId: '',
    maquinariaId: '',
    implementoId: '',
    servicioId: '',
    campoId: '',
    loteId: '',
    motivo: '',
    observaciones: '',
  });

  useEffect(() => {
    fetchStock();
    fetchMaquinarias();
    fetchCampos();
    fetchCuentas();

    // Recargar datos cuando la página vuelve a estar visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchStock = async () => {
    try {
      const response = await api.get('/stock');
      setStock(response.data);
    } catch (error) {
      console.error('Error al cargar stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaquinarias = async () => {
    try {
      const response = await api.get('/maquinarias');
      setMaquinarias(response.data);
    } catch (error) {
      console.error('Error al cargar maquinarias:', error);
    }
  };

  const fetchCampos = async () => {
    try {
      const response = await api.get('/campos');
      setCampos(response.data);
    } catch (error) {
      console.error('Error al cargar campos:', error);
    }
  };

  const fetchCuentas = async () => {
    try {
      const response = await api.get('/cuentas');
      setCuentas(response.data);
    } catch (error) {
      console.error('Error al cargar cuentas:', error);
    }
  };

  const fetchLotesPorCampo = async (campoId: string) => {
    try {
      const response = await api.get(`/campos/${campoId}`);
      setLotes(response.data.lotes || []);
    } catch (error) {
      console.error('Error al cargar lotes:', error);
      setLotes([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/stock', {
        ...formData,
        cantidad: 0,
      });
      setShowForm(false);
      setFormData({
        nombre: '',
        categoria: '',
        unidad: '',
      });
      fetchStock();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al crear item de stock');
    }
  };

  const handleMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMovimiento) return;

    try {
      const dataToSend: any = {
        tipo: movimientoData.tipo,
        cantidad: parseFloat(movimientoData.cantidad),
        motivo: movimientoData.motivo || undefined,
        observaciones: movimientoData.observaciones || undefined,
      };

      // Agregar campos de ENTRADA si aplica
      if (movimientoData.tipo === 'ENTRADA') {
        if (movimientoData.precio) dataToSend.precio = parseFloat(movimientoData.precio);
        if (movimientoData.precioUnitario) dataToSend.precioUnitario = parseFloat(movimientoData.precioUnitario);
        if (movimientoData.proveedor) dataToSend.proveedor = movimientoData.proveedor;
        if (movimientoData.tipoFactura) dataToSend.tipoFactura = movimientoData.tipoFactura;
        if (movimientoData.numeroRemito) dataToSend.numeroRemito = movimientoData.numeroRemito;
        if (movimientoData.numeroFactura) dataToSend.numeroFactura = movimientoData.numeroFactura;
        if (movimientoData.cuentaId) dataToSend.cuentaId = movimientoData.cuentaId;
      }

      // Agregar campos de SALIDA si aplica
      if (movimientoData.tipo === 'SALIDA') {
        if (movimientoData.maquinariaId) dataToSend.maquinariaId = movimientoData.maquinariaId;
        if (movimientoData.implementoId) dataToSend.implementoId = movimientoData.implementoId;
        if (movimientoData.servicioId) dataToSend.servicioId = movimientoData.servicioId;
        if (movimientoData.campoId) dataToSend.campoId = movimientoData.campoId;
        if (movimientoData.loteId) dataToSend.loteId = movimientoData.loteId;
      }

      await api.post(`/stock/${showMovimiento}/movimientos`, dataToSend);
      setShowMovimiento(null);
      setMovimientoData({
        tipo: 'ENTRADA',
        cantidad: '',
        precio: '',
        proveedor: '',
        precioUnitario: '',
        tipoFactura: '',
        numeroRemito: '',
        numeroFactura: '',
        cuentaId: '',
        maquinariaId: '',
        implementoId: '',
        servicioId: '',
        campoId: '',
        loteId: '',
        motivo: '',
        observaciones: '',
      });
      fetchStock();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al registrar movimiento');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este item del stock?')) return;
    try {
      await api.delete(`/stock/${id}`);
      fetchStock();
    } catch (error) {
      alert('Error al eliminar item');
    }
  };

  const isStockBajo = (item: Stock) => {
    return item.stockMinimo && item.cantidad <= item.stockMinimo;
  };

  const getStockPorCategoria = (nombreCategoria: string) => {
    return stock.filter((item) => item.categoria === nombreCategoria);
  };

  const stockFiltrado = categoriaSeleccionada
    ? getStockPorCategoria(categoriaSeleccionada)
    : stock;

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {categoriaSeleccionada ? `Stock > ${categoriaSeleccionada}` : 'Stock e Insumos'}
          </h1>
          <p className="text-gray-600 mt-2">
            {categoriaSeleccionada ? `Inventario de ${categoriaSeleccionada.toLowerCase()}` : 'Control de inventario'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {categoriaSeleccionada && (
            <button
              onClick={() => setCategoriaSeleccionada(null)}
              className="btn-secondary"
            >
              Volver a Categorías
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Item</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Nuevo Item de Stock</h2>
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
                  Categoría *
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {categorias.map((cat) => (
                    <option key={cat.nombre} value={cat.nombre}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidad *
                </label>
                <select
                  value={formData.unidad}
                  onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="gramos">Gramos (g)</option>
                  <option value="litros">Litros</option>
                  <option value="cc">CC (cm³)</option>
                  <option value="unidades">Unidades</option>
                  <option value="bolsas">Bolsas</option>
                  <option value="toneladas">Toneladas</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn-primary">
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {showMovimiento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Registrar Movimiento</h2>
            <form onSubmit={handleMovimiento} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={movimientoData.tipo}
                    onChange={(e) => setMovimientoData({ ...movimientoData, tipo: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="ENTRADA">Entrada</option>
                    <option value="SALIDA">Salida</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={movimientoData.cantidad}
                    onChange={(e) => setMovimientoData({ ...movimientoData, cantidad: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                {/* Campos solo para ENTRADA */}
                {movimientoData.tipo === 'ENTRADA' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio Total
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={movimientoData.precio}
                        onChange={(e) => setMovimientoData({ ...movimientoData, precio: e.target.value })}
                        className="input"
                        placeholder="$"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio Unitario
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={movimientoData.precioUnitario}
                        onChange={(e) => setMovimientoData({ ...movimientoData, precioUnitario: e.target.value })}
                        className="input"
                        placeholder="$"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proveedor
                      </label>
                      <input
                        type="text"
                        value={movimientoData.proveedor}
                        onChange={(e) => setMovimientoData({ ...movimientoData, proveedor: e.target.value })}
                        className="input"
                        placeholder="Nombre del proveedor"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Factura
                      </label>
                      <select
                        value={movimientoData.tipoFactura}
                        onChange={(e) => setMovimientoData({ ...movimientoData, tipoFactura: e.target.value })}
                        className="input"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="SIN_FACTURA">Sin Factura</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Remito
                      </label>
                      <input
                        type="text"
                        value={movimientoData.numeroRemito}
                        onChange={(e) => setMovimientoData({ ...movimientoData, numeroRemito: e.target.value })}
                        className="input"
                        placeholder="Ej: 0001-00001234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Factura
                      </label>
                      <input
                        type="text"
                        value={movimientoData.numeroFactura}
                        onChange={(e) => setMovimientoData({ ...movimientoData, numeroFactura: e.target.value })}
                        className="input"
                        placeholder="Ej: 0001-00001234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cuenta
                      </label>
                      <select
                        value={movimientoData.cuentaId}
                        onChange={(e) => setMovimientoData({ ...movimientoData, cuentaId: e.target.value })}
                        className="input"
                      >
                        <option value="">Seleccionar...</option>
                        {cuentas.map((cuenta) => (
                          <option key={cuenta.id} value={cuenta.id}>
                            {cuenta.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Campos solo para SALIDA */}
                {movimientoData.tipo === 'SALIDA' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maquinaria
                      </label>
                      <select
                        value={movimientoData.maquinariaId}
                        onChange={(e) => setMovimientoData({ ...movimientoData, maquinariaId: e.target.value })}
                        className="input"
                      >
                        <option value="">Seleccionar...</option>
                        {maquinarias.filter(m =>
                          m.tipo === 'Tractor' ||
                          m.tipo === 'Camión' ||
                          m.tipo === 'Camioneta' ||
                          m.tipo === 'Moto' ||
                          m.tipo === 'Cuatriciclo' ||
                          m.tipo === 'Pulverizadora'
                        ).map((maq) => (
                          <option key={maq.id} value={maq.id}>
                            {maq.nombre} ({maq.tipo})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Implemento
                      </label>
                      <select
                        value={movimientoData.implementoId}
                        onChange={(e) => setMovimientoData({ ...movimientoData, implementoId: e.target.value })}
                        className="input"
                      >
                        <option value="">Seleccionar...</option>
                        {maquinarias.filter(m =>
                          m.tipo === 'Desmalezadora' ||
                          m.tipo === 'Rastra' ||
                          m.tipo === 'Sembradora' ||
                          m.tipo === 'Carro' ||
                          m.tipo === 'Embolsadora' ||
                          m.tipo === 'Extractora' ||
                          m.tipo === 'Chimango'
                        ).map((imp) => (
                          <option key={imp.id} value={imp.id}>
                            {imp.nombre} ({imp.tipo})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Servicio
                      </label>
                      <select
                        value={movimientoData.servicioId}
                        onChange={(e) => setMovimientoData({ ...movimientoData, servicioId: e.target.value })}
                        className="input"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Siembra">Siembra</option>
                        <option value="Cosecha">Cosecha</option>
                        <option value="Pulverización">Pulverización</option>
                        <option value="Fertilización">Fertilización</option>
                        <option value="Picado">Picado</option>
                        <option value="Rastra">Rastra</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campo
                      </label>
                      <select
                        value={movimientoData.campoId}
                        onChange={(e) => {
                          setMovimientoData({ ...movimientoData, campoId: e.target.value, loteId: '' });
                          if (e.target.value) {
                            fetchLotesPorCampo(e.target.value);
                          } else {
                            setLotes([]);
                          }
                        }}
                        className="input"
                      >
                        <option value="">Seleccionar...</option>
                        {campos.map((campo) => (
                          <option key={campo.id} value={campo.id}>
                            {campo.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lote
                      </label>
                      <select
                        value={movimientoData.loteId}
                        onChange={(e) => setMovimientoData({ ...movimientoData, loteId: e.target.value })}
                        className="input"
                        disabled={!movimientoData.campoId}
                      >
                        <option value="">Seleccionar...</option>
                        {lotes.map((lote) => (
                          <option key={lote.id} value={lote.id}>
                            {lote.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo
                  </label>
                  <input
                    type="text"
                    value={movimientoData.motivo}
                    onChange={(e) => setMovimientoData({ ...movimientoData, motivo: e.target.value })}
                    className="input"
                    placeholder="Compra, Uso en campo, etc."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={movimientoData.observaciones}
                    onChange={(e) => setMovimientoData({ ...movimientoData, observaciones: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn-primary">
                  Registrar
                </button>
                <button
                  type="button"
                  onClick={() => setShowMovimiento(null)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!categoriaSeleccionada ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categorias.map((categoria) => {
            const Icon = categoria.icon;
            const itemsEnCategoria = getStockPorCategoria(categoria.nombre);
            const totalItems = itemsEnCategoria.length;
            const itemsBajos = itemsEnCategoria.filter(isStockBajo).length;

            return (
              <div
                key={categoria.nombre}
                onClick={() => setCategoriaSeleccionada(categoria.nombre)}
                className="card cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`${categoria.color} p-4 rounded-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{categoria.nombre}</h3>
                    <p className="text-sm text-gray-600">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
                {itemsBajos > 0 && (
                  <div className="flex items-center space-x-2 bg-red-50 text-red-700 p-2 rounded text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{itemsBajos} {itemsBajos === 1 ? 'item' : 'items'} con stock bajo</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stockFiltrado.map((item) => (
          <div key={item.id} className={`card cursor-pointer hover:shadow-lg transition-shadow ${isStockBajo(item) ? 'border-2 border-red-300' : ''}`} onClick={() => navigate(`/stock/${item.id}`)}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{item.nombre}</h3>
                  <p className="text-sm text-gray-600">{item.categoria}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {isStockBajo(item) && (
              <div className="flex items-center space-x-2 bg-red-50 text-red-700 p-2 rounded mb-3 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Stock bajo - Reponer</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cantidad:</span>
                <span className="font-bold text-lg">{item.cantidad.toFixed(1)} {item.unidad}</span>
              </div>

              {item.stockMinimo && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Stock mínimo:</span>
                  <span className="font-medium">{item.stockMinimo} {item.unidad}</span>
                </div>
              )}

              {item.precioUnitario && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Precio unitario:</span>
                  <span className="font-medium">${item.precioUnitario.toFixed(2)}</span>
                </div>
              )}

              {item.ubicacion && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ubicación:</span>
                  <span className="font-medium">{item.ubicacion}</span>
                </div>
              )}

              {item.descripcion && (
                <p className="text-sm text-gray-600 mt-2 pt-2 border-t">
                  {item.descripcion}
                </p>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMovimiento(item.id);
              }}
              className="btn-primary w-full mt-4 flex items-center justify-center space-x-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Registrar Movimiento</span>
            </button>
          </div>
        ))}
        </div>
      )}

      {!categoriaSeleccionada && stock.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No hay items en stock. Crea uno para comenzar.
        </div>
      )}

      {categoriaSeleccionada && stockFiltrado.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No hay items en esta categoría. Crea uno para comenzar.
        </div>
      )}
    </div>
  );
}
