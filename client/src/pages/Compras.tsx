// @ts-nocheck
import { useState, useEffect } from 'react';
import api from '../services/apiWithCache';
import { ShoppingCart, Package, AlertTriangle, TrendingUp } from 'lucide-react';

interface ProductoNecesario {
  stockId: string;
  producto: string;
  cantidadTotal: number;
  stockDisponible: number;
  faltante: number;
  unidad: string;
  servicios: Array<{
    id: string;
    fecha: string;
    campo: string;
    lote: string;
    hectareas: number;
    cantidad: number;
  }>;
}

export default function Compras() {
  const [productosNecesarios, setProductosNecesarios] = useState<ProductoNecesario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductosNecesarios();

    // Recargar datos cuando la página vuelve a estar visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchProductosNecesarios();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchProductosNecesarios = async () => {
    try {
      // Obtener todos los servicios de pulverización pendientes
      const serviciosRes = await api.get('/servicios');
      const serviciosPendientes = serviciosRes.data.filter(
        (s: any) => s.tipo === 'Pulverización' && s.estado === 'PENDIENTE' && s.receta && s.hectareas
      );

      // Obtener stock de agroquímicos
      const stockRes = await api.get('/stock');
      const stockAgroquimicos = stockRes.data.filter((s: any) => s.categoria === 'Agroquímicos');

      // Solo considerar productos con stock NEGATIVO (porque ya se descontó al crear las órdenes)
      const productosConStockNegativo = stockAgroquimicos.filter((s: any) => s.cantidad < 0);

      // Cargar movimientos de stock para calcular qué órdenes tienen stock insuficiente
      const movimientosStock: any[] = [];
      for (const stock of stockAgroquimicos) {
        try {
          const movRes = await api.get(`/stock/${stock.id}/movimientos`);
          movimientosStock.push(...movRes.data.map((m: any) => ({ ...m, stockId: stock.id })));
        } catch (err) {
          console.error(`Error cargando movimientos de ${stock.nombre}:`, err);
        }
      }

      // Para cada producto con stock negativo, buscar las órdenes que lo usan
      const productosMap = new Map<string, ProductoNecesario>();

      for (const stock of productosConStockNegativo) {
        const productosEnOrdenes: any[] = [];

        for (const servicio of serviciosPendientes) {
          try {
            const receta = JSON.parse(servicio.receta);

            for (const item of receta) {
              if (item.stockId === stock.id) {
                const dosisHa = parseFloat(item.cantidad);
                const cantidadNecesaria = dosisHa * servicio.hectareas;

                // Calcular si esta orden específica tiene stock insuficiente
                const movimientosProducto = movimientosStock
                  .filter(m => m.stockId === stock.id)
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                const fechaOrden = new Date(servicio.createdAt);
                let stockEnMomentoCreacion = 0;

                for (const mov of movimientosProducto) {
                  const fechaMov = new Date(mov.createdAt);
                  if (fechaMov < fechaOrden) {
                    if (mov.tipo === 'ENTRADA') {
                      stockEnMomentoCreacion += mov.cantidad;
                    } else {
                      stockEnMomentoCreacion -= mov.cantidad;
                    }
                  }
                }

                const faltanteEnOrden = Math.max(0, cantidadNecesaria - stockEnMomentoCreacion);
                const tieneStockInsuficiente = faltanteEnOrden > 0;

                // Solo agregar si esta orden tiene stock insuficiente
                if (tieneStockInsuficiente) {
                  productosEnOrdenes.push({
                    id: servicio.id,
                    fecha: servicio.fecha,
                    campo: servicio.campo?.nombre || 'N/A',
                    lote: servicio.lote?.nombre || (servicio.descripcion?.includes('Lotes:')
                      ? servicio.descripcion.split('Lotes:')[1].split('-')[0].trim()
                      : 'N/A'),
                    hectareas: servicio.hectareas,
                    cantidad: cantidadNecesaria,
                    producto: item.producto,
                    unidad: item.unidad.split('/')[0],
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error procesando servicio:', error);
          }
        }

        if (productosEnOrdenes.length > 0) {
          const primerProducto = productosEnOrdenes[0];
          const cantidadTotal = productosEnOrdenes.reduce((sum, p) => sum + p.cantidad, 0);

          productosMap.set(stock.id, {
            stockId: stock.id,
            producto: primerProducto.producto,
            cantidadTotal: cantidadTotal,
            stockDisponible: stock.cantidad,
            faltante: Math.abs(stock.cantidad), // El faltante es el valor absoluto del stock negativo
            unidad: primerProducto.unidad,
            servicios: productosEnOrdenes,
          });
        }
      }

      const productos = Array.from(productosMap.values());

      // Ordenar por faltante (mayor a menor)
      productos.sort((a, b) => b.faltante - a.faltante);

      setProductosNecesarios(productos);
    } catch (error) {
      console.error('Error al cargar productos necesarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras Necesarias</h1>
          <p className="text-gray-600 mt-1">
            Productos con stock insuficiente para completar órdenes de pulverización pendientes
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-center space-x-3">
            <div className="bg-red-500 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Productos a Comprar</p>
              <p className="text-2xl font-bold text-red-600">{productosNecesarios.length}</p>
            </div>
          </div>
        </div>

        <div className="card bg-orange-50 border-orange-200">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-500 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Órdenes Pendientes Afectadas</p>
              <p className="text-2xl font-bold text-orange-600">
                {productosNecesarios.reduce((total, p) => total + p.servicios.length, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Productos */}
      {productosNecesarios.length === 0 ? (
        <div className="card text-center py-12">
          <ShoppingCart className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <p className="text-green-600 text-lg font-semibold">¡Todo el stock está OK!</p>
          <p className="text-gray-500 text-sm mt-2">
            Hay stock suficiente para todas las órdenes de pulverización pendientes
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {productosNecesarios.map((producto) => {
            return (
              <div
                key={producto.stockId}
                className="card border-red-200 bg-red-50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{producto.producto}</h3>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500 text-white">
                        ¡Comprar!
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Stock Disponible</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {producto.stockDisponible.toFixed(2)} {producto.unidad}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Cantidad Necesaria</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {producto.cantidadTotal.toFixed(2)} {producto.unidad}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Cantidad a Comprar</p>
                        <p className="text-lg font-semibold text-red-600">
                          {producto.faltante.toFixed(2)} {producto.unidad}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Órdenes Pendientes</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {producto.servicios.length}
                        </p>
                      </div>
                    </div>

                    {/* Detalle de servicios */}
                    <div className="border-t pt-3">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Detalle por orden de pulverización:
                      </p>
                      <div className="space-y-1">
                        {producto.servicios.map((servicio, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded border"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-gray-600 w-20">{formatFecha(servicio.fecha)}</span>
                              <span className="font-medium">{servicio.campo}</span>
                              <span className="text-gray-500">→ {servicio.lote}</span>
                              <span className="text-gray-500">{servicio.hectareas} ha</span>
                            </div>
                            <span className="font-semibold text-blue-600">
                              {servicio.cantidad.toFixed(2)} {producto.unidad}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
