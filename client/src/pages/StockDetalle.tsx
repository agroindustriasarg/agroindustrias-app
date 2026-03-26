import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/apiWithCache';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, FileText, Trash2, Edit2 } from 'lucide-react';

interface StockItem {
  id: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  precioUnitario?: number;
  stockMinimo?: number;
  ubicacion?: string;
  descripcion?: string;
}

interface Movimiento {
  id: string;
  tipo: string;
  cantidad: number;
  precio?: number;
  proveedor?: string;
  precioUnitario?: number;
  tipoFactura?: string;
  numeroRemito?: string;
  numeroFactura?: string;
  maquinariaId?: string;
  implementoId?: string;
  servicioId?: string;
  campoId?: string;
  loteId?: string;
  motivo?: string;
  observaciones?: string;
  fecha: string;
  createdAt: string;
}

export default function StockDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState<StockItem | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [, setMaquinarias] = useState<any[]>([]);
  const [campos, setCampos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');

  useEffect(() => {
    fetchStockDetalle();
    fetchMovimientos();
    fetchMaquinarias();
    fetchCampos();
  }, [id]);

  const fetchStockDetalle = async () => {
    try {
      const response = await api.get(`/stock/${id}`);
      setStock(response.data);
    } catch (error) {
      console.error('Error al cargar stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovimientos = async () => {
    try {
      const response = await api.get(`/stock/${id}/movimientos`);
      setMovimientos(response.data);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
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

      // Extraer todos los lotes de todos los campos
      const todosLosLotes = response.data.reduce((acc: any[], campo: any) => {
        if (campo.lotes && campo.lotes.length > 0) {
          return [...acc, ...campo.lotes];
        }
        return acc;
      }, []);
      setLotes(todosLosLotes);
    } catch (error) {
      console.error('Error al cargar campos:', error);
    }
  };

  const getCampoNombre = (id: string) => {
    const campo = campos.find(c => c.id === id);
    return campo ? campo.nombre : id;
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRecalcular = async () => {
    if (!confirm('¿Recalcular el stock desde cero sumando todos los movimientos existentes?')) return;
    try {
      const res = await api.post(`/stock/${id}/recalcular`, {});
      alert(`Stock recalculado: ${res.data.cantidad.toFixed(1)} ${stock?.unidad}`);
      fetchStockDetalle();
    } catch (error) {
      alert('Error al recalcular stock');
    }
  };

  const handleDeleteMovimiento = async (movimientoId: string) => {
    if (!confirm('¿Estás seguro de eliminar este movimiento? Esta acción revertirá el cambio en el stock.')) return;

    try {
      await api.delete(`/stock/${id}/movimientos/${movimientoId}`);
      fetchStockDetalle();
      fetchMovimientos();
    } catch (error) {
      alert('Error al eliminar movimiento');
      console.error('Error al eliminar movimiento:', error);
    }
  };

  const handleEditarNombre = () => {
    setNuevoNombre(stock?.nombre || '');
    setEditandoNombre(true);
  };

  const handleGuardarNombre = async () => {
    if (!nuevoNombre.trim()) {
      alert('El nombre no puede estar vacío');
      return;
    }

    try {
      await api.put(`/stock/${id}`, { nombre: nuevoNombre });
      await fetchStockDetalle();
      setEditandoNombre(false);
    } catch (error) {
      alert('Error al actualizar el nombre');
      console.error('Error al actualizar el nombre:', error);
    }
  };

  const handleCancelarEdicion = () => {
    setEditandoNombre(false);
    setNuevoNombre('');
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  if (!stock) {
    return <div className="text-center py-12">No se encontró el item</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/stock', { state: { categoriaSeleccionada: stock.categoria } })}
          className="btn-secondary flex items-center space-x-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a {stock.categoria}</span>
        </button>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            {editandoNombre ? (
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="input flex-1 text-2xl font-bold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGuardarNombre();
                    if (e.key === 'Escape') handleCancelarEdicion();
                  }}
                />
                <button
                  onClick={handleGuardarNombre}
                  className="btn-primary px-4 py-2"
                >
                  Guardar
                </button>
                <button
                  onClick={handleCancelarEdicion}
                  className="btn-secondary px-4 py-2"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">{stock.nombre}</h1>
                <button
                  onClick={handleEditarNombre}
                  className="text-gray-500 hover:text-primary-600 transition-colors"
                  title="Editar nombre"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          <p className="text-gray-600 mb-4">{stock.categoria}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Cantidad actual</p>
              <p className="text-xl font-bold">{stock.cantidad.toFixed(1)} {stock.unidad}</p>
              <button
                onClick={handleRecalcular}
                className="mt-1 text-xs text-orange-600 hover:text-orange-800 underline"
                title="Recalcular stock desde los movimientos"
              >
                Recalcular
              </button>
            </div>
            {stock.stockMinimo && (
              <div>
                <p className="text-sm text-gray-600">Stock mínimo</p>
                <p className="text-lg font-semibold">{stock.stockMinimo} {stock.unidad}</p>
              </div>
            )}
            {stock.precioUnitario && (
              <div>
                <p className="text-sm text-gray-600">Precio unitario</p>
                <p className="text-lg font-semibold">${stock.precioUnitario.toFixed(2)}</p>
              </div>
            )}
            {stock.ubicacion && (
              <div>
                <p className="text-sm text-gray-600">Ubicación</p>
                <p className="text-lg font-semibold">{stock.ubicacion}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Libro Diario de Movimientos</h2>

        {movimientos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay movimientos registrados
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
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detalles
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatFecha(mov.fecha || mov.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {mov.tipo === 'ENTRADA' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <TrendingUp className="w-3 h-3" />
                          <span>Entrada</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <TrendingDown className="w-3 h-3" />
                          <span>Salida</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                      {mov.tipo === 'ENTRADA' ? '+' : '-'}{mov.cantidad} {stock.unidad}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {mov.tipo === 'ENTRADA' ? (
                        <div className="text-xs">
                          {mov.precioUnitario && <span className="mr-3">P.Unit: ${mov.precioUnitario}</span>}
                          {mov.precio && <span className="mr-3">Total: ${mov.precio}</span>}
                          {mov.proveedor && <span className="mr-3">Prov: {mov.proveedor}</span>}
                          {mov.tipoFactura && <span className="mr-3">Fact: {mov.tipoFactura}</span>}
                          {mov.numeroRemito && <span className="mr-3">Rem: {mov.numeroRemito}</span>}
                          {mov.numeroFactura && <span>N°Fact: {mov.numeroFactura}</span>}
                        </div>
                      ) : (
                        <div className="text-xs">
                          {mov.campoId && <span className="mr-3">Campo: {getCampoNombre(mov.campoId)}</span>}
                          {mov.loteId && (() => {
                            const lote = lotes.find(l => l.id === mov.loteId);
                            return <span className="mr-3">Lote: {lote ? lote.nombre : mov.loteId}{lote?.hectareas ? ` · ${lote.hectareas} ha` : ''}</span>;
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {mov.motivo && (
                        <div className="flex items-start space-x-2">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <div>{mov.motivo}</div>
                            {mov.observaciones && (
                              <div className="text-xs text-gray-500 mt-1">{mov.observaciones}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteMovimiento(mov.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Eliminar movimiento"
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
  );
}
