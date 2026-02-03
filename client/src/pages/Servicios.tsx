// @ts-nocheck
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Servicio, Campo, Maquinaria, Contratista, Stock } from '../types';
import { Plus, Wrench, Trash2, Calendar, MapPin, Sprout, Droplet, Wheat, BarChart3, HandMetal, Beaker, Scissors, Move, Leaf, Check, Clock, Edit } from 'lucide-react';

const categorias = [
  { nombre: 'Siembra', icon: Sprout, color: 'bg-green-500' },
  { nombre: 'Pulverización', icon: Droplet, color: 'bg-yellow-500' },
  { nombre: 'Cosecha', icon: Wheat, color: 'bg-orange-500' },
  { nombre: 'Clasificación', icon: BarChart3, color: 'bg-purple-500' },
  { nombre: 'Trabajos manuales', icon: HandMetal, color: 'bg-blue-500' },
  { nombre: 'Fertilización', icon: Beaker, color: 'bg-lime-500' },
  { nombre: 'Picado', icon: Scissors, color: 'bg-pink-500' },
  { nombre: 'Rastra', icon: Move, color: 'bg-amber-500' },
  { nombre: 'Desmalezado', icon: Leaf, color: 'bg-teal-500' },
];

export default function Servicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [maquinarias, setMaquinarias] = useState<Maquinaria[]>([]);
  const [contratistas, setContratistas] = useState<Contratista[]>([]);
  const [stockItems, setStockItems] = useState<Stock[]>([]);
  const [movimientosStock, setMovimientosStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [showNuevoProductoModal, setShowNuevoProductoModal] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    cantidad: '0',
    unidad: 'litros',
    precioUnitario: '',
  });
  const [esParcial, setEsParcial] = useState(false);
  const [formData, setFormData] = useState({
    tipo: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    hectareas: '',
    costoPorHa: '',
    moneda: 'ARS',
    campoId: '',
    lotesIds: [] as string[],
    maquinariaId: '',
    contratistaId: '',
    variedad: '',
    tipoFertilizante: '',
    dosisKgHa: '',
    unidadDosis: 'kg/ha',
    caldo: '',
    productos: [] as Array<{ stockId: string; producto: string; cantidad: string; unidad: string }>,
    facturable: true,
  });

  useEffect(() => {
    fetchData();

    // Recargar datos cuando la página vuelve a estar visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (formData.campoId) {
      fetchLotesByCampo(formData.campoId);
    } else {
      setLotes([]);
      setFormData(prev => ({ ...prev, lotesIds: [], hectareas: '' }));
    }
  }, [formData.campoId]);

  useEffect(() => {
    const tiposConLotesMultiples = ['Siembra', 'Cosecha', 'Fertilización', 'Picado', 'Rastra', 'Pulverización'];
    if (!esParcial && formData.lotesIds.length > 0 && tiposConLotesMultiples.includes(formData.tipo)) {
      const lotesSeleccionados = lotes.filter(l => formData.lotesIds.includes(l.id));
      const totalHectareas = lotesSeleccionados.reduce((sum, lote) => sum + lote.hectareas, 0);
      setFormData(prev => ({ ...prev, hectareas: totalHectareas.toString() }));
    }
  }, [formData.lotesIds, formData.tipo, lotes, esParcial]);

  const fetchData = async () => {
    try {
      // Cargar TODO en paralelo incluyendo movimientos
      const [serviciosRes, camposRes, maquinariasRes, contratistasRes, stockRes, movimientosRes] = await Promise.all([
        api.get('/servicios'),
        api.get('/campos'),
        api.get('/maquinarias'),
        api.get('/contratistas'),
        api.get('/stock'),
        api.get('/stock/movimientos/agroquimicos').catch(err => {
          console.error('Error cargando movimientos de agroquímicos:', err);
          return { data: [] };
        }),
      ]);

      setServicios(serviciosRes.data);
      setCampos(camposRes.data);
      setMaquinarias(maquinariasRes.data);
      setContratistas(contratistasRes.data);

      const agroquimicos = stockRes.data.filter((item: Stock) => item.categoria === 'Agroquímicos');
      console.log('DEBUG: Stock de agroquímicos cargado:', agroquimicos);
      setStockItems(agroquimicos);
      setMovimientosStock(movimientosRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLotesByCampo = async (campoId: string) => {
    try {
      const response = await api.get(`/campos/${campoId}`);
      setLotes(response.data.lotes || []);
    } catch (error) {
      console.error('Error al cargar lotes:', error);
    }
  };

  const handleEdit = async (servicio: Servicio) => {
    // Primero cargar los lotes del campo
    if (servicio.campoId) {
      try {
        const response = await api.get(`/campos/${servicio.campoId}`);
        const lotesDelCampo = response.data.lotes || [];
        setLotes(lotesDelCampo);

        // Extraer nombres de lotes de la descripción y buscar sus IDs
        let lotesIdsExtraidos: string[] = [];
        let descripcionSinLotes = servicio.descripcion || '';
        const tiposConLotesMultiples = ['Siembra', 'Cosecha', 'Fertilización', 'Picado', 'Rastra', 'Pulverización'];

        if (tiposConLotesMultiples.includes(servicio.tipo) && servicio.descripcion?.includes('Lotes:')) {
          // Extraer nombres de lotes: "Lotes: lote1, lote2 - descripcion" -> "lote1, lote2"
          const partesDeLotes = servicio.descripcion.split('Lotes:')[1];
          const nombresLotesStr = partesDeLotes.includes(' - ')
            ? partesDeLotes.split(' - ')[0].trim()
            : partesDeLotes.trim();

          // Separar por comas y buscar IDs
          const nombresLotes = nombresLotesStr.split(',').map(n => n.trim());
          lotesIdsExtraidos = lotesDelCampo
            .filter((lote: any) => nombresLotes.includes(lote.nombre))
            .map((lote: any) => lote.id);

          // Extraer descripción adicional (después del " - ")
          if (partesDeLotes.includes(' - ')) {
            descripcionSinLotes = partesDeLotes.split(' - ')[1];
          } else {
            descripcionSinLotes = '';
          }
        } else {
          lotesIdsExtraidos = servicio.loteId ? [servicio.loteId] : [];
        }

        setFormData({
          tipo: servicio.tipo,
          fecha: new Date(servicio.fecha).toISOString().split('T')[0],
          descripcion: descripcionSinLotes,
          hectareas: servicio.hectareas?.toString() || '',
          costoPorHa: servicio.costoPorHa?.toString() || '',
          moneda: servicio.moneda,
          campoId: servicio.campoId,
          lotesIds: lotesIdsExtraidos,
          maquinariaId: servicio.maquinariaId || '',
          contratistaId: servicio.contratistaId || '',
          variedad: servicio.variedad || '',
          tipoFertilizante: servicio.tipoFertilizante || '',
          dosisKgHa: servicio.dosisKgHa?.toString() || '',
          unidadDosis: servicio.unidadDosis || 'kg/ha',
          caldo: servicio.caldo?.toString() || '',
          productos: servicio.receta ? JSON.parse(servicio.receta) : [],
          facturable: servicio.facturable !== undefined ? servicio.facturable : true,
        });
        setEditingId(servicio.id);
        setShowForm(true);
      } catch (error) {
        console.error('Error al cargar lotes:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend: any = {
        tipo: formData.tipo,
        fecha: new Date(formData.fecha).toISOString(),
        hectareas: formData.hectareas ? parseFloat(formData.hectareas) : undefined,
        costoPorHa: formData.costoPorHa ? parseFloat(formData.costoPorHa) : undefined,
        moneda: formData.moneda,
        campoId: formData.campoId,
        loteId: formData.lotesIds[0] || undefined,
        maquinariaId: formData.maquinariaId || undefined,
        contratistaId: formData.contratistaId || undefined,
        facturable: formData.facturable,
      };

      // Para tipos con lotes múltiples, enviar todos los lotes seleccionados en la descripción
      const tiposConLotesMultiples = ['Siembra', 'Cosecha', 'Fertilización', 'Picado', 'Rastra', 'Pulverización'];
      if (tiposConLotesMultiples.includes(formData.tipo) && formData.lotesIds.length > 0) {
        const lotesSeleccionados = lotes.filter(l => formData.lotesIds.includes(l.id));
        const nombresLotes = lotesSeleccionados.map(l => l.nombre).join(', ');
        dataToSend.descripcion = `Lotes: ${nombresLotes}${formData.descripcion ? ' - ' + formData.descripcion : ''}`;
        if (formData.tipo === 'Siembra') {
          dataToSend.variedad = formData.variedad;
        }
        if (formData.tipo === 'Fertilización') {
          dataToSend.tipoFertilizante = formData.tipoFertilizante;
          dataToSend.dosisKgHa = formData.dosisKgHa ? parseFloat(formData.dosisKgHa) : undefined;
          dataToSend.unidadDosis = formData.unidadDosis;
        }
        if (formData.tipo === 'Pulverización') {
          dataToSend.caldo = formData.caldo ? parseFloat(formData.caldo) : undefined;
          dataToSend.receta = JSON.stringify(formData.productos);

          // Validar stock disponible antes de crear (solo advertencia)
          if (!editingId && formData.productos.length > 0 && formData.hectareas) {
            const hectareas = parseFloat(formData.hectareas);
            const productosInsuficientes: string[] = [];

            for (const producto of formData.productos) {
              const stock = stockItems.find(s => s.id === producto.stockId);
              const cantidadNecesaria = parseFloat(producto.cantidad) * hectareas;

              if (stock && stock.cantidad < cantidadNecesaria) {
                productosInsuficientes.push(
                  `${producto.producto}: necesita ${cantidadNecesaria.toFixed(2)} ${producto.unidad.split('/')[0]}, disponible ${stock.cantidad.toFixed(2)} ${producto.unidad.split('/')[0]}`
                );
              }
            }

            if (productosInsuficientes.length > 0) {
              const mensaje = `ADVERTENCIA: Stock insuficiente para:\n\n${productosInsuficientes.join('\n')}\n\n¿Desea crear la orden de todas formas? El stock quedará en negativo.`;
              if (!confirm(mensaje)) {
                return;
              }
            }
          }
        }
      } else {
        dataToSend.descripcion = formData.descripcion;
      }

      if (editingId) {
        // Editar servicio existente
        await api.put(`/servicios/${editingId}`, dataToSend);
      } else {
        // Crear nuevo servicio
        await api.post('/servicios', dataToSend);
      }

      setShowForm(false);
      setEditingId(null);
      setEsParcial(false);
      setFormData({
        tipo: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
        hectareas: '',
        costoPorHa: '',
        moneda: 'ARS',
        campoId: '',
        lotesIds: [],
        maquinariaId: '',
        contratistaId: '',
        variedad: '',
        tipoFertilizante: '',
        dosisKgHa: '',
        unidadDosis: 'kg/ha',
        caldo: '',
        facturable: true,
        productos: [],
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || `Error al ${editingId ? 'actualizar' : 'crear'} servicio`);
    }
  };

  // Calcular total automáticamente
  const calcularTotal = () => {
    const hectareas = parseFloat(formData.hectareas);
    const costoPorHa = parseFloat(formData.costoPorHa);
    if (hectareas && costoPorHa) {
      return (hectareas * costoPorHa).toFixed(2);
    }
    return '0.00';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este servicio?')) return;
    try {
      await api.delete(`/servicios/${id}`);
      fetchData();
    } catch (error) {
      alert('Error al eliminar servicio');
    }
  };

  const handleGuardarNuevoProducto = async () => {
    try {
      const nuevoStock = {
        nombre: nuevoProducto.nombre,
        categoria: 'Agroquímicos',
        cantidad: parseFloat(nuevoProducto.cantidad),
        unidad: nuevoProducto.unidad,
        precioUnitario: nuevoProducto.precioUnitario ? parseFloat(nuevoProducto.precioUnitario) : undefined,
      };

      const response = await api.post('/stock', nuevoStock);

      // Actualizar la lista de stock
      setStockItems(prev => [...prev, response.data]);

      // Cerrar modal y resetear form
      setShowNuevoProductoModal(false);
      setNuevoProducto({
        nombre: '',
        cantidad: '0',
        unidad: 'litros',
        precioUnitario: '',
      });
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al crear producto');
    }
  };

  const handleEstadoChange = async (id: string, nuevoEstado: string) => {
    // Si se intenta marcar como REALIZADO, validar stock
    if (nuevoEstado === 'REALIZADO') {
      const servicio = servicios.find(s => s.id === id);
      if (servicio) {
        const stockCheck = calcularStockDisponible(servicio);
        if (!stockCheck.suficiente) {
          const faltantes = stockCheck.detalles
            .filter(d => !d.suficiente)
            .map(d => `${d.producto}: Faltan ${(d.necesario - d.disponible).toFixed(2)} ${d.unidad}`)
            .join('\n');
          alert(`No se puede marcar como REALIZADO.\n\nStock insuficiente:\n${faltantes}`);
          return;
        }
      }
    }

    try {
      await api.patch(`/servicios/${id}`, { estado: nuevoEstado });
      fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al actualizar el estado';
      alert(errorMessage);
    }
  };

  // Calcular si hay stock suficiente para un servicio de pulverización
  // Verifica si hay stock disponible para realizar este servicio
  // IMPORTANTE: El stock ya fue descontado cuando se creó la orden pendiente
  // Esta función solo muestra si el stock actual es positivo o negativo
  const calcularStockDisponible = (servicio: Servicio) => {
    if (servicio.tipo !== 'Pulverización' || !servicio.receta || !servicio.hectareas) {
      return { suficiente: true, detalles: [] };
    }

    try {
      const receta = JSON.parse(servicio.receta);
      const detalles: Array<{ producto: string; necesario: number; disponible: number; unidad: string; suficiente: boolean }> = [];
      let todoSuficiente = true;

      for (const item of receta) {
        if (item.stockId) {
          const stock = stockItems.find(s => s.id === item.stockId);
          if (stock) {
            const dosisHa = parseFloat(item.cantidad);
            const cantidadNecesaria = dosisHa * servicio.hectareas;
            const unidadBase = item.unidad.split('/')[0];

            // El stock ya fue descontado cuando se creó esta orden
            // Si el stock es negativo, significa que falta reponerlo
            const suficiente = stock.cantidad >= 0;

            detalles.push({
              producto: item.producto,
              necesario: cantidadNecesaria,
              disponible: stock.cantidad,
              unidad: unidadBase,
              suficiente,
            });

            if (!suficiente) {
              todoSuficiente = false;
            }
          }
        }
      }

      return { suficiente: todoSuficiente, detalles };
    } catch (error) {
      return { suficiente: true, detalles: [] };
    }
  };

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      Siembra: 'bg-green-100 text-green-800',
      Fumigación: 'bg-yellow-100 text-yellow-800',
      Cosecha: 'bg-orange-100 text-orange-800',
      Clasificación: 'bg-purple-100 text-purple-800',
      'Trabajos manuales': 'bg-blue-100 text-blue-800',
      Fertilización: 'bg-indigo-100 text-indigo-800',
      Riego: 'bg-cyan-100 text-cyan-800',
      Arado: 'bg-slate-100 text-slate-800',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getServiciosPorTipo = (tipo: string) => {
    return servicios.filter((s) => s.tipo === tipo);
  };

  const serviciosFiltrados = categoriaSeleccionada
    ? getServiciosPorTipo(categoriaSeleccionada)
    : servicios;

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  const handleQuickService = (tipo: string) => {
    setFormData({
      ...formData,
      tipo,
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {categoriaSeleccionada ? `Servicios > ${categoriaSeleccionada}` : 'Servicios'}
          </h1>
          <p className="text-gray-600 mt-2">Registro de trabajos realizados</p>
        </div>
        {categoriaSeleccionada && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCategoriaSeleccionada(null)}
              className="btn-secondary"
            >
              Volver a Categorías
            </button>
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (!showForm && categoriaSeleccionada) {
                  setFormData(prev => ({ ...prev, tipo: categoriaSeleccionada }));
                }
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>
                {['Siembra', 'Cosecha', 'Fertilización', 'Picado', 'Rastra', 'Pulverización'].includes(categoriaSeleccionada || '')
                  ? `Nueva Orden de ${categoriaSeleccionada}`
                  : 'Nuevo Servicio'}
              </span>
            </button>
          </div>
        )}
      </div>

      {!categoriaSeleccionada && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
          {categorias.map((categoria) => {
            const Icon = categoria.icon;
            const serviciosEnCategoria = getServiciosPorTipo(categoria.nombre);

            return (
              <div
                key={categoria.nombre}
                onClick={() => setCategoriaSeleccionada(categoria.nombre)}
                className="card cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col items-center text-center p-4">
                  <div className={`${categoria.color} p-4 rounded-lg mb-3`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{categoria.nombre}</h3>
                  <p className="text-sm text-gray-600">
                    {serviciosEnCategoria.length} {serviciosEnCategoria.length === 1 ? 'servicio' : 'servicios'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {categoriaSeleccionada && showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Servicio *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
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
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campo {formData.tipo === 'Siembra' && '*'}
                </label>
                <select
                  value={formData.campoId}
                  onChange={(e) => setFormData({ ...formData, campoId: e.target.value, lotesIds: [] })}
                  className="input"
                  required={formData.tipo === 'Siembra'}
                >
                  <option value="">Seleccionar...</option>
                  {campos.map((campo) => (
                    <option key={campo.id} value={campo.id}>
                      {campo.nombre}
                    </option>
                  ))}
                </select>
              </div>
              {['Siembra', 'Cosecha', 'Fertilización', 'Picado', 'Rastra', 'Pulverización'].includes(formData.tipo) ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lotes * (Seleccionar uno o más)
                  </label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                    {!formData.campoId ? (
                      <p className="text-sm text-gray-500">Primero selecciona un campo</p>
                    ) : lotes.length === 0 ? (
                      <p className="text-sm text-gray-500">No hay lotes disponibles en este campo</p>
                    ) : (
                      lotes.map((lote) => (
                        <label key={lote.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={formData.lotesIds.includes(lote.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, lotesIds: [...formData.lotesIds, lote.id] });
                              } else {
                                setFormData({ ...formData, lotesIds: formData.lotesIds.filter(id => id !== lote.id) });
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm font-medium">{lote.nombre}</span>
                          <span className="text-xs text-gray-500">({lote.hectareas} ha)</span>
                        </label>
                      ))
                    )}
                  </div>
                  {['Siembra', 'Cosecha', 'Fertilización', 'Picado', 'Rastra', 'Pulverización'].includes(formData.tipo) && formData.lotesIds.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Debes seleccionar al menos un lote</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lote (opcional)
                  </label>
                  <select
                    value={formData.lotesIds[0] || ''}
                    onChange={(e) => setFormData({ ...formData, lotesIds: e.target.value ? [e.target.value] : [] })}
                    className="input"
                    disabled={!formData.campoId}
                  >
                    <option value="">Ninguno</option>
                    {lotes.map((lote) => (
                      <option key={lote.id} value={lote.id}>
                        {lote.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {formData.tipo === 'Siembra' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variedad de Semilla *
                  </label>
                  <input
                    type="text"
                    value={formData.variedad}
                    onChange={(e) => setFormData({ ...formData, variedad: e.target.value })}
                    className="input"
                    required
                    placeholder="Ej: DM 4670"
                  />
                </div>
              )}
              {formData.tipo === 'Fertilización' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Fertilizante *
                    </label>
                    <input
                      type="text"
                      value={formData.tipoFertilizante}
                      onChange={(e) => setFormData({ ...formData, tipoFertilizante: e.target.value })}
                      className="input"
                      required
                      placeholder="Ej: Urea, NPK, Fosfato"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dosis *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.dosisKgHa}
                        onChange={(e) => setFormData({ ...formData, dosisKgHa: e.target.value })}
                        className="input"
                        required
                        placeholder="Ej: 150"
                      />
                      <select
                        value={formData.unidadDosis}
                        onChange={(e) => setFormData({ ...formData, unidadDosis: e.target.value })}
                        className="input"
                        required
                      >
                        <option value="kg/ha">kg/ha</option>
                        <option value="kg/surco">kg/surco</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
              {formData.tipo === 'Pulverización' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Caldo (L/ha) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.caldo}
                      onChange={(e) => setFormData({ ...formData, caldo: e.target.value })}
                      className="input"
                      required
                      placeholder="Ej: 60"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receta de Productos *
                    </label>
                    <div className="space-y-3">
                      {formData.productos.map((producto, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            <select
                              value={producto.stockId}
                              onChange={(e) => {
                                if (e.target.value === '__nuevo__') {
                                  setShowNuevoProductoModal(true);
                                  return;
                                }
                                const newProductos = [...formData.productos];
                                const selectedStock = stockItems.find(s => s.id === e.target.value);
                                newProductos[index] = {
                                  ...newProductos[index],
                                  stockId: e.target.value,
                                  producto: selectedStock?.nombre || '',
                                };
                                setFormData({ ...formData, productos: newProductos });
                              }}
                              className="input text-sm"
                              required
                            >
                              <option value="">Seleccionar producto</option>
                              <option value="__nuevo__" className="text-blue-600 font-semibold">+ Agregar nuevo producto</option>
                              {stockItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              step="0.01"
                              value={producto.cantidad}
                              onChange={(e) => {
                                const newProductos = [...formData.productos];
                                newProductos[index].cantidad = e.target.value;
                                setFormData({ ...formData, productos: newProductos });
                              }}
                              className="input text-sm"
                              placeholder="Cantidad"
                              required
                            />
                          </div>
                          <div className="col-span-3">
                            <select
                              value={producto.unidad}
                              onChange={(e) => {
                                const newProductos = [...formData.productos];
                                newProductos[index].unidad = e.target.value;
                                setFormData({ ...formData, productos: newProductos });
                              }}
                              className="input text-sm"
                              required
                            >
                              <option value="L/ha">L/ha</option>
                              <option value="kg/ha">kg/ha</option>
                              <option value="g/ha">g/ha</option>
                            </select>
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                const newProductos = formData.productos.filter((_, i) => i !== index);
                                setFormData({ ...formData, productos: newProductos });
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            productos: [...formData.productos, { stockId: '', producto: '', cantidad: '', unidad: 'L/ha' }]
                          });
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" /> Agregar Producto
                      </button>
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contratista (opcional)
                </label>
                <select
                  value={formData.contratistaId}
                  onChange={(e) => setFormData({ ...formData, contratistaId: e.target.value })}
                  className="input"
                >
                  <option value="">Ninguno</option>
                  {contratistas.map((contratista) => (
                    <option key={contratista.id} value={contratista.id}>
                      {contratista.nombre} {contratista.apellido} {contratista.empresa && `(${contratista.empresa})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maquinaria (opcional)
                </label>
                <select
                  value={formData.maquinariaId}
                  onChange={(e) => setFormData({ ...formData, maquinariaId: e.target.value })}
                  className="input"
                >
                  <option value="">Ninguna</option>
                  {maquinarias.map((maquinaria) => (
                    <option key={maquinaria.id} value={maquinaria.id}>
                      {maquinaria.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hectáreas
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hectareas}
                  onChange={(e) => setFormData({ ...formData, hectareas: e.target.value })}
                  className="input"
                  placeholder="0.00"
                  readOnly={!esParcial && ['Siembra', 'Cosecha', 'Fertilización', 'Picado', 'Rastra', 'Pulverización'].includes(formData.tipo)}
                  disabled={!esParcial && ['Siembra', 'Cosecha', 'Fertilización', 'Picado', 'Rastra', 'Pulverización'].includes(formData.tipo)}
                />
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    id="parcial"
                    checked={esParcial}
                    onChange={(e) => setEsParcial(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="parcial" className="text-sm text-gray-600">
                    Parcial (trabajar sobre una fracción del lote)
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda
                </label>
                <select
                  value={formData.moneda}
                  onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                  className="input"
                >
                  <option value="ARS">Pesos (ARS)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Costo por Hectárea
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costoPorHa}
                  onChange={(e) => setFormData({ ...formData, costoPorHa: e.target.value })}
                  className="input"
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="facturable"
                  checked={formData.facturable}
                  onChange={(e) => setFormData({ ...formData, facturable: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="facturable" className="text-sm font-medium text-gray-700">
                  Facturable (marque si este servicio debe poder facturarse)
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Calculado
                </label>
                <div className="input bg-gray-50 flex items-center font-semibold text-green-700">
                  {formData.moneda === 'USD' ? '$' : '$'} {calcularTotal()}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Detalles del servicio..."
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="btn-primary"
                disabled={['Siembra', 'Cosecha', 'Fertilización', 'Picado', 'Rastra', 'Pulverización'].includes(formData.tipo) && formData.lotesIds.length === 0}
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setEsParcial(false);
                  setFormData({
                    tipo: '',
                    fecha: new Date().toISOString().split('T')[0],
                    descripcion: '',
                    hectareas: '',
                    costoPorHa: '',
                    moneda: 'ARS',
                    campoId: '',
                    lotesIds: [],
                    maquinariaId: '',
                    contratistaId: '',
                    variedad: '',
                    tipoFertilizante: '',
                    dosisKgHa: '',
                    unidadDosis: 'kg/ha',
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

      {categoriaSeleccionada && (
        <div className="space-y-1.5">
          {serviciosFiltrados.map((servicio) => (
          <div key={servicio.id} className="card py-1.5 px-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-1.5 mb-1">
                  <div className="bg-purple-100 p-0.5 rounded">
                    <Wrench className="w-2.5 h-2.5 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getTipoColor(servicio.tipo)}`}>
                        {servicio.tipo}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center">
                        <Calendar className="w-2.5 h-2.5 mr-0.5" />
                        {formatFecha(servicio.fecha)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5 mt-0.5">
                  {servicio.campo && (
                    <div>
                      <p className="text-xs text-gray-500 flex items-center">
                        <MapPin className="w-2.5 h-2.5 mr-0.5" />
                        Campo
                      </p>
                      <p className="font-medium text-xs">{servicio.campo.nombre}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500">Lote{servicio.descripcion?.includes('Lotes:') ? 's' : ''}</p>
                    <p className="font-medium text-xs">
                      {servicio.descripcion?.includes('Lotes:')
                        ? servicio.descripcion.split('Lotes:')[1].split('-')[0].trim()
                        : servicio.lote?.nombre || '-'
                      }
                    </p>
                  </div>

                  {servicio.maquinaria && (
                    <div>
                      <p className="text-xs text-gray-500">Maquinaria</p>
                      <p className="font-medium text-xs">{servicio.maquinaria.nombre}</p>
                    </div>
                  )}

                  {servicio.contratista && (
                    <div>
                      <p className="text-xs text-gray-500">Contratista</p>
                      <p className="font-medium text-xs">
                        {servicio.contratista.nombre} {servicio.contratista.apellido}
                        {servicio.contratista.empresa && <span className="text-xs text-gray-500"> ({servicio.contratista.empresa})</span>}
                      </p>
                    </div>
                  )}

                  {servicio.hectareas && (
                    <div>
                      <p className="text-xs text-gray-500">Hectáreas</p>
                      <p className="font-medium text-xs">{servicio.hectareas} ha</p>
                    </div>
                  )}

                  {servicio.variedad && (
                    <div>
                      <p className="text-xs text-gray-500">Variedad</p>
                      <p className="font-medium text-xs">{servicio.variedad}</p>
                    </div>
                  )}

                  {servicio.tipoFertilizante && (
                    <div>
                      <p className="text-xs text-gray-500">Tipo de Fertilizante</p>
                      <p className="font-medium text-xs">{servicio.tipoFertilizante}</p>
                    </div>
                  )}

                  {servicio.dosisKgHa && (
                    <div>
                      <p className="text-xs text-gray-500">Dosis</p>
                      <p className="font-medium text-xs">{servicio.dosisKgHa} {servicio.unidadDosis || 'kg/ha'}</p>
                    </div>
                  )}

                  {servicio.tipo === 'Pulverización' && servicio.caldo && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-500">Caldo</p>
                      <p className="font-medium text-xs">{servicio.caldo} L/ha</p>
                    </div>
                  )}

                  {servicio.tipo === 'Pulverización' && servicio.receta && (
                    <div className="md:col-span-2 border-t pt-1 mt-1">
                      <p className="text-xs text-gray-500 font-semibold mb-0.5">Receta:</p>
                      <div className="space-y-0.5">
                        {JSON.parse(servicio.receta).map((item: any, index: number) => {
                          const cantidadPorHa = parseFloat(item.cantidad);
                          const totalHectareas = servicio.hectareas || 0;
                          const totalCantidad = cantidadPorHa * totalHectareas;
                          const unidadBase = item.unidad.split('/')[0];

                          // El stock actual ya tiene descontada esta orden
                          // Si el stock es negativo, significa que falta reponerlo
                          const stock = stockItems.find(s => s.id === item.stockId);
                          const stockActual = stock ? stock.cantidad : 0;

                          // DEBUG: Ver qué stock está encontrando
                          console.log('=== DEBUG STOCK ===');
                          console.log('Producto:', item.producto);
                          console.log('Stock ID:', item.stockId);
                          console.log('Stock encontrado:', stock);
                          console.log('Stock actual cantidad:', stockActual);
                          console.log('Es negativo?:', stockActual < 0);
                          console.log('==================');

                          // Si el stock es negativo, calcular cuánto falta para llegar a 0
                          const faltante = stockActual < 0 ? Math.abs(stockActual) : 0;
                          const hayInsuficiente = stockActual < 0;

                          return (
                            <div key={index} className={`flex justify-between items-center text-xs px-1.5 py-1 rounded ${hayInsuficiente ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                              <span className="font-medium text-xs">{item.producto}</span>
                              <div className="flex flex-col items-end">
                                <span className="text-xs text-gray-600">
                                  {cantidadPorHa} {item.unidad} → {totalCantidad.toFixed(2)} {unidadBase} totales
                                </span>
                                {hayInsuficiente && (
                                  <span className="text-xs text-red-600 font-semibold">
                                    Faltan {faltante.toFixed(2)} {unidadBase} para realizar este trabajo
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {servicio.costoPorHa && (
                    <div>
                      <p className="text-xs text-gray-500">Costo por Ha</p>
                      <p className="font-medium text-xs text-blue-600">
                        {servicio.moneda} ${servicio.costoPorHa.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}

                  {servicio.total && (
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="font-medium text-xs text-green-600">
                        {servicio.moneda} ${servicio.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}

                  {servicio.usuario && (
                    <div>
                      <p className="text-xs text-gray-500">Registrado por</p>
                      <p className="font-medium text-xs">
                        {servicio.usuario.nombre} {servicio.usuario.apellido}
                      </p>
                    </div>
                  )}
                </div>

                {servicio.descripcion && !servicio.descripcion.startsWith('Lotes:') && (
                  <p className="text-xs text-gray-600 mt-1.5 pt-1.5 border-t">
                    {servicio.descripcion}
                  </p>
                )}
                {servicio.descripcion?.includes('Lotes:') && servicio.descripcion.includes(' - ') && (
                  <p className="text-xs text-gray-600 mt-1.5 pt-1.5 border-t">
                    {servicio.descripcion.split(' - ')[1]}
                  </p>
                )}

                {/* Botones de Estado */}
                <div className="flex flex-col space-y-1.5 mt-2 pt-1.5 border-t">
                  <div className="flex space-x-1.5">
                    <button
                      onClick={() => handleEstadoChange(servicio.id, 'PENDIENTE')}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg transition-colors ${
                        servicio.estado === 'PENDIENTE'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span className="text-xs font-medium">Pendiente</span>
                    </button>
                    <button
                      onClick={() => handleEstadoChange(servicio.id, 'REALIZADO')}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg transition-colors ${
                        servicio.estado === 'REALIZADO'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span className="text-xs font-medium">Realizado</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleEdit(servicio)}
                  className="text-blue-500 hover:text-blue-700"
                  title="Editar servicio"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(servicio.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Eliminar servicio"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {!categoriaSeleccionada && servicios.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No hay servicios registrados. Crea uno para comenzar.
        </div>
      )}

      {categoriaSeleccionada && serviciosFiltrados.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No hay servicios de {categoriaSeleccionada.toLowerCase()}. Crea uno para comenzar.
        </div>
      )}

      {/* Modal para Agregar Nuevo Producto */}
      {showNuevoProductoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Agregar Nuevo Producto</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={nuevoProducto.nombre}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                  className="input"
                  placeholder="Ej: Glifosato, 2,4-D, etc."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidad
                </label>
                <select
                  value={nuevoProducto.unidad}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, unidad: e.target.value })}
                  className="input"
                >
                  <option value="litros">Litros</option>
                  <option value="kg">Kilogramos</option>
                  <option value="gramos">Gramos</option>
                  <option value="unidades">Unidades</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleGuardarNuevoProducto}
                className="btn-primary flex-1"
                disabled={!nuevoProducto.nombre}
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setShowNuevoProductoModal(false);
                  setNuevoProducto({
                    nombre: '',
                    cantidad: '0',
                    unidad: 'litros',
                    precioUnitario: '',
                  });
                }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
