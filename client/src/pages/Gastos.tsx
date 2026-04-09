// @ts-nocheck
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/apiWithCache';
import { Gasto, GastoAgrupado, Campo, Maquinaria, Cuenta } from '../types';
import { Plus, DollarSign, Trash2, Calendar, Edit } from 'lucide-react';

export default function Gastos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [maquinarias, setMaquinarias] = useState<Maquinaria[]>([]);
  const [implementos, setImplementos] = useState<Maquinaria[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    concepto: '',
    categoria: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    tipoFactura: '',
    numeroFactura: '',
    campoId: '',
    campoIds: [] as string[],
    loteIds: [] as string[],
    maquinariaId: '',
    implementoId: '',
    cuentaId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && gastos.length > 0) {
      const gastoToEdit = gastos.find(g => g.id === editId);
      if (gastoToEdit) {
        handleEdit(gastoToEdit);
        // Limpiar el parámetro de la URL
        setSearchParams({});
      }
    }
  }, [searchParams, gastos]);

  const fetchData = async () => {
    try {
      const [gastosRes, camposRes, maquinariasRes, cuentasRes] = await Promise.all([
        api.get('/gastos'),
        api.get('/campos'),
        api.get('/maquinarias'),
        api.get('/cuentas'),
      ]);
      setGastos(gastosRes.data);
      setCampos(camposRes.data);

      // Separar maquinarias e implementos
      const todasMaquinarias = maquinariasRes.data;
      const maquinariasFilter = todasMaquinarias.filter((m: Maquinaria) =>
        ['Tractor', 'Camión', 'Camioneta', 'Moto', 'Cuatriciclo', 'Pulverizadora'].includes(m.tipo)
      );
      const implementosFilter = todasMaquinarias.filter((m: Maquinaria) =>
        ['Desmalezadora', 'Rastra', 'Sembradora', 'Carro', 'Embolsadora', 'Extractora', 'Chimango'].includes(m.tipo)
      );

      setMaquinarias(maquinariasFilter);
      setImplementos(implementosFilter);
      setCuentas(cuentasRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLotesPorCampo = async (campoId: string) => {
    if (!campoId) {
      setLotes([]);
      return;
    }
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
      const data = {
        concepto: formData.concepto,
        categoria: formData.categoria,
        monto: parseFloat(formData.monto),
        fecha: new Date(formData.fecha).toISOString(),
        descripcion: formData.descripcion || undefined,
        tipoFactura: formData.tipoFactura || undefined,
        numeroFactura: formData.numeroFactura || undefined,
        // Si hay múltiples campos, no enviar campoId ni loteIds
        campoId: formData.campoIds.length > 0 ? undefined : (formData.campoId || undefined),
        campoIds: formData.campoIds.length > 0 ? formData.campoIds : undefined,
        loteIds: formData.campoIds.length > 0 ? undefined : (formData.loteIds.length > 0 ? formData.loteIds : undefined),
        maquinariaId: formData.maquinariaId || undefined,
        implementoId: formData.implementoId || undefined,
        cuentaId: formData.cuentaId || undefined,
      };

      if (editingId) {
        await api.put(`/gastos/${editingId}`, data);
      } else {
        await api.post('/gastos', data);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        concepto: '',
        categoria: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
        tipoFactura: '',
        numeroFactura: '',
        campoId: '',
        campoIds: [],
        loteIds: [],
        maquinariaId: '',
        implementoId: '',
        cuentaId: '',
      });
      setLotes([]);
      fetchData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error
        ? (typeof error.response.data.error === 'string'
            ? error.response.data.error
            : JSON.stringify(error.response.data.error))
        : `Error al ${editingId ? 'actualizar' : 'crear'} gasto`;
      alert(errorMsg);
      console.error('Error completo:', error);
      console.error('Response:', error.response);
    }
  };

  const handleEdit = (gasto: Gasto) => {
    setEditingId(gasto.id);
    setFormData({
      concepto: gasto.concepto,
      categoria: gasto.categoria,
      monto: gasto.monto.toString(),
      fecha: new Date(gasto.fecha).toISOString().split('T')[0],
      descripcion: gasto.descripcion || '',
      tipoFactura: gasto.tipoFactura || '',
      numeroFactura: gasto.numeroFactura || '',
      campoId: gasto.campoId || '',
      campoIds: [],
      loteIds: gasto.lotes?.map(gl => gl.lote.id) || [],
      maquinariaId: gasto.maquinariaId || '',
      implementoId: gasto.implementoId || '',
      cuentaId: gasto.cuentaId || '',
    });
    if (gasto.campoId) {
      fetchLotesPorCampo(gasto.campoId);
    }
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
    try {
      await api.delete(`/gastos/${id}`);
      fetchData();
    } catch (error) {
      alert('Error al eliminar gasto');
    }
  };

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      Combustible: 'bg-yellow-100 text-yellow-800',
      Mantenimiento: 'bg-blue-100 text-blue-800',
      Insumos: 'bg-green-100 text-green-800',
      Salarios: 'bg-purple-100 text-purple-800',
      Servicios: 'bg-orange-100 text-orange-800',
      Otros: 'bg-gray-100 text-gray-800',
    };
    return colors[categoria] || 'bg-gray-100 text-gray-800';
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.monto, 0);

  // Agrupar gastos por grupoId para mostrar como tarjeta única
  const gastosAgrupados: (Gasto | GastoAgrupado)[] = (() => {
    const grupoMap = new Map<string, Gasto[]>();
    const sinGrupo: Gasto[] = [];

    for (const gasto of gastos) {
      if (gasto.grupoId) {
        const arr = grupoMap.get(gasto.grupoId) || [];
        arr.push(gasto);
        grupoMap.set(gasto.grupoId, arr);
      } else {
        sinGrupo.push(gasto);
      }
    }

    const items: (Gasto | GastoAgrupado)[] = [...sinGrupo];

    for (const [grupoId, gastosDelGrupo] of grupoMap) {
      if (gastosDelGrupo.length === 1) {
        items.push(gastosDelGrupo[0]);
      } else {
        const primero = gastosDelGrupo[0];
        items.push({
          grupoId,
          concepto: primero.concepto,
          categoria: primero.categoria,
          montoTotal: gastosDelGrupo.reduce((sum, g) => sum + g.monto, 0),
          fecha: primero.fecha,
          tipoFactura: primero.tipoFactura,
          numeroFactura: primero.numeroFactura,
          cuenta: primero.cuenta,
          maquinaria: primero.maquinaria,
          implemento: primero.implemento,
          usuario: primero.usuario,
          gastos: gastosDelGrupo,
        });
      }
    }

    items.sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      return fechaB - fechaA;
    });

    return items;
  })();

  const esGastoAgrupado = (item: Gasto | GastoAgrupado): item is GastoAgrupado => {
    return 'gastos' in item && 'montoTotal' in item;
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gastos</h1>
          <p className="text-gray-600 mt-2">Seguimiento de gastos operativos</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Gasto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center space-x-3">
            <div className="bg-red-500 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-red-700">Total Gastos</p>
              <p className="text-2xl font-bold text-red-900">
                ${totalGastos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <p className="text-sm text-gray-600">Total de registros</p>
          <p className="text-2xl font-bold text-gray-900">{gastos.length}</p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-600">Promedio por gasto</p>
          <p className="text-2xl font-bold text-gray-900">
            ${gastos.length > 0 ? (totalGastos / gastos.length).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0.00'}
          </p>
        </div>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">{editingId ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Concepto *
                </label>
                <input
                  type="text"
                  list="conceptos-sugeridos"
                  value={formData.concepto}
                  onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                  className="input"
                  required
                  placeholder="Ej: Compra de combustible"
                />
                <datalist id="conceptos-sugeridos">
                  {[...new Set(
                    gastos
                      .filter(g => formData.categoria ? g.categoria === formData.categoria : true)
                      .map(g => g.concepto)
                  )].map(concepto => (
                    <option key={concepto} value={concepto} />
                  ))}
                </datalist>
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
                  <option value="Combustible">Combustible</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Insumos">Insumos</option>
                  <option value="Salarios">Salarios</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="input"
                  required
                  placeholder="$"
                />
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
                  Tipo de Comprobante (opcional)
                </label>
                <select
                  value={formData.tipoFactura}
                  onChange={(e) => setFormData({ ...formData, tipoFactura: e.target.value })}
                  className="input"
                >
                  <option value="">Seleccionar...</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="COMPROBANTE INTERNO">COMPROBANTE INTERNO</option>
                  <option value="Sin Factura">Sin Factura</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Factura (opcional)
                </label>
                <input
                  type="text"
                  value={formData.numeroFactura}
                  onChange={(e) => setFormData({ ...formData, numeroFactura: e.target.value })}
                  className="input"
                  placeholder="Ej: 0001-00012345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campo (opcional)
                </label>
                <select
                  value={formData.campoId}
                  onChange={(e) => {
                    setFormData({ ...formData, campoId: e.target.value, loteIds: [], campoIds: [] });
                    fetchLotesPorCampo(e.target.value);
                  }}
                  className="input"
                >
                  <option value="">Ninguno</option>
                  {campos.map((campo) => (
                    <option key={campo.id} value={campo.id}>
                      {campo.nombre}
                    </option>
                  ))}
                </select>
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campos (opcional - seleccionar múltiples)
                  </label>
                  <div className="border rounded-md p-3 bg-white">
                    {campos.length === 0 ? (
                      <p className="text-sm text-gray-500">No hay campos disponibles</p>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {campos.map((campo) => (
                          <label key={campo.id} className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={formData.campoIds.includes(campo.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, campoIds: [...formData.campoIds, campo.id], campoId: '', loteIds: [] });
                                  } else {
                                    setFormData({ ...formData, campoIds: formData.campoIds.filter(id => id !== campo.id) });
                                  }
                                }}
                                className="rounded text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm font-medium">{campo.nombre}</span>
                            </div>
                            <span className="text-xs text-gray-500">{campo.hectareas} ha</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.campoIds.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <p className="text-xs font-medium text-blue-900 mb-1">Distribución del gasto:</p>
                      <div className="text-xs text-blue-700 space-y-1">
                        {(() => {
                          const camposSeleccionados = campos.filter(c => formData.campoIds.includes(c.id));
                          const totalHectareas = camposSeleccionados.reduce((sum, c) => sum + c.hectareas, 0);
                          const montoTotal = parseFloat(formData.monto) || 0;
                          return camposSeleccionados.map(campo => {
                            const proporcion = campo.hectareas / totalHectareas;
                            const montoAsignado = montoTotal * proporcion;
                            return (
                              <div key={campo.id} className="flex justify-between">
                                <span>{campo.nombre}:</span>
                                <span className="font-medium">
                                  ${montoAsignado.toFixed(2)} ({(proporcion * 100).toFixed(1)}%)
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {formData.campoIds.length === 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lotes (opcional - seleccionar múltiples)
                  </label>
                  <div className={`border rounded-md p-3 ${!formData.campoId ? 'bg-gray-50' : 'bg-white'}`}>
                    {!formData.campoId ? (
                      <p className="text-sm text-gray-500">Selecciona un campo primero</p>
                    ) : lotes.length === 0 ? (
                      <p className="text-sm text-gray-500">No hay lotes disponibles</p>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {lotes.map((lote) => (
                          <label key={lote.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={formData.loteIds.includes(lote.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, loteIds: [...formData.loteIds, lote.id] });
                                } else {
                                  setFormData({ ...formData, loteIds: formData.loteIds.filter(id => id !== lote.id) });
                                }
                              }}
                              className="rounded text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm">{lote.nombre}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                      {maquinaria.nombre} ({maquinaria.tipo})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Implemento (opcional)
                </label>
                <select
                  value={formData.implementoId}
                  onChange={(e) => setFormData({ ...formData, implementoId: e.target.value })}
                  className="input"
                >
                  <option value="">Ninguno</option>
                  {implementos.map((implemento) => (
                    <option key={implemento.id} value={implemento.id}>
                      {implemento.nombre} ({implemento.tipo})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuenta *
                </label>
                <select
                  value={formData.cuentaId}
                  onChange={(e) => setFormData({ ...formData, cuentaId: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {cuentas.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.nombre}
                    </option>
                  ))}
                </select>
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
                  placeholder="Detalles adicionales..."
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn-primary">
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    concepto: '',
                    categoria: '',
                    monto: '',
                    fecha: new Date().toISOString().split('T')[0],
                    descripcion: '',
                    tipoFactura: '',
                    numeroFactura: '',
                    campoId: '',
                    loteIds: [],
                    maquinariaId: '',
                    implementoId: '',
                    cuentaId: '',
                  });
                  setLotes([]);
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {gastosAgrupados.map((item) =>
          esGastoAgrupado(item) ? (
            /* TARJETA AGRUPADA */
            <div key={item.grupoId} className="card border-l-4 border-l-blue-400">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <DollarSign className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {item.concepto}
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Distribuido en {item.gastos.length} campos
                      </span>
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoriaColor(item.categoria)}`}>
                        {item.categoria}
                      </span>
                      <span className="text-sm text-gray-600 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatFecha(item.fecha)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="text-sm text-gray-600">Monto Total</p>
                    <p className="text-xl font-bold text-red-600">
                      ${item.montoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {item.maquinaria && (
                    <div>
                      <p className="text-sm text-gray-600">Maquinaria</p>
                      <p className="font-medium">{item.maquinaria.nombre}</p>
                    </div>
                  )}

                  {item.implemento && (
                    <div>
                      <p className="text-sm text-gray-600">Implemento</p>
                      <p className="font-medium">{item.implemento.nombre}</p>
                    </div>
                  )}

                  {item.tipoFactura && (
                    <div>
                      <p className="text-sm text-gray-600">Tipo de Factura</p>
                      <p className="font-medium">{item.tipoFactura}</p>
                    </div>
                  )}

                  {item.numeroFactura && (
                    <div>
                      <p className="text-sm text-gray-600">N° de Factura</p>
                      <p className="font-medium">{item.numeroFactura}</p>
                    </div>
                  )}

                  {item.cuenta && (
                    <div>
                      <p className="text-sm text-gray-600">Cuenta</p>
                      <p className="font-medium">{item.cuenta.nombre}</p>
                    </div>
                  )}

                  {item.usuario && (
                    <div>
                      <p className="text-sm text-gray-600">Registrado por</p>
                      <p className="font-medium">
                        {item.usuario.nombre} {item.usuario.apellido}
                      </p>
                    </div>
                  )}
                </div>

                {/* Desglose por campo */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Distribución por campo:</p>
                  <div className="space-y-1 text-sm">
                    {item.gastos.map((g, idx) => {
                      const porcentaje = item.montoTotal > 0
                        ? ((g.monto / item.montoTotal) * 100).toFixed(1)
                        : '0.0';
                      const esUltimo = idx === item.gastos.length - 1;
                      const prefijo = esUltimo ? '\u2514' : '\u251C';
                      return (
                        <div key={g.id} className="flex justify-between items-center text-gray-600 hover:bg-gray-50 px-2 py-1 rounded">
                          <span>
                            {prefijo} {g.campo?.nombre || 'Sin campo'}
                          </span>
                          <div className="flex items-center space-x-4">
                            <span className="font-medium text-gray-900">
                              ${g.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-gray-400 w-16 text-right">({porcentaje}%)</span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleEdit(g)}
                                className="text-blue-400 hover:text-blue-600"
                                title="Editar este registro"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(g.id)}
                                className="text-red-400 hover:text-red-600"
                                title="Eliminar este registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TARJETA INDIVIDUAL (sin grupo) */
            <div key={item.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <DollarSign className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{item.concepto}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoriaColor(item.categoria)}`}>
                          {item.categoria}
                        </span>
                        <span className="text-sm text-gray-600 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatFecha(item.fecha)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div>
                      <p className="text-sm text-gray-600">Monto</p>
                      <p className="text-xl font-bold text-red-600">
                        ${item.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {item.campo && (
                      <div>
                        <p className="text-sm text-gray-600">Campo</p>
                        <p className="font-medium">{item.campo.nombre}</p>
                      </div>
                    )}

                    {item.lotes && item.lotes.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600">Lotes</p>
                        <p className="font-medium">
                          {item.lotes.map(gl => gl.lote.nombre).join(', ')}
                        </p>
                      </div>
                    )}

                    {item.lote && (
                      <div>
                        <p className="text-sm text-gray-600">Lote</p>
                        <p className="font-medium">{item.lote.nombre}</p>
                      </div>
                    )}

                    {item.maquinaria && (
                      <div>
                        <p className="text-sm text-gray-600">Maquinaria</p>
                        <p className="font-medium">{item.maquinaria.nombre}</p>
                      </div>
                    )}

                    {item.implemento && (
                      <div>
                        <p className="text-sm text-gray-600">Implemento</p>
                        <p className="font-medium">{item.implemento.nombre}</p>
                      </div>
                    )}

                    {item.tipoFactura && (
                      <div>
                        <p className="text-sm text-gray-600">Tipo de Factura</p>
                        <p className="font-medium">{item.tipoFactura}</p>
                      </div>
                    )}

                    {item.numeroFactura && (
                      <div>
                        <p className="text-sm text-gray-600">N° de Factura</p>
                        <p className="font-medium">{item.numeroFactura}</p>
                      </div>
                    )}

                    {item.cuenta && (
                      <div>
                        <p className="text-sm text-gray-600">Cuenta</p>
                        <p className="font-medium">{item.cuenta.nombre}</p>
                      </div>
                    )}

                    {item.usuario && (
                      <div>
                        <p className="text-sm text-gray-600">Registrado por</p>
                        <p className="font-medium">
                          {item.usuario.nombre} {item.usuario.apellido}
                        </p>
                      </div>
                    )}
                  </div>

                  {item.descripcion && (
                    <p className="text-sm text-gray-600 mt-3 pt-3 border-t">
                      {item.descripcion}
                    </p>
                  )}
                </div>

                <div className="flex items-start space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-500 hover:text-blue-700"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Eliminar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {gastos.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No hay gastos registrados. Crea uno para comenzar.
        </div>
      )}
    </div>
  );
}

